/**
 * Click Handheld 128x64 OLED Hardware Simulator Engine
 * 
 * Accurately emulates:
 * - SSD1306 128x64 monochrome frame buffer
 * - GP27 Piezo Buzzer via Web Audio API (Square wave oscillator with envelope)
 * - GP11 2x WS2812 RGB LEDs with real-time diffusion glow
 * - Tactile ACTION (GP2) and MODE (GP3) button states
 */

// 5x7 Minimalist ASCII Bitmap Font for retro OLED rendering
export const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5f, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7f, 0x14, 0x7f, 0x14],
  '$': [0x24, 0x2a, 0x7f, 0x2a, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  "'": [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1c, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1c, 0x00],
  '*': [0x14, 0x08, 0x3e, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3e],
  'A': [0x7e, 0x11, 0x11, 0x11, 0x7e],
  'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
  'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
  'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
  'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
  'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
  'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
  'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
  'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
  'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
  'V': [0x1f, 0x20, 0x40, 0x20, 0x1f],
  'W': [0x3f, 0x40, 0x38, 0x40, 0x3f],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '[': [0x00, 0x7f, 0x41, 0x41, 0x00],
  '\\': [0x02, 0x04, 0x08, 0x10, 0x20],
  ']': [0x00, 0x41, 0x41, 0x7f, 0x00],
  '^': [0x04, 0x02, 0x01, 0x02, 0x04],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  '`': [0x00, 0x01, 0x02, 0x04, 0x00],
  'a': [0x20, 0x54, 0x54, 0x54, 0x78],
  'b': [0x7f, 0x48, 0x44, 0x44, 0x38],
  'c': [0x38, 0x44, 0x44, 0x44, 0x20],
  'd': [0x38, 0x44, 0x44, 0x48, 0x7f],
  'e': [0x38, 0x54, 0x54, 0x54, 0x18],
  'f': [0x08, 0x7e, 0x09, 0x01, 0x02],
  'g': [0x0c, 0x52, 0x52, 0x52, 0x3e],
  'h': [0x7f, 0x08, 0x04, 0x04, 0x78],
  'i': [0x00, 0x44, 0x7d, 0x40, 0x00],
  'j': [0x20, 0x40, 0x44, 0x3d, 0x00],
  'k': [0x7f, 0x10, 0x28, 0x44, 0x00],
  'l': [0x00, 0x41, 0x7f, 0x40, 0x00],
  'm': [0x7c, 0x04, 0x18, 0x04, 0x78],
  'n': [0x7c, 0x08, 0x04, 0x04, 0x78],
  'o': [0x38, 0x44, 0x44, 0x44, 0x38],
  'p': [0x7c, 0x14, 0x14, 0x14, 0x08],
  'q': [0x08, 0x14, 0x14, 0x18, 0x7c],
  'r': [0x7c, 0x08, 0x04, 0x04, 0x08],
  's': [0x48, 0x54, 0x54, 0x54, 0x20],
  't': [0x04, 0x3f, 0x44, 0x40, 0x20],
  'u': [0x3c, 0x40, 0x40, 0x20, 0x7c],
  'v': [0x1c, 0x20, 0x40, 0x20, 0x1c],
  'w': [0x3c, 0x40, 0x30, 0x40, 0x3c],
  'x': [0x44, 0x28, 0x10, 0x28, 0x44],
  'y': [0x0c, 0x50, 0x50, 0x50, 0x3c],
  'z': [0x44, 0x64, 0x54, 0x4c, 0x44],
  '{': [0x00, 0x08, 0x36, 0x41, 0x00],
  '|': [0x00, 0x00, 0x7f, 0x00, 0x00],
  '}': [0x00, 0x41, 0x36, 0x08, 0x00],
  '~': [0x10, 0x08, 0x08, 0x10, 0x08]
};

export class AudioBuzzerSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq: number, durationMs: number) {
    if (!this.enabled || freq <= 0) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square'; // Authentic piezo buzzer sound
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Low volume pleasant envelope
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch (e) {
      // Audio not permitted or interrupted
    }
  }

  playClick() {
    this.playTone(2800, 12);
  }

  playFlap() {
    this.playTone(900, 15);
    setTimeout(() => this.playTone(1400, 20), 20);
  }

  playScore() {
    this.playTone(1046, 40);
    setTimeout(() => this.playTone(1318, 65), 45);
  }

  playGameOver() {
    this.playTone(320, 60);
    setTimeout(() => this.playTone(220, 80), 65);
    setTimeout(() => this.playTone(130, 160), 150);
  }

  playFanfare() {
    const notes = [
      { f: 523, d: 80, delay: 0 },
      { f: 659, d: 80, delay: 90 },
      { f: 784, d: 80, delay: 180 },
      { f: 1046, d: 240, delay: 280 }
    ];
    notes.forEach(n => {
      setTimeout(() => this.playTone(n.f, n.d), n.delay);
    });
  }
}

