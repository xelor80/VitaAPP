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
- VERO Water Reminders (toggle, interval 1/2/3h, active hours)
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog with Personalized + All tabs
- Progress Dashboard
- VERO Mascot (context-aware guide)
- Admin Panel
- Product Selection for Supplements

### Personalized Recipes (2026-03-17) - NEW
- **Dashboard**: Shows top 4 personalized recipes (by relevance_score) instead of generic
- **Recipes Tab**: Two sub-tabs:
  - "Fuer dich" (personal) - sorted by relevance, with relevance_tags chips & star badges
  - "Alle Rezepte" (all) - full catalog, generic display
- **Backend**: `/api/recipes/personalized/{profile_id}` scores recipes by symptom match
- **Testing**: 23/23 tests passed (14 backend + 9 frontend, iteration_73)

### Internationalization (i18n) - 3 Active Languages
- Active: DE, IT, EN
- Language switcher on dashboard and disclaimer screen
- Recipe content pre-translated in MongoDB (7 langs stored)

### Performance Optimization (2026-03-15) - COMPLETED
- Recipe endpoints ~100-270ms (down from 5-10s)
- All 37 recipes pre-translated in DB

## Key API Endpoints
- `GET /api/recipes/personalized/{profile_id}?lang=X` - Personalized recipes (sorted by relevance)
- `GET /api/recipes?lang=X` - All recipes
- `GET/PUT /api/water-tracking/{profile_id}/water-reminders` - Water reminder settings
- `POST /api/products/select` - Save product selection
- `GET /api/medications/{profile_id}/daily-plan` - Combined daily plan

## Prioritized Backlog
### P2 - Upcoming
- Medication Reminders (push notifications)
- Medication Progress Tracking (integrate into Progress section)

### P2 - Future
- Historical Data Visualization (water intake graphs)
- Reactivate TR, FR, ES, RU languages
