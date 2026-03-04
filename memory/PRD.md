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

## Implemented Features (Complete) - 38 Features
1-34: [See previous versions - onboarding through first name personalization]
35. Extended First Name Personalization (name in DailyTasks, supplement plan, achievements)
36. Swipe-Back Gesture (gestureEnabled + PanResponder hook for web)
37. Preis-Transparenz unter CTA ("Preis pro Tag: ca. X,XX EUR" below supplement CTA)
38. **Servings Backfill System** - AI-powered extraction of daily servings per package from product descriptions. Admin panel button "Tagesdosen berechnen" triggers background job. 139/140 products successfully updated. Pricing now uses real servings data instead of 30-day default.

## Key API Endpoints
- `GET /api/products/pricing-summary?nutrients=...&lang=de` - Price per day per nutrient
- `POST /api/admin/backfill-servings?lang=de` - Start AI backfill job for servings
- `GET /api/admin/backfill-servings/{job_id}` - Check backfill status
- `POST /api/health-profile` - Creates profile (includes first_name)
- `GET /api/health-profile/{profile_id}` - Returns profile with first_name
- `GET /api/daily-tasks/{profile_id}` - Returns tasks + first_name
- `GET /api/achievements/{profile_id}` - Returns streaks + first_name

## Key Files Modified (This Session)
- `/app/backend/routes/shop_import.py` - AI prompt extracts `servings`, added backfill endpoint
- `/app/backend/routes/products.py` - Added pricing-summary endpoint
- `/app/frontend/app/supplement-plan.tsx` - Preis-pro-Tag display under CTA
- `/app/backend/admin_webapp/index.html` - Backfill UI section
- `/app/backend/admin_webapp/app.js` - Backfill JS function

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern
- `expo-av` zu `expo-audio` Migration (SDK 54)
