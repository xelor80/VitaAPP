# HBand / Wearable Integration – Architektur-Blueprint

## 1. Grundprinzip

**Regel:** Die App darf niemals direkt gegen das HBandSDK sprechen. Alles läuft
durch eine herstellerunabhängige Abstraktion `WearableProvider`.

```
┌────────────────────────────────────────────────┐
│  UI-Screens, Dashboard, KI-Coach, Sync-Engine  │
│  (kennen NUR VitaGuide-eigene Datentypen)      │
└──────────────────┬─────────────────────────────┘
                   │  WearableProvider Interface
      ┌────────────┴─────────────┐
      │                          │
┌─────▼───────┐        ┌─────────▼─────────┐
│ HBandProvider│        │ DemoProvider      │
│ (native BLE) │        │ (Simulator, klar  │
│              │        │  gekennzeichnet)  │
└─────┬────────┘        └───────────────────┘
      │
┌─────▼────────────────────────────────┐
│ Native Bridge (Kotlin / Swift)       │
│ ├── HBand Android AAR                │
│ └── HBand iOS Framework              │
└──────────────────────────────────────┘
```

**Runtime-Auswahl:**
```typescript
export const wearable = NativeModules.HBandBridge
  ? new HBandProvider()
  : new DemoProvider();     // Fallback: Expo Go oder fehlende Native-Modules
```

## 2. WearableProvider Interface

```typescript
export interface WearableProvider {
  readonly name: string;                  // 'hband', 'demo', 'polar', ...
  readonly isDemo: boolean;

  // Discovery & connection
  scanDevices(): AsyncIterable<DiscoveredDevice>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<ConnectedDevice>;
  reconnect(): Promise<ConnectedDevice | null>;
  disconnect(): Promise<void>;
  unpair(): Promise<void>;

  // Device info
  getDeviceInformation(): Promise<DeviceInfo>;
  getBatteryLevel(): Promise<number>;

  // Data sync
  synchronizeHealthData(since?: string): Promise<SyncResult>;

  // Real-time measurements
  startRealtimeMeasurement(metric: RealtimeMetric): Promise<void>;
  stopRealtimeMeasurement(): Promise<void>;
  onRealtimeSample(cb: (sample: RealtimeSample) => void): () => void;

  // Firmware
  updateFirmware(url: string): Promise<FirmwareUpdateResult>;

  // Settings (nur was SDK unterstützt – im Demo: no-op)
  pushUserSettings(settings: UserWearableSettings): Promise<void>;
}
```

## 3. Datenfluss Sync

```
Band ─BLE─▶ Native Bridge ─▶ HBandProvider
                              │ maps to
                              ▼
                        WearableMeasurement[]
                              │ REST POST /api/wearable/measurements/batch
                              ▼
                    Backend Deduplizierung (user + device + metric + ts)
                              │
                              ▼
                        MongoDB (health_measurements)
                              │
                              ▼
        Dashboard / Detailseiten / KI-Coach (nur VitaGuide-Modelle)
```

## 4. Fehler-Kategorien (UI-Texte, keine SDK-Fehlercodes)

| Zustand | User-Text (DE) |
|---|---|
| `BLUETOOTH_OFF` | „Bluetooth ist deaktiviert. Bitte aktiviere Bluetooth, um dein Band zu verbinden." |
| `PERMISSION_DENIED` | „Wir brauchen deine Erlaubnis für Bluetooth, um dein Band zu suchen." |
| `SCANNING` | „Suche nach deinem VitaGuide Band …" |
| `DEVICE_FOUND` | „Band gefunden." |
| `CONNECTING` | „Verbindung wird hergestellt …" |
| `CONNECTED` | „Verbunden ✔" |
| `SYNC_RUNNING` | „Daten werden synchronisiert …" |
| `DISCONNECTED` | „Verbindung unterbrochen." |
| `NOT_REACHABLE` | „Dein Band ist gerade nicht erreichbar." |
| `INCOMPATIBLE_FIRMWARE` | „Firmware nicht kompatibel. Bitte aktualisiere dein Band." |
| `SYNC_FAILED` | „Synchronisierung fehlgeschlagen. Wir versuchen es später erneut." |

## 5. Backend-Deduplizierung

Compound-Index (nicht-unique zunächst, damit historische Batches nicht failen):
```
health_measurements: (user_id, device_id, metric_type, measured_at)
```
Bei Batch-Insert: pro Datensatz `upsert=True` mit demselben Key → keine Duplikate.

## 6. Basislinien-Berechnung

- Minimum 7 Tage Datenerfassung, präferiert 28 Tage.
- Rollierendes Fenster (28d) für: HRV, RestingHR, SleepDuration, Temperature, Steps.
- Formel: gleitender Median (robuster als Mittelwert bei Ausreißern).
- Solange `days_of_data < 7`: UI zeigt „VitaGuide lernt deinen Rhythmus kennen".

## 7. VitaGuide Scores (zentrale Formel-Datei, editierbar via Admin)

Konfiguriert in `backend/scoring_config.json`:
```json
{
  "recovery": {
    "weights": { "hrv_delta": 0.4, "rhr_delta": 0.2, "sleep_score": 0.3, "temp_delta": 0.1 },
    "min_data_days": 7,
    "beta": true
  },
  "sleep": { ... },
  "activity": { ... },
  "readiness": { ... }
}
```

## 8. Sicherheit & Datenschutz

- BLE-Kommunikation: nur intern, SDK übernimmt Verschlüsselung.
- MongoDB-Feld-Level: keine besondere Verschlüsselung nötig (bereits privates Atlas-Cluster mit TLS).
- **Kein PPG-Rohdatenzugriff** – nur SDK-Messwerte.
- **Keine Gesundheitsdaten in Logs** – nur Zählwerte („246 Records synced").
- Datenexport pro User: separater Endpoint `GET /api/wearable/export/{user_id}` (später).
- Löschen: `DELETE /api/wearable/devices/{id}?purge_data=true` löscht alle assoziierten Daten.

## 9. Phasen-Roadmap

| Phase | Inhalt | Session? |
|---|---|---|
| **1** | SDK-Analyse, Docs, Architektur | ✅ diese Session |
| **2** | Backend-Grundgerüst (Collections, CRUD, Sync-API) | ✅ diese Session |
| **3** | Frontend-Interface + DemoProvider + UI (Onboarding + Geräte-Screen) | ✅ diese Session |
| **4** | EAS-Config, `expo-dev-client`, Berechtigungen | ✅ diese Session |
| **5** | Native Bridge Android (Kotlin) + AAR-Anbindung | ⏳ nach Bandmodell-Ankunft |
| **6** | Native Bridge iOS (Swift/ObjC) + Framework-Anbindung | ⏳ nach Bandmodell-Ankunft |
| **7** | Dashboard-Cards + Detailseiten (Charts) | ⏳ nach Grundfluss |
| **8** | VitaGuide-Scores + Basislinien-Engine | ⏳ nach ≥ 7 Tagen Realdaten |
| **9** | KI-Coach-Kontext-Erweiterung | ⏳ nach Score-Berechnung |
| **10** | Health Connect / Apple HealthKit | ⏳ optional, separat |
| **11** | OTA-Firmware | ⏳ nach Herstellerkontakt |
| **12** | QA, Doku, Store-Release | ⏳ finale Phase |
