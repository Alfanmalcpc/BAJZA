/* ════════════════════════════════════════════════════════════════
   firebase.js — BAJA Firebase Configuration & Auth Helpers
   Firebase SDK: v9.22.2 (compat mode)
   Dimuat via CDN di setiap halaman yang membutuhkan auth/database
   ════════════════════════════════════════════════════════════════ */

/* ── Konfigurasi Firebase Project Utama ── */
const firebaseConfig = {
  apiKey:            "AIzaSyCka7K9HnZIEUpm1qlIFKB7ca43kNz8t74",
  authDomain:        "baja-account.firebaseapp.com",
  databaseURL:       "https://baja-account-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "baja-account",
  storageBucket:     "baja-account.firebasestorage.app",
  messagingSenderId: "829858667296",
  appId:             "1:829858667296:web:2e968ca50c0f6b1838d545",
  measurementId:     "G-RMHSJP0VH5"
};

/* Inisialisasi Firebase (guard untuk mencegah double init) */
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.database();

/* ════════════════════════════════════════════════════
   AUTH HELPERS
   Fungsi-fungsi untuk login, register, dan logout
   ════════════════════════════════════════════════════ */

/* Daftar akun baru dengan email & password */
async function bajaSignUp(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName });
  await saveUserProfile(cred.user, { displayName, photoURL: '' });
  return cred.user;
}

/* Login dengan email & password */
async function bajaSignIn(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

/* Login dengan akun Google (popup, dengan fallback redirect) */
async function bajaSignInGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');

  try {
    const cred = await auth.signInWithPopup(provider);

    /* Simpan profil jika ini login pertama kali */
    const snap = await db.ref(`users/${cred.user.uid}`).once('value');
    if (!snap.exists()) {
      await saveUserProfile(cred.user, {
        displayName: cred.user.displayName || '',
        photoURL:    cred.user.photoURL    || ''
      });
    }
    return cred.user;

  } catch (err) {
    /* Fallback ke redirect jika popup diblokir browser */
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      return auth.signInWithRedirect(provider);
    }
    throw err;
  }
}

/* Tangani hasil redirect login Google (dijalankan otomatis saat halaman load) */
auth.getRedirectResult().then(async result => {
  if (result && result.user) {
    const snap = await db.ref(`users/${result.user.uid}`).once('value');
    if (!snap.exists()) {
      await saveUserProfile(result.user, {
        displayName: result.user.displayName || '',
        photoURL:    result.user.photoURL    || ''
      });
    }
    /* Redirect ke homepage setelah login via redirect */
    if (window.location.pathname.includes('auth.html')) {
      window.location.href = '/public/index.html';
    }
  }
}).catch(err => {
  console.warn('[BAJA Auth] Redirect result error:', err.message);
});

/* Logout */
async function bajaSignOut() {
  await auth.signOut();
}

/* ════════════════════════════════════════════════════
   PROFILE HELPERS
   Simpan dan ambil data profil pengguna dari Realtime DB
   Path: users/{uid}
   ════════════════════════════════════════════════════ */

/* Simpan atau update profil pengguna ke database */
async function saveUserProfile(user, extra = {}) {
  await db.ref(`users/${user.uid}`).set({
    uid:         user.uid,
    email:       user.email,
    displayName: extra.displayName || user.displayName || '',
    photoURL:    extra.photoURL !== undefined ? extra.photoURL : (user.photoURL || ''),
    lang:        extra.lang || localStorage.getItem('baja-lang') || 'id',
    createdAt:   extra.createdAt || Date.now(),
    updatedAt:   Date.now()
  });
}

/* Ambil data profil pengguna dari database */
async function getUserProfile(uid) {
  const snap = await db.ref(`users/${uid}`).once('value');
  return snap.val();
}

/* Update nama tampilan pengguna (sinkronisasi juga ke semua Twibbon miliknya) */
async function updateDisplayName(uid, name) {
  await db.ref(`users/${uid}`).update({ displayName: name, updatedAt: Date.now() });

  if (auth.currentUser) {
    await auth.currentUser.updateProfile({ displayName: name });
  }

  /* Sinkronisasi nama ke semua template Twibbon yang dibuat user ini */
  try {
    const snap = await db.ref('twibbon_templates')
      .orderByChild('authorUid')
      .equalTo(uid)
      .once('value');

    if (snap.exists()) {
      const updates = {};
      snap.forEach(child => {
        updates[`twibbon_templates/${child.key}/authorName`] = name;
      });
      await db.ref().update(updates);
    }
  } catch (err) {
    console.warn('[BAJA] Gagal sinkronisasi nama ke Twibbon:', err);
  }
}

/* Update foto profil pengguna (disimpan sebagai Base64 URL) */
async function updatePhoto(uid, base64DataUrl) {
  await db.ref(`users/${uid}`).update({ photoURL: base64DataUrl, updatedAt: Date.now() });
}

/* Update preferensi bahasa pengguna */
async function updateLang(uid, lang) {
  await db.ref(`users/${uid}`).update({ lang, updatedAt: Date.now() });
}

/* ════════════════════════════════════════════════════
   AUTH STATE OBSERVER
   Observer global untuk memantau status login
   Dapat dipanggil dari halaman mana pun
   ════════════════════════════════════════════════════ */

function initBajaAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(async user => {
    if (user) {
      const profile = await getUserProfile(user.uid) || {};
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
