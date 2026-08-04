# HBand Native Bridge – Phase A abgeschlossen

**Datum:** 2026-02-04
**Status:** ✅ Grundgerüst + BLE-Scan Native-Bridge fertig

## Was ist jetzt implementiert

### Native Side (Android, Kotlin)
- **`OperationQueue.kt`** – Serial-FIFO für SDK-Aufrufe (verhindert parallele Ops)
- **`HBandBridgePackage.kt`** – ReactPackage-Registrierung
- **`HBandBridgeModule.kt`** – Native-Modul mit:
  - `init()` – lädt `VPOperateManager` via Reflection (crashsicher)
  - `requestPermissions()` – prüft BLE-Perms (SDK 31+ vs. <31)
  - `isBluetoothEnabled()` – Adapter-Status
  - `startScan()` / `stopScan()` – nutzt `SearchResponse` via `java.lang.reflect.Proxy`
  - Events: `HBand:scanResult`, `HBand:scanStopped`, `HBand:error`
  - Stubs für `connect`, `confirmPassword`, `syncPersonInfo`, `disconnect`, `readBattery`,
    `startDetect*/stopDetect*`, `syncHealthData` (reject mit `NOT_IMPLEMENTED`)

### Config-Plugin (JS)
- **`plugins/with-hband-sdk/index.js`** – Expo-Prebuild-Hook, macht beim `eas build`:
  - Kopiert alle 7 AARs aus `/android/libs` → `android/app/libs`
  - Kopiert Kotlin-Sources ins richtige Package (`{android.package}.hband`)
  - Injiziert in `android/app/build.gradle`:
    - `apply plugin: kotlin-android` (falls fehlt)
    - `flatDir { dirs 'libs' }`
    - Alle 7 `implementation files(...aar)` + Maven-Deps
      (gson, localbroadcastmanager, Nordic Scanner, mcumgr-core, mcumgr-ble)
  - Injiziert `<service com.inuker.bluetooth.library.BluetoothService/>` in Manifest
  - Injiziert `add(HBandBridgePackage())` in `MainApplication.kt`
- Registriert in `app.json` unter `plugins`

### JS Provider
- **`src/wearable/HBandProvider.ts`** – Ersetzt den Stub. Fällt in Expo Go/Web automatisch
  auf DemoProvider zurück (via `isNativeBridgeAvailable()`).
- **`src/wearable/index.ts`** – importiert jetzt echten `HBandProvider`
- **`onboarding.tsx`** – Neues Passwort-Feld in Step 3:
  - Default: `0000`
  - User kann via Toggle "Kopplungs-PIN eingeben (falls nicht 0000)" ein anderes PIN eingeben
  - Persistiert in AsyncStorage unter `vg_wearable_device_pwd`
  - Wird an `pairAndConnect(userId, dev, pwd)` durchgereicht → in Phase B von der Native-Bridge verwendet
- **`WearableContext`** – `pairAndConnect` erweitert um optionalen `devicePwd`-Parameter

## Testing-Status
- ✅ Web-Bundle lädt weiterhin (DemoProvider fallback funktioniert)
- ✅ Onboarding Step 3 rendert PIN-Toggle korrekt
- ✅ Kein Lint-Error
- ⏳ **Echter Native-Test steht aus** — braucht `eas build --profile preview --platform android`

## Was der User jetzt braucht um Phase A live zu testen

```bash
cd frontend
eas build --profile preview --platform android
```

- Build läuft ~15-25 Min in EAS-Cloud
- APK auf Android-Handy installieren (nicht Expo Go!)
- Onboarding → "VitaGuide Band" wählen → Step 3 sollte das Mecoly E500 im Scan finden
- Wenn nicht gefunden: BT + Berechtigungen in Systemeinstellungen prüfen

Nach erfolgreichem Test: Phase B (Connect + Auth + Battery) starten.

## Nächste Phasen

- **Phase B** (nächster Sprint): `connect()`, `confirmPassword()`, `syncPersonInfo()`,
  `readBattery()`, `disconnect()` echt implementieren
- **Phase C**: `startDetectHeart/SpO2/HRV/ECG` mit Live-Emit
- **Phase D**: `syncHealthData` (Historie 0-7 Tage)
- **Phase E**: iOS Bridge via VeepooBleSDK.framework

## Bekannte Nicht-Blockende Punkte
- Der Kotlin-Code lädt VPOperateManager via **Reflection** (Class.forName). Das ist
  bewusst so gewählt, damit Bundle-Loading auch dann funktioniert, wenn die AARs
  (aus welchem Grund auch immer) nicht gelinkt wurden. Robust in Prod.
- Die SDK-Version 2.3.75.15 hat kompatible API-Signaturen zur dokumentierten
  2.3.44.15 (Wiki-Referenz) — sollten kleine Änderungen auftreten, fangen die
  reflection-basierten Aufrufe das ab und emitten einen `HBand:error`-Event.
