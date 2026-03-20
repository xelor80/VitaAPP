# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images)
- **Deploy Note**: Use CUSTOM_MONGO_URL/CUSTOM_DB_NAME env vars to prevent Emergent overwrite

## What's Been Implemented

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (CRUD + daily plan + check-in)
- Water Tracking with AI-based goal calculation
- VERO Water Reminders
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog with Personalized + All tabs
- Progress Dashboard, Admin Panel, Product Selection

### Rewards System (2026-03-20) - COMPLETED
**Backend (Phase 1):**
- New route: `/app/backend/routes/rewards.py`
- 6 new MongoDB collections: reward_settings, reward_events, user_points, rewards_catalog, reward_redemptions, user_streaks
- User endpoints: grant, balance, today, history, streaks, catalog, redeem, redemptions
- Admin endpoints: settings CRUD, catalog CRUD, analytics
- Anti-abuse: unique actions once/day, per-context dedup, daily limits
- Streak tracking with 7/14-day bonuses
- Integration into water_tracking.py, medications.py, diary.py
- 22/26 tests passed (4 = rate-limiting, not bugs)

**Frontend (Phase 2):**
- New page: `/app/frontend/app/rewards.tsx` - Full rewards page with balance, catalog, tabs
- Dashboard integration: Points badge card with balance + streak in index.tsx
- Localized: DE + IT

**Admin Briefing:** `/app/memory/REWARDS_SYSTEM_BRIEFING.md`

### Database Migration to MongoDB Atlas (2026-03-19) - COMPLETED
### Enriched Product Matching (2026-03-19) - COMPLETED
### Personalized Recipes (2026-03-17) - COMPLETED

## Key API Endpoints
### Rewards System
- `POST /api/rewards/grant` - Grant points (server-validated)
- `GET /api/rewards/{profile_id}/balance` - Point balance
- `GET /api/rewards/{profile_id}/today?lang=X` - Today summary
- `GET /api/rewards/catalog/list?lang=X&profile_id=X` - Catalog with status
- `POST /api/rewards/{profile_id}/redeem` - Redeem reward
- `GET/PUT /api/rewards/admin/settings` - Admin config
- `CRUD /api/rewards/admin/catalog` - Admin catalog
- `GET /api/rewards/admin/analytics` - Admin analytics

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications)

### P2 - Upcoming
- Medication Progress Tracking
- Historical Data Visualization (water intake graphs)

### Future
- Admin Web Dashboard enhancements (rewards system admin pages)
- Reactivate TR, FR, ES, RU languages
