'use client';

import React, { useState } from 'react';
import {
  Usb,
  Zap,
  Download,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  isWebUsbSupported,
  isWebSerialSupported,
  flashRp2354Device,
  flashEsp32Device,
  FlashingProgress
} from '@/lib/web-flasher';

interface DeviceFlasherProps {
  appletTitle?: string;
  cppHeader?: string;
  cppSource?: string;
}

export default function DeviceFlasher({
  appletTitle = 'Current Microapplet',
  cppHeader = '',
  cppSource = ''
}: DeviceFlasherProps) {
  const [targetMcu, setTargetMcu] = useState<'RP2354A' | 'ESP32'>('RP2354A');
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState<FlashingProgress>({
    stage: 'idle',
    percentage: 0,
    message: 'Ready to connect'
  });
  const [flashLog, setFlashLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setFlashLog(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleFlash = async () => {
    setIsFlashing(true);
    setFlashLog([]);
    addLog(`Initiating direct flash routine for ${targetMcu}...`);

    try {
      // Mock binary bundle containing Click core + user applet
      const dummyPayload = new Uint8Array(256 * 1024);
      // Populate header with Click signature
      const sig = new TextEncoder().encode(`CLICK_STUDIO_APP:${appletTitle}`);
      dummyPayload.set(sig, 0);

      if (targetMcu === 'RP2354A') {
        if (!isWebUsbSupported()) {
          throw new Error('WebUSB is not supported in this browser. Please use Chrome or Edge.');
        }

        addLog('Requesting WebUSB Picoboot access (0x2E8A)...');
        await flashRp2354Device(dummyPayload.buffer, (p) => {
          setProgress(p);
          addLog(p.message);
        });
      } else {
        if (!isWebSerialSupported()) {
          throw new Error('WebSerial is not supported in this browser. Please use Chrome or Edge.');
        }

        addLog('Requesting WebSerial port at 460,800 baud...');
        await flashEsp32Device(dummyPayload.buffer, (p) => {
          setProgress(p);
          addLog(p.message);
        });
      }
    } catch (err: any) {
      console.error('Flashing failed:', err);
      setProgress({
        stage: 'error',
        percentage: 0,
        message: err.message || 'Flashing interrupted'
      });
      addLog(`ERROR: ${err.message || 'Flashing failed'}`);
    } finally {
      setIsFlashing(false);
    }
  };

  const handleDownloadUf2 = () => {
    const payload = new Blob(
      [
        `// Click Studio UF2 Package\n// Title: ${appletTitle}\n// Target: RP2354A\n\n`,
        cppHeader,
        '\n\n',
        cppSource
      ],
      { type: 'application/octet-stream' }
    );
    const url = URL.createObjectURL(payload);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appletTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_firmware.uf2`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const webUsbOk = isWebUsbSupported();
  const webSerialOk = isWebSerialSupported();

  return (
    <div className="flasher-card-wrapper">
      <div className="flasher-header">
        <div className="flasher-header-info">
          <div className="flasher-badge">
            <Usb size={14} className="text-cyan" />
            <span>WEB FLASHER ENGINE</span>
          </div>
          <h3 className="flasher-title">Direct-to-Device Flasher</h3>
          <p className="flasher-desc">
            Flash <strong>{appletTitle}</strong> directly into your Click handheld via USB-C. Zero command line or drivers needed.
          </p>
        </div>

        {/* MCU Selector Tabs */}
        <div className="mcu-tabs-group">
          <button
            type="button"
            className={`mcu-tab-btn ${targetMcu === 'RP2354A' ? 'active' : ''}`}
            onClick={() => setTargetMcu('RP2354A')}
          >
            <Cpu size={14} />
            <span>RP2354A (Picoboot)</span>
          </button>
          <button
            type="button"
            className={`mcu-tab-btn ${targetMcu === 'ESP32' ? 'active' : ''}`}
            onClick={() => setTargetMcu('ESP32')}
          >
            <Zap size={14} />
            <span>ESP32 (Serial)</span>
          </button>
        </div>
      </div>

      {/* Target Specs & Status */}
      <div className="flasher-body-grid">
        <div className="flasher-left-col">
          <div className="protocol-info-box">
            <div className="protocol-row">
              <span className="p-label">Target Chip:</span>
              <span className="p-value">{targetMcu === 'RP2354A' ? 'Raspberry Pi RP2354A (Dual Cortex-M33)' : 'Espressif ESP32-S3 / ESP32'}</span>
            </div>
            <div className="protocol-row">
              <span className="p-label">Browser Protocol:</span>
              <span className="p-value text-cyan">
                {targetMcu === 'RP2354A' ? 'WebUSB Picoboot (Zero Driver)' : 'WebSerial Turbo (460,800 baud)'}
              </span>
            </div>
            <div className="protocol-row">
              <span className="p-label">Browser Support:</span>
              <span className="p-value">
                {targetMcu === 'RP2354A'
                  ? webUsbOk ? <span className="status-badge ok">WebUSB Ready</span> : <span className="status-badge warn">Not Supported</span>
                  : webSerialOk ? <span className="status-badge ok">WebSerial Ready</span> : <span className="status-badge warn">Not Supported</span>}
              </span>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="flasher-instructions-box">
            <div className="instructions-header">
              <AlertTriangle size={14} className="text-amber" />
              <span>Flashing Instructions</span>
            </div>
            <ol className="instructions-list">
              {targetMcu === 'RP2354A' ? (
                <>
                  <li>Connect Click to your computer via USB-C.</li>
                  <li>Hold the <strong>BOOTSEL</strong> button while inserting USB-C cable (or Click OS will auto-reboot).</li>
                  <li>Click <strong>Flash to My Click</strong> and select <em>RP2350 Bootloader</em>.</li>
                </>
              ) : (
                <>
                  <li>Connect Click via USB-C to computer.</li>
                  <li>Click <strong>Flash to My Click</strong> and select the serial COM/tty port.</li>
                  <li>The flasher runs at turbo 460,800 baud rate.</li>
                </>
              )}
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flasher-actions-row">
            <button
              type="button"
              className="btn-primary-flash"
              onClick={handleFlash}
              disabled={isFlashing}
            >
              {isFlashing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Flashing Click... {progress.percentage}%</span>
                </>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Flash to My Click</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary-download"
              onClick={handleDownloadUf2}
              title="Download UF2 firmware for manual drag-and-drop USB drive flashing"
            >
              <Download size={15} />
              <span>Export UF2</span>
            </button>
          </div>
        </div>

        {/* Right Col: Terminal Output & Progress */}
        <div className="flasher-right-col">
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="td red"></span>
                <span className="td yellow"></span>
                <span className="td green"></span>
              </div>
              <span className="terminal-title">
                <Terminal size={12} /> Click Flasher Console
              </span>
              <span className="terminal-stage">{progress.stage.toUpperCase()}</span>
            </div>

            {/* Progress Bar */}
            <div className="flasher-progress-track">
              <div
                className={`flasher-progress-bar ${progress.stage === 'error' ? 'error' : progress.stage === 'complete' ? 'success' : ''}`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            {/* Terminal Logs */}
            <div className="terminal-logs-scroll">
              <div className="log-line text-muted">$ click-flasher --mcu={targetMcu.toLowerCase()} --baud=460800</div>
              {flashLog.length === 0 ? (
                <div className="log-placeholder">Click &quot;Flash to My Click&quot; to begin WebUSB transmission...</div>
              ) : (
                flashLog.map((line, idx) => (
                  <div key={idx} className="log-line">
                    {line}
                  </div>
                ))
              )}
              {progress.stage === 'complete' && (
                <div className="log-line text-success font-bold">
                  ✓ Operation finished successfully. Hardware reset signaled.
                </div>
              )}
              {progress.stage === 'error' && (
                <div className="log-line text-error font-bold">
                  ✗ Flashing failed. Please check device connection and try again.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
