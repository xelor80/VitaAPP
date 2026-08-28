# VitaGuide – Backend API

NestJS + Prisma + PostgreSQL. Umsetzung des Konzepts aus
[`../docs`](../docs) – **MVP-Grundgerüst (Phase 1)**: Auth, Nutzer/Profil,
Consent (DSGVO), Geräte, idempotenter Messwert-Sync.

## Stack
Siehe [../docs/02-tech-stack.md](../docs/02-tech-stack.md). Kurz: NestJS (TypeScript),
Prisma, PostgreSQL (+ TimescaleDB für Zeitreihen), JWT (Access) + Refresh-Rotation (Argon2id).

## Lokal starten
```bash
cp .env.example .env          # Secrets setzen: openssl rand -base64 48
docker compose up -d          # PostgreSQL (+TimescaleDB), Redis
npm install
npm run prisma:generate
npm run prisma:migrate         # erstellt das Schema
npm run db:seed                # App-Konfig + Beispielregel (keine Fake-Messwerte)
npm run start:dev              # http://localhost:3000/api/v1
```

Health-Check: `GET /api/v1/health` → `{ "status": "ok" }`.

## Aktuell implementierte Endpunkte (Auszug, siehe [../docs/04-api-struktur.md](../docs/04-api-struktur.md))

| Methode | Pfad | Auth |
|---------|------|------|
| POST | `/api/v1/auth/register` \| `/login` \| `/refresh` \| `/logout` | öffentlich |
| GET/PATCH/DELETE | `/api/v1/me` | JWT |
| GET/POST | `/api/v1/me/consents` (+`/history`) | JWT |
| GET/POST/PATCH/DELETE | `/api/v1/devices` (+`/:id/connection-events`) | JWT |
| POST | `/api/v1/sync/measurements` (idempotent, Batch) | JWT |
| GET | `/api/v1/sync/status` | JWT |
| GET | `/api/v1/today` (Begrüßung, Score, „Heute wichtig", Alerts) | JWT |
| GET | `/api/v1/metrics/:metric/series` \| `/summary` | JWT |
| GET | `/api/v1/baselines` · `/api/v1/trends` · `/api/v1/score` | JWT |
| GET/POST | `/api/v1/insights` (+`/regenerate`) | JWT |
| GET/POST | `/api/v1/alerts` (+`/:id/ack`) | JWT |
| POST/DELETE | `/api/v1/push/tokens` · GET/PATCH `/api/v1/me/notification-preferences` | JWT |
| POST | `/api/v1/admin/auth/login` | öffentlich |
| GET | `/api/v1/admin/stats` · `/users` · `/config` · `/audit-logs` | Admin-JWT + RBAC |
| CRUD | `/api/v1/admin/rules` · `/products` · `/articles` | Admin-JWT + RBAC |

## Prinzipien (aus dem Konzept)
- **Nutzerdaten-Isolation:** jede Abfrage filtert nach `userId` des Token-Subjekts.
- **Idempotenter Sync:** `ingestKey` + Unique-Constraint `(userId, ingestKey)` → Dedup.
- **Keine erfundenen Werte:** unbekannte Metriken werden abgelehnt (`rejected`).
- **DSGVO:** Consent-Log append-only; Account-Löschung setzt Soft-Delete + Token-Widerruf
  (harter Purge-Job folgt).
- **Server-getriebene Logik:** Regeln/Score-Gewichte/Tagesziele in `AppConfig`/`HealthRule`.

## Tests
```bash
npm test
```
Enthält u. a. die Dedup-/Validierungslogik des Sync-Ingests (ohne DB lauffähig).

## Noch nicht enthalten (nächste Schritte)
Echte FCM/APNs-Anbindung (aktuell Noop-Provider), BullMQ-Worker/Scheduler für periodische
Baseline-/Score-/Insight-Jobs (aktuell nach Sync + on-demand), Blutdruck-/EKG-/Schlaf-Sync-
Endpunkte (eigene Tabellen bestehen), Datenexport-Job, TimescaleDB-Hypertable-Umstellung.
Siehe [../docs/14-mvp-umfang.md](../docs/14-mvp-umfang.md).
