/*
 ══════════════════════════════════════════════════════════════
  BAJA IoT Trash Monitor — ESP32 Sketch
  Version : 1.0
  Hardware:
    - ESP32 (DevKit / Wemos D1 R32)
    - Sensor Ultrasonik HC-SR04 (Level Kepenuhan)
    - Sensor Gas MQ-135 (Kadar Gas)
    - (Opsional) Voltage Divider untuk cek baterai

  Library yang dibutuhkan (Install via Library Manager):
    - Firebase ESP32 Client by Mobizt
      https://github.com/mobizt/Firebase-ESP32
    - ArduinoJson by Benoit Blanchon
 ══════════════════════════════════════════════════════════════
*/

#if defined(ESP32)
  #include <WiFi.h>
  #include <FirebaseESP32.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <FirebaseESP8266.h>
#endif
#include <ArduinoJson.h>
#include <time.h>

// ─── KONFIGURASI WAJIB — ISI SESUAI DATA ANDA ─────────────────
#define WIFI_SSID       "NAMA_WIFI_ANDA"
#define WIFI_PASSWORD   "PASSWORD_WIFI_ANDA"
#define DEVICE_CODE     "XXXX"          // Ganti dengan 4 huruf kode dari website (tanpa TRS-)
// ──────────────────────────────────────────────────────────────

// Firebase Configuration
#define FIREBASE_HOST   "baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH   "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI"

// ─── RESOLUSI ADC & PIN SENSOR ─────────────────────────────────
#if defined(ESP8266) // Wemos D1 Mini / NodeMCU
  #define ADC_MAX         1023.0
  #define TRIG_PIN        D1    // HC-SR04 Trigger
  #define ECHO_PIN        D2    // HC-SR04 Echo
  #define GAS_PIN         A0    // MQ-135 Analog
  #define BATT_PIN        A0    // Di ESP8266 hanya ada 1 ADC
  #define LED_PIN         LED_BUILTIN
  #define LED_RED_PIN     D3    // Eksternal LED Merah
  #define LED_GREEN_PIN   D4    // Eksternal LED Hijau
#elif defined(CONFIG_IDF_TARGET_ESP32C6) // ESP32-C6
  #define ADC_MAX         4095.0
  #define TRIG_PIN        4     // HC-SR04 Trigger
  #define ECHO_PIN        5     // HC-SR04 Echo
  #define GAS_PIN         2     // MQ-135 Analog (ADC)
  #define BATT_PIN        3     // Voltage divider baterai (ADC)
  #define LED_PIN         8     // LED built-in
  #define LED_RED_PIN     12
  #define LED_GREEN_PIN   13
#else // ESP32 Standar (WROOM/WROVER)
  #define ADC_MAX         4095.0
  #define TRIG_PIN        5     // HC-SR04 Trigger
  #define ECHO_PIN        18    // HC-SR04 Echo
  #define GAS_PIN         34    // MQ-135 Analog Out (ADC)
  #define BATT_PIN        35    // Voltage divider baterai (ADC)
  #define LED_PIN         2     // LED built-in ESP32 (indikator)
  #define LED_RED_PIN     12    // Indikator Merah
  #define LED_GREEN_PIN   13    // Indikator Hijau
#endif

// ─── KONFIGURASI TINGGI TONG SAMPAH ────────────────────────────
#define BIN_HEIGHT_CM   50    // Tinggi tong sampah (cm) — sesuaikan!
#define UPDATE_INTERVAL 10000 // Interval kirim data (ms) = 10 detik
// ──────────────────────────────────────────────────────────────

FirebaseData   fbdo;
FirebaseConfig fbConfig;
FirebaseAuth   fbAuth;

String devicePath; // Path Firebase: /trash-bins/TRS-XXXX/status
String histPath;   // Path Firebase: /trash-bins/TRS-XXXX/history

unsigned long lastUpdate = 0;

// ─── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN,  OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);

  // Status awal: belum terkoneksi, LED Merah nyala
  digitalWrite(LED_RED_PIN, HIGH);
  digitalWrite(LED_GREEN_PIN, LOW);

  // Susun path Firebase
  devicePath = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/status";
  histPath   = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/history";

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("  BAJA IoT Trash Monitor");
  Serial.println("  Kode Perangkat: TRS-" + String(DEVICE_CODE));
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Hubungkan WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Kedip saat connecting
    digitalWrite(LED_RED_PIN, !digitalRead(LED_RED_PIN)); // Kedip Merah saat connecting
  }
  digitalWrite(LED_PIN, HIGH);
  Serial.println("\n✅ WiFi Terhubung! IP: " + WiFi.localIP().toString());

  // Sinkronisasi waktu via NTP
  configTime(25200, 0, "pool.ntp.org", "time.nist.gov"); // UTC+7 (WIB)
  Serial.print("Sinkronisasi waktu NTP");
  while (time(nullptr) < 100000) { delay(200); Serial.print("."); }
  Serial.println(" ✅");

  // Konfigurasi Firebase
  fbConfig.host          = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  Serial.println("✅ Firebase terhubung!");
  
  // Koneksi berhasil, matikan Merah, nyalakan Hijau/Biru
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, HIGH);

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ─── Baca Sensor Ultrasonik HC-SR04 ────────────────────────────
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Timeout 30ms
  if (duration == 0) return -1; // Tidak terdeteksi

  float distance = duration * 0.0343 / 2.0;
  return distance;
}

