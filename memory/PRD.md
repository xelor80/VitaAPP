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

## Implemented Features (Complete) - 39 Features
1-36: [See previous versions - onboarding through swipe-back]
37. Preis-Transparenz unter CTA ("Preis pro Tag" below supplement CTA)
38. Servings Backfill System (AI-powered extraction, admin panel button, 139/140 products updated)
39. **Preis-Alert System** - Personalized price drop notifications for products in user's supplement plan. Includes:
    - Price history tracking during Shopify sync
    - `GET /api/price-alerts/{profile_id}` endpoint
    - PriceAlerts widget on home screen (between DailyTasks and Achievements)
    - Shows: product name, old/new price, drop %, price per day, affiliate link
    - Dismiss functionality, personalized with first name
    - Transparent disclosure ("Affiliate-Link")

## Key API Endpoints
- `GET /api/price-alerts/{profile_id}?lang=de` - NEW: Personalized price drop alerts
- `GET /api/products/pricing-summary?nutrients=...&lang=de` - Price per day per nutrient
- `POST /api/admin/backfill-servings?lang=de` - Start AI backfill for servings
- `GET /api/admin/backfill-servings/{job_id}` - Backfill job status

## Key Files (This Session)
- `/app/backend/routes/price_alerts.py` - NEW: Price alerts endpoint
- `/app/backend/routes/shop_import.py` - Price history tracking + backfill
- `/app/backend/routes/products.py` - Pricing summary endpoint
- `/app/frontend/components/home/PriceAlerts.tsx` - NEW: Price alerts widget
- `/app/frontend/app/index.tsx` - PriceAlerts integrated
- `/app/frontend/app/supplement-plan.tsx` - Price per day display + bug fix

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern
- `expo-av` zu `expo-audio` Migration (SDK 54)
