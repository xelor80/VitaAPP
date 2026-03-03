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

## Implemented Features (Complete) - 36 Features
1-34: [See previous versions - onboarding through first name personalization]
35. **Extended First Name Personalization** - Name used in DailyTasks section title ("Heute fuer Max wichtig"), supplement plan title ("Max, dein Mikronaehrstoff-Plan"), achievement streak labels ("Super, Max! Aktuelle Serie"), task reasons ("Max, dein Magnesium wartet"), and done messages
36. **Swipe-Back Gesture** - Left-to-right swipe navigates back on all sub-screens (gestureEnabled: true + PanResponder-based useSwipeBack hook for web/cross-platform)

## Key Files Modified (Session 2)
- `/app/backend/routes/daily_tasks.py` - Fetches first_name, personalizes task titles/reasons, includes first_name in response
- `/app/backend/routes/achievements.py` - Fetches first_name, personalizes streak labels, includes first_name in response
- `/app/frontend/components/home/DailyTasks.tsx` - Uses first_name from API for section title and done message
- `/app/frontend/app/supplement-plan.tsx` - Fetches first_name, personalizes plan title
- `/app/frontend/app/_layout.tsx` - gestureEnabled: true, SwipeWrapper with useSwipeBack
- `/app/frontend/src/useSwipeBack.ts` - NEW: PanResponder hook for edge-swipe back navigation

## Key API Endpoints
- `POST /api/health-profile` - Creates profile (includes first_name)
- `GET /api/health-profile/{profile_id}` - Returns profile with first_name
- `GET /api/daily-tasks/{profile_id}` - Returns tasks + first_name field
- `GET /api/achievements/{profile_id}` - Returns streaks + first_name field
- `POST /api/tts/generate` - TTS audio generation
- `GET /api/stats/trust` - Trust statistics

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern
- `expo-av` zu `expo-audio` Migration (SDK 54)
- `servings`-Feld fuer Preis/Tag-Berechnung befuellen
