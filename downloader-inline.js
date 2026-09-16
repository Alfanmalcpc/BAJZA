
// ─── LAYANAN DOWNLOAD PER PLATFORM ─────────────────────────────────────────
// Setiap platform punya beberapa layanan terpercaya yang bisa langsung dipakai
const SERVICES = {
  tiktok: [
    {
      name: 'SSSTik',
      icon: '🎵',
      desc: 'Video tanpa watermark · Paling populer',
      badge: 'No WM · HD',
      color: '#010101',
      getUrl: (v) => `https://ssstik.io/id#url=${encodeURIComponent(v)}`
    },
    {
      name: 'SnapTik',
      icon: '📹',
      desc: 'Video & audio TikTok tanpa watermark',
      badge: 'No WM · MP3',
      color: '#fe2c55',
      getUrl: (v) => `https://snaptik.app/id?url=${encodeURIComponent(v)}`
    },
    {
      name: 'Cobalt.tools',
      icon: '⚡',
      desc: 'Open-source · Tanpa iklan',
      badge: 'Open Source',
      color: '#7c3aed',
      getUrl: (v) => `https://cobalt.tools/?u=${encodeURIComponent(v)}`
    }
  ],
  instagram: [
    {
      name: 'SnapInsta',
      icon: '📸',
      desc: 'Reels, Post, & Foto Instagram',
      badge: 'HD · Free',
      color: '#c13584',
      getUrl: (v) => `https://snapinsta.app/id?url=${encodeURIComponent(v)}`
    },
    {
      name: 'SaveIG',
      icon: '🎬',
      desc: 'Unduh Reels & Story Instagram',
      badge: 'Video · Foto',
      color: '#f09433',
      getUrl: (v) => `https://saveig.app/id?url=${encodeURIComponent(v)}`
    },
    {
      name: 'Cobalt.tools',
      icon: '⚡',
      desc: 'Open-source · Tanpa iklan',
      badge: 'Open Source',
      color: '#7c3aed',
      getUrl: (v) => `https://cobalt.tools/?u=${encodeURIComponent(v)}`
    }
  ],
  youtube: [
    {
      name: 'Y2Mate',
      icon: '▶️',
      desc: 'Video MP4 hingga 1080p & konversi MP3',
      badge: '1080p · MP3',
      color: '#ff0000',
      getUrl: (v) => `https://www.y2mate.com/youtube/${encodeURIComponent(v)}`
    },
    {
      name: 'SSYouTube',
      icon: '🎬',
      desc: 'Tambahkan "ss" sebelum youtube.com',
      badge: 'HD · MP4',
      color: '#cc0000',
      getUrl: (v) => v.replace('www.youtube.com','www.ssyoutube.com').replace('youtu.be','ssyoutu.be')
    },
    {
      name: 'Cobalt.tools',
      icon: '⚡',
      desc: 'Open-source · Pilih kualitas bebas',
      badge: 'Open Source',
      color: '#7c3aed',
      getUrl: (v) => `https://cobalt.tools/?u=${encodeURIComponent(v)}`
    }
  ]
};

// ─── FORMAT OPTIONS (untuk kartu pilihan di result card) ───────────────────
const FORMATS = {
  tiktok: [
    { name:'Video 480p', icon:'Video', desc:'Tanpa watermark · MP4', isAudio:false, quality:'480', supported:['480p','MP4'] },
    { name:'Video HD 720p', icon:'HD', desc:'Kualitas tinggi · perlu iklan sponsor', isAudio:false, quality:'720', requiresAd:true, supported:['720p','Sponsor'] },
    { name:'Video Full HD', icon:'FHD', desc:'Resolusi sumber terbaik · perlu iklan sponsor', isAudio:false, quality:'max', requiresAd:true, supported:['1080p+','Sponsor'] },
    { name:'Audio MP3', icon:'Audio', desc:'Hanya suara · MP3', isAudio:true, supported:['MP3','Audio'] }
  ],
  instagram: [
    { name:'Video 480p', icon:'Video', desc:'Reels & video · MP4', isAudio:false, quality:'480', supported:['480p','MP4'] },
    { name:'Video HD 720p', icon:'HD', desc:'Kualitas tinggi · perlu iklan sponsor', isAudio:false, quality:'720', requiresAd:true, supported:['720p','Sponsor'] },
    { name:'Video Full HD', icon:'FHD', desc:'Resolusi sumber terbaik · perlu iklan sponsor', isAudio:false, quality:'max', requiresAd:true, supported:['1080p+','Sponsor'] },
    { name:'Audio MP3', icon:'Audio', desc:'Hanya suara · MP3', isAudio:true, supported:['MP3','Audio'] }
  ],
  youtube: [
    { name:'Video 360p', icon:'Video', desc:'Hemat data · MP4', isAudio:false, quality:'360', supported:['360p','MP4'] },
    { name:'Video 480p', icon:'Video', desc:'Kualitas standar · MP4', isAudio:false, quality:'480', supported:['480p','MP4'] },
    { name:'Video HD 720p', icon:'HD', desc:'Kualitas tinggi · perlu iklan sponsor', isAudio:false, quality:'720', requiresAd:true, supported:['720p','Sponsor'] },
    { name:'Video Full HD 1080p', icon:'FHD', desc:'Resolusi tinggi · perlu iklan sponsor', isAudio:false, quality:'1080', requiresAd:true, supported:['1080p','Sponsor'] },
    { name:'Video 2K / 4K', icon:'4K', desc:'Resolusi sumber terbaik · perlu iklan sponsor', isAudio:false, quality:'max', requiresAd:true, supported:['2K/4K','Sponsor'] },
    { name:'Audio MP3', icon:'Audio', desc:'Hanya suara · MP3', isAudio:true, supported:['MP3','Audio'] }
  ]
};

