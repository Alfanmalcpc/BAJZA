/*
 ======================================================
  BAJA IoT Trash Monitor -- Master Sketch
  Version : 3.0 (Firebase_ESP_Client + Multi-Sensor)
  Hardware:
    - ESP32 (DevKit / Wemos D1 R32) -> 3 ADC Langsung (Tanpa Modul Tambahan)
    - NodeMCU / Wemos D1 Mini -> via Modul CD74HC4067 Multiplexer
    - Sensor Ultrasonik HC-SR04 (Level Kepenuhan)
    - Sensor Gas MQ-4 (Metana), MQ-135 (NH3/CO2), MQ-2 (Gas Umum)
    - (Opsional) Voltage Divider untuk cek baterai

  Library yang dibutuhkan (Install via Library Manager):
    - Firebase Arduino Client Library for ESP8266 and ESP32
      by Mobizt  (versi 4.x ke atas)
    - ArduinoJson by Benoit Blanchon
 ======================================================
*/

#if defined(ESP8266) || defined(WEMOS)
  #include <ESP8266WiFi.h>
  #define USE_MUX 1
#else
  #include <WiFi.h>
  #define USE_MUX 0
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
// PENTING: FIREBASE_AUTH harus diisi dengan "Database Secret" (40+ karakter acak),
// BUKAN Web API Key yang berawalan "AIzaSy...". 
// Jika menggunakan API Key, Firebase akan menolak koneksi (Unauthorized).
#define FIREBASE_AUTH   "AIzaSyDCh3CQHqdi7SxhDHLJ6IsQ7hq4GSOi6yI" // GANTI DENGAN DATABASE SECRET ANDA!

// --- PIN & ADC ------------------------------------------------
#if USE_MUX
  // Pin untuk ESP8266 / Wemos D1 Mini (Hanya 1 ADC, jadi pakai Multiplexer)
  #define ADC_MAX         1023.0
  #define TRIG_PIN        D1
  #define ECHO_PIN        D2
  #define LED_PIN         LED_BUILTIN
  #define LED_RED_PIN     D3
  #define LED_GREEN_PIN   D4
  
  // Pin MUX Control (CD74HC4067)
  #define MUX_SIG         A0
  #define MUX_S0          D5
  #define MUX_S1          D6
  #define MUX_S2          D7
  #define MUX_S3          D8

  // Channel Multiplexer
  #define CH_MQ4          0
  #define CH_MQ135        1
  #define CH_MQ2          2
  #define CH_BATT         3
#else
  // Pin untuk ESP32 (Punya banyak ADC, jadi langsung pasang tanpa modul tambahan)
  #define ADC_MAX         4095.0
  #define TRIG_PIN        5
  #define ECHO_PIN        18
  #define LED_PIN         2
  #define LED_RED_PIN     12
  #define LED_GREEN_PIN   13
  
  // Pin Sensor Langsung (Tanpa MUX)
  #define MQ4_PIN         34
  #define MQ135_PIN       35
  #define MQ2_PIN         32
  #define BATT_PIN        33
#endif

#define BIN_HEIGHT_CM   50     // Tinggi tong sampah (cm)
#define UPDATE_INTERVAL 10000  // Interval kirim data (ms)

FirebaseData   fbdo;
FirebaseAuth   fbAuth;
FirebaseConfig fbConfig;

String devicePath;
String histPath;

unsigned long lastUpdate = 0;

#if USE_MUX
// --- Pilih Channel MUX ---
void selectMuxChannel(int ch) {
  digitalWrite(MUX_S0, (ch >> 0) & 1);
  digitalWrite(MUX_S1, (ch >> 1) & 1);
  digitalWrite(MUX_S2, (ch >> 2) & 1);
  digitalWrite(MUX_S3, (ch >> 3) & 1);
  delay(5);
}
// --- Baca Sensor via MUX ---
int readAnalog(int pin_or_ch) {
  selectMuxChannel(pin_or_ch);
  return analogRead(MUX_SIG);
}
#else
// --- Baca Sensor Langsung ---
int readAnalog(int pin_or_ch) {
  return analogRead(pin_or_ch);
}
#endif

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN,  OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);

#if USE_MUX
  pinMode(MUX_S0, OUTPUT); pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT); pinMode(MUX_S3, OUTPUT);
