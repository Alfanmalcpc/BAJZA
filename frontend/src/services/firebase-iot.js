// firebase-iot.js — IoT Trash Monitor Secure Backend Gateway
// Terhubung aman ke Backend BAJA (/api/firebase/db/iot) — ZERO API KEY DI CLIENT!

const iotDb = new window.BajaDatabaseService('iot');

/**
 * Generate unique 4-character device code
 */
function generateUniqueDeviceCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Register a new device safely via backend
 */
async function registerDevice(userUid, userEmail, deviceName, location, deviceType = 'standard') {
  let code = generateUniqueDeviceCode();
  let attempts = 0;

  while (attempts < 10) {
    const snap = await iotDb.ref(`trash-bins/${code}`).once('value');
    if (!snap.exists()) break;
    code = generateUniqueDeviceCode();
    attempts++;
  }

  if (attempts >= 10) {
    throw new Error('Gagal menghasilkan kode unik tempat sampah, silakan coba lagi.');
  }

  const now = Date.now();
  const deviceData = {
    info: {
      code,
      name: deviceName || `Tong Sampah #${code}`,
      location: location || 'Lokasi Belum Ditentukan',
      type: deviceType,
      owner_uid: userUid,
      owner_email: userEmail,
      registered_at: now
    },
    status: {
      fill_level: 0,
      is_full: false,
      lid_status: 'closed',
      battery_level: 100,
      last_updated: now,
      online: false
    },
    config: {
      alert_threshold: 80,
      reporting_interval: 30,
      sound_alert: true
    }
  };

  await iotDb.ref(`trash-bins/${code}`).set(deviceData);
  return { code, ...deviceData };
}

async function checkDeviceExists(code) {
  if (!code) return false;
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}`).once('value');
  return snap.exists();
}

async function getDeviceInfo(code) {
  if (!code) return null;
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}/info`).once('value');
  return snap.val();
}

async function updateDeviceInfo(code, name, location) {
  if (!code) throw new Error('Kode perangkat diperlukan.');
  await iotDb.ref(`trash-bins/${code.toUpperCase()}/info`).update({ name, location });
  return true;
}

async function getDeviceData(code) {
  if (!code) return null;
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}`).once('value');
  return snap.val();
}

function listenDeviceStatus(code, callback) {
  if (!code) return () => {};
  const ref = iotDb.ref(`trash-bins/${code.toUpperCase()}`);
  ref.on('value', snap => {
    callback(snap.val());
  });
  return () => ref.off('value');
}

async function getDeviceHistory(code, limit = 20) {
  if (!code) return [];
  const snap = await iotDb.ref(`trash-bins/${code.toUpperCase()}/history`)
    .limitToLast(limit)
    .once('value');
  
  if (!snap.exists()) return [];
  const history = [];
  snap.forEach(child => {
    history.push({ id: child.key, ...child.val() });
  });
  return history.reverse();
}

async function recordTelemetry(code, telemetryData) {
  if (!code) return;
  const now = Date.now();
  const ref = iotDb.ref(`trash-bins/${code.toUpperCase()}/history`);
  await ref.push({ ...telemetryData, timestamp: now });
}

window.iotDb = iotDb;
window.generateUniqueDeviceCode = generateUniqueDeviceCode;
window.registerDevice = registerDevice;
window.checkDeviceExists = checkDeviceExists;
window.getDeviceInfo = getDeviceInfo;
window.updateDeviceInfo = updateDeviceInfo;
window.getDeviceData = getDeviceData;
window.listenDeviceStatus = listenDeviceStatus;
window.getDeviceHistory = getDeviceHistory;
window.recordTelemetry = recordTelemetry;
