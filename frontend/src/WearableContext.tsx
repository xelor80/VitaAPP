/**
 * WearableContext – single source of truth for the wearable UI.
 * Holds device info, connection state, sync stats and exposes actions.
 *
 * Provider-Auswahl:
 *   Der User kann per `switchProvider(id)` zwischen HBand-Band, Apple Health,
 *   Health Connect oder Demo umschalten. Die Wahl wird persistiert.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getWearableProvider, isNativeBridgeAvailable, isHealthKitAvailable,
  isHealthConnectAvailable, preloadPreferredProvider, setPreferredProvider,
  currentProviderId, resetWearableProvider, listAvailableProviders,
  type ProviderId,
} from './wearable/index';
import type {
  ConnectionState, DeviceInfo, DiscoveredDevice, WearableProvider,
} from './wearable/types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const STORAGE_DEVICE = 'vg_wearable_device';
const STORAGE_USER = 'vg_wearable_user_id';

interface Ctx {
  provider: WearableProvider;
  providerId: ProviderId;
  isDemo: boolean;
  isNativeAvailable: boolean;
  isHealthKitAvailable: boolean;
  isHealthConnectAvailable: boolean;
  availableProviders: { id: ProviderId; label: string; native: boolean }[];
  state: ConnectionState;
  device: DeviceInfo | null;
  discovered: DiscoveredDevice[];
  lastSyncAt: string | null;
  lastSyncCount: number;
  batteryLevel: number | null;
  errorText: string | null;

  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  pairAndConnect: (userId: string, dev: DiscoveredDevice) => Promise<void>;
  disconnect: () => Promise<void>;
  unpair: (purgeData?: boolean) => Promise<void>;
  syncNow: (userId: string) => Promise<{ inserted: number; total: number } | null>;
  refreshBattery: () => Promise<void>;
  switchProvider: (id: ProviderId) => Promise<void>;
}

const WearableCtx = createContext<Ctx | null>(null);

export const WearableProviderCtx: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const providerRef = useRef<WearableProvider>(getWearableProvider());
  const [providerId, setProviderId] = useState<ProviderId>(currentProviderId() || 'demo');
  const [state, setState] = useState<ConnectionState>('idle');
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncCount, setLastSyncCount] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Beim App-Start: bevorzugten Provider aus Storage laden
  useEffect(() => {
    (async () => {
      try {
        const pid = await preloadPreferredProvider();
        providerRef.current = getWearableProvider();
        setProviderId(pid);
      } catch { /* fallback bleibt Demo */ }
      try {
        const saved = await AsyncStorage.getItem(STORAGE_DEVICE);
        if (saved) setDevice(JSON.parse(saved));
      } catch {}
    })();
  }, []);

  const saveDevice = async (d: DeviceInfo | null) => {
    setDevice(d);
    if (d) await AsyncStorage.setItem(STORAGE_DEVICE, JSON.stringify(d));
    else await AsyncStorage.removeItem(STORAGE_DEVICE);
  };

  const scan = useCallback(async () => {
    setErrorText(null);
    setDiscovered([]);
    setState('scanning');
    try {
      const it = providerRef.current.scanDevices();
      for await (const dev of it) {
        setDiscovered(prev => (prev.find(p => p.id === dev.id) ? prev : [...prev, dev]));
      }
      setState('idle');
    } catch (e: any) {
      setErrorText(e?.message || 'Suche fehlgeschlagen.');
      setState('idle');
    }
  }, []);

  const stopScan = useCallback(async () => {
    await providerRef.current.stopScan();
    setState('idle');
  }, []);

  const pairAndConnect = useCallback(async (userId: string, dev: DiscoveredDevice) => {
    setErrorText(null);
    setState('connecting');
    try {
      const info = await providerRef.current.connect(dev.id);
      await saveDevice(info);
      setBatteryLevel(info.batteryLevel ?? null);
      setState('connected');
      await AsyncStorage.setItem(STORAGE_USER, userId);
      // Register on backend
      try {
        const res = await fetch(`${API_URL}/api/wearable/devices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            provider: providerRef.current.name,
            model: info.model, name: info.name,
            firmware_version: info.firmwareVersion,
            hardware_version: info.hardwareVersion,
            serial_number: info.serialNumber,
            ble_address: info.id,
            battery_level: info.batteryLevel,
          }),
        });
        const data = await res.json();
        if (data?.device?.device_id) {
          const enriched: DeviceInfo = { ...info, id: info.id, name: info.name };
          (enriched as any).backendDeviceId = data.device.device_id;
          await saveDevice(enriched);
        }
      } catch { /* backend down – keep local */ }
    } catch (e: any) {
      setErrorText(e?.message || 'Verbindung fehlgeschlagen.');
      setState('idle');
    }
  }, []);

  const disconnect = useCallback(async () => {
    await providerRef.current.disconnect();
    setState('disconnected');
  }, []);

  const unpair = useCallback(async (purgeData?: boolean) => {
    await providerRef.current.unpair();
    const backendId = (device as any)?.backendDeviceId;
    if (backendId) {
      try {
        await fetch(`${API_URL}/api/wearable/devices/${backendId}?purge_data=${purgeData ? 'true' : 'false'}`, {
          method: 'DELETE',
        });
      } catch {}
    }
    await saveDevice(null);
    setBatteryLevel(null);
    setDiscovered([]);
    setState('idle');
  }, [device]);

  const syncNow = useCallback(async (userId: string) => {
    if (!device) return null;
    setState('syncing');
    setErrorText(null);
    try {
      const result = await providerRef.current.synchronizeHealthData(lastSyncAt || undefined);
      const backendId = (device as any)?.backendDeviceId;
      let inserted = 0;
      if (backendId && result.measurements.length > 0) {
        const res = await fetch(`${API_URL}/api/wearable/measurements/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            device_id: backendId,
            measurements: result.measurements,
          }),
        });
        const data = await res.json();
        inserted = data.inserted || 0;
      }
      // Sleep sessions
      if (backendId && result.sleepSessions.length > 0) {
        await fetch(`${API_URL}/api/wearable/sleep-sessions/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.sleepSessions.map(s => ({
            ...s, user_id: userId, device_id: backendId,
          }))),
        });
      }
      const now = new Date().toISOString();
      setLastSyncAt(now);
      setLastSyncCount(result.measurements.length);
      setState('connected');
      return { inserted, total: result.measurements.length };
    } catch (e: any) {
      setErrorText(e?.message || 'Synchronisierung fehlgeschlagen.');
      setState('sync_failed');
      return null;
    }
  }, [device, lastSyncAt]);

  const refreshBattery = useCallback(async () => {
    try {
      const b = await providerRef.current.getBatteryLevel();
      setBatteryLevel(b);
    } catch {}
  }, []);

  const switchProvider = useCallback(async (id: ProviderId) => {
    // Trenne aktuelle Verbindung, wechsle Provider, cleane discovery-Liste
    try { await providerRef.current.disconnect(); } catch {}
    await setPreferredProvider(id);
    resetWearableProvider();
    providerRef.current = getWearableProvider();
    setProviderId(id);
    setDiscovered([]);
    setState('idle');
    setErrorText(null);
    // Device wird nicht automatisch entfernt – User muss neu koppeln
  }, []);

  const value: Ctx = {
    provider: providerRef.current,
    providerId,
    isDemo: providerRef.current.isDemo,
    isNativeAvailable: isNativeBridgeAvailable(),
    isHealthKitAvailable: isHealthKitAvailable(),
    isHealthConnectAvailable: isHealthConnectAvailable(),
    availableProviders: listAvailableProviders(),
    state, device, discovered, lastSyncAt, lastSyncCount, batteryLevel, errorText,
    scan, stopScan, pairAndConnect, disconnect, unpair, syncNow, refreshBattery,
    switchProvider,
  };
  return <WearableCtx.Provider value={value}>{children}</WearableCtx.Provider>;
};

export function useWearable(): Ctx {
  const c = useContext(WearableCtx);
  if (!c) throw new Error('useWearable must be used within WearableProviderCtx');
  return c;
}
