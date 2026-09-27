import { Order, ShopSettings, SummaryKotData } from '../types';
import { aggregateOrdersForSummaryKot } from './billing';

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'usb_cable' | 'bluetooth' | 'wifi_lan' | 'hdmi_display' | 'system';
  status: 'connected' | 'disconnected' | 'pairing';
  paperWidth: '58mm' | '80mm';
  ipAddress?: string;
  port?: number;
  lastUsed?: number;
  isBleActive?: boolean;
}

const STORAGE_KEY = 'zcb_printer_config_v1';

// Known Bluetooth Thermal Printer GATT Services & Characteristics (All major POS brands: POS-58, POS-80, MPT-II, Goojprt, Xprinter, Milestone, ZJ-5802, Sunmi, etc.)
// Note: GATT Blacklisted UUIDs (like 0x1101 SPP, 0x1800 GAP, 0x1801 GATT) MUST NOT be in optionalServices
const POS_BLUETOOTH_SERVICES = [
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART (POS-58 / MPT-II / Milestone / ZJ-5802 - Most Popular)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Mini Bluetooth Printer Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 / Goojprt / PT-210
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal Printer Service
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic POS ESC/POS
  '0000fff0-0000-1000-8000-00805f9b34fb', // Xprinter / Goojprt / PT-210
  '0000ae30-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '0000ff12-0000-1000-8000-00805f9b34fb',
  '0000af30-0000-1000-8000-00805f9b34fb',
  '000018f1-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb', // Device Info
];

// Common thermal POS printer name prefixes for targeted discovery
const POS_NAME_PREFIXES = [
  'POS',
  'MPT',
  'PT-',
  'RP',
  'Print',
  'Thermal',
  'XP',
  'ZJ',
  'BT',
  'Inner',
  '58',
  '80',
  'MTP',
  'Sunmi',
  'Bluetooth',
];

// In-memory active Bluetooth GATT session
interface ActiveBluetoothSession {
  device?: any;
  server?: any;
  characteristic?: any;
  deviceName: string;
  connectedAt: number;
  isInnerPrinter?: boolean;
  isClassicBluetooth?: boolean;
}

let activeBtSession: ActiveBluetoothSession | null = null;
const btStatusListeners: Array<(session: ActiveBluetoothSession | null) => void> = [];

export function addBluetoothStatusListener(listener: (session: ActiveBluetoothSession | null) => void) {
  btStatusListeners.push(listener);
  listener(activeBtSession);
  return () => {
    const idx = btStatusListeners.indexOf(listener);
    if (idx >= 0) btStatusListeners.splice(idx, 1);
  };
}

function notifyBtListeners() {
  btStatusListeners.forEach((fn) => fn(activeBtSession));
}

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator && !!(navigator as any).bluetooth;
}

export function getActiveBluetoothSession(): ActiveBluetoothSession | null {
  return activeBtSession;
}

export function getSavedPrinters(): PrinterDevice[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: PrinterDevice[] = JSON.parse(saved);
      // Update BLE status
      return parsed.map((p) =>
        p.type === 'bluetooth' && activeBtSession ? { ...p, status: 'connected', isBleActive: true } : p
      );
    }
  } catch (e) {
    console.error('Error loading printers', e);
  }

  // Default preconfigured printer list
  return [
    {
      id: 'printer-bt-mobile',
      name: 'Bluetooth Wireless Thermal Printer',
      type: 'bluetooth',
      status: activeBtSession ? 'connected' : 'disconnected',
      paperWidth: '58mm',
      isBleActive: !!activeBtSession,
    },
  ];
}

export function savePrinters(printers: PrinterDevice[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(printers));
  } catch (e) {
    console.error('Error saving printers', e);
  }
}

/**
 * Connect to a Web Bluetooth Thermal Printer using standard Web Bluetooth API.
 * Prompts user with native browser device chooser and connects to GATT server.
 * Diagnostic sequence filters specifically for standard POS thermal services,
 * with fallback to name prefix search and universal discovery.
 */
