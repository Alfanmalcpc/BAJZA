const fs = require('fs');
const path = require('path');

const brokenPath = path.join(__dirname, 'trash-register.html');
const recoveredPath = path.join(__dirname, 'recovered.js');

try {
  const brokenContent = fs.readFileSync(brokenPath, 'utf8');
  const brokenLines = brokenContent.split('\n');

  // Ambil 171 baris pertama yang masih benar
  let topHtml = "";
  const firstScriptIndex = brokenLines.findIndex(line => line.includes('<script>'));
  if (firstScriptIndex !== -1 && firstScriptIndex < 200) {
     topHtml = brokenLines.slice(0, firstScriptIndex + 1).join('\n');
  } else {
     topHtml = brokenLines.slice(0, 161).join('\n') + '\n<script>';
  }

  // Logika pengecekan auth yang baru dengan DEBUGGER
  const authLogic = `
// --- DEBUG WIDGET ---
const debugBox = document.createElement('div');
debugBox.style.position = 'fixed';
debugBox.style.bottom = '10px';
debugBox.style.left = '10px';
debugBox.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
debugBox.style.color = 'white';
debugBox.style.padding = '10px';
debugBox.style.borderRadius = '8px';
debugBox.style.zIndex = '999999';
debugBox.style.fontSize = '12px';
debugBox.style.maxWidth = '300px';
debugBox.style.pointerEvents = 'none';
debugBox.innerHTML = '<strong>DEBUG LOG:</strong><br/>';
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(debugBox));

function logDebug(msg) {
  console.log("[DEBUG]", msg);
  if (document.body) {
    if (!debugBox.parentElement) document.body.appendChild(debugBox);
    debugBox.innerHTML += msg + '<br/>';
  }
}
// --------------------

let currentUser = null;
// Cache untuk semua data perangkat dan grup
let allDevices = {};   // { fullCode: {name, location, isOwner, createdAt} }
let allGroups  = {};   // { groupId: {name, createdAt, devices: {code: true}} }

function checkAuthStatus() {
  logDebug('Cek auth object...');
  if (typeof auth === 'undefined') {
    logDebug('auth undefined, retry 200ms...');
    setTimeout(checkAuthStatus, 200);
    return;
  }
  logDebug('auth DITEMUKAN! Memanggil onAuthStateChanged...');
  auth.onAuthStateChanged((user) => {
    if (user) {
      logDebug('SUCCESS: User UID = ' + user.uid);
      currentUser = user;
      document.getElementById('unauthOverlay').style.display = 'none';
      loadMyDevices();
      
      const script = document.createElement('script');
      script.src = '/src/services/firebase-iot.js';
      document.body.appendChild(script);
      logDebug('Injeksi firebase-iot.js');
    } else {
      logDebug('FAILED: user = null (Belum login di objek auth ini)');
      currentUser = null;
      document.getElementById('unauthOverlay').style.display = 'flex';
      document.getElementById('myDevicesList').innerHTML = '<div class="tm-monitor-card" style="text-align:center;color:var(--text-2);">Silakan login untuk melihat perangkat.</div>';
    }
  }, (error) => {
    logDebug('ERROR Auth: ' + error.message);
  });
}
checkAuthStatus();
`;

  // Ambil logika JS yang berhasil direcover DARI transcript_full
  const recoveredContent = fs.readFileSync(recoveredPath, 'utf8');
  
  // Karena struktur korupsinya menginjeksi keseluruhan dokumen HTML, kita cari tag <!-- ════ Modal Edit Perangkat ════ --> dari bawah
  let modalIndex = -1;
  for (let i = brokenLines.length - 1; i >= 0; i--) {
      if (brokenLines[i].includes('<!-- ════ Modal Edit Perangkat ════ -->')) {
          modalIndex = i;
          break;
      }
  }
  
  let bottomHtml = "";
  if (modalIndex !== -1) {
    bottomHtml = '\n' + brokenLines.slice(modalIndex).join('\n');
  }

  // Rakit kembali file utuh
  const finalContent = topHtml + '\n' + authLogic + '\n' + recoveredContent + bottomHtml;

  fs.writeFileSync(brokenPath, finalContent, 'utf8');
  console.log('File successfully reassembled and overwritten!');
  
  // Hapus file fix.js dan recovered.js setelah selesai agar rapi
  fs.unlinkSync(recoveredPath);
  fs.unlinkSync(__filename);

} catch (error) {
  console.error("Gagal memperbaiki:", error);
}
