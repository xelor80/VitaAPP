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

## Implemented Features (Complete) - 53 Features
1-48: [See previous PRD versions]
49. **Sicherheitshaertung** (2026-03-06): Rate-Limiting, CORS, Token-Ablauf
50. **Performance-Optimierung** (2026-03-06): GZip, MongoDB-Indizes, Cache-Decorator
51. **expo-av zu expo-audio Migration** (2026-03-07)
52. **Shopify Preis-Sync Fix** (2026-03-07):
    - Duplikaterkennung: Sync erkennt alte manuelle Produkte mit gleichem Namen und entfernt sie
    - Cache-Control: no-store Header auf Produkt-Endpunkten gegen iOS-Cache
    - Cache-Buster _t=Date.now() im Frontend-Fetch
53. **Supplement-Compliance Synchronisierung** (2026-03-07):
    - Startseite und Supplement-Plan nutzen dieselbe compliance_tracking Sammlung
    - Neuer Endpunkt GET /api/tracking/compliance/today/{profile_id}
    - "Jetzt einnehmen" im Supplement-Plan speichert jetzt Einnahme in DB
    - Visuelle Haekchen + Durchstreichung fuer bereits eingenommene Supplements im Tagesplan
    - Bidirektionale Sync: Startseite abhaken = Supplement-Plan zeigt Haekchen (und umgekehrt)

## Key API Endpoints
- `GET /api/tracking/compliance/today/{profile_id}` - Heutiger Einnahme-Status
- `POST /api/daily-tasks/complete-supplements` - Einnahme speichern (shared)
- `GET /api/products/by-nutrient/{nutrient}` - Produkte mit no-cache Header

## Backlog
- Weitere UI/UX Verbesserungen nach Feedback
