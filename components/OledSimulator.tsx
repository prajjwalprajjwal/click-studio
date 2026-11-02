'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  Cpu,
  Radio,
  Sparkles,
  Keyboard,
  Info
} from 'lucide-react';
import {
  DisplayFramebuffer,
  AudioBuzzerSynthesizer,
  LedState
} from '@/lib/simulator-engine';

interface OledSimulatorProps {
  jsCode: string;
  title?: string;
  author?: string;
  onCodeError?: (error: string) => void;
  className?: string;
}

export default function OledSimulator({
  jsCode,
  title = 'Click Microapplet',
  author = 'Click Community',
  onCodeError,
  className = ''
}: OledSimulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const synthRef = useRef<AudioBuzzerSynthesizer | null>(null);
  const fbRef = useRef<DisplayFramebuffer | null>(null);
  const appInstanceRef = useRef<any>(null);
  const reqAnimRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [fps, setFps] = useState(60);
  const [isActionActive, setIsActionActive] = useState(false);
  const [isModeActive, setIsModeActive] = useState(false);
  const [ledColors, setLedColors] = useState<[LedState, LedState]>([
    { r: 0, g: 0, b: 0 },
    { r: 0, g: 0, b: 0 }
  ]);
  const [simError, setSimError] = useState<string | null>(null);
  const [activeMcu, setActiveMcu] = useState<'RP2354A' | 'ESP32'>('RP2354A');

  // Initialize Audio & Framebuffer
  useEffect(() => {
    const synth = new AudioBuzzerSynthesizer();
    synth.enabled = isAudioEnabled;
    synthRef.current = synth;

    const fb = new DisplayFramebuffer(synth);
    fbRef.current = fb;

    return () => {
      synthRef.current = null;
      fbRef.current = null;
    };
  }, []);

  // Update audio toggle
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.enabled = isAudioEnabled;
    }
  }, [isAudioEnabled]);

  // Mount/instantiate applet code safely
  const mountApplet = useCallback(() => {
    setSimError(null);
    if (!jsCode || !fbRef.current || !synthRef.current) return;

    try {
      fbRef.current.clear();
      fbRef.current.clearLeds();

      // Wrap code in a safe evaluation closure
      const wrapped = `
        return (function() {
          ${jsCode};
          if (typeof Microapplet !== 'undefined') return new Microapplet();
          if (typeof SisyphusApplet !== 'undefined') return new SisyphusApplet();
          if (typeof JustTenApplet !== 'undefined') return new JustTenApplet();
          if (typeof PomodoroApplet !== 'undefined') return new PomodoroApplet();
          
          // Fallback: look for any class or constructor in scope
          const matched = /class\\s+([A-Za-z0-9_]+)/.exec(\`${jsCode.replace(/`/g, '\\`')}\`);
          if (matched && matched[1] && eval("typeof " + matched[1]) === 'function') {
            return eval("new " + matched[1] + "()");
          }
          throw new Error("No Applet class found. Ensure code defines a class conforming to the Click Simulator spec.");
        })();
      `;

      const factory = new Function(wrapped);
      const app = factory();

      if (app && typeof app.init === 'function') {
        app.init();
      }

      appInstanceRef.current = app;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error('[Simulator Engine] Applet mount failed:', err);
      setSimError(errMsg);
      if (onCodeError) onCodeError(errMsg);
    }
  }, [jsCode, onCodeError]);

  useEffect(() => {
    mountApplet();
  }, [mountApplet]);

  // Main 60FPS simulation loop
  useEffect(() => {
    let frameCount = 0;
    let lastFpsCalc = performance.now();

    const loop = (now: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const dt = Math.min(64, now - lastTimeRef.current);
      lastTimeRef.current = now;

      // FPS tracking
      frameCount++;
      if (now - lastFpsCalc >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsCalc)));
        frameCount = 0;
        lastFpsCalc = now;
      }

      const canvas = canvasRef.current;
      const fb = fbRef.current;
      const app = appInstanceRef.current;

      if (canvas && fb) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (!isPaused && app && !simError) {
            try {
              // Update applet logic
              if (typeof app.update === 'function') {
                app.update(dt, {
                  sound: fb.sound,
                  leds: {
                    set: (idx: 0 | 1, r: number, g: number, b: number) => fb.setLed(idx, r, g, b),
                    setAll: (r: number, g: number, b: number) => fb.setBothLeds(r, g, b),
                    flash: (r: number, g: number, b: number, d?: number) => fb.flashLeds(r, g, b, d),
                    clear: () => fb.clearLeds()
                  }
                });
              }

              // Draw applet onto monochrome framebuffer
              if (typeof app.draw === 'function') {
                app.draw(fb);
              }
            } catch (runtimeErr: any) {
              setSimError(runtimeErr?.message || 'Runtime error during simulation step');
            }
          }

          // Render framebuffer to HTML5 canvas (128x64 with realistic OLED white/blue glow)
          const imgData = ctx.createImageData(128, 64);
          const data = imgData.data;

          for (let i = 0; i < 128 * 64; i++) {
            const pixelOn = fb.buffer[i] === 1;
            const idx = i * 4;

            if (pixelOn) {
              // Crisp OLED White with faint phosphor tint (#E8F4F8)
              data[idx] = 235;     // R
              data[idx + 1] = 248; // G
              data[idx + 2] = 255; // B
              data[idx + 3] = 255; // Alpha
            } else {
              // True OLED Obsidian (#040507)
              data[idx] = 4;
              data[idx + 1] = 5;
              data[idx + 2] = 7;
              data[idx + 3] = 255;
            }
          }

          ctx.putImageData(imgData, 0, 0);

          // Update RGB LEDs state
          setLedColors([
            { ...fb.leds[0] },
            { ...fb.leds[1] }
          ]);
        }
      }

      reqAnimRef.current = requestAnimationFrame(loop);
    };

    reqAnimRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
    };
  }, [isPaused, simError]);

  // Physical Button Triggers
  const handleActionPress = useCallback(() => {
    setIsActionActive(true);
    const fb = fbRef.current;
    const app = appInstanceRef.current;

    if (fb && app) {
      if (typeof app.onActionClick === 'function') {
        try {
          app.onActionClick({
            sound: fb.sound,
            leds: {
              set: (idx: 0 | 1, r: number, g: number, b: number) => fb.setLed(idx, r, g, b),
              setAll: (r: number, g: number, b: number) => fb.setBothLeds(r, g, b),
              flash: (r: number, g: number, b: number, d?: number) => fb.flashLeds(r, g, b, d),
              clear: () => fb.clearLeds()
            }
          });
        } catch (e: any) {
          console.warn('Action click handler error:', e);
        }
      }
    }
  }, []);

  const handleActionRelease = useCallback(() => {
    setIsActionActive(false);
  }, []);

  const handleModePress = useCallback(() => {
    setIsModeActive(true);
    const fb = fbRef.current;
    const app = appInstanceRef.current;

    if (fb && app) {
      if (typeof app.onModeClick === 'function') {
        try {
          app.onModeClick({
            sound: fb.sound,
            leds: {
              set: (idx: 0 | 1, r: number, g: number, b: number) => fb.setLed(idx, r, g, b),
              setAll: (r: number, g: number, b: number) => fb.setBothLeds(r, g, b),
              flash: (r: number, g: number, b: number, d?: number) => fb.flashLeds(r, g, b, d),
              clear: () => fb.clearLeds()
            }
          });
        } catch (e: any) {
          console.warn('Mode click handler error:', e);
        }
      }
    }
  }, []);

  const handleModeRelease = useCallback(() => {
    setIsModeActive(false);
  }, []);

  // Keyboard shortcut listener: Space/Enter = ACTION, Key M = MODE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!isActionActive) handleActionPress();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (!isModeActive) handleModePress();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        handleActionRelease();
      } else if (e.key === 'm' || e.key === 'M') {
        handleModeRelease();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleActionPress, handleActionRelease, handleModePress, handleModeRelease, isActionActive, isModeActive]);

  // Take screenshot
  const handleScreenshot = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `click-oled-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const getLedGlow = (led: LedState) => {
    const isActive = led.r > 0 || led.g > 0 || led.b > 0;
    if (!isActive) return 'rgba(30, 41, 59, 0.4)';
    return `rgb(${led.r}, ${led.g}, ${led.b})`;
  };

  const getLedBoxShadow = (led: LedState) => {
    const isActive = led.r > 0 || led.g > 0 || led.b > 0;
    if (!isActive) return 'inset 0 1px 3px rgba(0,0,0,0.8)';
    return `0 0 12px 3px rgba(${led.r}, ${led.g}, ${led.b}, 0.8), 0 0 24px 6px rgba(${led.r}, ${led.g}, ${led.b}, 0.3)`;
  };

  return (
    <div className={`click-simulator-container ${className}`}>
      {/* Top Device Header & Controls */}
      <div className="sim-top-toolbar">
        <div className="sim-device-badge">
          <span className="live-indicator-dot"></span>
          <span className="device-label">CLICK HARDWARE EMULATOR</span>
          <span className="mcu-tag">{activeMcu}</span>
        </div>

        <div className="sim-toolbar-actions">
          <button
            type="button"
            className="sim-btn-icon"
            onClick={() => setActiveMcu(m => m === 'RP2354A' ? 'ESP32' : 'RP2354A')}
            title={`Switch target MCU (Current: ${activeMcu})`}
          >
            <Cpu size={14} />
            <span className="btn-label-text">{activeMcu}</span>
          </button>

          <button
            type="button"
            className="sim-btn-icon"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            title={isAudioEnabled ? 'Mute Piezo Buzzer' : 'Unmute Piezo Buzzer'}
          >
            {isAudioEnabled ? <Volume2 size={15} className="text-cyan" /> : <VolumeX size={15} />}
          </button>

          <button
            type="button"
            className="sim-btn-icon"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play size={14} className="text-cyan" /> : <Pause size={14} />}
          </button>

          <button
            type="button"
            className="sim-btn-icon"
            onClick={mountApplet}
            title="Reset Applet State"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className="sim-btn-icon"
            onClick={handleScreenshot}
            title="Export Frame PNG"
          >
            <Camera size={14} />
          </button>
        </div>
      </div>

      {/* Physical Click Handheld Chassis */}
      <div className="click-hardware-chassis">
        {/* Top Screw Mounts & Status Bar */}
        <div className="chassis-screws-row">
          <div className="hex-screw left"></div>

          {/* Dual WS2812 RGB LED Lenses */}
          <div className="dual-rgb-diffusers">
            <div className="rgb-lens-wrapper">
              <span className="led-label">LED 0</span>
              <div
                className="rgb-lens"
                style={{
                  backgroundColor: getLedGlow(ledColors[0]),
                  boxShadow: getLedBoxShadow(ledColors[0])
                }}
              />
            </div>

            <div className="hardware-branding-plate">
              <span className="brand-logo-text">CLICK</span>
              <span className="brand-sub">STUDIO OS</span>
            </div>

            <div className="rgb-lens-wrapper">
              <span className="led-label">LED 1</span>
              <div
                className="rgb-lens"
                style={{
                  backgroundColor: getLedGlow(ledColors[1]),
                  boxShadow: getLedBoxShadow(ledColors[1])
                }}
              />
            </div>
          </div>

          <div className="hex-screw right"></div>
        </div>

        {/* Recessed OLED Screen Bezel */}
        <div className="oled-bezel-frame">
          <div className="oled-inner-glass">
            {/* 128x64 Canvas */}
            <canvas
              ref={canvasRef}
              width={128}
              height={64}
              className="oled-display-canvas"
            />

            {/* Phosphor Pixel Scanline Overlay */}
            <div className="oled-pixel-overlay"></div>

            {/* Error Overlay if any */}
            {simError && (
              <div className="oled-error-overlay">
                <div className="error-title">SYSTEM HALT</div>
                <div className="error-desc">{simError}</div>
                <button
                  type="button"
                  className="error-reset-btn"
                  onClick={mountApplet}
                >
                  TAP TO RELOAD
                </button>
              </div>
            )}
          </div>

          {/* Screen Info Ribbon */}
          <div className="oled-ribbon">
            <span className="ribbon-text">SSD1306 • 128x64 MONO • I2C 0x3C</span>
            <span className="ribbon-fps">{fps} FPS</span>
          </div>
        </div>

        {/* Physical Mechanical Tactile Buttons */}
        <div className="chassis-buttons-panel">
          {/* ACTION BUTTON (GP2) */}
          <div className="button-pod action-pod">
            <button
              type="button"
              id="click-btn-action"
              className={`click-tactile-btn action-btn ${isActionActive ? 'pressed' : ''}`}
              onMouseDown={handleActionPress}
              onMouseUp={handleActionRelease}
              onMouseLeave={handleActionRelease}
              onTouchStart={handleActionPress}
              onTouchEnd={handleActionRelease}
            >
              <div className="btn-metallic-cap">
                <span className="btn-name">ACTION</span>
              </div>
            </button>
            <div className="btn-subtext">
              <Keyboard size={11} />
              <span>SPACE / ENTER</span>
            </div>
          </div>

          {/* Piezo Buzzer Grille */}
          <div className="chassis-speaker-grille" title="GP27 Piezo Buzzer Port">
            <div className="grille-dot"></div>
            <div className="grille-dot"></div>
            <div className="grille-dot"></div>
            <div className="grille-dot"></div>
            <div className="grille-dot"></div>
            <div className="grille-dot"></div>
          </div>

          {/* MODE BUTTON (GP3) */}
          <div className="button-pod mode-pod">
            <button
              type="button"
              id="click-btn-mode"
              className={`click-tactile-btn mode-btn ${isModeActive ? 'pressed' : ''}`}
              onMouseDown={handleModePress}
              onMouseUp={handleModeRelease}
              onMouseLeave={handleModeRelease}
              onTouchStart={handleModePress}
              onTouchEnd={handleModeRelease}
            >
              <div className="btn-metallic-cap">
                <span className="btn-name">MODE</span>
              </div>
            </button>
            <div className="btn-subtext">
              <Keyboard size={11} />
              <span>KEY [M]</span>
            </div>
          </div>
        </div>

        {/* Bottom Hardware Info Bar */}
        <div className="chassis-bottom-row">
          <span className="chassis-serial">HW: V4.1-PROD</span>
          <span className="chassis-credits">{title} • {author}</span>
          <span className="chassis-io">GP2 / GP3 / GP11 / GP27</span>
        </div>
      </div>
    </div>
  );
}
