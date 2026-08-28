import 'metric_type.dart';

/// Normalisierte Datenmodelle des HAL – NIE SDK-Typen nach außen geben (docs/07).

enum WearableConnectionState { disconnected, connecting, connected, error }

enum MeasurementQuality { good, fair, poor, unknown }

class WearableDevice {
  const WearableDevice({
    required this.id,
    required this.name,
    this.rssi,
  });

  final String id; // BLE-Identifier
  final String name;
  final int? rssi;
}

class DeviceInfo {
  const DeviceInfo({
    required this.model,
    this.firmware,
    this.serial,
    this.battery,
  });

  final String model;
  final String? firmware;
  final String? serial;
  final int? battery; // 0..100
}

class Measurement {
  const Measurement({
    required this.metric,
    required this.value,
    required this.unit,
    required this.time,
    this.quality = MeasurementQuality.unknown,
    required this.ingestKey,
  });

  final MetricType metric;
  final double value;
  final String unit;
  final DateTime time; // in UTC normalisiert
  final MeasurementQuality quality;

  /// Idempotenz-Schlüssel für den Sync (docs/08).
  final String ingestKey;
}

class BloodPressure {
  const BloodPressure({
    required this.systolic,
    required this.diastolic,
    this.pulse,
    required this.time,
    required this.ingestKey,
  });

  final int systolic;
  final int diastolic;
  final int? pulse;
  final DateTime time;
  final String ingestKey;
}

class SleepSession {
  const SleepSession({
    required this.start,
    required this.end,
    required this.totalMinutes,
    this.deepMinutes,
    this.lightMinutes,
    this.remMinutes,
    this.awakeMinutes,
    this.sleepScore,
    required this.ingestKey,
  });

  final DateTime start;
  final DateTime end;
  final int totalMinutes;
  final int? deepMinutes;
  final int? lightMinutes;
  final int? remMinutes;
  final int? awakeMinutes;
  final int? sleepScore;
  final String ingestKey;
}

class EcgRecording {
  const EcgRecording({
    required this.durationSeconds,
    required this.sampleRate,
    required this.samples,
    required this.time,
  });

  final int durationSeconds;
  final int sampleRate;
  final List<double> samples; // Roh-ADC/mV
  final DateTime time;
}

/// Ergebnis eines Sync-Laufs (aus dem Gerätespeicher).
class SyncResult {
  const SyncResult({
    required this.measurements,
    this.bloodPressure = const [],
    this.sleep = const [],
  });

  final List<Measurement> measurements;
  final List<BloodPressure> bloodPressure;
  final List<SleepSession> sleep;
}
