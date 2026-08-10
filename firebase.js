// firebase.js — BAJA Firebase Configuration & Auth Helpers
// Firebase loaded via CDN (compat mode for easy global use)

const firebaseConfig = {
  apiKey: "AIzaSyCka7K9HnZIEUpm1qlIFKB7ca43kNz8t74",
  authDomain: "baja-account.firebaseapp.com",
  databaseURL: "https://baja-account-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "baja-account",
  storageBucket: "baja-account.firebasestorage.app",
  messagingSenderId: "829858667296",
  appId: "1:829858667296:web:2e968ca50c0f6b1838d545",
  measurementId: "G-RMHSJP0VH5"
};

// Initialize Firebase (guard against double init)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

// ---- Auth Helpers ----

async function bajaSignUp(email, password, displayName) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await cred.user.updateProfile({ displayName });
  await saveUserProfile(cred.user, { displayName, photoURL: '' });
  return cred.user;
}

async function bajaSignIn(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

async function bajaSignInGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');

  // Popup mode (works on http/https)
  try {
    const cred = await auth.signInWithPopup(provider);
    // Save profile if first login
    const snap = await db.ref(`users/${cred.user.uid}`).once('value');
    if (!snap.exists()) {
      await saveUserProfile(cred.user, {
        displayName: cred.user.displayName || '',
        photoURL: cred.user.photoURL || ''
      });
    }
    return cred.user;
  } catch (err) {
    // If popup is blocked or unsupported, fall back to redirect
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
      return auth.signInWithRedirect(provider);
    }
    throw err;
  }
}

// Handle redirect result on page load (for redirect fallback)
auth.getRedirectResult().then(async (result) => {
  if (result && result.user) {
    const snap = await db.ref(`users/${result.user.uid}`).once('value');
    if (!snap.exists()) {
      await saveUserProfile(result.user, {
        displayName: result.user.displayName || '',
        photoURL: result.user.photoURL || ''
      });
    }
    // Redirect to homepage after successful Google redirect sign-in
    if (window.location.pathname.includes('auth.html')) {
      window.location.href = 'index.html';
    }
  }
}).catch(err => {
  console.warn('Redirect result error:', err.message);
});


async function bajaSignOut() {
  await auth.signOut();
}

// ---- Profile Helpers ----

async function saveUserProfile(user, extra = {}) {
  await db.ref(`users/${user.uid}`).set({
    uid: user.uid,
    email: user.email,
    displayName: extra.displayName || user.displayName || '',
    photoURL: extra.photoURL !== undefined ? extra.photoURL : (user.photoURL || ''),
    lang: extra.lang || localStorage.getItem('baja-lang') || 'id',
    createdAt: extra.createdAt || Date.now(),
    updatedAt: Date.now()
  });
}

async function getUserProfile(uid) {
  const snap = await db.ref(`users/${uid}`).once('value');
  return snap.val();
}

async function updateDisplayName(uid, name) {
  await db.ref(`users/${uid}`).update({ displayName: name, updatedAt: Date.now() });
  if (auth.currentUser) {
    await auth.currentUser.updateProfile({ displayName: name });
  }
  
  // Sinkronisasi nama pembuat di semua karya Twibbon-nya
  try {
    const snap = await db.ref('twibbon_templates').orderByChild('authorUid').equalTo(uid).once('value');
    if (snap.exists()) {
      const updates = {};
      snap.forEach(child => {
        updates[`twibbon_templates/${child.key}/authorName`] = name;
      });
      await db.ref().update(updates);
    }
  } catch (err) {
    console.warn("Gagal sinkronisasi nama ke karya:", err);
  }
}

async function updatePhoto(uid, base64DataUrl) {
  await db.ref(`users/${uid}`).update({ photoURL: base64DataUrl, updatedAt: Date.now() });
}

async function updateLang(uid, lang) {
  await db.ref(`users/${uid}`).update({ lang, updatedAt: Date.now() });
}

// ---- Auth State Observer (runs on every page) ----
// Call this from app.js after DOM is ready

function initBajaAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(async user => {
    if (user) {
      const profile = await getUserProfile(user.uid) || {};
      const merged = {
        uid: user.uid,
        email: user.email,
        displayName: profile.displayName || user.displayName || 'Pengguna',
        photoURL: profile.photoURL || user.photoURL || '',
        lang: profile.lang || 'id'
      };
      if (onLogin) onLogin(merged);
    } else {
      if (onLogout) onLogout();
    }
  });
}
