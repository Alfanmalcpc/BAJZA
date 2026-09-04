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
    // Cek status online + live sensor data async per card
    Object.keys(allDevices).forEach(function(fullCode) {
      loadCardLiveData(fullCode);
    });
  } catch(e) {
    console.error('[IoT Register]', e);
    var myDevicesList2 = document.getElementById('myDevicesList');
    if (myDevicesList2) myDevicesList2.innerHTML = '<div style="text-align:center;color:var(--red);font-size:14px;">Gagal memuat daftar perangkat.</div>';
  }
}

// ─── Mini Gauge SVG ──────────────────────────────────────────────
function miniGaugeSVG(pct, id) {
  var p = Math.min(100, Math.max(0, pct || 0));
  var r = 28, cx = 32, cy = 32;
  var circ = 2 * Math.PI * r;
  // Half-circle gauge (bottom arc removed): use 75% of circle
  var arcLen = circ * 0.75;
  var fillLen = arcLen * (p / 100);
  var rotation = 135; // start from bottom-left
  var color = p < 50 ? '#4ade80' : p < 80 ? '#facc15' : '#f87171';
  return '<svg width="64" height="52" viewBox="0 0 64 52" style="flex-shrink:0;">'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="6" stroke-dasharray="' + arcLen + ' ' + circ + '" stroke-dashoffset="0" transform="rotate(' + rotation + ' ' + cx + ' ' + cy + ')" stroke-linecap="round"/>'
    + '<circle id="mgf-' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-dasharray="' + fillLen + ' ' + circ + '" stroke-dashoffset="0" transform="rotate(' + rotation + ' ' + cx + ' ' + cy + ')" stroke-linecap="round" style="transition:all 0.8s ease;"/>'
    + '<text id="mgt-' + id + '" x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + color + '" font-family="inherit">' + p + '%</text>'
    + '</svg>';
}

// ─── Load Live Sensor Data per Card ──────────────────────────────
function loadCardLiveData(fullCode) {
  var shortCode = fullCode.replace('TRS-', '');
  iotDb.ref('trash-bins/' + fullCode + '/status').once('value').then(function(snap) {
    var badge = document.getElementById('badge-' + shortCode);
    if (!snap.exists()) {
      if (badge) { badge.textContent = '\u25cb Belum aktif'; }
      return;
    }
    var st  = snap.val();
    var now = Math.floor(Date.now() / 1000);
    var diff = now - (st.last_updated || 0);
    // Online badge
    if (badge) {
      if (diff < 60) {
        badge.style.background = 'rgba(74,222,128,0.15)';
        badge.style.color = '#4ade80';
        badge.textContent = '\u25cf LIVE';
      } else {
        badge.style.background = 'rgba(248,113,113,0.1)';
        badge.style.color = '#f87171';
        badge.textContent = '\u25cb Offline';
      }
    }
    // Update mini gauge
    var fill = st.fill_level || 0;
    var gFill = document.getElementById('mgf-' + shortCode);
    var gTxt  = document.getElementById('mgt-' + shortCode);
    if (gFill && gTxt) {
      var r = 28, circ = 2 * Math.PI * r, arcLen = circ * 0.75;
      var fillLen = arcLen * (fill / 100);
      var color = fill < 50 ? '#4ade80' : fill < 80 ? '#facc15' : '#f87171';
      gFill.setAttribute('stroke-dasharray', fillLen + ' ' + circ);
      gFill.setAttribute('stroke', color);
      gTxt.textContent = fill + '%';
      gTxt.setAttribute('fill', color);
    }
    // Update gas labels
    var mq4   = st.gas_mq4   != null ? st.gas_mq4   : (st.gas_level != null ? st.gas_level : null);
    var mq135 = st.gas_mq135 != null ? st.gas_mq135 : (st.gas_level != null ? st.gas_level : null);
    var mq2   = st.gas_mq2   != null ? st.gas_mq2   : (st.gas_level != null ? st.gas_level : null);
    var mq4El   = document.getElementById('cg4-'   + shortCode);
    var mq135El = document.getElementById('cg135-' + shortCode);
    var mq2El   = document.getElementById('cg2-'   + shortCode);
    if (mq4El)   mq4El.textContent   = (mq4   != null ? mq4   : '—') + ' ppm';
    if (mq135El) mq135El.textContent = (mq135 != null ? mq135 : '—') + ' ppm';
    if (mq2El)   mq2El.textContent   = (mq2   != null ? mq2   : '—') + ' ppm';
  }).catch(function() {});
}

