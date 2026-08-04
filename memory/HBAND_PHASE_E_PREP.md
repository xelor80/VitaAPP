# iOS-Vorbereitung für Phase E – Status

**Datum:** 2026-02-04
**Status:** ✅ Frameworks + Config-Plugin-iOS-Zweig fertig — bereit für Phase E

## Was ist jetzt in Position

### Frameworks (23 MB gesamt, in `/plugins/with-hband-sdk/ios-frameworks/`)
| Framework | Größe | Zweck |
|---|---|---|
| `VeepooBleSDK.framework` | 15 MB | **Kern-SDK** (VPBleCentralManage, 123 public headers, iOS 10+) |
| `iOSMcuManagerLibrary.framework` | 3.6 MB | Nordic MCU OTA für spätere Firmware-Updates |
| `GRDFUSDK.framework` | 2.5 MB | Goodix-Chip DFU (ältere Bänder) |
| `SwiftCBOR.framework` | 1.2 MB | Nordic-Dependency |
| `ZIPFoundation.framework` | 748 KB | ZIP-Handling für Firmware-Bundles |
| `ABParTool.framework` | 84 KB | Bluetrum-Chip Partitionen |

Alle stammen aus Version **2.2.XX.15** (aktuellste offizielle Release, iOS 26.5 SDK gebaut).

### Bridge-Skeleton (`/plugins/with-hband-sdk/ios-source/`)
- **`HBandBridge.swift`** — RCTEventEmitter mit spiegel-symmetrischen Methoden zum Kotlin-Modul.
  Alle Phase-A-Methoden sind vorbereitet, Phase B/C/D werfen `NOT_IMPLEMENTED`.
  Kommentare zeigen die exakten SDK-Aufrufe die in Phase E aktiviert werden müssen.
- **`HBandBridge.m`** — Obj-C bridge-header (RCT_EXTERN_MODULE), damit RN die Swift-Methoden findet.

### Config-Plugin-iOS-Zweig (in `index.js`)
- `withHBandIosFrameworks` — kopiert bei jedem `expo prebuild`:
  - alle 6 `.framework`-Bundles → `ios/Frameworks/`
  - `HBandBridge.swift` + `HBandBridge.m` → `ios/{appName}/HBand/`
  - schreibt `ios/Frameworks/HBandSdkLocal.podspec` (Podspec-Wrapper, alle Frameworks als `vendored_frameworks`)
- `withHBandIosPodfile` — injiziert `pod 'HBandSdkLocal', :path => './Frameworks'` in Podfile
  (vor `post_install`-Block, mit Marker-Kommentar für Idempotenz)

## Was Phase E dann konkret braucht

Wenn Android-Phase B/C/D fertig getestet ist, für iOS aktivieren:

1. **In `HBandBridge.swift`**: `TODO Phase E`-Blöcke ausklammern, echte SDK-Calls aktivieren:
   ```swift
   import VeepooBleSDK
   VPBleCentralManage.share().scanForPeripherals { peripheral, advData, rssi in
     self.sendEvent(withName: "HBand:scanResult", body: [...])
   }
   ```
2. **Bridging-Header** einrichten:
   - Xcode → Build Settings → `Swift Compiler - General` → `Objective-C Bridging Header`
   - Setzen auf `{appName}/HBand/HBand-Bridging-Header.h` mit:
     ```objc
     #import <VeepooBleSDK/VeepooBleSDK.h>
     ```
3. **Test**: `eas build --profile preview --platform ios` → TestFlight
4. **Falls Xcode das Framework nicht findet**: `Framework Search Paths` in Xcode = `$(PROJECT_DIR)/Frameworks`

## Fun Fact
Das iOS-Framework wurde mit **Xcode 26.5, min iOS 10.0** kompiliert — kompatibel mit
allen aktuellen iPhones. Kein Bitcode benötigt (`ENABLE_BITCODE = NO` in der Podspec gesetzt).
Die 15 MB verteilen sich auf 123 Header + FAT-Binary (arm64).

## Lizenz-Hinweis
Alle Frameworks stammen aus dem offiziellen **HBandSDK/iOS_Ble_SDK** GitHub-Repo,
lizenziert unter **Apache-2.0**. Kommerzielle Nutzung ist erlaubt, Copyright-Vermerk
im App-Impressum wäre höflich („Powered by Veepoo BLE SDK").
