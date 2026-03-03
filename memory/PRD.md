# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)

## Implemented Features (Complete) - 37 Features
1-34: [See previous versions - onboarding through first name personalization]
35. Extended First Name Personalization (name in DailyTasks, supplement plan, achievements)
36. Swipe-Back Gesture (gestureEnabled + PanResponder hook for web)
37. **Preis-Transparenz unter CTA** - "Preis pro Tag: ca. X,XX EUR" Infozeile unter dem Supplement-CTA. Berechnet aus Affiliate-Produkten via `/api/products/pricing-summary`. Dezent grau, vertrauensbildend.

## Key API Endpoints
- `GET /api/products/pricing-summary?nutrients=...&lang=de` - NEW: Returns avg/min/max price per day per nutrient
- `POST /api/health-profile` - Creates profile (includes first_name)
- `GET /api/health-profile/{profile_id}` - Returns profile with first_name
- `GET /api/daily-tasks/{profile_id}` - Returns tasks + first_name
- `GET /api/achievements/{profile_id}` - Returns streaks + first_name
- `POST /api/tts/generate` - TTS audio generation

## Deployment Fixes Applied
- Removed conflicting `package-lock.json` from frontend (yarn-only)
- Added `.limit()` to unbounded MongoDB queries (production safety)

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern
- `expo-av` zu `expo-audio` Migration (SDK 54)
- `servings`-Feld fuer Preis/Tag-Berechnung befuellen (currently uses price/30 as default)
