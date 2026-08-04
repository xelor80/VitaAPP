/**
 * HealthKitProvider — iOS bridge to Apple Health via `react-native-health`.
 *
 * Nur in iOS-Native-Builds (EAS Dev-Client / TestFlight / Prod) verfügbar.
 * In Expo Go liefert `isHealthKitAvailable()` false → Fallback auf DemoProvider.
 *
 * Datenfluss:
 *  - Read-only Zugriff auf Apple Health (User erlaubt Kategorien im HK-Prompt)
 *  - Synchronisiert Herzfrequenz, HRV, SpO2, Atemfrequenz, Hauttemperatur,
 *    Schritte, Distanz, Kalorien, Schlafanalyse in unser unified `WearableMeasurement`-Format
 *  - Realtime-Werte werden über Polling emuliert (HealthKit hat kein echtes push-stream)
 */
import { Platform, NativeModules } from 'react-native';
import type {
  WearableProvider, DiscoveredDevice, DeviceInfo, SyncResult,
  RealtimeMetric, RealtimeSample, UserWearableSettings, FirmwareUpdateResult,
  WearableMeasurement, SleepSessionSample,
} from './types';

// react-native-health wird bei iOS-Native-Builds nativ verlinkt.
// In Expo Go / Web ist es nicht vorhanden — wir require-en lazy und schützen alles.
let AppleHealthKit: any = null;
let HKConstants: any = null;
try {
  if (Platform.OS === 'ios') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-health');
    AppleHealthKit = mod.default || mod;
    HKConstants = AppleHealthKit?.Constants;
  }
} catch {
  AppleHealthKit = null;
}

export function isHealthKitAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (!AppleHealthKit) return false;
  // Bei nicht verlinktem Native-Modul ist initHealthKit undefined.
  return typeof AppleHealthKit.initHealthKit === 'function' &&
    Boolean((NativeModules as any).AppleHealthKit);
}

const IOS_DEVICE: DiscoveredDevice = {
  id: 'apple-health-ios',
  name: 'Apple Health (iPhone/Apple Watch)',
  provider: 'healthkit',
  model: 'HealthKit',
  rssi: undefined,
};

const nowIso = () => new Date().toISOString();

function samplesToMeasurement(
  metric: WearableMeasurement['metric_type'],
  unit: string,
  raw: any[],
): WearableMeasurement[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any) => ({
    metric_type: metric,
    value: Number(s.value ?? s.quantity ?? 0),
    unit,
    measured_at: s.startDate || s.endDate || nowIso(),
    source: `healthkit:${(s.sourceName || 'unknown').toLowerCase()}`,
    quality: 'ok',
    metadata: s.sourceId ? { sourceId: s.sourceId } : undefined,
  }));
}

export class HealthKitProvider implements WearableProvider {
  readonly name = 'healthkit';
  readonly isDemo = false;

  private connected = false;
  private rtCallbacks: ((s: RealtimeSample) => void)[] = [];
  private rtInterval: any = null;

  private get permissions() {
    if (!HKConstants) return null;
    const P = HKConstants.Permissions;
    return {
      permissions: {
        read: [
          P.HeartRate,
          P.RestingHeartRate,
          P.HeartRateVariability,
          P.OxygenSaturation,
          P.RespiratoryRate,
          P.BodyTemperature,
          P.Steps,
          P.DistanceWalkingRunning,
          P.ActiveEnergyBurned,
          P.BasalEnergyBurned,
          P.SleepAnalysis,
          P.Workout,
          P.BloodPressureSystolic,
          P.BloodPressureDiastolic,
          P.BloodGlucose,
        ].filter(Boolean),
        write: [],
      },
    };
  }

  async *scanDevices(): AsyncIterable<DiscoveredDevice> {
    // HealthKit ist kein BLE-Scan — wir liefern sofort den virtuellen "device".
    if (isHealthKitAvailable()) yield IOS_DEVICE;
  }
  async stopScan() { /* no-op */ }

