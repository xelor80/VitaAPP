# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
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

### Database Migration to MongoDB Atlas (2026-03-19) - COMPLETED
- Migrated 36 collections with 1688 documents from local MongoDB to Atlas
- All 19 API regression tests passed (iteration_74)
- Atlas URL: mongodb+srv://xelor80:***@vitaguide.f2cj30h.mongodb.net

### Personalized Recipes (2026-03-17) - COMPLETED
- Dashboard: Top 4 personalized recipes by relevance_score
- Recipes Tab: "Fuer dich" (personal) + "Alle Rezepte" (all)
- Backend: /api/recipes/personalized/{profile_id} scores by symptom match
- Testing: 23/23 tests passed (iteration_73)

### Internationalization (i18n) - 3 Active Languages
- Active: DE, IT, EN
- Language switcher on dashboard and disclaimer screen
- Recipe content pre-translated in MongoDB (7 langs stored)

### Performance Optimization (2026-03-15) - COMPLETED
- Recipe endpoints ~100-270ms (down from 5-10s)
- All 37 recipes pre-translated in DB

## Key API Endpoints
- `GET /api/recipes/personalized/{profile_id}?lang=X` - Personalized recipes
- `GET /api/recipes?lang=X` - All recipes
- `GET/PUT /api/water-tracking/{profile_id}/water-reminders` - Water reminders
- `POST /api/products/select` - Save product selection
- `GET /api/medications/{profile_id}/daily-plan` - Combined daily plan
- `POST /api/admin/auth` - Admin authentication

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications)

### P2 - Upcoming
- Medication Progress Tracking (integrate into Progress section)
- Historical Data Visualization (water intake graphs)

### Future
- Admin Web Dashboard (separate project, briefing at /app/memory/ADMIN_DASHBOARD_BRIEFING.md)
- Reactivate TR, FR, ES, RU languages
