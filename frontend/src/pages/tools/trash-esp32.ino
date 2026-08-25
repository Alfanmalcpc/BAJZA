/*
 ======================================================
  BAJA IoT Trash Monitor -- ESP32 / ESP8266 Sketch
  Version : 2.0 (Firebase_ESP_Client)
  Hardware:
    - ESP32 (DevKit / Wemos D1 R32) ATAU NodeMCU ESP8266
    - Sensor Ultrasonik HC-SR04 (Level Kepenuhan)
    - Sensor Gas MQ-135 (Kadar Gas)
    - (Opsional) Voltage Divider untuk cek baterai

  Library yang dibutuhkan (Install via Library Manager):
    - Firebase Arduino Client Library for ESP8266 and ESP32
      by Mobizt  (versi 4.x ke atas)
    - ArduinoJson by Benoit Blanchon
 ======================================================
*/

// --- Include WiFi & Firebase ----------------------------------
#if defined(ESP32)
  #include <WiFi.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif

#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <ArduinoJson.h>
#include <time.h>

// --- KONFIGURASI WAJIB ----------------------------------------
#define WIFI_SSID       "NAMA_WIFI_ANDA"
#define WIFI_PASSWORD   "PASSWORD_WIFI_ANDA"
#define DEVICE_CODE     "XXXX"   // Ganti dengan 4 huruf kode dari website
// --------------------------------------------------------------

// Firebase Configuration
#define FIREBASE_HOST   "baja-iot-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH   "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI"

// --- PIN & ADC ------------------------------------------------
#if defined(ESP8266)  // NodeMCU / Wemos D1 Mini
  #define ADC_MAX         1023.0
  #define TRIG_PIN        D1
  #define ECHO_PIN        D2
  #define GAS_PIN         A0
  #define BATT_PIN        A0
  #define LED_PIN         LED_BUILTIN
  #define LED_RED_PIN     D3
  #define LED_GREEN_PIN   D4
#elif defined(CONFIG_IDF_TARGET_ESP32C6)
  #define ADC_MAX         4095.0
  #define TRIG_PIN        4
  #define ECHO_PIN        5
  #define GAS_PIN         2
  #define BATT_PIN        3
  #define LED_PIN         8
  #define LED_RED_PIN     12
  #define LED_GREEN_PIN   13
#else  // ESP32 Standar
  #define ADC_MAX         4095.0
  #define TRIG_PIN        5
  #define ECHO_PIN        18
  #define GAS_PIN         34
  #define BATT_PIN        35
  #define LED_PIN         2
  #define LED_RED_PIN     12
  #define LED_GREEN_PIN   13
#endif

#define BIN_HEIGHT_CM   50     // Tinggi tong sampah (cm)
#define UPDATE_INTERVAL 10000  // Interval kirim data (ms)

FirebaseData   fbdo;
FirebaseAuth   fbAuth;
FirebaseConfig fbConfig;

String devicePath;
String histPath;

unsigned long lastUpdate = 0;

// --- Setup ----------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN,  OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);

  digitalWrite(LED_RED_PIN, HIGH);
  digitalWrite(LED_GREEN_PIN, LOW);

  devicePath = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/status";
  histPath   = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/history";

  Serial.println("================================");
  Serial.println("  BAJA IoT Trash Monitor v2.0");
  Serial.println("  Kode: TRS-" + String(DEVICE_CODE));
  Serial.println("================================");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Menghubungkan WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    digitalWrite(LED_RED_PIN, !digitalRead(LED_RED_PIN));
  }
  digitalWrite(LED_PIN, HIGH);
  Serial.println("\nWiFi Terhubung! IP: " + WiFi.localIP().toString());

  configTime(25200, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Sinkronisasi waktu NTP");
  while (time(nullptr) < 100000) { delay(200); Serial.print("."); }
  Serial.println(" OK");

  // Konfigurasi Firebase v4+
  fbConfig.database_url = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  fbConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, HIGH);

  Serial.println("Firebase terhubung!");
  Serial.println("================================");
}

// --- Baca Sensor Ultrasonik -----------------------------------
float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.0343 / 2.0;
}

// --- Hitung Level Kepenuhan -----------------------------------
int calcFillLevel(float distCm) {
  if (distCm < 0) return -1;
  float level = (1.0 - (distCm / BIN_HEIGHT_CM)) * 100.0;
  return constrain((int)level, 0, 100);
}

// --- Baca Gas MQ-135 -----------------------------------------
int readGasPPM() {
  int raw = analogRead(GAS_PIN);
  return map(raw, 0, (int)ADC_MAX, 0, 1000);
}

// --- Baca Baterai --------------------------------------------
int readBatteryPercent() {
  int   raw  = analogRead(BATT_PIN);
  float volt = (raw / ADC_MAX) * 3.3 * 2.0;
  int   pct  = (int)((volt - 3.0) / (4.2 - 3.0) * 100.0);
  return constrain(pct, 0, 100);
}

// --- Kirim ke Firebase ---------------------------------------
void sendToFirebase(int fillLevel, int gasLevel, int battery, bool isFull) {
  time_t now = time(nullptr);

  Firebase.RTDB.setInt(&fbdo,  devicePath + "/fill_level",   fillLevel);
  Firebase.RTDB.setInt(&fbdo,  devicePath + "/gas_level",    gasLevel);
  Firebase.RTDB.setInt(&fbdo,  devicePath + "/battery",      battery);
  Firebase.RTDB.setBool(&fbdo, devicePath + "/is_full",      isFull);
  Firebase.RTDB.setInt(&fbdo,  devicePath + "/last_updated", (int)now);

  FirebaseJson histJson;
  histJson.set("fill_level",  fillLevel);
  histJson.set("gas_level",   gasLevel);
  histJson.set("timestamp",   (int)now);
  Firebase.RTDB.pushJSON(&fbdo, histPath, &histJson);

  Serial.print("Terkirim | Fill:");
  Serial.print(fillLevel);
  Serial.print("% | Gas:");
  Serial.print(gasLevel);
  Serial.print(" ppm | Batt:");
  Serial.print(battery);
  Serial.println("%");
}

// --- Loop Utama ----------------------------------------------
void loop() {
  unsigned long now = millis();

  if (now - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = now;
    digitalWrite(LED_PIN, LOW);

    float  dist      = readDistanceCm();
    int    fillLevel = calcFillLevel(dist);
    int    gasLevel  = readGasPPM();
    int    battery   = readBatteryPercent();
    bool   isFull    = (fillLevel >= 90);

    Serial.print("Sensor | Jarak:");
    Serial.print(dist);
    Serial.print("cm | Fill:");
    Serial.print(fillLevel);
    Serial.print("% | Gas:");
    Serial.print(gasLevel);
    Serial.print(" ppm | Batt:");
    Serial.print(battery);
    Serial.println("%");

    if (fillLevel < 0) {
      Serial.println("GAGAL baca sensor ultrasonik! Periksa kabel.");
    } else if (WiFi.status() == WL_CONNECTED) {
      sendToFirebase(fillLevel, gasLevel, battery, isFull);
      digitalWrite(LED_RED_PIN,   LOW);
      digitalWrite(LED_GREEN_PIN, HIGH);
    } else {
      Serial.println("WiFi terputus! Mencoba reconnect...");
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_RED_PIN,   HIGH);
      WiFi.reconnect();
    }

    digitalWrite(LED_PIN, HIGH);
  }
}
