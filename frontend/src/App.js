/* ════════════════════════════════════════════════════════════════
   app.js — BAJA Global App Logic
   Berisi: namespace BAJA, navigasi, auth UI, clock,
           bahasa (i18n), crypto ticker, page transition
   ════════════════════════════════════════════════════════════════ */

/* Prevent old-account onboarding redirects from flashing the page. */
document.documentElement.classList.add('baja-auth-pending');
const bajaAuthGateStyle = document.createElement('style');
bajaAuthGateStyle.textContent = '.baja-auth-pending body{visibility:hidden!important}.baja-auth-ready body{visibility:visible!important}';
document.head.appendChild(bajaAuthGateStyle);

window.renderBajaCharacter = function(character = {}, size = 42) {
  const gender = character.gender === 'female' ? 'female' : 'male';
  const outfit = character.outfit === 'sunset-pink' ? '#ec4899' : (character.outfit === 'mint-hoodie' ? '#10b981' : '#2563eb');
  const skin = character.skin || '#f2b28d';
  const hair = gender === 'female' ? '#5b3425' : '#172033';
  const hairShape = gender === 'female' ? 'border-radius:50% 50% 42% 42%;height:48%;top:8%;' : 'border-radius:55% 55% 25% 25%;height:38%;top:7%;';
  const accessory = character.accessory === 'crown' ? '<i style="position:absolute;top:-8%;left:25%;width:50%;height:18%;background:#facc15;clip-path:polygon(0 100%,15% 0,38% 70%,50% 0,65% 70%,85% 0,100% 100%);"></i>' : character.accessory === 'glasses' ? '<i style="position:absolute;top:43%;left:22%;width:56%;height:14%;border:2px solid #111827;border-radius:8px;"></i>' : '';
  return `<span class="baja-3d-character" aria-label="Karakter 3D ${gender === 'female' ? 'perempuan' : 'laki-laki'}" style="--avatar-size:${size}px;--skin:${skin};--hair:${hair};--outfit:${outfit};">
    <span class="baja-3d-head"><i class="baja-3d-hair" style="${hairShape}"></i><i class="baja-3d-eye eye-a"></i><i class="baja-3d-eye eye-b"></i>${accessory}</span>
    <span class="baja-3d-body"></span><span class="baja-3d-shadow"></span>
  </span>`;
};

const baja3dStyle = document.createElement('style');
baja3dStyle.textContent = `.baja-3d-character{position:relative;display:inline-block;width:var(--avatar-size);height:var(--avatar-size);vertical-align:middle;filter:drop-shadow(0 5px 3px rgba(15,23,42,.25));}.baja-3d-head{position:absolute;z-index:2;left:18%;top:12%;width:64%;height:55%;background:radial-gradient(circle at 32% 25%,#fff8 0 5%,transparent 7%),linear-gradient(145deg,var(--skin),#c97858);border:2px solid #111827;border-radius:48% 48% 44% 44%;box-shadow:inset -5px -6px 0 #0002, inset 4px 3px 0 #fff4;}.baja-3d-hair{position:absolute;z-index:3;left:4%;width:92%;background:linear-gradient(145deg,#fff4,var(--hair) 22% 78%,#0008);box-shadow:inset -4px -3px 0 #0004;}.baja-3d-eye{position:absolute;z-index:4;top:48%;width:10%;height:10%;background:#111827;border-radius:50%;}.eye-a{left:25%;}.eye-b{right:25%;}.baja-3d-body{position:absolute;z-index:1;left:11%;bottom:0;width:78%;height:48%;background:linear-gradient(145deg,#fff5,var(--outfit) 30% 75%,#0006);border:2px solid #111827;border-radius:45% 45% 22% 22%;box-shadow:inset -7px -5px 0 #0003;}.baja-3d-shadow{position:absolute;z-index:0;left:10%;bottom:-4%;width:80%;height:12%;border-radius:50%;background:#0f172a55;filter:blur(3px);}`;
document.head.appendChild(baja3dStyle);

