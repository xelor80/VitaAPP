/**
 * DemoProvider – simulates a wearable for UI testing without hardware.
 *
 * ⚠️ ALL DATA PRODUCED HERE IS FAKE.
 *    Always displayed with a "DEMO – simulierte Daten" banner in the UI.
 *    Never sent to Apple HealthKit / Google Health Connect.
 *    Never used to inform AI-generated health guidance in production mode.
 */
import type {
  WearableProvider, DiscoveredDevice, DeviceInfo, SyncResult,
  RealtimeMetric, RealtimeSample, UserWearableSettings, FirmwareUpdateResult,
  WearableMeasurement, SleepSessionSample,
} from './types';

const DEMO_DEVICE: DiscoveredDevice = {
  id: 'demo-band-001',
  name: 'VitaGuide Band (Demo)',
  provider: 'demo',
  model: 'VG-Band-Demo',
  rssi: -55,
};

const rand = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

export class DemoProvider implements WearableProvider {
  readonly name = 'demo';
  readonly isDemo = true;

  private connected = false;
  private scanning = false;
  private rtCallbacks: ((s: RealtimeSample) => void)[] = [];
  private rtInterval: any = null;

  async *scanDevices(): AsyncIterable<DiscoveredDevice> {
    this.scanning = true;
    // Emit demo device after a tiny delay to mimic scanning
    await new Promise(r => setTimeout(r, 900));
    if (!this.scanning) return;
    yield DEMO_DEVICE;
  }

  async stopScan() { this.scanning = false; }

  async connect(_id: string): Promise<DeviceInfo> {
    await new Promise(r => setTimeout(r, 1200));
    this.connected = true;
    return {
      id: DEMO_DEVICE.id,
      provider: 'demo',
      model: DEMO_DEVICE.model,
      name: DEMO_DEVICE.name,
      firmwareVersion: '1.0.0-demo',
      hardwareVersion: 'A1',
      serialNumber: 'DEMO-SERIAL-0001',
      batteryLevel: rand(45, 95),
      capabilities: {
        ecg: true, hrv: true, spo2Continuous: true, skinTemperature: true,
        respiration: true, bloodPressure: 'estimate', bloodGlucose: 'estimate',
        display: false, vibrationAlarm: true, antiLost: true, ota: false,
      },
    };
  }

  async reconnect() { return this.connected ? this.getDeviceInformation() : null; }
  async disconnect() { this.connected = false; }
  async unpair() { this.connected = false; }

  async getDeviceInformation(): Promise<DeviceInfo> {
    return {
      id: DEMO_DEVICE.id, provider: 'demo', model: DEMO_DEVICE.model,
      name: DEMO_DEVICE.name, firmwareVersion: '1.0.0-demo',
      batteryLevel: rand(45, 95),
    };
  }

  async getBatteryLevel() { return rand(45, 95); }

  async synchronizeHealthData(sinceISO?: string): Promise<SyncResult> {
    // Generate the past 24h of simulated samples if no sinceISO was given
    const now = new Date();
    const from = sinceISO ? new Date(sinceISO) : new Date(now.getTime() - 24 * 3600 * 1000);
    const measurements: WearableMeasurement[] = [];

    // Heart rate every 30 min
    for (let t = from.getTime(); t <= now.getTime(); t += 30 * 60 * 1000) {
      measurements.push({
        metric_type: 'heart_rate',
        value: rand(58, 92),
        unit: 'bpm',
        measured_at: new Date(t).toISOString(),
        source: 'demo:auto',
      });
    }
    // HRV once
    measurements.push({
      metric_type: 'hrv', value: rand(35, 78), unit: 'ms',
      measured_at: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
      source: 'demo:auto',
    });
    // SpO2 twice
    measurements.push({
      metric_type: 'spo2', value: rand(95, 99), unit: '%',
      measured_at: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      source: 'demo:auto',
    });
    // Steps
    measurements.push({
      metric_type: 'steps', value: Math.floor(rand(4200, 12500)), unit: 'count',
      measured_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
      source: 'demo:auto',
    });
    // Skin temperature delta
    measurements.push({
      metric_type: 'skin_temperature', value: rand(33.1, 34.4), unit: '°C',
      measured_at: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
      source: 'demo:auto',
    });
    // Respiration rate
    measurements.push({
      metric_type: 'respiration_rate', value: Math.round(rand(13, 17)), unit: 'breaths/min',
      measured_at: new Date(now.getTime() - 5 * 3600 * 1000).toISOString(),
      source: 'demo:auto',
    });
    // Blood pressure – flagged as estimate (Wellness)
    const sysAt = new Date(now.getTime() - 4 * 3600 * 1000).toISOString();
    measurements.push({
      metric_type: 'blood_pressure_systolic', value: Math.round(rand(112, 128)), unit: 'mmHg',
      measured_at: sysAt, source: 'demo:auto',
      metadata: { estimate: true, disclaimer: 'Wellness-Schätzung, kein medizinischer Wert.' },
    });
    measurements.push({
      metric_type: 'blood_pressure_diastolic', value: Math.round(rand(72, 84)), unit: 'mmHg',
      measured_at: sysAt, source: 'demo:auto',
      metadata: { estimate: true, disclaimer: 'Wellness-Schätzung, kein medizinischer Wert.' },
    });
    // Blood glucose – strictly labelled as estimate
    measurements.push({
      metric_type: 'blood_glucose_estimated', value: Math.round(rand(88, 118)), unit: 'mg/dl',
      measured_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      source: 'demo:auto',
      metadata: {
        estimate: true,
        not_medical: true,
        disclaimer: 'Wellness-Schätzung. Nicht diagnostisch. Für medizinische Werte bitte ein zugelassenes Messgerät nutzen.',
      },
    });
    // ECG – single 10-second recording, 250 Hz sampled → we store metadata only
    measurements.push({
      metric_type: 'ecg', value: rand(72, 76), unit: 'bpm',   // avg HR of recording
      measured_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
      source: 'demo:auto',
      metadata: {
        sampling_hz: 250,
        duration_s: 10,
        // A short synthetic sinus-rhythm wave. Kept small in demo to spare bandwidth.
        samples: Array.from({ length: 40 }, (_, i) => Math.sin((i / 40) * Math.PI * 6) * 0.6),
        notes: 'Demo-Aufzeichnung – nicht zur Diagnose geeignet.',
      },
    });

    // A fake sleep session from last night
    const yStart = new Date(now); yStart.setHours(23, 12, 0, 0); yStart.setDate(yStart.getDate() - 1);
    const yEnd = new Date(now); yEnd.setHours(6, 47, 0, 0);
    const total = Math.round((yEnd.getTime() - yStart.getTime()) / 60000);
    const sleep: SleepSessionSample = {
      start_time: yStart.toISOString(),
      end_time: yEnd.toISOString(),
      total_minutes: total,
      awake_minutes: Math.round(total * 0.06),
      light_sleep_minutes: Math.round(total * 0.52),
      deep_sleep_minutes: Math.round(total * 0.19),
      rem_sleep_minutes: Math.round(total * 0.23),
      interruptions: 2,
      source_score: 78,
    };

    return {
      measurements,
      sleepSessions: [sleep],
      syncedFrom: from.toISOString(),
      syncedTo: now.toISOString(),
    };
  }