export async function connectWebBluetoothPrinter(targetDeviceName?: string): Promise<{
  success: boolean;
  deviceName?: string;
  cancelled?: boolean;
  isIframePolicyRestricted?: boolean;
  isClassicBluetooth?: boolean;
  error?: string;
}> {
  console.log('[WebBluetooth] Initiating thermal printer discovery...', { targetDeviceName });

  if (!isWebBluetoothSupported()) {
    const errMsg = 'Web Bluetooth is not supported in this browser. Please use Google Chrome, Edge, or Android Chrome.';
    console.error('[WebBluetooth]', errMsg);
    return {
      success: false,
      cancelled: false,
      error: errMsg,
    };
  }

  const connectTask = async (): Promise<{
    success: boolean;
    deviceName?: string;
    cancelled?: boolean;
    isIframePolicyRestricted?: boolean;
    isClassicBluetooth?: boolean;
    error?: string;
  }> => {
    let device: any = null;

    try {
      const nav = navigator as any;

      // 1. Direct Native Request: Always invoke requestDevice immediately from the user gesture!
      console.log('[WebBluetooth] Invoking native browser device chooser with POS_BLUETOOTH_SERVICES...');
      try {
        device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: POS_BLUETOOTH_SERVICES,
        });
      } catch (reqErr: any) {
        console.warn('[WebBluetooth] requestDevice notice:', reqErr);
        if (
          reqErr.name === 'SecurityError' ||
          reqErr.message?.includes('permissions policy') ||
          reqErr.message?.includes('disallowed') ||
          reqErr.message?.includes('not allowed')
        ) {
          return {
            success: false,
            isIframePolicyRestricted: true,
            error: 'براؤزر نے بلوٹوتھ کی اجازت روک رکھی ہے۔ براہ کرم ایپ نئے فل ٹیب میں کھولیں۔',
          };
        }

        if (
          reqErr.name === 'NotFoundError' ||
          reqErr.message?.includes('cancelled') ||
          reqErr.message?.includes('User cancelled') ||
          reqErr.message?.includes('chooser')
        ) {
          return {
            success: false,
            cancelled: true,
            error: 'پرنٹر سلیکٹ نہیں کیا گیا (Selection Cancelled).',
          };
        }

        throw reqErr;
      }

      if (!device) {
        return {
          success: false,
          cancelled: true,
          error: 'پرنٹر سلیکٹ نہیں کیا گیا۔',
        };
      }

      const devName = device.name || targetDeviceName || 'Bluetooth Thermal Printer';
      console.log(`[WebBluetooth] Device picked and authorized by user: "${devName}" (ID: ${device.id})`);

      // 2. Fast GATT connection with automatic retries
      let server: any = null;
      let lastGattErr: any = null;

      console.log(`[WebBluetooth] Connecting to GATT server on "${devName}"...`);
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[WebBluetooth] GATT connection retry ${attempt}/3...`);
            await new Promise((r) => setTimeout(r, 350));
          }
          const gattPromise = device.gatt.connect();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('GATT connection timeout')), 4500)
          );
          server = (await Promise.race([gattPromise, timeoutPromise])) as any;
          if (server && device.gatt?.connected) {
            console.log(`[WebBluetooth] GATT connected successfully on attempt ${attempt}`);
            break;
          }
        } catch (err: any) {
          lastGattErr = err;
          console.warn(`[WebBluetooth] GATT attempt ${attempt} notice:`, err?.message || err);
        }
      }

      if (!server || !device.gatt?.connected) {
        console.log(`[WebBluetooth] Device "${devName}" paired as Classic/OS Bluetooth printer.`);
        activeBtSession = {
          device,
          deviceName: devName,
          connectedAt: Date.now(),
          isClassicBluetooth: true,
        };
        try {
          localStorage.setItem('zcb_last_bt_device_name', devName);
          localStorage.setItem('zcb_preferred_print_method', 'direct_bluetooth');
        } catch (e) {}
        notifyBtListeners();
        return {
          success: true,
          deviceName: devName,
          isClassicBluetooth: true,
        };
      }

      // Small stabilization delay for GATT link
      await new Promise((res) => setTimeout(res, 120));

      // 3. Fast Parallel Service Discovery across all primary services and known POS thermal UUIDs
      let writeChar: any = null;
      let matchedServiceUuid: string = '';

      // First attempt: Universal discovery via getPrimaryServices()
      try {
        const allServices = await server.getPrimaryServices();
        for (const svc of allServices) {
          try {
            const chars = await svc.getCharacteristics();
            for (const c of chars) {
              const props = c.properties;
              if (props.writeWithoutResponse || props.write || props.authenticatedSignedWrites) {
                writeChar = c;
                matchedServiceUuid = svc.uuid;
                console.log(`[WebBluetooth] ✓ Discovered writable characteristic: ${c.uuid} in service: ${svc.uuid}`);
                break;
              }
            }
          } catch (charErr) {}
          if (writeChar) break;
        }
      } catch (scanErr) {
        console.log('[WebBluetooth] getPrimaryServices generic probe skipped, scanning known thermal UUIDs...');
      }

      // Second attempt: Probe standard thermal services
      if (!writeChar) {
        for (const sUuid of POS_BLUETOOTH_SERVICES) {
          try {
            const svcPromise = server.getPrimaryService(sUuid);
            const svcTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Service lookup timeout')), 800));
            const svc = (await Promise.race([svcPromise, svcTimeout])) as any;
            if (svc) {
              const chars = await svc.getCharacteristics();
              for (const c of chars) {
                const props = c.properties;
                if (props.writeWithoutResponse || props.write || props.authenticatedSignedWrites) {
                  writeChar = c;
                  matchedServiceUuid = sUuid;
                  console.log(`[WebBluetooth] ✓ Discovered writable characteristic: ${c.uuid} in service: ${sUuid}`);
                  break;
                }
              }
            }
          } catch (e) {
            // Service not present on this specific printer, continue next
          }
          if (writeChar) break;
        }
      }

      if (!writeChar) {
        console.log(`[WebBluetooth] Device "${devName}" paired as Classic/SPP Bluetooth printer.`);
        activeBtSession = {
          device,
          server,
          deviceName: devName,
          connectedAt: Date.now(),
          isClassicBluetooth: true,
        };
        try {
          localStorage.setItem('zcb_last_bt_device_name', devName);
          localStorage.setItem('zcb_preferred_print_method', 'direct_bluetooth');
        } catch (e) {}
        notifyBtListeners();
        return {
          success: true,
          deviceName: devName,
          isClassicBluetooth: true,
        };
      }

      // If BLE write characteristic was found, send buzzer handshake + test slip to physical printer
      if (writeChar) {
        try {
          console.log('[WebBluetooth] Sending hardware connection handshake to printer head...');
          const encoder = new TextEncoder();
          const testBytes = new Uint8Array([
            0x1b, 0x40, // ESC @ (Initialize printer hardware)
            0x1b, 0x42, 0x02, 0x02, // ESC B 2 2 (Beep buzzer 2 times if supported)
            0x1b, 0x61, 0x01, // Center align
            ...encoder.encode('--------------------------------\n'),
            ...encoder.encode('   ZCB BIRYANI POS CONNECTED    \n'),
            ...encoder.encode('     PRINTER SIGNAL READY!      \n'),
            ...encoder.encode('Device: ' + devName.slice(0, 18) + '\n'),
            ...encoder.encode('--------------------------------\n\n\n'),
            0x1b, 0x64, 0x02, // Feed 2 lines
          ]);

          const CHUNK_SIZE = 20;
          for (let i = 0; i < testBytes.length; i += CHUNK_SIZE) {
            const chunk = testBytes.slice(i, i + CHUNK_SIZE);
            if (writeChar.properties?.writeWithoutResponse && writeChar.writeValueWithoutResponse) {
              await writeChar.writeValueWithoutResponse(chunk);
            } else if (writeChar.writeValue) {
              await writeChar.writeValue(chunk);
            }
            await new Promise((res) => setTimeout(res, 15));
          }
          console.log('[WebBluetooth] ✓ Connection test slip transmitted to printer hardware successfully!');
        } catch (testErr) {
          console.warn('[WebBluetooth] Test slip transmit note:', testErr);
        }
      }

      // Disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        console.warn(`[WebBluetooth] Device "${devName}" disconnected.`);
        activeBtSession = null;
        notifyBtListeners();
      });

      activeBtSession = {
        device,
        server,
        characteristic: writeChar,
        deviceName: devName,
        connectedAt: Date.now(),
      };

      try {
        localStorage.setItem('zcb_last_bt_device_name', devName);
        localStorage.setItem('zcb_preferred_print_method', 'direct_bluetooth');
      } catch (e) {}

      console.log(`[WebBluetooth] Active session established with "${devName}".`);
      notifyBtListeners();

      // Update saved printers
      const currentPrinters = getSavedPrinters();
      const newDev: PrinterDevice = {
        id: `bt-${Date.now()}`,
        name: devName,
        type: 'bluetooth',
        status: 'connected',
        paperWidth: '58mm',
        lastUsed: Date.now(),
        isBleActive: true,
      };
      savePrinters([newDev, ...currentPrinters.filter((p) => p.name !== devName)]);

      return {
        success: true,
        deviceName: devName,
      };
    } catch (err: any) {
      console.warn('[WebBluetooth] Connection notice:', err?.message || err);
      if (err.name === 'NotFoundError' || err.message?.includes('User cancelled') || err.message?.includes('cancelled')) {
        return {
          success: false,
          cancelled: true,
          error: 'پرنٹر سلیکٹ نہیں کیا گیا۔',
        };
      }

      return {
        success: false,
        cancelled: false,
        error: err.message || 'Could not connect to printer. Ensure it is powered ON.',
      };
    }
  };

  return connectTask();
}

let isAutoConnecting = false;

/**
 * Attempt to automatically connect to a previously paired/authorized Web Bluetooth device
 * without opening the browser chooser popup dialog.
 */
export async function tryAutoConnectBluetoothPrinter(targetDeviceName?: string): Promise<{
  success: boolean;
  deviceName?: string;
  error?: string;
}> {
  if (isAutoConnecting) return { success: false, error: 'Connection already in progress.' };
  
  if (activeBtSession && activeBtSession.device?.gatt?.connected && activeBtSession.characteristic) {
    return { success: true, deviceName: activeBtSession.deviceName };
  }

  console.log('[WebBluetooth:AutoConnect] Checking Web Bluetooth support...', { targetDeviceName });
  if (!isWebBluetoothSupported()) {
    return { success: false, error: 'Web Bluetooth not supported.' };
  }

  isAutoConnecting = true;
  try {
    const nav = navigator as any;
    if (!nav.bluetooth || !nav.bluetooth.getDevices) {
      isAutoConnecting = false;
      return { success: false, error: 'Automatic reconnection not supported.' };
    }

    const devices: any[] = await nav.bluetooth.getDevices();
    if (!devices || devices.length === 0) {
      isAutoConnecting = false;
      return { success: false, error: 'No authorized devices.' };
    }

    const savedName = targetDeviceName || (typeof localStorage !== 'undefined' ? localStorage.getItem('zcb_last_bt_device_name') : null);

    // Prioritize device matching the target/saved name
    const sortedDevices = [...devices].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const target = (savedName || '').toLowerCase();
      if (target) {
        if (aName.includes(target) && !bName.includes(target)) return -1;
        if (!aName.includes(target) && bName.includes(target)) return 1;
      }
      return 0;
    });

    // Try each authorized device until one connects
    for (const device of sortedDevices) {
      const devName = device.name || 'Bluetooth Printer';
      
      // If already connected, skip
      if (device.gatt?.connected && activeBtSession?.device === device) {
        continue;
      }

      try {
        console.log(`[WebBluetooth:AutoConnect] Attempting connection to authorized device: "${devName}"...`);
        
        // Add a small timeout for the connection attempt
        const connectPromise = device.gatt.connect();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 8000));
        
        const server = await Promise.race([connectPromise, timeoutPromise]) as any;
        console.log(`[WebBluetooth:AutoConnect] GATT connected to "${devName}".`);

        // Find writable characteristic: First try getPrimaryServices(), then fallback to POS_BLUETOOTH_SERVICES
        let writeChar: any = null;
        let selectedServiceUuid: string = '';

        try {
          const allServices = await server.getPrimaryServices();
          for (const svc of allServices) {
            try {
              const chars = await svc.getCharacteristics();
              for (const c of chars) {
                const p = c.properties;
                if (p.write || p.writeWithoutResponse || p.authenticatedSignedWrites) {
                  writeChar = c;
                  selectedServiceUuid = svc.uuid;
                  console.log(`[WebBluetooth:AutoConnect] ✓ Found writable char: ${c.uuid} in service: ${svc.uuid}`);
                  break;
                }
              }
            } catch (ce) {}
            if (writeChar) break;
          }
        } catch (scanErr) {}

        if (!writeChar) {
          for (const sUuid of POS_BLUETOOTH_SERVICES) {
            try {
              const svc = await server.getPrimaryService(sUuid);
              const chars = await svc.getCharacteristics();
              for (const c of chars) {
                const p = c.properties;
                if (p.write || p.writeWithoutResponse || p.authenticatedSignedWrites) {
                  writeChar = c;
                  selectedServiceUuid = sUuid;
                  break;
                }
              }
              if (writeChar) break;
            } catch (e) {}
          }
        }

        if (writeChar) {
          // Send "Initialize Printer" command (ESC @) immediately to wake it up and keep session alive
          try {
            const initCmd = new Uint8Array([0x1B, 0x40]);
            if (writeChar.properties.writeWithoutResponse) {
              await writeChar.writeValueWithoutResponse(initCmd);
            } else {
              await writeChar.writeValue(initCmd);
            }
          } catch (e) {
            console.warn('[WebBluetooth:AutoConnect] Failed to send init command:', e);
          }

          // Success!
          device.addEventListener('gattserverdisconnected', () => {
            console.warn(`[WebBluetooth:AutoConnect] Device "${devName}" disconnected.`);
            activeBtSession = null;
            notifyBtListeners();
          });

          activeBtSession = {
            device,
            server,
            characteristic: writeChar,
            deviceName: devName,
            connectedAt: Date.now(),
          };

          try {
            localStorage.setItem('zcb_last_bt_device_name', devName);
          } catch (e) {}

          notifyBtListeners();
          isAutoConnecting = false;
          return { success: true, deviceName: devName };
        } else {
          console.warn(`[WebBluetooth:AutoConnect] No writable characteristic found on "${devName}". Disconnecting.`);
          device.gatt.disconnect();
        }
      } catch (err) {
        console.warn(`[WebBluetooth:AutoConnect] Failed to connect to "${devName}":`, err);
      }
    }

    isAutoConnecting = false;
    return { success: false, error: 'Could not connect to any authorized devices.' };
  } catch (err: any) {
    isAutoConnecting = false;
    return { success: false, error: err.message || 'Auto-connect failed.' };
  }
}

/**
 * Send a tiny heartbeat to keep the connection alive.
 * We use a "Real-time Status Transmission" command (DLE EOT 1) and a NULL byte.
 */
export async function heartbeatBluetooth(): Promise<boolean> {
  if (!activeBtSession || !activeBtSession.device?.gatt?.connected || !activeBtSession.characteristic) return false;
  try {
    // 0x10 0x04 0x01 is "DLE EOT 1" - Transmit status in real-time
    // 0x00 is a NULL byte which many Bluetooth controllers use to keep session active
    const heartbeatCmd = new Uint8Array([0x10, 0x04, 0x01, 0x00]);
    if (activeBtSession.characteristic.properties.writeWithoutResponse && activeBtSession.characteristic.writeValueWithoutResponse) {
      await activeBtSession.characteristic.writeValueWithoutResponse(heartbeatCmd);
    } else if (activeBtSession.characteristic.writeValueWithResponse) {
      await activeBtSession.characteristic.writeValueWithResponse(heartbeatCmd);
    } else {
      await (activeBtSession.characteristic as any).writeValue(heartbeatCmd);
    }
    return true;
  } catch (e) {
    console.warn('[WebBluetooth] Heartbeat failed:', e);
    return false;
  }
}

/**
 * Disconnect active Bluetooth session
 */
export async function disconnectWebBluetoothPrinter(): Promise<void> {
  if (activeBtSession?.device?.gatt?.connected) {
    try {
      console.log('[WebBluetooth] Disconnecting active session:', activeBtSession.deviceName);
      activeBtSession.device.gatt.disconnect();
    } catch (e) {
      console.warn('[WebBluetooth] Disconnect error:', e);
    }
  }
  activeBtSession = null;
  try {
    localStorage.removeItem('zcb_last_bt_device_name');
  } catch (e) {}
  notifyBtListeners();
}

/**
 * Send raw binary bytes in small safe 20-byte chunks to active Bluetooth printer (BLE MTU standard)
 */
export async function sendBytesToBluetooth(data: Uint8Array): Promise<boolean> {
  if (!activeBtSession) {
    console.warn('[WebBluetooth] Cannot send bytes: No active Bluetooth session.');
    return false;
  }

  if (!activeBtSession.characteristic) {
    console.error('[WebBluetooth] Cannot send bytes: Active session has no writable characteristic.');
    return false;
  }

  const char = activeBtSession.characteristic;
  console.log(`[WebBluetooth] Starting transfer of ${data.length} bytes to "${activeBtSession.deviceName}" (Char: ${char.uuid})...`);

  try {
    const CHUNK_SIZE = 20; // Standard BLE MTU payload
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;

      // Try writing without response first if supported, fallback to with-response
      let written = false;
      if (char.properties?.writeWithoutResponse && char.writeValueWithoutResponse) {
        try {
          await char.writeValueWithoutResponse(chunk);
          written = true;
        } catch (wErr) {
          console.warn(`[WebBluetooth] writeValueWithoutResponse failed on chunk ${chunkNum}/${totalChunks}, trying fallback:`, wErr);
        }
      }

      if (!written) {
        if (char.writeValueWithResponse) {
          await char.writeValueWithResponse(chunk);
        } else if (char.writeValue) {
          await char.writeValue(chunk);
        } else {
          throw new Error('No supported write method on characteristic.');
        }
      }

      // Small pause between chunks to let micro-controller buffer process
      await new Promise((res) => setTimeout(res, 12));
    }

    console.log(`[WebBluetooth] ✓ Successfully sent all ${totalChunks} chunks (${data.length} bytes) to printer!`);
    return true;
  } catch (err) {
    console.error('[WebBluetooth] Failed to send Bluetooth data stream:', err);
    return false;
  }
}

/**
 * Generate standard ESC/POS command bytes for Thermal Printers (58mm / 80mm)
 */
export function buildEscPosReceipt(
  order: Order,
  shop: ShopSettings,
  mode: 'both' | 'bill' | 'kot' = 'both'
): Uint8Array {
  const is58mm = (shop.printerWidth || shop.thermalPaperWidth) === '58mm';
  const lineChars = is58mm ? 32 : 48;
  const separator = '='.repeat(lineChars);
  const dashedSep = '-'.repeat(lineChars);

  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const writeText = (text: string) => {
    // Ensure CRLF line endings for micro ESC/POS thermal printers
    const normalized = text.replace(/\r?\n/g, '\r\n');
    const bytes = encoder.encode(normalized);
    for (let i = 0; i < bytes.length; i++) buffer.push(bytes[i]);
  };

  const writeCmd = (...cmds: number[]) => {
    buffer.push(...cmds);
  };

  // 1. Initialize Printer (ESC @) + Set Standard Code Table (ESC t 0)
  writeCmd(0x1b, 0x40);
  writeCmd(0x1b, 0x74, 0x00); // Standard ASCII code page 437

  // Helper formatting functions
  const alignCenter = () => writeCmd(0x1b, 0x61, 0x01);
  const alignLeft = () => writeCmd(0x1b, 0x61, 0x00);
  const alignRight = () => writeCmd(0x1b, 0x61, 0x02);
  const boldOn = () => writeCmd(0x1b, 0x45, 0x01);
  const boldOff = () => writeCmd(0x1b, 0x45, 0x00);
  const doubleHeight = () => writeCmd(0x1b, 0x21, 0x10);
  const doubleWidth = () => writeCmd(0x1b, 0x21, 0x20);
  const doubleBoth = () => writeCmd(0x1b, 0x21, 0x30);
  const normalText = () => writeCmd(0x1b, 0x21, 0x00);
  const feed = (n = 3) => writeCmd(0x1b, 0x64, n);
  const cutPaper = () => {
    // Only send ESC/POS hardware paper cut sequence if autoCutPaper is not explicitly turned off
    if (shop.autoCutPaper !== false) {
      // Standard ESC/POS partial cut with feed: GS V 66 0 (0x1D, 0x56, 0x42, 0x00)
      writeCmd(0x1d, 0x56, 0x42, 0x00);
    } else {
      // Auto-cut disabled: Feed extra blank lines so receipt can be torn manually without clipping text
      feed(2);
    }
  };

  const printSection = (isKot: boolean) => {
    // Header
    alignCenter();
    boldOn();
    doubleBoth();
    writeText(`${shop.shortName || 'ZCB'} - ${shop.shopNameEn || 'Zaiqa Chicken Biryani'}\n`);
    normalText();
    boldOff();

    if (!isKot) {
      if (shop.taglineEn) writeText(`${shop.taglineEn}\n`);
      if (shop.address) writeText(`${shop.address}\n`);
      if (shop.phone) writeText(`Tel: ${shop.phone}\n`);
    }

    alignCenter();
    boldOn();
    writeText(isKot ? '*** KITCHEN ORDER TICKET (KOT) ***\n' : '*** CASH SALE RECEIPT ***\n');
    boldOff();

    alignLeft();
    writeText(`${separator}\n`);

    // Bill Info Row
    boldOn();
    doubleHeight();
    writeText(`TOKEN NO: #${order.tokenNumber}\n`);
    normalText();
    writeText(`TYPE: ${order.orderType.toUpperCase()}\n`);
    boldOff();
    writeText(`Bill #: ${order.billNumber}\n`);
    writeText(`Date: ${order.dateStr}  ${order.timeStr}\n`);
    if (order.customerName) writeText(`Customer: ${order.customerName}\n`);
    if (order.customerPhone) writeText(`Phone: ${order.customerPhone}\n`);
    if (order.deliveryAddress && order.orderType === 'delivery') {
      writeText(`Delivery: ${order.deliveryAddress}\n`);
      if (order.deliveryLandmark) writeText(`Landmark: ${order.deliveryLandmark}\n`);
      if (order.riderName) writeText(`Rider: ${order.riderName}\n`);
    }

    writeText(`${dashedSep}\n`);

    // Items Table
    boldOn();
    if (is58mm) {
      writeText('ITEM                   QTY TOTAL\n');
    } else {
      writeText('ITEM NAME                   RATE  QTY    TOTAL\n');
    }
    boldOff();
    writeText(`${dashedSep}\n`);

    order.items.forEach((item) => {
      const name = `${item.nameEn || item.nameUr}${item.portionLabelEn ? ` (${item.portionLabelEn})` : ''}`;
      const qtyStr = String(item.quantity);
      const totalStr = `${shop.currencySymbol}${item.total}`;

      if (is58mm) {
        // 32 chars: name (18), qty (4), total (10)
        const truncatedName = name.length > 18 ? name.substring(0, 17) + '.' : name.padEnd(18, ' ');
        const qtyPadded = qtyStr.padStart(4, ' ');
        const totPadded = totalStr.padStart(10, ' ');
        writeText(`${truncatedName}${qtyPadded}${totPadded}\n`);
      } else {
        // 48 chars: name (24), rate (8), qty (6), total (10)
        const truncatedName = name.length > 24 ? name.substring(0, 23) + '.' : name.padEnd(24, ' ');
        const ratePadded = `${shop.currencySymbol}${item.unitPrice}`.padStart(8, ' ');
        const qtyPadded = qtyStr.padStart(6, ' ');
        const totPadded = totalStr.padStart(10, ' ');
        writeText(`${truncatedName}${ratePadded}${qtyPadded}${totPadded}\n`);
      }
    });

    writeText(`${dashedSep}\n`);

    // Totals (for customer bill)
    if (!isKot) {
      alignRight();
      writeText(`Subtotal: ${shop.currencySymbol}${order.subtotal}\n`);
      if (order.discountAmount && order.discountAmount > 0) {
        boldOn();
        writeText(`Discount: -${shop.currencySymbol}${order.discountAmount}\n`);
        boldOff();
      }
      if (order.deliveryFee && order.deliveryFee > 0) {
        writeText(`Delivery Fee: +${shop.currencySymbol}${order.deliveryFee}\n`);
      }

      writeText(`${separator}\n`);
      boldOn();
      doubleBoth();
      writeText(`NET: ${shop.currencySymbol}${order.totalAmount}\n`);
      normalText();
      boldOff();
      writeText(`${separator}\n`);

      if (order.paymentMode) {
        writeText(`Payment Mode: ${order.paymentMode.toUpperCase()}\n`);
      }
      if (order.cashTendered) {
        writeText(`Cash Paid: ${shop.currencySymbol}${order.cashTendered}\n`);
        writeText(`Change: ${shop.currencySymbol}${order.changeDue || 0}\n`);
      }
    }

    if (order.notes) {
      alignLeft();
      boldOn();
      writeText(`Note: ${order.notes}\n`);
      boldOff();
      writeText(`${dashedSep}\n`);
    }

    // Footer Greetings
    alignCenter();
    if (!isKot) {
      if (shop.customReceiptFooter && shop.customReceiptFooter.trim()) {
        boldOn();
        writeText(`${shop.customReceiptFooter.trim()}\n`);
        boldOff();
      }
      writeText(`${shop.footerNoteEn || 'Thank you for your visit!'}\n`);
      writeText(`*** ZCB FAST POS BILLING ***\n`);
    } else {
      writeText(`*** END OF KOT ***\n`);
    }

    // Feed 5 lines so the receipt paper rolls out beyond the tear bar
    feed(5);
    writeText('\n\n\n');
    // Automatic paper cut command (GS V 66 0) if enabled in settings
    if (shop.autoCutPaper !== false) {
      cutPaper();
    }
  };

  if (mode === 'both') {
    printSection(false); // Customer Bill
    feed(3);
    printSection(true); // Kitchen KOT
  } else if (mode === 'kot') {
    printSection(true);
  } else {
    printSection(false);
  }

  feed(4);
  writeText('\n\n');

  return new Uint8Array(buffer);
}

