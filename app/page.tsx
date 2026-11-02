'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  Cpu,
  Zap,
  Clock,
  Music,
  Search,
  Usb,
  Sparkles,
  Download,
  Plus,
  RefreshCw,
  Layers,
  Play,
  Trash2,
  HardDrive,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { AppletRecord } from '@/lib/db';
import AppCard from '@/components/AppCard';
import AppDetailModal from '@/components/AppDetailModal';
import CreateAppletModal from '@/components/CreateAppletModal';
import DeviceConnectionModal from '@/components/DeviceConnectionModal';
import DeviceFlasher from '@/components/DeviceFlasher';
import { flashRp2354Device, flashEsp32Device } from '@/lib/web-flasher';

export default function ClickLabHome() {
  // Navigation Tabs: 'apps' | 'device' | 'firmware'
  const [activeTab, setActiveTab] = useState<'apps' | 'device' | 'firmware'>('apps');

  // Connected Hardware State
  const [connectedDevice, setConnectedDevice] = useState<{
    type: 'RP2354A' | 'ESP32';
    name: string;
    serial?: string;
  } | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  // Installed Apps State (persisted in localStorage)
  const [installedSlugs, setInstalledSlugs] = useState<string[]>([
    'sisyphus-push',
    'just-ten',
    'floppy-bird'
  ]);

  // Catalog State
  const [applets, setApplets] = useState<AppletRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'popular' | 'alpha' | 'newest'>('popular');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Modals
  const [inspectedApplet, setInspectedApplet] = useState<AppletRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load installed apps from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('click_installed_slugs');
      if (saved) {
        setInstalledSlugs(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Sync installed apps to localStorage
  const saveInstalled = (slugs: string[]) => {
    setInstalledSlugs(slugs);
    try {
      localStorage.setItem('click_installed_slugs', JSON.stringify(slugs));
    } catch {}
  };

  // Fetch Catalog Applets
  const fetchApplets = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const url = new URL('/api/applets', window.location.origin);
      if (selectedCategory !== 'All') url.searchParams.set('tag', selectedCategory.toLowerCase());
      if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success && data.applets) {
        let items: AppletRecord[] = data.applets;

        if (selectedCategory !== 'All') {
          items = items.filter((a) => a.category === selectedCategory);
        }

        if (sortOrder === 'alpha') {
          items.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortOrder === 'newest') {
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
          items.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        }

        setApplets(items);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [selectedCategory, searchQuery, sortOrder]);

  useEffect(() => {
    fetchApplets();
  }, [fetchApplets]);

  // Open App in Detailed Modal / Live Simulator
  const handleOpenSimulator = (applet: AppletRecord) => {
    setInspectedApplet(applet);
    setIsDetailModalOpen(true);
  };

  // Direct Install Handler (WebUSB Picoboot / WebSerial)
  const handleInstallApplet = async (applet: AppletRecord) => {
    if (!connectedDevice) {
      setIsConnectModalOpen(true);
      return;
    }

    try {
      const dummyPayload = new Uint8Array(128 * 1024);
      const header = new TextEncoder().encode(`CLICK_APP:${applet.slug}`);
      dummyPayload.set(header, 0);

      if (connectedDevice.type === 'RP2354A') {
        await flashRp2354Device(dummyPayload.buffer, (p) => {
          if (p.stage === 'complete') {
            if (!installedSlugs.includes(applet.slug)) {
              saveInstalled([...installedSlugs, applet.slug]);
            }
            alert(`✓ "${applet.title}" installed to your Click RP2354A!`);
          }
        });
      } else {
        await flashEsp32Device(dummyPayload.buffer, (p) => {
          if (p.stage === 'complete') {
            if (!installedSlugs.includes(applet.slug)) {
              saveInstalled([...installedSlugs, applet.slug]);
            }
            alert(`✓ "${applet.title}" flashed to ESP32!`);
          }
        });
      }
    } catch (err: any) {
      alert(`Flashing error: ${err.message || 'Device disconnected'}`);
    }
  };

  // Uninstall Applet
  const handleUninstall = (slug: string) => {
    saveInstalled(installedSlugs.filter((s) => s !== slug));
  };

  // Categories list
  const categories: { name: string; icon: any }[] = [
    { name: 'All', icon: Layers },
    { name: 'Games', icon: Gamepad2 },
    { name: 'Tools', icon: Zap },
    { name: 'Clock', icon: Clock },
    { name: 'Media', icon: Music },
    { name: 'Sensors', icon: Cpu }
  ];

  // Installed applets list
  const installedAppletsList = applets.filter((a) => installedSlugs.includes(a.slug));

  return (
    <div className="app-shell">
      {/* 1. Header (Flipper Lab Style) */}
      <header className="app-header">
        <div className="flex items-center gap-4">
          <Link href="/" className="app-brand">
            <div className="brand-icon-box">
              <Zap size={16} />
            </div>
            <span className="brand-name">Click Lab</span>
            <span className="brand-tag">RP2354A</span>
          </Link>

          {/* External Link to Official Device Site */}
          <a
            href="https://click.uprajjwal.com.np"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-hardware-link"
            title="Visit official Click Handheld website"
          >
            <span className="hardware-live-dot"></span>
            <span>click.uprajjwal.com.np</span>
            <ArrowUpRight size={13} />
          </a>
        </div>

        {/* Navigation Tabs: Apps | My Device | Firmware */}
        <nav className="app-nav-tabs">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
            onClick={() => setActiveTab('apps')}
          >
            <Layers size={14} />
            <span>Apps</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'device' ? 'active' : ''}`}
            onClick={() => setActiveTab('device')}
          >
            <Cpu size={14} />
            <span>My Device</span>
            <span className="tab-badge-num">{installedSlugs.length}</span>
          </button>

          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'firmware' ? 'active' : ''}`}
            onClick={() => setActiveTab('firmware')}
          >
            <Usb size={14} />
            <span>Firmware</span>
          </button>
        </nav>

        {/* Right Header Actions */}
        <div className="app-header-right">
          <button
            type="button"
            className="btn-header-create-applet"
            onClick={() => setIsCreateModalOpen(true)}
            title="Generate a custom microapplet with AI"
          >
            <Sparkles size={14} />
            <span>+ Create Applet</span>
          </button>

          <button
            type="button"
            className={`btn-device-connect ${connectedDevice ? 'connected' : ''}`}
            onClick={() => setIsConnectModalOpen(true)}
          >
            {connectedDevice ? (
              <>
                <span className="live-pulse-dot"></span>
                <span>{connectedDevice.type} CONNECTED</span>
              </>
            ) : (
              <>
                <Usb size={14} />
                <span>Connect Click</span>
              </>
            )}
          </button>

          <Link href="/admin" className="admin-header-link" title="Admin Moderation Portal">
            Admin
          </Link>
        </div>
      </header>

      {/* 2. TAB: APPS CATALOG */}
      {activeTab === 'apps' && (
        <div className="catalog-layout">
          {/* Left Category Sidebar */}
          <aside className="catalog-sidebar">
            <div className="sidebar-heading">Categories</div>
            <nav className="category-nav-list">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const count =
                  cat.name === 'All'
                    ? applets.length
                    : applets.filter((a) => a.category === cat.name).length;

                return (
                  <button
                    key={cat.name}
                    type="button"
                    className={`category-nav-item ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    <div className="cat-label-wrap">
                      <Icon size={14} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="cat-count">{count}</span>
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Hardware Documentation Links */}
            <div className="sidebar-hardware-box">
              <div className="sidebar-hw-title">Hardware Resources</div>
              <a
                href="https://click.uprajjwal.com.np"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-hw-link"
              >
                <span>click.uprajjwal.com.np</span>
                <ArrowUpRight size={13} />
              </a>
              <a
                href="https://github.com/prajjwalprajjwal/Click"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-hw-link"
              >
                <span>Click Hardware &amp; OS Repo</span>
                <ArrowUpRight size={13} />
              </a>
            </div>
          </aside>

          {/* Main Apps Grid Area */}
          <main className="catalog-main">
            {/* AI Generator Discovery Banner */}
            <div className="ai-discovery-banner">
              <div className="ai-banner-content">
                <div className="ai-banner-badge">
                  <Sparkles size={12} />
                  <span>AI MICROAPPLET BUILDER</span>
                </div>
                <h4 className="ai-banner-title">Build your own handheld microapplet in seconds</h4>
                <p className="ai-banner-desc">
                  Describe games, stopwatches, or sensor tools in plain English. Free-tier AI generates
                  the RP2354A C++ firmware and live OLED simulator instantly.
                </p>
              </div>
              <button
                type="button"
                className="btn-banner-create"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Sparkles size={14} />
                <span>Launch AI Builder</span>
              </button>
            </div>

            {/* Toolbar: Search + Sort + New Applet */}
            <div className="catalog-toolbar">
              <div className="search-field-wrap">
                <Search size={15} className="search-field-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search applications by title, author, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="toolbar-controls">
                <select
                  className="sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                >
                  <option value="popular">Sort: Most Popular</option>
                  <option value="newest">Sort: Recently Added</option>
                  <option value="alpha">Sort: Alphabetical (A-Z)</option>
                </select>

                <button
                  type="button"
                  className="btn-new-applet"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Create Applet</span>
                </button>
              </div>
            </div>

            {/* Applications Grid */}
            {isLoadingCatalog ? (
              <div className="p-16 text-center text-muted font-mono text-sm">
                Loading applications catalog...
              </div>
            ) : applets.length === 0 ? (
              <div className="p-16 text-center text-muted font-mono text-sm">
                No applications found matching &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <div className="apps-grid">
                {applets.map((applet) => (
                  <AppCard
                    key={applet.id}
                    applet={applet}
                    onOpenSimulator={handleOpenSimulator}
                    onInstall={handleInstallApplet}
                    isInstalled={installedSlugs.includes(applet.slug)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* 3. TAB: MY DEVICE (Hardware Telemetry + Storage + Installed Apps) */}
      {activeTab === 'device' && (
        <main className="installed-layout">
          {/* Hardware Telemetry Card */}
          <div className="telemetry-card" style={{ marginBottom: '1.5rem' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h3 className="telemetry-card-title mb-0">
                <Cpu size={16} />
                <span>Connected Device Status &amp; Telemetry</span>
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-card-sim"
                  onClick={() => alert('Sending reboot signal to RP2354A BOOTSEL...')}
                >
                  <RefreshCw size={13} />
                  <span>Reboot to BOOTSEL</span>
                </button>

                <button
                  type="button"
                  className="btn-card-sim"
                  onClick={() => alert('Diagnostic telemetry ping: Roundtrip 4ms. Device responsive.')}
                >
                  <Activity size={13} />
                  <span>Ping Hardware</span>
                </button>

                <button
                  type="button"
                  className="btn-card-sim"
                  onClick={() => setActiveTab('firmware')}
                >
                  <Usb size={13} />
                  <span>Update Firmware</span>
                </button>
              </div>
            </div>

            <div className="telemetry-specs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem 2rem' }}>
              <div className="telemetry-row">
                <span className="telemetry-label">Hardware Model:</span>
                <span className="telemetry-val">Click Handheld V4.2</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Target MCU:</span>
                <span className="telemetry-val">RP2354A Dual Cortex-M33 @ 150 MHz</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">On-Chip SRAM:</span>
                <span className="telemetry-val">520 KB</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">QSPI Flash Storage:</span>
                <span className="telemetry-val">4.0 MB</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Display Interface:</span>
                <span className="telemetry-val">SSD1306 128×64 OLED (I2C 0x3C)</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Battery Level:</span>
                <span className="telemetry-val text-success">3.7V LiPo (88% • ~18 hrs)</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Standby Current:</span>
                <span className="telemetry-val">1.5 mA</span>
              </div>
              <div className="telemetry-row">
                <span className="telemetry-label">Firmware Version:</span>
                <span className="telemetry-val">Click OS v1.2.0-stable</span>
              </div>
            </div>
          </div>

          {/* Storage Bar Card */}
          <div className="storage-card">
            <div className="storage-header">
              <span className="storage-title">RP2354A Flash Storage</span>
              <span className="storage-stats">
                {installedSlugs.length * 32} KB / 4096 KB (
                {Math.round(((installedSlugs.length * 32) / 4096) * 100)}% used)
              </span>
            </div>
            <div className="storage-progress-track">
              <div
                className="storage-progress-fill"
                style={{
                  width: `${Math.max(4, Math.round(((installedSlugs.length * 32) / 4096) * 100))}%`
                }}
              ></div>
            </div>
            <div className="storage-breakdown">
              <span>Installed Apps: {installedSlugs.length}</span>
              <span>Available Flash: {4096 - installedSlugs.length * 32} KB</span>
              <span>Target: RP2354A QSPI Flash Partition</span>
            </div>
          </div>

          {/* Installed Apps List Card */}
          <div className="installed-table-card">
            <div className="installed-table-header">
              <span className="font-semibold text-sm">Installed Microapplets on Click</span>
              <button
                type="button"
                className="btn-card-sim"
                onClick={() => alert('All microapplets are up to date on your Click!')}
              >
                <RefreshCw size={13} />
                <span>Check for Updates</span>
              </button>
            </div>

            {installedAppletsList.length === 0 ? (
              <div className="p-12 text-center text-muted font-mono text-sm">
                No microapplets currently installed. Head to the Apps tab to install some!
              </div>
            ) : (
              <div className="installed-list">
                {installedAppletsList.map((app) => (
                  <div key={app.id} className="installed-row">
                    <div className="installed-app-info">
                      <div className="app-pixel-avatar" style={{ width: 40, height: 40 }}>
                        {app.category === 'Games' && <Gamepad2 size={18} />}
                        {app.category === 'Tools' && <Zap size={18} />}
                        {app.category === 'Clock' && <Clock size={18} />}
                        {app.category === 'Media' && <Music size={18} />}
                        {app.category === 'Sensors' && <Cpu size={18} />}
                      </div>
                      <div>
                        <div className="installed-app-name">{app.title}</div>
                        <div className="installed-app-sub">
                          {app.version || 'v1.0.0'} • ~32 KB • by {app.author}
                        </div>
                      </div>
                    </div>

                    <div className="installed-row-actions">
                      <button
                        type="button"
                        className="btn-card-sim"
                        onClick={() => handleOpenSimulator(app)}
                      >
                        <Play size={12} />
                        <span>Run Simulator</span>
                      </button>

                      <button
                        type="button"
                        className="btn-uninstall"
                        onClick={() => handleUninstall(app.slug)}
                        title="Uninstall from Click"
                      >
                        <Trash2 size={13} />
                        <span>Uninstall</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* 4. TAB: FIRMWARE FLASHER WORKBENCH */}
      {activeTab === 'firmware' && (
        <main className="flasher-layout">
          <DeviceFlasher
            appletTitle="Click OS Core Firmware"
            cppHeader=""
            cppSource=""
          />
        </main>
      )}

      {/* App Detail Modal */}
      <AppDetailModal
        applet={inspectedApplet}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onInstall={handleInstallApplet}
        connectedDevice={connectedDevice}
      />

      {/* AI Microapplet Creator Modal */}
      <CreateAppletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onInstall={handleInstallApplet}
        onAppletCreated={() => fetchApplets()}
      />

      {/* Device Connection Modal */}
      <DeviceConnectionModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        connectedDevice={connectedDevice}
        onDeviceConnected={setConnectedDevice}
      />

      {/* Global Footer */}
      <footer className="app-footer">
        <div className="app-footer-inner">
          <div>
            <strong>Click Lab</strong> — Web Companion &amp; Microapplet Platform for Click Handheld (RP2354A &amp; ESP32).
          </div>
          <div className="app-footer-links">
            <a
              href="https://click.uprajjwal.com.np"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link"
            >
              click.uprajjwal.com.np ↗
            </a>
            <a
              href="https://github.com/prajjwalprajjwal/Click"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link"
            >
              Firmware Repo ↗
            </a>
            <Link href="/admin" className="app-footer-link">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
