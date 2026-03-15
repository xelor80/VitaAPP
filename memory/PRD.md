# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB (local, DB_NAME=test_database)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images)

## What's Been Implemented

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (CRUD + daily plan + check-in)
- Water Tracking with AI-based goal calculation
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog, Progress Dashboard
- VERO Mascot (context-aware guide)
- Admin Panel
- Product Selection for Supplements

### Internationalization (i18n) - 7 Languages
- Supported: DE, IT, EN, TR, FR, ES, RU
- Language switcher with flags on dashboard
- All UI text translated via tx() helper
- Recipe content pre-translated and stored in MongoDB (batch translated)

### Performance Optimization (2026-03-15) - P0 Fix COMPLETED
- **Problem**: Recipe endpoints were extremely slow due to on-the-fly AI translations
- **Solution**: 
  1. Seeded 30 recipes from recipes.json into MongoDB
  2. Ran batch translation script to pre-translate all recipes into 5 additional languages (EN, TR, FR, ES, RU)
  3. Removed `translate_recipe` AI function from products.py
  4. All recipe endpoints now read pre-translated data directly from DB
  5. Added `get_recipe_locale()` helper with fallback chain: lang -> en -> de
  6. Added auto-seeding of recipes on server startup if collection is empty
- **Result**: Response times dropped from 5-10s to ~100-270ms (50x improvement)
- **Testing**: 19/19 backend tests passed (iteration_71), all 37 recipes verified in all 7 languages

### Previous Completions
- Combined Reminders (supplements + medications) with item preview per timing slot
- Plan Restructuring: Mein Plan tab as central intake hub
- Dashboard: Symptom-Analyse before Wasseraufnahme, Language Switcher
- P0 Crash Fix (useSwipeBack), Daily plan supplement parsing fix
- Product Selection Feature with "Ich nehme dieses Produkt" button

## Key API Endpoints
- `GET /api/recipes?lang=X` - Get recipes in specified language (fast, pre-translated)
- `GET /api/recipes/recommendations?lang=X` - Personalized recipe recommendations
- `GET /api/recipes/filters?lang=X` - Recipe filter options
- `GET /api/recipes/personalized/{profile_id}?lang=X` - Health-profile-based recipes
- `POST /api/products/select` - Save product selection
- `GET /api/products/selections/{profile_id}` - Get all selections
- `GET /api/medications/{profile_id}/daily-plan?lang=de` - Combined daily plan
- `POST /api/medications/{profile_id}/{medication_id}/check-in` - Toggle medication intake

## Prioritized Backlog
### P2 - Upcoming
- Medication Reminders (push notifications)
- Medication Progress Tracking (integrate into Progress section)

### P2 - Future
- Historical Data Visualization (water intake graphs)
