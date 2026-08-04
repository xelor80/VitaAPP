# HBand Integration – Changelog

> Jede substantielle Änderung im Rahmen der HBand-Wearable-Integration wird hier
> als knapper Bullet vermerkt (Datum, betroffene Files, Zweck).
## 2026-08-04 – Mecoly E500 spezifisch (Task A+B+C+E)

### Docs
- **NEU** `HBAND_NATIVE_BRIDGE_SPEC.md` – vollständige Method-Signaturen für die
  spätere Kotlin/Swift-Bridge (abgeleitet aus `flutter_veepoo_sdk_plus`).
- **UPDATE** `HBAND_OPEN_QUESTIONS.md` – Bandmodell bestätigt (Mecoly E500,
  display-lose Variante), Companion-App H Band verifiziert, kritische Blocker fokussiert.

### Types & Provider (Task B)
- `wearable/types.ts`
  - Neue `MetricType`: `ecg`, `blood_glucose_estimated`
  - `ESTIMATE_METRICS` Konstante (nicht-medizinische Schätzwerte)
  - `labelForMetric()` mit medizinisch sauberen deutschen Bezeichnungen
  - `DeviceCapabilities` Interface + `MECOLY_E500_CAPABILITIES` Preset
- `wearable/HBandProvider.stub.ts`
  - Erweiterter JSDoc mit vollständigem Native-Modul-Contract (25 Methoden)
- `wearable/DemoProvider.ts`
  - Simuliert jetzt zusätzlich ECG (10s @ 250Hz Waveform in metadata),
    Respiration, Blutdruck (est.), Blutzucker (est.) – jeweils mit
    `metadata.estimate=true` + `disclaimer`.
  - `connect()` liefert echte Capability-Flags für das Demo-Gerät.

### Blutzucker-/Blutdruck-Handling (Task C)
- **NEU** `wearable/EstimateDisclaimer.tsx` – wiederverwendbare Warn-Komponente
  ("Wellness-Schätzung, kein medizinischer Messwert").
- Backend `routes/wearable.py`
  - Neue MetricType-Literale: `ecg`, `blood_glucose_estimated`
  - `ESTIMATE_METRICS` Set – in `/measurements/batch` wird der Disclaimer
    zwangsweise in `metadata` injiziert. UI kann ihn nicht aus Versehen strippen.



## 2026-06-19 – Phase 1 & Grundgerüst

### Docs
- **NEU** `HBAND_OPEN_QUESTIONS.md` – offene Fragen an SDK/Hersteller
- **NEU** `HBAND_INTEGRATION_CHANGELOG.md` – dieses Changelog
- **NEU** `HBAND_ARCHITECTURE.md` – Architektur-Blueprint (WearableProvider-Abstraktion)

### Backend (neue Collections + Endpoints, alle unter `/api/wearable/*`)
- **NEU** `backend/routes/wearable.py`
  - `POST /api/wearable/devices` (Gerät koppeln)
  - `GET /api/wearable/devices?user_id=…`
  - `PUT /api/wearable/devices/{device_id}` (Firmware/Battery/State updaten)
  - `DELETE /api/wearable/devices/{device_id}` (mit optionalem `?purge_data=true`)
  - `POST /api/wearable/measurements/batch` (Bulk-Insert, deduplizierend)
  - `GET /api/wearable/measurements?user_id=…&metric=…&from=…&to=…`
  - `POST /api/wearable/sleep-sessions/batch`
  - `GET /api/wearable/sleep-sessions?user_id=…&from=…&to=…`
  - `POST /api/wearable/sync-status` (Sync-Log)
  - `GET /api/wearable/daily-summary/{user_id}?date=YYYY-MM-DD`
- Collections: `wearable_devices`, `health_measurements`, `sleep_sessions`, `wearable_sync_logs`
- **Deduplizierung** über Compound-Index `(user_id, device_id, metric_type, measured_at)`

### Frontend – herstellerunabhängige Wearable-Schicht
- **NEU** `frontend/src/wearable/types.ts` – gemeinsame Datentypen
- **NEU** `frontend/src/wearable/WearableProvider.ts` – abstraktes Interface
- **NEU** `frontend/src/wearable/DemoProvider.ts` – Demo-/Simulator-Adapter (klar gekennzeichnet)
- **NEU** `frontend/src/wearable/HBandProvider.stub.ts` – Placeholder mit `NotAvailable` Errors (echte Bridge kommt via EAS Dev-Client)
- **NEU** `frontend/src/wearable/index.ts` – Runtime-Selection (native Modul verfügbar? sonst Demo)
- **NEU** `frontend/src/WearableContext.tsx` – React-Context (Status, Sync, aktuelle Werte)

### Frontend – UI
- **NEU** `frontend/app/wearable/onboarding.tsx` – 7-Schritt-Kopplungsassistent
- **NEU** `frontend/app/wearable/device-settings.tsx` – Geräteverwaltung "Mein VitaGuide Band"

### EAS / Build-Config
- **NEU** `frontend/eas.json` – Dev-, Preview- und Production-Profile
- **UPDATE** `frontend/app.json` – Bluetooth-Berechtigungen (iOS + Android), `expo-dev-client`, Background-Modes
- **NEU** Dependency `expo-dev-client` – ermöglicht native Module

### Regeln
- **Demo-Modus** durchgängig gekennzeichnet (Banner „DEMO – simulierte Daten") gemäß Regel 25.2
- **Keine medizinischen Aussagen** in UI-Texten – nur Wellness-Formulierungen
- **Deduplizierung** via `(user, device, metric, timestamp)` in Backend
