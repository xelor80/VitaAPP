/**
 * Runtime selection of the correct WearableProvider.
 *
 * Priorität:
 *   1) HBand-Native-Bridge (Mecoly E500) – falls User das Band koppeln möchte
 *   2) Plattform-Health-API (Apple HealthKit / Android Health Connect)
 *   3) DemoProvider (Fallback für Expo Go & Testing)
 *
 * Der User kann in den Einstellungen explizit eine Quelle wählen; diese Wahl
 * wird in AsyncStorage unter `wearable.preferred_provider` persistiert.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WearableProvider } from './types';
import { DemoProvider } from './DemoProvider';
import { HBandProvider, isNativeBridgeAvailable } from './HBandProvider.stub';
import { HealthKitProvider, isHealthKitAvailable } from './HealthKitProvider';
import { HealthConnectProvider, isHealthConnectAvailable } from './HealthConnectProvider';

export {
  isNativeBridgeAvailable,
  isHealthKitAvailable,
  isHealthConnectAvailable,
};

export type ProviderId = 'hband' | 'healthkit' | 'health_connect' | 'demo';
const STORAGE_KEY = 'wearable.preferred_provider';

let cached: WearableProvider | null = null;
let cachedId: ProviderId | null = null;

/** Liefert alle Provider, die auf dem aktuellen Gerät verfügbar sind. */
export function listAvailableProviders(): { id: ProviderId; label: string; native: boolean }[] {
  const list: { id: ProviderId; label: string; native: boolean }[] = [];
  if (isNativeBridgeAvailable()) list.push({ id: 'hband', label: 'VitaGuide Band (Mecoly E500)', native: true });
  if (Platform.OS === 'ios' && isHealthKitAvailable()) {
    list.push({ id: 'healthkit', label: 'Apple Health / Apple Watch', native: true });
  }
  if (Platform.OS === 'android' && isHealthConnectAvailable()) {
    list.push({ id: 'health_connect', label: 'Android Health Connect', native: true });
  }
  list.push({ id: 'demo', label: 'Demo-Modus (simulierte Daten)', native: false });
  return list;
}

function instantiate(id: ProviderId): WearableProvider {
  switch (id) {
    case 'hband':          return new HBandProvider();
    case 'healthkit':      return new HealthKitProvider();
    case 'health_connect': return new HealthConnectProvider();
    default:               return new DemoProvider();
  }
}

/** Persistiert die Wahl des Users. */
export async function setPreferredProvider(id: ProviderId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, id);
  resetWearableProvider();
}

/** Lädt die persistierte Wahl (falls vorhanden). */
export async function getPreferredProvider(): Promise<ProviderId | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'hband' || v === 'healthkit' || v === 'health_connect' || v === 'demo') return v;
    return null;
  } catch { return null; }
}

/**
 * Provider synchron auflösen (für Screens, die keinen Prefetch machen).
 * Beim ersten Aufruf ohne Preload wird auto-erkannt – ist die persistierte
 * Wahl bekannt, sollte davor `preloadPreferredProvider()` aufgerufen werden.
 */
export function getWearableProvider(forceDemo: boolean = false): WearableProvider {
  if (cached) return cached;
  if (forceDemo) {
    cachedId = 'demo';
    cached = new DemoProvider();
    return cached;
  }
  // Auto-Detection wenn keine User-Wahl vorliegt
  if (isNativeBridgeAvailable())        { cachedId = 'hband';          cached = new HBandProvider(); }
  else if (isHealthKitAvailable())      { cachedId = 'healthkit';      cached = new HealthKitProvider(); }
  else if (isHealthConnectAvailable())  { cachedId = 'health_connect'; cached = new HealthConnectProvider(); }
  else                                  { cachedId = 'demo';           cached = new DemoProvider(); }
  return cached;
}

/**
 * Beim App-Start aufrufen: Lädt den vom User bevorzugten Provider aus AsyncStorage
 * und cached ihn. Falls dieser nicht verfügbar ist → Auto-Detection.
 */
export async function preloadPreferredProvider(): Promise<ProviderId> {
  const pref = await getPreferredProvider();
  const available = listAvailableProviders().map(p => p.id);
  if (pref && available.includes(pref)) {
    cachedId = pref;
    cached = instantiate(pref);
    return pref;
  }
  // Kein Pref oder nicht verfügbar → automatischer Fallback
  getWearableProvider(false);
  return cachedId || 'demo';
}

export function currentProviderId(): ProviderId | null {
  return cachedId;
}

export function resetWearableProvider() {
  cached = null;
  cachedId = null;
}

export * from './types';
