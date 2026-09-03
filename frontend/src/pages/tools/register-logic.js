/* ================================================================
   register-logic.js — BAJA IoT Register Page Logic
   Dipisah dari HTML agar tidak ada masalah encoding/template literal
   ================================================================ */

'use strict';

let currentUser = null;
let allDevices  = {};
let allGroups   = {};

// ─── Auth ────────────────────────────────────────────────────────
function initAuth() {
  if (typeof auth === 'undefined') {
    setTimeout(initAuth, 200);
    return;
  }
  auth.onAuthStateChanged(function(user) {
    const overlay  = document.getElementById('unauthOverlay');
    const devList  = document.getElementById('myDevicesList');
    if (user) {
      currentUser = user;
      if (overlay) overlay.style.display = 'none';
      loadMyDevices();
    } else {
      currentUser = null;
      if (overlay) overlay.style.display = 'flex';
      if (devList) devList.innerHTML = '<div style="text-align:center;color:var(--text-2);">Silakan login untuk melihat perangkat.</div>';
    }
  });
}
initAuth();

// ─── Load Perangkat & Grup ────────────────────────────────────────
async function loadMyDevices() {
  if (!currentUser) return;
  const myDevicesList = document.getElementById('myDevicesList');
  if (!myDevicesList) return;
  myDevicesList.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:14px;padding:28px;">Memuat perangkat...</div>';
  try {
    const [devSnap, grpSnap] = await Promise.all([
      db.ref('users/' + currentUser.uid + '/iot_devices').once('value'),
      db.ref('users/' + currentUser.uid + '/iot_groups').once('value')
    ]);
    allDevices = {};
    allGroups  = {};
    if (!devSnap.exists()) {
      myDevicesList.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:14px;padding:28px;background:var(--bg-body);border-radius:14px;">Belum ada perangkat. Daftarkan baru atau tambah via kode di atas.</div>';
      return;
    }
    devSnap.forEach(function(child) { allDevices[child.key] = child.val(); });
    if (grpSnap.exists()) grpSnap.forEach(function(child) { allGroups[child.key] = child.val(); });
    renderDeviceList();
    // Cek status online async
    Object.keys(allDevices).forEach(async function(fullCode) {
      var shortCode = fullCode.replace('TRS-', '');
      try {
        var st = await iotDb.ref('trash-bins/' + fullCode + '/status/last_updated').once('value');
        var badge = document.getElementById('badge-' + shortCode);
        if (!badge) return;
        if (st.exists()) {
          var diff = Math.floor(Date.now() / 1000) - st.val();
          if (diff < 60) {
            badge.style.background = 'rgba(74,222,128,0.15)';
            badge.style.color = '#4ade80';
            badge.textContent = '\u25cf Online';
          } else {
            badge.style.background = 'rgba(248,113,113,0.1)';
            badge.style.color = '#f87171';
            badge.textContent = '\u25cb Offline';
          }
        } else { badge.textContent = '\u25cb Belum aktif'; }
      } catch(_) {}
    });
  } catch(e) {
    console.error('[IoT Register]', e);
    var myDevicesList2 = document.getElementById('myDevicesList');
    if (myDevicesList2) myDevicesList2.innerHTML = '<div style="text-align:center;color:var(--red);font-size:14px;">Gagal memuat daftar perangkat.</div>';
  }
}

