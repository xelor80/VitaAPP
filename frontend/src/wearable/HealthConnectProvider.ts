/**
 * HealthConnectProvider — Android bridge via `react-native-health-connect`.
 *
 * Nur in Android-Native-Builds (EAS Dev-Client / Preview / Prod) verfügbar.
 * In Expo Go / iOS liefert `isHealthConnectAvailable()` false → Fallback.
 *
 * Health Connect (ab Android 14 vorinstalliert, sonst via Play Store) aggregiert
 * Daten aus: Samsung Health, Google Fit, Fitbit, Garmin Connect, Oura, Withings,
 * Polar, MyFitnessPal, uvm.
 */
import { Platform } from 'react-native';
import type {
  WearableProvider, DiscoveredDevice, DeviceInfo, SyncResult,
  RealtimeMetric, RealtimeSample, UserWearableSettings, FirmwareUpdateResult,
  WearableMeasurement, SleepSessionSample,
} from './types';

let HC: any = null;
try {
  if (Platform.OS === 'android') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    HC = require('react-native-health-connect');
  }
} catch {
  HC = null;
}

export function isHealthConnectAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(HC?.initialize);
}

const ANDROID_DEVICE: DiscoveredDevice = {
  id: 'health-connect-android',
  name: 'Health Connect (Samsung/Fitbit/Google Fit ...)',
  provider: 'health_connect',
  model: 'HealthConnect',
};

const READ_PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'RespiratoryRate' },
  { accessType: 'read', recordType: 'BodyTemperature' },
  { accessType: 'read', recordType: 'SkinTemperature' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'BloodPressure' },
  { accessType: 'read', recordType: 'BloodGlucose' },
];

const nowIso = () => new Date().toISOString();

export class HealthConnectProvider implements WearableProvider {
  readonly name = 'health_connect';
  readonly isDemo = false;

  private initialized = false;
  private connected = false;
  private rtCallbacks: ((s: RealtimeSample) => void)[] = [];
  private rtInterval: any = null;

  private async ensureInit(): Promise<boolean> {
    if (!isHealthConnectAvailable()) return false;
    if (this.initialized) return true;
    try {
      const ok = await HC.initialize();
      this.initialized = Boolean(ok);
      return this.initialized;
    } catch {
      return false;
    }
  }

  async *scanDevices(): AsyncIterable<DiscoveredDevice> {
    if (await this.ensureInit()) yield ANDROID_DEVICE;
  }
  async stopScan() { /* no-op */ }

