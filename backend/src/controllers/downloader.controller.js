const https = require('https');
const http = require('http');
const { URL } = require('url');

// Scrape Instagram media via SnapVideo engine
async function scrapeInstagram(targetUrl) {
  return new Promise((resolve, reject) => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

    const getReq = https.get('https://snapvideo.app/en', {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      const setCookies = res.headers['set-cookie'] || [];
      const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const expMatch = data.match(/k_exp="([^"]+)"/);
        const tokenMatch = data.match(/k_token="([^"]+)"/);
        if (!expMatch || !tokenMatch) {
          return reject(new Error('Gagal menginisialisasi sesi Instagram'));
        }

        const postBody = new URLSearchParams({
          k_exp: expMatch[1],
          k_token: tokenMatch[1],
          q: targetUrl,
          t: 'media',
          lang: 'en',
          v: 'v2'
        }).toString();

        const postReq = https.request({
          hostname: 'snapvideo.app',
          path: '/api/ajaxSearch',
          method: 'POST',
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Content-Length': Buffer.byteLength(postBody),
            'Cookie': cookieStr,
            'Origin': 'https://snapvideo.app',
            'Referer': 'https://snapvideo.app/en',
            'User-Agent': userAgent,
            'X-Requested-With': 'XMLHttpRequest'
          }
        }, (pRes) => {
          let pData = '';
          pRes.on('data', d => pData += d);
          pRes.on('end', () => {
            try {
              const json = JSON.parse(pData);
              if (json.status !== 'ok') {
                return reject(new Error('Instagram tidak menemukan media pada link ini'));
              }
              const html = json.data || '';
              const media = [];
              let video = null;
              let thumbnail = null;

              const thumbMatch = html.match(/<img\s+[^>]*src=["']([^"']+)["']/i);
              if (thumbMatch) thumbnail = thumbMatch[1];

              const aRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
              let m;
              while ((m = aRegex.exec(html)) !== null) {
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
                } else {
                  media.push({ type: 'file', url: href, label: text || 'Download Media' });
                }
              }

              if (!video && media.length > 0) {
                const firstVideo = media.find(item => item.type === 'video');
                if (firstVideo) video = firstVideo.url;
                else video = media[0].url;
              }

              resolve({
                success: true,
                platform: 'instagram',
                title: 'Instagram Video / Post',
                thumbnail,
                video,
                audio: null,
                media
              });
            } catch (err) {
              reject(err);
            }
          });
        });

        postReq.on('error', reject);
        postReq.write(postBody);
        postReq.end();
      });
    });

    getReq.on('error', reject);
  });
}

// Scrape TikTok media via TikWM engine
async function scrapeTikTok(targetUrl) {
  const tryEndpoint = (host) => {
    return new Promise((resolve, reject) => {
      const req = https.get(`https://${host}/api/?url=${encodeURIComponent(targetUrl)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (res) => {
        let d = '';
        res.on('data', chunk => d += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(d);
            if (json.code !== 0) return reject(new Error(json.msg || 'Gagal ekstrak video TikTok'));
            const data = json.data || {};
            const fix = u => !u ? '' : (u.startsWith('http') ? u : `https://${host}${u}`);
            const images = (data.images || []).map(fix);
            const video = fix(data.play);
            const videoHd = fix(data.hdplay) || video;
            const audio = fix(data.music);
            const thumbnail = fix(data.cover) || fix(data.origin_cover);

            resolve({
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
            });
          } catch(e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy(new Error(`Timeout connecting to ${host}`));
      });
    });
  };

  try {
    return await tryEndpoint('www.tikwm.com');
  } catch (err) {
    try {
      return await tryEndpoint('tikwm.com');
    } catch(err2) {
      throw err;
    }
  }
}

// Main extract controller
exports.extractMedia = async (req, res) => {
  try {
    const rawUrl = (req.query.url || (req.body && req.body.url) || '').trim();
    let platform = (req.query.platform || (req.body && req.body.platform) || '').toLowerCase();

    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL target tidak boleh kosong.' });
    }

    if (!platform) {
      if (/tiktok\.com/i.test(rawUrl)) platform = 'tiktok';
      else if (/instagram\.com/i.test(rawUrl)) platform = 'instagram';
      else if (/youtube\.com|youtu\.be/i.test(rawUrl)) platform = 'youtube';
      else if (/facebook\.com|fb\.watch/i.test(rawUrl)) platform = 'facebook';
      else platform = 'unknown';
    }

    if (platform === 'tiktok') {
      const data = await scrapeTikTok(rawUrl);
      return res.json(data);
    } else if (platform === 'instagram') {
      const data = await scrapeInstagram(rawUrl);
      return res.json(data);
    } else {
      return res.status(400).json({
        success: false,
        error: `Platform '${platform}' belum didukung untuk ekstraksi otomatis langsung.`
      });
    }
  } catch (err) {
    console.error('[Downloader API Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'Terjadi kesalahan saat mengekstrak media.'
    });
  }
};

// Stream proxy controller: bypasses CORS and referrer restrictions
const allowedHosts = ['snapvideo.app','tiktokcdn.com','cdn.example.com'];
function isAllowedUrl(url) {
  try { const hostname = new URL(url).hostname; return allowedHosts.some(h => hostname.endsWith(h)); } catch { return false; }
}
exports.streamMedia = async (req, res) => { if (!req.query.url || !isAllowedUrl(req.query.url)) { return res.status(400).send('URL media tidak valid atau tidak diizinkan.'); }
  try {
    const mediaUrl = (req.query.url || '').trim();
    const filename = (req.query.filename || 'download.mp4').trim();

    if (!mediaUrl || !mediaUrl.startsWith('http')) {
      return res.status(400).send('URL media tidak valid.');
    }

    const parsed = new URL(mediaUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (parsed.hostname.includes('snapcdn.app')) {
      headers['Referer'] = 'https://snapvideo.app/';
    } else if (parsed.hostname.includes('tiktokcdn')) {
      headers['Referer'] = 'https://www.tiktok.com/';
    }

    client.get(mediaUrl, { headers }, (remoteRes) => {
      if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
        return exports.streamMedia({
          query: { url: remoteRes.headers.location, filename }
        }, res);
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      if (remoteRes.headers['content-type']) {
        res.setHeader('Content-Type', remoteRes.headers['content-type']);
      }
      if (remoteRes.headers['content-length']) {
        res.setHeader('Content-Length', remoteRes.headers['content-length']);
      }

      remoteRes.pipe(res);
    }).on('error', (err) => {
      res.status(500).send('Gagal mengalirkan media: ' + err.message);
    });
  } catch (err) {
    res.status(500).send('Gagal stream: ' + err.message);
  }
};