  async startRealtimeMeasurement(metric: RealtimeMetric) {
    if (this.rtInterval) clearInterval(this.rtInterval);
    if (metric === 'ecg') {
      // ECG bursts: every 40ms deliver 10 raw samples at 250Hz.
      // Synthetic waveform: baseline + Q-R-S-T pulses ~74 bpm.
      const hz = 250;
      const bpm = 72 + Math.random() * 8;
      const beatEvery = Math.round((60 / bpm) * hz);
      let sampleIdx = 0;
      this.rtInterval = setInterval(() => {
        const burst: number[] = [];
        for (let i = 0; i < 10; i++) {
          const p = sampleIdx % beatEvery;
          // Simple synthetic PQRST-like shape
          let v = 0;
          if (p < 20) v = Math.sin((p / 20) * Math.PI) * 0.10;                // P
          else if (p >= 30 && p < 42) v = -0.15;                              // Q
          else if (p >= 42 && p < 50) v = 1.2 * Math.exp(-((p - 46) ** 2) / 4); // R
          else if (p >= 50 && p < 60) v = -0.25;                              // S
          else if (p >= 80 && p < 120) v = Math.sin(((p - 80) / 40) * Math.PI) * 0.25; // T
          else v = (Math.random() - 0.5) * 0.02;                              // baseline noise
          burst.push(Number(v.toFixed(3)));
          sampleIdx++;
        }
        this.rtCallbacks.forEach(cb => cb({
          metric: 'ecg',
          value: Math.round(bpm),
          unit: 'bpm',
          timestamp: new Date().toISOString(),
          qualityOk: Math.random() > 0.03,
          samples: burst,
          samplingHz: hz,
        }));
      }, 40);
      return;
    }
    this.rtInterval = setInterval(() => {
      const sample: RealtimeSample = {
        metric,
        value:
          metric === 'heart_rate' ? rand(60, 95)
          : metric === 'spo2' ? rand(95, 99)
          : metric === 'hrv' ? rand(35, 78)
          : rand(33, 35),
        unit:
          metric === 'heart_rate' ? 'bpm'
          : metric === 'spo2' ? '%'
          : metric === 'hrv' ? 'ms'
          : '°C',
        timestamp: new Date().toISOString(),
        qualityOk: Math.random() > 0.08,
      };
      this.rtCallbacks.forEach(cb => cb(sample));
    }, 1500);
  }

  async stopRealtimeMeasurement() {
    if (this.rtInterval) {
      clearInterval(this.rtInterval);
      this.rtInterval = null;
    }
  }

  onRealtimeSample(cb: (sample: RealtimeSample) => void) {
    this.rtCallbacks.push(cb);
    return () => {
      this.rtCallbacks = this.rtCallbacks.filter(c => c !== cb);
    };
  }

  async updateFirmware(_url: string): Promise<FirmwareUpdateResult> {
    return { success: true, version: '1.0.1-demo' };
  }

  async pushUserSettings(_s: UserWearableSettings) {
    // no-op in demo
  }
}
