import 'metric_type.dart';
import 'models.dart';

/// Abstrakter Zugriff auf ein Wearable (Hardware-Abstraction-Layer).
///
/// Die App-Features arbeiten ausschließlich gegen dieses Interface und die
/// normalisierten Modelle – nie gegen die Hersteller-SDK. Ein zweiter
/// Hersteller = eine zweite Implementierung (docs/07, docs/19).
abstract class WearableProvider {
  /// Eindeutiger Schlüssel (z. B. 'veepoo_hband_v1') – landet in `device.providerKey`.
  String get providerKey;

  // --- Verbindung ---
  Future<List<WearableDevice>> scan({Duration timeout});
  Future<void> connect(WearableDevice device, {String password});
  Future<void> disconnect();
  Stream<WearableConnectionState> get connectionState;

  /// Welche Metriken kann DIESES Gerät? (Capability-Discovery, docs/19).
  Future<Set<MetricType>> capabilities();

  Future<DeviceInfo> getDeviceInfo();
  Future<int?> getBattery();

  // --- Daten: Historie (Sync) ---
  Future<SyncResult> sync({DateTime? since});

  // --- Daten: Echtzeit (nur falls unterstützt, sonst null) ---
  Stream<Measurement>? realtime(MetricType metric);

  // --- EKG (nur falls capabilities MetricType.ecg enthält) ---
  Future<EcgRecording?> recordEcg();
}
