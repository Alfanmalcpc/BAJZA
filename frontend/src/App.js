/* ════════════════════════════════════════════════════════════════
   app.js — BAJA Global App Logic
   Berisi: namespace BAJA, navigasi, auth UI, clock,
           bahasa (i18n), crypto ticker, page transition
   ════════════════════════════════════════════════════════════════ */

const BAJA = {
  lang:  localStorage.getItem('baja-lang')  || 'id',
  theme: localStorage.getItem('baja-theme') || 'dark',

  /* ── Entry point, dipanggil saat DOMContentLoaded ── */
  init() {
    this.applyLang(this.lang);
    this.initNav();
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
    if (typeof firebase === 'undefined' || typeof auth === 'undefined') return;

    const actions = document.querySelector('.nav-actions');
    if (!actions) return;

    /* Cegah duplikasi slot */
    if (document.getElementById('navAuthSlot')) return;

    const slot = document.createElement('div');
    slot.id = 'navAuthSlot';
    slot.style.cssText = 'display:flex;align-items:center;gap:8px';

    const hamburger = actions.querySelector('.hamburger');
    if (hamburger) actions.insertBefore(slot, hamburger);
    else actions.appendChild(slot);

    const profileHref = '/src/pages/profile.html';
    const authHref    = '/src/pages/auth.html';

    auth.onAuthStateChanged(async user => {
      if (user) {
        /* Pengguna login — ambil profil dari database */
        let displayName = user.displayName || 'Pengguna';
        let photoURL    = user.photoURL    || '';

        try {
          if (typeof getUserProfile !== 'undefined') {
            const profile = await getUserProfile(user.uid);
            if (profile) {
              displayName = profile.displayName || displayName;
              photoURL    = profile.photoURL    || photoURL;
              if (profile.lang && profile.lang !== this.lang) {
                this.applyLang(profile.lang);
              }
            }
          }
        } catch (e) { /* Gagal ambil profil, pakai data lokal */ }

        const initial = displayName.charAt(0).toUpperCase();
        slot.innerHTML = `
          <a href="${profileHref}" id="navAvatarLink" title="${displayName}"
             style="display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--text-1);">
            ${photoURL
              ? `<img src="${photoURL}" alt="Avatar"
                   style="width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,0.15);object-fit:cover;"/>`
              : `<div style="width:34px;height:34px;border-radius:50%;background:var(--grad-tools);
                   display:flex;align-items:center;justify-content:center;
                   font-weight:800;font-size:15px;color:#fff;border:2px solid rgba(255,255,255,0.15);">
                   ${initial}</div>`
            }
            <span style="font-size:14px;font-weight:600;max-width:80px;overflow:hidden;
                         text-overflow:ellipsis;white-space:nowrap;display:none"
                  class="nav-username">${displayName.split(' ')[0]}</span>
          </a>`;

      } else {
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
