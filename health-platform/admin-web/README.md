# VitaGuide – Admin-WebApp (Next.js)

Geschütztes SaaS-Dashboard zur Verwaltung der Plattform (docs/06, docs/23). Spricht die
Admin-API des Backends (`/api/v1/admin/*`) mit eigenem Admin-JWT + RBAC.

## Lokal starten
```bash
cd health-platform/admin-web
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE auf das Backend zeigen
npm install
npm run dev                    # http://localhost:3001
```
Login mit dem Seed-Admin (siehe backend/.env `ADMIN_EMAIL`/`ADMIN_PASSWORD`).

## Enthalten
- Login (Admin-JWT im localStorage), Auth-Guard, Abmelden
- Dashboard (aggregierte KPIs – keine individuellen Gesundheitsdaten)
- Benutzer (Suche, Status sperren/entsperren)
- **Regeln, Produkte, Inhalte: vollständige CRUD-Formulare** (Anlegen/Bearbeiten/Löschen
  über Modale)
- **App-Konfiguration bearbeitbar** (z. B. Score-Gewichte, Tagesziele – JSON-Editor)
- Audit-Log-Ansicht

## Stack
Next.js 14 (App Router) + React 18 + TypeScript, schlanke eigene CSS (kein UI-Framework).
Reine Client-Komponenten mit Laufzeit-Fetch (kein Datenzugriff zur Build-Zeit).
> Hinweis: Das Konzept (docs/02) nennt Next 15/React 19 – hier bewusst Next 14/React 18 für
> einen stabilen, verifizierten Build; Upgrade ist unkritisch.

## Noch offen (nächste Schritte)
Geräte-, Übersetzungs- und Push-Kampagnen-Ansichten, Bild-Upload (S3) für Produkte/Inhalte,
Rich-Text-Editor statt Textarea, 2FA, feineres RBAC-abhängiges Menü.