  async connect(_id: string): Promise<DeviceInfo> {
    const ok = await this.ensureInit();
    if (!ok) throw new Error('Health Connect ist auf diesem Gerät nicht verfügbar.');
    // Berechtigungs-Prompt anzeigen (idempotent)
    try {
      const granted = await HC.requestPermission(READ_PERMISSIONS);
      if (!Array.isArray(granted) || granted.length === 0) {
        throw new Error('Health Connect Berechtigungen wurden abgelehnt.');
      }
    } catch (e: any) {
      throw new Error(e?.message || 'Health Connect Berechtigungen konnten nicht angefordert werden.');
    }
    this.connected = true;
    return {
      id: ANDROID_DEVICE.id,
      provider: 'health_connect',
      model: 'Android Health Connect',
      name: ANDROID_DEVICE.name,
      firmwareVersion: 'android',
      capabilities: {
        ecg: false,
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
      id: ANDROID_DEVICE.id,
      provider: 'health_connect',
      model: 'Android Health Connect',
      name: ANDROID_DEVICE.name,
    };
  }

  async getBatteryLevel() { return 100; }

  private async readRecords(recordType: string, timeRangeFilter: any): Promise<any[]> {
    try {
      const res = await HC.readRecords(recordType, { timeRangeFilter });
      return res?.records || [];
    } catch {
      return [];
    }
  }

  async synchronizeHealthData(sinceISO?: string): Promise<SyncResult> {
    const ok = await this.ensureInit();
    if (!ok) return { measurements: [], sleepSessions: [], syncedTo: nowIso() };

    const now = new Date();
    const from = sinceISO ? new Date(sinceISO) : new Date(now.getTime() - 24 * 3600 * 1000);
    const range = {
      operator: 'between',
      startTime: from.toISOString(),
      endTime: now.toISOString(),
    };

    const [
      heart, resting, hrv, spo2, respiration, bodyTemp, skinTemp,
      steps, distance, activeCal, totalCal, sleep, bp, glucose,
    ] = await Promise.all([
      this.readRecords('HeartRate', range),
      this.readRecords('RestingHeartRate', range),
      this.readRecords('HeartRateVariabilityRmssd', range),
      this.readRecords('OxygenSaturation', range),
      this.readRecords('RespiratoryRate', range),
      this.readRecords('BodyTemperature', range),
      this.readRecords('SkinTemperature', range),
      this.readRecords('Steps', range),
      this.readRecords('Distance', range),
      this.readRecords('ActiveCaloriesBurned', range),
      this.readRecords('TotalCaloriesBurned', range),
      this.readRecords('SleepSession', range),
      this.readRecords('BloodPressure', range),
      this.readRecords('BloodGlucose', range),
    ]);

    const measurements: WearableMeasurement[] = [];

    // HeartRate: liefert Reihe von Samples innerhalb einer Record
    for (const r of heart) {
      for (const s of r.samples || []) {
        measurements.push({
          metric_type: 'heart_rate',
          value: Number(s.beatsPerMinute ?? 0),
          unit: 'bpm',
          measured_at: s.time || r.startTime,
          source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
        });
      }
    }
    for (const r of resting) {
      measurements.push({
        metric_type: 'resting_heart_rate',
        value: Number(r.beatsPerMinute ?? 0),
        unit: 'bpm',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of hrv) {
      measurements.push({
        metric_type: 'hrv',
        value: Number(r.heartRateVariabilityMillis ?? 0),
        unit: 'ms',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of spo2) {
      measurements.push({
        metric_type: 'spo2',
        value: Number(r.percentage?.value ?? r.percentage ?? 0),
        unit: '%',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of respiration) {
      measurements.push({
        metric_type: 'respiration_rate',
        value: Number(r.rate ?? 0),
        unit: 'breaths/min',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of [...bodyTemp, ...skinTemp]) {
      measurements.push({
        metric_type: 'skin_temperature',
        value: Number(r.temperature?.inCelsius ?? r.temperature ?? 0),
        unit: '°C',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of steps) {
      measurements.push({
        metric_type: 'steps',
        value: Number(r.count ?? 0),
        unit: 'count',
        measured_at: r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of distance) {
      measurements.push({
        metric_type: 'distance_m',
        value: Number(r.distance?.inMeters ?? 0),
        unit: 'm',
        measured_at: r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of [...activeCal, ...totalCal]) {
      measurements.push({
        metric_type: 'calories_kcal',
        value: Number(r.energy?.inKilocalories ?? 0),
        unit: 'kcal',
        measured_at: r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of bp) {
      measurements.push({
        metric_type: 'blood_pressure_systolic',
        value: Number(r.systolic?.inMillimetersOfMercury ?? 0),
        unit: 'mmHg',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
      measurements.push({
        metric_type: 'blood_pressure_diastolic',
        value: Number(r.diastolic?.inMillimetersOfMercury ?? 0),
        unit: 'mmHg',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }
    for (const r of glucose) {
      measurements.push({
        metric_type: 'blood_glucose_estimated',
        value: Number(r.level?.inMilligramsPerDeciliter ?? 0),
        unit: 'mg/dl',
        measured_at: r.time || r.startTime,
        source: `health_connect:${(r.metadata?.dataOrigin || 'unknown')}`,
      });
    }

    // Sleep sessions
    const sleepSessions: SleepSessionSample[] = [];
    for (const r of sleep) {
      const start = r.startTime;
      const end = r.endTime;
      const totalMin = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
      const stages = r.stages || [];
      const bucket = (typeName: string) => stages
        .filter((s: any) => (s.stage || '').toUpperCase().includes(typeName))
        .reduce((acc: number, s: any) => acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000, 0);
      sleepSessions.push({
        start_time: start,
        end_time: end,
        total_minutes: totalMin,
        awake_minutes: Math.round(bucket('AWAKE')),
        light_sleep_minutes: Math.round(bucket('LIGHT')),
        deep_sleep_minutes: Math.round(bucket('DEEP')),
        rem_sleep_minutes: Math.round(bucket('REM')),
      });
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
    if (!isHealthConnectAvailable()) return;
    if (metric === 'ecg') return; // Health Connect liefert kein Live-EKG
    this.rtInterval = setInterval(async () => {
      const end = new Date();
      const start = new Date(end.getTime() - 5 * 60 * 1000);
      const range = { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() };
      const recordType =
        metric === 'heart_rate' ? 'HeartRate'
        : metric === 'spo2' ? 'OxygenSaturation'
        : metric === 'hrv' ? 'HeartRateVariabilityRmssd'
        : metric === 'skin_temperature' ? 'SkinTemperature'
        : null;
      if (!recordType) return;
      const records = await this.readRecords(recordType, range);
      if (!records?.length) return;
      const last = records[records.length - 1];
      let value = 0;
      if (metric === 'heart_rate') value = Number(last.samples?.[last.samples.length - 1]?.beatsPerMinute ?? 0);
      else if (metric === 'spo2') value = Number(last.percentage?.value ?? last.percentage ?? 0);
      else if (metric === 'hrv') value = Number(last.heartRateVariabilityMillis ?? 0);
      else value = Number(last.temperature?.inCelsius ?? 0);
      if (!value) return;
      this.rtCallbacks.forEach(cb => cb({
        metric, value,
        unit: metric === 'heart_rate' ? 'bpm' : metric === 'spo2' ? '%' : metric === 'hrv' ? 'ms' : '°C',
        timestamp: last.time || last.startTime || nowIso(),
        qualityOk: true,
      }));
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
    return { success: false, error: 'Health Connect hat keine Firmware.' };
  }
  async pushUserSettings(_s: UserWearableSettings) { /* no-op */ }
}