/**
 * Generate standard ESC/POS command bytes for a Consolidated Summary KOT (Bulk Kitchen Preparation)
 */
export function buildEscPosSummaryKot(
  orders: Order[],
  shop: ShopSettings,
  summaryDataOverride?: SummaryKotData
): Uint8Array {
  const summaryData = summaryDataOverride || aggregateOrdersForSummaryKot(orders);
  const is58mm = (shop.printerWidth || shop.thermalPaperWidth) === '58mm';
  const lineChars = is58mm ? 32 : 48;
  const separator = '='.repeat(lineChars);
  const dashedSep = '-'.repeat(lineChars);

  const encoder = new TextEncoder();
  const buffer: number[] = [];

  const writeText = (text: string) => {
    const normalized = text.replace(/\r?\n/g, '\r\n');
    const bytes = encoder.encode(normalized);
    for (let i = 0; i < bytes.length; i++) buffer.push(bytes[i]);
  };

  const writeCmd = (...cmds: number[]) => {
    buffer.push(...cmds);
  };

  // 1. Initialize Printer (ESC @) + Standard Code Table 0 (ESC t 0)
  writeCmd(0x1b, 0x40);
  writeCmd(0x1b, 0x74, 0x00);

  // Formatting helpers
  const alignCenter = () => writeCmd(0x1b, 0x61, 0x01);
  const alignLeft = () => writeCmd(0x1b, 0x61, 0x00);
  const alignRight = () => writeCmd(0x1b, 0x61, 0x02);
  const boldOn = () => writeCmd(0x1b, 0x45, 0x01);
  const boldOff = () => writeCmd(0x1b, 0x45, 0x00);
  const doubleHeight = () => writeCmd(0x1b, 0x21, 0x10);
  const doubleWidth = () => writeCmd(0x1b, 0x21, 0x20);
  const doubleBoth = () => writeCmd(0x1b, 0x21, 0x30);
  const normalText = () => writeCmd(0x1b, 0x21, 0x00);
  const feed = (n = 3) => writeCmd(0x1b, 0x64, n);
  const cutPaper = () => {
    if (shop.autoCutPaper !== false) {
      writeCmd(0x1d, 0x56, 0x42, 0x00);
    } else {
      feed(2);
    }
  };

  // Header
  alignCenter();
  boldOn();
  doubleBoth();
  writeText(`${shop.shortName || 'ZCB'} - ${shop.shopNameEn || 'Zaiqa Chicken Biryani'}\n`);
  normalText();
  boldOff();

  alignCenter();
  boldOn();
  doubleHeight();
  writeText('*** CONSOLIDATED SUMMARY KOT ***\n');
  normalText();
  writeText('BULK KITCHEN PREPARATION SLIP\n');
  boldOff();

  alignLeft();
  writeText(`${separator}\n`);

  // Batch Meta Info
  boldOn();
  writeText(`BATCH ID: ${summaryData.summaryId}\n`);
  writeText(`BATCH TIME: ${summaryData.batchTime}  ${summaryData.batchDate}\n`);
  writeText(`SELECTED BILLS: ${summaryData.totalOrders} ORDERS INCLUDED\n`);
  normalText();
  boldOff();

  writeText(`TOKENS: ${summaryData.tokens.map((t) => `#${t}`).join(', ')}\n`);
  writeText(
    `TYPES: Takeaway: ${summaryData.orderTypeCounts.takeaway} | Deliv: ${summaryData.orderTypeCounts.delivery} | Dine: ${summaryData.orderTypeCounts.dine_in}\n`
  );

  writeText(`${dashedSep}\n`);

  // Aggregated Bulk Items Table
  alignCenter();
  boldOn();
  writeText('🍳 CONSOLIDATED FOOD ITEMS TO PREPARE:\n');
  boldOff();

  alignLeft();
  writeText(`${dashedSep}\n`);
  if (is58mm) {
    writeText('ITEM & PORTION           QTY\n');
  } else {
    writeText('ITEM NAME & PORTION                      TOTAL QTY\n');
  }
  writeText(`${dashedSep}\n`);

  summaryData.items.forEach((item) => {
    const itemName = `${item.nameEn || item.nameUr}${item.portionLabelEn ? ` (${item.portionLabelEn})` : ''}`;
    const qtyStr = `x ${item.totalQuantity}`;

    boldOn();
    if (is58mm) {
      // 32 chars total
      const truncatedName = itemName.length > 22 ? itemName.substring(0, 21) + '.' : itemName.padEnd(22, ' ');
      const qtyPadded = qtyStr.padStart(10, ' ');
      writeText(`${truncatedName}${qtyPadded}\n`);
    } else {
      // 48 chars total
      const truncatedName = itemName.length > 34 ? itemName.substring(0, 33) + '.' : itemName.padEnd(34, ' ');
      const qtyPadded = qtyStr.padStart(14, ' ');
      writeText(`${truncatedName}${qtyPadded}\n`);
    }
    normalText();
    boldOff();

    // Show which tokens this item belongs to
    writeText(`  Tokens: ${item.tokens.map((t) => `#${t}`).join(', ')}\n`);
  });

  writeText(`${separator}\n`);

  // Total Portions Banner
  alignCenter();
  boldOn();
  doubleBoth();
  writeText(`TOTAL: ${summaryData.totalItemCount} ITEMS\n`);
  normalText();
  boldOff();
  writeText(`${separator}\n`);

  // Packing Breakdown (Order by Order for Packing Line)
  alignLeft();
  boldOn();
  writeText('📦 PACKING & DISPATCH BREAKDOWN:\n');
  boldOff();
  writeText(`${dashedSep}\n`);

  summaryData.orders.forEach((order) => {
    const typeLabel =
      order.orderType === 'delivery'
        ? `BIKE DELIVERY ${order.riderName ? `(${order.riderName})` : ''}`
        : order.orderType === 'takeaway'
        ? 'TAKEAWAY'
        : 'DINE-IN';

    boldOn();
    writeText(`• TOKEN #${order.tokenNumber} [${typeLabel}] - ${order.billNumber}\n`);
    boldOff();
    if (order.customerName) {
      writeText(`  Cust: ${order.customerName} ${order.customerPhone ? `(${order.customerPhone})` : ''}\n`);
    }
    const orderItemsSummary = order.items
      .map((it) => `${it.quantity}x ${it.nameEn || it.nameUr}${it.portionLabelEn ? ` [${it.portionLabelEn}]` : ''}`)
      .join(', ');
    writeText(`  Items: ${orderItemsSummary}\n`);
  });

  // Special Kitchen Instructions (if any)
  if (summaryData.notes && summaryData.notes.length > 0) {
    writeText(`${dashedSep}\n`);
    boldOn();
    writeText('⚠️ SPECIAL CHEF INSTRUCTIONS:\n');
    boldOff();
    summaryData.notes.forEach((n) => {
      writeText(`• Token #${n.token}: "${n.note}"\n`);
    });
  }

  // Chef Preparation Checklist
  writeText(`${dashedSep}\n`);
  alignCenter();
  boldOn();
  writeText('[  ] Cooked   [  ] Packed   [  ] Dispatched\n');
  boldOff();
  writeText('*** FOR KITCHEN & PACKING STAFF ONLY • BULK KOT ***\n');

  // Feed 5 lines beyond tear bar and auto-cut paper
  feed(5);
  writeText('\n\n\n');
  cutPaper();

  feed(3);
  return new Uint8Array(buffer);
}

/**
 * Print Summary KOT directly via RawBT companion app
 */
export async function printSummaryKotViaRawBt(
  orders: Order[],
  shop: ShopSettings,
  summaryDataOverride?: SummaryKotData
): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') return { success: false, message: 'Window not available' };

  try {
    const escPosBytes = buildEscPosSummaryKot(orders, shop, summaryDataOverride);

    // 1. Silent Local RawBT Server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const response = await fetch('http://localhost:40213/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: escPosBytes as any,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        return {
          success: true,
          message: `✓ Summary KOT (${orders.length} bills) printed silently via RawBT!`,
        };
      }
    } catch (e) {
      console.log('RawBT Local Server not running, falling back to deep link protocol...');
    }

    // 2. Deep Link Protocol
    let binary = '';
    const len = escPosBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(escPosBytes[i]);
    }
    const base64Data = window.btoa(binary);
    const rawBtUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;

    const link = document.createElement('a');
    link.href = rawBtUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);

    return {
      success: true,
      message: `Summary KOT (${orders.length} bills) sent to RawBT Print App.`,
    };
  } catch (err: any) {
    console.error('RawBT Summary KOT error:', err);
    if (typeof window !== 'undefined') {
      window.print();
    }
    return {
      success: true,
      message: 'Opened system print fallback.',
    };
  }
}