// ─── Render Kartu Perangkat ───────────────────────────────────────
function buildDeviceCard(fullCode, dev) {
  var shortCode  = fullCode.replace('TRS-', '');
  var safeName   = (dev.name     || '').replace(/"/g, '&quot;');
  var safeLoc    = (dev.location || '').replace(/"/g, '&quot;');
  var isOwner    = dev.isOwner !== false;
  var createdAt  = dev.createdAt
    ? new Date(dev.createdAt).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})
    : '\u2014';
  var ownerBadge = isOwner ? '' : '<span style="font-size:10px;background:rgba(99,102,241,0.18);color:#818cf8;padding:2px 8px;border-radius:4px;font-weight:700;margin-left:6px;">Dipantau</span>';
  var scriptBtn  = isOwner
    ? '<button class="btn-view-script" data-code="' + shortCode + '" data-name="' + safeName + '" style="flex:1;min-width:70px;background:var(--bg-surface);border:1.5px solid var(--border);color:var(--text-1);padding:9px 12px;border-radius:var(--r-full);font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);">\uD83D\uDCCB Skrip</button>'
    : '';
  return '<div style="background:var(--bg-body);border:1px solid var(--border);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">'
    +   '<div style="flex:1;min-width:0;">'
    +     '<div style="font-weight:800;font-size:15px;color:var(--text-1);">' + dev.name + ownerBadge + '</div>'
    +     '<div style="font-size:12px;color:var(--text-2);margin-top:4px;">\uD83D\uDCCD ' + dev.location + '</div>'
    +     '<div style="font-size:11px;color:var(--text-3);margin-top:3px;">\uD83D\uDCC5 ' + createdAt + ' &nbsp;&middot;&nbsp; Kode: <strong style="color:var(--blue);">' + fullCode + '</strong></div>'
    +   '</div>'
    +   '<div id="badge-' + shortCode + '" style="flex-shrink:0;font-size:11px;font-weight:700;padding:5px 12px;border-radius:var(--r-full);background:rgba(100,100,100,0.12);color:var(--text-3);">\u23F3 Cek...</div>'
    + '</div>'
    + '<div style="display:flex;gap:6px;flex-wrap:wrap;">'
    +   '<a href="trash-monitor.html?code=' + shortCode + '" style="flex:1;min-width:70px;background:var(--blue);color:#fff;padding:9px 12px;border-radius:var(--r-full);text-decoration:none;font-size:12px;font-weight:700;text-align:center;">\uD83D\uDD0D Pantau</a>'
    +   '<button class="btn-edit-device" data-fullcode="' + fullCode + '" data-name="' + safeName + '" data-loc="' + safeLoc + '" data-owner="' + isOwner + '" style="flex:1;min-width:70px;background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.25);color:#facc15;padding:9px 12px;border-radius:var(--r-full);font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);">\u270F\uFE0F Edit</button>'
    +   scriptBtn
    +   '<button class="btn-manage-groups" data-fullcode="' + fullCode + '" data-name="' + safeName + '" style="flex-shrink:0;width:38px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);color:#818cf8;border-radius:var(--r-full);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Kelola Grup">\uD83D\uDCC2</button>'
    +   '<button class="btn-delete-device" data-fullcode="' + fullCode + '" data-name="' + safeName + '" data-owner="' + isOwner + '" style="flex-shrink:0;width:38px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);color:#f87171;border-radius:var(--r-full);font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;" title="Hapus">\uD83D\uDDD1\uFE0F</button>'
    + '</div>'
    + '</div>';
}

