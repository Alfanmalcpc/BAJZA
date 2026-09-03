const fs = require('fs');
const path = require('path');

const brokenPath = path.join(__dirname, 'trash-register.html');

try {
  let content = fs.readFileSync(brokenPath, 'utf8');
  
  const missingCode = `
const btnRegister   = document.getElementById('btnRegister');
const btnRegText    = document.getElementById('btnRegText');
const regSpinner    = document.getElementById('regSpinner');
const regResult     = document.getElementById('regResult');
const regError      = document.getElementById('regError');
const inoSection    = document.getElementById('inoSection');
const linkMonitor   = document.getElementById('linkMonitor');
const arduinoCodeEl = document.getElementById('arduinoCode');
const unauthOverlay = document.getElementById('unauthOverlay');
const myDevicesList = document.getElementById('myDevicesList');

// ─── Load Perangkat & Grup ───────────────────────
async function loadMyDevices() {
  if (!currentUser) return;
  myDevicesList.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:14px;padding:28px;">Memuat perangkat...</div>';
  try {
    const [devSnap, grpSnap] = await Promise.all([
      db.ref(\`users/\${currentUser.uid}/iot_devices\`).once('value'),
      db.ref(\`users/\${currentUser.uid}/iot_groups\`).once('value')
    ]);
    allDevices = {};
    allGroups  = {};
    if (!devSnap.exists()) {
`;

  // We find the exact string where it broke
  const searchStr = `checkAuthStatus();\n\n      myDevicesList.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:14px;padding:28px;background:var(--bg-body);border-radius:14px;">Belum ada perangkat. Daftarkan baru atau tambah via kode di atas.</div>';`;
  const replaceStr = `checkAuthStatus();\n` + missingCode + `      myDevicesList.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:14px;padding:28px;background:var(--bg-body);border-radius:14px;">Belum ada perangkat. Daftarkan baru atau tambah via kode di atas.</div>';`;

  if (content.includes(searchStr)) {
      content = content.replace(searchStr, replaceStr);
      fs.writeFileSync(brokenPath, content, 'utf8');
      console.log('BERHASIL!');
  } else {
      console.log('TIDAK DITEMUKAN!');
  }
} catch (error) {
  console.error("Gagal memperbaiki:", error);
}
