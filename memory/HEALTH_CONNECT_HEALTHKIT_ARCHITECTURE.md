# Health Connect / HealthKit – Architektur & Datenfluss

## Überblick

VitaGuide unterstützt **vier austauschbare Datenquellen** über ein einheitliches
`WearableProvider`-Interface:

```
┌────────────────────────────────────────────┐
│ WearableProvider (interface)                │
│  scanDevices / connect / sync / realtime …  │
└─────────────┬───────────────────────────────┘
              │
   ┌──────────┼──────────────┬────────────────┐
   ▼          ▼              ▼                ▼
HBand      HealthKit    HealthConnect      Demo
(BLE)      (iOS)        (Android)          (fake)
```

Der aktive Provider wird zur Laufzeit ausgewählt (User-Wahl im
`ProviderPicker`, persistiert in `AsyncStorage`).

## Reihenfolge der Auto-Detection

Wenn der User **keine** explizite Wahl getroffen hat:

1. **HBand-Native-Bridge** verfügbar? → nutze `HBandProvider`  
   (nur nach Integration des `.aar` / iOS-Framework in einen Custom-Build)
2. **HealthKit** verlinkt & iOS? → `HealthKitProvider`
3. **Health Connect** verlinkt & Android? → `HealthConnectProvider`
4. Sonst → `DemoProvider`

## Datenformat-Mapping

Alle Provider konvertieren native Payloads in unser einheitliches
`WearableMeasurement`-Schema:

| Metric-Type | HealthKit-Source | Health-Connect-Source |
|---|---|---|
| `heart_rate` | `HeartRate` | `HeartRate.samples[].beatsPerMinute` |
| `resting_heart_rate` | `RestingHeartRate` | `RestingHeartRate.beatsPerMinute` |
| `hrv` (ms) | `HeartRateVariabilitySDNN × 1000` | `HeartRateVariabilityRmssd.heartRateVariabilityMillis` |
| `spo2` (%) | `OxygenSaturation × 100` | `OxygenSaturation.percentage.value` |
| `respiration_rate` | `RespiratoryRate` | `RespiratoryRate.rate` |
| `skin_temperature` | `BodyTemperature` | `SkinTemperature.temperature.inCelsius` |
| `steps` | `DailyStepCount` | `Steps.count` |
| `distance_m` | `DailyDistanceWalkingRunning` | `Distance.distance.inMeters` |
| `calories_kcal` | `ActiveEnergyBurned` | `ActiveCaloriesBurned + TotalCaloriesBurned` |
| `blood_pressure_*` | `BloodPressureSample.value` | `BloodPressure.systolic/diastolic.inMillimetersOfMercury` |
| `blood_glucose_estimated` | `BloodGlucoseSample.value` | `BloodGlucose.level.inMilligramsPerDeciliter` |
| `sleep` | `SleepAnalysis` (grouped) | `SleepSession.stages[]` |

## Berechtigungen

### iOS (Info.plist + Entitlement)
```
NSHealthShareUsageDescription
NSHealthUpdateUsageDescription
com.apple.developer.healthkit
```

### Android (Manifest permissions)
```
android.permission.health.READ_HEART_RATE
android.permission.health.READ_HEART_RATE_VARIABILITY
android.permission.health.READ_OXYGEN_SATURATION
android.permission.health.READ_RESPIRATORY_RATE
android.permission.health.READ_BODY_TEMPERATURE
android.permission.health.READ_SKIN_TEMPERATURE
android.permission.health.READ_STEPS
android.permission.health.READ_DISTANCE
android.permission.health.READ_ACTIVE_CALORIES_BURNED
android.permission.health.READ_TOTAL_CALORIES_BURNED
android.permission.health.READ_SLEEP
android.permission.health.READ_BLOOD_PRESSURE
android.permission.health.READ_BLOOD_GLUCOSE
```

Alle Berechtigungen werden **on-demand** angefragt (nicht beim App-Start),
sobald der User im Onboarding oder in den Device-Settings die entsprechende
Quelle aktiviert.

## Realtime-Messungen

- **HBand**: echtes Push-Streaming aus dem Band (BLE-Notifies)
- **HealthKit / Health Connect**: kein natives Push-API → wir pollen alle 5 s
  den zuletzt geschriebenen Sample (Fallback, funktioniert für HR/SpO2/HRV)
- **EKG**: nur `HBandProvider` unterstützt Live-Waveform. HealthKit/Health-Connect
  haben kein React-Native-taugliches ECG-Realtime-API.

## Sicherheit / Privacy

- **Keine Daten verlassen die App**, bevor der User explizit „Sync" drückt.
- Beim `Sync` werden Daten an unsere Backend-API (`/api/wearable/measurements/batch`) übertragen.
- User kann Datenquelle jederzeit wechseln (Setting im Device-Settings-Screen).
- Beim „Trennen + Daten löschen" wird der Backend-DELETE-Endpoint mit
  `purge_data=true` aufgerufen und alle Messungen entfernt.

## Bekannte Einschränkungen

- HealthKit `getBloodPressureSamples` liefert kombinierte Sys/Dia im gleichen
  Sample; die Aufteilung passiert im `HealthKitProvider`.
- Health Connect gibt Blutzucker nur zurück, wenn eine Datenquelle (z.B.
  Dexcom, FreeStyle Libre) Werte reinschreibt.
- Apple Watch ECG API ist **nicht** über `react-native-health` verfügbar –
  User müssen weiterhin das VitaGuide Band für Live-EKG nutzen.
