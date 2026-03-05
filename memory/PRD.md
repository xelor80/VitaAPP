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

## Implemented Features (Complete) - 40 Features
1-39: [See previous versions - onboarding through Preis-Alert System]
40. **Gesundheitsprofil Redesign** - Complete UI overhaul with:
    - 2x2 card grid layout (Profile, BMI, Stress, Sleep)
    - SVG semicircular BMI gauge with colored segments and needle
    - Gradient sliders for stress/sleep with expo-linear-gradient
    - Modern card-based design with shadows and rounded corners
    - Color-coded status badges (Niedrig/Mittel/Hoch, Schlecht/Mittel/Gut)
    - Avatar with user initials, nutrition progress bar
    - All existing sections preserved (risk overview, CTAs, priority areas)

## Bug Fixes (Previous Sessions)
- **Product Language Mixing Fix**: NUTRIENT_TAG_MAP split into language-specific primary/secondary tags
- **Deployment Failure Fix**: Resolved dependency conflicts in requirements.txt and package.json

## Key API Endpoints
- `GET /api/price-alerts/{profile_id}?lang=de` - Personalized price drop alerts
- `GET /api/products/by-nutrient/{nutrient}?lang=de` - Language-specific product search
- `GET /api/products/pricing-summary?nutrients=...&lang=de` - Price per day
- `POST /api/admin/backfill-servings?lang=de` - AI backfill for servings
- `GET /api/health-profile/{profile_id}` - Profile + assessment data
- `POST /api/health-profile` - Create health profile

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern (P1)
- `expo-av` zu `expo-audio` Migration (P2)

## Key Files Modified (This Session)
- `frontend/app/health-profile.tsx` - Complete redesign with 2x2 grid, SVG gauge, gradient sliders
- `frontend/components/profile/profileStyles.ts` - Updated styles for new layout
- `expo-linear-gradient@15.0.8` added as dependency
