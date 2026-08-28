# VitaGuide – Deployment auf dem Hostinger-VPS

Bringt VitaGuide (Backend-API + Admin-Portal + eigene DB) als **eigenständigen** Stack neben
deinen bestehenden Projekten hoch – über Docker Compose hinter deinem vorhandenen Traefik.

> **Hinweis:** Ich kann mich nicht selbst in deinen Server einloggen. Führe die Schritte unten
> per SSH auf dem VPS aus (oder gib mir später einen Weg, der ohne Weitergabe deiner Zugangsdaten
> hier funktioniert).

## Läuft ein drittes Projekt performant mit?
In der Regel ja. Grober Ruhebedarf dieses Stacks:

| Dienst | RAM idle (ca.) |
|--------|----------------|
| PostgreSQL (TimescaleDB) | 150–300 MB |
| Redis | 10–30 MB |
| Backend (Node) | 120–250 MB |
| Admin (Next standalone) | 80–150 MB |
| **Summe** | **~0,5–0,9 GB** |

Prüfe vor dem Start deine Reserven:
```bash
free -m            # freier RAM
df -h              # freier Speicher
docker stats --no-stream   # Verbrauch der bestehenden Container
```
Faustregel: Wenn nach den zwei bestehenden Projekten **≥ 1 GB RAM frei** ist, passt es gut.
Bei knappem RAM: 1 GB Swap anlegen und/oder `PUSH_PROVIDER=noop` lassen.

## Bleibt es unabhängig von den anderen Projekten?
Ja – bewusst so gebaut:
- **Eigenes Compose-Projekt** (`COMPOSE_PROJECT_NAME=vitaguide`) → eigene Container & Volumes.
- **Eigene Datenbank** (eigener Postgres-Container + eigenes Volume) – teilt sich nichts.
- **Internes Netzwerk** – DB/Redis sind **nicht** nach außen erreichbar.
- **Keine Host-Ports** – nichts kollidiert mit den Ports deiner anderen Projekte.
- Öffentlich nur über **Traefik + eigene Subdomains** (`api.` / `admin.vitaguide.app`).
- Stoppen/Löschen betrifft nur diesen Stack (`docker compose -p vitaguide down`).

## Voraussetzungen auf dem VPS
- Docker + Docker Compose (hast du für die anderen Projekte schon).
- Ein laufendes **Traefik** mit Let's-Encrypt-Resolver (wie bei deinen bestehenden Projekten).
  Netzwerknamen herausfinden: `docker network ls` (oft `web`, `traefik` oder `proxy`).
- **DNS bei Hostinger**: A-Records `api.vitaguide.app` und `admin.vitaguide.app` → deine VPS-IP.

## Schritte
```bash
# 1) Code holen
git clone https://github.com/xelor80/VitaAPP.git
cd VitaAPP && git checkout claude/health-fitness-platform-7u4jsn
cd health-platform/deploy

# 2) Umgebung setzen
cp .env.production.example .env.production
nano .env.production        # Secrets (openssl rand -base64 48), Domains, TRAEFIK_NETWORK, Admin-PW

# 3) Bauen & starten
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

# 4) Logs prüfen (Migration + Seed laufen beim ersten Start)
docker compose -p vitaguide logs -f backend
```
Danach:
- **API-Health:** `https://api.vitaguide.app/api/v1/health` → `{"status":"ok"}`
- **Admin-Portal:** `https://admin.vitaguide.app` → Login mit `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

Nach dem ersten Start `SEED_ON_START=false` setzen (der Seed ist idempotent, aber unnötig):
```bash
nano .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## Betrieb
```bash
# Update auf neuen Stand
git pull && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
# Status / Ressourcen
docker compose -p vitaguide ps
docker stats --no-stream
# DB-Backup
docker compose -p vitaguide exec postgres pg_dump -U vitaguide vitaguide > vitaguide-$(date +%F).sql
# Komplett stoppen (nur dieser Stack)
docker compose -p vitaguide down          # Daten bleiben (Volumes)
docker compose -p vitaguide down -v        # inkl. Daten löschen (Vorsicht!)
```

## Kein Traefik vorhanden?
Falls deine anderen Projekte **nicht** über Traefik laufen, sag Bescheid – dann liefere ich eine
Variante mit eigenem, isoliertem Reverse Proxy (Caddy, automatisches HTTPS) statt der
Traefik-Labels. Nichts an den bestehenden Projekten muss dafür geändert werden.

## Sicherheit
- Secrets nur in `.env.production` (nicht committen – ist per `.gitignore` geschützt).
- Admin-Passwort nach dem ersten Login ändern; 2FA ist als Ausbau vorgesehen.
- DB/Redis sind nicht öffentlich; nur API/Admin via HTTPS über Traefik.
