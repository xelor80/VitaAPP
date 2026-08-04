/**
 * HBandProvider — Echter Provider auf Basis der Native-Bridge `NativeModules.HBandBridge`.
 *
 * Läuft nur in EAS Dev-Client / Prod-Builds (nicht in Expo Go — dort greift
 * automatisch der DemoProvider via Fallback in `wearable/index.ts`).
 *
 * Phase A (aktiv):   scan, stopScan
 * Phase B (kommt):   connect + confirmPassword + syncPersonInfo, readBattery, disconnect
 * Phase C (kommt):   startRealtimeMeasurement für HR/SpO2/HRV/ECG
 * Phase D (kommt):   synchronizeHealthData (Historie)
 */
import { NativeModules, NativeEventEmitter } from 'react-native';
import type {
  WearableProvider, DiscoveredDevice, DeviceInfo, SyncResult,
  RealtimeMetric, RealtimeSample, UserWearableSettings, FirmwareUpdateResult,
  DeviceCapabilities,
} from './types';
import { MECOLY_E500_CAPABILITIES } from './types';

const Native: any = (NativeModules as any).HBandBridge;
const emitter: NativeEventEmitter | null = Native ? new NativeEventEmitter(Native) : null;

export function isNativeBridgeAvailable(): boolean {
  return Boolean(Native && typeof Native.startScan === 'function');
}

const EVT = {
  SCAN_RESULT: 'HBand:scanResult',
  SCAN_STOPPED: 'HBand:scanStopped',
  CONN_STATE: 'HBand:connectionState',
  REALTIME: 'HBand:realtimeSample',
  ECG_WAVE: 'HBand:ecgWaveform',
  ECG_HR: 'HBand:ecgHeartRate',
  ERROR: 'HBand:error',
};

export class HBandProvider implements WearableProvider {
  readonly name = 'hband';
  readonly isDemo = false;

  private initialized = false;
  private currentDevice: DeviceInfo | null = null;
  private rtCallbacks: ((s: RealtimeSample) => void)[] = [];
  private rtSubs: { remove: () => void }[] = [];

  private async ensureInit(): Promise<boolean> {
    if (this.initialized) return true;
    if (!isNativeBridgeAvailable()) return false;
    try {
      const res = await Native.init();
      this.initialized = Boolean(res?.ok);
      return this.initialized;
    } catch {
      return false;
    }
  }

  /* Scan --------------------------------------------------------------- */

  async *scanDevices(): AsyncIterable<DiscoveredDevice> {
    if (!(await this.ensureInit()) || !emitter) return;

    // Permissions vom Native lesen — den eigentlichen Runtime-Prompt macht
    // die Onboarding-UI via PermissionsAndroid.
    try {
      const perm = await Native.requestPermissions();
      if (!perm?.granted) {
        // Weiter probieren — Manche Geräte scannen trotzdem
      }
      const btOn = await Native.isBluetoothEnabled();
      if (!btOn) {
        throw new Error('Bluetooth ist ausgeschaltet. Bitte aktiviere Bluetooth in den Einstellungen.');
      }
    } catch (e: any) {
      // Wenn Permissions/BT-Check fehlschlagen, werfen wir den Fehler weiter
      throw new Error(e?.message || 'Bluetooth-Zugriff nicht möglich.');
    }

    const queue: DiscoveredDevice[] = [];
    let resolveNext: ((d: DiscoveredDevice | null) => void) | null = null;
    let done = false;

    const sub1 = emitter.addListener(EVT.SCAN_RESULT, (raw: any) => {
      const dev: DiscoveredDevice = {
        id: String(raw.id),
        name: String(raw.name || 'Unbekanntes Gerät'),
        provider: 'hband',
        model: raw.model,
        rssi: typeof raw.rssi === 'number' ? raw.rssi : undefined,
      };
      if (resolveNext) { const r = resolveNext; resolveNext = null; r(dev); }
      else queue.push(dev);
    });
    const sub2 = emitter.addListener(EVT.SCAN_STOPPED, () => {
      done = true;
      if (resolveNext) { const r = resolveNext; resolveNext = null; r(null); }
    });

    try {
      await Native.startScan();
      while (!done || queue.length > 0) {
        if (queue.length > 0) { yield queue.shift()!; continue; }
        const next = await new Promise<DiscoveredDevice | null>(res => { resolveNext = res; });
        if (!next) break;
        yield next;
      }
    } finally {
      sub1.remove(); sub2.remove();
    }
  }

  async stopScan() {
    if (!isNativeBridgeAvailable()) return;
    try { await Native.stopScan(); } catch {}
  }

  /* Connect / Auth ----------------------------------------------------- */