const BAJA = {
  lang:  localStorage.getItem('baja-lang')  || 'id',
  theme: localStorage.getItem('baja-theme') || 'dark',

  /* ── Entry point, dipanggil saat DOMContentLoaded ── */
  init() {
    this.applyLang(this.lang);
    this.initNav();
    // Bazz AI sementara dinonaktifkan sesuai kebijakan produk.
    this.disableBazzRoutes();
    this.initScrollTop();
    this.initPageTransition();
    this.initClock();
    this.markActiveLink();
    this.initAuthUI();
  },

  /* ════════════════════════════════════════════════════
     INTERNASIONALISASI (i18n)
     Menggunakan atribut data-en dan data-id di HTML
     ════════════════════════════════════════════════════ */
  applyLang(l) {
    this.lang = l;
    localStorage.setItem('baja-lang', l);

    const el = document.getElementById('langLabel');
    if (el) el.textContent = `🌐 ${l.toUpperCase()}`;

    document.querySelectorAll('[data-en]').forEach(node => {
      node.textContent = (l === 'id')
        ? (node.dataset.id || node.dataset.en)
        : node.dataset.en;
    });
  },

  /* ════════════════════════════════════════════════════
     NAVIGASI
     Scroll effect, hamburger menu, tombol bahasa
     ════════════════════════════════════════════════════ */
  initNav() {
    const navbar    = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.getElementById('navMenu');
    const langBtn   = document.getElementById('langBtn');

    /* Efek shadow navbar saat scroll */
    window.addEventListener('scroll', () => {
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    /* Hamburger menu mobile */
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        hamburger.classList.toggle('open');
      });
    }

    /* Tombol bahasa → redirect ke settings */
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        window.location.href = '/src/pages/settings.html';
      });
    }
  },

  disableBazzRoutes() {
    const blocked = '/src/pages/tools/bazz-ai.html';
    if (window.location.pathname.endsWith('/bazz-ai.html')) {
      window.location.replace('/public/index.html');
      return;
    }
    document.querySelectorAll('a[href*="bazz-ai.html"]').forEach(link => link.remove());
  },

  /* ════════════════════════════════════════════════════
     BAZZ BOT BUBBLE IN NAVBAR / HEADER
     ════════════════════════════════════════════════════ */
  initBazzBotBubble() {
    const navContainer = document.querySelector('.nav-container') || document.querySelector('.navbar');
    if (!navContainer || document.getElementById('bazzNavBubble')) return;

    const bubble = document.createElement('a');
    bubble.id = 'bazzNavBubble';
    bubble.href = '/src/pages/tools/bazz-ai.html';
    bubble.title = 'Tanya Bazz AI';
    bubble.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--card-bg, #1e293b);
      border: 1px solid var(--border-color, #334155);
      border-radius: 999px;
      padding: 3px 10px 3px 4px;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
      margin-left: 8px;
    `;
    bubble.innerHTML = `
      <div style="width:24px; height:24px; border-radius:50%; background:#0284c7; display:flex; align-items:center; justify-content:center; overflow:hidden;">
        <img src="/src/assets/img/bazz-mascot.svg" alt="Bazz" style="width:100%; height:100%; object-fit:cover;">
      </div>
      <span style="font-size:12px; font-weight:600; color:var(--text-color, #f8fafc);">Bazz AI</span>
    `;
    bubble.onmouseenter = () => {
      bubble.style.borderColor = '#0284c7';
      bubble.style.background = '#334155';
    };
    bubble.onmouseleave = () => {
      bubble.style.borderColor = 'var(--border-color, #334155)';
      bubble.style.background = 'var(--card-bg, #1e293b)';
    };

    const actions = document.querySelector('.nav-actions');
    if (actions) {
      actions.insertBefore(bubble, actions.firstChild);
    } else {
      navContainer.appendChild(bubble);
    }
  },

  /* Cek apakah halaman saat ini adalah halaman root (bukan subfolder) */
  _isRootPage() {
    const path = window.location.pathname;
    return (
      !path.includes('/tools/') &&
      !path.includes('/finance/') &&
      !path.includes('/tutorial/')
    );
  },

  /* ════════════════════════════════════════════════════
     AUTH UI
     Inject avatar atau tombol login ke navbar
     Bergantung pada firebase.js (auth, getUserProfile)
     ════════════════════════════════════════════════════ */
  initAuthUI() {
    if (typeof firebase === 'undefined' || typeof auth === 'undefined') {
      document.documentElement.classList.add('baja-auth-ready');
      return;
    }

    let slot = document.getElementById('navAuthSlot');
    if (!slot) {
      const actions = document.querySelector('.nav-actions');
      if (!actions) return;
      slot = document.createElement('div');
      slot.id = 'navAuthSlot';
      slot.style.cssText = 'display:flex;align-items:center;gap:8px';

      const hamburger = actions.querySelector('.hamburger');
      if (hamburger) actions.insertBefore(slot, hamburger);
      else actions.appendChild(slot);
    }

    const profileHref = '/src/pages/profile.html';
    const authHref    = '/src/pages/auth.html';

    auth.onAuthStateChanged(async user => {
      const isOnboardingPage = window.location.pathname.endsWith('/profile.html') || window.location.pathname.endsWith('/auth.html');
      if (isOnboardingPage) document.documentElement.classList.add('baja-auth-ready');
      if (user) {
        /* Pengguna login — ambil profil dari database */
        let displayName = user.displayName || 'Pengguna';
        let photoURL    = user.photoURL    || '';
        let character   = null;
        let onboardingRequired = false;
        let buzz        = 0;

        try {
          if (typeof getUserProfile !== 'undefined') {
            const profile = await getUserProfile(user.uid);
            if (profile) {
              displayName = profile.displayName || displayName;
              photoURL    = profile.photoURL    || photoURL;
              character   = profile.character || null;
              onboardingRequired = profile.characterOnboardingRequired === true;
              buzz        = Number(profile.buzz || 0);
              if (profile.lang && profile.lang !== this.lang) {
                this.applyLang(profile.lang);
              }
            }
          }
        } catch (e) { /* Gagal ambil profil, pakai data lokal */ }

        if (onboardingRequired && !character && !isOnboardingPage) {
          window.location.replace(profileHref + '?setup=character');
          return;
        }
        document.documentElement.classList.add('baja-auth-ready');
        const initial = displayName.charAt(0).toUpperCase();
        const avatarMarkup = character && typeof window.renderBajaCharacter === 'function'
          ? window.renderBajaCharacter(character, 42)
          : (photoURL ? `<img src="${photoURL}" alt="Avatar" style="width:34px;height:34px;border-radius:50%;object-fit:cover;"/>` : `<div style="width:34px;height:34px;border-radius:50%;background:var(--grad-tools);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;">${initial}</div>`);
        slot.innerHTML = `
          <a href="${profileHref}" id="navAvatarLink" title="${displayName}" style="display:flex;align-items:center;gap:6px;text-decoration:none;color:var(--text-1);">
            <span style="display:inline-flex;align-items:center;justify-content:center;border-radius:50%;overflow:hidden;">${avatarMarkup}</span>
            <span style="font-size:11px;font-weight:800;color:#facc15;">Buzz ${buzz}</span>
          </a>`;

      } else {
        document.documentElement.classList.add('baja-auth-ready');
        /* Pengguna belum login — tampilkan tombol Masuk */
        slot.innerHTML = `
          <a href="${authHref}"
             style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
                    background:var(--grad-tools);color:#fff;border-radius:var(--r-full);
                    font-size:13px;font-weight:700;text-decoration:none;
                    box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:opacity 0.2s"
             onmouseover="this.style.opacity='.85'"
             onmouseout="this.style.opacity='1'">
            👤 Masuk
          </a>`;
      }
    });
  },

  /* ════════════════════════════════════════════════════
     SCROLL TO TOP
     Tombol FAB muncul setelah scroll 300px
     ════════════════════════════════════════════════════ */
  initScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  /* ════════════════════════════════════════════════════
     PAGE TRANSITION
     Overlay loading animasi saat navigasi antar halaman
     ════════════════════════════════════════════════════ */
  initPageTransition() {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    overlay.innerHTML = `
      <div class="iso-loader-wrap" style="padding:0;">
        <div class="iso-loader" style="transform:scale(1.5) rotateX(60deg) rotateZ(45deg);">
          <div class="iso-layer iso-layer-1"></div>
          <div class="iso-layer iso-layer-2"></div>
          <div class="iso-layer iso-layer-3"></div>
        </div>
      </div>
      <div style="margin-top:50px;font-weight:900;font-family:'Bangers',cursive;
                  font-size:28px;letter-spacing:3px;color:var(--text-1);
                  text-shadow:2px 2px 0 var(--pink);">BAJA</div>`;
    document.body.appendChild(overlay);

    /* Sembunyikan overlay setelah halaman load */
    const hideOverlay = () => setTimeout(() => overlay.classList.add('hidden'), 300);
    if (document.readyState === 'complete') {
      hideOverlay();
    } else {
      window.addEventListener('load', hideOverlay);
    }

    /* Tampilkan overlay saat klik link internal */
    document.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (
          href &&
          !href.startsWith('http') &&
          !href.startsWith('#') &&
          !href.startsWith('javascript:') &&
          link.target !== '_blank' &&
          !link.hasAttribute('download')
        ) {
          e.preventDefault();
          overlay.classList.remove('hidden');
          setTimeout(() => { window.location.href = href; }, 400);
        }
      });
    });
  },

  /* ════════════════════════════════════════════════════
     REAL-TIME CLOCK
     Jam live di pojok kanan navbar, update setiap detik
     ════════════════════════════════════════════════════ */
  initClock() {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;

    const clockEl = document.createElement('div');
    clockEl.id = 'navClock';
    clockEl.className = 'nav-clock';

    const hamburger = actions.querySelector('.hamburger');
    if (hamburger) actions.insertBefore(clockEl, hamburger);
    else actions.prepend(clockEl);

    const update = () => {
      const now  = new Date();
      const date = now.toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' });
      const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      clockEl.innerHTML = `<span class="clock-date">${date}</span><span class="clock-time">${time}</span>`;
    };
    update();
    setInterval(update, 1000);
  },

  /* Tandai link aktif di navbar berdasarkan URL saat ini */
  markActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href !== '/' && href !== '../' && path.includes(href.replace('../', '').replace('./', ''))) {
        link.classList.add('active');
      }
    });
  },

  /* ════════════════════════════════════════════════════
     UTILITY — FORMATTER
     ════════════════════════════════════════════════════ */

  /* Format angka ke format mata uang USD */
  formatUSD(n) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(n);
  },

  /* Format angka besar menjadi T/B/M */
  formatCompact(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
    return n.toLocaleString();
  },

  /* ════════════════════════════════════════════════════
     CRYPTO — FETCH & TICKER
     Menggunakan CoinGecko API (gratis, tidak perlu auth)
     ════════════════════════════════════════════════════ */

  /* Ambil harga crypto dari Backend */
  async fetchCryptoPrices(ids = ['bitcoin', 'ethereum', 'binancecoin', 'solana']) {
    try {
      // Menggunakan jembatan backend kita di Vercel (menyembunyikan URL asli CoinGecko)
      const res = await fetch('https://bajza.vercel.app/api/crypto/prices');
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch (e) {
      console.warn('[BAJA] Backend API fetch gagal:', e);
      return null;
    }
  },

  /* Inisialisasi ticker crypto bergerak di homepage */
  async initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;

    const data = await this.fetchCryptoPrices([
      'bitcoin', 'ethereum', 'binancecoin', 'solana', 'cardano', 'ripple'
    ]);
    if (!data) return;

    const coins = [
      { id: 'bitcoin',     symbol: 'BTC', icon: '₿' },
      { id: 'ethereum',    symbol: 'ETH', icon: '⟠' },
      { id: 'binancecoin', symbol: 'BNB', icon: '🔶' },
      { id: 'solana',      symbol: 'SOL', icon: '◎' },
      { id: 'cardano',     symbol: 'ADA', icon: '♦' },
      { id: 'ripple',      symbol: 'XRP', icon: '✕' },
    ];

    const items = coins.map(c => {
      const d = data[c.id];
      if (!d) return '';
      const ch = d.usd_24h_change?.toFixed(2) || '0.00';
      const up = parseFloat(ch) >= 0;
      return `<div class="ticker-item">
        <span>${c.icon} <strong class="ticker-coin">${c.symbol}</strong></span>
        <span class="ticker-price">${BAJA.formatUSD(d.usd)}</span>
        <span class="${up ? 'ticker-up' : 'ticker-down'}">${up ? '▲' : '▼'} ${Math.abs(ch)}%</span>
      </div>`;
    }).join('');

    /* Duplikat konten untuk efek loop seamless */
    track.innerHTML = items + items;
  },
};

/* ── Inisialisasi BAJA saat DOM siap ── */
document.addEventListener('DOMContentLoaded', () => BAJA.init());