#endif

  digitalWrite(LED_RED_PIN, HIGH);
  digitalWrite(LED_GREEN_PIN, LOW);

  devicePath = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/status";
  histPath   = "/trash-bins/TRS-" + String(DEVICE_CODE) + "/history";

  Serial.println("================================");
  Serial.println("  BAJA IoT Trash Monitor v3.0");
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
  Serial.println("\nWiFi Terhubung!");

  configTime(25200, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Sinkronisasi waktu NTP");
  int ntp_retry = 0;
  while (time(nullptr) < 100000 && ntp_retry < 30) { 
    delay(500); 
    Serial.print("."); 
    ntp_retry++;
  }
  Serial.println();

  fbConfig.database_url = FIREBASE_HOST;
  
  // Deteksi apakah user memasukkan API Key atau Database Secret
  String authStr = String(FIREBASE_AUTH);
  if (authStr.startsWith("AIzaSy")) {
    // Jika berawalan AIzaSy, berarti ini Web API Key. Gunakan sebagai api_key (tanpa auth khusus).
    fbConfig.api_key = FIREBASE_AUTH;
  } else {
    // Jika bukan API Key, asumsikan ini adalah Database Secret (Legacy Token)
    fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  }
  
  fbConfig.token_status_callback = tokenStatusCallback;

  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, HIGH);
  Serial.println("Firebase terhubung!");
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10); digitalWrite(TRIG_PIN, LOW);
  long d = pulseIn(ECHO_PIN, HIGH, 30000);
  return d == 0 ? -1 : d * 0.0343 / 2.0;
}

int calcFillLevel(float distCm) {
  if (distCm < 0) return -1;
  float level = (1.0 - (distCm / BIN_HEIGHT_CM)) * 100.0;
  return constrain((int)level, 0, 100);
}

int readGasPPM(int pin_or_ch) {
  return map(readAnalog(pin_or_ch), 0, (int)ADC_MAX, 0, 1000);
}

int readBatteryPercent(int pin_or_ch) {
  float volt = (readAnalog(pin_or_ch) / ADC_MAX) * 3.3 * 2.0;
  int pct = (int)((volt - 3.0) / (4.2 - 3.0) * 100.0);
  return constrain(pct, 0, 100);
}

void sendToFirebase(int fillLevel, int mq4, int mq135, int mq2, int battery, bool isFull) {
  time_t now = time(nullptr);
  
  // Jika fillLevel negatif (sensor ultrasonik bermasalah), atur ke 0 agar dashboard tidak error
  if (fillLevel < 0) fillLevel = 0;

  Firebase.RTDB.setInt(&fbdo, devicePath + "/fill_level", fillLevel);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/gas_level", mq135);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/gas_mq4", mq4);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/gas_mq135", mq135);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/gas_mq2", mq2);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/battery", battery);
  Firebase.RTDB.setBool(&fbdo, devicePath + "/is_full", isFull);
  Firebase.RTDB.setInt(&fbdo, devicePath + "/last_updated", (int)now);

  FirebaseJson histJson;
  histJson.set("fill_level", fillLevel);
  histJson.set("gas_level", mq135);
  histJson.set("gas_mq4", mq4);
  histJson.set("gas_mq135", mq135);
  histJson.set("gas_mq2", mq2);
  histJson.set("timestamp", (int)now);
  Firebase.RTDB.pushJSON(&fbdo, histPath, &histJson);
  
  Serial.print("Data Terkirim | Fill: "); Serial.print(fillLevel);
  Serial.print("% | MQ4: "); Serial.print(mq4);
  Serial.print(" | MQ135: "); Serial.print(mq135);
  Serial.print(" | MQ2: "); Serial.print(mq2);
  Serial.print(" | Batt: "); Serial.print(battery); Serial.println("%");
}

void loop() {
  unsigned long now = millis();
  if (now - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = now;
    digitalWrite(LED_PIN, LOW);

    float dist = readDistanceCm();
    int fillLevel = calcFillLevel(dist);
#if USE_MUX
    int mq4 = readGasPPM(CH_MQ4);
    int mq135 = readGasPPM(CH_MQ135);
    int mq2 = readGasPPM(CH_MQ2);
    int battery = readBatteryPercent(CH_BATT);
#else
    int mq4 = readGasPPM(MQ4_PIN);
    int mq135 = readGasPPM(MQ135_PIN);
    int mq2 = readGasPPM(MQ2_PIN);
    int battery = readBatteryPercent(BATT_PIN);
#endif
    bool isFull = (fillLevel >= 90);

    if (WiFi.status() == WL_CONNECTED) {
      // Meskipun fillLevel bernilai -1 (error sensor ultrasonik), kita tetap kirim data sensor gas & baterai
      sendToFirebase(fillLevel, mq4, mq135, mq2, battery, isFull);
      digitalWrite(LED_RED_PIN, LOW);
      digitalWrite(LED_GREEN_PIN, HIGH);
    } else {
      digitalWrite(LED_GREEN_PIN, LOW);
      digitalWrite(LED_RED_PIN, HIGH);
      WiFi.reconnect();
    }
    digitalWrite(LED_PIN, HIGH);
  }
}