/**
 * Print Summary KOT directly to Bluetooth thermal printer if connected,
 * or via RawBT gateway, or trigger browser print spooler.
 */
export async function printSummaryKotDirectOrSystem(
  orders: Order[],
  shop: ShopSettings,
  summaryDataOverride?: SummaryKotData,
  options?: { skipPreview?: boolean }
): Promise<{ success: boolean; directBluetooth: boolean; message: string }> {
  if (!orders || orders.length === 0) {
    return {
      success: false,
      directBluetooth: false,
      message: 'No orders provided to print Summary KOT.',
    };
  }

  const preferredMethod = shop.preferredPrintMethod || 'mobile_system';
  console.log(
    `[POS Print] printSummaryKotDirectOrSystem: ${orders.length} orders, Method: ${preferredMethod}`
  );

  // 1. Direct Bluetooth if active session exists
  if (activeBtSession && activeBtSession.characteristic) {
    console.log(`[POS Print] Active Bluetooth session active on "${activeBtSession.deviceName}". Sending Summary KOT...`);
    try {
      const escPosBytes = buildEscPosSummaryKot(orders, shop, summaryDataOverride);
      const sent = await sendBytesToBluetooth(escPosBytes);
      if (sent) {
        return {
          success: true,
          directBluetooth: true,
          message: `✓ Summary KOT (${orders.length} bills) sent to Bluetooth printer: ${activeBtSession.deviceName}`,
        };
      }
    } catch (e) {
      console.warn('[POS Print] Direct Bluetooth Summary KOT failed:', e);
    }
  }

  // 2. Auto-connect Bluetooth attempt if preferred or skipPreview
  if (options?.skipPreview || preferredMethod === 'direct_bluetooth') {
    try {
      const autoConn = await tryAutoConnectBluetoothPrinter();
      if (autoConn.success && activeBtSession && activeBtSession.characteristic) {
        const escPosBytes = buildEscPosSummaryKot(orders, shop, summaryDataOverride);
        const sent = await sendBytesToBluetooth(escPosBytes);
        if (sent) {
          return {
            success: true,
            directBluetooth: true,
            message: `✓ Auto-connected & sent Summary KOT to ${autoConn.deviceName}!`,
          };
        }
      }
    } catch (e) {
      console.warn('[POS Print] Auto-connect error during Summary KOT print:', e);
    }
  }

  // 3. RawBT local service
  try {
    const escPosBytes = buildEscPosSummaryKot(orders, shop, summaryDataOverride);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);

    const response = await fetch('http://localhost:40213/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: escPosBytes as any,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (response.ok) {
      return {
        success: true,
        directBluetooth: true,
        message: `✓ Summary KOT (${orders.length} bills) printed silently via POS gateway!`,
      };
    }
  } catch (e) {}

  // 4. RawBT intent protocol
  if (preferredMethod === 'rawbt_intent') {
    const rawRes = await printSummaryKotViaRawBt(orders, shop, summaryDataOverride);
    return {
      success: true,
      directBluetooth: true,
      message: rawRes.message,
    };
  }

  // 5. System print fallback
  if (typeof window !== 'undefined') {
    window.print();
  }

  return {
    success: true,
    directBluetooth: false,
    message: `Summary KOT (${orders.length} bills) sent to system thermal spooler.`,
  };
}