const HIGH_QUALITY_NOTE = 'Kualitas akhir bergantung pada resolusi video sumber dan ketersediaan dari platform.';

const HINTS = {
  tiktok:'Contoh: https://www.tiktok.com/@user/video/1234567890',
  instagram:'Contoh: https://www.instagram.com/reel/ABCxyz123/',
  youtube:'Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ'
};
const ICONS = { tiktok:'🎵', instagram:'📸', youtube:'▶️' };
const DOMAINS = {
  tiktok:['tiktok.com','vm.tiktok.com','vt.tiktok.com'],
  instagram:['instagram.com','instagr.am'],
  youtube:['youtube.com','youtu.be','yt.be']
};

let currentPlatform = 'tiktok';
window._currentDlUrl = '';

// ─── TAB SWITCHING ─────────────────────────────────────────────────────────
document.querySelectorAll('.platform-tab').forEach(tab => {
  tab.addEventListener('click', () => switchPlatform(tab.dataset.platform));
});

function switchPlatform(p) {
  currentPlatform = p;
  document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-'+p).classList.add('active');
  document.querySelectorAll('.platform-info').forEach(i => i.classList.remove('active'));
  document.getElementById('info-'+p).classList.add('active');
  document.getElementById('urlHint').textContent = HINTS[p];
  document.getElementById('inputIcon').textContent = ICONS[p];
  selectedFormatIndex = 0;
  renderServices(p);
  
  document.getElementById('resultArea').style.display = 'none';
}


function renderServices(p) {
  const grid = document.getElementById('servicesGrid');
  grid.innerHTML = FORMATS[p].map((s,i) => `
    <div class="service-card" onclick="triggerDownload(${i})" tabindex="0" role="button" onkeydown="if(event.key==='Enter')triggerDownload(${i})">
      <div class="service-icon" style="background:linear-gradient(135deg,#7c3aed,#06b6d4);">${s.icon}</div>
      <div class="service-name">${s.name}</div>
      <div class="service-desc">${s.desc}</div>
      <div class="service-supported">${s.supported.map(t=>`<span class="sup-tag">${t}</span>`).join('')}</div>
    </div>
  `).join('');
}

// ─── AUTO-DETECT PLATFORM ──────────────────────────────────────────────────
document.getElementById('videoUrl').addEventListener('input', function() {
  const url = this.value.trim();
  if (!url) return;
  for (const [p, domains] of Object.entries(DOMAINS)) {
    if (domains.some(d => url.includes(d))) { switchPlatform(p); break; }
  }
});

// ─── PASTE BUTTON ─────────────────────────────────────────────────────────
document.getElementById('pasteBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    const input = document.getElementById('videoUrl');
    input.value = text;
    input.dispatchEvent(new Event('input'));
    showToast('📋 Link berhasil ditempel!');
  } catch(e) {
    showToast('❌ Tidak dapat akses clipboard. Gunakan Ctrl+V');
  }
});

