# Native Veepoo-Wrapper (Referenz)

Diese Dateien implementieren die native Seite des Platform-Channel-Vertrags aus
[`../lib/core/wearable/providers/veepoo/veepoo_channel.dart`](../lib/core/wearable/providers/veepoo/veepoo_channel.dart).
Sie sind **Referenz-Gerüste** und kompilieren erst, wenn die Veepoo-SDK und die
Flutter-Plattformordner vorhanden sind.

## Einbinden (nach `flutter create .`)

**Android**
1. `.aar` der SDK nach `android/app/libs/` legen (`vpprotocol-*.aar`, `vpbluetooth-*.aar`, Chip-Libs).
2. In `android/app/build.gradle` einbinden:
   ```gradle
   dependencies {
     implementation fileTree(dir: 'libs', include: ['*.aar', '*.jar'])
   }
   ```
3. `VeepooChannelHandler.kt` nach `android/app/src/main/kotlin/app/vitaguide/wearable/` kopieren.
4. In `MainActivity.kt` registrieren:
   ```kotlin
   override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
     super.configureFlutterEngine(flutterEngine)
     val handler = VeepooChannelHandler(applicationContext)
     MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VeepooChannelHandler.COMMANDS)
       .setMethodCallHandler(handler)
     EventChannel(flutterEngine.dartExecutor.binaryMessenger, VeepooChannelHandler.EVENTS)
       .setStreamHandler(handler)
   }
   ```
5. Permissions in `AndroidManifest.xml`: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+),
   `ACCESS_FINE_LOCATION` (≤ API 30); `BluetoothService` registrieren (siehe SDK-Doku).

**iOS**
1. Veepoo-`.framework`/`.xcframework` in `ios/` einbinden (Podfile oder „Embed & Sign").
2. `VeepooChannelHandler.swift` nach `ios/Runner/` kopieren.
3. In `AppDelegate.swift`:
   ```swift
   let veepoo = VeepooChannelHandler()
   veepoo.register(with: registrar(forPlugin: "VeepooChannelHandler")!)
   ```
4. `Info.plist`: `NSBluetoothAlwaysUsageDescription` (+ ggf. Background-Modes, siehe docs/08).

## Prinzipien (docs/07, docs/19)
- Werte **normalisiert** zurückgeben, nie SDK-Typen.
- **Capability-Discovery** ehrlich: nur real gemeldete Metriken; kein EKG ohne `ecgType > 0`.
- **Serielle** Ausführung: die Dart-`CommandQueue` sorgt dafür — nativ keine parallelen SDK-Aufrufe starten.
- Zeitstempel als Epoch-Millis liefern; **UTC-Normalisierung** passiert in Dart.

Die konkreten SDK-Methoden sind in [`../../docs/19-sdk-mapping-veepoo-hband.md`](../../docs/19-sdk-mapping-veepoo-hband.md) gelistet.