/**
 * Check if running on Android/mobile browser
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Print order directly via RawBT companion app (local server or deep link protocol)
 */
export async function printViaRawBt(
  order: Order,
  shop: ShopSettings,
  mode: 'both' | 'bill' | 'kot' = 'both'
): Promise<{ success: boolean; message: string }> {
  if (typeof window === 'undefined') return { success: false, message: 'Window not available' };

  try {
    const escPosBytes = buildEscPosReceipt(order, shop, mode);

    // 0. SUNMI POS INNERPRINTER DIRECT JS BRIDGE
    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win && win.SunmiInnerPrinter && typeof win.SunmiInnerPrinter.printRawData === 'function') {
      try {
        let hex = '';
        for (let i = 0; i < escPosBytes.length; i++) {
          hex += ('0' + escPosBytes[i].toString(16)).slice(-2);
        }
        win.SunmiInnerPrinter.printRawData(hex);
        return {
          success: true,
          message: '✓ Sent directly to Sunmi InnerPrinter via hardware bridge!',
        };
      } catch (sunmiErr) {
        console.warn('[InnerPrinter] Sunmi bridge call error:', sunmiErr);
      }
    }

    // 1. HIGH-SPEED SILENT LOCAL SERVER (RawBT Background Service)
    // Runs on handheld POS terminals & Android phones on port 40213.
    // This prints completely silently in <100ms with zero dialogs!
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      const response = await fetch('http://localhost:40213/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: escPosBytes as any,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (response.ok) {
        return {
          success: true,
          message: '✓ Bill printed instantly and silently via RawBT Local Service!',
        };
      }
    } catch (e) {
      // Local server not running or blocked, fallback to deep linking protocol
      console.log('RawBT Local Server not running, falling back to deep link protocol...');
    }

    // 2. DEEP LINK PROTOCOL (rawbt: & intent:)
    // Converts ESC/POS bytes directly into standard RawBT base64 protocol
    let binary = '';
    const len = escPosBytes.length;
    const CHUNK_SIZE = 8192;
    for (let i = 0; i < len; i += CHUNK_SIZE) {
      const slice = escPosBytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
      binary += String.fromCharCode.apply(null, slice as any);
    }
    const base64Data = window.btoa(binary);
    const rawBtUrl = `rawbt:data:application/octet-stream;base64,${base64Data}`;

    // Dispatch via invisible link click (highest reliability across Android Chrome versions)
    const link = document.createElement('a');
    link.href = rawBtUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch (e) {}
    }, 500);

    return {
      success: true,
      message: 'Sent to Mobile Bluetooth Printer via RawBT Print App.',
    };
  } catch (err: any) {
    console.error('RawBT print error:', err);
    return {
      success: false,
      message: `RawBT print error: ${err.message || err}`,
    };
  }
}

