# 01 – Systemarchitektur

## 1. Überblick

Die Plattform besteht aus fünf logischen Schichten. Jede Schicht ist über klar definierte
Schnittstellen entkoppelt, damit Teile unabhängig weiterentwickelt oder ersetzt werden können.

```
┌───────────────────────────────────────────────────────────────────┐
│  PRÄSENTATION                                                       │
│  ┌────────────────────────┐        ┌───────────────────────────┐   │
│  │  Mobile App (Flutter)  │        │  Admin-WebApp (Next.js)   │   │
│  │  iOS + Android         │        │  admin.vitaguide.app           │   │
│  └───────────┬────────────┘        └──────────────┬────────────┘   │
└──────────────┼───────────────────────────────────┼────────────────┘
               │  HTTPS / REST /api/v1 (JWT)        │
┌──────────────▼───────────────────────────────────▼────────────────┐
│  API / BACKEND  (NestJS, TypeScript)                               │
│  Auth · Users · Devices · Measurements · Baselines · Score ·       │
│  Rules/Alerts · Insights · Notifications · Content · Products ·    │
│  Affiliate · Admin · Consent/Audit                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │ REST API     │   │ Worker/Queue │   │ Scheduler (Cron)       │  │
│  │ (HTTP)       │   │ (BullMQ)     │   │ Baselines, Alerts,     │  │
│  │              │   │              │   │ Reports, Push          │  │
│  └──────────────┘   └──────────────┘   └────────────────────────┘  │
└──────┬─────────────────┬──────────────────┬───────────────┬────────┘
       │                 │                  │               │
┌──────▼──────┐   ┌───────▼──────┐   ┌────────▼──────┐  ┌─────▼───────┐
│ PostgreSQL  │   │   Redis      │   │  S3 / MinIO   │  │ FCM / APNs  │
│ (Kern +     │   │ Cache, Queue,│   │  Bilder,      │  │ Push        │
│ Zeitreihen) │   │ Rate-Limit   │   │  Reports, EKG │  │             │
└─────────────┘   └──────────────┘   └───────────────┘  └─────────────┘
```

## 2. Wearable-Datenpfad (kritisch entkoppelt)

Die Hersteller-SDK wird **nicht** direkt in App-Features verdrahtet, sondern liegt hinter
einem Hardware-Abstraction-Layer (HAL). Details in [Dokument 07](07-sdk-integration.md).

```
┌──────────┐  BLE   ┌───────────────┐   ┌──────────────────────┐   ┌──────────────┐
│ Fitness- │◄──────►│ Hersteller-SDK│──►│ Hardware-Abstraction │──►│ Mobile App   │
│ band     │        │ (iOS/Android  │   │ Layer (WearableProv.)│   │ (Feature-    │
│          │        │ native)       │   │ – normalisiert Daten │   │  Module)     │
└──────────┘        └───────────────┘   └──────────┬───────────┘   └──────┬───────┘
                                                    │ normalisierte        │
                                                    │ Messwerte            │ Sync
                                              ┌─────▼──────────┐    ┌──────▼───────┐
                                              │ Lokaler Store  │───►│ Backend API  │
                                              │ (SQLite/Drift) │    │ (Batch-Sync) │
                                              └────────────────┘    └──────────────┘
```

Die App arbeitet ausschließlich gegen das **normalisierte Datenmodell** des HAL – nie gegen
SDK-spezifische Typen. Ein zweiter Hersteller = ein zweiter `WearableProvider`, sonst nichts.

## 3. Verantwortlichkeiten je Schicht

| Schicht | Verantwortung | Bewusst NICHT |
|---------|---------------|---------------|
| **Mobile App** | BLE-Kopplung, Sync-Trigger, lokaler Cache, Darstellung, Onboarding | Keine Regel-/Produkt-/Score-Logik hart codiert; kommt vom Backend |
| **HAL / WearableProvider** | SDK kapseln, Rohdaten → normalisierte Messwerte | Keine Business-Logik, keine Persistenz-Entscheidungen |
| **Backend API** | Persistenz, Auth, Baselines, Score, Rule-Engine, Insights, Content, Admin | Kein direkter BLE-Zugriff |
| **Worker/Scheduler** | Asynchrone Jobs: Baseline-Neuberechnung, Alert-Auswertung, Push, Reports | Keine synchronen Request-Antworten |
| **Admin-WebApp** | Konfiguration (Regeln, Score-Gewichte, Content, Produkte, Push-Kampagnen) | Kein Zugriff auf Rohgesundheitsdaten ohne Sonderberechtigung |

## 4. Zentrale Architekturentscheidungen

1. **Server-getriebene Logik.** Score-Gewichtungen, Alarm-Regeln, Tipps, Produkt-/Content-
   Empfehlungen liegen als **Konfiguration im Backend** und werden per API ausgeliefert. Die App
   ist ein „dummer“ Renderer. → Änderungen ohne App-Update (kein Store-Review nötig).
2. **Zeitreihen zuerst.** Messwerte sind hochvolumige Zeitreihen. Start mit PostgreSQL +
   `TimescaleDB`-Extension (Hypertables, Continuous Aggregates). Migrationspfad zu dedizierter
   Zeitreihen-DB bleibt offen, da API-Schicht abstrahiert.
3. **Offline-first Mobile.** Alle Messwerte zuerst lokal (SQLite/Drift), dann Batch-Sync mit
   Idempotenz-Schlüssel (Dedup). Siehe [Dokument 08](08-ble-sync-konzept.md).
4. **Event-getriebene Nebenwirkungen.** Neue Messungen erzeugen Domain-Events
   (`measurement.ingested`) → Worker berechnet Baselines, prüft Regeln, triggert Push. Entkoppelt
   und nachvollziehbar (Outbox-Pattern).
5. **KI optional & isoliert.** KI (Insights, Health-Coach) ist ein eigener Service hinter einem
   Feature-Flag und arbeitet nur auf **freigegebenen** Daten. Kein harter Abhängigkeitsknoten.

## 5. Deployment-Topologie (Zielbild)

```
Internet ─► Reverse Proxy / TLS (Traefik oder Nginx)
             ├─► api.vitaguide.app      → Backend (mehrere Instanzen, zustandslos)
             ├─► admin.vitaguide.app    → Admin-WebApp (SSR)
             └─► cdn/S3            → Statische Assets, Bilder
Backend-Instanzen ─► PostgreSQL (primary + read replica später)
                  ─► Redis (Cache + BullMQ)
                  ─► Object Storage (S3/MinIO)
Worker-Instanzen  ─► gleiche DB/Redis, getrennt skalierbar
```

Container via Docker Compose (Start) → später Kubernetes/Managed möglich, da zustandslos.
Mobile-Builds über CI (Fastlane / Codemagic) in App Store & Play Store.

## 6. Skalierungs-/Erweiterungspfade (bewusst offengehalten)

- **Weitere Wearables:** zusätzlicher `WearableProvider` (Registry-Pattern).
- **Neue Metriken:** generisches `health_measurements`-Schema + optional spezialisierte Tabelle.
- **Neue Module** (Waage, Ernährung, Zyklus …): eigenes Backend-Modul + Feature-Modul in der App.
- **Mehr Sprachen/Länder:** Content & Übersetzungen datengetrieben (i18n-Keys, siehe Dok. 06).
- **Premium-Tiers:** Feature-Gating serverseitig über Entitlements, nicht in der App hart codiert.
