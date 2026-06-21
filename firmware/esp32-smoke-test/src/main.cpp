#include <Arduino.h>

void setup() {
#ifdef LED_BUILTIN
  pinMode(LED_BUILTIN, OUTPUT);
#endif

  Serial.begin(115200);
  delay(1500);
  Serial.println();
  Serial.println("Catune ESP32-S3 boot ok");
}

void loop() {
  static unsigned long tick = 0;

#ifdef LED_BUILTIN
  digitalWrite(LED_BUILTIN, tick % 2 == 0 ? HIGH : LOW);
#endif

  Serial.printf("alive %lu ms\n", millis());
  tick += 1;
  delay(1000);
}
