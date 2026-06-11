#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ---- Configuration ----
const char* WIFI_SSID     = "Wokwi-GUEST";
const char* WIFI_PASS     = "";
const char* MQTT_BROKER   = "02056c0680db404c8459ccfb6b33a21c.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;
const char* MQTT_USER     = "esp32-vehicles";
const char* MQTT_PASS     = "Asd12345";
const char* VEHICLE_ID    = "moto-01";
const char* FLEET_ID      = "logistics-01";

// ---- Let's Encrypt ISRG Root X1 CA ----
static const char* root_ca PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwwwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogZiUvsEZMai1oDKsYOEAqlFUnORDYGfiMTzlJoccBCKYMh
q0tHx+1I3UH6Mn/BRFCO87FPUOsb/k0HsaAHgEUiKGp8xNahBMR+PHMA5gDvBME
pBK/JydX+n7JBECKnxA0mFT0EN1POMi4EjUP4baN4f+tTqeCIQ5E9Nl/5tia5kF1
/Uq2E5YYAjW1l5YxOREOhpMS0IWoaOksvU/ENLEZfuIRlQ7QFZYJ3E4bROvE0FMF
NaXi1gQxV+Oq/DLyl5EjB6TL7aJJ2eFB0VRjMp8V0KzPDRJOzRQ39bnOj63WYXNp
Ps4wSCwFLxlnPMNfcM7OswVYBuqsEUMYS3aq2TmA+ZCII3rOljdGCW0cjthLDMFi
7A/xGbN0x/EfW/J3XXwfvOsxSE+HGiNn9gqGB4VwhEBK8XGLKXQvFERuLjwc0J1R
FExrpq5ZBVbigPSTxNBlEcIVlsHKI0AfHTgM6L2ITaKfhM5mJeGaRPpsZ0E=
-----END CERTIFICATE-----
)EOF";

// ---- Pin Definitions ----
#define POT_LAT_PIN   34
#define POT_LNG_PIN   35
#define BTN_STATUS    12
#define BTN_SOS       14
#define LED_GREEN     25
#define LED_RED       26
#define LED_YELLOW    27

// ---- Base coordinates (center of simulation area) ----
const float BASE_LAT = -18.9086;  // Uberlândia norte
const float BASE_LNG = -48.2672;
const float LAT_RANGE = 0.05;     // ±0.05 degrees (~5.5 km)
const float LNG_RANGE = 0.05;

// ---- State ----
WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

const char* statusLabels[] = {"stopped", "idle", "moving"};
int currentStatus = 2;  // Start as "moving"
float batteryLevel = 100.0;
unsigned long lastPublish = 0;
unsigned long lastBtnStatus = 0;
unsigned long lastBtnSos = 0;
const int PUBLISH_INTERVAL = 2000;  // 2 seconds

// ---- MQTT Topics ----
char topicPosition[80];
char topicSpeed[80];
char topicBattery[80];
char topicStatus[80];
char topicAlerts[80];
char topicCmdStop[80];
char topicCmdStart[80];
char topicCmdHonk[80];
char topicCmdResponse[80];

void buildTopics() {
    snprintf(topicPosition, 80, "fleet/%s/%s/telemetry/position", FLEET_ID, VEHICLE_ID);
    snprintf(topicSpeed, 80, "fleet/%s/%s/telemetry/speed", FLEET_ID, VEHICLE_ID);
    snprintf(topicBattery, 80, "fleet/%s/%s/telemetry/battery", FLEET_ID, VEHICLE_ID);
    snprintf(topicStatus, 80, "fleet/%s/%s/status", FLEET_ID, VEHICLE_ID);
    snprintf(topicAlerts, 80, "fleet/%s/%s/alerts", FLEET_ID, VEHICLE_ID);
    snprintf(topicCmdStop, 80, "fleet/%s/%s/commands/stop", FLEET_ID, VEHICLE_ID);
    snprintf(topicCmdStart, 80, "fleet/%s/%s/commands/start", FLEET_ID, VEHICLE_ID);
    snprintf(topicCmdHonk, 80, "fleet/%s/%s/commands/honk", FLEET_ID, VEHICLE_ID);
    snprintf(topicCmdResponse, 80, "fleet/%s/%s/commands/response", FLEET_ID, VEHICLE_ID);
}

