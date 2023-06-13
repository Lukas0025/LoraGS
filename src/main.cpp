
#include <radio.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

#define NSS  18
#define DIO0 26
#define NRST 23

const char HexLUT[] = "0123456789ABCDEF";

// Replace with your network credentials
const char* ssid     = "WIFI/P";
const char* password = "FJELOAOKSWLI57Q7";

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// declare lora settings
const LoraSettings_t loraConf = {
    .Frequency      = 434.126,
    .Bandwidth      = 20.8,
    .SpreadFactor   = 11,
    .CodeRate       = 8,
    .SyncWord       = 0x12,
    .Power          = 17,
    .CurrentLimit   = 100,
    .PreambleLength = 8,
    .Gain           = 0
};

// init HW level radioLib
RADIOHW radio = new Module(NSS, DIO0, NRST);

//declare radioControl (SOFT Layer)
RadioControl* radioControl;


void LoraPacketReader(uint8_t *body) {

}

String hexDump(uint8_t *body, unsigned len) {
    String out = "";

    for (unsigned i = 0; i < len; i++) {
        out += HexLUT[(body[i] >> 4) & 0b1111];
        out += HexLUT[body[i]        & 0b1111];
    }

    return out;
}

void onWsEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      DEBUG_PRINT("WebSocket client ", client->id(), " connected from " , client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      DEBUG_PRINT("WebSocket client ", client->id(), " disconnected");
      break;
    case WS_EVT_DATA:
      DEBUG_PRINT("Client sended data of len ", len);
      break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void initWebSocket() {
  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
}

void LoraSSDOpacketReader(uint8_t *body, ssdoHeader_t *header) {
    DEBUG_PRINT("Readed lora SSDO packet id: ", header->pktId, " size: ", header->pktSize);

    ws.textAll(
        "{ \
            \"header\": { \
                \"src\":     " + String(header->src) + ", \
                \"pktId\":   " + String(header->pktId) + ", \
                \"pktSize\": " + String(header->pktSize) + ", \
                \"objId\":   " + String(header->objId) + ", \
                \"objSize\": " + String(header->objSize) + ", \
                \"objType\": " + String(header->objType) + ", \
                \"crc\":     " + String(header->crc)     + " \
            }, \
            \"body\": \"" + hexDump(body, header->pktSize) + "\" \
        }"
    );
}


void setup() {
    DEBUG_BEGIN();

    // Connect to Wi-Fi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        DEBUG_PRINT("Connecting to WiFi..");
    }
    
    // Print ESP Local IP Address
    DEBUG_PRINT("Wifi addr is ", WiFi.localIP());
    
    initWebSocket();
    
    // Route for root / web page
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) { 
        request->send(200, "text/html", "hello");
    });
    
    // Start server
    server.begin();

    radioControl = new RadioControl(&radio); //init radio control

    radioControl->setupLora(loraConf); //setup lora
    radioControl->setSSDOSender(0xFAFA); // set sender ID for SSDO (some random UINT32)
    radioControl->setLoraSSDOPacketHandler(LoraSSDOpacketReader); // set radio in recive mode
}

void loop() {
    radioControl->processRecvBuff(); // process recv buff
    ws.cleanupClients();
}
