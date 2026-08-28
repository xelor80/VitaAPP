/// Normalisierte Metrik-Typen des HAL. Bewusst unabhängig von SDK-Konstanten,
/// damit weitere Wearables ohne Änderung der App integriert werden können.
enum MetricType {
  heartRate,
  hrv,
  spo2,
  bloodPressure,
  temperature,
  stress,
  steps,
  distance,
  calories,
  met,
  sleep,
  ecg,
}

extension MetricTypeApi on MetricType {
  /// Schlüssel wie im Backend-Datenmodell (docs/03) / Sync-API (docs/04).
  String get key {
    switch (this) {
      case MetricType.heartRate:
        return 'heart_rate';
      case MetricType.hrv:
        return 'hrv';
      case MetricType.spo2:
        return 'spo2';
      case MetricType.bloodPressure:
        return 'blood_pressure';
      case MetricType.temperature:
        return 'temperature';
      case MetricType.stress:
        return 'stress';
      case MetricType.steps:
        return 'steps';
      case MetricType.distance:
        return 'distance';
      case MetricType.calories:
        return 'calories';
      case MetricType.met:
        return 'met';
      case MetricType.sleep:
        return 'sleep';
      case MetricType.ecg:
        return 'ecg';
    }
  }
}