// ---- MQTT Callback (receive commands) ----
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg;
    for (int i = 0; i < length; i++) msg += (char)payload[i];
    Serial.printf("CMD received [%s]: %s\n", topic, msg.c_str());

    // Flash red LED to acknowledge command received
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_RED, HIGH);
        delay(100);
        digitalWrite(LED_RED, LOW);
        delay(100);
    }

    // Handle stop command
    if (String(topic) == String(topicCmdStop)) {
        currentStatus = 0;  // stopped
        publishStatus();
        sendResponse("stop_executed");
    }

    // Handle start command
    if (String(topic) == String(topicCmdStart)) {
        currentStatus = 2;  // moving
        publishStatus();
        sendResponse("start_executed");
    }

    // Handle honk command
    if (String(topic) == String(topicCmdHonk)) {
        Serial.println("HONK! HONK!");
        digitalWrite(LED_YELLOW, HIGH);
        delay(1000);
        digitalWrite(LED_YELLOW, LOW);
        sendResponse("honk_executed");
    }
}

void sendResponse(const char* result) {
    StaticJsonDocument<100> resDoc;
    resDoc["result"] = result;
    resDoc["timestamp"] = millis();
    char resBuffer[100];
    serializeJson(resDoc, resBuffer);
    mqtt.publish(topicCmdResponse, resBuffer, false); // QoS 1 normally, but pubsubclient only supports QoS 0 natively in publish
}

void connectWiFi() {
    Serial.print("Connecting to WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASS, 6); // Channel 6 to speed up Wokwi
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" Connected!");
}

void connectMQTT() {
    while (!mqtt.connected()) {
        Serial.print("Connecting to MQTT...");
        String clientId = "esp32-" + String(VEHICLE_ID) + "-" + String(random(1000));

        // LWT: publish "offline" to status topic if disconnected unexpectedly
        if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS,
                         topicStatus, 1, true, "\"offline\"")) {
            Serial.println(" Connected!");
            
            // Subscribe to commands (QoS 0 for pubsubclient, though QoS 1/2 handled by broker)
            mqtt.subscribe(topicCmdStop, 0);
            mqtt.subscribe(topicCmdStart, 0);
            mqtt.subscribe(topicCmdHonk, 0);
            
            // Publish online status (retained)
            publishStatus();
            digitalWrite(LED_GREEN, HIGH);
        } else {
            digitalWrite(LED_GREEN, LOW);
            Serial.printf(" Failed (rc=%d). Retrying...\n", mqtt.state());
            delay(2000);
        }
    }
}

void publishStatus() {
    String statusJson = "\"" + String(statusLabels[currentStatus]) + "\"";
    mqtt.publish(topicStatus, statusJson.c_str(), true);  // retained
}

