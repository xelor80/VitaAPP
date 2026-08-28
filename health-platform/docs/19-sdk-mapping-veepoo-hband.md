# 19 – SDK-Mapping: Veepoo HBand SDK

> **Quelle:** GitHub-Organisation [HBandSDK](https://github.com/HBandSDK) (Veepoo).
> Diese Analyse basiert auf den **öffentlichen SDK-Repos und Wiki-Dokumenten** (Stand der
> Sichtung). Klassen-/Methodennamen sind gegen die **konkret eingebundene SDK-Version** und die
> **realen Gerätemodelle** noch zu verifizieren (→ Abschnitt „Offene Punkte").

## 1. Identifikation

| Punkt | Ergebnis |
|-------|----------|
| Hersteller / SDK | **Veepoo**, SDK-Familie **HBand / VPBluetooth** |
| Verfügbare SDKs | **Android** (`Android_Ble_SDK`, Java, `.aar`), **iOS** (`iOS_Ble_SDK`, Objective-C), WeChat Mini Program, HarmonyOS, uni-app |
| Lizenz | Apache-2.0 (öffentlich auf GitHub) → Binaries direkt beziehbar |
| **Flutter-Binding** | **Kein offizielles** vorhanden → wir schreiben eigene native Wrapper via Platform Channels (bestätigt Konzept aus [Dok. 07](07-sdk-integration.md)) |
| Chips | Nordic, Goodix, JieLi, Bluetrum (unterschiedliche Fähigkeiten je Gerät) |

## 2. Kern-Einstiegspunkte

| Plattform | Zentrale Klasse | Auth/Init |
|-----------|-----------------|-----------|
| **Android** | `VPOperateManager.getMangerInstance(context)` | `confirmDevicePwd(pwd, …)` (Default-PW oft `"0000"`) liefert `PwdData` (Firmware/Version) **und** Funktions-Support |
| **iOS** | `VPBleCentralManager.sharedBleManager()` (+ `peripheralManage`) | Passwort-/Handshake während `veepooSDKConnectDevice:` |

**Wichtig:** Auth + **Capability-Discovery** kommen beim Verbinden zusammen. Ohne erfolgreiche
Passwort-Bestätigung liefert das Gerät keine Daten.

## 3. Capability-Discovery (entscheidend für „keine erfundenen Werte")

Welche Metriken ein **konkretes** Gerät kann, ist **gerätespezifisch** und muss ausgelesen werden:

| Plattform | Mechanismus |
|-----------|-------------|
| **Android** | `IDeviceFuctionDataListener` → `onDeviceFunctionPackage1Report(DeviceFunctionPackage1)` … `Package5Report` (neu). `FunctionDeviceSupportData` = **deprecated** |
| **iOS** | Properties auf `VPPeripheralModel`: `deviceFuctionData` (Flags), `ecgType` (0=kein,1=E,2=G), `hrvType` (≠0=an), `temperatureType` (0/1/2/4/5), `sleepType` (0=normal,1/3=accurate) |

→ Der HAL ruft nach dem Pairing diese Flags ab, speichert sie als `devices.capabilities`
([Dok. 03](03-datenbankmodell.md)) und die App zeigt nicht unterstützte Werte als „Von diesem
Gerät nicht unterstützt.".

## 4. Mapping-Tabelle: SDK → interner `WearableProvider`

Legende: **RT** = Echtzeit-Messung (aktiv gestartet), **H** = Historie (aus Gerätespeicher, Sync).

| Interne Funktion (HAL) | Metric | Einheit | Android (VPOperateManager) | iOS (VPBleCentralManager) | RT/H | Anmerkungen |
|------------------------|--------|---------|----------------------------|----------------------------|------|-------------|
| `getHeartRate()` / `realtime(hr)` | `heart_rate` | bpm | `startDetectHeart(resp, IHeartDataListener)` / `stopDetectHeart` | `veepooSDKTestHeartStart:testResult:` (`VPTestHeartState`) | RT | RT akku-intensiv; Historie im Tages-Read |
| HR-Historie | `heart_rate` | bpm | via `readAllHealthDataBySettingOriginData` (`IOriginDataListener.onOringinFiveMinuteDataChange`) | `veepooSDKGetOriginalDataWithDate:andTableID:` (5–10-min), `…HalfHour…` | H | 5-Min-Raster |
| `getSpO2()` | `spo2` | % | aus Tagesdaten: `IOriginData3Listener.onOriginSpo2OriginListDataChange(List<Spo2hOriginData>)` | in `veepooSdkStartReadDeviceAllData…` | H | **kein** dediziertes RT-Interface dokumentiert; ggf. gerätespezifisch |
| `getBloodPressure()` | `bp_systolic`/`bp_diastolic` | mmHg | Tagesdaten `OriginData.highValue/lowValue`; Auto-BP via `CustomSetting` | `VPSettingAutomaticBPTest` + Tagesdaten | H | oft „kalibriertes"/geschätztes BP; Genauigkeit prüfen |
| `getHrv()` | `hrv` | ms | `IOriginData3Listener.onOriginHRVOriginListDataChange(List<HRVOriginData>)`; Auto: `CustomSetting.isOpenAutoHRV` | `hrvType`≠0; `veepooSDKGetDeviceHrvDataWithDate:andTableID:` (RR + berechnet) | H | minütliche RR-Intervalle |
| `getECG()` | `ecg` | mV @ Hz | `startDetectECG(resp, isNeedCurve, IECGDetectListener)` → `onEcgDetectStateChange/ResultChange/onEcgADCChange` | `veepooSDKTestECGStart:testResult:` (`VPECGTestDataModel`); offline `veepooSDKGetDeviceOffStoreECGWithDate:` | RT (+H) | Rohsignal (ADC) verfügbar; nur `ecgType>0` |
| `getTemperature()` / `realtime(temp)` | `temperature` | °C | `startDetectTempture(resp, l)` / `stopDetectTempture`; `ITemptureDetectDataListener.onDataChange(TemptureDetectData)` | `veepooSDK_temperatureTestStart:result:` (`VPTemperatureTestState`, 0–100 %); Hist. `veepooSDKGetDeviceTemperatureDataWithDate:` | RT+H | Haut-/Oberflächentemp.; `temperatureType` |
| `getSleep()` | `sleep` | Phasen/min | `readAllHealthDataBySettingOriginData` → `IAllHealthDataListener.onSleepDataChange(day, SleepData)` | `veepooSDKGetSleepDataWithDate:` (normal) / `veepooSDKGetAccurateSleepDataWithDate:` (`VPAccurateSleepModel`) | H | Tief/Leicht/Wach; „accurate" wenn `sleepType`=1/3 (REM ggf.) |
| `getSteps()` | `steps` (+distance,kcal) | count/m/kcal | RT `readSportStep(resp, ISportDataListener)` (`SportData`); Hist. im Tages-Read | `veepooSDKGetStepDataWithDate:andTableID:changeUserStature:` (~5-min) | RT+H | Schritte/Distanz/Kalorien zusammen |
| Stress | `stress` | Score | Setting `VPSettingStress`; Wert in Original-Data | analog `VPSettingStress` | H | in Rohdaten-Dictionary |
| MET | `met` | MET | Setting `VPSettingMet` | analog | H | in Rohdaten |
| `getBattery()` | – | % | `readBattery(resp, IBatteryDataListener)` → `BatteryData(batteryPercent, powerModel)` | `veepooSDKReadDeviceBatteryInfo:` / `…AndChargeInfo:` (`VPDeviceChargeState`) | RT | Laden/Voll-Status (iOS) |
| `getDeviceInfo()` | – | – | `PwdData.deviceVersion/deviceTestVersion/deviceNumber` (aus `confirmDevicePwd`) | Peripheral-Properties + Version | – | Firmware/Modell |
| Tages-Voll-Sync | mehrere | – | `readAllHealthDataBySettingOriginData(l, day, position, watchday)` / `readOriginDataBySetting` | `veepooSdkStartReadDeviceAllData:` (Start/Reading/Complete) | H | **liefert** HR-5min, SpO2, BP, HRV, Sleep, Steps gebündelt |
| Zeit setzen | – | – | via `confirmDevicePwd` + `DeviceTimeSetting` (default Phone-Zeit) | `veepooSDKSettingTimeWithResult:` (Phone-Zeit) | – | **Zeitbasis = Telefonzeit** → Normalisierung nötig |
| Personendaten | – | – | `syncPersonInfo(resp, l, PersonInfoData)` (Größe/Gewicht/Alter/Geschlecht/Ziele) | `veepooSDKSynchronousPersonalInformation:` | – | beeinflusst Kalorien/Schritt-Berechnung |

## 5. Architektur-Konsequenzen (wichtig!)

1. **Kommandos strikt serialisieren.** Beide SDKs warnen: **keine gleichzeitigen/asynchronen
   Operationen** – parallele Lese-/Schreibbefehle führen zu Datenfehlern. → Der HAL bekommt eine
   **serielle Befehls-Queue** (ein Kommando zur Zeit, mit Timeout), die alle `WearableProvider`-
   Aufrufe durchschleust. Das ergänzt [Dok. 08](08-ble-sync-konzept.md).
2. **Auth-Passwort-Handling.** Kopplung erfordert Geräte-Passwort (häufig `0000`) + 12/24h-Modus.
   Pairing-Flow ([Dok. 08](08-ble-sync-konzept.md)) um Passwort-Schritt ergänzen.
3. **Zeitbasis = Telefonzeit.** Das Gerät wird auf die Phone-Zeit gesetzt; historische Stempel
   sind lokal. → Beim Ingest in UTC normalisieren, Zeitzonen-Drift beachten (Dedup, Dok. 08).
4. **Meiste Metriken sind Historie**, kein Live-Stream (Ausnahmen: HR, ECG, Temp, Steps-RT).
   → Today-Dashboard speist sich primär aus dem **Tages-Voll-Sync**, nicht aus Live-Werten.
5. **Blutdruck/SpO2 oft berechnet/geschätzt** und gerätespezifisch → konservative Warn-Regeln,
   Qualitätsflag setzen, Genauigkeit mit Hersteller klären (Dok. 17).
6. **Persistenz:** SDK bietet eigene Persistenz **oder** App-eigene. → Wir nutzen **App-eigene**
   (Drift/Backend), SDK-Persistenz aus, um Datenhoheit/DSGVO-Löschung zu behalten.
7. **Kein Flutter-Binding** → eigener MethodChannel-Wrapper um `.aar` (Android) und
   `.framework` (iOS). Alternativ prüfen: unoffizielle Community-Plugins (nicht empfohlen als Basis).

## 6. Plattform-/Betriebs-Notizen

- **Android:** min. API 19 + BLE 4.0; Permissions `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` (12+),
  `ACCESS_FINE_LOCATION` (≤11); `BluetoothService` im Manifest; OTA-Services optional.
- **iOS:** min. Version im Doc **nicht** genannt (verifizieren); Background-BLE nicht dokumentiert
  → wie in [Dok. 08](08-ble-sync-konzept.md): Vordergrund-Sync als verlässlicher Weg annehmen.
- **OTA/Firmware:** SDK unterstützt OTA (Dial/Firmware), Batterie >30 % empfohlen.

## 7. Offene Punkte / noch zu verifizieren

- [ ] **Genaue SDK-Version** (`vpprotocol`/`vpbluetooth` .aar bzw. iOS-Framework), die wir einbinden.
- [ ] **Konkrete Gerätemodelle** und deren **Capability-Flags** (`DeviceFunctionPackage1..5`,
      `ecgType/hrvType/temperatureType/sleepType`) – bestimmt, welche Metriken real erscheinen.
- [ ] **Geräte-Passwort-Schema** (Standard, änderbar?) und 12/24h-Vorgaben.
- [ ] **SpO2-Echtzeit**: existiert je Gerät ein RT-Interface (`startDetectSpo2h` o. ä.)?
- [ ] **Blutdruck-Verfahren** (kalibriert/geschätzt) + Herstellerangabe zur Genauigkeit.
- [ ] **ECG-Rohsignal**: Sample-Rate, ADC-Format, Speichergröße.
- [ ] **iOS-Mindestversion** und tatsächliches Background-Verhalten.
- [ ] **Physisches Testgerät** für den PoC (Pairing + 1 realer Metrik-Sync auf iOS & Android).

## 8. Empfohlene nächste Schritte

1. **PoC** je Plattform: `.aar`/`.framework` einbinden, Scan → Connect → `confirmDevicePwd` →
   Capability-Discovery → **ein** Tages-Voll-Sync → normalisierte Messwerte im HAL.
2. HAL-**Befehls-Queue** (Serialisierung) + `VeepooProvider` als erste `WearableProvider`-Impl.
3. Mapping-Tabelle (Abschnitt 4) mit den **realen** Gerätemodellen final verifizieren.
4. Danach schrittweiser MVP-Aufbau ([Dok. 14](14-mvp-umfang.md)).