// ─── Render Daftar ────────────────────────────────────────────────
function renderDeviceList() {
  var myDevicesList = document.getElementById('myDevicesList');
  if (!myDevicesList) return;
  var codesInGroups = new Set();
  Object.values(allGroups).forEach(function(g) {
    if (g.devices) Object.keys(g.devices).forEach(function(c) { codesInGroups.add(c); });
  });
  var html = '';
  Object.entries(allGroups).forEach(function(entry) {
    var groupId = entry[0], group = entry[1];
    var devCodes    = group.devices ? Object.keys(group.devices) : [];
    var safeGrpName = (group.name || '').replace(/"/g, '&quot;');
    html += '<div style="border:1.5px solid rgba(99,102,241,0.3);border-radius:16px;overflow:hidden;margin-bottom:4px;">'
      + '<div style="background:rgba(99,102,241,0.1);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">'
      +   '<div style="font-weight:800;font-size:14px;color:#818cf8;">\uD83D\uDCC2 ' + group.name + ' <span style="font-size:11px;font-weight:600;color:var(--text-3);">(' + devCodes.length + ' perangkat)</span></div>'
      +   '<div style="display:flex;gap:6px;">'
      +     '<button class="btn-rename-group" data-groupid="' + groupId + '" data-name="' + safeGrpName + '" style="background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#818cf8;padding:5px 12px;border-radius:var(--r-full);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);">\u270F\uFE0F Rename</button>'
      +     '<button class="btn-delete-group" data-groupid="' + groupId + '" data-name="' + safeGrpName + '" style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);color:#f87171;padding:5px 10px;border-radius:var(--r-full);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);">\uD83D\uDDD1\uFE0F</button>'
      +   '</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:10px;padding:12px;">'
      +   (devCodes.length === 0
          ? '<div style="text-align:center;color:var(--text-3);font-size:13px;padding:16px;">Belum ada perangkat di grup ini.</div>'
          : devCodes.map(function(fc) { return allDevices[fc] ? buildDeviceCard(fc, allDevices[fc]) : ''; }).join(''))
      + '</div>'
      + '</div>';
  });
  var ungrouped = Object.entries(allDevices).filter(function(e) { return !codesInGroups.has(e[0]); });
  if (ungrouped.length > 0) {
    html += '<div style="border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:4px;">'
      + '<div style="background:rgba(255,255,255,0.03);padding:12px 16px;font-weight:700;font-size:13px;color:var(--text-3);">\uD83D\uDCCB Tanpa Grup <span style="font-weight:600;">(' + ungrouped.length + ')</span></div>'
      + '<div style="display:flex;flex-direction:column;gap:10px;padding:12px;">'
      +   ungrouped.map(function(e) { return buildDeviceCard(e[0], e[1]); }).join('')
      + '</div>'
      + '</div>';
  }
  myDevicesList.innerHTML = html || '<div style="text-align:center;color:var(--text-3);font-size:14px;padding:28px;">Belum ada perangkat.</div>';
}

// ─── Generate Arduino Code ────────────────────────────────────────
function buildArduinoCode(deviceCode, boardType) {
  var isSingleADC = (boardType === 'esp8266' || boardType === 'wemos' || boardType === 'arduino_esp01');
  var boardNames  = { esp32: 'ESP32', esp8266: 'ESP8266 / NodeMCU', wemos: 'Wemos D1 Mini', arduino_esp01: 'Arduino + ESP-01' };
  var boardName   = boardNames[boardType] || 'ESP32';
  var dateStr     = new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});

  if (isSingleADC) {
    return [
      '/*',
      ' ======================================================',
      '  BAJA IoT Trash Monitor -- ' + boardName + ' Sketch',
      '  Version : 3.0 (Multi-Sensor + CD74HC4067 Multiplexer)',
      '  Perangkat : TRS-' + deviceCode,
      '  Dibuat    : ' + dateStr,
      ' ======================================================',
      '*/',
      '',
      '#if defined(ESP8266) || defined(WEMOS)',
      '  #include <ESP8266WiFi.h>',
      '#else',
      '  #include <WiFi.h>',
      '#endif',
      '#include <Firebase_ESP_Client.h>',
      '#include <addons/TokenHelper.h>',
      '#include <addons/RTDBHelper.h>',
      '#include <ArduinoJson.h>',
      '#include <time.h>',
      '',
      '// --- KONFIGURASI WAJIB ---',
      '#define WIFI_SSID       "NAMA_WIFI_ANDA"',
      '#define WIFI_PASSWORD   "PASSWORD_WIFI_ANDA"',
      '#define DEVICE_CODE     "' + deviceCode + '"',
      '#define FIREBASE_HOST   "baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app"',
      '#define FIREBASE_AUTH   "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI"',
      '',
      '#define ADC_MAX         1023.0',
      '#define TRIG_PIN        D1',
      '#define ECHO_PIN        D2',
      '#define LED_PIN         LED_BUILTIN',
      '#define MUX_SIG         A0',
      '#define MUX_S0          D5',
      '#define MUX_S1          D6',
      '#define MUX_S2          D7',
      '#define MUX_S3          D8',
      '#define CH_MQ4          0',
      '#define CH_MQ135        1',
      '#define CH_MQ2          2',
      '#define BIN_HEIGHT_CM   50',
      '#define UPDATE_INTERVAL 10000',
      '',
      'FirebaseData fbdo; FirebaseAuth fbAuth; FirebaseConfig fbConfig;',
      'String devicePath, histPath;',
      'unsigned long lastUpdate = 0;',
      '',
      'void selectMuxChannel(int ch) {',
      '  digitalWrite(MUX_S0,(ch>>0)&1); digitalWrite(MUX_S1,(ch>>1)&1);',
      '  digitalWrite(MUX_S2,(ch>>2)&1); digitalWrite(MUX_S3,(ch>>3)&1);',
      '  delay(5);',
      '}',
      'int readGasChannel(int ch) { selectMuxChannel(ch); return map(analogRead(MUX_SIG),0,(int)ADC_MAX,0,1000); }',
      '',
      'void setup() {',
      '  Serial.begin(115200); delay(500);',
      '  pinMode(TRIG_PIN,OUTPUT); pinMode(ECHO_PIN,INPUT); pinMode(LED_PIN,OUTPUT);',
      '  pinMode(MUX_S0,OUTPUT); pinMode(MUX_S1,OUTPUT); pinMode(MUX_S2,OUTPUT); pinMode(MUX_S3,OUTPUT);',
      '  devicePath = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/status";',
      '  histPath   = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/history";',
      '  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);',
      '  while (WiFi.status() != WL_CONNECTED) { delay(500); }',
      '  configTime(25200,0,"pool.ntp.org","time.nist.gov");',
      '  while (time(nullptr) < 100000) { delay(200); }',
      '  fbConfig.database_url = FIREBASE_HOST;',
      '  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;',
      '  fbConfig.token_status_callback = tokenStatusCallback;',
      '  Firebase.begin(&fbConfig, &fbAuth); Firebase.reconnectWiFi(true);',
      '  Serial.println("Firebase OK! Kode: TRS-" + String(DEVICE_CODE));',
      '}',
      '',
      'float readDistanceCm() {',
      '  digitalWrite(TRIG_PIN,LOW); delayMicroseconds(2);',
      '  digitalWrite(TRIG_PIN,HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN,LOW);',
      '  long d = pulseIn(ECHO_PIN,HIGH,30000);',
      '  return d == 0 ? -1 : d * 0.0343 / 2.0;',
      '}',
      '',
      'void sendToFirebase(int fill, int mq4, int mq135, int mq2, bool full) {',
      '  time_t now = time(nullptr);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/fill_level", fill);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/gas_mq4",    mq4);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/gas_mq135",  mq135);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/gas_ppm",    mq2);',
      '  Firebase.RTDB.setBool(&fbdo,devicePath+"/is_full",    full);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/last_updated",(int)now);',
      '  FirebaseJson h; h.set("fill_level",fill); h.set("gas_mq4",mq4); h.set("gas_mq135",mq135); h.set("gas_ppm",mq2); h.set("timestamp",(int)now);',
      '  Firebase.RTDB.pushJSON(&fbdo, histPath, &h);',
      '}',
      '',
      'void loop() {',
      '  if (millis()-lastUpdate >= UPDATE_INTERVAL) {',
      '    lastUpdate = millis();',
      '    float dist = readDistanceCm();',
      '    int fill   = dist<0?-1:constrain((int)((1.0-(dist/BIN_HEIGHT_CM))*100.0),0,100);',
      '    int mq4    = readGasChannel(CH_MQ4);',
      '    int mq135  = readGasChannel(CH_MQ135);',
      '    int mq2    = readGasChannel(CH_MQ2);',
      '    if (fill >= 0 && WiFi.status()==WL_CONNECTED)',
      '      sendToFirebase(fill, mq4, mq135, mq2, fill>=90);',
      '  }',
      '}'
    ].join('\n');
  } else {
    // ESP32
    return [
      '/*',
      ' ======================================================',
      '  BAJA IoT Trash Monitor -- ESP32 Sketch',
      '  Version : 3.0 (Multi-Sensor, 3 ADC Langsung)',
      '  Perangkat : TRS-' + deviceCode,
      '  Dibuat    : ' + dateStr,
      ' ======================================================',
      '*/',
      '',
      '#include <WiFi.h>',
      '#include <Firebase_ESP_Client.h>',
      '#include <addons/TokenHelper.h>',
      '#include <addons/RTDBHelper.h>',
      '#include <ArduinoJson.h>',
      '#include <time.h>',
      '',
      '// --- KONFIGURASI WAJIB ---',
      '#define WIFI_SSID       "NAMA_WIFI_ANDA"',
      '#define WIFI_PASSWORD   "PASSWORD_WIFI_ANDA"',
      '#define DEVICE_CODE     "' + deviceCode + '"',
      '#define FIREBASE_HOST   "baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app"',
      '#define FIREBASE_AUTH   "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI"',
      '',
      '#define ADC_MAX         4095.0',
      '#define TRIG_PIN        5',
      '#define ECHO_PIN        18',
      '#define MQ4_PIN         34',
      '#define MQ135_PIN       35',
      '#define MQ2_PIN         32',
      '#define LED_PIN         2',
      '#define BIN_HEIGHT_CM   50',
      '#define UPDATE_INTERVAL 10000',
      '',
      'FirebaseData fbdo; FirebaseAuth fbAuth; FirebaseConfig fbConfig;',
      'String devicePath, histPath;',
      'unsigned long lastUpdate = 0;',
      '',
      'int readGasPPM(int pin) { return map(analogRead(pin),0,(int)ADC_MAX,0,1000); }',
      '',
      'void setup() {',
      '  Serial.begin(115200); delay(500);',
      '  pinMode(TRIG_PIN,OUTPUT); pinMode(ECHO_PIN,INPUT); pinMode(LED_PIN,OUTPUT);',
      '  devicePath = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/status";',
      '  histPath   = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/history";',
      '  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);',
      '  while (WiFi.status()!=WL_CONNECTED) { delay(500); }',
      '  configTime(25200,0,"pool.ntp.org","time.nist.gov");',
      '  while (time(nullptr)<100000) { delay(200); }',
      '  fbConfig.database_url = FIREBASE_HOST;',
      '  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;',
      '  fbConfig.token_status_callback = tokenStatusCallback;',
      '  Firebase.begin(&fbConfig,&fbAuth); Firebase.reconnectWiFi(true);',
      '  Serial.println("Firebase OK! Kode: TRS-" + String(DEVICE_CODE));',
      '}',
      '',
      'float readDistanceCm() {',
      '  digitalWrite(TRIG_PIN,LOW); delayMicroseconds(2);',
      '  digitalWrite(TRIG_PIN,HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN,LOW);',
      '  long d = pulseIn(ECHO_PIN,HIGH,30000);',
      '  return d==0?-1:d*0.0343/2.0;',
      '}',
      '',
      'void sendToFirebase(int fill, int mq4, int mq135, int mq2, bool full) {',
      '  time_t now = time(nullptr);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/fill_level", fill);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/gas_mq4",    mq4);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/gas_mq135",  mq135);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/gas_ppm",    mq2);',
      '  Firebase.RTDB.setBool(&fbdo,devicePath+"/is_full",    full);',
      '  Firebase.RTDB.setInt(&fbdo, devicePath+"/last_updated",(int)now);',
      '  FirebaseJson h; h.set("fill_level",fill); h.set("gas_mq4",mq4); h.set("gas_mq135",mq135); h.set("gas_ppm",mq2); h.set("timestamp",(int)now);',
      '  Firebase.RTDB.pushJSON(&fbdo, histPath, &h);',
      '}',
      '',
      'void loop() {',
      '  if (millis()-lastUpdate >= UPDATE_INTERVAL) {',
      '    lastUpdate = millis();',
      '    float dist = readDistanceCm();',
      '    int fill   = dist<0?-1:constrain((int)((1.0-(dist/BIN_HEIGHT_CM))*100.0),0,100);',
      '    int mq4    = readGasPPM(MQ4_PIN);',
      '    int mq135  = readGasPPM(MQ135_PIN);',
      '    int mq2    = readGasPPM(MQ2_PIN);',
      '    if (fill>=0 && WiFi.status()==WL_CONNECTED)',
      '      sendToFirebase(fill,mq4,mq135,mq2,fill>=90);',
      '  }',
      '}'
    ].join('\n');
  }
}

