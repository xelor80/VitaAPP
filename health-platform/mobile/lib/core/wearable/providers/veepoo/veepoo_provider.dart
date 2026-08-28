import 'dart:async';

import '../../command_queue.dart';
import '../../metric_type.dart';
import '../../models.dart';
import '../../wearable_provider.dart';
import 'veepoo_channel.dart';

/// Veepoo/HBand-Implementierung des [WearableProvider].
///
/// GERÜST: Die Methoden rufen die nativen Wrapper über [VeepooChannel] auf.
/// Alle Kommandos laufen durch die serielle [CommandQueue] (keine parallelen
/// BLE-Operationen, docs/19 §5). Das Feintuning des JSON-Mappings erfolgt am
/// realen Gerät (Mecorly V500) im PoC.
class VeepooProvider implements WearableProvider {
  VeepooProvider({CommandQueue? queue}) : _queue = queue ?? CommandQueue();

  final CommandQueue _queue;

  @override
  String get providerKey => 'veepoo_hband_v1';

  @override
  Stream<WearableConnectionState> get connectionState => VeepooChannel.events
      .receiveBroadcastStream()
      .where((e) => e is Map && e['type'] == VeepooChannel.evtConnectionState)
      .map((e) => _mapConnectionState((e as Map)['state'] as String?));

  @override
  Future<List<WearableDevice>> scan({
    Duration timeout = const Duration(seconds: 10),
  }) {
    return _queue.run(() async {
      final result = await VeepooChannel.commands.invokeMethod<List<dynamic>>(
        VeepooChannel.scan,
        {'timeoutMs': timeout.inMilliseconds},
      );
      return (result ?? [])
          .cast<Map<dynamic, dynamic>>()
          .map((m) => WearableDevice(
                id: m['id'] as String,
                name: (m['name'] as String?) ?? 'Unbekannt',
                rssi: m['rssi'] as int?,
              ))
          .toList();
    }, timeout: timeout + const Duration(seconds: 2));
  }

  @override
  Future<void> connect(WearableDevice device, {String password = '0000'}) {
    // Standard-Passwort des Mecorly V500 ist 0000 (docs/19 §7).
    return _queue.run(() => VeepooChannel.commands.invokeMethod<void>(
          VeepooChannel.connect,
          {'id': device.id, 'password': password},
        ));
  }

  @override
  Future<void> disconnect() => _queue.run(
      () => VeepooChannel.commands.invokeMethod<void>(VeepooChannel.disconnect));

  @override
  Future<Set<MetricType>> capabilities() {
    return _queue.run(() async {
      final caps = await VeepooChannel.commands
          .invokeMethod<List<dynamic>>(VeepooChannel.capabilities);
      final keys = (caps ?? []).cast<String>().toSet();
      // Nur real gemeldete Fähigkeiten – keine Annahmen (docs/50).
      return MetricType.values.where((m) => keys.contains(m.key)).toSet();
    });
  }

  @override
  Future<DeviceInfo> getDeviceInfo() {
    return _queue.run(() async {
      final m = await VeepooChannel.commands
          .invokeMethod<Map<dynamic, dynamic>>(VeepooChannel.deviceInfo);
      return DeviceInfo(
        model: (m?['model'] as String?) ?? 'Mecorly V500',
        firmware: m?['firmware'] as String?,
        serial: m?['serial'] as String?,
        battery: m?['battery'] as int?,
      );
    });
  }

  @override
  Future<int?> getBattery() => _queue.run(() =>
      VeepooChannel.commands.invokeMethod<int>(VeepooChannel.battery));

  @override
  Future<SyncResult> sync({DateTime? since}) {
    return _queue.run(() async {
      final raw = await VeepooChannel.commands
          .invokeMethod<Map<dynamic, dynamic>>(VeepooChannel.sync, {
        'sinceEpochMs': since?.toUtc().millisecondsSinceEpoch,
      });
      return _mapSyncResult(raw);
    }, timeout: const Duration(minutes: 2));
  }

  @override
  Stream<Measurement>? realtime(MetricType metric) {
    // Echtzeit nur für Metriken, die die SDK live liefert (HR, Temp …).
    return VeepooChannel.events
        .receiveBroadcastStream({'action': VeepooChannel.startRealtime, 'metric': metric.key})
        .where((e) => e is Map && e['type'] == VeepooChannel.evtRealtimeMeasurement)
        .map((e) => _mapMeasurement((e as Map).cast<String, dynamic>()));
  }

  @override
  Future<EcgRecording?> recordEcg() {
    return _queue.run(() async {
      final m = await VeepooChannel.commands
          .invokeMethod<Map<dynamic, dynamic>>(VeepooChannel.recordEcg);
      if (m == null) return null;
      return EcgRecording(
        durationSeconds: (m['durationSeconds'] as int?) ?? 0,
        sampleRate: (m['sampleRate'] as int?) ?? 0,
        samples: ((m['samples'] as List<dynamic>?) ?? [])
            .map((e) => (e as num).toDouble())
            .toList(),
        time: DateTime.fromMillisecondsSinceEpoch(
          (m['timeEpochMs'] as int?) ?? DateTime.now().millisecondsSinceEpoch,
          isUtc: true,
        ),
      );
    }, timeout: const Duration(minutes: 1));
  }

  // --- Mapping-Helfer (native JSON -> normalisierte Modelle) ---

  WearableConnectionState _mapConnectionState(String? s) {
    switch (s) {
      case 'connected':
        return WearableConnectionState.connected;
      case 'connecting':
        return WearableConnectionState.connecting;
      case 'error':
        return WearableConnectionState.error;
      default:
        return WearableConnectionState.disconnected;
    }
  }

  Measurement _mapMeasurement(Map<String, dynamic> m) {
    final metric = MetricType.values.firstWhere(
      (t) => t.key == m['metric'],
      orElse: () => MetricType.heartRate,
    );
    return Measurement(
      metric: metric,
      value: (m['value'] as num).toDouble(),
      unit: (m['unit'] as String?) ?? '',
      // Zeitbasis der SDK ist Gerätezeit -> in UTC normalisieren (docs/19 §5).
      time: DateTime.fromMillisecondsSinceEpoch(
        (m['timeEpochMs'] as int?) ?? DateTime.now().millisecondsSinceEpoch,
        isUtc: true,
      ).toUtc(),
      ingestKey: (m['ingestKey'] as String?) ??
          '${m['metric']}-${m['timeEpochMs']}',
    );
  }

  SyncResult _mapSyncResult(Map<dynamic, dynamic>? raw) {
    if (raw == null) return const SyncResult(measurements: []);
    final measurements = ((raw['measurements'] as List<dynamic>?) ?? [])
        .map((e) => _mapMeasurement((e as Map).cast<String, dynamic>()))
        .toList();
    return SyncResult(measurements: measurements);
  }
}