// ─── Render Kartu Perangkat (Grid Style) ──────────────────────────
function buildDeviceCard(fullCode, dev) {
  var shortCode  = fullCode.replace('TRS-', '');
  var safeName   = (dev.name     || '').replace(/"/g, '&quot;');
  var safeLoc    = (dev.location || '').replace(/"/g, '&quot;');
  var isOwner    = dev.isOwner !== false;
  var ownerBadge = isOwner ? '' : '<span style="font-size:9px;background:rgba(99,102,241,0.22);color:#818cf8;padding:2px 7px;border-radius:4px;font-weight:700;margin-left:5px;">Dipantau</span>';
  var scriptBtn  = isOwner
    ? '<button class="btn-view-script" data-code="' + shortCode + '" data-name="' + safeName + '" style="background:var(--bg-surface);border:1.5px solid var(--border);color:var(--text-2);padding:7px 10px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);flex:1;" title="Lihat Skrip Arduino">\uD83D\uDCCB Skrip</button>'
    : '';

  return '<div class="reg-device-card" style="background:var(--bg-body);border:1.5px solid var(--border);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.2s;" onmouseenter="this.style.borderColor=\'rgba(99,102,241,0.5)\';this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 8px 24px rgba(0,0,0,0.25)\'" onmouseleave="this.style.borderColor=\'var(--border)\';this.style.transform=\'none\';this.style.boxShadow=\'none\'">'
    // ── Header strip ──
    + '<div style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid var(--border);">'
    +   '<div style="min-width:0;">'
    +     '<div style="font-weight:800;font-size:13px;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">' + (dev.name || '—') + ownerBadge + '</div>'
    +     '<div style="font-size:10px;color:var(--text-3);margin-top:1px;font-family:monospace;">' + fullCode + '</div>'
    +   '</div>'
    +   '<div id="badge-' + shortCode + '" style="flex-shrink:0;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;background:rgba(100,100,100,0.12);color:var(--text-3);white-space:nowrap;">⏳ Cek...</div>'
    + '</div>'
    // ── Sensor body ──
    + '<div style="padding:14px;display:flex;gap:10px;align-items:center;">'
    +   miniGaugeSVG(0, shortCode)
    +   '<div style="flex:1;">'
    +     '<div style="font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Kepenuhan</div>'
    +     '<div style="font-size:11px;color:var(--text-2);">📍 ' + (dev.location || '—') + '</div>'
    +   '</div>'
    + '</div>'
    // ── Gas readings ──
    + '<div style="padding:0 14px 14px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">'
    +   '<div style="background:rgba(249,115,22,0.1);border-radius:10px;padding:7px 6px;text-align:center;">'
    +     '<div style="font-size:9px;font-weight:700;color:#fb923c;text-transform:uppercase;">Metana</div>'
    +     '<div id="cg4-' + shortCode + '" style="font-size:11px;font-weight:800;color:#fed7aa;margin-top:2px;">— ppm</div>'
    +   '</div>'
    +   '<div style="background:rgba(167,139,250,0.1);border-radius:10px;padding:7px 6px;text-align:center;">'
    +     '<div style="font-size:9px;font-weight:700;color:#c4b5fd;text-transform:uppercase;">NH₃/CO₂</div>'
    +     '<div id="cg135-' + shortCode + '" style="font-size:11px;font-weight:800;color:#e9d5ff;margin-top:2px;">— ppm</div>'
    +   '</div>'
    +   '<div style="background:rgba(34,211,238,0.1);border-radius:10px;padding:7px 6px;text-align:center;">'
    +     '<div style="font-size:9px;font-weight:700;color:#67e8f9;text-transform:uppercase;">Gas Umum</div>'
    +     '<div id="cg2-' + shortCode + '" style="font-size:11px;font-weight:800;color:#a5f3fc;margin-top:2px;">— ppm</div>'
    +   '</div>'
    + '</div>'
    // ── Action buttons ──
    + '<div style="padding:0 10px 10px;display:flex;gap:5px;flex-wrap:wrap;">'
    +   '<a href="trash-monitor.html?code=' + shortCode + '" style="flex:2;min-width:60px;background:var(--blue);color:#fff;padding:7px 8px;border-radius:10px;text-decoration:none;font-size:11px;font-weight:700;text-align:center;">🔍 Pantau</a>'
    +   '<button class="btn-edit-device" data-fullcode="' + fullCode + '" data-name="' + safeName + '" data-loc="' + safeLoc + '" data-owner="' + isOwner + '" style="flex:1;min-width:50px;background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.25);color:#facc15;padding:7px 6px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);">✏️ Edit</button>'
    +   scriptBtn
    +   '<button class="btn-manage-groups" data-fullcode="' + fullCode + '" data-name="' + safeName + '" style="width:30px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);color:#818cf8;border-radius:10px;font-size:12px;cursor:pointer;" title="Kelola Grup">📂</button>'
    +   '<button class="btn-delete-device" data-fullcode="' + fullCode + '" data-name="' + safeName + '" data-owner="' + isOwner + '" style="width:30px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.2);color:#f87171;border-radius:10px;font-size:12px;cursor:pointer;" title="Hapus">🗑️</button>'
    + '</div>'
    + '</div>';
}

// ─── Render Grup sebagai Folder Card ─────────────────────────────
function buildGroupCard(groupId, group) {
  var safeGrpName = (group.name || '').replace(/"/g, '&quot;');
  var devCodes    = group.devices ? Object.keys(group.devices) : [];
  return '<div style="background:var(--bg-body);border:1.5px solid rgba(99,102,241,0.25);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.2s;" onmouseenter="this.style.borderColor=\'rgba(99,102,241,0.6)\';this.style.transform=\'translateY(-2px)\'" onmouseleave="this.style.borderColor=\'rgba(99,102,241,0.25)\';this.style.transform=\'none\'">'
    // Folder header
    + '<div style="background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15));padding:16px 14px 10px;display:flex;flex-direction:column;align-items:center;text-align:center;">'
    +   '<div style="font-size:36px;margin-bottom:4px;">📁</div>'
    +   '<div style="font-weight:800;font-size:13px;color:#c4b5fd;">' + (group.name || 'Grup') + '</div>'
    +   '<div style="font-size:10px;color:var(--text-3);margin-top:2px;">' + devCodes.length + ' perangkat</div>'
    + '</div>'
    // Folder actions
    + '<div style="padding:8px 10px;display:flex;gap:5px;border-top:1px solid var(--border);">'
    +   '<button class="btn-rename-group" data-groupid="' + groupId + '" data-name="' + safeGrpName + '" style="flex:1;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);color:#818cf8;padding:6px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font);">✏️ Rename</button>'
    +   '<button class="btn-delete-group" data-groupid="' + groupId + '" data-name="' + safeGrpName + '" style="width:28px;background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);color:#f87171;border-radius:8px;font-size:11px;cursor:pointer;">🗑️</button>'
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

  // ── Bagian Grup (Folder Grid) ──
  var groupEntries = Object.entries(allGroups);
  if (groupEntries.length > 0) {
    html += '<div style="margin-bottom:20px;">'
      + '<div style="font-size:12px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📂 Grup Saya</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">'
      + groupEntries.map(function(e) { return buildGroupCard(e[0], e[1]); }).join('')
      + '</div>';
    // Perangkat di dalam masing-masing grup
    groupEntries.forEach(function(entry) {
      var groupId = entry[0], group = entry[1];
      var devCodes = group.devices ? Object.keys(group.devices) : [];
      if (devCodes.length > 0) {
        html += '<div style="margin-top:14px;">'
          + '<div style="font-size:11px;font-weight:700;color:#818cf8;margin-bottom:8px;">📁 ' + group.name + '</div>'
          + '<div class="reg-devices-grid">'
          + devCodes.map(function(fc) { return allDevices[fc] ? buildDeviceCard(fc, allDevices[fc]) : ''; }).join('')
          + '</div>'
          + '</div>';
      }
    });
    html += '</div>';
  }

  // ── Perangkat Tanpa Grup ──
  var ungrouped = Object.entries(allDevices).filter(function(e) { return !codesInGroups.has(e[0]); });
  if (ungrouped.length > 0) {
    html += '<div>'
      + '<div style="font-size:12px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📋 Semua Perangkat</div>'
      + '<div class="reg-devices-grid">'
      + ungrouped.map(function(e) { return buildDeviceCard(e[0], e[1]); }).join('')
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
    // ═══ VARIAN B: Single-ADC (ESP8266 / Wemos / Arduino+ESP-01) + CD74HC4067 MUX ═══
    return [
      '/*',
      ' ======================================================',
      '  BAJA IoT Trash Monitor -- ' + boardName + ' Sketch',
      '  Version : 3.0 (Firebase_ESP_Client + CD74HC4067 MUX)',
      '  Perangkat : TRS-' + deviceCode,
      '  Dibuat    : ' + dateStr,
      '  Hardware:',
      '    - ' + boardName,
      '    - Sensor Ultrasonik HC-SR04 (Level Kepenuhan)',
      '    - Sensor Gas MQ-4  (Metana/CH4)',
      '    - Sensor Gas MQ-135 (NH3/CO2/Kualitas Udara)',
      '    - Sensor Gas MQ-2  (Gas Umum/LPG)',
      '    - Modul Multiplexer CD74HC4067 (WAJIB, karena board ini hanya punya 1 ADC)',
      '    - (Opsional) Voltage Divider untuk cek baterai',
      '',
      '  Library yang dibutuhkan (Install via Library Manager):',
      '    - Firebase Arduino Client Library for ESP8266 and ESP32',
      '      by Mobizt  (versi 4.x ke atas)',
      '    - ArduinoJson by Benoit Blanchon',
      '',
      '  Wiring CD74HC4067:',
      '    SIG (Common) -> A0 (' + boardName + ')',
      '    S0  -> D5',
      '    S1  -> D6',
      '    S2  -> D7',
      '    S3  -> D8',
      '    EN  -> GND (selalu aktif)',
      '',
      '  Channel Multiplexer:',
      '    CH0 -> MQ-4   (Metana)',
      '    CH1 -> MQ-135 (NH3/CO2)',
      '    CH2 -> MQ-2   (Gas Umum/LPG)',
      '    CH3 -> (Opsional) Voltage Divider baterai',
      ' ======================================================',
      '*/',
      '',
      '// --- Include WiFi & Firebase ----------------------------------',
      '#if defined(ESP8266) || defined(WEMOS)',
      '  #include <ESP8266WiFi.h>',
      '#else',
      '  #include <WiFi.h>',
      '#endif',
      '',
      '#include <Firebase_ESP_Client.h>',
      '#include <addons/TokenHelper.h>',
      '#include <addons/RTDBHelper.h>',
      '#include <ArduinoJson.h>',
      '#include <time.h>',
      '',
      '// --- KONFIGURASI WAJIB ----------------------------------------',
      '#define WIFI_SSID       "NAMA_WIFI_ANDA"',
      '#define WIFI_PASSWORD   "PASSWORD_WIFI_ANDA"',
      '#define DEVICE_CODE     "' + deviceCode + '"   // Kode otomatis dari website',
      '// --------------------------------------------------------------',
      '',
      '// Firebase Configuration',
      '#define FIREBASE_HOST   "baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app"',
      '#define FIREBASE_AUTH   "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI"',
      '',
      '// --- PIN & ADC ------------------------------------------------',
      '#define ADC_MAX         1023.0',
      '#define TRIG_PIN        D1',
      '#define ECHO_PIN        D2',
      '#define LED_PIN         LED_BUILTIN',
      '#define LED_RED_PIN     D3',
      '#define LED_GREEN_PIN   D4',
      '',
      '// Pin MUX Control (CD74HC4067)',
      '#define MUX_SIG         A0   // Satu-satunya ADC di board ini',
      '#define MUX_S0          D5',
      '#define MUX_S1          D6',
      '#define MUX_S2          D7',
      '#define MUX_S3          D8',
      '',
      '// Channel Multiplexer',
      '#define CH_MQ4          0    // Sensor Metana',
      '#define CH_MQ135        1    // Sensor NH3/CO2',
      '#define CH_MQ2          2    // Sensor Gas Umum',
      '#define CH_BATT         3    // Voltage Divider baterai (opsional)',
      '',
      '#define BIN_HEIGHT_CM   50     // Tinggi tong sampah (cm)',
      '#define UPDATE_INTERVAL 10000  // Interval kirim data (ms)',
      '',
      'FirebaseData   fbdo;',
      'FirebaseAuth   fbAuth;',
      'FirebaseConfig fbConfig;',
      '',
      'String devicePath;',
      'String histPath;',
      '',
      'unsigned long lastUpdate = 0;',
      '',
      '// --- Pilih Channel MUX ----------------------------------------',
      'void selectMuxChannel(int ch) {',
      '  digitalWrite(MUX_S0, (ch >> 0) & 1);',
      '  digitalWrite(MUX_S1, (ch >> 1) & 1);',
      '  digitalWrite(MUX_S2, (ch >> 2) & 1);',
      '  digitalWrite(MUX_S3, (ch >> 3) & 1);',
      '  delay(5); // Tunggu MUX stabil',
      '}',
      '',
      '// --- Baca Sensor Gas via MUX ----------------------------------',
      'int readGasChannel(int ch) {',
      '  selectMuxChannel(ch);',
      '  int raw = analogRead(MUX_SIG);',
      '  return map(raw, 0, (int)ADC_MAX, 0, 1000);',
      '}',
      '',
      '// --- Setup ----------------------------------------------------',
      'void setup() {',
      '  Serial.begin(115200);',
      '  delay(500);',
      '',
      '  pinMode(TRIG_PIN, OUTPUT);',
      '  pinMode(ECHO_PIN, INPUT);',
      '  pinMode(LED_PIN,  OUTPUT);',
      '  pinMode(LED_RED_PIN, OUTPUT);',
      '  pinMode(LED_GREEN_PIN, OUTPUT);',
      '  pinMode(MUX_S0, OUTPUT); pinMode(MUX_S1, OUTPUT);',
      '  pinMode(MUX_S2, OUTPUT); pinMode(MUX_S3, OUTPUT);',
      '',
      '  digitalWrite(LED_RED_PIN, HIGH);',
      '  digitalWrite(LED_GREEN_PIN, LOW);',
      '',
      '  devicePath = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/status";',
      '  histPath   = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/history";',
      '',
      '  Serial.println("================================");',
      '  Serial.println("  BAJA IoT Trash Monitor v3.0");',
      '  Serial.println("  Kode: TRS-" + String(DEVICE_CODE));',
      '  Serial.println("  Board: ' + boardName + ' + CD74HC4067 MUX");',
      '  Serial.println("================================");',
      '',
      '  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);',
      '  Serial.print("Menghubungkan WiFi");',
      '  while (WiFi.status() != WL_CONNECTED) {',
      '    delay(500); Serial.print(".");',
      '    digitalWrite(LED_PIN, !digitalRead(LED_PIN));',
      '    digitalWrite(LED_RED_PIN, !digitalRead(LED_RED_PIN));',
      '  }',
      '  digitalWrite(LED_PIN, HIGH);',
      '  Serial.println("\\nWiFi Terhubung! IP: " + WiFi.localIP().toString());',
      '',
      '  configTime(25200, 0, "pool.ntp.org", "time.nist.gov");',
      '  Serial.print("Sinkronisasi waktu NTP");',
      '  while (time(nullptr) < 100000) { delay(200); Serial.print("."); }',
      '  Serial.println(" OK");',
      '',
      '  fbConfig.database_url = FIREBASE_HOST;',
      '  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;',
      '  fbConfig.token_status_callback = tokenStatusCallback;',
      '',
      '  Firebase.begin(&fbConfig, &fbAuth);',
      '  Firebase.reconnectWiFi(true);',
      '',
      '  digitalWrite(LED_RED_PIN, LOW);',
      '  digitalWrite(LED_GREEN_PIN, HIGH);',
      '  Serial.println("Firebase terhubung!");',
      '  Serial.println("================================");',
      '}',
      '',
      '// --- Baca Sensor Ultrasonik -----------------------------------',
      'float readDistanceCm() {',
      '  digitalWrite(TRIG_PIN, LOW);',
      '  delayMicroseconds(2);',
      '  digitalWrite(TRIG_PIN, HIGH);',
      '  delayMicroseconds(10);',
      '  digitalWrite(TRIG_PIN, LOW);',
      '',
      '  long duration = pulseIn(ECHO_PIN, HIGH, 30000);',
      '  if (duration == 0) return -1;',
      '  return duration * 0.0343 / 2.0;',
      '}',
      '',
      '// --- Hitung Level Kepenuhan -----------------------------------',
      'int calcFillLevel(float distCm) {',
      '  if (distCm < 0) return -1;',
      '  float level = (1.0 - (distCm / BIN_HEIGHT_CM)) * 100.0;',
      '  return constrain((int)level, 0, 100);',
      '}',
      '',
      '// --- Baca Baterai via MUX CH3 (Voltage Divider) --------------',
      'int readBatteryPercent() {',
      '  selectMuxChannel(CH_BATT);',
      '  int   raw  = analogRead(MUX_SIG);',
      '  float volt = (raw / ADC_MAX) * 3.3 * 2.0;',
      '  int   pct  = (int)((volt - 3.0) / (4.2 - 3.0) * 100.0);',
      '  return constrain(pct, 0, 100);',
      '}',
      '',
      '// --- Kirim ke Firebase ---------------------------------------',
      'void sendToFirebase(int fillLevel, int mq4, int mq135, int mq2, int battery, bool isFull) {',
      '  time_t now = time(nullptr);',
      '',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/fill_level",   fillLevel);',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/gas_level",    mq135);',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/gas_mq4",      mq4);',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/gas_mq135",    mq135);',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/gas_mq2",      mq2);',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/battery",      battery);',
      '  Firebase.RTDB.setBool(&fbdo, devicePath + "/is_full",      isFull);',
      '  Firebase.RTDB.setInt(&fbdo,  devicePath + "/last_updated", (int)now);',
      '',
      '  FirebaseJson histJson;',
      '  histJson.set("fill_level", fillLevel);',
      '  histJson.set("gas_level",  mq135);',
      '  histJson.set("gas_mq4",    mq4);',
      '  histJson.set("gas_mq135",  mq135);',
      '  histJson.set("gas_mq2",    mq2);',
      '  histJson.set("timestamp",  (int)now);',
      '  Firebase.RTDB.pushJSON(&fbdo, histPath, &histJson);',
      '',
      '  Serial.print("Terkirim | Fill:");',
      '  Serial.print(fillLevel); Serial.print("% | MQ4:");',
      '  Serial.print(mq4);       Serial.print(" | MQ135:");',
      '  Serial.print(mq135);     Serial.print(" | MQ2:");',
      '  Serial.print(mq2);       Serial.print(" | Batt:");',
      '  Serial.print(battery);   Serial.println("%");',
      '}',
      '',
      '// --- Loop Utama ----------------------------------------------',
      'void loop() {',
      '  unsigned long now = millis();',
      '',
      '  if (now - lastUpdate >= UPDATE_INTERVAL) {',
      '    lastUpdate = now;',
      '    digitalWrite(LED_PIN, LOW);',
      '',
      '    float dist      = readDistanceCm();',
      '    int   fillLevel = calcFillLevel(dist);',
      '    int   mq4       = readGasChannel(CH_MQ4);',
      '    int   mq135     = readGasChannel(CH_MQ135);',
      '    int   mq2       = readGasChannel(CH_MQ2);',
      '    int   battery   = readBatteryPercent();',
      '    bool  isFull    = (fillLevel >= 90);',
      '',
      '    Serial.print("Sensor | Jarak:"); Serial.print(dist);',
      '    Serial.print("cm | Fill:"); Serial.print(fillLevel);',
      '    Serial.print("% | MQ4:"); Serial.print(mq4);',
      '    Serial.print(" | MQ135:"); Serial.print(mq135);',
      '    Serial.print(" | MQ2:"); Serial.print(mq2);',
      '    Serial.print(" | Batt:"); Serial.print(battery); Serial.println("%");',
      '',
      '    if (fillLevel < 0) {',
      '      Serial.println("GAGAL baca sensor ultrasonik! Periksa kabel.");',
      '    } else if (WiFi.status() == WL_CONNECTED) {',
      '      sendToFirebase(fillLevel, mq4, mq135, mq2, battery, isFull);',
      '      digitalWrite(LED_RED_PIN,   LOW);',
      '      digitalWrite(LED_GREEN_PIN, HIGH);',
      '    } else {',
      '      Serial.println("WiFi terputus! Mencoba reconnect...");',
      '      digitalWrite(LED_GREEN_PIN, LOW);',
      '      digitalWrite(LED_RED_PIN,   HIGH);',
      '      WiFi.reconnect();',
      '    }',
      '    digitalWrite(LED_PIN, HIGH);',
      '  }',
      '}'
    ].join('\n');

  } else {
    // ═══ VARIAN A: ESP32 — 3 ADC langsung, tanpa MUX ═══
    return [
      '/*',
      ' ======================================================',
      '  BAJA IoT Trash Monitor -- ESP32 Sketch',
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
