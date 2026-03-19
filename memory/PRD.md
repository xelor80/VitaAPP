# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images)
- **Deploy Note**: Use CUSTOM_MONGO_URL/CUSTOM_DB_NAME env vars to prevent Emergent from overwriting Atlas connection

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
- Used CUSTOM_MONGO_URL/CUSTOM_DB_NAME to prevent Emergent overwrite on deploy

### Product Nutrient Matching Fix (2026-03-19) - COMPLETED
- Fixed: Products had Italian-only tags but search used German-only tags
- Fix: Combined DE+IT primary tags for search, added name-based matching via $or query
- Fixed probiotics tag map to include German spelling "mikrobiom"
- Also fixed pricing-summary endpoint with same approach
- Result: 9/12 nutrients now find products (3 missing = no products in shop)

### Personalized Recipes (2026-03-17) - COMPLETED
- Dashboard: Top 4 personalized recipes by relevance_score
- Recipes Tab: "Fuer dich" (personal) + "Alle Rezepte" (all)

### Internationalization (i18n) - 3 Active Languages
- Active: DE, IT, EN

### Performance Optimization (2026-03-15) - COMPLETED
- Recipe endpoints ~100-270ms (down from 5-10s)

## Key API Endpoints
- `GET /api/products/by-nutrient/{nutrient}?lang=X` - Products for nutrient (fixed)
- `GET /api/products/pricing-summary?nutrients=X&lang=X` - Price estimates (fixed)
- `GET /api/recipes/personalized/{profile_id}?lang=X` - Personalized recipes
- `GET /api/recipes?lang=X` - All recipes
- `GET/PUT /api/water-tracking/{profile_id}/water-reminders` - Water reminders
- `GET /api/medications/{profile_id}/daily-plan` - Combined daily plan
- `POST /api/admin/auth` - Admin authentication

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications)

### P2 - Upcoming
- Medication Progress Tracking (integrate into Progress section)
- Historical Data Visualization (water intake graphs)

### Future
- Admin Web Dashboard enhancements (see ADMIN_DASHBOARD_BRIEFING.md)
- Reactivate TR, FR, ES, RU languages
- Add missing products for K2, Selen, Ashwagandha in Admin Dashboard
