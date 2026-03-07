# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo SDK 54) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Atlas in production)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key (expo-audio)
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)
- **Admin Panel**: Static HTML/JS/CSS served at /api/admin-app

## Implemented Features (Complete) - 56 Features
1-53: [See previous PRD versions - includes all features through supplement compliance sync]
54. **Admin: Nutzerstatistiken-Dashboard** (2026-03-07):
    - Neuer "Nutzer" Tab im Admin-Panel
    - KPI-Karten: Profile gesamt, Neue Profile (7/30 Tage), Aktive Nutzer (7/30 Tage), Compliance-Rate, Analysen, Tagebuch-Eintraege
    - Registrierungs-Timeline als Balkendiagramm
    - Arbeitstyp-Verteilung (Buero, Schichtarbeit, Nachtarbeit, etc.)
    - Sprachverteilung (Deutsch/Italienisch/Unbekannt)
    - Top getrackte Symptome mit Intensitaet
    - Neuer API-Endpunkt: GET /api/admin/user-stats
55. **Admin: Shopify-Sync-Status & Historie** (2026-03-07):
    - Sync-Verlauf Sektion im Shop Import Tab
    - Tabellarische Darstellung aller vergangenen Syncs (Datum, Sprache, Status, Ergebnisse)
    - Filterbar nach Sprache (DE/IT)
    - Sync-Events werden bei jedem Sync in DB gespeichert (sync_history Collection)
    - Neuer API-Endpunkt: GET /api/admin/sync-history
56. **Taegliches Sync-Intervall** (2026-03-07):
    - "Taeglich" als neue Sync-Option neben Woechentlich und Monatlich
    - Backend: Validierung, Berechnung next_sync (timedelta(days=1)), Scheduler-Logik
    - Frontend: Dropdown in DE und IT Sync-Konfiguration aktualisiert
    - "Profile" Statistik-Karte im Dashboard-Header hinzugefuegt

## Key API Endpoints
- `GET /api/admin/user-stats` - Detaillierte Nutzerstatistiken
- `GET /api/admin/sync-history` - Sync-Verlauf
- `POST /api/admin/sync-config` - Akzeptiert jetzt 'daily', 'weekly', 'monthly'
- `GET /api/tracking/compliance/today/{profile_id}` - Heutiger Einnahme-Status
- `POST /api/daily-tasks/complete-supplements` - Einnahme speichern
- `GET /api/products/by-nutrient/{nutrient}` - Produkte mit no-cache Header

## Key DB Collections (New)
- `sync_history` - Speichert Sync-Events mit Timestamp, Sprache, Status, Ergebnissen

## Backlog
- Weitere UI/UX Verbesserungen nach Feedback
- Push-Benachrichtigungen sind bereits implementiert (expo-notifications)
- Erweiterte Gamification (Achievements, Wochenziele)
- Rezept-Erweiterungen (Einkaufsliste, Essensplan-Generator)
