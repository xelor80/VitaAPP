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

## Implemented Features (Complete) - 34 Features
1-26: [See previous PRD versions - onboarding through licensed recipe images]
27. TTS Audio Playback (OpenAI TTS - read aloud personal summary, DE/IT)
28. Daily Tasks "Heute fuer dich wichtig" (dynamic coach section)
29. Interactive Task Completion (check off supplements + quick symptom rating from home)
30. Achievement System (streaks, milestones, progress tracking, micro-animations)
31. Optimized Affiliate CTAs (advisory tone, dynamic nutrient-specific CTAs, transparent disclaimers)
32. Data-Driven Personalized Summary (no generic greetings, top 2 health drivers, strategic tone)
33. Trust Elements & Social Proof (star ratings, review counts, Laborgeprüft badge, analysis counter)
34. **First Name Personalization** (Vorname input in onboarding step 0, personalized "Hallo [Name]!" greeting on home screen)

## First Name Personalization Details (Feature #34)
- Onboarding step 0 has "Vorname" input field
- first_name saved to health_profiles collection
- Home screen fetches profile and displays "Hallo [Name]!" / "Ciao [Name]!" in header
- Graceful fallback: no greeting shown if no profile or no name set

## Key API Endpoints
- `POST /api/health-profile` - Creates profile (includes first_name)
- `GET /api/health-profile/{profile_id}` - Returns profile with first_name
- `GET /api/stats/trust` - Trust statistics
- `GET /api/achievements/{profile_id}` - Streaks, milestones
- `GET /api/daily-tasks/{profile_id}` - Prioritized daily tasks
- `POST /api/tts/generate` - TTS audio generation

## Key Files
- `/app/backend/routes/health_profile.py` - Health profile CRUD + onboarding options
- `/app/frontend/app/onboarding.tsx` - Onboarding wizard (Vorname in step 0)
- `/app/frontend/app/index.tsx` - Home screen (fetches firstName, passes to header)
- `/app/frontend/components/home/HomeHeader.tsx` - Displays personalized greeting

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern
- `expo-av` zu `expo-audio` Migration (SDK 54)
- `servings`-Feld fuer Preis/Tag-Berechnung befuellen
