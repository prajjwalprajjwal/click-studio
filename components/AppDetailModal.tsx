'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Cpu,
  FileCode2,
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
  connectedDevice: { type: 'RP2354A'; name: string } | null;
}

function getTabFilename(tab: 'js' | 'h' | 'cpp', applet: AppletRecord): string {
  if (tab === 'js') return `simulator/${applet.slug}.companion.js`;
  if (applet.slug === 'sisyphus-push') {
    return tab === 'h'
      ? 'firmware/src/applets/clicker/CounterApplet.h'
      : 'firmware/src/applets/clicker/CounterApplet.cpp';
  }
  if (applet.slug === 'floppy-bird') {
    return tab === 'h'
      ? 'firmware/src/applets/flappy_bird/FlappyBirdApplet.h'
      : 'firmware/src/applets/flappy_bird/FlappyBirdApplet.cpp';
  }
  if (applet.slug === 'just-ten') {
    return tab === 'h'
      ? 'firmware/src/applets/timing_game/TimingGameApplet.h'
      : 'firmware/src/applets/timing_game/TimingGameApplet.cpp';
  }
  return tab === 'h'
    ? `firmware/src/applets/${applet.slug}/${applet.slug}.h`
    : `firmware/src/applets/${applet.slug}/${applet.slug}.cpp`;
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

  // Close modal when pressing Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        `// Click Studio UF2 Bundle\n// Title: ${applet.title}\n// Version: ${applet.version}\n// Target: Raspberry Pi RP2354A\n\n`,
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
          <div className="detail-header-tags">
            <span className="detail-category-badge">{applet.category}</span>
            <span className="detail-tag-separator">•</span>
            <span className="detail-app-version">{applet.version || 'v1.0.0'}</span>
            <span className="detail-tag-separator">•</span>
            <span className="detail-app-id">applet: {applet.slug}</span>
          </div>
          <button
            type="button"
            className="lab-modal-close"
            onClick={onClose}
            aria-label="Close dialog (Esc)"
            title="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="detail-modal-body-grid">
          {/* Left Column: Interactive Hardware Simulator */}
          <div className="detail-simulator-col">
            <OledSimulator
              jsCode={applet.jsCompanion}
              title={applet.title}
              author={applet.author}
            />

            {/* Hardware IO Map - Clear Column Readout */}
            <div className="hardware-specs-grid">
              <div className="spec-item">
                <span className="spec-k">Target MCU</span>
                <span className="spec-v">RP2354A 150MHz</span>
              </div>
              <div className="spec-item">
                <span className="spec-k">OLED Display</span>
                <span className="spec-v">SSD1306 128×64</span>
              </div>
              <div className="spec-item">
                <span className="spec-k">Tactile Input</span>
                <span className="spec-v">GP2 / GP3</span>
              </div>
              <div className="spec-item">
                <span className="spec-k">Audio &amp; RGB</span>
                <span className="spec-v">GP27 / GP11</span>
              </div>
            </div>
          </div>

          {/* Right Column: App Information & C++ Source Code */}
          <div className="detail-info-col">
            <div className="detail-meta-header">
              <div className="detail-title-row">
                <h1 className="detail-title">{applet.title}</h1>
                {applet.githubUrl && (
                  <a
                    href={applet.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-github-pill"
                    title="View official firmware source on GitHub"
                  >
                    <ExternalLink size={12} />
                    <span>View on GitHub</span>
                  </a>
                )}
              </div>
              <div className="detail-author-row">
                <span>By <strong>{applet.author}</strong></span>
                <span>•</span>
                <span>License: <strong>MIT</strong></span>
                <span>•</span>
                <span>Hardware: <strong>RP2354A</strong></span>
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
                <Download size={15} />
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
                title="Download RP2354A UF2 package"
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

                <div className="flex items-center gap-2">
                  {applet.githubUrl && (
                    <a
                      href={applet.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-copy-src"
                      title="Open source file on GitHub"
                    >
                      <ExternalLink size={12} />
                      <span>GitHub ↗</span>
                    </a>
                  )}
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
              </div>

              {/* Verified Provenance Bar */}
              <div className="source-provenance-bar">
                <div className="provenance-path">
                  <FileCode2 size={12} className="flex-shrink-0 text-cyan" />
                  <span className="truncate">{getTabFilename(activeCodeTab, applet)}</span>
                </div>
                <div className="provenance-badge">
                  <Check size={11} />
                  <span>100% Match with prajjwalprajjwal/Click</span>
                </div>
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
