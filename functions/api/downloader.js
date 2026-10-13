// Cloudflare Pages Function for /api/downloader
export async function onRequest(context) {
  const { request } = context;
  const urlObj = new URL(request.url);

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  let targetUrl = urlObj.searchParams.get('url');
  let platform = (urlObj.searchParams.get('platform') || '').toLowerCase();

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      if (body.url) targetUrl = body.url;
      if (body.platform) platform = body.platform.toLowerCase();
    } catch (e) {}
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: 'URL target tidak boleh kosong.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  targetUrl = targetUrl.trim();
  if (!platform) {
    if (/tiktok\.com/i.test(targetUrl)) platform = 'tiktok';
    else if (/instagram\.com/i.test(targetUrl)) platform = 'instagram';
  }

  try {
    if (platform === 'tiktok') {
      const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(targetUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const json = await tikRes.json();
      if (json.code !== 0) throw new Error(json.msg || 'Gagal ekstrak video TikTok');
      const data = json.data || {};
      const fix = u => !u ? '' : (u.startsWith('http') ? u : `https://www.tikwm.com${u}`);
      const images = (data.images || []).map(fix);
      const video = fix(data.play);
      const videoHd = fix(data.hdplay) || video;
      const audio = fix(data.music);
      const thumbnail = fix(data.cover) || fix(data.origin_cover);

      return new Response(JSON.stringify({
        success: true,
        platform: 'tiktok',
        title: data.title || 'TikTok Video',
        author: data.author ? data.author.nickname : 'TikTok Creator',
        thumbnail,
        video,
        video_hd: videoHd,
        audio,
        images,
        is_slide: images.length > 0
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (platform === 'instagram') {
      // Fetch snapvideo.app session
      const getRes = await fetch('https://snapvideo.app/en', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      const htmlText = await getRes.text();
      const setCookies = getRes.headers.get('set-cookie') || '';
      const expMatch = htmlText.match(/k_exp="([^"]+)"/);
      const tokenMatch = htmlText.match(/k_token="([^"]+)"/);

      if (!expMatch || !tokenMatch) {
        throw new Error('Gagal inisialisasi sesi token Instagram');
      }

      const postParams = new URLSearchParams({
        k_exp: expMatch[1],
        k_token: tokenMatch[1],
        q: targetUrl,
        t: 'media',
        lang: 'en',
        v: 'v2'
      }).toString();

      const postRes = await fetch('https://snapvideo.app/api/ajaxSearch', {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': setCookies,
          'Origin': 'https://snapvideo.app',
          'Referer': 'https://snapvideo.app/en',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: postParams
      });

      const postJson = await postRes.json();
      if (postJson.status !== 'ok') {
        throw new Error('Instagram tidak menemukan media pada link ini');
      }

      const resHtml = postJson.data || '';
      const media = [];
      let video = null;
      let thumbnail = null;

      const thumbMatch = resHtml.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
      if (thumbMatch) thumbnail = thumbMatch[1];

      const aRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = aRegex.exec(resHtml)) !== null) {
        const href = m[1];
        const text = m[2].replace(/<[^>]+>/g, ' ').trim();
        if (!href.startsWith('http')) continue;

        if (/download\s+video/i.test(text)) {
          if (!video) video = href;
          media.push({ type: 'video', url: href, label: 'Video HD (MP4)' });
        } else if (/download\s+thumbnail/i.test(text)) {
          if (!thumbnail) thumbnail = href;
          media.push({ type: 'thumbnail', url: href, label: 'Thumbnail (JPG)' });
        } else if (/download\s+photo|download\s+image/i.test(text)) {
          media.push({ type: 'image', url: href, label: 'Foto HD' });
        }
      }

      if (!video && media.length > 0) {
        const firstVideo = media.find(item => item.type === 'video');
        if (firstVideo) video = firstVideo.url;
        else video = media[0].url;
      }

      return new Response(JSON.stringify({
        success: true,
        platform: 'instagram',
        title: 'Instagram Video / Post',
        thumbnail,
        video,
        audio: null,
        media
      }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: `Platform '${platform}' belum didukung.`
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Terjadi kesalahan pemrosesan video.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
