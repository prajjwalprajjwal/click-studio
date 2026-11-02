import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Click Studio — Handheld Microapplet Platform & Web Flasher',
  description: 'AI-powered microapplet generator, 128x64 OLED simulator, and browser-based WebUSB/WebSerial flasher for the Click open-source handheld (RP2354A & ESP32).',
  keywords: [
    'Click',
    'RP2354',
    'RP2350',
    'ESP32',
    'OLED Simulator',
    'Microapplet',
    'WebUSB Picoboot',
    'WebSerial',
    'Handheld Console',
    'Gemini AI'
  ],
  authors: [{ name: 'Click Community' }]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
