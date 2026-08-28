# 05 – Mobile-App-Modulstruktur (Flutter)

Feature-first Architektur: jedes fachliche Feature ist ein in sich geschlossenes Modul mit
eigener UI, State und Daten-Anbindung. Gemeinsames in `core/` und `design_system/`.

## 1. Hauptnavigation

Bottom-Navigation (Auftrag Abschnitt 38), „Heute“ als zentraler Einstieg:

```
[ Heute ] [ Trends ] [ Coach ] [ Entdecken ] [ Profil ]
```
- **Coach** in Phase 1 als „Insights“ (regelbasiert); wird in Phase 3 zum AI-Health-Coach.

## 2. Ordnerstruktur

```
lib/
├── main.dart
├── app/                      # App-Root, Router, Theme-Switch, i18n-Setup
├── core/
│   ├── network/              # API-Client (Dio), Auth-Interceptor, Retry
│   ├── auth/                 # Token-Storage, Session, Refresh-Rotation
│   ├── sync/                 # Sync-Engine, Offline-Queue, Dedup, Konfliktlogik
│   ├── storage/              # Drift (SQLite) – lokaler Zeitreihen-Cache
│   ├── wearable/             # HAL: WearableProvider-Interface + Registry
│   │   ├── wearable_provider.dart
│   │   ├── models/           # normalisierte Messwerte (NICHT SDK-Typen)
│   │   └── providers/
│   │       └── vendor_x/     # konkrete SDK-Bindung via Platform Channel
│   ├── config/               # Remote-Config (Feature-Flags, Score-Gewichte)
│   ├── i18n/                 # Übersetzungen (ARB/Keys)
│   ├── analytics/            # privacy-first Events (keine Gesundheitsdaten an Dritte)
│   └── error/                # Crash-Reporting (Sentry), Result-Typen
├── design_system/            # siehe Dok. 12 – Tokens + Komponenten
│   ├── theme/                # Light/Dark, Farben, Typo, Spacing, Radius
│   └── components/           # HealthMetricCard, HealthScoreRing, TrendCard, …
├── features/
│   ├── onboarding/           # 5 Screens + Consent + Gerätekopplung
│   ├── auth/                 # Login/Registrierung/Passwort
│   ├── today/                # Today-Dashboard (Home)
│   ├── metrics/              # generische Detailseite je Metrik (HR, HRV, SpO2, …)
│   ├── sleep/                # Schlaf-Kernbereich
│   ├── activity/             # Fitness/Aktivität, Ziele, Gamification
│   ├── trends/               # „Meine Entwicklung“
│   ├── insights/             # Health-Insights (→ Coach Phase 3)
│   ├── alerts/               # Warnungen/Meldungen
│   ├── discover/             # Content-Hub „Entdecken“
│   ├── recipes/              # Rezepte (Phase 2)
│   ├── recommendations/      # Produktempfehlungen (kontextuell)
│   ├── diary/                # Tagebuch/Lifestyle (Phase 2)
│   ├── devices/              # Gerätemanagement, Pairing, Sync-Status
│   └── profile/              # Profil, Ziele, Einstellungen, Consent, Datenexport
└── shared/                   # Utils, Formatierung (Datum TT.MM.JJJJ, Einheiten)
```

## 3. Modul-Beschreibung

| Modul | Zweck | Kernscreens |
|-------|------|-------------|
| **onboarding** | Erstkontakt, Wertversprechen, Consent, Gerätekopplung | 5 Intro-Screens, Consent, Pairing |
| **auth** | Registrierung/Login, später Apple/Google | Login, Register, Reset |
| **today** | Tageszusammenfassung: Begrüßung, Health-Score, „Heute wichtig“ | Home |
| **metrics** | **Eine** generische Detailseite, parametrisiert je Metrik (Chart-Ranges, Erklärung, Entwicklung, Tipps) | MetricDetail |
| **sleep** | Schlafphasen, Score, Regelmäßigkeit, Trend, Tipps | SleepOverview, SleepDetail |
| **activity** | Schritte/Kalorien/Distanz/MET/Training, Tagesziele, Badges | ActivityOverview |
| **trends** | Deltas über 7/30/90/365 Tage, verständlich visualisiert | Trends |
| **insights** | Regelbasierte Zusammenhänge (später KI) | Insights |
| **alerts** | Liste + Detail von Warnungen, nicht-alarmistisch | Alerts |
| **discover** | Artikel/Tipps/Videos/Challenges nach Kategorie | Discover, ContentDetail |
| **recommendations** | Kontextuelle, wellness-orientierte Produktvorschläge | eingebettete Cards + ProductDetail |
| **devices** | Pairing-Flow, Firmware/Batterie, Auto-Sync-Status | Devices, Pairing |
| **profile** | Profil, Ziele, Benachrichtigungen, Consent, Export, Account löschen | Profile, Settings |

## 4. Datenfluss (Beispiel: Herzfrequenz)

```
Wearable ─BLE→ SDK ─→ WearableProvider.getHeartRate()  (normalisiert)
        → sync/ Offline-Queue (Drift)  → POST /sync/measurements (idempotent)
Anzeige: today/ & metrics/ lesen GET /metrics/heart_rate/summary + /series
         (inkl. Baseline & Interpretation vom Server; App rendert nur)
```

## 5. Prinzipien

- **Keine Business-Logik in der App:** Score-Gewichte, Grenzwerte, Tipps, Empfehlungen, Texte
  kommen vom Backend (Remote-Config/API). App = Renderer.
- **Keine erfundenen Werte:** Nicht unterstützte Metriken werden im UI als „Von diesem Gerät nicht
  unterstützt.“ ausgegraut; fehlende Daten als „Noch keine Daten vorhanden.“
- **Alle Texte über i18n-Keys**, Formatierung deutsch (TT.MM.JJJJ), Einheiten lokalisiert.
- **Zugänglichkeit:** große Messwerte, hoher Kontrast, dynamische Schriftgrößen, Screenreader-Labels.
- **Offline-first:** UI liest zuerst lokalen Cache, aktualisiert nach Sync.
