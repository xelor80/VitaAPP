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
Baseline-Engine, Health-Score, Rule-Evaluator/Worker (BullMQ), Read-APIs (`/today`,
`/metrics/*`, `/trends`), Push (FCM/APNs), Admin-API. Siehe
[../docs/14-mvp-umfang.md](../docs/14-mvp-umfang.md).
