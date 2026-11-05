module.exports=[73718,e=>{"use strict";let t=process.env.CLICK_REPO_BASE_URL||"https://raw.githubusercontent.com/prajjwalprajjwal/Click/main",a=`${t}/sdk/click_sdk_spec.json`,i=`${t}/sdk/CLICK_AI_AGENT_PROMPT.md`,r={version:"1.0.0",targetMcu:["Raspberry Pi RP2354A","Espressif ESP32-S3 / ESP32"],hardware:{name:"Click Handheld Micro-Console",mcu:"RP2354A (Dual ARM Cortex-M33 @ 150MHz) / ESP32",clockSpeedMhz:150,display:{type:"SSD1306 OLED",width:128,height:64,monochrome:!0,i2cAddress:"0x3C",bus:"Wire1 (GP6 SDA, GP7 SCL)"},buttons:[{name:"ACTION",pin:"GP2",description:"Primary interaction button (Jump, Click, Increment, Fire)",keyboardShortcut:"Space / Enter"},{name:"MODE",pin:"GP3",description:"Secondary navigation button (Switch mode, Pause, Reset, Menu)",keyboardShortcut:"Key M"}],leds:{type:"WS2812B / SK6812 Dual RGB NeoPixel",count:2,pin:"GP11 (PIO0 Driver)",effects:["setAll(r, g, b)","flash(r, g, b, durationMs)","startBreathe(r, g, b, periodMs)","pulseOnce(r, g, b, durationMs)","startCelebration(durationMs)","clear()"]},buzzer:{type:"Piezo Transducer PWM Buzzer",pin:"GP27",nonBlocking:!0,presets:["playClick() [2800Hz tactile click]","playTone(freq, durMs)","playSequence(notes, count)","playScore() [1046Hz -> 1318Hz]","playFlap() [900Hz -> 1400Hz]","playGameOver() [320Hz -> 220Hz -> 130Hz]","playCelebrationFanfare() [Triumphant C-E-G-C chime]","playStartup()"]},storage:{eepromNamespace:"click_stats",capacity:"Preferences NVS / Flash Sector"},flashing:{rp2354:{protocol:"WebUSB Picoboot",vendorId:11914,method:"Direct USB-C UF2 / binary partition transfer"},esp32:{protocol:"WebSerial ESPLoader",defaultBaud:115200,turboBaud:460800}}},cplusplusApi:{baseClass:"Applet",lifecycleMethods:[{name:"init",signature:"virtual void init() = 0",description:"Called when applet mounts. Reset state and variables here."},{name:"update",signature:"virtual void update() = 0",description:"Called 30-60 times per second for game mechanics, physics, and state updates."},{name:"draw",signature:"virtual void draw() = 0",description:"Render UI, sprites, and text into Adafruit SSD1306 display buffer."},{name:"cleanup",signature:"virtual void cleanup()",description:"Called before switching applets or unloading."},{name:"onPrepareSleep",signature:"virtual void onPrepareSleep()",description:"Safe shutdown state before MCU enters dormant low-power mode."}],inputHandlers:[{name:"onActionClick",signature:"virtual void onActionClick()",description:"Fired on momentary press of primary ACTION button."},{name:"onActionHold",signature:"virtual void onActionHold()",description:"Fired when ACTION button is held down continuously (>500ms)."},{name:"onModeClick",signature:"virtual void onModeClick()",description:"Fired on momentary press of MODE button."},{name:"onModeHold",signature:"virtual void onModeHold()",description:"Fired when MODE button is held continuously (>500ms)."},{name:"onBothHeld",signature:"virtual void onBothHeld()",description:"Fired when ACTION and MODE are held together (System exit to launcher)."}],displayMethods:[{name:"display.clearDisplay()",signature:"void clearDisplay()"},{name:"display.drawPixel(x, y, color)",signature:"void drawPixel(int16_t x, int16_t y, uint16_t color)"},{name:"display.drawLine(x0, y0, x1, y1, color)",signature:"void drawLine(x0, y0, x1, y1, color)"},{name:"display.drawRect(x, y, w, h, color)",signature:"void drawRect(x, y, w, h, color)"},{name:"display.fillRect(x, y, w, h, color)",signature:"void fillRect(x, y, w, h, color)"},{name:"display.drawCircle(x, y, r, color)",signature:"void drawCircle(x, y, r, color)"},{name:"display.fillCircle(x, y, r, color)",signature:"void fillCircle(x, y, r, color)"},{name:"display.setCursor(x, y)",signature:"void setCursor(int16_t x, int16_t y)"},{name:"display.setTextSize(s)",signature:"void setTextSize(uint8_t size)"},{name:"display.setTextColor(c)",signature:"void setTextColor(uint16_t c)"},{name:"display.print(val)",signature:"size_t print(...)"},{name:"display.println(val)",signature:"size_t println(...)"}],soundFxMethods:[{name:"SoundFX::playClick()",signature:"Quick 2800Hz tactile feedback"},{name:"SoundFX::playTone(freq, durMs)",signature:"Custom square wave"},{name:"SoundFX::playFlap()",signature:"Two-tone chirp"},{name:"SoundFX::playScore()",signature:"Ascending two-note chime"},{name:"SoundFX::playGameOver()",signature:"Descending sad slide"},{name:"SoundFX::playCelebrationFanfare()",signature:"Fanfare triumphant sequence"}],ws2812Methods:[{name:"WS2812::setAll(r, g, b)",signature:"Sets both RGB LEDs to specified color"},{name:"WS2812::flash(r, g, b, durationMs)",signature:"Non-blocking temporary burst"},{name:"WS2812::startBreathe(r, g, b, periodMs)",signature:"Sinusoidal ambient glow"},{name:"WS2812::startCelebration(durationMs)",signature:"Dual-LED rotating rainbow party"},{name:"WS2812::clear()",signature:"Turn off both LEDs"}]},simulatorContract:{canvasWidth:128,canvasHeight:64,jsMethods:["init()","update(deltaTimeMs)","draw(display)","onActionClick()","onActionHold()","onModeClick()","onModeHold()"]}},o=`# CLICK MICROAPPLET GENERATION SPECIFICATION
You are the Lead Systems & Gameplay Engineer for **Click**, an ultra-portable open-source handheld device driven by the Raspberry Pi RP2354A (and ESP32).

## Hardware Constraints
- **Screen**: Monochrome SSD1306 OLED, exactly 128 pixels wide by 64 pixels high.
- **Physical Controls**:
  - \`ACTION\` button: Primary action (interact, jump, fire, punch, increment, confirm).
  - \`MODE\` button: Secondary action (menu, switch mode, pause, cycle, reset).
- **Haptic/Audio**: Piezo Buzzer (\`SoundFX::playClick()\`, \`SoundFX::playTone(freq, ms)\`, \`SoundFX::playScore()\`, \`SoundFX::playGameOver()\`, \`SoundFX::playCelebrationFanfare()\`).
- **Visual Glow**: 2x WS2812 RGB LEDs (\`WS2812::flash(r, g, b, ms)\`, \`WS2812::startBreathe(r, g, b, ms)\`, \`WS2812::startCelebration(ms)\`, \`WS2812::setAll(r, g, b)\`).
- **Memory**: Embedded MCU heap. Avoid dynamic allocations in the game loop; use clean static structures.

## Output Format
Always produce clean JSON containing:
1. \`title\`: Short catchy name of the microapplet.
2. \`author\`: Suggested creator handle or attribution.
3. \`description\`: 1-2 sentence overview of gameplay or utility.
4. \`tags\`: Array of 2-4 tags (e.g., ["game", "arcade", "retro", "focus"]).
5. \`instructions\`: Key controls and how to play or use it.
6. \`cppHeader\`: Complete C++ header file (\`[AppletName].h\`) inheriting from \`Applet\`.
7. \`cppSource\`: Complete C++ implementation file (\`[AppletName].cpp\`).
8. \`jsCompanion\`: Complete JavaScript class for immediate live execution inside the on-screen 128x64 simulator.

### JS Companion Simulator API
The JavaScript companion must be an object or class conforming to:
\`\`\`javascript
class Microapplet {
  constructor() {
    this.init();
  }
  init() {
    // Reset state
  }
  update(dt, input) {
    // Game loop logic
  }
  draw(display) {
    // display.clear();
    // display.drawPixel(x, y, color);
    // display.drawRect(x, y, w, h, fill);
    // display.drawCircle(x, y, r, fill);
    // display.drawText(text, x, y, size);
    // display.sound.playTone(freq, durMs); or display.sound.playClick();
    // display.leds.set(0, r, g, b); display.leds.set(1, r, g, b);
  }
  onActionClick() {}
  onActionHold() {}
  onModeClick() {}
  onModeHold() {}
}
\`\`\`
Ensure games have crisp retro aesthetics, smooth physics, punchy sound feedback, and rewarding LED glow animations!`;async function n(){try{let e=await fetch(a,{next:{revalidate:300},headers:{Accept:"application/json"}});if(e.ok)return{spec:await e.json(),isLive:!0,fetchedAt:new Date().toISOString(),source:"github"}}catch(e){console.warn("[Click SDK] Live spec fetch failed, using fallback:",e)}return{spec:r,isLive:!1,fetchedAt:new Date().toISOString(),source:"fallback"}}async function s(){try{let e=await fetch(i,{next:{revalidate:300}});if(e.ok){let t=await e.text();if(t&&t.trim().length>50)return{prompt:t,isLive:!0,source:"github"}}}catch(e){console.warn("[Click SDK] Live prompt fetch failed, using fallback:",e)}return{prompt:o,isLive:!1,source:"fallback"}}async function l(){let[e,t]=await Promise.all([n(),s()]);return{live:e.isLive&&t.isLive,specSource:e.source,promptSource:t.source,timestamp:new Date().toISOString(),hardware:e.spec.hardware.name,targetMcu:e.spec.targetMcu,displayResolution:`${e.spec.hardware.display.width}x${e.spec.hardware.display.height}`}}e.s(["E",0,s,"s",0,n,"p",0,l])}];

//# sourceMappingURL=lib_click-sdk_ts_06o3cfhysxm22._.js.map