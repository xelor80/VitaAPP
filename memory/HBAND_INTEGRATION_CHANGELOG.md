# HBand Integration – Changelog

> Jede substantielle Änderung im Rahmen der HBand-Wearable-Integration wird hier
> als knapper Bullet vermerkt (Datum, betroffene Files, Zweck).
## 2026-08-04 – Home-Widget + KI-Coach mit Wearable-Kontext

### Backend
- **UPDATE** `routes/coach.py` – neuer Helper `_load_wearable_context(profile_id)` liest gepaartes Gerät + berechnet Scores + Baselines.
- Coach-Response enthaelt jetzt `wearable`-Block (Available-Flag, Readiness, Recovery, Sleep, HRV/RHR-Delta, Learning-Phase).
- **5 neue automatische Insights** je nach Wearable-Werten:
  - `readiness < 45` → Warnung "Heute ruhiger angehen"
  - `readiness >= 75` → Lob "Bester Tag fuers Training"
  - `HRV delta <= -15%` → Warnung "HRV unter deinem Normalwert"
  - `RHR delta >= +10%` → Hinweis "Ruhepuls etwas erhoeht"
  - `sleep score < 55` → Hinweis "Schlaf war heute knapp"
- Alle Wearable-Insights mit `source='wearable'` + `action='wearable-dashboard'` fuer direkten Deep-Link.
- Learning-Phase-Suppression: keine Insights waehrend `days_of_data < 7`.

### Frontend
- **NEU** `src/wearable/HomeWearableWidget.tsx` – kompakte JK-rote Karte fuer den Home-Tab:
  - Ohne Geraet: dezente CTA-Karte "Verbinde dein VitaGuide Band"
  - Mit Geraet: Readiness-Score + Akku + Vollstaendigkeit + HRV-Delta, Tap → Dashboard
- **UPDATE** `app/(tabs)/index.tsx` – Widget zwischen Bereichen und "VERO empfiehlt" eingehaengt, `wearable-dashboard`-Action im Coach-Insight-Handler.

### Tests
- `backend/tests/test_coach_wearable.py` – 11 pytest-Cases, 100% grün.

## 2026-08-04 – VitaGuide Scores & Basislinien-Engine + Dashboard/Detailseiten

### Backend
- **NEU** `backend/scoring_config.json` – zentral konfigurierbare Formeln (Recovery/Sleep/Activity/Readiness) mit `min_data_days_for_scores=7`, `baseline_window_days=28`.
- **NEU** `backend/routes/wearable_scoring.py` – Baselines (28d gleitender Median pro Metrik) + Score-Engine mit Learning-Phase-Gating.
- **NEU** Endpoints in `wearable.py`:
  - `GET /api/wearable/baselines/{user_id}` → per-metric `{median, days_used, sufficient, latest_value, delta_pct}`
  - `GET /api/wearable/scores/{user_id}?date=YYYY-MM-DD` → `{scores.{recovery,sleep,activity,readiness}, data_completeness, in_learning_phase, note, baselines}`
  - `GET /api/wearable/timeseries/{user_id}/{metric}?range=day|week|month|3month|year` → aggregierte Tagesbuckets für Charts

### Frontend
- **NEU** `app/wearable/dashboard.tsx` – "Mein Tag" Dashboard mit Readiness-Hero-Karte, 3 Score-Karten (Recovery/Sleep/Activity), 5 Metric-Cards mit Delta vs. Basislinie, Learning-Phase-Banner, Refresh-Control, Pull-to-Sync
- **NEU** `app/wearable/detail/[metric].tsx` – dynamische Detail-Route mit Line-Chart (Bezier, react-native-chart-kit), Range-Selector (Tag/Woche/Monat/3M/Jahr), Ø/Min/Max/Tage-Stats, Basislinien-Karte, Erklärungstext, `EstimateDisclaimer` für Blutzucker/Blutdruck
- **UPDATE** `app/wearable/device-settings.tsx` – neuer prominenter "Mein Tag – Dashboard öffnen" Button

### Tests
- `backend/tests/test_wearable_scoring.py` – 13 pytest-Cases, 100% grün (Baselines, Scores, Timeseries, Estimate-Metadata-Injection, Determinismus, invalid inputs)

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
