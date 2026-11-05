'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  Download,
  Plus,
  Copy,
  Check,
  HelpCircle,
  Cpu,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppletRecord } from '@/lib/db';
import OledSimulator from '@/components/OledSimulator';

interface CreateAppletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (applet: AppletRecord) => void;
  onAppletCreated?: (applet: AppletRecord) => void;
}

export default function CreateAppletModal({
  isOpen,
  onClose,
  onInstall,
  onAppletCreated
}: CreateAppletModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stepMsg, setStepMsg] = useState('');
  const [generatedApplet, setGeneratedApplet] = useState<AppletRecord | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'js' | 'h' | 'cpp'>('js');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse.trim()) return;

    setIsGenerating(true);
    setStepMsg('Synthesizing RP2354A microapplet architecture...');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: textToUse })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation error');
      }

      const gen = data.applet;
      const formattedApplet: AppletRecord = {
        id: 'user_gen_' + Date.now(),
        title: gen.title || 'Custom Microapplet',
        slug: 'custom-' + Date.now().toString(36),
        version: 'v1.0.0',
        category: gen.category || 'Games',
        iconType: 'gamepad',
        author: gen.author || 'You (Studio Maker)',
        description: gen.description || 'Custom Click microapplet generated via AI.',
        tags: gen.tags || ['custom', 'ai-generated'],
        status: 'pending_review',
        cppHeader: gen.cppHeader || '',
        cppSource: gen.cppSource || '',
        jsCompanion: gen.jsCompanion || '',
        instructions: gen.instructions || 'Tap ACTION to play.',
        likes: 0,
        downloads: 0,
        featured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setGeneratedApplet(formattedApplet);
      if (onAppletCreated) {
        onAppletCreated(formattedApplet);
      }

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
      setStepMsg('');
    }
  };

  const handleCopyCode = () => {
    if (!generatedApplet) return;
    let text = generatedApplet.jsCompanion;
    if (activeCodeTab === 'h') text = generatedApplet.cppHeader;
    if (activeCodeTab === 'cpp') text = generatedApplet.cppSource;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitToCatalog = async () => {
    if (!generatedApplet) return;
    setIsSubmitting(true);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/applets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedApplet.title,
          author: generatedApplet.author,
          category: generatedApplet.category,
          description: generatedApplet.description,
          tags: generatedApplet.tags,
          jsCompanion: generatedApplet.jsCompanion,
          cppHeader: generatedApplet.cppHeader,
          cppSource: generatedApplet.cppSource,
          instructions: generatedApplet.instructions
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Submission failed');

      setSubmitSuccess('✓ Submitted! Your microapplet is now pending review in the moderation queue.');
      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (e: any) {
      alert(e.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const samplePrompts = [
    'Reflex speed test: press ACTION when dot turns into hollow circle',
    'Tactile haptic metronome with sharp piezo ticks and flashing LEDs',
    'Space invader micro-dodge on 128x64 OLED with high score tracker',
    'Pomodoro 25/5 focus interval timer with buzzer chime'
  ];

  return (
    <div className="lab-modal-backdrop" onClick={onClose}>
      <div
        className="lab-creator-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="creator-modal-header">
          <div className="flex items-center gap-3">
            <div className="creator-icon-box">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="creator-modal-title">AI Microapplet Builder</h2>
              <div className="creator-modal-subtitle">
                <span>Free Tier Mode • Zero API Keys Required</span>
                <span>•</span>
                <span>Target: RP2354A Dual Cortex-M33 &amp; ESP32</span>
              </div>
            </div>
          </div>
          <button type="button" className="lab-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Prompt Input & Presets */}
        <div className="creator-prompt-section">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerate();
            }}
          >
            <div className="creator-input-row">
              <input
                type="text"
                className="creator-prompt-input"
                placeholder="Describe your microapplet idea in plain English..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                autoFocus
              />
              <button
                type="submit"
                className="btn-creator-generate"
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>

            {isGenerating && (
              <div className="mt-2 text-xs text-blue-600 font-mono flex items-center gap-2">
                <span className="live-pulse-dot"></span>
                <span>{stepMsg}</span>
              </div>
            )}

            <div className="creator-sample-chips">
              <span className="chips-label">Try an idea:</span>
              {samplePrompts.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  className="creator-sample-chip"
                  onClick={() => {
                    setPrompt(sample);
                    handleGenerate(sample);
                  }}
                >
                  {sample.length > 38 ? sample.substring(0, 36) + '...' : sample}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Generated Result Workbench */}
        {generatedApplet ? (
          <div className="creator-workbench-split">
            {/* Left: Live OLED Simulator */}
            <div className="creator-sim-col">
              <div className="workbench-col-heading">
                <span>Live Hardware Runtime (128×64 OLED)</span>
              </div>
              <OledSimulator
                jsCode={generatedApplet.jsCompanion}
                title={generatedApplet.title}
                author={generatedApplet.author}
              />

              <div className="creator-controls-box">
                <div className="controls-label">
                  <Info size={13} className="text-muted" />
                  <span>Controls / Instructions</span>
                </div>
                <p className="controls-text">{generatedApplet.instructions}</p>
              </div>
            </div>

            {/* Right: Code Inspector & Actions */}
            <div className="creator-code-col">
              <div className="creator-app-meta">
                <h3 className="creator-app-title">{generatedApplet.title}</h3>
                <span className="creator-app-category">{generatedApplet.category}</span>
                <p className="creator-app-desc">{generatedApplet.description}</p>
              </div>

              {/* Code Tabs */}
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
                    onClick={handleCopyCode}
                  >
                    {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="source-code-scroll" style={{ maxHeight: '280px' }}>
                  <pre>
                    <code>
                      {activeCodeTab === 'js' && generatedApplet.jsCompanion}
                      {activeCodeTab === 'h' && generatedApplet.cppHeader}
                      {activeCodeTab === 'cpp' && generatedApplet.cppSource}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="creator-actions-row">
                <button
                  type="button"
                  className="btn-creator-install"
                  onClick={() => onInstall(generatedApplet)}
                >
                  <Download size={15} />
                  <span>Install to Click (WebUSB)</span>
                </button>

                <button
                  type="button"
                  className="btn-creator-submit"
                  onClick={handleSubmitToCatalog}
                  disabled={isSubmitting}
                >
                  <Plus size={15} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit to Community Catalog'}</span>
                </button>
              </div>

              {submitSuccess && (
                <div className="creator-success-toast">
                  {submitSuccess}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="creator-empty-prompt-state">
            <div className="empty-state-graphic">
              <Sparkles size={36} />
            </div>
            <h3>Describe your applet above to synthesize</h3>
            <p>
              Antigravity AI automatically writes the 128×64 OLED graphics loop, GPIO button interrupts,
              dual WS2812 LED patterns, and piezo buzzer frequencies for RP2354A.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
