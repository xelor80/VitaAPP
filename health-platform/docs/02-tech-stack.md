# 02 – Empfohlener Tech-Stack

Auswahlkriterien: Reife, Ökosystem für Health/BLE, Skalierbarkeit, TypeScript-Durchgängigkeit
(ein Sprach-Ökosystem in Backend + Admin senkt Einarbeitung), Eignung für DSGVO-konformen
Eigenbetrieb.

## 1. Mobile App

| Bereich | Empfehlung | Begründung |
|---------|-----------|------------|
| Framework | **Flutter (Dart)** | Ein Codebase iOS+Android, sehr hochwertige, flüssige UI (60/120 fps), starke Chart-/Animations-Libs, gute BLE-Unterstützung. Vom Auftrag präferiert. |
| BLE | `flutter_blue_plus` **oder** hersteller­eigene native SDK-Bindings via **Platform Channels** | Die Hersteller-SDK ist i. d. R. natives iOS (Swift/ObjC) + Android (Java/Kotlin) `.framework`/`.aar`. → Anbindung über MethodChannel/EventChannel hinter dem HAL. |
| Lokale DB | **Drift** (SQLite) | Zeitreihen-Cache, offline-first, reaktive Queries. |
| State-Mgmt | **Riverpod** | Testbar, kompositionsfähig, gut für Feature-Module. |
| Charts | `fl_chart` / `graphic` | Moderne, anpassbare Diagramme (24 h / 7 / 30 Tage). |
| i18n | Flutter `intl` + ARB, Keys | Alle Texte über Translation-Keys (Auftrag Abschnitt 29). |
| Push | `firebase_messaging` (FCM) + APNs | Cross-Platform Push. |
| Secure Storage | `flutter_secure_storage` (Keychain/Keystore) | Tokens, Consent-Status. |
| Health-Sync (Phase 2) | `health` Package (HealthKit/Health Connect) | Import/Export getrennt (Auftrag Abschnitt 22). |

> **Alternative React Native:** nur falls die Hersteller-SDK ausschließlich fertige RN-Bindings
> liefert. Ansonsten bleibt Flutter die Empfehlung. Die Entscheidung hängt an der SDK
> (siehe [Dok. 18](18-sdk-informationsbedarf.md)).

## 2. Backend

| Bereich | Empfehlung | Begründung |
|---------|-----------|------------|
| Runtime/Sprache | **Node.js + TypeScript** | Durchgängig TS mit Admin-Frontend. |
| Framework | **NestJS** | Modularer, meinungsstarker Aufbau (Module/Service/Controller), DI, gut für saubere Domänentrennung; Auftrag präferiert. |
| API-Stil | **REST** unter `/api/v1` | Einfach, cachebar, klar versionierbar. GraphQL optional später als Gateway. |
| ORM | **Prisma** | Typsichere Queries, Migrationsworkflow, gute DX. Für Zeitreihen-Hotpaths ggf. Raw-SQL. |
| DB | **PostgreSQL 16** (+ **TimescaleDB**) | Relational + Zeitreihen (Hypertables, Continuous Aggregates für 7/30/90-Tage-Aggregate). |
| Cache/Queue | **Redis** + **BullMQ** | Cache, Rate-Limiting, Job-Queue (Baselines, Alerts, Push, Reports). |
| Auth | **JWT (Access) + Refresh-Token-Rotation**, Argon2id-Hashing | Sichere, zustandslose Auth; OAuth (Apple/Google) vorbereitet. |
| Validierung | **Zod** / `class-validator` | Eingaben strikt validieren. |
| Object Storage | **S3-kompatibel (MinIO self-hosted oder AWS S3)** | Bilder, EKG-Rohdaten, Report-PDFs. |
| Mail | Provider-agnostisch (SMTP/Postmark/SES) | Verifizierung, Reports. |

## 3. Admin-WebApp

| Bereich | Empfehlung | Begründung |
|---------|-----------|------------|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript** | Modernes SaaS-Dashboard, SSR, gute DX; im Team bereits bekannt. |
| UI | **Tailwind + shadcn/ui** oder **Mantine** | Schnelle, konsistente Admin-Oberflächen. |
| Charts | **Recharts / visx** | Dashboards, Statistiken. |
| Auth | Eigene Admin-Auth gegen Backend, RBAC | Getrennt von Endnutzer-Auth. |
| RichText/CMS | **Tiptap** (RichText-Editor) | Content-Erstellung (Artikel, Tipps, Rezepte). |

## 4. Infrastruktur & Betrieb

| Bereich | Empfehlung |
|---------|-----------|
| Container | Docker + Docker Compose (Start), später K8s/Managed |
| Reverse Proxy/TLS | Traefik oder Nginx + Let's Encrypt |
| CI/CD | GitHub Actions (Backend/Admin), Fastlane/Codemagic (Mobile) |
| Monitoring | **Sentry** (Crash/Error, Mobile+Backend), Prometheus/Grafana (Metriken), strukturierte Logs (pino) |
| Analytics (privacy-first) | Selbst gehostet (PostHog self-host) oder eigene Event-Tabellen; **keine** Gesundheitsdaten an Dritte |
| Secrets | `.env` / Vault; nie im Repo |

## 5. Warum diese Kombination

- **Ein Sprach-Universum (TypeScript)** über Backend + Admin → gemeinsame Typen (z. B. DTOs, Regel-
  schemata), weniger Reibung, ein Team.
- **Flutter** liefert das im Auftrag geforderte hochwertige, animierte, barrierearme UI am besten
  bei geringstem Doppelaufwand.
- **PostgreSQL + TimescaleDB** deckt relationale Kern- **und** Zeitreihen-Anforderungen ohne
  zweites DB-System ab (Start schlank), bleibt aber migrierbar.
- **NestJS-Module** spiegeln 1:1 die Modul-Landkarte → klare Grenzen, testbar, erweiterbar.

## 6. Nicht jetzt (bewusst später)

- Dedizierte Zeitreihen-DB (InfluxDB/Clickhouse) – erst bei belegtem Volumenbedarf.
- GraphQL-Gateway – erst wenn mehrere Clients divergierende Datenbedarfe haben.
- ML-Pipeline – Phase 3; Architektur (Feature-Store, freigegebene Daten) wird vorbereitet.
