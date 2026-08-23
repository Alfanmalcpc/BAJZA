// firebase-iot.js — Firebase Configuration for IoT Trash Monitor
// Project: baja-iot (dedicated IoT project)

const IOT_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI",
  authDomain:        "baja-iot.firebaseapp.com",
  databaseURL:       "https://baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "baja-iot",
  storageBucket:     "baja-iot.firebasestorage.app",
  messagingSenderId: "414515373044",
  appId:             "1:414515373044:web:fa9afd241eabf7f766cfa1",
  measurementId:     "G-BX8T03LG3D"
};

// Inisialisasi app IoT (gunakan named app agar tidak tabrakan)
let iotApp, iotDb;
try {
  iotApp = firebase.app("IotApp");
} catch (e) {
  iotApp = firebase.initializeApp(IOT_FIREBASE_CONFIG, "IotApp");
}
iotDb = iotApp.database();

// ─── Fungsi Utama ──────────────────────────────────────────────────────────

/**
 * Generate kode unik format TRS-XXXX yang belum ada di database
 */
async function generateUniqueDeviceCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code, exists;
  let attempts = 0;

  do {
    const rand = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    code = `TRS-${rand}`;

    const snap = await iotDb.ref(`trash-bins/${code}`).once('value');
    exists = snap.exists();
    attempts++;

    if (attempts > 20) throw new Error('Gagal generate kode unik. Coba lagi.');
  } while (exists);

  return code;
}

/**
 * Daftarkan perangkat baru ke database
 */
async function registerDevice(name, location, ownerUid = null) {
  const code = await generateUniqueDeviceCode();
  const now  = Date.now();

  const infoObj = {
    name:       name,
    location:   location,
    created_at: now,
    version:    "1.0"
  };

  if (ownerUid) {
    infoObj.owner = ownerUid;
  }

  await iotDb.ref(`trash-bins/${code}`).set({
    info: infoObj,
    status: {
      fill_level:   0,
      is_full:      false,
      battery:      100,
      gas_level:    0,
      last_updated: Math.floor(now / 1000)
    }
  });

  return code;
}

/**
 * Cek apakah kode device ada di database
 */
async function checkDeviceExists(code) {
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}`).once('value');
  return snap.exists();
}

/**
 * Ambil data device sekali (one-time)
 */
async function getDeviceData(code) {
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}`).once('value');
  return snap.val();
}

/**
 * Subscribe ke perubahan real-time status device
 * @param {string} code - Kode perangkat
 * @param {function} onUpdate - Callback dipanggil setiap ada perubahan
 * @returns {function} unsubscribe - Panggil untuk berhenti mendengarkan
 */
function subscribeToDevice(code, onUpdate) {
  const ref = iotDb.ref(`trash-bins/${code.toUpperCase()}`);
  ref.on('value', snap => {
    if (snap.exists()) onUpdate(snap.val());
  });
  return () => ref.off('value');
}

/**
 * Ambil histori data (50 entri terakhir)
 */
async function getDeviceHistory(code, limit = 50) {
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}/history`)
    .orderByChild('timestamp')
    .limitToLast(limit)
    .once('value');

  if (!snap.exists()) return [];

  const entries = [];
  snap.forEach(child => entries.push(child.val()));
  return entries;
}
