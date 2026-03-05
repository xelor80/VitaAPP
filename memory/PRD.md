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

## Implemented Features (Complete) - 45 Features
1-39: [See CHANGELOG.md for full history]
40. **Gesundheitsprofil Redesign** - 2x2 card grid (Profile, BMI gauge, Stress slider, Sleep slider)
41. **Supplement-Plan Redesign** - Teal gradient header, Tagesplan with pill icons, Erinnerung card
42. **Erinnerungseinstellungen** - Push notification settings in reminder card
43. **Mein Fortschritt Ueberarbeitung** - Einnahme-Tab entfernt, 8-Wochen-Fortschritt, taegliche Sperre
44. **Personalisierte Rezept-Sortierung** (BUG FIXED 2026-03-05):
    - Neuer Endpoint GET /api/recipes/personalized/{profile_id} mit KI-Scoring
    - Client-side Filtering: Suche, Kategorie-Tags, Zeitfilter
    - Fallback: Alle Rezepte anzeigen wenn kein Gesundheitsprofil vorhanden
45. **TTS fuer Symptom-Analyse** (2026-03-05):
    - Wiederverwendbare TTSButton Komponente (components/TTSButton.tsx)
    - Integriert in OverviewTab Sektion 1 (Zusammenfassung)
    - Liest Summary + Symptome + Ursachen vor
    - Funktioniert auf Web (HTML5 Audio) und Nativ (expo-av)

## Key API Endpoints
- `POST /api/tts/generate` - TTS audio generation (OpenAI)
- `GET /api/recipes/personalized/{profile_id}` - Personalized recipe scoring
- `GET /api/recipes?lang=de` - All recipes
- `GET /api/recipes/filters?lang=de` - Filter categories/tags
- `GET /api/tracking/symptoms/today/{profile_id}` - Daily submission status
- `GET /api/health-profile/{profile_id}` - Profile + assessment
- `GET /api/supplement-plan/{profile_id}` - Supplement plan data

## Backlog
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
