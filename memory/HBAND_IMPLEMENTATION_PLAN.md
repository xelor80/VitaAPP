# HBand Native Bridge – Implementierungsplan

**Status:** Bereit für Umsetzung (Phase C abgeschlossen)
**Erstellt:** 2026-02-04
**Ziel:** `HBandProvider.stub.ts` durch echte, produktiv-taugliche Native-Bridge ersetzen — Android zuerst, iOS im Anschluss.

---

## 1. Was wir jetzt konkret wissen (aus Wiki + DeepWiki + Repo)

### 1.1 Zwingende Aufruf-Reihenfolge

```
1) VPOperateManager.getInstance().init(applicationContext)     // einmal beim App-Start
2) startScanDevice(SearchResponse)                             // Scan starten
   → onDeviceFounded(SearchResult{ device, rssi, scanRecord })
3) stopScanDevice()                                            // sobald User wählt
4) connectDevice(mac, IConnectResponse, INotifyResponse)
   → IConnectResponse.connectState(code, profile, isOadModel)
   → INotifyResponse.notifyState(state)   ← ⚠️  MUSS abgewartet werden!
5) confirmDevicePwd(bleWriteResp, IPwdDataListener, IDeviceFuctionDataListener,
                    ISocialMsgDataListener, ICustomSettingDataListener,
                    pwd="0000", is24h=true)
   → onPwdDataChange(PwdData{status, deviceNumber, version, ...})
   → onDeviceFunctionPackage1Report..5Report(pkg)    ← Capabilities!
6) syncPersonInfo(bleWriteResp, IPersonInfoDataListener,
                  PersonInfoData(sex, height, weight, age, stepAim))
   → onPersonInfoDataChange(EOprateStauts)
7) === ab hier normale Operationen möglich ===
```

**Kritische Regel:** Das Band unterstützt KEINE parallelen Operationen. Wir brauchen eine `OperationQueue` in Kotlin, die alle SDK-Aufrufe seriell ausführt.

### 1.2 Wichtigste Methoden für unseren Use-Case

| Feature | SDK-Methode | Callback |
|---|---|---|
| Akku lesen | `readBattery(bleWriteResp, IBatteryDataListener)` | `onDataChange(BatteryData{ battery, isCharge })` |
| Herzfrequenz Realtime | `startDetectHeart(bleWriteResp, IHeartDataListener, HeartStatus.OPEN)` | `onDataChange(HeartData{ data, status })` |
| Herzfrequenz stoppen | `startDetectHeart(..., HeartStatus.CLOSE)` | idem |
| SpO2 Realtime | `startDetectSPO2H(bleWriteResp, ISpo2hDataListener)` / `stopDetectSPO2H()` | `onSpo2hADataChange(SpO2HData)` |
| HRV Realtime | `startDetectHRV(bleWriteResp, IHrvDetectListener)` / `stopDetectHRV()` | `onDataChange(HrvOriginData)` |
| EKG Realtime | `startDetectECG(bleWriteResp, IECGDetectListener)` / `stopDetectECG()` | `onEcgADCChange(int[])` + `onHRChange(int)` |
| Schritte/Sport Historie | `readSportStep(bleWriteResp, ISportDataListener, watchDay)` | `onDataChange(SportData)` — `watchDay=0` = heute, `1` = gestern usw. |
| Schlaf Historie | `readSleepData(bleWriteResp, ISleepDataListener, watchDay)` | `onDataChange(SleepData)` |
| Blutdruck Historie | `readOriginData(bleWriteResp, IOriginDataListener, watchDay)` | `OriginData` enthält BP-Werte |
| Blutzucker | `startDetectBloodGlucose(...)` / `readBloodGlucose(...)` | `IBloodGlucoseChangeListener` |
| Body-Temp | `readTemperature(bleWriteResp, ITemperatureDataListener, watchDay)` | `onDataChange(TemperatureData)` |
| Disconnect | `disconnectWatch(bleWriteResp)` | – |

### 1.3 Alle 7 AARs sind da (bereits im Repo)

