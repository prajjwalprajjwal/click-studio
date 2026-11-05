'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Usb,
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import {
  isWebUsbSupported,
  requestPicobootDevice
} from '@/lib/web-flasher';

interface DeviceConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedDevice: {
    type: 'RP2354A';
    name: string;
    serial?: string;
  } | null;
  onDeviceConnected: (device: { type: 'RP2354A'; name: string; serial?: string } | null) => void;
}

export default function DeviceConnectionModal({
  isOpen,
  onClose,
  connectedDevice,
  onDeviceConnected
}: DeviceConnectionModalProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const webUsbOk = isWebUsbSupported();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleConnectRp2354 = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const dev = await requestPicobootDevice();
      onDeviceConnected({
        type: 'RP2354A',
        name: dev.productName || 'Click RP2354A (BOOTSEL)',
        serial: dev.serialNumber || 'RP2354A-USB'
      });
      onClose();
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setErrorMsg(err.message || 'Failed to connect via WebUSB');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleDisconnect = () => {
    onDeviceConnected(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="lab-modal-backdrop" onClick={onClose}>
      <div className="lab-modal-card" onClick={e => e.stopPropagation()}>
        <div className="lab-modal-header">
          <div className="flex items-center gap-2">
            <Usb size={18} className="text-cyan" />
            <span className="lab-modal-title">CONNECT CLICK (RP2354A)</span>
          </div>
          <button
            type="button"
            className="lab-modal-close"
            onClick={onClose}
            aria-label="Close dialog (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        <div className="lab-modal-body">
          {connectedDevice ? (
            <div className="device-connected-banner">
              <div className="flex items-center gap-3">
                <span className="live-dot-green"></span>
                <div>
                  <div className="device-connected-name">{connectedDevice.name}</div>
                  <div className="device-connected-sub">Target: RP2354A • USB-C Ready</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-disconnect-device"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="device-selection-flow">
              <p className="device-help-text">
                Connect your Click handheld via USB-C to install firmware and microapplets directly with zero command line setup.
              </p>

              {errorMsg && (
                <div className="device-error-banner">
                  <XCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="device-connect-options">
                {/* RP2354A Picoboot WebUSB */}
                <div className="device-option-box">
                  <div className="option-header">
                    <Cpu size={18} className="text-cyan" />
                    <span className="option-title">Raspberry Pi RP2354A</span>
                    <span className="option-badge">OFFICIAL HARDWARE</span>
                  </div>
                  <p className="option-desc">
                    High-speed WebUSB Picoboot protocol for direct streaming to RP2354A dual-core flash memory.
                  </p>
                  <div className="option-status">
                    Protocol: {webUsbOk ? (
                      <span className="text-success font-semibold">WebUSB Ready</span>
                    ) : (
                      <span className="text-error font-semibold">Not Supported (Requires Chromium Browser)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-connect-option"
                    onClick={handleConnectRp2354}
                    disabled={isScanning || !webUsbOk}
                  >
                    {isScanning ? <RefreshCw size={14} className="animate-spin" /> : <Usb size={14} />}
                    <span>Connect RP2354 via WebUSB</span>
                  </button>
                </div>
              </div>

              <div className="device-tip-box">
                <span className="tip-title">RP2354A BOOTSEL Tip:</span>
                <span>Hold the BOOTSEL button while connecting the USB-C cable to enter flashing mode (drive appears as RPI-RP2).</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
