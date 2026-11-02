import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export type AppCategory = 'Games' | 'Tools' | 'Media' | 'Sensors' | 'Clock';

export interface AppletRecord {
  id: string;
  title: string;
  slug: string;
  version: string;
  category: AppCategory;
  author: string;
  description: string;
  tags: string[];
  status: 'approved' | 'pending_review' | 'rejected';
  iconType: string; // 'gamepad' | 'clock' | 'zap' | 'music' | 'cpu' | 'terminal'
  cppHeader: string;
  cppSource: string;
  jsCompanion: string;
  instructions: string;
  likes: number;
  downloads: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dataDir = path.join(process.cwd(), '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'click_studio.sqlite');
  dbInstance = new DatabaseSync(dbPath);

  // Initialize or upgrade schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS applets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      version TEXT NOT NULL DEFAULT 'v1.0.0',
      category TEXT NOT NULL DEFAULT 'Games',
      iconType TEXT NOT NULL DEFAULT 'gamepad',
      author TEXT NOT NULL,
      description TEXT NOT NULL,
      tags TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_review',
      cppHeader TEXT NOT NULL,
      cppSource TEXT NOT NULL,
      jsCompanion TEXT NOT NULL,
      instructions TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      downloads INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      rejectionReason TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_applets_status ON applets(status);
    CREATE INDEX IF NOT EXISTS idx_applets_category ON applets(category);
    CREATE INDEX IF NOT EXISTS idx_applets_slug ON applets(slug);
  `);

  // Migrate older table schemas if columns are missing
  try {
    dbInstance.exec(`ALTER TABLE applets ADD COLUMN version TEXT DEFAULT 'v1.0.0';`);
  } catch (e) {}
  try {
    dbInstance.exec(`ALTER TABLE applets ADD COLUMN category TEXT DEFAULT 'Games';`);
  } catch (e) {}
  try {
    dbInstance.exec(`ALTER TABLE applets ADD COLUMN iconType TEXT DEFAULT 'gamepad';`);
  } catch (e) {}
  try {
    dbInstance.exec(`ALTER TABLE applets ADD COLUMN downloads INTEGER DEFAULT 0;`);
  } catch (e) {}

  seedDefaultApplets(dbInstance);

  return dbInstance;
}

function seedDefaultApplets(db: DatabaseSync) {
  const countRow = db.prepare('SELECT count(*) as count FROM applets').get() as { count: number };
  if (countRow && countRow.count > 0) return;

  const seeds: Omit<AppletRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: 'Sisyphus Eternal Push',
      slug: 'sisyphus-push',
      version: 'v1.2.0',
      category: 'Games',
      iconType: 'gamepad',
      author: 'Click Core Team',
      description: 'The iconic Click arcade game. Push the boulder up the mountain; fail to keep pace and watch it roll back down!',
      tags: ['game', 'arcade', 'retro', 'clicker'],
      status: 'approved',
      featured: true,
      likes: 142,
      downloads: 890,
      instructions: 'Rapidly tap ACTION to push boulder up the slope. Hold MODE to reset.',
      cppHeader: `#pragma once
#include "Applet.h"

class SisyphusApplet : public Applet {
private:
    int progress = 0;
    int boulderX = 14;
    int boulderY = 52;
    bool rollingDown = false;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "SisyphusApplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void SisyphusApplet::init() {
    progress = 0;
    rollingDown = false;
    WS2812::clear();
}

void SisyphusApplet::update() {
    if (rollingDown) {
        progress -= 2;
        if (progress <= 0) {
            progress = 0;
            rollingDown = false;
            SoundFX::playSisyphusBottomChime();
        }
    }
}

void SisyphusApplet::draw() {
    display.clearDisplay();
    display.drawLine(10, 56, 118, 20, SSD1306_WHITE);
    int bx = 10 + (progress * 108) / 100;
    int by = 56 - (progress * 36) / 100;
    display.drawCircle(bx, by - 6, 6, SSD1306_WHITE);
    display.setCursor(4, 4);
    display.setTextSize(1);
    display.print("ALTITUDE: ");
    display.print(progress);
    display.print("m");
}

void SisyphusApplet::onActionClick() {
    progress += 4;
    SoundFX::playClick();
    WS2812::flash(255, 80, 0, 50);
    if (progress >= 100) {
        progress = 100;
        rollingDown = true;
        SoundFX::playCelebrationFanfare();
        WS2812::startCelebration(1500);
    }
}

void SisyphusApplet::onModeClick() {
    SoundFX::playTone(1800, 40);
}`,
      jsCompanion: `class SisyphusApplet {
  constructor() {
    this.init();
  }
  init() {
    this.progress = 0;
    this.rolling = false;
    this.rollSpeed = 0.6;
  }
  update(dt, input) {
    if (this.rolling) {
      this.progress -= this.rollSpeed * (dt / 16);
      if (this.progress <= 0) {
        this.progress = 0;
        this.rolling = false;
        input.sound.playTone(1760, 80);
        input.leds.set(0, 0, 200, 255);
        input.leds.set(1, 0, 200, 255);
      }
    } else {
      if (this.progress > 0) {
        this.progress -= 0.08 * (dt / 16);
        if (this.progress < 0) this.progress = 0;
      }
    }
  }
  draw(display) {
    display.clear();
    display.drawLine(10, 56, 118, 18, 1);
    const t = Math.max(0, Math.min(100, this.progress)) / 100;
    const bx = Math.round(10 + t * 108);
    const by = Math.round(56 - t * 38);
    display.drawLine(bx - 10, by + 2, bx - 6, by - 4, 1);
    display.drawCircle(bx - 6, by - 8, 2, true);
    display.drawLine(bx - 6, by - 4, bx - 2, by - 2, 1);
    display.drawCircle(bx, by - 6, 7, false);
    display.drawPixel(bx - 2, by - 6, 1);
    display.drawPixel(bx + 2, by - 4, 1);
    display.drawText("SISYPHUS PUSH", 4, 2, 1);
    display.drawText("ALT: " + Math.round(this.progress) + "%", 76, 2, 1);
    display.drawRect(10, 59, 108, 4, false);
    display.drawRect(10, 59, Math.round(108 * t), 4, true);
  }
  onActionClick(env) {
    if (this.rolling) return;
    this.progress += 4.5;
    env.sound.playClick();
    env.leds.flash(255, 100, 0, 40);
    if (this.progress >= 100) {
      this.progress = 100;
      this.rolling = true;
      env.sound.playFanfare();
      env.leds.flash(0, 255, 200, 600);
    }
  }
  onModeClick(env) {
    this.progress = 0;
    this.rolling = false;
    env.sound.playTone(800, 50);
  }
}`
    },
    {
      title: 'Just Ten Stopwatch',
      slug: 'just-ten',
      version: 'v1.0.4',
      category: 'Games',
      iconType: 'clock',
      author: 'Prajjwal',
      description: 'Precision timing challenge. Release the button at EXACTLY 10.000 seconds after the counter goes blind!',
      tags: ['game', 'timing', 'reflex', 'challenge'],
      status: 'approved',
      featured: true,
      likes: 98,
      downloads: 640,
      instructions: 'Tap ACTION to start counting. Blind countdown kicks in! Tap ACTION again when you feel 10.00s has elapsed.',
      cppHeader: `#pragma once
#include "Applet.h"

class JustTenApplet : public Applet {
private:
    uint32_t startMs = 0;
    bool running = false;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "JustTenApplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void JustTenApplet::init() {
    running = false;
}
void JustTenApplet::update() {}
void JustTenApplet::draw() {
    display.clearDisplay();
    display.setCursor(4, 4);
    display.print("JUST TEN 10.00s");
}
void JustTenApplet::onActionClick() {
    SoundFX::playClick();
}
void JustTenApplet::onModeClick() {
    init();
}`,
      jsCompanion: `class JustTenApplet {
  constructor() {
    this.init();
  }
  init() {
    this.state = 'IDLE';
    this.startMs = 0;
    this.elapsedSec = 0;
  }
  update(dt, input) {
    if (this.state === 'RUNNING') {
      this.elapsedSec = (performance.now() - this.startMs) / 1000;
      if (this.elapsedSec < 3.0) {
        const pulse = Math.floor(this.elapsedSec);
        if (Math.abs(this.elapsedSec - pulse) < 0.05) {
          input.leds.set(0, 0, 100, 255);
          input.leds.set(1, 0, 100, 255);
        }
      } else {
        input.leds.clear();
      }
    }
  }
  draw(display) {
    display.clear();
    display.drawText("JUST TEN CHALLENGE", 8, 4, 1);
    if (this.state === 'IDLE') {
      display.drawText("Press ACTION to start", 8, 24, 1);
      display.drawText("Stop at exactly 10.00s", 6, 38, 1);
      display.drawRect(8, 52, 112, 1, true);
    } else if (this.state === 'RUNNING') {
      if (this.elapsedSec < 3.0) {
        display.drawText(this.elapsedSec.toFixed(2) + "s", 36, 24, 2);
        display.drawText("Ticking...", 40, 48, 1);
      } else {
        display.drawText("BLIND COUNT", 24, 24, 1);
        display.drawText("???", 52, 38, 2);
      }
    } else if (this.state === 'RESULT') {
      display.drawText(this.elapsedSec.toFixed(3) + "s", 28, 20, 2);
      const diff = (this.elapsedSec - 10.0).toFixed(3);
      const sign = diff >= 0 ? "+" : "";
      display.drawText("Dev: " + sign + diff + "s", 32, 42, 1);
      if (Math.abs(this.elapsedSec - 10.0) < 0.2) {
        display.drawText("MASTER TIMER!", 24, 54, 1);
      } else {
        display.drawText("Tap MODE to retry", 16, 54, 1);
      }
    }
  }
  onActionClick(env) {
    if (this.state === 'IDLE') {
      this.state = 'RUNNING';
      this.startMs = performance.now();
      env.sound.playTone(880, 50);
      env.leds.flash(0, 255, 100, 100);
    } else if (this.state === 'RUNNING') {
      this.state = 'RESULT';
      this.elapsedSec = (performance.now() - this.startMs) / 1000;
      const deviation = Math.abs(this.elapsedSec - 10.0);
      if (deviation <= 0.15) {
        env.sound.playFanfare();
        env.leds.flash(0, 255, 180, 1000);
      } else {
        env.sound.playTone(1318, 80);
        env.leds.flash(255, 60, 0, 200);
      }
    }
  }
  onModeClick(env) {
    this.init();
    env.sound.playClick();
  }
}`
    },
    {
      title: 'Pomodoro Pulse Focus',
      slug: 'pomodoro-pulse',
      version: 'v1.3.0',
      category: 'Clock',
      iconType: 'clock',
      author: 'Studio Labs',
      description: 'Haptic focus companion. Soft ambient LED breathing with buzzer work/break intervals for your desk.',
      tags: ['productivity', 'utility', 'focus', 'timer'],
      status: 'approved',
      featured: true,
      likes: 74,
      downloads: 512,
      instructions: 'ACTION toggles start/pause. MODE switches between 25m Focus and 5m Break.',
      cppHeader: `#pragma once
#include "Applet.h"

class PomodoroApplet : public Applet {
private:
    bool running = false;
    bool isBreak = false;
    uint32_t remainingSec = 1500;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "PomodoroApplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void PomodoroApplet::init() {
    running = false;
    isBreak = false;
    remainingSec = 1500;
    WS2812::clear();
}
void PomodoroApplet::update() {}
void PomodoroApplet::draw() {
    display.clearDisplay();
    display.setCursor(4, 4);
    display.print("[POMODORO]");
}
void PomodoroApplet::onActionClick() {
    running = !running;
}
void PomodoroApplet::onModeClick() {
    isBreak = !isBreak;
}`,
      jsCompanion: `class PomodoroApplet {
  constructor() {
    this.init();
  }
  init() {
    this.running = false;
    this.isBreak = false;
    this.remainingSec = 25 * 60;
    this.lastSecMs = performance.now();
    this.totalSec = 25 * 60;
  }
  update(dt, input) {
    if (this.running) {
      const now = performance.now();
      if (now - this.lastSecMs >= 1000) {
        this.lastSecMs = now;
        if (this.remainingSec > 0) {
          this.remainingSec--;
        } else {
          this.running = false;
          input.sound.playFanfare();
          input.leds.flash(0, 255, 120, 1500);
        }
      }
      const t = (now % 3000) / 3000 * Math.PI * 2;
      const b = Math.floor(60 + 50 * Math.sin(t));
      if (this.isBreak) {
        input.leds.set(0, 0, b * 2, 80);
        input.leds.set(1, 0, b * 2, 80);
      } else {
        input.leds.set(0, 0, 120, b * 2);
        input.leds.set(1, 0, 120, b * 2);
      }
    }
  }
  draw(display) {
    display.clear();
    const modeStr = this.isBreak ? "BREAK TIME" : "DEEP FOCUS";
    display.drawText(modeStr, 30, 4, 1);
    const m = Math.floor(this.remainingSec / 60);
    const s = this.remainingSec % 60;
    const timeStr = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    display.drawText(timeStr, 28, 20, 2);
    const status = this.running ? "RUNNING..." : "PAUSED (ACTION)";
    display.drawText(status, 24, 42, 1);
    const progress = 1 - (this.remainingSec / this.totalSec);
    display.drawRect(12, 54, 104, 5, false);
    display.drawRect(12, 54, Math.round(104 * progress), 5, true);
  }
  onActionClick(env) {
    this.running = !this.running;
    this.lastSecMs = performance.now();
    env.sound.playClick();
    if (!this.running) env.leds.clear();
  }
  onModeClick(env) {
    this.isBreak = !this.isBreak;
    this.totalSec = this.isBreak ? 5 * 60 : 25 * 60;
    this.remainingSec = this.totalSec;
    this.running = false;
    env.sound.playTone(1600, 60);
    env.leds.clear();
  }
}`
    },
    {
      title: 'Space Dodger 128',
      slug: 'space-dodger',
      version: 'v1.0.1',
      category: 'Games',
      iconType: 'gamepad',
      author: 'AstroDev',
      description: 'Navigate your pixel ship through incoming cosmic debris fields on the SSD1306 128x64 display.',
      tags: ['game', 'arcade', 'space', 'retro'],
      status: 'approved',
      featured: false,
      likes: 62,
      downloads: 410,
      instructions: 'ACTION moves ship UP/DOWN lanes. Avoid asteroids and survive as long as possible!',
      cppHeader: `#pragma once
#include "Applet.h"

class SpaceDodgerApplet : public Applet {
private:
    int shipY = 32;
    int score = 0;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "SpaceDodgerApplet.h"
#include "Display.h"
#include "SoundFX.h"

void SpaceDodgerApplet::init() { shipY = 32; score = 0; }
void SpaceDodgerApplet::update() {}
void SpaceDodgerApplet::draw() {
    display.clearDisplay();
    display.drawPixel(10, shipY, SSD1306_WHITE);
}
void SpaceDodgerApplet::onActionClick() { shipY = (shipY == 20) ? 44 : 20; SoundFX::playClick(); }
void SpaceDodgerApplet::onModeClick() { init(); }`,
      jsCompanion: `class SpaceDodgerApplet {
  constructor() {
    this.init();
  }
  init() {
    this.shipY = 32;
    this.targetLane = 1; // 0, 1, 2
    this.lanes = [16, 32, 48];
    this.asteroids = [
      { x: 130, lane: 0, speed: 1.2 },
      { x: 180, lane: 1, speed: 1.5 },
      { x: 230, lane: 2, speed: 1.1 }
    ];
    this.score = 0;
    this.gameOver = false;
  }
  update(dt, input) {
    if (this.gameOver) return;
    this.shipY += (this.lanes[this.targetLane] - this.shipY) * 0.2;
    this.score += 0.05;
    for (const ast of this.asteroids) {
      ast.x -= ast.speed * (dt / 16);
      if (ast.x < -10) {
        ast.x = 130 + Math.random() * 40;
        ast.lane = Math.floor(Math.random() * 3);
        ast.speed = 1.0 + Math.random() * 1.5;
      }
      // Collision check
      if (ast.x > 8 && ast.x < 24 && Math.abs(this.lanes[ast.lane] - this.shipY) < 8) {
        this.gameOver = true;
        input.sound.playGameOver();
        input.leds.flash(255, 0, 0, 800);
      }
    }
  }
  draw(display) {
    display.clear();
    // Starfield lines
    display.drawLine(0, 8, 128, 8, 1);
    display.drawLine(0, 58, 128, 58, 1);
    display.drawText("SCORE: " + Math.floor(this.score), 4, 1, 1);

    if (this.gameOver) {
      display.drawText("HULL BREACH!", 28, 24, 1);
      display.drawText("ACTION: RETRY", 24, 40, 1);
      return;
    }

    // Ship
    const sy = Math.round(this.shipY);
    display.drawLine(8, sy - 3, 16, sy, 1);
    display.drawLine(8, sy + 3, 16, sy, 1);
    display.drawLine(8, sy - 3, 8, sy + 3, 1);

    // Asteroids
    for (const ast of this.asteroids) {
      const ax = Math.round(ast.x);
      const ay = this.lanes[ast.lane];
      display.drawCircle(ax, ay, 4, false);
      display.drawPixel(ax, ay, 1);
    }
  }
  onActionClick(env) {
    if (this.gameOver) {
      this.init();
      env.sound.playClick();
      return;
    }
    this.targetLane = (this.targetLane + 1) % 3;
    env.sound.playFlap();
    env.leds.flash(0, 200, 255, 60);
  }
  onModeClick(env) {
    this.init();
    env.sound.playClick();
  }
}`
    },
    {
      title: 'Cyber Synth Soundboard',
      slug: 'cyber-synth',
      version: 'v1.0.0',
      category: 'Media',
      iconType: 'music',
      author: 'PiezoBeats',
      description: 'Chiptune synthesizer driving Click’s GP27 piezo buzzer with square-wave scales and harmonic intervals.',
      tags: ['audio', 'music', 'synth', 'buzzer'],
      status: 'approved',
      featured: false,
      likes: 51,
      downloads: 320,
      instructions: 'ACTION triggers pitch sequence. MODE cycles chiptune scales (Minor, Pentatonic, Arp).',
      cppHeader: `#pragma once
#include "Applet.h"

class CyberSynthApplet : public Applet {
public:
    void init() override {}
    void update() override {}
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "CyberSynthApplet.h"
#include "Display.h"
#include "SoundFX.h"

void CyberSynthApplet::draw() {
    display.clearDisplay();
    display.print("CYBER SYNTH GP27");
}
void CyberSynthApplet::onActionClick() { SoundFX::playScore(); }
void CyberSynthApplet::onModeClick() { SoundFX::playCelebrationFanfare(); }`,
      jsCompanion: `class CyberSynthApplet {
  constructor() {
    this.init();
  }
  init() {
    this.scaleIdx = 0;
    this.scales = [
      { name: "PENTATONIC", notes: [440, 523, 587, 659, 784, 880] },
      { name: "CYBER MINOR", notes: [330, 392, 440, 494, 523, 659] },
      { name: "RETRO ARP", notes: [262, 330, 392, 523, 659, 784] }
    ];
    this.noteIdx = 0;
    this.visualBars = [10, 25, 40, 20, 35, 15, 30, 45];
  }
  update(dt, input) {
    for (let i = 0; i < this.visualBars.length; i++) {
      if (this.visualBars[i] > 4) this.visualBars[i] -= 0.6;
    }
  }
  draw(display) {
    display.clear();
    display.drawText("PIEZO CHIPTUNE SYNTH", 6, 4, 1);
    display.drawText("SCALE: " + this.scales[this.scaleIdx].name, 6, 18, 1);

    // Visualizer Bars
    for (let i = 0; i < 8; i++) {
      const h = Math.round(this.visualBars[i]);
      const x = 12 + i * 13;
      display.drawRect(x, 56 - h, 8, h, true);
    }
    display.drawText("ACTION: PLAY  MODE: SCALE", 2, 58, 1);
  }
  onActionClick(env) {
    const curScale = this.scales[this.scaleIdx];
    const freq = curScale.notes[this.noteIdx];
    this.noteIdx = (this.noteIdx + 1) % curScale.notes.length;
    env.sound.playTone(freq, 75);
    const barIdx = this.noteIdx % 8;
    this.visualBars[barIdx] = 36;
    env.leds.flash(0, 255, 200, 70);
  }
  onModeClick(env) {
    this.scaleIdx = (this.scaleIdx + 1) % this.scales.length;
    this.noteIdx = 0;
    env.sound.playTone(1046, 40);
    env.leds.flash(255, 120, 0, 100);
  }
}`
    },
    {
      title: 'I2C Bus & Pin Inspector',
      slug: 'i2c-inspector',
      version: 'v1.0.0',
      category: 'Sensors',
      iconType: 'cpu',
      author: 'FirmwareLab',
      description: 'Hardware probe utility scanning Wire1 I2C addresses and monitoring RP2354A GPIO levels in real-time.',
      tags: ['gpio', 'hardware', 'diagnostics', 'i2c'],
      status: 'approved',
      featured: false,
      likes: 47,
      downloads: 290,
      instructions: 'ACTION triggers active I2C bus scan (0x08-0x77). MODE tests GP11 RGB LED data line.',
      cppHeader: `#pragma once
#include "Applet.h"

class I2CInspectorApplet : public Applet {
public:
    void init() override {}
    void update() override {}
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "I2CInspectorApplet.h"
#include "Display.h"

void I2CInspectorApplet::draw() {
    display.clearDisplay();
    display.print("I2C ADDR: 0x3C OK");
}
void I2CInspectorApplet::onActionClick() {}
void I2CInspectorApplet::onModeClick() {}`,
      jsCompanion: `class I2CInspectorApplet {
  constructor() {
    this.init();
  }
  init() {
    this.scanned = false;
    this.devices = ["0x3C (SSD1306 OLED)", "0x68 (RTC Clock)"];
  }
  update(dt, input) {}
  draw(display) {
    display.clear();
    display.drawText("I2C BUS & GPIO PROBE", 6, 4, 1);
    display.drawText("SDA: GP6  SCL: GP7", 6, 16, 1);
    display.drawRect(4, 28, 120, 26, false);
    display.drawText("0x3C : SSD1306 OLED", 8, 32, 1);
    display.drawText("GP11 : WS2812 PIO OK", 8, 42, 1);
    display.drawText("VBUS: 5.04V  3V3: 3.31V", 6, 56, 1);
  }
  onActionClick(env) {
    env.sound.playClick();
    env.leds.flash(0, 255, 0, 100);
  }
  onModeClick(env) {
    env.sound.playTone(1200, 30);
    env.leds.flash(255, 255, 255, 150);
  }
}`
    },
    {
      title: 'Floppy Bird Tactile',
      slug: 'floppy-bird',
      version: 'v1.1.0',
      category: 'Games',
      iconType: 'gamepad',
      author: 'Product71',
      description: 'The arcade classic on your Click. One button, one bird, infinite obstacles. Pure tactile fidget, zero distractions, zero algorithms.',
      tags: ['game', 'arcade', 'fidget', 'retro'],
      status: 'approved',
      featured: true,
      likes: 189,
      downloads: 1240,
      instructions: 'ACTION flaps wings to gain altitude. Navigate between pipe gaps. MODE resets game.',
      cppHeader: `#pragma once
#include "Applet.h"

class FloppyBirdApplet : public Applet {
private:
    float birdY = 32.0f;
    float velocity = 0.0f;
    int pipeX = 128;
    int pipeGapY = 24;
    int score = 0;
    bool gameOver = false;
public:
    void init() override;
    void update() override;
    void draw() override;
    void onActionClick() override;
    void onModeClick() override;
};`,
      cppSource: `#include "FloppyBirdApplet.h"
#include "Display.h"
#include "SoundFX.h"
#include "WS2812.h"

void FloppyBirdApplet::init() {
    birdY = 32.0f;
    velocity = 0.0f;
    pipeX = 128;
    pipeGapY = 24;
    score = 0;
    gameOver = false;
    WS2812::clear();
}

void FloppyBirdApplet::update() {
    if (gameOver) return;
    velocity += 0.18f;
    birdY += velocity;
    pipeX -= 2;
    if (pipeX < -14) {
        pipeX = 128;
        pipeGapY = 16 + (rand() % 28);
        score++;
        SoundFX::playScoreBeep();
        WS2812::flash(0, 255, 100, 40);
    }
    if (birdY > 58 || birdY < 2) {
        gameOver = true;
        SoundFX::playCrash();
        WS2812::flash(255, 0, 0, 400);
    }
    if (pipeX >= 10 && pipeX <= 26) {
        if (birdY < pipeGapY || birdY > pipeGapY + 22) {
            gameOver = true;
            SoundFX::playCrash();
            WS2812::flash(255, 0, 0, 400);
        }
    }
}

void FloppyBirdApplet::draw() {
    display.clearDisplay();
    display.drawCircle(18, (int)birdY, 3, SSD1306_WHITE);
    display.fillRect(pipeX, 0, 10, pipeGapY, SSD1306_WHITE);
    display.fillRect(pipeX, pipeGapY + 22, 10, 64 - (pipeGapY + 22), SSD1306_WHITE);
    display.setCursor(4, 2);
    display.print("SCORE: ");
    display.print(score);
}

void FloppyBirdApplet::onActionClick() {
    if (gameOver) { init(); return; }
    velocity = -2.6f;
    SoundFX::playFlap();
}

void FloppyBirdApplet::onModeClick() {
    init();
}`,
      jsCompanion: `class FloppyBirdApplet {
  constructor() {
    this.init();
  }
  init() {
    this.birdY = 32;
    this.velocity = 0;
    this.gravity = 0.16;
    this.flapImpulse = -2.5;
    this.pipeX = 130;
    this.pipeGapY = 22;
    this.gapHeight = 24;
    this.pipeWidth = 12;
    this.score = 0;
    this.gameOver = false;
  }
  update(dt, input) {
    if (this.gameOver) return;
    const factor = Math.min(2.0, dt / 16);
    this.velocity += this.gravity * factor;
    this.birdY += this.velocity * factor;

    this.pipeX -= 1.3 * factor;
    if (this.pipeX < -this.pipeWidth) {
      this.pipeX = 130;
      this.pipeGapY = 12 + Math.floor(Math.random() * 26);
      this.score++;
      input.sound.playTone(1046, 50);
      input.leds.flash(0, 255, 120, 80);
    }

    if (this.birdY > 59 || this.birdY < 2) {
      this.gameOver = true;
      input.sound.playGameOver();
      input.leds.flash(255, 0, 0, 600);
    }

    const birdLeft = 17;
    const birdRight = 23;
    const pipeRight = this.pipeX + this.pipeWidth;

    if (birdRight >= this.pipeX && birdLeft <= pipeRight) {
      if (this.birdY - 3 < this.pipeGapY || this.birdY + 3 > this.pipeGapY + this.gapHeight) {
        this.gameOver = true;
        input.sound.playGameOver();
        input.leds.flash(255, 0, 0, 600);
      }
    }
  }
  draw(display) {
    display.clear();
    display.drawLine(0, 0, 128, 0, 1);
    display.drawLine(0, 63, 128, 63, 1);

    const px = Math.round(this.pipeX);
    if (px < 128 && px + this.pipeWidth > 0) {
      display.drawRect(px, 1, this.pipeWidth, this.pipeGapY, true);
      display.drawRect(px - 1, this.pipeGapY - 3, this.pipeWidth + 2, 4, true);

      const bTop = this.pipeGapY + this.gapHeight;
      const bH = 63 - bTop;
      display.drawRect(px, bTop, this.pipeWidth, bH, true);
      display.drawRect(px - 1, bTop, this.pipeWidth + 2, 4, true);
    }

    const by = Math.round(this.birdY);
    display.drawCircle(20, by, 3, true);
    display.drawPixel(22, by - 1, 0);
    display.drawPixel(24, by, 1);
    display.drawPixel(17, by, 0);

    display.drawText("SCORE " + this.score, 4, 3, 1);

    if (this.gameOver) {
      display.drawRect(18, 16, 92, 32, false);
      display.drawText("GAME OVER", 36, 22, 1);
      display.drawText("SCORE: " + this.score, 44, 32, 1);
      display.drawText("TAP ACTION TO PLAY", 22, 41, 1);
    }
  }
  onActionClick(env) {
    if (this.gameOver) {
      this.init();
      env.sound.playClick();
      return;
    }
    this.velocity = this.flapImpulse;
    env.sound.playFlap();
    env.leds.flash(0, 200, 255, 40);
  }
  onModeClick(env) {
    this.init();
    env.sound.playClick();
  }
}`
    }
  ];

  const insert = db.prepare(`
    INSERT INTO applets (
      id, title, slug, version, category, iconType, author, description, tags, status,
      cppHeader, cppSource, jsCompanion, instructions,
      likes, downloads, featured, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const now = new Date().toISOString();
  for (const s of seeds) {
    const id = 'seed_' + s.slug;
    insert.run(
      id,
      s.title,
      s.slug,
      s.version,
      s.category,
      s.iconType,
      s.author,
      s.description,
      JSON.stringify(s.tags),
      s.status,
      s.cppHeader,
      s.cppSource,
      s.jsCompanion,
      s.instructions,
      s.likes,
      s.downloads,
      s.featured ? 1 : 0,
      now,
      now
    );
  }
}

function parseAppletRow(row: any): AppletRecord {
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    featured: Boolean(row.featured)
  };
}

export function getApprovedApplets(options?: {
  category?: string;
  tag?: string;
  search?: string;
  sort?: 'popular' | 'newest' | 'alpha';
}): AppletRecord[] {
  const db = getDb();
  let query = "SELECT * FROM applets WHERE status = 'approved'";
  const params: any[] = [];

  if (options?.category && options.category !== 'All') {
    query += " AND category = ?";
    params.push(options.category);
  }

  if (options?.search) {
    query += " AND (title LIKE ? OR description LIKE ? OR author LIKE ? OR tags LIKE ?)";
    const term = `%${options.search}%`;
    params.push(term, term, term, term);
  }

  if (options?.sort === 'alpha') {
    query += " ORDER BY title ASC";
  } else if (options?.sort === 'newest') {
    query += " ORDER BY createdAt DESC";
  } else {
    // Default: Popular (featured first, then likes/downloads)
    query += " ORDER BY featured DESC, downloads DESC, likes DESC";
  }

  const rows = db.prepare(query).all(...params) as any[];
  const parsed = rows.map(parseAppletRow);

  if (options?.tag) {
    return parsed.filter(app => app.tags.includes(options.tag!));
  }

  return parsed;
}

export function getAppletBySlug(slug: string): AppletRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM applets WHERE slug = ?').get(slug);
  return row ? parseAppletRow(row) : null;
}

export function getAppletById(id: string): AppletRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM applets WHERE id = ?').get(id);
  return row ? parseAppletRow(row) : null;
}

export function getAllAppletsForAdmin(secretKey: string): AppletRecord[] {
  const expectedSecret = process.env.ADMIN_SECRET_KEY || 'click_admin_secret_2026';
  if (secretKey !== expectedSecret) {
    throw new Error('Unauthorized');
  }

  const db = getDb();
  const rows = db.prepare('SELECT * FROM applets ORDER BY createdAt DESC').all() as any[];
  return rows.map(parseAppletRow);
}

export function createAppletSubmission(data: {
  title: string;
  author: string;
  category?: AppCategory;
  description: string;
  tags: string[];
  cppHeader: string;
  cppSource: string;
  jsCompanion: string;
  instructions: string;
}): AppletRecord {
  const db = getDb();
  const id = 'app_' + Math.random().toString(36).substring(2, 10);
  const baseSlug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'applet';
  const slug = `${baseSlug}-${id.slice(-4)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO applets (
      id, title, slug, version, category, iconType, author, description, tags, status,
      cppHeader, cppSource, jsCompanion, instructions,
      likes, downloads, featured, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, 'v1.0.0', ?, 'gamepad', ?, ?, ?, 'pending_review',
      ?, ?, ?, ?,
      0, 0, 0, ?, ?
    )
  `);

  stmt.run(
    id,
    data.title,
    slug,
    data.category || 'Games',
    data.author,
    data.description,
    JSON.stringify(data.tags),
    data.cppHeader,
    data.cppSource,
    data.jsCompanion,
    data.instructions,
    now,
    now
  );

  return getAppletById(id)!;
}

export function updateAppletStatus(
  id: string,
  status: 'approved' | 'rejected',
  secretKey: string,
  rejectionReason?: string
): AppletRecord {
  const expectedSecret = process.env.ADMIN_SECRET_KEY || 'click_admin_secret_2026';
  if (secretKey !== expectedSecret) {
    throw new Error('Unauthorized');
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE applets 
    SET status = ?, rejectionReason = ?, updatedAt = ?
    WHERE id = ?
  `).run(status, rejectionReason || null, now, id);

  return getAppletById(id)!;
}

export function toggleAppletLike(id: string): number {
  const db = getDb();
  db.prepare(`UPDATE applets SET likes = likes + 1 WHERE id = ?`).run(id);
  const updated = db.prepare('SELECT likes FROM applets WHERE id = ?').get(id) as { likes: number };
  return updated ? updated.likes : 0;
}

export function incrementAppletDownload(id: string): number {
  const db = getDb();
  db.prepare(`UPDATE applets SET downloads = downloads + 1 WHERE id = ?`).run(id);
  const updated = db.prepare('SELECT downloads FROM applets WHERE id = ?').get(id) as { downloads: number };
  return updated ? updated.downloads : 0;
}