```
/app/frontend/android/libs/
├── vpprotocol-2.3.75.15.aar      (Core: VPOperateManager, alle Listener, 312 Models)
├── vpbluetooth-1.20.aar          (BLE-Wrapper com.inuker.bluetooth.library)
├── BmpConvert_V1.6.0.aar         (Bitmap→Watchface — nicht kritisch für display-lose Bänder)
├── JL_Watch_V1.13.1.aar          (Jieli-Chip Watchfaces — nicht kritisch)
├── jl_rcsp_V0.7.2.aar            (Jieli RCSP Protokoll)
├── jl_bt_ota_V1.10.0.aar         (Jieli OTA)
└── abpartool-release.aar         (Bluetrum Chip Partition-Tool)
```

Plus Maven-Deps: `mcumgr-core:2.7.4`, `mcumgr-ble:2.7.4`, `scanner:1.4.2`, `localbroadcastmanager:1.1.0`, `com.google.code.gson:gson:2.10.1`

---

## 2. Architektur unserer Bridge

```
┌───────────────────────────────────────────────────────────┐
│ React Native (TS)                                          │
│                                                            │
│   HBandProvider.ts                                         │
│   • implements WearableProvider                            │
│   • ruft NativeModules.HBandBridge auf                     │
│   • hört auf DeviceEventEmitter für Streams                │
└──────────────────────────┬─────────────────────────────────┘
                           │  JSON Bridge
┌──────────────────────────▼─────────────────────────────────┐
│ Kotlin (Android)                                            │
│                                                             │
│  HBandBridgeModule.kt                                       │
│   • initSDK(), scan(), connect(mac, pwd)                    │
│   • startECG(), startHRV(), startHR(), startSpO2()          │
│   • syncHealthData(sinceISO)                                │
│   • events: 'scanResult', 'connectionState',                │
│             'ecgSample', 'hrSample', ...                    │
│                                                             │
│  OperationQueue.kt (single-threaded FIFO)                   │
│                                                             │
│  HBandBridgePackage.kt (ReactPackage registration)          │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│ Veepoo SDK AARs                                            │
│   VPOperateManager → BluetoothService → BLE                │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Dateien die ich anlegen werde

### 3.1 Config-Plugin (Expo Prebuild Hook)
```
frontend/plugins/with-hband-sdk/
├── index.js                                    # Config-Plugin Entry
├── withHBandGradle.js                          # Modifiziert android/app/build.gradle
├── withHBandManifest.js                        # Modifiziert AndroidManifest.xml
├── withHBandKotlinSource.js                    # Kopiert Kotlin-Files
├── withHBandLibs.js                            # Kopiert AARs nach android/app/libs
├── source/
│   ├── HBandBridgeModule.kt                    # Native Modul (~600 LOC)
│   ├── HBandBridgePackage.kt                   # ReactPackage
│   └── OperationQueue.kt                       # Serial FIFO
└── README.md
```

### 3.2 JS-Seite
```
frontend/src/wearable/
├── HBandProvider.ts                            # NEU – ersetzt Stub
└── HBandProvider.stub.ts                       # bleibt für Expo Go / iOS-Fallback
```

### 3.3 Änderungen an bestehenden Dateien
- `frontend/app.json` — Plugin registrieren
- `frontend/src/wearable/index.ts` — HBandProvider wieder aktiv (import path)

---

## 4. Konkrete JS → Kotlin Bridge-API

```typescript
// frontend/src/wearable/HBandBridge.native.ts (Type-Definition)
export interface HBandBridge {
  // Lifecycle
  init(): Promise<{ok: boolean; version: string}>;

  // Permissions & Bluetooth-State
  requestPermissions(): Promise<{granted: boolean; denied: string[]}>;
  isBluetoothEnabled(): Promise<boolean>;
  openBluetoothSettings(): Promise<void>;

  // Scan
  startScan(): Promise<void>;
  stopScan(): Promise<void>;
  // Emits event 'HBand:scanResult' { id, name, rssi, scanRecordHex }

