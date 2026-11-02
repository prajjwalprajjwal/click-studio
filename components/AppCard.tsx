'use client';

import React from 'react';
import {
  Gamepad2,
  Clock,
  Zap,
  Music,
  Cpu,
  Download,
  Play,
  Check
} from 'lucide-react';
import { AppletRecord } from '@/lib/db';

interface AppCardProps {
  applet: AppletRecord;
  onOpenSimulator: (applet: AppletRecord) => void;
  onInstall: (applet: AppletRecord) => void;
  isInstalled?: boolean;
}

export default function AppCard({
  applet,
  onOpenSimulator,
  onInstall,
  isInstalled = false
}: AppCardProps) {
  const renderIcon = () => {
    switch (applet.category) {
      case 'Games':
        return <Gamepad2 size={24} />;
      case 'Clock':
        return <Clock size={24} />;
      case 'Media':
        return <Music size={24} />;
      case 'Sensors':
        return <Cpu size={24} />;
      case 'Tools':
      default:
        return <Zap size={24} />;
    }
  };

  return (
    <article
      className="app-card"
      onClick={() => onOpenSimulator(applet)}
    >
      <div className="app-card-top">
        <div className="app-pixel-avatar">
          {renderIcon()}
        </div>

        <div className="app-title-group">
          <div className="app-name-row">
            <h3 className="app-name">{applet.title}</h3>
          </div>
          <div className="app-author-line">by {applet.author}</div>
          <span className="app-category-badge">{applet.category}</span>
        </div>
      </div>

      <p className="app-description">{applet.description}</p>

      <div className="app-card-meta">
        <span className="app-version-tag">{applet.version || 'v1.0.0'}</span>

        <div className="app-card-actions">
          <button
            type="button"
            className="btn-card-sim"
            onClick={(e) => {
              e.stopPropagation();
              onOpenSimulator(applet);
            }}
            title="Run live in Click 128x64 OLED simulator"
          >
            <Play size={12} />
            <span>Simulator</span>
          </button>

          <button
            type="button"
            className={`btn-card-install ${isInstalled ? 'installed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onInstall(applet);
            }}
          >
            {isInstalled ? (
              <>
                <Check size={12} />
                <span>Installed</span>
              </>
            ) : (
              <>
                <Download size={12} />
                <span>Install</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
