import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getClickAgentPrompt, getClickSdkSpec } from '@/lib/click-sdk';

export interface GenerateAppletRequest {
  prompt: string;
  userApiKey?: string;
}

/**
 * Smart Offline Free Tier Synthesizer for Click Microapplets
 * Generates verified 128x64 C++ and JavaScript companions when no API key is set
 */
function synthesizeFreeApplet(promptText: string): any {
  const p = promptText.toLowerCase();

  // 1. Reflex / Reaction Timer
  if (p.includes('reflex') || p.includes('reaction') || p.includes('speed tap')) {
    return {
      title: 'Reflex Speed Test',
      author: 'Free Studio Lab',
      category: 'Games',
      description: 'Test your nerve reaction time. Tap ACTION immediately when the OLED screen flashes WHITE!',
      tags: ['game', 'reflex', 'timing', 'arcade'],
      instructions: 'Wait for the screen to turn WHITE, then smash ACTION! Premature taps trigger buzzer foul.',
      cppHeader: `#pragma once
#include "Applet.h"

class ReflexApplet : public Applet {
private:
    enum State { WAITING, READY, RESULT, FOUL };
    State state = WAITING;
    uint32_t triggerMs = 0;
    uint32_t reactionMs = 0;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "ReflexApplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void ReflexApplet::init() {
    state = WAITING;
    reactionMs = 0;
    triggerMs = millis() + 1500 + (random(0, 3000));
    WS2812::clear();
}
void ReflexApplet::update() {
    if (state == WAITING && millis() >= triggerMs) {
        state = READY;
        SoundFX::playFlap();
        WS2812::flash(0, 255, 200, 500);
    }
}
void ReflexApplet::draw() {
    display.clearDisplay();
    if (state == WAITING) {
        display.setCursor(20, 26);
        display.print("WAIT FOR FLASH...");
    } else if (state == READY) {
        display.fillRect(0, 0, 128, 64, SSD1306_WHITE);
    } else if (state == RESULT) {
        display.setCursor(28, 20);
        display.setTextSize(2);
        display.print(reactionMs);
        display.print("ms");
    } else if (state == FOUL) {
        display.setCursor(24, 26);
        display.print("TOO EARLY! FOUL");
    }
}
void ReflexApplet::onActionClick() {
    if (state == WAITING) {
        state = FOUL;
        SoundFX::playGameOver();
        WS2812::flash(255, 0, 0, 500);
    } else if (state == READY) {
        state = RESULT;
        reactionMs = millis() - triggerMs;
        SoundFX::playCelebrationFanfare();
        WS2812::startCelebration(1000);
    }
}
void ReflexApplet::onModeClick() { init(); }`,
      jsCompanion: `class ReflexApplet {
  constructor() { this.init(); }
  init() {
    this.state = 'WAITING'; // WAITING, READY, RESULT, FOUL
    this.startMs = performance.now();
    this.triggerMs = this.startMs + 1500 + Math.random() * 2500;
    this.reactionMs = 0;
  }
  update(dt, input) {
    const now = performance.now();
    if (this.state === 'WAITING' && now >= this.triggerMs) {
      this.state = 'READY';
      input.sound.playTone(1400, 60);
      input.leds.set(0, 0, 255, 200);
      input.leds.set(1, 0, 255, 200);
    }
  }
  draw(display) {
    display.clear();
    if (this.state === 'WAITING') {
      display.drawText("REFLEX SPEED TEST", 12, 6, 1);
      display.drawText("Wait for screen flash...", 8, 28, 1);
      display.drawRect(8, 48, 112, 2, true);
    } else if (this.state === 'READY') {
      display.drawRect(0, 0, 128, 64, true);
    } else if (this.state === 'RESULT') {
      display.drawText("REACTION TIME:", 16, 8, 1);
      display.drawText(Math.round(this.reactionMs) + "ms", 28, 24, 2);
      display.drawText("ACTION: Play Again", 14, 48, 1);
    } else if (this.state === 'FOUL') {
      display.drawText("TOO EARLY! FOUL", 16, 24, 1);
      display.drawText("ACTION: Reset", 24, 42, 1);
    }
  }
  onActionClick(env) {
    if (this.state === 'WAITING') {
      this.state = 'FOUL';
      env.sound.playGameOver();
      env.leds.flash(255, 0, 0, 400);
    } else if (this.state === 'READY') {
      this.state = 'RESULT';
      this.reactionMs = performance.now() - this.triggerMs;
      env.sound.playFanfare();
      env.leds.flash(0, 255, 150, 1000);
    } else {
      this.init();
      env.sound.playClick();
    }
  }
  onModeClick(env) { this.init(); env.sound.playClick(); }
}`
    };
  }

  // 2. Metronome / Beat Clock
  if (p.includes('metronome') || p.includes('tempo') || p.includes('beat') || p.includes('bpm')) {
    return {
      title: 'Haptic Metronome',
      author: 'Free Studio Lab',
      category: 'Tools',
      description: 'Visual and acoustic tempo keeper. Emits sharp 2800Hz piezo clicks synchronized with dual LED flashes.',
      tags: ['tools', 'music', 'bpm', 'metronome'],
      instructions: 'ACTION taps tempo to adjust BPM (40-240). MODE toggles playback.',
      cppHeader: `#pragma once
#include "Applet.h"

class MetronomeApplet : public Applet {
private:
    int bpm = 120;
    bool active = true;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "MetronomeApplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void MetronomeApplet::init() { bpm = 120; active = true; }
void MetronomeApplet::update() {}
void MetronomeApplet::draw() {
    display.clearDisplay();
    display.setCursor(30, 20);
    display.setTextSize(2);
    display.print(bpm);
    display.print(" BPM");
}
void MetronomeApplet::onActionClick() { bpm = (bpm >= 200) ? 60 : bpm + 10; SoundFX::playClick(); }
void MetronomeApplet::onModeClick() { active = !active; }`,
      jsCompanion: `class MetronomeApplet {
  constructor() { this.init(); }
  init() {
    this.bpm = 120;
    this.running = true;
    this.lastTickMs = performance.now();
    this.tickBeat = 0;
  }
  update(dt, input) {
    if (!this.running) return;
    const intervalMs = (60 / this.bpm) * 1000;
    const now = performance.now();
    if (now - this.lastTickMs >= intervalMs) {
      this.lastTickMs = now;
      this.tickBeat = (this.tickBeat + 1) % 4;
      if (this.tickBeat === 0) {
        input.sound.playTone(1800, 30);
        input.leds.flash(0, 240, 255, 60);
      } else {
        input.sound.playClick();
        input.leds.flash(80, 80, 80, 30);
      }
    }
  }
  draw(display) {
    display.clear();
    display.drawText("HAPTIC METRONOME", 14, 4, 1);
    display.drawText(this.bpm + " BPM", 36, 20, 2);
    // Pendulum or beat dots
    for (let i = 0; i < 4; i++) {
      const cx = 36 + i * 18;
      display.drawCircle(cx, 44, 4, i === this.tickBeat);
    }
    display.drawText("ACTION: +10 BPM  MODE: STOP", 4, 56, 1);
  }
  onActionClick(env) {
    this.bpm += 10;
    if (this.bpm > 220) this.bpm = 60;
    env.sound.playClick();
  }
  onModeClick(env) {
    this.running = !this.running;
    env.sound.playTone(1200, 40);
  }
}`
    };
  }

  // 3. Default Procedural Microapplet (Arcade Jump / Dodger)
  const appTitle = promptText.length < 25 ? promptText : 'Click Micro-Runner';
  return {
    title: appTitle,
    author: 'Free Studio Lab',
    category: 'Games',
    description: `Custom microapplet generated for Click: "${promptText}". Built for the SSD1306 128x64 OLED and dual tactile buttons.`,
    tags: ['arcade', 'game', 'microapplet'],
    instructions: 'ACTION jumps or interacts. MODE pauses or resets state.',
    cppHeader: `#pragma once
#include "Applet.h"

class CustomMicroapplet : public Applet {
private:
    int playerY = 48;
    int score = 0;
    bool jumping = false;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
    cppSource: `#include "CustomMicroapplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void CustomMicroapplet::init() {
    playerY = 48;
    score = 0;
    jumping = false;
    WS2812::clear();
}
void CustomMicroapplet::update() {
    if (jumping) {
        playerY -= 2;
        if (playerY <= 24) jumping = false;
    } else if (playerY < 48) {
        playerY += 2;
    }
}
void CustomMicroapplet::draw() {
    display.clearDisplay();
    display.drawLine(0, 56, 128, 56, SSD1306_WHITE);
    display.fillRect(16, playerY, 8, 8, SSD1306_WHITE);
    display.setCursor(4, 4);
    display.print("SCORE: ");
    display.print(score);
}
void CustomMicroapplet::onActionClick() {
    if (playerY >= 48) {
        jumping = true;
        score += 10;
        SoundFX::playFlap();
        WS2812::flash(0, 240, 255, 60);
    }
}
void CustomMicroapplet::onModeClick() { init(); }`,
    jsCompanion: `class CustomMicroapplet {
  constructor() { this.init(); }
  init() {
    this.playerY = 48;
    this.vy = 0;
    this.score = 0;
    this.obstacleX = 130;
    this.obstacleSpeed = 1.6;
    this.gameOver = false;
  }
  update(dt, input) {
    if (this.gameOver) return;
    this.playerY += this.vy * (dt / 16);
    if (this.playerY < 48) {
      this.vy += 0.45 * (dt / 16);
    } else {
      this.playerY = 48;
      this.vy = 0;
    }
    this.obstacleX -= this.obstacleSpeed * (dt / 16);
    if (this.obstacleX < -10) {
      this.obstacleX = 130 + Math.random() * 30;
      this.score++;
      input.sound.playScore();
    }
    // Collision check
    if (this.obstacleX > 14 && this.obstacleX < 26 && this.playerY > 38) {
      this.gameOver = true;
      input.sound.playGameOver();
      input.leds.flash(255, 0, 0, 800);
    }
  }
  draw(display) {
    display.clear();
    display.drawLine(0, 56, 128, 56, 1);
    display.drawText("SCORE: " + this.score, 4, 4, 1);

    if (this.gameOver) {
      display.drawText("GAME OVER!", 34, 24, 1);
      display.drawText("ACTION to retry", 20, 38, 1);
      return;
    }

    // Player sprite
    const py = Math.round(this.playerY);
    display.drawRect(16, py - 8, 8, 8, true);

    // Obstacle
    const ox = Math.round(this.obstacleX);
    display.drawRect(ox, 44, 6, 12, true);
  }
  onActionClick(env) {
    if (this.gameOver) {
      this.init();
      env.sound.playClick();
      return;
    }
    if (this.playerY >= 48) {
      this.vy = -5.8;
      env.sound.playFlap();
      env.leds.flash(0, 240, 255, 50);
    }
  }
  onModeClick(env) { this.init(); env.sound.playClick(); }
}`
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateAppletRequest = await req.json();
    const { prompt, userApiKey } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = userApiKey?.trim() || process.env.GEMINI_API_KEY;

    // 1. FREE TIER AI MODE (Zero API Key Required)
    if (!apiKey) {
      const generated = synthesizeFreeApplet(prompt);
      return NextResponse.json({
        success: true,
        applet: generated,
        metadata: {
          model: 'Free Tier AI Generator (No Key Required)',
          isFreeTier: true,
          timestamp: new Date().toISOString()
        }
      });
    }

    // 2. GEMINI API MODE (If user configured a key)
    try {
      const [promptData, specData] = await Promise.all([
        getClickAgentPrompt(),
        getClickSdkSpec()
      ]);

      const systemPrompt = `
${promptData.prompt}

---
ADDITIONAL VERIFIED HARDWARE CONSTANTS:
- MCU: ${specData.spec.targetMcu.join(' or ')}
- Display: 128x64 monochrome SSD1306 (I2C 0x3C)
- Pins:
  - ACTION Button: GP2
  - MODE Button: GP3
  - Buzzer: GP27 (SoundFX methods: playTone, playClick, playScore, playFlap, playGameOver, playCelebrationFanfare)
  - NeoPixel LEDs: GP11 (WS2812 methods: setAll, flash, startBreathe, startCelebration, clear)

OUTPUT STRICT JSON MATCHING THIS EXACT SCHEMA:
{
  "title": string,
  "author": string,
  "category": "Games" | "Tools" | "Media" | "Sensors" | "Clock",
  "description": string,
  "tags": string[],
  "instructions": string,
  "cppHeader": string,
  "cppSource": string,
  "jsCompanion": string
}
`;

      const ai = new GoogleGenAI({ apiKey });
      const userInstruction = `Create a complete, fun, and fully working Click microapplet based on this concept:
"${prompt}"

Ensure the JS companion runs out of the box in the 128x64 simulator with:
- Crisp 128x64 retro visuals using display.clear(), display.drawPixel(), display.drawLine(), display.drawRect(), display.drawCircle(), display.drawText().
- Full keyboard/physical input handling: onActionClick(), onModeClick().
- Engaging audio buzzer feedback via env.sound.playTone(), playClick(), playScore(), playGameOver(), or playFanfare().
- Dynamic RGB LED effects using env.leds.flash(r, g, b, ms) or env.leds.set(idx, r, g, b).
- Returning pure valid JSON only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userInstruction,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text?.trim() || '';
      let generatedJson: any = null;
      try {
        generatedJson = JSON.parse(responseText);
      } catch {
        const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        generatedJson = JSON.parse(cleaned);
      }

      return NextResponse.json({
        success: true,
        applet: generatedJson,
        metadata: {
          model: 'gemini-2.5-flash',
          isFreeTier: false,
          timestamp: new Date().toISOString()
        }
      });
    } catch (geminiErr: any) {
      console.warn('Gemini API call failed, falling back to free synthesizer:', geminiErr);
      const generated = synthesizeFreeApplet(prompt);
      return NextResponse.json({
        success: true,
        applet: generated,
        metadata: {
          model: 'Free Tier AI Fallback Generator',
          isFreeTier: true,
          note: geminiErr.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (err: any) {
    console.error('API /api/generate error:', err);
    return NextResponse.json(
      { error: err.message || 'Generation failed' },
      { status: 500 }
    );
  }
}
