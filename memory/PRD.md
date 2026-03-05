# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo SDK 54) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Atlas in production)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)

## Implemented Features (Complete) - 43 Features
1-39: [See CHANGELOG.md for full history]
40. **Gesundheitsprofil Redesign** - 2x2 card grid (Profile, BMI gauge, Stress slider, Sleep slider)
41. **Supplement-Plan Redesign** - Teal gradient header, Tagesplan with pill icons, Erinnerung card
42. **Erinnerungseinstellungen** - Push notification settings in reminder card
43. **Mein Fortschritt Ueberarbeitung**:
    - "Einnahme" Tab entfernt (Compliance-Tracking jetzt nur auf Hauptbildschirm/Supplement-Plan)
    - 8-Wochen-Plan-Fortschrittsanzeige (Woche X von 8, Tag Y) mit Fortschrittsbalken
    - Taegliche Beschwerden-Eingabe mit Sperre nach Speicherung
    - Gesperrter Zustand zeigt "Bereits fuer heute eingetragen" + Nur-Lese-Zusammenfassung
    - Neuer Backend-Endpoint GET /api/tracking/symptoms/today/{profile_id}

## Key API Endpoints
- `GET /api/tracking/symptoms/today/{profile_id}` - NEW: Check daily submission status + plan week/day
- `GET /api/health-profile/{profile_id}` - Profile + assessment
- `GET /api/supplement-plan/{profile_id}` - Supplement plan data
- `GET /api/price-alerts/{profile_id}` - Price drop alerts
- `GET /api/products/by-nutrient/{nutrient}` - Product search

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern (P1)
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
