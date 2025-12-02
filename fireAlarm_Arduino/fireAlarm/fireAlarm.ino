#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define DHTPIN D4
#define DHTTYPE DHT11
#define FLAME_SENSOR_PIN D0
#define LED_PIN D3
#define BUZZER_PIN D2
#define PUMP_PIN D1

//cấu hình wifi
const char* ssid = "Datt";
const char* password = "11012002";

//cấu hình MQTT
const char* mqtt_server ="broker.hivemq.com";
const int mqtt_port = 1883;
const char* mqtt_topic_pub ="fire_detection/sensor_data";
const char* mqtt_topic_sub ="fire_detection/control-device";

WiFiClient espClient;   //socket TCP/IP
PubSubClient client(espClient); //đối tượng MQTT: dùng espClient để giao tiếp
DHT dht(DHTPIN, DHTTYPE);

//Biến quản lý timer
unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 5000; // 5 giây

//Quản lý thao tác
bool buzzerManualOff = false;
bool pumpManualOff   = false;

//Biến trạng thái - previous
bool prevWarningCondition = false;
bool prevDangerCondition  = false;

// ================== HÀM TIỆN ÍCH ==================

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Tạo client ID ngẫu nhiên
    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(mqtt_topic_sub);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

// TÍNH TOÁN warning/danger/systemStatus – dùng chung cho loop + publish
void evaluateSystemStatus(float temp,
                          int flameDetected,
                          bool &warningCondition,
                          bool &dangerCondition,
                          String &systemStatus) 
{
  warningCondition = ((temp>=50 && temp < 70) || (flameDetected == 0));
  dangerCondition  = (temp >= 70 && (flameDetected == 0));

//test DangerCondition
  /*warningCondition = (temp >= 70 && (flameDetected == 0));
  dangerCondition  = ((temp>=50 && temp < 70) || (flameDetected == 0));
*/

  systemStatus = "normal";
  if (dangerCondition) {
    systemStatus = "danger";
  } else if (warningCondition) {
    systemStatus = "warning";
  }
}

void controlDevices(bool warningCondition, bool dangerCondition) {
  // Reset manual override khi có cảnh báo mới
  if ((warningCondition || dangerCondition) && !prevWarningCondition && !prevDangerCondition) {
    buzzerManualOff = false;
    pumpManualOff   = false;
  }

  // Điều khiển đèn - tự động hoàn toàn
  digitalWrite(LED_PIN, (warningCondition || dangerCondition) ? HIGH : LOW);
  
  // Điều khiển còi - manual có độ ưu tiên cao nhất
  if (buzzerManualOff) {
    digitalWrite(BUZZER_PIN, LOW);
  } else {
    digitalWrite(BUZZER_PIN, (warningCondition || dangerCondition) ? HIGH : LOW);
  }

  // Điều khiển bơm - chỉ hoạt động ở chế độ danger
  if (pumpManualOff) {
    digitalWrite(PUMP_PIN, LOW);
  } else {
    digitalWrite(PUMP_PIN, dangerCondition ? HIGH : LOW);
  }

  // Cập nhật trạng thái trước đó
  prevWarningCondition = warningCondition;
  prevDangerCondition  = dangerCondition;
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.println("\nReceived message from " + String(topic));

  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  
  const char* device = doc["device"];
  const char* action = doc["action"];

  Serial.print("Device: ");
  Serial.print(device);
  Serial.print(" | Action: ");
  Serial.println(action);

  // Xử lý lệnh điều khiển ngay lập tức
  if (strcmp(device, "buzzer") == 0) {
    if (strcmp(action, "off") == 0) {
      buzzerManualOff = true;
      digitalWrite(BUZZER_PIN, LOW);
    }
  }
  else if (strcmp(device, "pump") == 0) {
    if (strcmp(action, "off") == 0) {
      pumpManualOff = true;
      digitalWrite(PUMP_PIN, LOW);
    }
  }
  else if (strcmp(device, "system") == 0 && strcmp(action, "reboot") == 0) {
    buzzerManualOff = false;
    pumpManualOff   = false;
    digitalWrite(LED_PIN,    LOW);
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(PUMP_PIN,   LOW);
  }
}

void publishSensorData(float temp,
                       float humidity,
                       int flameDetected,
                       const String &systemStatus) 
{
  StaticJsonDocument<256> doc;
  doc["temperature"]    = temp;
  doc["humidity"]       = humidity;
  doc["flame_detected"] = flameDetected; //0=có lửa, 1= không
  doc["system_status"]  = systemStatus;

  char buffer[256]; // cấp phát mảng
  serializeJson(doc, buffer); // ghi đè nội dung doc vào buffer
  
  if (client.publish(mqtt_topic_pub, buffer)) {
    Serial.println("Message published");
  } else {
    Serial.println("Publish failed");
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  dht.begin();
  pinMode(FLAME_SENSOR_PIN, INPUT);
  pinMode(LED_PIN,          OUTPUT);
  pinMode(BUZZER_PIN,       OUTPUT);
  pinMode(PUMP_PIN,         OUTPUT);

  digitalWrite(LED_PIN,    LOW);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(PUMP_PIN,   LOW);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); //duy trì kết nối

  unsigned long currentTime = millis();
  if (currentTime - lastPublishTime >= publishInterval) {
    float humidity     = dht.readHumidity();
    float temp         = dht.readTemperature();
    int   flameDetected = digitalRead(FLAME_SENSOR_PIN);

    String systemStatus;
    bool warningCondition = false;
    bool dangerCondition  = false;

    // Tính toán trạng thái hệ thống
    evaluateSystemStatus(temp, flameDetected, warningCondition, dangerCondition, systemStatus);

    controlDevices(warningCondition, dangerCondition);
    publishSensorData(temp, humidity, flameDetected, systemStatus);

    Serial.printf(
      "Temp: %.1fC | Humi: %.1f%% | Flame: %s | Status: %s\n",
      temp,
      humidity,
      flameDetected == 0 ? "Detected" : "Not detected",
      systemStatus.c_str()
    );
    Serial.println("------------------------------------");

    lastPublishTime = currentTime;
  }
}
