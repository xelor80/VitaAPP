# HBand Native Bridge – Spezifikation für React Native

> **Zweck:** Wenn die Android-AAR und das iOS-Framework verfügbar sind, wird ein
> Native Modul namens **`HBandBridge`** in Kotlin (Android) und Swift/Obj-C (iOS)
> gebaut, das genau dieses Interface implementiert.
> Grundlage: `com.veepoo.protocol.VPOperateManager` (Android),
> `VPPeripheralManager` (iOS) – abgeleitet aus dem HBandSDK und dem Community-Plugin
> [`flutter_veepoo_sdk_plus`](https://github.com/geekswamp/flutter_veepoo_sdk_plus).

## 1. Methoden (identisch für Android + iOS)

Alle Methoden liefern eine **Promise** (RN) bzw. akzeptieren einen `MethodChannel.Result`
(Flutter). Rückgaben werden als JSON serialisiert.

### 1.1 Bluetooth-Verwaltung
| Method | Args | Returns | Bemerkung |
|---|---|---|---|
| `requestBluetoothPermissions()` | – | `boolean` | Android 12+: BLUETOOTH_SCAN/CONNECT; darunter Location |
| `openAppSettings()` | – | `void` | für Deep-Link in System-Einstellungen |
| `isBluetoothEnabled()` | – | `boolean` | Adapter-Status |
| `openBluetooth()` | – | `boolean` | Hardware-BT einschalten |
| `closeBluetooth()` | – | `boolean` | Hardware-BT ausschalten |

### 1.2 Scanning & Verbindung
| Method | Args | Returns | Bemerkung |
|---|---|---|---|
| `scanDevices()` | – | `void` | Ergebnisse via `EventChannel scanBluetoothResult` (Stream) |
| `stopScanDevices()` | – | `void` | |
| `connectDevice(address)` | `address: String` | `boolean` | MAC/UUID vom Scan |
| `bindDevice(password, is24H)` | `password: String, is24H: bool` | `boolean` | 6-stelliger PIN + Zeitformat, Pflichtschritt nach Connect |
| `disconnectDevice()` | – | `void` | |
| `getAddress()` | – | `String?` | aktuell verbundenes Gerät |
| `getCurrentStatus()` | – | `Int` | Veepoo-Status-Code |
| `isDeviceConnected()` | – | `boolean` | |

### 1.3 Herzfrequenz
| Method | Args | Returns |
|---|---|---|
| `startDetectHeart()` | – | Stream via `EventChannel detectHeart` |
| `stopDetectHeart()` | – | `void` |
| `settingHeartWarning(high, low, open)` | `high: Int, low: Int, open: bool` | `void` |
| `readHeartWarning()` | – | `{high: Int, low: Int, open: bool}` |

### 1.4 SpO₂
| Method | Args | Returns |
|---|---|---|
| `startDetectSpoh()` | – | Stream via `EventChannel detectSpoh` |
| `stopDetectSpoh()` | – | `void` |

### 1.5 Batterie & Info
| Method | Args | Returns |
|---|---|---|
| `readBattery()` | – | `{level: Int, isCharging: bool}` |
| `readDeviceInfo()` | – | `{firmware, hardware, serial}` |

### 1.6 Zusätzlich benötigt (in Community-Plugin noch nicht implementiert – wir bauen es)
| Method | Args | Returns | Bemerkung |
|---|---|---|---|
| `startDetectECG()` | – | Stream `detectECG` | Wave-Samples ~250Hz + Heart-Rate |
| `stopDetectECG()` | – | `void` | |
| `startDetectHRV()` | – | Stream `detectHRV` | |
| `stopDetectHRV()` | – | `void` | |
| `startDetectTemperature()` | – | Stream `detectTemperature` | |
| `stopDetectTemperature()` | – | `void` | |
| `syncHealthData(sinceISO?)` | `sinceISO: String?` | `SyncPayload` | HR/HRV/SpO₂/Sleep/Steps/Temp/ECG-Sessions – batched |
| `readCapabilities()` | – | `{ecgType, hrvType, oxygenType, temperatureType, bloodGlucoseType, bloodPressureType, ...}` | siehe §3 |
| `pushUserSettings(json)` | `settings: Map` | `void` | Alter, Größe, Gewicht, Handgelenk, Ziel, Zeitformat |
| `startOTA(url)` | `url: String` | Stream `otaProgress` | |
| `abortOTA()` | – | `void` | |

## 2. Event-Channels (EventEmitter in RN)

- `scanBluetoothResult` → `{ id, name, rssi, provider: 'hband' }`
- `connectionStatus` → `'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'unreachable'`
- `detectHeart` → `{ value: Int, unit: 'bpm', quality: 'good'|'poor', ts: ISO }`
- `detectSpoh` → `{ value: Int, unit: '%', ts: ISO }`
- `detectECG` → `{ samples: number[], hr: Int, ts: ISO, ecgIndex: Int }`
- `detectHRV` → `{ value: Int, unit: 'ms', ts: ISO }`
- `detectTemperature` → `{ value: Float, unit: '°C', ts: ISO }`
- `syncProgress` → `{ current: Int, total: Int, phase: 'hr'|'hrv'|'sleep'|'steps'|'spo2'|'temp'|'ecg' }`
- `otaProgress` → `{ percent: Int, phase: 'transfer'|'flash' }`

## 3. Geräte-Fähigkeiten (Capability-Flags) für Mecoly E500

Vom SDK ausgelesen über `VPBleCenter.getFunctionSocailMsgSupport()` bzw.
`VpSpGetUtil.getFunctionDeviceSupport()`. Erwartete Werte für **Mecoly E500**
(basierend auf öffentlichen Listings – muss beim Muster bestätigt werden):

```typescript
{
  ecgType: 'SUPPORT',                    // ✅
  hrvType: 'SUPPORT',                    // ✅
  oxygenType: 'CONTINUOUS_MONITOR',      // ✅ automatische SpO₂
  temperatureType: 'SUPPORT',            // ✅ Hauttemperatur
  bloodGlucoseType: 'SUPPORT_ESTIMATE',  // ⚠️ Schätzung, nicht medizinisch validiert
  bloodPressureType: 'SUPPORT_ESTIMATE', // ⚠️ Schätzung
  respiratoryRateType: 'SUPPORT',        // ✅
  temperature2Type: 'NOT_SUPPORT',       // Kerntemperatur = ❌
  femaleType: 'SUPPORT',
  screenType: 'NO_DISPLAY',              // 👈 display-less variant
  displayNotification: 'NOT_SUPPORT',
  watchFaceType: 'NOT_SUPPORT',
}
```

## 4. Datenmapping SDK → VitaGuide `HealthMeasurement`

| SDK-Struct | metric_type | unit | Notiz |
|---|---|---|---|
| `HeartData.rate` | `heart_rate` | `bpm` | |
| `HeartWaringData.average` | `resting_heart_rate` | `bpm` | Ruhepuls (Nacht) |
| `HRVOriginData.hrv` | `hrv` | `ms` | Bezeichnung neutral halten (nicht als RMSSD ausgeben ohne SDK-Bestätigung) |
| `SpO2Data.value` | `spo2` | `%` | |
| `TemptureData.value` | `skin_temperature` | `°C` | **NICHT** als Kerntemperatur ausgeben |
| `ECGData.samples[]` | `ecg` | `mV` | metadata: `samples`, `sampling_hz`, `duration_s`, `hr` |
| `BloodPressureData` | `blood_pressure_systolic/diastolic` | `mmHg` | ⚠️ als Wellness-Schätzung labeln |
| `BloodGlucoseData` | `blood_glucose_estimated` | `mg/dl` | ⚠️ nur Schätzung, Warnhinweis Pflicht |
| `RespiratoryData` | `respiration_rate` | `breaths/min` | |
| `SportData.step` | `steps` | `count` | |
| `SportData.distance` | `distance_m` | `m` | |
| `SportData.calorie` | `calories_kcal` | `kcal` | |
| `SleepData` | → `SleepSession` (separates Modell) | | |

## 5. Beispiel Kotlin-Bridge-Skeleton (RN Version)

```kotlin
package com.vitaguide.hband

import com.facebook.react.bridge.*
import com.veepoo.protocol.VPOperateManager

class HBandBridgeModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

  private val vp: VPOperateManager = VPOperateManager.getMangerInstance(reactContext)

  override fun getName() = "HBandBridge"

  @ReactMethod
  fun scan(promise: Promise) {
    vp.startScanDevice(object : SearchResponse {
      override fun onDeviceFoundWithScanRecord(dev: SearchResult?) {
        val map = Arguments.createMap().apply {
          putString("id", dev?.device?.address)
          putString("name", dev?.name)
          putInt("rssi", dev?.rssi ?: 0)
          putString("provider", "hband")
        }
        emitEvent("scanBluetoothResult", map)
      }
      override fun onSearchStopped() {}
      override fun onSearchStarted() {}
      override fun onSearchCanceled() {}
    })
    promise.resolve(null)
  }

  @ReactMethod
  fun connect(address: String, promise: Promise) {
    vp.registerConnectStatusListener(address) { code, status -> emitConnectionState(status) }
    vp.connectDevice(address, /* pwd */ "0000", true /* is24h */,
      { pwdData -> promise.resolve(pwdData?.isSuccess ?: false) },
      { functionSupport -> emitCapabilities(functionSupport) }
    )
  }

  // … disconnect, readBattery, startDetectHeart, startDetectSpoh,
  //    syncHealthData, startDetectECG, updateFirmware, pushUserSettings
}
```

## 6. Beispiel Swift-Bridge-Skeleton (iOS)

```swift
import VeepooSDK   // or `VeepooKit.framework`

@objc(HBandBridge)
class HBandBridge: RCTEventEmitter {
  private let peripheral = VPPeripheralManager.shared

  override func supportedEvents() -> [String] {
    return ["scanBluetoothResult", "connectionStatus", "detectHeart",
            "detectSpoh", "detectECG", "detectHRV", "detectTemperature",
            "syncProgress", "otaProgress"]
  }

  @objc func scan(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    peripheral.startScan { device in
      self.sendEvent(withName: "scanBluetoothResult", body: [
        "id":   device.uuid,
        "name": device.name,
        "rssi": device.rssi,
        "provider": "hband"
      ])
    }
    resolve(nil)
  }

  // … connect, readBattery, startDetectHeart, syncHealthData, …
}
```

## 7. Copy-Anleitung für spätere Umsetzung

1. **Android AAR** ins Verzeichnis `frontend/android/app/libs/` legen
2. In `frontend/android/app/build.gradle`:
   ```gradle
   dependencies { implementation files('libs/vpbluetooth-x.x.x.aar') }
   ```
3. Konfig-Plugin (`plugins/hband-native/`) erstellen oder direkt Modul-Files
4. `HBandBridgeModule.kt` + `HBandBridgePackage.kt` in `android/app/src/main/java/com/vitaguide/hband/`
5. In `MainApplication.java/kt`: `packages.add(HBandBridgePackage())`
6. iOS: Framework via Podfile referenzieren, `HBandBridge.swift` + `RCT_EXTERN_MODULE` Objective-C Wrapper
7. EAS Build: `eas build --profile development --platform android` → APK mit Native-Modul
8. In App: `NativeModules.HBandBridge` wird verfügbar → `isNativeBridgeAvailable()` liefert `true` → automatischer Wechsel weg vom DemoProvider

---

**Referenz-Community-Plugin:** https://github.com/geekswamp/flutter_veepoo_sdk_plus
(Apache-2.0, ~250 Zeilen Kotlin für 20 Methoden – 1:1 auf RN übertragbar)
