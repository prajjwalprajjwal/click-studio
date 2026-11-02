'use client';

import React, { useState, useEffect } from 'react';
import {
  Usb,
  Cpu,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  Radio,
  ExternalLink
} from 'lucide-react';
import {
  isWebUsbSupported,
  isWebSerialSupported,
  findConnectedPicobootDevice,
  requestPicobootDevice,
  requestSerialPort,
  PICOBOOT_VID
} from '@/lib/web-flasher';

interface DeviceConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectedDevice: {
    type: 'RP2354A' | 'ESP32';
    name: string;
    serial?: string;
  } | null;
  onDeviceConnected: (device: { type: 'RP2354A' | 'ESP32'; name: string; serial?: string } | null) => void;
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
  const webSerialOk = isWebSerialSupported();

  const handleConnectRp2354 = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const dev = await requestPicobootDevice();
      onDeviceConnected({
        type: 'RP2354A',
        name: dev.productName || 'Click RP2354A (BOOTSEL)',
        serial: dev.serialNumber || 'USB-BOOTSEL'
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

  const handleConnectEsp32 = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const port = await requestSerialPort();
      onDeviceConnected({
        type: 'ESP32',
        name: 'Click ESP32 (460,800 baud)',
        serial: 'Serial Port COM/tty'
      });
      onClose();
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setErrorMsg(err.message || 'Failed to connect via WebSerial');
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
            <span className="lab-modal-title">CONNECT CLICK HARDWARE</span>
          </div>
          <button type="button" className="lab-modal-close" onClick={onClose}>
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
                  <div className="device-connected-sub">Target: {connectedDevice.type} • USB-C Ready</div>
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
                Connect your Click handheld via USB-C to install microapplets directly with zero command line or drivers.
              </p>

              {errorMsg && (
                <div className="device-error-banner">
                  <XCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="device-connect-options">
                {/* RP2354A Picoboot */}
                <div className="device-option-box">
                  <div className="option-header">
                    <Cpu size={18} className="text-cyan" />
                    <span className="option-title">Raspberry Pi RP2354A</span>
                    <span className="option-badge">RECOMMENDED</span>
                  </div>
                  <p className="option-desc">
                    High-speed WebUSB Picoboot protocol for instant UF2 binary streaming.
                  </p>
                  <div className="option-status">
                    Protocol: {webUsbOk ? <span className="text-success">WebUSB Ready</span> : <span className="text-error">Not Supported (Use Chrome/Edge)</span>}
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

                {/* ESP32 WebSerial */}
                <div className="device-option-box">
                  <div className="option-header">
                    <Zap size={18} className="text-amber" />
                    <span className="option-title">Espressif ESP32-S3 / ESP32</span>
                    <span className="option-badge">SERIAL</span>
                  </div>
                  <p className="option-desc">
                    WebSerial bootloader connection streaming firmware at 460,800 turbo baud.
                  </p>
                  <div className="option-status">
                    Protocol: {webSerialOk ? <span className="text-success">WebSerial Ready</span> : <span className="text-error">Not Supported</span>}
                  </div>
                  <button
                    type="button"
                    className="btn-connect-option secondary"
                    onClick={handleConnectEsp32}
                    disabled={isScanning || !webSerialOk}
                  >
                    {isScanning ? <RefreshCw size={14} className="animate-spin" /> : <Radio size={14} />}
                    <span>Connect ESP32 via Serial</span>
                  </button>
                </div>
              </div>

              <div className="device-tip-box">
                <span className="tip-title">BOOTSEL Tip:</span>
                <span>If using RP2354, hold the BOOTSEL button while inserting the USB cable to enter flashing mode.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