// ─── Event: Register ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var btnRegister   = document.getElementById('btnRegister');
  var btnRegText    = document.getElementById('btnRegText');
  var regSpinner    = document.getElementById('regSpinner');
  var regResult     = document.getElementById('regResult');
  var regError      = document.getElementById('regError');
  var inoSection    = document.getElementById('inoSection');
  var linkMonitor   = document.getElementById('linkMonitor');
  var arduinoCodeEl = document.getElementById('arduinoCode');

  if (btnRegister) {
    btnRegister.addEventListener('click', async function() {
      if (!currentUser) { alert('Silakan login terlebih dahulu.'); return; }
      var name      = document.getElementById('regName').value.trim();
      var location  = document.getElementById('regLocation').value.trim();
      var boardType = document.getElementById('regBoard').value;
      if (!name || !location) {
        regError.textContent = 'Mohon isi semua field terlebih dahulu.';
        regError.classList.add('show'); return;
      }
      regError.classList.remove('show');
      btnRegText.textContent = 'Membuat kode...';
      regSpinner.style.display = 'flex';
      btnRegister.disabled = true;
      try {
        var fullCode  = await registerDevice(name, location, currentUser.uid);
        var shortCode = fullCode.replace('TRS-', '');
        await db.ref('users/' + currentUser.uid + '/iot_devices/' + fullCode).set({
          name: name, location: location, board_type: boardType,
          createdAt: Date.now(), isOwner: true
        });
        loadMyDevices();
        document.getElementById('generatedCode').textContent = fullCode;
        linkMonitor.href = 'trash-monitor.html?code=' + shortCode;
        regResult.classList.add('show');
        arduinoCodeEl.textContent = buildArduinoCode(shortCode, boardType);
        inoSection.classList.add('show');
        setTimeout(function() { inoSection.scrollIntoView({behavior:'smooth',block:'start'}); }, 300);
      } catch(e) {
        regError.textContent = 'Gagal membuat kode: ' + e.message;
        regError.classList.add('show');
      } finally {
        btnRegText.textContent = '\u2705 Generate Kode Perangkat';
        regSpinner.style.display = 'none';
        btnRegister.disabled = false;
      }
    });
  }

  // Salin kode Arduino
  var btnCopy = document.getElementById('btnCopyArduino');
  if (btnCopy) {
    btnCopy.addEventListener('click', function() {
      navigator.clipboard.writeText(arduinoCodeEl.textContent).then(function() {
        btnCopy.textContent = '\u2705 Tersalin!';
        setTimeout(function() { btnCopy.textContent = '\uD83D\uDCCB Salin Semua Kode'; }, 2500);
      });
    });
  }

  // Salin kode dari modal
  var btnModalCopy = document.getElementById('btnModalCopy');
  if (btnModalCopy) {
    btnModalCopy.addEventListener('click', function() {
      navigator.clipboard.writeText(document.getElementById('modalArduinoCode').textContent).then(function() {
        var orig = btnModalCopy.textContent;
        btnModalCopy.textContent = '\u2705 Tersalin!';
        setTimeout(function() { btnModalCopy.textContent = orig; }, 2500);
      });
    });
  }

  // Tambah via kode
  var joinInput = document.getElementById('joinCodeInput');
  if (joinInput) {
    joinInput.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      document.getElementById('joinError').style.display = 'none';
    });
  }
  var btnJoin = document.getElementById('btnJoinDevice');
  if (btnJoin) {
    btnJoin.addEventListener('click', async function() {
      if (!currentUser) { alert('Silakan login terlebih dahulu.'); return; }
      var raw      = document.getElementById('joinCodeInput').value.trim().toUpperCase();
      var joinErr  = document.getElementById('joinError');
      var fullCode = 'TRS-' + raw;
      if (raw.length !== 4) { joinErr.textContent = 'Masukkan tepat 4 karakter.'; joinErr.style.display = 'block'; return; }
      if (allDevices[fullCode]) { joinErr.textContent = 'Perangkat ini sudah ada di daftar Anda.'; joinErr.style.display = 'block'; return; }
      joinErr.style.display = 'none';
      btnJoin.textContent = '...'; btnJoin.disabled = true;
      try {
        var info = await getDeviceInfo(fullCode);
        if (!info) { joinErr.textContent = 'Kode tidak ditemukan.'; joinErr.style.display = 'block'; return; }
        await db.ref('users/' + currentUser.uid + '/iot_devices/' + fullCode).set({
          name: info.name || 'Perangkat', location: info.location || '-',
          createdAt: Date.now(), isOwner: false
        });
        document.getElementById('joinCodeInput').value = '';
        loadMyDevices();
      } catch(err) { joinErr.textContent = 'Gagal: ' + err.message; joinErr.style.display = 'block'; }
      finally { btnJoin.textContent = 'Tambah'; btnJoin.disabled = false; }
    });
  }

  // Buat Grup
  var btnCreateGroup = document.getElementById('btnCreateGroup');
  if (btnCreateGroup) {
    btnCreateGroup.addEventListener('click', async function() {
      if (!currentUser) { alert('Silakan login terlebih dahulu.'); return; }
      var name = prompt('Masukkan nama grup baru:');
      if (!name || !name.trim()) return;
      try { await db.ref('users/' + currentUser.uid + '/iot_groups').push({name: name.trim(), createdAt: Date.now()}); loadMyDevices(); }
      catch(e) { alert('Gagal membuat grup: ' + e.message); }
    });
  }

  // Board selector note
  var boardSel  = document.getElementById('regBoard');
  var boardNote = document.getElementById('boardNote');
  var boardNotes = {
    esp32:        '\u2705 Tidak perlu modul tambahan. MQ-4 (pin 34), MQ-135 (pin 35), MQ-2 (pin 32) dibaca langsung.',
    esp8266:      '\u26A0\uFE0F Perlu CD74HC4067 Multiplexer. Wiring: SIG\u2192A0, S0\u2192D5, S1\u2192D6, S2\u2192D7, S3\u2192D8.',
    wemos:        '\u26A0\uFE0F Perlu CD74HC4067 Multiplexer. Sama seperti ESP8266.',
    arduino_esp01:'\u26A0\uFE0F Perlu CD74HC4067 Multiplexer. Arduino+ESP-01 sebagai modem AT.'
  };
  if (boardSel && boardNote) {
    boardSel.addEventListener('change', function() { boardNote.textContent = boardNotes[boardSel.value] || ''; });
    boardNote.textContent = boardNotes[boardSel.value] || '';
  }

  // Delegated events: daftar perangkat
  var myDevicesList = document.getElementById('myDevicesList');
  if (myDevicesList) {
    myDevicesList.addEventListener('click', async function(e) {
      var btnScript = e.target.closest('.btn-view-script');
      if (btnScript) { openScriptModal(btnScript.dataset.code, btnScript.dataset.name); return; }
      var btnEdit = e.target.closest('.btn-edit-device');
      if (btnEdit) { openEditModal(btnEdit.dataset.fullcode, btnEdit.dataset.name, btnEdit.dataset.loc, btnEdit.dataset.owner === 'true'); return; }
      var btnGrp = e.target.closest('.btn-manage-groups');
      if (btnGrp) { openGroupModal(btnGrp.dataset.fullcode, btnGrp.dataset.name); return; }
      var btnRenGrp = e.target.closest('.btn-rename-group');
      if (btnRenGrp) {
        var newName = prompt('Nama grup baru:', btnRenGrp.dataset.name);
        if (!newName || !newName.trim()) return;
        try { await db.ref('users/' + currentUser.uid + '/iot_groups/' + btnRenGrp.dataset.groupid + '/name').set(newName.trim()); loadMyDevices(); }
        catch(e) { alert('Gagal: ' + e.message); }
        return;
      }
      var btnDelGrp = e.target.closest('.btn-delete-group');
      if (btnDelGrp) {
        if (!confirm('Hapus grup "' + btnDelGrp.dataset.name + '"?\nPerangkat tidak akan terhapus.')) return;
        try { await db.ref('users/' + currentUser.uid + '/iot_groups/' + btnDelGrp.dataset.groupid).remove(); loadMyDevices(); }
        catch(e) { alert('Gagal: ' + e.message); }
        return;
      }
      var btnDelete = e.target.closest('.btn-delete-device');
      if (btnDelete) {
        var fullCode = btnDelete.dataset.fullcode;
        var isOwner  = btnDelete.dataset.owner === 'true';
        var msg = isOwner
          ? 'Hapus perangkat "' + btnDelete.dataset.name + '" (' + fullCode + ')?\n\nSEMUA data IoT terhapus permanen!'
          : 'Lepaskan perangkat "' + btnDelete.dataset.name + '" dari daftar Anda?';
        if (!confirm(msg)) return;
        btnDelete.disabled = true; btnDelete.textContent = '...';
        try {
          if (isOwner) await iotDb.ref('trash-bins/' + fullCode).remove();
          var updates = {};
          Object.keys(allGroups).forEach(function(gid) {
            if (allGroups[gid].devices && allGroups[gid].devices[fullCode])
              updates['users/' + currentUser.uid + '/iot_groups/' + gid + '/devices/' + fullCode] = null;
          });
          updates['users/' + currentUser.uid + '/iot_devices/' + fullCode] = null;
          await db.ref().update(updates);
          loadMyDevices();
        } catch(err) { alert('Gagal: ' + err.message); btnDelete.disabled = false; btnDelete.textContent = '\uD83D\uDDD1\uFE0F'; }
      }
    });
  }

  // Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeScriptModal(); closeEditModal(); closeGroupModal(); }
  });
});