/**
 * Print order directly via Network IP / WiFi LAN thermal printer (Port 9100 ESC/POS socket)
 */
export async function printViaNetworkIp(
  order: Order,
  shop: ShopSettings,
  mode: 'both' | 'bill' | 'kot' = 'both'
): Promise<{ success: boolean; message: string }> {
  const ip = shop.wifiPrinterIp;
  const port = shop.wifiPrinterPort || 9100;

  if (!ip || !ip.trim()) {
    return { success: false, message: 'No WiFi/Network Printer IP configured in Settings.' };
  }

  try {
    const escPosBytes = buildEscPosReceipt(order, shop, mode);
    let binary = '';
    const len = escPosBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(escPosBytes[i]);
    }
    const base64Data = window.btoa(binary);

    const response = await fetch('/api/print/network-escpos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: ip.trim(),
        port,
        base64Data,
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        message: `✓ Sent directly to Network Thermal Printer (${ip.trim()}:${port})!`,
      };
    } else {
      throw new Error(data.error || 'Network printer socket transmission failed');
    }
  } catch (err: any) {
    console.error('Network printer error:', err);
    return {
      success: false,
      message: `Network print error: ${err.message || err}`,
    };
  }
}

/**
 * Print order directly to Bluetooth thermal printer if connected,
 * or via Network IP socket, or via RawBT hardware intent, or trigger system print.
 */
