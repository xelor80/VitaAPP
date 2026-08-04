/**
 * Runtime selection of the correct WearableProvider.
 * - HBandProvider   → real BLE, only in EAS Dev-Client / Production builds
 * - DemoProvider    → fallback for Expo Go & unit-tests (clearly marked as demo)
 */
import type { WearableProvider } from './types';
import { DemoProvider } from './DemoProvider';
import { HBandProvider, isNativeBridgeAvailable } from './HBandProvider.stub';

export { isNativeBridgeAvailable };

let cached: WearableProvider | null = null;

export function getWearableProvider(forceDemo: boolean = false): WearableProvider {
  if (cached) return cached;
  if (!forceDemo && isNativeBridgeAvailable()) {
    cached = new HBandProvider();
  } else {
    cached = new DemoProvider();
  }
  return cached;
}

export function resetWearableProvider() {
  cached = null;
}

export * from './types';
