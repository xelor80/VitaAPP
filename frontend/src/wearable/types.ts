/**
 * Vendor-agnostic wearable types shared across UI and providers.
 * The concrete providers (HBand, Demo, future Polar, …) map their SDK
 * payloads into these types – nothing else in the app knows about HBand.
 */

export type MetricType =
  | 'heart_rate'
  | 'resting_heart_rate'
  | 'hrv'
  | 'spo2'
  | 'skin_temperature'
  | 'respiration_rate'
  | 'stress'
  | 'blood_pressure_systolic'
  | 'blood_pressure_diastolic'
  | 'blood_glucose_estimated'   // ⚠️ non-medical estimate
  | 'ecg'                        // waveform, stored in metadata.samples
  | 'steps'
  | 'distance_m'
  | 'active_minutes'
  | 'calories_kcal'
  | 'battery';

/** Metrics that are non-medical estimates and MUST be labelled in UI. */
export const ESTIMATE_METRICS: MetricType[] = [
  'blood_glucose_estimated',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
];

/** Human-readable, medically-safe label used in the UI. */
export function labelForMetric(m: MetricType, lang: 'de' | 'it' | 'en' = 'de'): string {
  const de: Record<MetricType, string> = {
    heart_rate: 'Herzfrequenz',
    resting_heart_rate: 'Ruhepuls',
    hrv: 'HRV (Bandmesswert)',
    spo2: 'Sauerstoffsättigung',
    skin_temperature: 'Hauttemperatur',
    respiration_rate: 'Atemfrequenz',
    stress: 'Belastung (Bandwert)',
    blood_pressure_systolic: 'Blutdruck systolisch (Wellness-Schätzung)',
    blood_pressure_diastolic: 'Blutdruck diastolisch (Wellness-Schätzung)',
    blood_glucose_estimated: 'Blutzucker (Wellness-Schätzung)',
    ecg: 'EKG-Aufzeichnung',
    steps: 'Schritte',
    distance_m: 'Distanz',
    active_minutes: 'Aktive Minuten',
    calories_kcal: 'Kalorien',
    battery: 'Akkustand',
  };
  return de[m] || m;
}

/** Non-medical disclaimer for estimate metrics. */
export const ESTIMATE_DISCLAIMER_DE =
  'Wellness-Schätzung durch das Band. Kein medizinischer Messwert.';
export const ESTIMATE_DISCLAIMER_IT =
  'Stima wellness dal band. Non è una misura medica.';

export type ConnectionState =
  | 'unknown'
  | 'bluetooth_off'
  | 'permission_denied'
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'disconnected'
  | 'unreachable'
  | 'incompatible_firmware'
  | 'sync_failed';

export interface DiscoveredDevice {
  id: string;         // BLE-ID / MAC on Android, UUID on iOS
  name: string;
  rssi?: number;
  provider: string;   // 'hband' | 'demo' | …
  model?: string;
}

export interface DeviceInfo {
  id: string;
  provider: string;
  model?: string;
  name?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  serialNumber?: string;
  batteryLevel?: number;
  capabilities?: DeviceCapabilities;
}

/**
 * Feature flags reported by the SDK for the connected band.
 * For Mecoly E500 (display-less) we expect: ecg=true, hrv=true, spo2=true,
 * temperature=skin, blood_glucose=estimate_only, blood_pressure=estimate_only,
 * display=false.
 */
export interface DeviceCapabilities {
  ecg: boolean;
  hrv: boolean;
  spo2Continuous: boolean;
  skinTemperature: boolean;
  respiration: boolean;
  bloodPressure: 'none' | 'estimate' | 'validated';
  bloodGlucose: 'none' | 'estimate' | 'validated';
  display: boolean;
  vibrationAlarm: boolean;
  antiLost: boolean;
  ota: boolean;
}

export const MECOLY_E500_CAPABILITIES: DeviceCapabilities = {
  ecg: true,
  hrv: true,
  spo2Continuous: true,
  skinTemperature: true,
  respiration: true,
  bloodPressure: 'estimate',
  bloodGlucose: 'estimate',
  display: false,
  vibrationAlarm: true,
  antiLost: true,
  ota: true,
};

export interface WearableMeasurement {
  metric_type: MetricType;
  value: number;
  unit: string;
  measured_at: string;     // ISO
  source?: string;         // e.g. 'hband:auto', 'demo'
  quality?: string;
  metadata?: Record<string, any>;
}

export interface SleepSessionSample {
  start_time: string;
  end_time: string;
  total_minutes: number;
  awake_minutes?: number;
  light_sleep_minutes?: number;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
  interruptions?: number;
  source_score?: number;
}

export interface SyncResult {
  measurements: WearableMeasurement[];
  sleepSessions: SleepSessionSample[];
  syncedFrom?: string;
  syncedTo: string;
}

export type RealtimeMetric =
  | 'heart_rate'
  | 'spo2'
  | 'hrv'
  | 'skin_temperature';

export interface RealtimeSample {
  metric: RealtimeMetric;
  value: number;
  unit: string;
  timestamp: string;
  qualityOk: boolean;
}

export interface UserWearableSettings {
  birthdate?: string;
  sexForAlgorithms?: 'male' | 'female' | 'other';
  heightCm?: number;
  weightKg?: number;
  preferredUnit?: 'metric' | 'imperial';
  wristHand?: 'left' | 'right';
  timeFormat?: '12h' | '24h';
  bedtime?: string;
  wakeTime?: string;
  dailyStepGoal?: number;
}

export interface FirmwareUpdateResult {
  success: boolean;
  version?: string;
  error?: string;
}

/**
 * Abstract interface every wearable adapter must implement.
 */
export interface WearableProvider {
  readonly name: string;
  readonly isDemo: boolean;

  scanDevices(): AsyncIterable<DiscoveredDevice>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<DeviceInfo>;
  reconnect(): Promise<DeviceInfo | null>;
  disconnect(): Promise<void>;
  unpair(): Promise<void>;

  getDeviceInformation(): Promise<DeviceInfo>;
  getBatteryLevel(): Promise<number>;

  synchronizeHealthData(sinceISO?: string): Promise<SyncResult>;

  startRealtimeMeasurement(metric: RealtimeMetric): Promise<void>;
  stopRealtimeMeasurement(): Promise<void>;
  onRealtimeSample(cb: (sample: RealtimeSample) => void): () => void;

  updateFirmware(url: string): Promise<FirmwareUpdateResult>;
  pushUserSettings(settings: UserWearableSettings): Promise<void>;
}
