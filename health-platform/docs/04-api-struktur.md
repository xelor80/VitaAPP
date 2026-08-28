# 04 – API-Struktur

REST unter `/api/v1`. JSON. Auth via `Authorization: Bearer <access_token>`. Fehler als
strukturiertes Problem-Objekt. Alle Zeitstempel ISO-8601 UTC. Paginierung per Cursor.

## 1. Konventionen

- **Versionierung:** Pfad-Präfix `/api/v1`. Breaking Changes → `/api/v2`. SDK-Provider-Verträge
  ebenfalls versioniert (`vendorX_v1`).
- **Auth:** kurzer Access-Token (JWT ~15 min) + rotierender Refresh-Token (langlebig, serverseitig
  widerrufbar). Gerätebindung des Refresh-Tokens.
- **Idempotenz:** Sync-Endpunkte akzeptieren `ingest_key` je Messung (Dedup).
- **Rate-Limiting:** per Redis, pro Nutzer/IP.
- **Fehlerformat:**
  ```json
  { "error": { "code": "validation_error", "message": "...", "details": [...] } }
  ```
- **Feature-Gating:** Premium-Endpunkte prüfen `entitlement` serverseitig (kein Client-Trust).

## 2. Auth & Account

| Methode | Pfad | Zweck |
|---------|------|------|
| POST | `/api/v1/auth/register` | Registrierung (E-Mail, Passwort) |
| POST | `/api/v1/auth/login` | Login → Access + Refresh |
| POST | `/api/v1/auth/refresh` | Token-Rotation |
| POST | `/api/v1/auth/logout` | Refresh widerrufen |
| POST | `/api/v1/auth/verify-email` | E-Mail-Verifizierung |
| POST | `/api/v1/auth/password/forgot` · `/reset` | Passwort-Reset |
| POST | `/api/v1/auth/oauth/apple` · `/google` | (vorbereitet) Social Login |

## 3. Profil, Consent, DSGVO

| Methode | Pfad | Zweck |
|---------|------|------|
| GET/PATCH | `/api/v1/me` | Profil lesen/ändern |
| GET | `/api/v1/me/consents` | Consent-Status |
| POST | `/api/v1/me/consents` | Einwilligung erteilen/widerrufen (append-only Log) |
| POST | `/api/v1/me/export` | Datenexport anstoßen (async → Download-Link) |
| DELETE | `/api/v1/me` | Account-Löschung anstoßen (Purge-Job) |
| GET/PATCH | `/api/v1/me/notification-preferences` | Push-Einstellungen |

## 4. Geräte & Sync

| Methode | Pfad | Zweck |
|---------|------|------|
| GET | `/api/v1/devices` | Gekoppelte Geräte |
| POST | `/api/v1/devices` | Gerät registrieren (nach BLE-Pairing) inkl. `capabilities` |
| PATCH | `/api/v1/devices/{id}` | Firmware/Name/Status |
| DELETE | `/api/v1/devices/{id}` | Entkoppeln |
| POST | `/api/v1/devices/{id}/connection-events` | BLE/Sync-Diagnose (keine Gesundheitsdaten) |
| POST | `/api/v1/sync/measurements` | **Batch-Upload** normalisierter Messungen (idempotent) |
| GET | `/api/v1/sync/status` | letzter Sync, Server-Zeit für Uhrenabgleich |

**Batch-Upload Beispiel (Request):**
```json
{ "device_id": "…", "measurements": [
  { "metric": "heart_rate", "value": 72, "unit": "bpm",
    "time": "2026-08-28T07:15:00Z", "source": "wearable",
    "quality": "good", "ingest_key": "dev123-hr-1724829300" }
]}
```
Antwort: pro Eintrag `accepted` | `duplicate` | `rejected(reason)`.

## 5. Gesundheitsdaten (lesen)

