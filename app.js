// BAJA PRO — Global App Logic
// Real-time Clock

const BAJA = {
  lang: localStorage.getItem('baja-lang') || 'en',
  theme: localStorage.getItem('baja-theme') || 'dark',

  init() {
    this.applyTheme(this.theme);
    this.applyLang(this.lang);
    this.initNav();
    this.initScrollTop();
    this.initClock();
    this.markActiveLink();
  },

  applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    this.theme = t;
    localStorage.setItem('baja-theme', t);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = t === 'dark' ? '☀️' : '🌙';
  },

  applyLang(l) {
    this.lang = l;
    localStorage.setItem('baja-lang', l);
    const el = document.getElementById('langLabel');
    if (el) el.textContent = `🌐 ${l.toUpperCase()}`;
    document.querySelectorAll('[data-en]').forEach(node => {
      node.textContent = l === 'en' ? node.dataset.en : (node.dataset.id || node.dataset.en);
    });
  },

  initNav() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    const themeBtn = document.getElementById('themeBtn');
    const langBtn = document.getElementById('langBtn');

    window.addEventListener('scroll', () => {
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        hamburger.classList.toggle('open');
      });
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
      });
    }

    if (langBtn) {
      langBtn.addEventListener('click', () => {
        this.applyLang(this.lang === 'en' ? 'id' : 'en');
      });
    }
  },

  initScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 300);
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  },

  // Real-time clock injected into navbar
  initClock() {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;

    const clockEl = document.createElement('div');
    clockEl.id = 'navClock';
    clockEl.className = 'nav-clock';
    // Insert before the hamburger button
    const hamburger = actions.querySelector('.hamburger');
    if (hamburger) actions.insertBefore(clockEl, hamburger);
    else actions.prepend(clockEl);

    const update = () => {
      const now = new Date();
      const date = now.toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' });
      const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      clockEl.innerHTML = `<span class="clock-date">${date}</span><span class="clock-time">${time}</span>`;
    };
    update();
    setInterval(update, 1000);
  },

  markActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href !== '/' && href !== '../' && path.includes(href.replace('../', '').replace('./', ''))) {
        link.classList.add('active');
      }
    });
  },

  // Format number to USD
  formatUSD(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
  },

  // Format large numbers
  formatCompact(n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + 'B';
    if (n >= 1e6)  return (n / 1e6).toFixed(2)  + 'M';
    return n.toLocaleString();
  },

  // Fetch crypto prices from CoinGecko
  async fetchCryptoPrices(ids = ['bitcoin','ethereum','binancecoin','solana']) {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API error');
      return await res.json();
    } catch(e) {
      console.warn('CoinGecko fetch failed:', e);
      return null;
    }
  },

  // Init ticker on homepage
  async initTicker() {
    const track = document.getElementById('tickerTrack');
    if (!track) return;
    const data = await this.fetchCryptoPrices(['bitcoin','ethereum','binancecoin','solana','cardano','ripple']);
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
    // Duplicate for seamless loop
    track.innerHTML = items + items;
  },
};

document.addEventListener('DOMContentLoaded', () => BAJA.init());
