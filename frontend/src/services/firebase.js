// firebase.js — BAJA Secure Backend Authentication & Realtime Service
// Seluruh mutasi & query database aman lewat Backend Vercel Gateway — ZERO CLIENT KEYS

if (typeof window.BajaDatabaseService === 'undefined') {
  console.warn('[BAJA] Memuat bridge backend internal...');
}

const auth = new window.BajaAuthService();
const db = new window.BajaDatabaseService('account');

/* ════════════════════════════════════════════════════
   AUTH HELPER FUNCTIONS
   ════════════════════════════════════════════════════ */

async function bajaSignUp(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password, displayName);
  return cred.user;
}

async function bajaSignIn(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function bajaSignInGoogle() {
  if (typeof firebase === 'undefined' || typeof firebase.auth !== 'function') {
    throw new Error('Layanan autentikasi Google SDK belum siap. Muat ulang halaman.');
  }

  // Inisialisasi Firebase secara dinamis dari Gateway Backend tanpa hardcoded API Key di kode
  if (!firebase.apps || !firebase.apps.length) {
    const apiBase = window.BAJA_API_BASE || 'https://bajza.vercel.app';
    const cfgRes = await fetch(`${apiBase}/api/firebase/auth/config`);
    if (!cfgRes.ok) throw new Error('Gagal menghubungi gateway autentikasi.');
    const cfg = await cfgRes.json();
    firebase.initializeApp(cfg);
  }

  const authInstance = firebase.auth();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');

  let cred;
  try {
    cred = await authInstance.signInWithPopup(provider);
  } catch (err) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      return authInstance.signInWithRedirect(provider);
    }
    throw err;
  }

  if (!cred || !cred.user) {
    throw new Error('Gagal mendapatkan sesi otentikasi Google.');
  }

  const user = cred.user;
  const idToken = await user.getIdToken();
  const userData = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna'),
    photoURL: user.photoURL || '',
    buzz: 50
  };

  localStorage.setItem('baja_auth_user', JSON.stringify(userData));
  localStorage.setItem('baja_auth_token', idToken);

  if (window.auth) {
    window.auth.currentUser = userData;
    if (typeof window.auth._notify === 'function') {
      window.auth._notify();
    }
  }

  try {
    await saveUserProfile(userData);
  } catch (e) {
    console.warn('[BAJA Auth] Sinkronisasi profil Google ke DB:', e);
  }

  return userData;
}

async function bajaSignOut() {
  await auth.signOut();
}

async function saveUserProfile(user, extra = {}) {
  const ref = db.ref(`users/${user.uid}`);
  const snap = await ref.once('value');
  const existing = snap.val() || {};

  const profile = {
    uid: user.uid,
    email: user.email || existing.email || '',
    displayName: extra.displayName || user.displayName || existing.displayName || 'Pengguna',
    photoURL: extra.photoURL || user.photoURL || existing.photoURL || '',
    lang: extra.lang || existing.lang || 'id',
    buzz: existing.buzz !== undefined ? existing.buzz : 50,
    character: existing.character || { ...BAJA_DEFAULT_CHARACTER },
    updatedAt: Date.now()
  };

  await ref.update(profile);
  return profile;
}

/* ════════════════════════════════════════════════════
   CHARACTER & REWARD SYSTEM
   ════════════════════════════════════════════════════ */

const BAJA_DEFAULT_CHARACTER = {
  gender: 'neutral',
  bodyShape: 'average',
  skinTone: '#f8d9b6',
  eyeColor: '#2b2b2b',
  hairStyle: 'short',
  hairColor: '#2f1f17',
  outfit: 'basic-blue',
  eyewear: 'none',
  backItem: 'none',
  footwear: 'basic-shoes',
  headwear: 'none'
};

const BAJA_CATALOG = {
  outfits: {
    'basic-blue': { name: 'Kaos Biru Klasik', price: 0 },
    'cyber-hoodie': { name: 'Hoodie Cyber', price: 40 },
    'retro-jacket': { name: 'Jaket Retro', price: 65 },
    'stealth-suit': { name: 'Baju Taktis', price: 80 }
  },
  eyewear: {
    none: { name: 'Tanpa Kacamata', price: 0 },
    'round-glasses': { name: 'Kacamata Bulat', price: 25 },
    shades: { name: 'Kacamata Hitam', price: 35 }
  },
  backItem: {
    none: { name: 'Tanpa Tas', price: 0 },
    backpack: { name: 'Ransel Petualang', price: 55 }
  },
  footwear: {
    'basic-shoes': { name: 'Sepatu Dasar', price: 0 },
    'pink-sneakers': { name: 'Sepatu Pink', price: 45 },
    'mint-sneakers': { name: 'Sepatu Mint', price: 45 }
  },
  headwear: {
    none: { name: 'Tanpa Penutup Kepala', price: 0 },
    crown: { name: 'Mahkota', price: 90 },
    'cat-hood': { name: 'Hoodie Kucing', price: 70 }
  }
};

window.BAJA_DEFAULT_CHARACTER = BAJA_DEFAULT_CHARACTER;
window.BAJA_CATALOG = BAJA_CATALOG;