  // Connect flow
  connect(mac: string): Promise<void>;
  // Emits 'HBand:connectionState' { state: 'connecting'|'connected'|'notifyReady'|'authenticated'|'disconnected'|'failed', reason? }
  confirmPassword(pwd: string, is24h: boolean): Promise<{
    ok: boolean;
    deviceNumber: number;
    firmwareVersion: string;
    testVersion: string;
    capabilities: DeviceCapabilities;
  }>;
  syncPersonInfo(info: {sex: 'male'|'female'; height: number; weight: number; age: number; stepAim: number}): Promise<{ok: boolean}>;
  disconnect(): Promise<void>;

  // Battery
  readBattery(): Promise<{level: number; isCharging: boolean}>;

  // Realtime measurements (Emit 'HBand:realtimeSample' { metric, value, timestamp, samples?, samplingHz? })
  startDetectHeart(): Promise<void>;
  stopDetectHeart(): Promise<void>;
  startDetectSpO2(): Promise<void>;
  stopDetectSpO2(): Promise<void>;
  startDetectHRV(): Promise<void>;
  stopDetectHRV(): Promise<void>;
  startDetectECG(): Promise<void>;    // 30s Aufnahme
  stopDetectECG(): Promise<void>;

  // Historical sync (returns aggregated result)
  syncHealthData(sinceISO?: string): Promise<{
    measurements: Array<{metric_type: string; value: number; unit: string; measured_at: string; source: string; metadata?: object}>;
    sleepSessions: Array<{start_time: string; end_time: string; total_minutes: number; ...}>;
    syncedTo: string;
  }>;
}
```

**Event-Namen (Emit über `DeviceEventEmitter`):**
- `HBand:scanResult` — für jedes gefundene Gerät
- `HBand:scanStopped` — wenn Scan endet
- `HBand:connectionState` — jeder Zustandswechsel
- `HBand:realtimeSample` — HR, SpO2, HRV
- `HBand:ecgWaveform` — EKG-ADC-Bursts (mit `samples: number[]`, `samplingHz: 250`)
- `HBand:ecgHeartRate` — abgeleitete HR aus EKG
- `HBand:otaProgress` — später für Firmware-Update

---

## 5. Umsetzungs-Reihenfolge (kleine testbare Schritte)

### Phase A — Grundgerüst (~1 Session-Sprint)
1. **Config-Plugin schreiben** — kopiert AARs + Kotlin-Files, mutiert `build.gradle` + `AndroidManifest.xml` + `MainApplication.kt`
2. **Kotlin: HBandBridgeModule + OperationQueue + Package** anlegen mit nur folgenden Methoden:
   - `init()`, `requestPermissions()`, `isBluetoothEnabled()`
   - `startScan()` / `stopScan()` + Event `scanResult`
3. **JS: HBandProvider.ts** anlegen mit `scanDevices()` (via Event-Listener → AsyncIterable)
4. **Test:** `eas build --profile preview --platform android` → APK installieren → Onboarding öffnet, Scan liefert Mecoly E500

### Phase B — Verbindung + Auth (~1 Sprint)
5. Kotlin: `connect(mac)`, `confirmPassword("0000", true)`, `syncPersonInfo(...)`, `disconnect()`
6. Alle Callbacks in Events übersetzen (`connectionState`)
7. Kotlin: `readBattery()` (einfacher End-to-End-Test)
8. **Test:** Onboarding-Flow bis "Verbunden ✔" mit Akku-Anzeige durchlaufen

### Phase C — Realtime + EKG (~1 Sprint)
9. Kotlin: `startDetectHeart/SpO2/HRV` mit Live-Emit
10. Kotlin: `startDetectECG` mit 250Hz-ADC-Bursts (ca. 40ms-Chunks à 10 Samples)
11. JS: `startRealtimeMeasurement()` in `HBandProvider` verkabeln
12. **Test:** EKG-Screen zeigt echte Waveform

### Phase D — Historie + Sync (~1 Sprint)
13. Kotlin: `syncHealthData(since)` — orchestriert alle `readXXX(watchDay)` sequenziell (0…7 Tage)
14. Datenmapping: SDK-Modelle → unser einheitliches `WearableMeasurement`-Schema (siehe HBAND_ARCHITECTURE.md)
15. **Test:** Dashboard zeigt echte HR/HRV/Steps aus dem Band

### Phase E — iOS Bridge (~2 Sprints)
16. Framework `VeepooBleSDK.framework` aus HBandSDK/iOS_Ble_SDK klonen → `frontend/ios/Frameworks/`
17. Config-Plugin um iOS-Podfile-Mutation erweitern (`pod 'VeepooBleSDK', :path => '...'`)
18. Swift-Bridge `HBandBridge.swift` mit denselben JS-Method-Namen (spiegel-symmetrisch zum Kotlin-Modul)
19. **Test:** `eas build --profile preview --platform ios` → TestFlight → HR-Detection auf iPhone

---

## 6. Risiken & Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| SDK-Signaturen leicht anders als dokumentiert | Mittel | Try/Catch mit Reflection-Fallback in `OperationQueue`; klare Error-Events; Demo-App als Referenz konsultieren |
| Kotlin-Version-Konflikt mit Expo | Niedrig | Expo 54 nutzt Kotlin 2.0.x, SDK braucht 1.3.61+ → kompatibel |
| Passwort ist NICHT "0000" beim Mecoly E500 | Niedrig | UI-Fallback: Passwort-Eingabefeld im Onboarding-Step, wenn `EPwdStatus.CHECK_FAIL` |
| ECG-Waveform-Format anders als erwartet | Mittel | Erst rohes `int[]` durchreichen, dann in JS visualisieren; keine Vorab-Filterung |
| BLE-Reconnect bei Screen-Off / App-Background | Hoch | `BluetoothService` als Foreground-Service in `MainApplication`; `disconnect()` bei App-Kill |
| Erste `eas build` scheitert wegen fehlender Kotlin-Config | Mittel | Config-Plugin injiziert `kotlin-android` Plugin in `build.gradle` — als erstes testen |

---

## 7. Was NICHT im ersten Wurf enthalten ist

- **Watchface-Editor** (BmpConvert) — E500 ist display-los
- **OTA-Firmware-Update** — später, wenn erste Bänder live sind (kommt via `updateFirmware()` Methode, aber Skeleton-only)
- **iOS-Bridge** — Phase E, separate Session nach Android-Erfolg
- **Batch-Blood-Glucose-Auto-Detection** — Mecoly E500 supportet BG nur als Wellness-Estimate; Manual-Measurement reicht

---

## 8. Was ich vor Start noch von dir brauche (0–1 Fragen)

Alles vorbereitet. Eine einzige technische Frage:

**Q1:** Der Mecoly E500 default-Password. Weißt du, ob euer Modell mit `"0000"` gekoppelt wird oder wurde bei euch ein anderes Passwort gesetzt (manche White-Label-Bänder haben `"1111"` oder gerätespezifisch)?
- **A:** Standard `"0000"` (Standard-Veepoo-Default)
- **B:** Anderes Passwort — welches?
- **C:** Unbekannt → ich baue ein Passwort-Eingabefeld in den Onboarding-Step ein und default-fille `"0000"`

Wenn C, kann der User zur Not das Password selbst eingeben, falls "0000" fehlschlägt.

---

## 9. Aufwandsschätzung

| Phase | Aufwand (agent-Sprints) | Testbar? |
|---|---|---|
| A – Grundgerüst + Scan | 1 | ✅ Sichtbar in Onboarding |
| B – Connect + Auth + Battery | 1 | ✅ Dashboard zeigt Akku |
| C – Realtime + EKG | 1 | ✅ EKG-Screen mit Live-Waveform |
| D – Historie + Sync | 1 | ✅ Alle Dashboard-Metriken echt |
| E – iOS-Bridge | 2 | ✅ TestFlight-Build |
| **Gesamt Android bis produktionsreif** | **4 Sprints** | |
| **Gesamt inkl. iOS** | **6 Sprints** | |

**Wichtig:** Jede Phase liefert ein installierbares APK/IPA — kein Big-Bang.

---

*Nach deinem OK auf Q1 starte ich mit Phase A.*