  async connect(deviceId: string): Promise<DeviceInfo> {
    // Phase B: implementiert den Connect+Auth+SyncPersonInfo-Flow.
    // Bis dahin liefern wir einen NotImplemented-Error mit klarer Message.
    if (!isNativeBridgeAvailable()) {
      throw new Error('HBand-Native-Bridge nicht verfügbar (nur in Dev-/Prod-Builds).');
    }
    try {
      await Native.connect(deviceId);
    } catch (e: any) {
      if (e?.code === 'NOT_IMPLEMENTED') {
        throw new Error('Connect wird in der nächsten Phase (B) implementiert. Aktuell nur Scan verfügbar.');
      }
      throw e;
    }
    // Placeholder DeviceInfo — wird in Phase B durch echten Payload ersetzt
    const info: DeviceInfo = {
      id: deviceId,
      provider: 'hband',
      model: 'Mecoly E500',
      capabilities: MECOLY_E500_CAPABILITIES as DeviceCapabilities,
    };
    this.currentDevice = info;
    return info;
  }

  async reconnect() { return this.currentDevice; }

  async disconnect() {
    if (!isNativeBridgeAvailable()) return;
    try { await Native.disconnect(); } catch {}
  }

  async unpair() { await this.disconnect(); this.currentDevice = null; }

  async getDeviceInformation(): Promise<DeviceInfo> {
    if (!this.currentDevice) throw new Error('Kein Band verbunden.');
    return this.currentDevice;
  }

  async getBatteryLevel(): Promise<number> {
    if (!isNativeBridgeAvailable()) throw new Error('Bridge nicht verfügbar');
    try {
      const b = await Native.readBattery();
      return Number(b?.level ?? 0);
    } catch (e: any) {
      if (e?.code === 'NOT_IMPLEMENTED') return 0;
      throw e;
    }
  }

  /* Historie ----------------------------------------------------------- */

  async synchronizeHealthData(sinceISO?: string): Promise<SyncResult> {
    if (!isNativeBridgeAvailable()) {
      return { measurements: [], sleepSessions: [], syncedTo: new Date().toISOString() };
    }
    try {
      const raw = await Native.syncHealthData(sinceISO || null);
      return {
        measurements: raw?.measurements || [],
        sleepSessions: raw?.sleepSessions || [],
        syncedFrom: raw?.syncedFrom,
        syncedTo: raw?.syncedTo || new Date().toISOString(),
      };
    } catch (e: any) {
      if (e?.code === 'NOT_IMPLEMENTED') {
        return { measurements: [], sleepSessions: [], syncedTo: new Date().toISOString() };
      }
      throw e;
    }
  }

  /* Realtime ----------------------------------------------------------- */

  async startRealtimeMeasurement(metric: RealtimeMetric) {
    if (!isNativeBridgeAvailable() || !emitter) return;
    // Event-Listener registrieren
    this.rtSubs.forEach(s => s.remove());
    this.rtSubs = [];
    const genericSub = emitter.addListener(EVT.REALTIME, (raw: any) => {
      if (raw?.metric !== metric && metric !== 'ecg') return;
      const s: RealtimeSample = {
        metric: raw.metric,
        value: Number(raw.value ?? 0),
        unit: String(raw.unit || ''),
        timestamp: String(raw.timestamp || new Date().toISOString()),
        qualityOk: Boolean(raw.qualityOk ?? true),
      };
      this.rtCallbacks.forEach(cb => cb(s));
    });
    this.rtSubs.push(genericSub);

    if (metric === 'ecg') {
      const ecgSub = emitter.addListener(EVT.ECG_WAVE, (raw: any) => {
        const s: RealtimeSample = {
          metric: 'ecg',
          value: Number(raw.hr ?? 0),
          unit: 'bpm',
          timestamp: String(raw.timestamp || new Date().toISOString()),
          qualityOk: Boolean(raw.qualityOk ?? true),
          samples: raw?.samples,
          samplingHz: raw?.samplingHz,
        };
        this.rtCallbacks.forEach(cb => cb(s));
      });
      this.rtSubs.push(ecgSub);
    }

    const fn =
      metric === 'heart_rate' ? 'startDetectHeart'
      : metric === 'spo2' ? 'startDetectSpO2'
      : metric === 'hrv' ? 'startDetectHRV'
      : metric === 'ecg' ? 'startDetectECG'
      : null;
    if (!fn) return;
    try { await Native[fn](); } catch (e: any) {
      if (e?.code !== 'NOT_IMPLEMENTED') throw e;
    }
  }

  async stopRealtimeMeasurement() {
    this.rtSubs.forEach(s => s.remove());
    this.rtSubs = [];
    if (!isNativeBridgeAvailable()) return;
    for (const fn of ['stopDetectHeart', 'stopDetectSpO2', 'stopDetectHRV', 'stopDetectECG']) {
      try { await Native[fn](); } catch {}
    }
  }

  onRealtimeSample(cb: (sample: RealtimeSample) => void) {
    this.rtCallbacks.push(cb);
    return () => { this.rtCallbacks = this.rtCallbacks.filter(c => c !== cb); };
  }

  async updateFirmware(_url: string): Promise<FirmwareUpdateResult> {
    return { success: false, error: 'OTA in einer späteren Phase.' };
  }

  async pushUserSettings(_s: UserWearableSettings) { /* Phase B: syncPersonInfo */ }
}