// ─── Hitung Level Kepenuhan ─────────────────────────────────────
int calcFillLevel(float distanceCm) {
  if (distanceCm < 0) return -1; // Error baca sensor
  // Jika jarak = 0 → penuh 100%, jika = BIN_HEIGHT_CM → kosong 0%
  float level = (1.0 - (distanceCm / BIN_HEIGHT_CM)) * 100.0;
  return constrain((int)level, 0, 100);
}

// ─── Baca Sensor Gas MQ-135 ─────────────────────────────────────
int readGasPPM() {
  int raw = analogRead(GAS_PIN); // Membaca nilai analog
  // Konversi kasar ke ppm (kalibrasi sesuai datasheet MQ-135)
  // Nilai ini perlu dikalibrasi ulang sesuai kondisi udara lokal
  int ppm = map(raw, 0, (int)ADC_MAX, 0, 1000);
  return ppm;
}

// ─── Baca Level Baterai ─────────────────────────────────────────
int readBatteryPercent() {
  // Menggunakan voltage divider (mis: R1=100K, R2=100K → VIN max = 8.4V → ADC max 4.2V)
  // Sesuaikan pembagi sesuai rangkaian Anda
  int raw   = analogRead(BATT_PIN);
  float volt = (raw / ADC_MAX) * 3.3 * 2.0; // faktor 2 dari voltage divider
  // Untuk baterai LiPo 3.7V: 4.2V = 100%, 3.0V = 0%
  int pct = (int)((volt - 3.0) / (4.2 - 3.0) * 100.0);
  return constrain(pct, 0, 100);
}

// ─── Kirim Data ke Firebase ─────────────────────────────────────
void sendToFirebase(int fillLevel, int gasLevel, int battery, bool isFull) {
  time_t now = time(nullptr);

  // === Update /status ===
  Firebase.setInt(fbdo,    devicePath + "/fill_level",   fillLevel);
  Firebase.setInt(fbdo,    devicePath + "/gas_level",    gasLevel);
  Firebase.setInt(fbdo,    devicePath + "/battery",      battery);
  Firebase.setBool(fbdo,   devicePath + "/is_full",      isFull);
  Firebase.setInt(fbdo,    devicePath + "/last_updated", (int)now);

  // === Push ke /history ===
  FirebaseJson histJson;
  histJson.set("fill_level",  fillLevel);
  histJson.set("gas_level",   gasLevel);
  histJson.set("timestamp",   (int)now);
  Firebase.pushJSON(fbdo, histPath, histJson);

  // Log ke Serial Monitor
  Serial.printf("📤 Terkirim | Fill: %d%% | Gas: %d ppm | Batt: %d%% | Full: %s\n",
    fillLevel, gasLevel, battery, isFull ? "YA" : "Tidak");
}

// ─── Loop Utama ─────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  if (now - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = now;

    digitalWrite(LED_PIN, LOW); // LED mati saat proses

    // Baca semua sensor
    float  dist      = readDistanceCm();
    int    fillLevel = calcFillLevel(dist);
    int    gasLevel  = readGasPPM();
    int    battery   = readBatteryPercent();
    bool   isFull    = (fillLevel >= 90);

    Serial.printf("📡 Sensor | Jarak: %.1f cm | Fill: %d%% | Gas: %d ppm | Batt: %d%%\n",
      dist, fillLevel, gasLevel, battery);

    if (fillLevel < 0) {
      Serial.println("⚠️ Gagal baca sensor ultrasonik! Periksa kabel.");
    } else {
      // Kirim ke Firebase
      if (WiFi.status() == WL_CONNECTED) {
        sendToFirebase(fillLevel, gasLevel, battery, isFull);
        
        // Pastikan indikator koneksi sesuai
        digitalWrite(LED_RED_PIN, LOW);
        digitalWrite(LED_GREEN_PIN, HIGH);
      } else {
        Serial.println("❌ WiFi terputus! Mencoba reconnect...");
        
        // Indikator putus koneksi
        digitalWrite(LED_GREEN_PIN, LOW);
        digitalWrite(LED_RED_PIN, HIGH);
        
        WiFi.reconnect();
      }
    }

    digitalWrite(LED_PIN, HIGH); // LED nyala kembali
  }
}