function expandBajaCatalog() {
  const groups = [
    ['outfits', 'Outfit', ['#2563eb','#ec4899','#10b981','#8b5cf6','#f59e0b','#ef4444','#14b8a6','#64748b']],
    ['headwear', 'Headwear', ['#facc15','#ef4444','#60a5fa','#a78bfa','#34d399','#fb7185','#f97316','#e2e8f0']],
    ['eyewear', 'Kacamata', ['#172033','#0f766e','#7c3aed','#be123c','#0369a1','#854d0e','#334155','#111827']],
    ['backItem', 'Aksesori Punggung', ['#ec4899','#2563eb','#10b981','#f59e0b','#8b5cf6','#ef4444','#14b8a6','#64748b']],
    ['footwear', 'Sepatu', ['#334155','#ec4899','#10b981','#2563eb','#f59e0b','#ef4444','#8b5cf6','#111827']]
  ];
  groups.forEach(([type, label, colors]) => {
    const catalog = BAJA_CATALOG[type];
    for (let n = 1; Object.keys(catalog).length < 100; n++) {
      const id = `${type}-${String(n).padStart(3, '0')}`;
      if (catalog[id]) continue;
      const price = n === 1 ? 0 : 15 + ((n * 17) % 120);
      catalog[id] = { name: `${label} ${String(n).padStart(3, '0')}`, price, color: colors[(n - 1) % colors.length], variant: n, rarity: price >= 100 ? 'Legendaris' : price >= 55 ? 'Langka' : 'Umum' };
    }
  });
}
expandBajaCatalog();

function getCharacterProfile(profile = {}) {
  return { ...BAJA_DEFAULT_CHARACTER, ...(profile.character || {}) };
}

async function updateCharacter(uid, character) {
  const clean = { ...BAJA_DEFAULT_CHARACTER, ...character };
  await db.ref(`users/${uid}`).update({ character: clean, characterOnboardingRequired: false, updatedAt: Date.now() });
  return clean;
}

async function updateBuzz(uid, amount) {
  const apiBase = window.BAJA_API_BASE || '';
  const res = await fetch(`${apiBase}/api/firebase/db/account/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: `users/${uid}/buzz`, delta: Number(amount) })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Buzz tidak cukup.');
  return data.value;
}

async function buyCharacterItem(uid, type, itemId) {
  const catalog = BAJA_CATALOG[type] || {};
  const item = catalog[itemId];
  if (!item) throw new Error('Item tidak ditemukan.');
  const profileRef = db.ref(`users/${uid}`);
  const snap = await profileRef.once('value');
  const profile = snap.val() || {};
  const ownedKey = type === 'outfits' ? 'ownedOutfits' : `owned${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const owned = Array.isArray(profile[ownedKey]) ? profile[ownedKey] : [type === 'outfits' ? 'basic-blue' : 'none'];
  if (owned.includes(itemId)) return profile;
  await updateBuzz(uid, -Number(item.price || 0));
  owned.push(itemId);
  await profileRef.update({ [ownedKey]: owned, updatedAt: Date.now() });
  return { ...profile, [ownedKey]: owned };
}

async function equipCharacterItem(uid, type, itemId) {
  const profile = await getUserProfile(uid) || {};
  const ownedKey = type === 'outfits' ? 'ownedOutfits' : `owned${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  if (!(profile[ownedKey] || []).includes(itemId)) throw new Error('Item belum dimiliki.');
  const character = { ...BAJA_DEFAULT_CHARACTER, ...(profile.character || {}) };
  character[type === 'outfits' ? 'outfit' : type] = itemId;
  return updateCharacter(uid, character);
}

async function getUserProfile(uid) {
  const snap = await db.ref(`users/${uid}`).once('value');
  return snap.val();
}

async function updateDisplayName(uid, name) {
  await db.ref(`users/${uid}`).update({ displayName: name, updatedAt: Date.now() });
  if (auth.currentUser) {
    auth.currentUser.displayName = name;
  }
}

async function updatePhoto(uid, base64DataUrl) {
  await db.ref(`users/${uid}`).update({ photoURL: base64DataUrl, updatedAt: Date.now() });
  if (auth.currentUser) {
    auth.currentUser.photoURL = base64DataUrl;
  }
}

async function updateLang(uid, lang) {
  await db.ref(`users/${uid}`).update({ lang, updatedAt: Date.now() });
}

function initBajaAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(async user => {
    if (user) {
      let profile = {};
      try {
        profile = (await getUserProfile(user.uid)) || {};
      } catch (err) {
        console.warn('[BAJA Auth] Gagal memuat profil DB:', err.message);
      }
      
      const merged = {
        uid:         user.uid,
        email:       user.email,
        displayName: profile.displayName || user.displayName || 'Pengguna',
        photoURL:    profile.photoURL    || user.photoURL    || '',
        lang:        profile.lang        || 'id'
      };
      if (onLogin) onLogin(merged);
    } else {
      if (onLogout) onLogout();
    }
  });
}