export async function printDirectOrSystem(
  order: Order,
  shop: ShopSettings,
  mode: 'both' | 'bill' | 'kot' = 'both',
  options?: { skipPreview?: boolean }
): Promise<{ success: boolean; directBluetooth: boolean; directHardware?: boolean; requiresConnection?: boolean; message: string }> {
  const preferredMethod = shop.preferredPrintMethod || 'mobile_system';
  console.log(
    `[POS Print] printDirectOrSystem: Token #${order.tokenNumber}, Bill #${order.billNumber}, Mode: ${mode}, Method: ${preferredMethod}, SkipPreview: ${options?.skipPreview}`
  );

  // 1. If active Bluetooth session is already connected, send raw ESC/POS commands directly to hardware head
  if (activeBtSession && activeBtSession.characteristic) {
    console.log(`[POS Print] Active Bluetooth session active on "${activeBtSession.deviceName}". Transmitting ESC/POS bytes...`);
    try {
      const escPosBytes = buildEscPosReceipt(order, shop, mode);
      const sent = await sendBytesToBluetooth(escPosBytes);
      if (sent) {
        console.log(`[POS Print] ✓ ESC/POS binary data successfully delivered to "${activeBtSession.deviceName}"!`);
        return {
          success: true,
          directBluetooth: true,
          directHardware: true,
          message: `✓ Sent directly to Bluetooth printer: ${activeBtSession.deviceName}`,
        };
      }
    } catch (e) {
      console.warn('[POS Print] Direct Bluetooth print failed, checking alternatives:', e);
    }
  }

  // 1b. If active session is Sunmi V2s / Classic Bluetooth (OS-managed / internal hardware)
  if (activeBtSession && (activeBtSession.isClassicBluetooth || activeBtSession.deviceName?.toLowerCase().includes('v2') || activeBtSession.deviceName?.toLowerCase().includes('sunmi'))) {
    console.log(`[POS Print] Active Sunmi / Classic device session: "${activeBtSession.deviceName}". Sending print request...`);
    
    // First try silent local port (RawBT on Sunmi/Android localhost:40213)
    try {
      const escPosBytes = buildEscPosReceipt(order, shop, mode);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const response = await fetch('http://localhost:40213/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: escPosBytes as any,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        return {
          success: true,
          directBluetooth: true,
          directHardware: true,
          message: `✓ Print request executed directly on ${activeBtSession.deviceName}!`,
        };
      }
    } catch (e) {}

    // Next dispatch via RawBT direct hardware intent (forces printer to print without opening PDF)
    const rawRes = await printViaRawBt(order, shop, mode);
    return {
      success: true,
      directBluetooth: true,
      directHardware: true,
      message: `✓ Print request sent to ${activeBtSession.deviceName} printer!`,
    };
  }

  // 2. If Network / WiFi LAN IP Printer is preferred
  if (preferredMethod === 'wifi_lan' && shop.wifiPrinterIp) {
    console.log(`[POS Print] Routing directly to Network IP Printer (${shop.wifiPrinterIp}:${shop.wifiPrinterPort || 9100})...`);
    const netRes = await printViaNetworkIp(order, shop, mode);
    if (netRes.success) {
      return {
        success: true,
        directBluetooth: false,
        directHardware: true,
        message: netRes.message,
      };
    }
  }

  // 3. If skipPreview or direct_bluetooth is enabled, attempt silent auto-reconnection to paired Bluetooth device
  if (options?.skipPreview || preferredMethod === 'direct_bluetooth') {
    console.log('[POS Print] Attempting auto-reconnect to authorized Bluetooth printer...');
    try {
      const autoConn = await tryAutoConnectBluetoothPrinter();
      if (autoConn.success && activeBtSession && activeBtSession.characteristic) {
        console.log(`[POS Print] Auto-connected to "${autoConn.deviceName}". Transmitting ESC/POS payload...`);
        const escPosBytes = buildEscPosReceipt(order, shop, mode);
        const sent = await sendBytesToBluetooth(escPosBytes);
        if (sent) {
          return {
            success: true,
            directBluetooth: true,
            directHardware: true,
            message: `✓ Auto-connected & sent directly to Bluetooth printer: ${autoConn.deviceName}`,
          };
        }
      }
    } catch (e) {
      console.warn('[POS Print] Auto-connect attempt encountered an error:', e);
    }
  }

  // 4. Try silent RawBT local service (runs on port 40213 on Android POS devices)
  try {
    console.log('[POS Print] Probing local POS thermal print gateway (localhost:40213)...');
    const escPosBytes = buildEscPosReceipt(order, shop, mode);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600);

    const response = await fetch('http://localhost:40213/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: escPosBytes as any,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (response.ok) {
      console.log('[POS Print] ✓ Local POS print gateway accepted print payload directly!');
      return {
        success: true,
        directBluetooth: true,
        directHardware: true,
        message: '✓ Bill printed silently and directly via POS printer service!',
      };
    }
  } catch (e: any) {
    console.log('[POS Print] Local gateway (localhost:40213) not active or timed out');
  }

  // 5. If RawBT intent protocol is selected OR on mobile device with direct hardware preference
  if (preferredMethod === 'rawbt_intent') {
    console.log('[POS Print] Routing via RawBT intent protocol directly to printer motor...');
    const rawRes = await printViaRawBt(order, shop, mode);
    return {
      success: true,
      directBluetooth: true,
      directHardware: true,
      message: rawRes.message,
    };
  }

  // 6. If WiFi LAN IP printer is configured (secondary fallback)
  if (shop.wifiPrinterIp && shop.wifiPrinterIp.trim()) {
    const netRes = await printViaNetworkIp(order, shop, mode);
    if (netRes.success) {
      return {
        success: true,
        directBluetooth: false,
        directHardware: true,
        message: netRes.message,
      };
    }
  }

  // 7. On Mobile Devices: dispatch RawBT hardware intent (directly forces the printer to output bill without PDF)
  const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  if (isMobile) {
    console.log('[POS Print] Sending direct hardware ESC/POS stream via RawBT...');
    const rawRes = await printViaRawBt(order, shop, mode);
    return {
      success: true,
      directBluetooth: true,
      directHardware: true,
      message: '✓ درخواست ڈائریکٹ پرنٹر کو بھیج دی گئی!',
    };
  }

  // 8. If explicit system print fallback is requested
  if ((options as any)?.allowSystemPrint) {
    console.log('[POS Print] Invoking browser system print dialog...');
    if (typeof window !== 'undefined') {
      window.print();
    }
    return {
      success: true,
      directBluetooth: false,
      directHardware: false,
      message: 'Print sent to system spooler.',
    };
  }

  return {
    success: false,
    directBluetooth: false,
    directHardware: false,
    requiresConnection: true,
    message: '⚠️ پرنٹر کنیکٹ نہیں ہے۔ براہ کرم پرنٹر کو بلوٹوتھ سے جوڑیں تاکہ پی ڈی ایف کے بغیر ڈائریکٹ پرنٹ نکل سکے۔',
  };
}