| Methode | Pfad | Zweck |
|---------|------|------|
| GET | `/api/v1/metrics/{metric}/series?range=24h\|7d\|30d\|3m\|1y` | Zeitreihe/Aggregat für Charts |
| GET | `/api/v1/metrics/{metric}/summary` | Aktuell, Tagesbereich, Ruhewert, Baseline, Trend |
| GET | `/api/v1/sleep/sessions?range=` | Schlafsitzungen |
| GET | `/api/v1/activity/sessions?range=` | Aktivität/Training |
| GET | `/api/v1/baselines?metric=&window=` | Persönliche Baselines |
| GET | `/api/v1/ecg/{id}` | EKG-Metadaten + signierter S3-Link (nur Eigentümer) |

Antworten enthalten neben Rohwerten **verständliche Einordnung** (z. B. `interpretation:
"in_personal_range"`), damit die App keine Grenzwertlogik hart codiert.

## 6. Dashboard, Score, Insights

| Methode | Pfad | Zweck |
|---------|------|------|
| GET | `/api/v1/today` | **Today-Dashboard**: Begrüßung, Score, „Heute wichtig“, Alerts |
| GET | `/api/v1/score?date=` | Health/Readiness-Score + Komponenten + Erklärungen |
| GET | `/api/v1/insights?range=` | Regelbasierte Insights |
| GET | `/api/v1/trends?range=` | „Meine Entwicklung“ (Deltas je Metrik) |
| GET | `/api/v1/alerts` | Aktive/vergangene Warnungen |
| POST | `/api/v1/alerts/{id}/ack` | Warnung quittieren |

`/today` ist der zentrale, aggregierte Endpunkt (ein Roundtrip für den Startscreen).

## 7. Content, Produkte, Empfehlungen

| Methode | Pfad | Zweck |
|---------|------|------|
| GET | `/api/v1/content?category=&locale=` | „Entdecken“-Artikel/Tipps/Videos |
| GET | `/api/v1/content/{slug}` | Einzelinhalt |
| GET | `/api/v1/recipes?tags=&locale=` | Rezepte |
| GET | `/api/v1/recommendations?context=sleep\|stress\|…` | kontextuelle Empfehlungen (Produkte/Content), serverseitig via `recommendation_rules` |
| GET | `/api/v1/products/{id}` | Produktdetail |
| POST | `/api/v1/affiliate/events` | Klick/Conversion (pseudonymisiert) |
| GET | `/api/v1/tips?metric=` | Verwaltbare Tipps je Metrik („So beeinflusst du diesen Wert“) |

## 8. Push (Registrierung)

| Methode | Pfad | Zweck |
|---------|------|------|
| POST | `/api/v1/push/tokens` | FCM/APNs-Token registrieren |
| DELETE | `/api/v1/push/tokens/{id}` | Token entfernen |

## 9. Admin-API (`/api/v1/admin`, RBAC, Audit)

| Bereich | Beispiele |
|---------|-----------|
| Dashboard | `GET /admin/stats` (DAU/MAU, Geräte, Messungen, Push, Alerts, Affiliate) |
| Nutzer | `GET/PATCH /admin/users`, sperren/löschen; Gesundheitsdaten nur mit Sonderrecht + Audit |
| Regeln | `CRUD /admin/rules` (Rule-Engine) |
| Score | `GET/PUT /admin/config/score-weights` |
| Content/Tipps/Rezepte | `CRUD /admin/articles|tips|recipes` |
| Produkte/Affiliate | `CRUD /admin/products|affiliate-links`, `GET /admin/affiliate/analytics` |
| Push-Kampagnen | `CRUD /admin/push-campaigns`, Zielgruppen/Planung |
| Übersetzungen | `CRUD /admin/translations` |
| App-Konfiguration | `GET/PUT /admin/config` (Feature-Flags, Tagesziele-Defaults) |
| Audit | `GET /admin/audit-logs` |

## 10. Interne Jobs (nicht öffentlich)

Über Scheduler/Worker (nicht per Client aufrufbar):
- Baseline-Neuberechnung (nightly + on-demand nach Sync).
- Alert-Auswertung (Event-getrieben nach `measurement.ingested` + zeitfensterbasiert).
- Score-Berechnung (morgens je Nutzer + on-demand).
- Insight-Generierung (periodisch).
- Push-Versand (Kampagnen + Systemtrigger).
- Report-Erzeugung (Phase 2/3, PDF nach S3).
