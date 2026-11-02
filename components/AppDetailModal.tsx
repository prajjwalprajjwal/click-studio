'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Cpu,
  Terminal,
  Gamepad2,
  FileCode2,
  Share2,
  ExternalLink,
  Zap,
  Info
} from 'lucide-react';
import { AppletRecord } from '@/lib/db';
import OledSimulator from '@/components/OledSimulator';

interface AppDetailModalProps {
  applet: AppletRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onInstall: (applet: AppletRecord) => void;
  connectedDevice: { type: 'RP2354A' | 'ESP32'; name: string } | null;
}

export default function AppDetailModal({
  applet,
  isOpen,
  onClose,
  onInstall,
  connectedDevice
}: AppDetailModalProps) {
  const [activeCodeTab, setActiveCodeTab] = useState<'h' | 'cpp' | 'js'>('js');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !applet) return null;

  const handleCopy = () => {
    let text = applet.jsCompanion;
    if (activeCodeTab === 'h') text = applet.cppHeader;
    if (activeCodeTab === 'cpp') text = applet.cppSource;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportUf2 = () => {
    const payload = new Blob(
      [
        `// Click Studio UF2 Bundle\n// Title: ${applet.title}\n// Version: ${applet.version}\n\n`,
        applet.cppHeader,
        '\n\n',
        applet.cppSource
      ],
      { type: 'application/octet-stream' }
    );
    const url = URL.createObjectURL(payload);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${applet.slug}_firmware.uf2`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="lab-modal-backdrop" onClick={onClose}>
      <div className="lab-app-detail-card" onClick={e => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="detail-modal-header">
          <div className="flex items-center gap-3">
            <span className="detail-category-badge">{applet.category}</span>
            <span className="detail-app-version">{applet.version || 'v1.0.0'}</span>
            <span className="detail-app-id">ID: {applet.slug}</span>
          </div>
          <button type="button" className="lab-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="detail-modal-body-grid">
          {/* Left Column: Interactive Hardware Simulator */}
          <div className="detail-simulator-col">
            <div className="detail-section-title">LIVE HARDWARE RUNTIME</div>
            <OledSimulator
              jsCode={applet.jsCompanion}
              title={applet.title}
              author={applet.author}
            />

            {/* Hardware IO Map */}
            <div className="hardware-specs-card">
              <div className="spec-row">
                <span className="spec-label">Target MCU:</span>
                <span className="spec-val">RP2354A (150MHz) / ESP32</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Display:</span>
                <span className="spec-val">SSD1306 128x64 Monochrome OLED</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Input Pins:</span>
                <span className="spec-val">GP2 (ACTION) • GP3 (MODE)</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Peripherals:</span>
                <span className="spec-val">GP27 Buzzer • GP11 Dual WS2812</span>
              </div>
            </div>
          </div>

          {/* Right Column: App Information & C++ Source Code */}
          <div className="detail-info-col">
            <div className="detail-meta-header">
              <h1 className="detail-title">{applet.title}</h1>
              <div className="detail-author-row">
                <span>By <strong>{applet.author}</strong></span>
                <span>•</span>
                <span>License: <strong>MIT</strong></span>
                <span>•</span>
                <span>{applet.downloads || 0} Installs</span>
              </div>
              <p className="detail-description">{applet.description}</p>
            </div>

            {/* Controls Guide */}
            <div className="detail-controls-box">
              <div className="controls-label">
                <Info size={14} className="text-cyan" />
                <span>HOW TO PLAY / CONTROLS</span>
              </div>
              <p className="controls-text">{applet.instructions}</p>
            </div>

            {/* Install & Export Actions */}
            <div className="detail-actions-row">
              <button
                type="button"
                className="btn-install-primary"
                onClick={() => onInstall(applet)}
              >
                <Download size={16} />
                <span>
                  {connectedDevice
                    ? `Install to ${connectedDevice.name}`
                    : 'Install to Click (WebUSB)'}
                </span>
              </button>

              <button
                type="button"
                className="btn-export-uf2"
                onClick={handleExportUf2}
                title="Download UF2 package"
              >
                <Zap size={15} />
                <span>Download UF2</span>
              </button>
            </div>

            {/* C++ Source Code Tabs */}
            <div className="source-inspector-box">
              <div className="source-tabs-bar">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={`src-tab-btn ${activeCodeTab === 'js' ? 'active' : ''}`}
                    onClick={() => setActiveCodeTab('js')}
                  >
                    Simulator JS
                  </button>
                  <button
                    type="button"
                    className={`src-tab-btn ${activeCodeTab === 'h' ? 'active' : ''}`}
                    onClick={() => setActiveCodeTab('h')}
                  >
                    C++ Header (.h)
                  </button>
                  <button
                    type="button"
                    className={`src-tab-btn ${activeCodeTab === 'cpp' ? 'active' : ''}`}
                    onClick={() => setActiveCodeTab('cpp')}
                  >
                    C++ Source (.cpp)
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-copy-src"
                  onClick={handleCopy}
                  title="Copy code to clipboard"
                >
                  {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="source-code-scroll">
                <pre>
                  <code>
                    {activeCodeTab === 'js' && applet.jsCompanion}
                    {activeCodeTab === 'h' && applet.cppHeader}
                    {activeCodeTab === 'cpp' && applet.cppSource}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
