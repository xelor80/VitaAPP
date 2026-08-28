# VitaGuide auf deinem Hostinger-VPS (srv1309571)

Konkret auf dein Setup abgestimmt. Der VPS läuft bereits mit Traefik (host-Modus,
Resolver `letsencrypt`) und den Projekten printflow, tradingscool, n8n, mongodb.
VitaGuide kommt als **eigenständiges** Projekt daneben.

- **VPS:** KVM 2 · 2 vCPU · 8 GB RAM · Ubuntu 24.04 · IP `76.13.131.172`
- **Auslastung aktuell:** sehr gering (< 0,5 GB belegt) → reichlich Platz.
- **Isolation:** eigenes Compose-Projekt `vitaguide`, eigene DB/Redis, eigene Volumes,
  keine Host-Ports, keine Verbindung zu anderen Projekten.

## Schritt 1 – DNS (musst du beim Registrar von vitaguide.app setzen)
`vitaguide.app` liegt **nicht** bei Hostinger, daher dort setzen:
```
api.vitaguide.app     A   76.13.131.172
admin.vitaguide.app   A   76.13.131.172
```
(Alternativ die Nameserver von vitaguide.app auf Hostinger umstellen – dann lege ich die
Records per API an.) HTTPS-Zertifikate holt Traefik automatisch, sobald die Domains auflösen.

## Schritt 2 – Deployment

### Variante A – Build auf dem Server (wie deine anderen Projekte)
Per SSH auf dem VPS:
```bash
mkdir -p /docker/vitaguide && cd /docker/vitaguide
git clone https://github.com/xelor80/VitaAPP.git
cd VitaAPP && git checkout claude/health-fitness-platform-7u4jsn
cd health-platform/deploy
cp .env.production.example .env
nano .env    # Secrets (openssl rand -base64 48), Domains, ADMIN_PASSWORD, SEED_ON_START=true
docker compose --env-file .env -f docker-compose.hostinger.yml up -d --build
docker compose -p vitaguide logs -f backend   # Migration + Seed beobachten
```

### Variante B – Vollautomatisch über die Hostinger-API (ohne SSH)
Erfordert vorgebaute Images in einer Registry (GitHub Container Registry). Ablauf, den ich
übernehmen kann, sobald du zustimmst:
1. GitHub-Actions-Workflow baut `ghcr.io/xelor80/vitaguide-backend` + `-admin` (Push auf den Branch).
2. Ich deploye per `createNewProjectV1` eine Compose-Variante, die diese Images **zieht** (kein
   Build auf dem Server), inkl. Umgebungsvariablen.
3. Traefik erkennt die Container automatisch; nach DNS+Zertifikat sind api./admin. live.

## Nach dem ersten Start
- `SEED_ON_START` wieder auf `false` (idempotent, aber unnötig).
- Admin-Portal: `https://admin.vitaguide.app` → Login mit `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- API-Health: `https://api.vitaguide.app/api/v1/health`.

## Betrieb / Backup / Update
```bash
docker compose -p vitaguide ps
docker compose -p vitaguide exec postgres pg_dump -U vitaguide vitaguide > vitaguide-$(date +%F).sql
# Update (Variante A):
cd /docker/vitaguide/VitaAPP && git pull
cd health-platform/deploy && docker compose --env-file .env -f docker-compose.hostinger.yml up -d --build
# Stoppen (nur dieser Stack; Daten bleiben):
docker compose -p vitaguide down
```
