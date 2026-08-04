/**
 * HBandProvider – placeholder / stub.
 *
 * The real HBand SDK runs only inside a custom native build (EAS Dev-Client
 * or a store build). In Expo Go there is no `NativeModules.HBandBridge`
 * available, so `isNativeBridgeAvailable()` returns false and the app
 * falls back to `DemoProvider`.
 *
 * Method contracts documented in `/app/memory/HBAND_NATIVE_BRIDGE_SPEC.md`
 * are directly derived from the community-maintained Flutter plugin
 * `geekswamp/flutter_veepoo_sdk_plus` (Apache-2.0) which wraps the same
 * `com.veepoo.protocol.VPOperateManager` we'll bridge to on Android/iOS.
 *
 * Expected native-side surface for the Mecoly E500 (display-less):
 *   HBandBridge.requestBluetoothPermissions(): Promise<boolean>
 *   HBandBridge.isBluetoothEnabled(): Promise<boolean>
 *   HBandBridge.openBluetooth(): Promise<boolean>
 *   HBandBridge.scan(): Promise<void>    // events: 'scanBluetoothResult'
 *   HBandBridge.stopScan(): Promise<void>
 *   HBandBridge.connect(address: string, password?: string, is24h?: boolean): Promise<DeviceInfo>
 *   HBandBridge.bindDevice(password: string, is24h: boolean): Promise<boolean>
 *   HBandBridge.disconnect(): Promise<void>
 *   HBandBridge.isDeviceConnected(): Promise<boolean>
 *   HBandBridge.readBattery(): Promise<{ level: number; isCharging: boolean }>
 *   HBandBridge.readCapabilities(): Promise<DeviceCapabilities>
 *   HBandBridge.startDetectHeart(): Promise<void>   // events: 'detectHeart'
 *   HBandBridge.stopDetectHeart(): Promise<void>
 *   HBandBridge.startDetectSpoh(): Promise<void>    // events: 'detectSpoh'
 *   HBandBridge.stopDetectSpoh(): Promise<void>
 *   HBandBridge.startDetectECG(): Promise<void>     // events: 'detectECG'
 *   HBandBridge.stopDetectECG(): Promise<void>
 *   HBandBridge.startDetectHRV(): Promise<void>     // events: 'detectHRV'
 *   HBandBridge.stopDetectHRV(): Promise<void>
 *   HBandBridge.startDetectTemperature(): Promise<void>
 *   HBandBridge.stopDetectTemperature(): Promise<void>
 *   HBandBridge.syncHealthData(sinceISO?: string): Promise<SyncPayload>
 *   HBandBridge.pushUserSettings(json: object): Promise<void>
 *   HBandBridge.startOTA(url: string): Promise<void>   // events: 'otaProgress'
 *   HBandBridge.abortOTA(): Promise<void>
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
