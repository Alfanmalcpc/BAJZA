/**
 * BAJA WEB - Secure Backend Firebase Client Bridge
 * 
 * Arsitektur Aman:
 * - Tidak ada API Key, Database URL, atau kredensial Firebase yang diekspos ke klien.
 * - Seluruh komunikasi di-routing aman melalui BAJA Express Backend API (/api/firebase) di Vercel.
 * - Menyediakan API drop-in replacement yang kompatibel dengan kode Firebase eksisting.
 */

const getBajaApiBaseUrl = () => {
  const host = window.location.hostname;
  if (host === 'bajza.vercel.app') return '';
  if (host === 'localhost' || host === '127.0.0.1') {
    if (window.location.port === '5000') return '';
    return 'http://localhost:5000';
  }
  return 'https://bajza.vercel.app';
};
const BAJA_API_BASE = getBajaApiBaseUrl();
window.BAJA_API_BASE = BAJA_API_BASE;

class BajaDataSnapshot {
  constructor(data, key) {
    this._data = data;
    this.key = key || null;
  }
  val() {
    return this._data;
  }
  exists() {
    return this._data !== null && this._data !== undefined;
  }
  forEach(callback) {
    if (this._data && typeof this._data === 'object') {
      const keys = Object.keys(this._data);
      for (const k of keys) {
        const childSnap = new BajaDataSnapshot(this._data[k], k);
        if (callback(childSnap) === true) break;
      }
    }
  }
  numChildren() {
    return this._data && typeof this._data === 'object' ? Object.keys(this._data).length : 0;
  }
}

class BajaDatabaseRef {
  constructor(project, path, query = {}) {
    this.project = project;
    this.path = (path || '').replace(/^\/+|\/+$/g, '');
    this.key = this.path ? this.path.split('/').pop() : null;
    this._query = { ...query };
    this._pollInterval = null;
  }

  child(subPath) {
    const cleanSub = (subPath || '').replace(/^\/+/, '');
    const combined = this.path ? `${this.path}/${cleanSub}` : cleanSub;
    return new BajaDatabaseRef(this.project, combined, this._query);
  }

  orderByChild(prop) {
    return new BajaDatabaseRef(this.project, this.path, { ...this._query, orderBy: `"${prop}"` });
  }

  equalTo(val) {
    const serialized = typeof val === 'string' ? `"${val}"` : val;
    return new BajaDatabaseRef(this.project, this.path, { ...this._query, equalTo: serialized });
  }

  limitToLast(n) {
    return new BajaDatabaseRef(this.project, this.path, { ...this._query, limitToLast: n });
  }

  limitToFirst(n) {
    return new BajaDatabaseRef(this.project, this.path, { ...this._query, limitToFirst: n });
  }

  async once(eventType) {
    const params = new URLSearchParams({ path: this.path, ...this._query });
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/db/${this.project}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Database error: ${res.statusText}`);
    }
    const data = await res.json();
    return new BajaDataSnapshot(data, this.key);
  }

  on(eventType, callback) {
    // Panggil segera sekali
    this.once(eventType).then(snap => callback(snap)).catch(err => console.warn('[BajaDB] On Error:', err));
    // Polling sinkronisasi otomatis tiap 4 detik jika tab aktif
    if (!this._pollInterval) {
      this._pollInterval = setInterval(() => {
        if (!document.hidden) {
          this.once(eventType).then(snap => callback(snap)).catch(() => {});
        }
      }, 4000);
    }
    return callback;
  }

  off(eventType, callback) {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  async set(data) {
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/db/${this.project}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: this.path, data, method: 'set' })
    });
    return res.json();
  }

  async update(data) {
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/db/${this.project}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: this.path, data, method: 'update' })
    });
    return res.json();
  }

  async remove() {
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/db/${this.project}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: this.path, method: 'delete' })
    });
    return res.json();
  }

  async push(data) {
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/db/${this.project}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: this.path, data, method: 'push' })
    });
    const result = await res.json();
    const newKey = result?.data?.name || ('push_' + Date.now());
    const newRef = this.child(newKey);
    newRef.key = newKey;
    return newRef;
  }

  async transaction(transactionUpdateFn) {
    const snap = await this.once('value');
    const curVal = snap.val();
    const nextVal = transactionUpdateFn(curVal);
    if (nextVal !== undefined) {
      await this.set(nextVal);
    }
    return { committed: true, snapshot: new BajaDataSnapshot(nextVal, this.key) };
  }
}

class BajaDatabaseService {
  constructor(project) {
    this.project = project;
  }
  ref(path = '') {
    return new BajaDatabaseRef(this.project, path);
  }
}

class BajaAuthService {
  constructor() {
    this._listeners = [];
    this.currentUser = null;
    this._initSession();
  }

  _initSession() {
    try {
      const saved = localStorage.getItem('baja_auth_user');
      if (saved) {
        this.currentUser = JSON.parse(saved);
        const token = localStorage.getItem('baja_auth_token');
        if (token) {
          fetch(`${BAJA_API_BASE}/api/firebase/auth/lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
          })
          .then(r => r.json())
          .then(res => {
            if (res.user) {
              this.currentUser = { ...this.currentUser, ...res.user };
              localStorage.setItem('baja_auth_user', JSON.stringify(this.currentUser));
              this._notify();
            }
          })
          .catch(() => {});
        }
      }
    } catch (_) {}
  }

  _notify() {
    this._listeners.forEach(cb => {
      try { cb(this.currentUser); } catch (e) { console.error(e); }
    });
  }

  onAuthStateChanged(callback) {
    this._listeners.push(callback);
    setTimeout(() => callback(this.currentUser), 10);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  async signInWithEmailAndPassword(email, password) {
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal login.');
    
    this.currentUser = data.user;
    localStorage.setItem('baja_auth_user', JSON.stringify(data.user));
    if (data.idToken) localStorage.setItem('baja_auth_token', data.idToken);
    this._notify();
    return { user: data.user };
  }

  async createUserWithEmailAndPassword(email, password, displayName) {
    const res = await fetch(`${BAJA_API_BASE}/api/firebase/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Gagal mendaftar.');
    
    this.currentUser = data.user;
    localStorage.setItem('baja_auth_user', JSON.stringify(data.user));
    if (data.idToken) localStorage.setItem('baja_auth_token', data.idToken);
    this._notify();
    return { user: data.user };
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem('baja_auth_user');
    localStorage.removeItem('baja_auth_token');
    this._notify();
  }
}

// Expose globally & provide backward-compatible Firebase facade
window.BajaDataSnapshot = BajaDataSnapshot;
window.BajaDatabaseRef = BajaDatabaseRef;
window.BajaDatabaseService = BajaDatabaseService;
window.BajaAuthService = BajaAuthService;

if (typeof window.firebase === 'undefined') {
  window.firebase = {
    apps: [{ name: '[DEFAULT]' }],
    app: (name) => {
      if (name === 'petApp') return { database: () => window.petDb, auth: () => window.auth };
      return { database: () => window.db, auth: () => window.auth };
    },
    auth: () => window.auth,
    database: () => window.db,
    initializeApp: () => ({ database: () => window.db, auth: () => window.auth })
  };
}
