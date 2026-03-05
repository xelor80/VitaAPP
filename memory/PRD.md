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

## Implemented Features (Complete) - 41 Features
1-39: [See CHANGELOG.md for full history]
40. **Gesundheitsprofil Redesign** - 2x2 card grid (Profile, BMI gauge, Stress slider, Sleep slider)
41. **Supplement-Plan Redesign** - Complete visual overhaul:
    - Teal gradient header with "Hallo [Name]" + sun icon
    - Erinnerung card (default visible) with smart time-slot detection
    - Tagesplan as default tab with Morgens/Abends time cards
    - Colorful pill/capsule icons per supplement type (18 icon mappings)
    - "Einnahme abgehakt" completion button with gradient
    - "Supplement Uebersicht" overview card with pill grid + ALLE ANZEIGEN

## Key Files Modified (Latest Session)
- `frontend/app/health-profile.tsx` - 2x2 card grid redesign with SVG BMI gauge
- `frontend/components/profile/profileStyles.ts` - Health profile styles
- `frontend/app/supplement-plan.tsx` - Complete supplement plan redesign
- `expo-linear-gradient@15.0.8` added as dependency

## Key API Endpoints
- `GET /api/health-profile/{profile_id}` - Profile + assessment data
- `POST /api/health-profile` - Create health profile
- `GET /api/supplement-plan/{profile_id}` - Supplement plan data
- `POST /api/supplement-plan/{profile_id}` - Generate plan
- `GET /api/price-alerts/{profile_id}` - Price drop alerts
- `GET /api/products/by-nutrient/{nutrient}` - Product search
- `GET /api/products/pricing-summary` - Price per day

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern (P1)
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