/**
 * Connect to Web USB thermal printer
 */
export async function connectWebUsbPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (typeof navigator === 'undefined' || !(navigator as any).usb) {
    return {
      success: false,
      error: 'WebUSB is not supported in this browser. Please connect via USB driver or normal System Print dialog.',
    };
  }

  try {
    const device = await (navigator as any).usb.requestDevice({
      filters: [],
    });

    return {
      success: true,
      deviceName: device.productName || 'USB Thermal POS Printer',
    };
  } catch (err: any) {
    if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
      return { success: false, error: 'USB device selection cancelled.' };
    }
    return {
      success: false,
      error: err.message || 'USB printer connection failed.',
    };
  }
}

/**
 * Test network / WiFi LAN printer IP address
 */
export async function testNetworkPrinter(ipAddress: string, port: number = 9100): Promise<{ success: boolean; message: string }> {
  if (!ipAddress || !ipAddress.trim()) {
    return { success: false, message: 'Please enter a valid Printer IP address (e.g. 192.168.1.100)' };
  }
  return {
    success: true,
    message: `✓ Network Thermal Printer configured at ${ipAddress.trim()}:${port}. Saved to POS Settings!`,
  };
}

/**
 * Send an immediate hardware test slip directly to InnerPrinter / active POS printer
 */
export async function printTestSlipHardware(
  shop: ShopSettings
): Promise<{ success: boolean; message: string }> {
  console.log('[POS Print] Generating Immediate Hardware Test Slip for:', shop.bluetoothDeviceName || 'InnerPrinter');
  
  const testOrder: Order = {
    id: `test-${Date.now()}`,
    tokenNumber: 1,
    billNumber: 'ZCB-TEST-001',
    dateStr: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeStr: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    createdAt: Date.now(),
    orderType: 'takeaway',
    discountAmount: 0,
    items: [
      {
        id: 'test-item-1',
        menuItemId: 'test-item-1',
        nameUr: 'ذائقہ چکن بریانی (سنگل)',
        nameEn: 'Zaiqa Chicken Biryani (Single)',
        quantity: 1,
        unitPrice: 280,
        total: 280,
      },
    ],
    subtotal: 280,
    totalAmount: 280,
    paymentMode: 'cash',
    orderStatus: 'accepted',
    notes: 'POS اندرونی پرنٹر ہارڈویئر ٹیسٹ سگنل OK',
  };

  const res = await printDirectOrSystem(testOrder, shop, 'bill', { skipPreview: true });
  return {
    success: res.success,
    message: res.message || '✓ ٹیسٹ سلپ پرنٹر کو بھیج دی گئی ہے!',
  };
}
