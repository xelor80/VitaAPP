# 07 – SDK-Integrationskonzept (Hardware-Abstraction-Layer)

**Wichtigste Regel des Auftrags (Abschnitt 49):** Vor der Integration wird die SDK vollständig
analysiert und eine **SDK-Mapping-Dokumentation** erstellt. Erst danach Integration. Nichts wird
implementiert, dessen technische Grundlage ungeklärt ist.

> ✅ **Update:** Die SDK ist identifiziert – **Veepoo HBand / VPBluetooth** (Android + iOS). Die
> erste, konkrete SDK-Analyse und die ausgefüllte Mapping-Tabelle stehen in
> [Dok. 19](19-sdk-mapping-veepoo-hband.md). Die generische Vorlage/Prinzipien unten bleiben gültig;
> Restpunkte (Gerätemodelle, Capability-Flags, SDK-Version) in [Dok. 18](18-sdk-informationsbedarf.md).

## 1. Ziel: SDK entkoppeln

Die Hersteller-SDK (typisch: natives iOS-`.framework` + Android-`.aar`, herstellerspezifische
BLE-Services) wird **nie** direkt in App-Features benutzt. Zugriff ausschließlich über einen
abstrakten `WearableProvider`. So bleibt ein späterer zweiter Hersteller ein reiner Adapter.

```
Feature-Module ──► WearableProvider (Interface, normalisiert)
                        ▲
                        │ implementiert
                 VendorXProvider ──► Platform Channel ──► native SDK (iOS/Android)
```

## 2. Das `WearableProvider`-Interface

```dart
abstract class WearableProvider {
  // Lebenszyklus / Verbindung
  Future<List<WearableDevice>> scan({Duration timeout});
  Future<void> connect(WearableDevice device);
  Future<void> disconnect();
  Stream<ConnectionState> get connectionState;

  // Daten – Historie (Sync) und ggf. Echtzeit
  Future<SyncResult> sync({DateTime? since});      // Batch aus Gerätespeicher
  Stream<Measurement>? realtime(MetricType metric); // nur falls SDK Echtzeit liefert

  // Einzelabfragen (soweit SDK unterstützt)
  Future<List<Measurement>> getHeartRate({Range range});
  Future<List<Measurement>> getHrv({Range range});
  Future<List<Measurement>> getSpO2({Range range});
  Future<List<BloodPressure>> getBloodPressure({Range range});
  Future<List<Measurement>> getTemperature({Range range});
  Future<List<SleepSession>> getSleep({Range range});
  Future<List<Measurement>> getSteps({Range range});
  Future<EcgRecording?> getECG();                  // Rohsignal + Metadaten
  Future<List<Measurement>> getStress({Range range});
  Future<int?> getBattery();
  Future<DeviceInfo> getDeviceInfo();

  // Capability-Discovery – welche Metriken kann DIESES Gerät?
  Future<Set<MetricType>> capabilities();
}
```

- **Normalisierte Rückgaben** (`Measurement`, `SleepSession`, …) – **nie** SDK-Typen nach außen.
- **Capability-Discovery** ist Pflicht: Fehlt eine Metrik → App zeigt „Von diesem Gerät nicht
  unterstützt.“ (keine Fake-Werte).
- **Optionalität:** `realtime()` und `getECG()` liefern `null`, wenn die SDK das nicht kann.

## 3. Native Bindung (Platform Channels)

```
Flutter (Dart)
  ├─ MethodChannel  "wearable/commands"   → connect/sync/getX (Request/Response)
  └─ EventChannel   "wearable/events"     → connectionState, realtime, sync-progress
iOS: Swift-Wrapper um Hersteller-.framework
Android: Kotlin-Wrapper um Hersteller-.aar
```

Der native Wrapper übersetzt SDK-Callbacks/Events in ein **einheitliches JSON-Protokoll**, das der
Dart-`VendorXProvider` in normalisierte Modelle mappt.

## 4. Provider-Registry (Mehr-Hersteller-fähig)

```dart
final registry = WearableRegistry()
  ..register('veepoo_hband_v1', () => VeepooProvider());   // erste konkrete Impl.
// später: ..register('vendorY_v1', () => VendorYProvider());
```
Geräte tragen `provider_key` (DB, Dok. 03). Die App wählt anhand dessen den passenden Provider.

> **Serialisierung (Veepoo-spezifisch, aber generell sinnvoll):** Die Veepoo-SDK verträgt **keine
> gleichzeitigen** BLE-Operationen. Der HAL erhält daher eine **serielle Befehls-Queue** (ein
> Kommando zur Zeit, mit Timeout), durch die alle Provider-Aufrufe laufen. Details in
> [Dok. 19 §5](19-sdk-mapping-veepoo-hband.md).

## 5. SDK-Mapping-Dokumentation (Artefakt vor der Integration)

Pro SDK-Funktion eine Zeile – Vorlage:

| SDK-Funktion | interne App-Funktion | Metric/Datentyp | Einheit | Plattform (iOS/Android) | Echtzeit/Historie | Auflösung/Frequenz | Hinweise/Genauigkeit |
|--------------|----------------------|-----------------|---------|-------------------------|-------------------|--------------------|----------------------|
| `getHeartRateHistory()` | `getHeartRate()` | `heart_rate` | bpm | beide | Historie | 1/min | … |
| `startRealtimeHR()` | `realtime(heart_rate)` | `heart_rate` | bpm | beide? | Echtzeit | 1/s | Akku-intensiv |
| `getSpo2()` | `getSpO2()` | `spo2` | % | beide | Historie | punktuell | … |
| `getEcgRaw()` | `getECG()` | `ecg` | mV @ Hz | ? | Historie | Rohsignal | Sample-Rate klären |
| … | … | … | … | … | … | … | … |

> Diese Tabelle wird **aus der realen SDK** gefüllt, sobald mir die Unterlagen vorliegen. Sie ist
> die Freigabe-Grundlage für die eigentliche Integration.

## 6. Datenqualität & Zeitstempel

- **Zeitbasis klären:** Liefert die SDK UTC oder Gerätezeit? → beim Ingest normalisieren, Server
  liefert Serverzeit für Uhrenabgleich (`/sync/status`).
- **Qualitätsflag** übernehmen, falls SDK es liefert (`quality`), sonst `unknown`.
- **Rohdaten (EKG):** nur Metadaten in DB, Rohsignal verschlüsselt in S3 (`raw_ref`).

## 7. Offene SDK-Punkte (→ Dok. 18)

Hintergrundsync-Fähigkeit, iOS/Android-Parität, Geräteidentifikation, Firmware-Update-Wege,
Batterie-Events, Herstellerangaben zur Messgenauigkeit, verfügbare Rohdaten, Callback-/Event-Struktur.