export interface LedState {
  r: number;
  g: number;
  b: number;
}

export class DisplayFramebuffer {
  public width = 128;
  public height = 64;
  public buffer: Uint8Array; // 0 or 1 for each pixel
  public leds: [LedState, LedState] = [
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 0 }
  ];
  public sound: AudioBuzzerSynthesizer;
  private flashTimeout: any = null;

  constructor(sound: AudioBuzzerSynthesizer) {
    this.buffer = new Uint8Array(128 * 64);
    this.sound = sound;
  }

  clear() {
    this.buffer.fill(0);
  }

  drawPixel(x: number, y: number, color: number = 1) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= 128 || iy < 0 || iy >= 64) return;
    this.buffer[iy * 128 + ix] = color ? 1 : 0;
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, color: number = 1) {
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const targetX = Math.floor(x1);
    const targetY = Math.floor(y1);

    const dx = Math.abs(targetX - x);
    const dy = Math.abs(targetY - y);
    const sx = x < targetX ? 1 : -1;
    const sy = y < targetY ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.drawPixel(x, y, color);
      if (x === targetX && y === targetY) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  drawRect(x: number, y: number, w: number, h: number, fill: boolean = false, color: number = 1) {
    const startX = Math.floor(x);
    const startY = Math.floor(y);
    const width = Math.floor(w);
    const height = Math.floor(h);

    if (fill) {
      for (let py = startY; py < startY + height; py++) {
        for (let px = startX; px < startX + width; px++) {
          this.drawPixel(px, py, color);
        }
      }
    } else {
      this.drawLine(startX, startY, startX + width - 1, startY, color);
      this.drawLine(startX, startY + height - 1, startX + width - 1, startY + height - 1, color);
      this.drawLine(startX, startY, startX, startY + height - 1, color);
      this.drawLine(startX + width - 1, startY, startX + width - 1, startY + height - 1, color);
    }
  }

  drawCircle(cx: number, cy: number, r: number, fill: boolean = false, color: number = 1) {
    const centerX = Math.floor(cx);
    const centerY = Math.floor(cy);
    const radius = Math.floor(r);

    if (fill) {
      for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
          if (x * x + y * y <= radius * radius) {
            this.drawPixel(centerX + x, centerY + y, color);
          }
        }
      }
    } else {
      let x = radius;
      let y = 0;
      let err = 0;

      while (x >= y) {
        this.drawPixel(centerX + x, centerY + y, color);
        this.drawPixel(centerX + y, centerY + x, color);
        this.drawPixel(centerX - y, centerY + x, color);
        this.drawPixel(centerX - x, centerY + y, color);
        this.drawPixel(centerX - x, centerY - y, color);
        this.drawPixel(centerX - y, centerY - x, color);
        this.drawPixel(centerX + y, centerY - x, color);
        this.drawPixel(centerX + x, centerY - y, color);

        if (err <= 0) {
          y += 1;
          err += 2 * y + 1;
        }
        if (err > 0) {
          x -= 1;
          err -= 2 * x + 1;
        }
      }
    }
  }

  drawChar(c: string, startX: number, startY: number, size: number = 1, color: number = 1) {
    const glyph = FONT_5X7[c] || FONT_5X7['?'] || [0x00, 0x00, 0x00, 0x00, 0x00];
    for (let col = 0; col < 5; col++) {
      let line = glyph[col];
      for (let row = 0; row < 7; row++) {
        if (line & 0x1) {
          if (size === 1) {
            this.drawPixel(startX + col, startY + row, color);
          } else {
            for (let sy = 0; sy < size; sy++) {
              for (let sx = 0; sx < size; sx++) {
                this.drawPixel(startX + col * size + sx, startY + row * size + sy, color);
              }
            }
          }
        }
        line >>= 1;
      }
    }
  }

  drawText(text: string, x: number, y: number, size: number = 1, color: number = 1) {
    let curX = Math.floor(x);
    const curY = Math.floor(y);
    const spacing = 6 * size;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '\n') {
        curX = Math.floor(x);
        continue;
      }
      this.drawChar(char, curX, curY, size, color);
      curX += spacing;
    }
  }

  // LED Controls
  setLed(index: 0 | 1, r: number, g: number, b: number) {
    this.leds[index] = { r, g, b };
  }

  setBothLeds(r: number, g: number, b: number) {
    this.leds[0] = { r, g, b };
    this.leds[1] = { r, g, b };
  }

  flashLeds(r: number, g: number, b: number, durationMs: number = 200) {
    if (this.flashTimeout) clearTimeout(this.flashTimeout);
    this.setBothLeds(r, g, b);
    this.flashTimeout = setTimeout(() => {
      this.clearLeds();
    }, durationMs);
  }

  clearLeds() {
    this.leds[0] = { r: 0, g: 0, b: 0 };
    this.leds[1] = { r: 0, g: 0, b: 0 };
  }
}