void publishTelemetry() {
    static float lat = BASE_LAT;
    static float lng = BASE_LNG;

    // Apenas lê os potenciômetros e atualiza a posição se estiver em movimento (status == 2)
    if (currentStatus == 2) {
        int potLat = analogRead(POT_LAT_PIN);
        int potLng = analogRead(POT_LNG_PIN);

        // Map to coordinate range
        lat = BASE_LAT + ((potLat / 4095.0) * 2.0 - 1.0) * LAT_RANGE;
        lng = BASE_LNG + ((potLng / 4095.0) * 2.0 - 1.0) * LNG_RANGE;
    }

    // Simulate speed based on status
    float speed = 0;
    if (currentStatus == 2) speed = 30.0 + random(60);      // moving: 30-90 km/h
    else if (currentStatus == 1) speed = random(5);         // idle: 0-5 km/h

    // Simulate battery drain
    if (batteryLevel > 5 && currentStatus == 2) batteryLevel -= 0.05;

    // Simulate heading
    float heading = (millis() / 100) % 360;

    // Blink yellow LED during transmission
    digitalWrite(LED_YELLOW, HIGH);

    // Position
    StaticJsonDocument<200> posDoc;
    posDoc["lat"] = lat;
    posDoc["lng"] = lng;
    posDoc["heading"] = heading;
    posDoc["timestamp"] = millis();
    char posBuffer[200];
    serializeJson(posDoc, posBuffer);
    mqtt.publish(topicPosition, posBuffer);

    // Speed
    StaticJsonDocument<100> spdDoc;
    spdDoc["speed_kmh"] = speed;
    spdDoc["timestamp"] = millis();
    char spdBuffer[100];
    serializeJson(spdDoc, spdBuffer);
    mqtt.publish(topicSpeed, spdBuffer);

    // Battery (less frequent — every 10th cycle)
    static int batteryCounter = 0;
    if (++batteryCounter >= 10) {
        batteryCounter = 0;
        StaticJsonDocument<100> batDoc;
        batDoc["level_pct"] = batteryLevel;
        batDoc["voltage"] = 3.3 + (batteryLevel / 100.0) * 0.9;
        batDoc["timestamp"] = millis();
        char batBuffer[100];
        serializeJson(batDoc, batBuffer);
        mqtt.publish(topicBattery, batBuffer, false); 
    }

    // Low battery alert
    if (batteryLevel < 20 && batteryCounter == 0) {
        StaticJsonDocument<200> alertDoc;
        alertDoc["type"] = "low_battery";
        alertDoc["severity"] = "warning";
        alertDoc["message"] = "Battery below 20%";
        alertDoc["timestamp"] = millis();
        char alertBuffer[200];
        serializeJson(alertDoc, alertBuffer);
        mqtt.publish(topicAlerts, alertBuffer);
    }

    digitalWrite(LED_YELLOW, LOW);
}

void setup() {
    Serial.begin(115200);

    pinMode(POT_LAT_PIN, INPUT);
    pinMode(POT_LNG_PIN, INPUT);
    pinMode(BTN_STATUS, INPUT_PULLUP);
    pinMode(BTN_SOS, INPUT_PULLUP);
    pinMode(LED_GREEN, OUTPUT);
    pinMode(LED_RED, OUTPUT);
    pinMode(LED_YELLOW, OUTPUT);

    buildTopics();
    
    // Skip certificate validation since Wokwi doesn't have NTP time synced
    espClient.setInsecure();
    
    connectWiFi();
    
    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(mqttCallback);
    mqtt.setBufferSize(512); // Larger buffer for JSON
    
    connectMQTT();
}

void loop() {
    if (!mqtt.connected()) {
        connectMQTT();
    }
    mqtt.loop();

    // Button 1: Cycle status (stopped → idle → moving → stopped...)
    if (digitalRead(BTN_STATUS) == LOW && millis() - lastBtnStatus > 300) {
        lastBtnStatus = millis();
        currentStatus = (currentStatus + 1) % 3;
        Serial.printf("Status changed to: %s\n", statusLabels[currentStatus]);
        publishStatus();
    }

    // Button 2: SOS Alert
    if (digitalRead(BTN_SOS) == LOW && millis() - lastBtnSos > 1000) {
        lastBtnSos = millis();
        Serial.println("SOS ALERT TRIGGERED!");
        digitalWrite(LED_RED, HIGH);

        StaticJsonDocument<200> alertDoc;
        alertDoc["type"] = "sos";
        alertDoc["severity"] = "critical";
        alertDoc["message"] = "Emergency SOS activated by driver";
        alertDoc["timestamp"] = millis();
        char alertBuffer[200];
        serializeJson(alertDoc, alertBuffer);
        mqtt.publish(topicAlerts, alertBuffer);

        delay(500);
        digitalWrite(LED_RED, LOW);
    }

    // Publish telemetry at interval
    if (millis() - lastPublish >= PUBLISH_INTERVAL) {
        lastPublish = millis();
        publishTelemetry();
    }
}
