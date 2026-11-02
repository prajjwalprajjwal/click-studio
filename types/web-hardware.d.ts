// Ambient type declarations for WebUSB, WebSerial, and Node 24 native SQLite

declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(location: string, options?: any);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    all(...params: any[]): any[];
    get(...params: any[]): any;
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  }
}

interface USBDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  configuration: any;
  configurations: any[];
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  controlTransferIn(setup: any, length: number): Promise<any>;
  controlTransferOut(setup: any, data?: BufferSource): Promise<any>;
  transferIn(endpointNumber: number, length: number): Promise<any>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<any>;
}

interface USB {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number }> }): Promise<USBDevice>;
}

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

interface Navigator {
  usb?: USB;
  serial?: {
    getPorts(): Promise<SerialPort[]>;
    requestPort(options?: any): Promise<SerialPort>;
  };
}