  private initHK(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isHealthKitAvailable()) {
        return reject(new Error('HealthKit ist auf diesem Gerät nicht verfügbar.'));
      }
      AppleHealthKit.initHealthKit(this.permissions, (err: string) => {
        if (err) return reject(new Error(err));
        resolve();
      });
    });
  }

  async connect(_id: string): Promise<DeviceInfo> {
    await this.initHK();
    this.connected = true;
    return {
      id: IOS_DEVICE.id,
      provider: 'healthkit',
      model: 'Apple HealthKit',
      name: IOS_DEVICE.name,
      firmwareVersion: 'ios',
      capabilities: {
        ecg: false,          // Apple Watch ECG API ist Native, nicht via react-native-health
        hrv: true,
        spo2Continuous: true,
        skinTemperature: true,
        respiration: true,
        bloodPressure: 'validated',
        bloodGlucose: 'validated',
        display: true,
        vibrationAlarm: false,
        antiLost: false,
        ota: false,
      },
    };
  }

  async reconnect() { return this.connected ? this.getDeviceInformation() : null; }
  async disconnect() { this.connected = false; }
  async unpair() { this.connected = false; }

  async getDeviceInformation(): Promise<DeviceInfo> {
    return {
      id: IOS_DEVICE.id,
      provider: 'healthkit',
      model: 'Apple HealthKit',
      name: IOS_DEVICE.name,
    };
  }

  async getBatteryLevel() { return 100; }

  private read(fn: string, options: any): Promise<any> {
    return new Promise((resolve) => {
      if (!AppleHealthKit?.[fn]) return resolve([]);
      AppleHealthKit[fn](options, (err: string, results: any) => {
        if (err) return resolve([]);
        resolve(results);
      });
    });
  }

  async synchronizeHealthData(sinceISO?: string): Promise<SyncResult> {
    if (!isHealthKitAvailable()) {
      return { measurements: [], sleepSessions: [], syncedTo: nowIso() };
    }
    // Wenn Nutzer noch nicht initialisiert hat, initHK aufrufen (idempotent).
    try { await this.initHK(); } catch { /* fortfahren, ergibt einfach leere Reads */ }

    const now = new Date();
    const from = sinceISO ? new Date(sinceISO) : new Date(now.getTime() - 24 * 3600 * 1000);
    const baseOpts = {
      startDate: from.toISOString(),
      endDate: now.toISOString(),
      ascending: false,
      limit: 500,
    };

    const [
      heart, resting, hrv, spo2, respiration, temperature,
      steps, distance, activeCal, sleep, bpSys, bpDia, glucose,
    ] = await Promise.all([
      this.read('getHeartRateSamples', baseOpts),
      this.read('getRestingHeartRateSamples', baseOpts),
      this.read('getHeartRateVariabilitySamples', baseOpts),
      this.read('getOxygenSaturationSamples', baseOpts),
      this.read('getRespiratoryRateSamples', baseOpts),
      this.read('getBodyTemperatureSamples', baseOpts),
      this.read('getDailyStepCountSamples', baseOpts),
      this.read('getDailyDistanceWalkingRunningSamples', baseOpts),
      this.read('getActiveEnergyBurned', baseOpts),
      this.read('getSleepSamples', baseOpts),
      this.read('getBloodPressureSamples', baseOpts),
      this.read('getBloodPressureSamples', baseOpts),
      this.read('getBloodGlucoseSamples', baseOpts),
    ]);

    const measurements: WearableMeasurement[] = [
      ...samplesToMeasurement('heart_rate', 'bpm', heart),
      ...samplesToMeasurement('resting_heart_rate', 'bpm', resting),
      // HKQuantityTypeIdentifierHeartRateVariabilitySDNN liefert Sekunden — wir konvertieren nach ms
      ...samplesToMeasurement('hrv', 'ms', (hrv || []).map((s: any) => ({
        ...s, value: Number(s.value ?? 0) * 1000,
      }))),
      // HKQuantityTypeIdentifierOxygenSaturation liefert 0..1 → * 100
      ...samplesToMeasurement('spo2', '%', (spo2 || []).map((s: any) => ({
        ...s, value: Number(s.value ?? 0) * 100,
      }))),
      ...samplesToMeasurement('respiration_rate', 'breaths/min', respiration),
      ...samplesToMeasurement('skin_temperature', '°C', temperature),
      ...samplesToMeasurement('steps', 'count', steps),
      ...samplesToMeasurement('distance_m', 'm', distance),
      ...samplesToMeasurement('calories_kcal', 'kcal', activeCal),
      ...samplesToMeasurement('blood_pressure_systolic', 'mmHg',
        (bpSys || []).map((s: any) => ({ ...s, value: s.bloodPressureSystolicValue ?? s.value })),
      ),
      ...samplesToMeasurement('blood_pressure_diastolic', 'mmHg',
        (bpDia || []).map((s: any) => ({ ...s, value: s.bloodPressureDiastolicValue ?? s.value })),
      ),
      ...samplesToMeasurement('blood_glucose_estimated', 'mg/dl', glucose),
    ];

    // Sleep-Sessions gruppieren: HealthKit liefert Segmente (InBed, Asleep, REM, ...)
    const sleepSessions: SleepSessionSample[] = [];
    if (Array.isArray(sleep) && sleep.length > 0) {
      const sorted = [...sleep].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      // Session = alle Segmente, die innerhalb 30 Min zueinander liegen
      let session: any[] = [];
      const sessions: any[][] = [];
      let lastEnd = 0;
      for (const seg of sorted) {
        const start = new Date(seg.startDate).getTime();
        if (session.length && start - lastEnd > 30 * 60 * 1000) {
          sessions.push(session); session = [];
        }
        session.push(seg);
        lastEnd = new Date(seg.endDate).getTime();
      }
      if (session.length) sessions.push(session);

      for (const s of sessions) {
        const start = s[0].startDate;
        const end = s[s.length - 1].endDate;
        const totalMin = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
        const bucket = (name: string) => s.filter((x: any) => (x.value || '').toUpperCase().includes(name.toUpperCase()))
          .reduce((acc: number, x: any) => acc + (new Date(x.endDate).getTime() - new Date(x.startDate).getTime()) / 60000, 0);
        sleepSessions.push({
          start_time: start,
          end_time: end,
          total_minutes: totalMin,
          awake_minutes: Math.round(bucket('AWAKE')),
          light_sleep_minutes: Math.round(bucket('CORE') || bucket('LIGHT')),
          deep_sleep_minutes: Math.round(bucket('DEEP')),
          rem_sleep_minutes: Math.round(bucket('REM')),
        });
      }
    }

    return {
      measurements,
      sleepSessions,
      syncedFrom: from.toISOString(),
      syncedTo: now.toISOString(),
    };
  }

  async startRealtimeMeasurement(metric: RealtimeMetric) {
    if (this.rtInterval) clearInterval(this.rtInterval);
    if (!isHealthKitAvailable()) return;
    if (metric === 'ecg') {
      // Apple Watch ECG braucht spezielle native API die react-native-health nicht abbildet.
      // Fürs Erste kein Live-EKG via HK — geben wir stille no-op zurück.
      return;
    }
    this.rtInterval = setInterval(async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 5 * 60 * 1000);
      const opts = { startDate: start.toISOString(), endDate: end.toISOString(), ascending: false, limit: 1 };
      const fn =
        metric === 'heart_rate' ? 'getHeartRateSamples'
        : metric === 'spo2' ? 'getOxygenSaturationSamples'
        : metric === 'hrv' ? 'getHeartRateVariabilitySamples'
        : metric === 'skin_temperature' ? 'getBodyTemperatureSamples'
        : null;
      if (!fn) return;
      const results = await this.read(fn, opts);
      if (!results?.length) return;
      const s = results[0];
      let value = Number(s.value ?? 0);
      if (metric === 'spo2') value *= 100;
      if (metric === 'hrv') value *= 1000;
      const sample: RealtimeSample = {
        metric,
        value,
        unit: metric === 'heart_rate' ? 'bpm' : metric === 'spo2' ? '%' : metric === 'hrv' ? 'ms' : '°C',
        timestamp: s.startDate || nowIso(),
        qualityOk: true,
      };
      this.rtCallbacks.forEach(cb => cb(sample));
    }, 5000);
  }

  async stopRealtimeMeasurement() {
    if (this.rtInterval) { clearInterval(this.rtInterval); this.rtInterval = null; }
  }

  onRealtimeSample(cb: (sample: RealtimeSample) => void) {
    this.rtCallbacks.push(cb);
    return () => { this.rtCallbacks = this.rtCallbacks.filter(c => c !== cb); };
  }

  async updateFirmware(_url: string): Promise<FirmwareUpdateResult> {
    return { success: false, error: 'HealthKit hat keine Firmware.' };
  }
  async pushUserSettings(_s: UserWearableSettings) { /* no-op */ }
}