// ─── Modal Edit ───────────────────────────────────────────────────
function openEditModal(fullCode, name, loc, isOwner) {
  document.getElementById('editModal').style.display = 'flex';
  document.getElementById('editModalTitle').textContent = fullCode;
  document.getElementById('editNameInput').value = name;
  document.getElementById('editLocInput').value  = loc;
  document.getElementById('editOwnerNote').style.display = isOwner ? 'none' : 'block';
  document.getElementById('editSaveBtn').onclick = async function() {
    var newName = document.getElementById('editNameInput').value.trim();
    var newLoc  = document.getElementById('editLocInput').value.trim();
    if (!newName || !newLoc) { alert('Nama dan lokasi tidak boleh kosong.'); return; }
    try {
      await db.ref('users/' + currentUser.uid + '/iot_devices/' + fullCode).update({name: newName, location: newLoc});
      if (isOwner) await updateDeviceInfo(fullCode, newName, newLoc);
      closeEditModal(); loadMyDevices();
    } catch(e) { alert('Gagal: ' + e.message); }
  };
}
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

// ─── Modal Grup ───────────────────────────────────────────────────
function openGroupModal(fullCode, devName) {
  document.getElementById('groupModal').style.display = 'flex';
  document.getElementById('groupModalDevName').textContent = devName + ' (' + fullCode + ')';
  renderGroupModalList(fullCode);
}
function closeGroupModal() { document.getElementById('groupModal').style.display = 'none'; }
function renderGroupModalList(fullCode) {
  var container = document.getElementById('groupModalList');
  var entries   = Object.entries(allGroups);
  if (!entries.length) {
    container.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:12px 0;">Belum ada grup. Buat grup terlebih dahulu.</div>';
    return;
  }
  container.innerHTML = entries.map(function(e) {
    var gid = e[0], grp = e[1];
    var inGroup = grp.devices && grp.devices[fullCode];
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:var(--bg-body);border:1px solid var(--border);border-radius:10px;">'
      + '<span style="font-weight:700;font-size:13px;color:var(--text-1)">\uD83D\uDCC2 ' + grp.name + '</span>'
      + '<button onclick="toggleDeviceInGroup(\'' + gid + '\',\'' + fullCode + '\',' + (!inGroup) + ')" style="background:' + (inGroup?'rgba(248,113,113,0.12)':'rgba(74,222,128,0.12)') + ';border:1px solid ' + (inGroup?'rgba(248,113,113,0.3)':'rgba(74,222,128,0.3)') + ';color:' + (inGroup?'#f87171':'#4ade80') + ';padding:5px 14px;border-radius:var(--r-full);font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);">' + (inGroup?'\u2715 Keluarkan':'+ Masukkan') + '</button>'
      + '</div>';
  }).join('');
}
window.toggleDeviceInGroup = async function(groupId, fullCode, add) {
  try {
    if (add) await db.ref('users/' + currentUser.uid + '/iot_groups/' + groupId + '/devices/' + fullCode).set(true);
    else     await db.ref('users/' + currentUser.uid + '/iot_groups/' + groupId + '/devices/' + fullCode).remove();
    if (!allGroups[groupId].devices) allGroups[groupId].devices = {};
    if (add) allGroups[groupId].devices[fullCode] = true;
    else delete allGroups[groupId].devices[fullCode];
    renderGroupModalList(fullCode); renderDeviceList();
  } catch(e) { alert('Gagal update grup: ' + e.message); }
};

// ─── Modal Skrip ─────────────────────────────────────────────────
function openScriptModal(shortCode, deviceName) {
  document.getElementById('scriptModal').style.display = 'flex';
  document.getElementById('modalDeviceTitle').textContent = deviceName + ' \u2014 TRS-' + shortCode;
  var fullCode  = 'TRS-' + shortCode;
  var boardType = (allDevices[fullCode] && allDevices[fullCode].board_type) || 'esp32';
  document.getElementById('modalArduinoCode').textContent = buildArduinoCode(shortCode, boardType);
  document.body.style.overflow = 'hidden';
}
function closeScriptModal() {
  document.getElementById('scriptModal').style.display = 'none';
  document.body.style.overflow = '';
}
