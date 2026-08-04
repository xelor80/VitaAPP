/**
 * HBandProvider – placeholder / stub.
 *
 * The real HBand SDK runs only inside a custom native build (EAS Dev-Client
 * or a store build). In Expo Go there is no `NativeModules.HBandBridge`
 * available, so `isNativeBridgeAvailable()` returns false and the app
 * falls back to `DemoProvider`.
 *
 * Once the Android AAR + iOS Framework are wired up via native Kotlin/Swift
 * bridge modules named `HBandBridge`, this file will call into them.
 */
import { NativeModules, Platform } from 'react-native';
import type {
  WearableProvider, DiscoveredDevice, DeviceInfo, SyncResult,
  RealtimeMetric, RealtimeSample, UserWearableSettings, FirmwareUpdateResult,
} from './types';

const NATIVE = (NativeModules as any).HBandBridge;

export function isNativeBridgeAvailable(): boolean {
  return Boolean(NATIVE && typeof NATIVE.scan === 'function');
}

const notImplemented = (fn: string) =>
  new Error(
    `HBand native bridge not available (${fn}). ` +
    `Build the app with EAS Dev-Client / Production and integrate the ` +
    `native HBandSDK module before enabling this provider on ${Platform.OS}.`
  );

export class HBandProvider implements WearableProvider {
  readonly name = 'hband';
  readonly isDemo = false;

  async *scanDevices(): AsyncIterable<DiscoveredDevice> {
    if (!NATIVE) throw notImplemented('scanDevices');
    // Placeholder — real implementation subscribes to a native event emitter
    // and yields DiscoveredDevice objects as they arrive.
    return;
  }
  async stopScan() { if (NATIVE?.stopScan) await NATIVE.stopScan(); }
  async connect(_id: string): Promise<DeviceInfo> { throw notImplemented('connect'); }
  async reconnect() { return null; }
  async disconnect() { if (NATIVE?.disconnect) await NATIVE.disconnect(); }
  async unpair() { if (NATIVE?.unpair) await NATIVE.unpair(); }
  async getDeviceInformation(): Promise<DeviceInfo> { throw notImplemented('getDeviceInformation'); }
  async getBatteryLevel() { throw notImplemented('getBatteryLevel'); }
  async synchronizeHealthData(_since?: string): Promise<SyncResult> { throw notImplemented('synchronizeHealthData'); }
  async startRealtimeMeasurement(_m: RealtimeMetric) { throw notImplemented('startRealtimeMeasurement'); }
  async stopRealtimeMeasurement() { /* no-op */ }
  onRealtimeSample(_cb: (s: RealtimeSample) => void) { return () => {}; }
  async updateFirmware(_url: string): Promise<FirmwareUpdateResult> { throw notImplemented('updateFirmware'); }
  async pushUserSettings(_s: UserWearableSettings) { /* no-op */ }
}