document.getElementById('videoUrl').addEventListener('keydown', e => { if (e.key === 'Enter') handleDownload(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('goBtn').addEventListener('click', handleDownload);
// Initialize top services on load


// ─── HANDLE DOWNLOAD (main entry) ─────────────────────────────────────────
function handleDownload() {
  const url = document.getElementById('videoUrl').value.trim();
  if (!url) {
    showToast('Tempel link video terlebih dahulu.');
    document.getElementById('videoUrl').focus();
    return;
  }
  try { new URL(url); } catch(e) {
    showToast('Link tidak valid. Pastikan dimulai dengan https://');
    return;
  }
  window._currentDlUrl = url;
  showToast('Mendeteksi video dan opsi kualitas...');
  showResults(url);
}

// ─── SHOW RESULT CARD ────────────────────────────────────────────────────
function showResults(url) {
  const fmts = FORMATS[currentPlatform];
  const resultArea = document.getElementById('resultArea');
  resultArea.style.display = 'block';
  const shortUrl = url.length > 55 ? url.substring(0, 55) + '...' : url;

  resultArea.innerHTML = `
    <div class="result-card result-detected">
      <div class="result-media">
        <div class="result-thumb" style="font-size:15px;font-weight:800;color:#fff;background:linear-gradient(135deg,#7c3aed,#06b6d4);">${currentPlatform.toUpperCase()}</div>
        <div class="result-info">
          <div class="result-title">Video Berhasil Terdeteksi</div>
          <div class="result-meta" title="${url}">${shortUrl}</div>
          <div class="result-badges">
            <span class="badge-platform badge-${currentPlatform}">${currentPlatform.toUpperCase()}</span>
            <span class="detected-status">SIAP DIUNDUH</span>
          </div>
        </div>
      </div>
      <div class="quality-picker">
        <div class="quality-picker-head">
          <div><div class="quality-picker-title">Pilih Kualitas</div><div class="quality-picker-sub">Kualitas yang tersedia disesuaikan dengan platform dan video sumber.</div></div>
          <span class="quality-note">HD perlu sponsor</span>
        </div>
        <div class="quality-picker-grid">
          ${fmts.map((s, i) => `
            <button class="quality-choice ${i===0?'selected':''}" type="button" onclick="triggerDownload(${i})">
              <strong>${s.requiresAd ? 'LOCK ' : ''}${s.name}</strong>
              <small>${s.requiresAd ? 'Buka dengan sponsor' : 'Unduh langsung'}</small>
            </button>
          `).join('')}
        </div>
      </div>
    </div>`;
  resultArea.scrollIntoView({ behavior:'smooth', block:'start' });
}

function triggerDownloadFromResult(idx) { triggerDownload(idx); }

// ─── TRIGGER DOWNLOAD — buka layanan terpilih ─────────────────────────────


// ─── MODAL PILIHAN LAYANAN ────────────────────────────────────────────────

// ─── TRIGGER DOWNLOAD — PROSES API LANGSUNG ─────────────────────────────
let pendingDownloadTask = null;

window.addEventListener('message', function(event) {
  if (event.data === 'unlock_hd_download') {
    closeQualityGate();
    showToast('🎉 Akses HD terbuka! Mulai mengambil video...');
    if (pendingDownloadTask) {
      const task = pendingDownloadTask;
      pendingDownloadTask = null;
      fetchVideoDirect(task.url, task.platform, task.isAudio, task.fmt);
    }
  }
});

function openQualityGate(fmt, url, platform) {
  pendingDownloadTask = { fmt, url, platform, isAudio: fmt.isAudio };
  const gate = document.getElementById('qualityGate');
  const title = document.getElementById('qualityGateTitle');
  const summary = document.getElementById('qualityGateSummary');
  title.textContent = `Buka Unduhan ${fmt.name}`;
  summary.innerHTML = `Platform: <strong>${platform.toUpperCase()}</strong> · Format: <strong>${fmt.name}</strong><br><span style="color:#f59e0b;font-size:12px;">Tonton / klik iklan sponsor singkat di bawah untuk melanjutkan unduhan resolusi tinggi.</span>`;
  
  const frame = document.getElementById('qualityAdFrame');
  if (frame) {
    frame.src = '/src/pages/tools/monetag-video-hd-btn.html?t=' + Date.now();
  }
  gate.classList.add('open');
}

function closeQualityGate() {
  const gate = document.getElementById('qualityGate');
  if (gate) gate.classList.remove('open');
}

function triggerDownload(idx) {
  const url = window._currentDlUrl || document.getElementById('videoUrl').value.trim();
  if (!url) {
    showToast('⚠️ Tempel link video terlebih dahulu, lalu klik Download!');
    return;
  }
  try { new URL(url); } catch(e) {
    showToast('❌ Link tidak valid.');
    return;
  }
  
  const fmt = FORMATS[currentPlatform][idx];
  const isAudio = fmt.isAudio;
  
  if (fmt.requiresAd) {
    openQualityGate(fmt, url, currentPlatform);
    return;
  }
  
  fetchVideoDirect(url, currentPlatform, isAudio, fmt);
}

async function fetchVideoDirect(url, platform, isAudio, fmt) {
  openModal(fmt.icon, fmt.name, isAudio);
  setModalProgress(15, 'Menganalisis link...');

  try {
    let resultUrl = '';
    let resultTitle = `BAJA_${platform}_${isAudio ? 'audio' : (fmt.quality || 'video')}`;

    if (platform === 'tiktok') {
      setModalProgress(40, 'Mengekstrak data TikTok...');
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.msg || 'Gagal ekstrak dari TikTok');
      // TikWM provides hdplay for higher quality if available
      if (isAudio) {
        resultUrl = json.data.music;
      } else if (fmt.quality === 'max' && json.data.hdplay) {
        resultUrl = json.data.hdplay;
      } else {
        resultUrl = json.data.play;
      }
      resultTitle = json.data.title ? json.data.title.substring(0,30) : resultTitle;
    } 
    else {
      // YouTube / IG using public API aggregators
      setModalProgress(30, `Memproses link ${platform} (${fmt.name})...`);
      
      const cobaltInstances = [
        { url: 'https://api.cobalt.tools', v: 11 },
        { url: 'https://co.wuk.sh', v: 7 },
        { url: 'https://cobalt.api.sbe.sh', v: 11 },
        { url: 'https://api.vreden.web.id/api/ytmp4?url=', v: 'get' }
      ];
      
      let success = false;
      const requestedQuality = fmt.quality || '720';
      for (let instance of cobaltInstances) {
        try {
          if (instance.v === 'get') continue;
          const ep = instance.v === 11 ? instance.url : `${instance.url}/api/json`;
          const reqBody = instance.v === 11 
            ? JSON.stringify({ url: url, isAudioOnly: isAudio, videoQuality: requestedQuality, filenamePattern: 'nerdy' })
            : JSON.stringify({ url: url, isAudioOnly: isAudio, vQuality: requestedQuality });
            
          const res = await fetch(ep, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: reqBody
          });
          
          const data = await res.json();
          if (data && data.url) {
            resultUrl = data.url; success = true; break;
          } else if (data && data.status === 'redirect') {
             resultUrl = data.url; success = true; break;
          }
        } catch(e) {
          // ignore instance fail
        }
      }
      
      if (!success) {
        console.warn("Direct APIs failed, falling back to manual services mode.");
        showServiceModalFallback(url, fmt);
        return; 
      }
    }

    setModalProgress(100, 'Berhasil! Menyiapkan file...');
    
    const safeTitle = resultTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const ext = isAudio ? 'mp3' : 'mp4';
    showModalDownload(resultUrl, `${safeTitle}.${ext}`);

  } catch(e) {
    console.error(e);
    showServiceModalFallback(url, fmt);
  }
}

// ─── FALLBACK JIKA API GAGAL (MANUAL MODE) ────────────────────────────────
function showServiceModalFallback(videoUrl, fmt) {
  const services = SERVICES[currentPlatform];
  
  document.getElementById('modalIcon').textContent = fmt.icon;
  document.getElementById('modalTitle').textContent = `Server Penuh — Pilih Layanan Alternatif`;
  document.getElementById('modalBody').innerHTML =
    `<span style="color:#ff6b6b;">⚠️ Sistem download otomatis sedang sibuk.</span><br>Silakan klik salah satu layanan alternatif di bawah ini (Gratis & Tanpa Login).`;
  document.getElementById('modalUrl').style.display = 'none';
  document.getElementById('modalProgress').style.display = 'none';
  document.getElementById('modalError').style.display = 'none';

  const wrap = document.getElementById('modalDownloadWrap');
  wrap.style.display = 'block';
  wrap.innerHTML = services.map(svc => `
    <a href="${svc.getUrl(videoUrl)}" target="_blank" rel="noopener noreferrer"
       class="dl-download-link"
       style="background:${svc.color};margin-bottom:10px;"
       onclick="showToast('🚀 Membuka ${svc.name}...')"
    >
      <span style="font-size:20px;">${svc.icon}</span>
      <div style="text-align:left;">
        <div style="font-size:14px;font-weight:700;">${svc.name}</div>
        <div style="font-size:11px;opacity:.8;">${svc.desc}</div>
      </div>
      <span style="margin-left:auto;background:rgba(255,255,255,.2);padding:3px 10px;border-radius:99px;font-size:10px;font-weight:700;white-space:nowrap;">${svc.badge}</span>
    </a>
  `).join('');

  document.getElementById('dlModal').classList.add('open');
}


// ─── MODAL HELPERS ────────────────────────────────────────────────────────
function openModal(icon, name, isAudio) {
  document.getElementById('modalIcon').textContent = icon;
  document.getElementById('modalTitle').textContent = (isAudio ? '🎵 Mengambil Audio' : '🎬 Mengambil Video') + ' — ' + name;
  document.getElementById('modalBody').textContent = 'Mohon tunggu, sedang memproses link unduhan langsung...';
  document.getElementById('modalUrl').style.display = 'none';
  document.getElementById('modalProgress').style.display = 'block';
  document.getElementById('modalDownloadWrap').style.display = 'none';
  document.getElementById('modalError').style.display = 'none';
  document.getElementById('modalProgressBar').style.width = '0%';
  document.getElementById('modalProgressLabel').textContent = 'Memulai...';
  document.getElementById('dlModal').classList.add('open');
}

function setModalProgress(pct, label) {
  document.getElementById('modalProgressBar').style.width = pct + '%';
  document.getElementById('modalProgressLabel').textContent = label;
}

function showModalDownload(url, filename) {
  document.getElementById('modalBody').textContent = '✅ Link berhasil didapatkan! Klik tombol di bawah untuk mulai mengunduh.';
  document.getElementById('modalProgress').style.display = 'none';

  // Show the direct link clearly so user can also long-press / right-click
  const urlEl = document.getElementById('modalUrl');
  urlEl.textContent = url;
  urlEl.style.display = 'block';

  const btn = document.getElementById('modalDownloadBtn');
  // Use a real <a> tag approach: set href + download, open in same context
  btn.href = url;
  btn.download = filename;
  btn.setAttribute('target', '_blank');
  btn.setAttribute('rel', 'noopener noreferrer');
  btn.onclick = function(e) {
    e.preventDefault();
    downloadFileLocally(url, filename, btn);
  };
  btn.textContent = '⬇️ Download Sekarang — ' + filename;
  document.getElementById('modalDownloadWrap').style.display = 'block';
  showToast('✅ Link download siap!');
}

async function downloadFileLocally(url, filename, btn) {
  const originalText = btn ? btn.textContent : '⬇️ Download Sekarang';
  if (btn) { btn.textContent = '⏳ Memeriksa file...'; btn.style.opacity = '0.75'; btn.style.pointerEvents = 'none'; }

  let downloaded = false;

  // Method 1: blob fetch (works if Cobalt sends CORS headers)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 1000) { // sanity: at least 1KB means it's a real file
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
        downloaded = true;
        if (btn) btn.textContent = '✅ File sedang diunduh!';
        showToast('✅ Download dimulai!');
      }
    }
  } catch(e) {
    console.warn('[BAJA] Blob fetch gagal (CORS), fallback ke window.open:', e.message);
  }

  // Method 2: window.open – browser handles the download natively
  if (!downloaded) {
    window.open(url, '_blank', 'noopener,noreferrer');
    if (btn) btn.textContent = '✅ Dibuka di tab baru — simpan dari sana!';
    showToast('⬇️ Tab baru dibuka, simpan video dari sana!');
    document.getElementById('modalBody').textContent =
      '📂 File terbuka di tab baru. Klik kanan → "Simpan video sebagai..." untuk menyimpannya.';
  }

  if (btn) {
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    setTimeout(() => { btn.textContent = originalText; }, 5000);
  }
}

function showModalError(msg) {
  document.getElementById('modalProgress').style.display = 'none';
  document.getElementById('modalDownloadWrap').style.display = 'none';
  document.getElementById('modalBody').textContent = '❌ Gagal memproses download.';
  const errEl = document.getElementById('modalError');
  errEl.style.display = 'block';
  // Provide helpful fallback tips
  errEl.innerHTML = `
    <strong>Error:</strong> ${msg}<br><br>
    <strong>Kemungkinan penyebab:</strong><br>
    • Akun/konten diset ke privat<br>
    • Link sudah tidak valid atau telah dihapus<br>
    • Platform memblokir akses download saat ini<br><br>
    <em>Coba format lain atau tunggu beberapa saat dan coba kembali.</em>
  `;
  showToast('❌ Gagal mendapatkan link download');
}

function closeModal() {
  document.getElementById('dlModal').classList.remove('open');
}

document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('dlModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ─── TOAST ────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('dlToast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── INIT ────────────────────────────────────────────────────────────────
renderServices('tiktok');
