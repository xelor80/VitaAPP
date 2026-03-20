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

### Rewards System (2026-03-20) - COMPLETED (Phase 1 + 2)
**Backend:**
- 6 new MongoDB collections: reward_settings, reward_events, user_points, rewards_catalog, reward_redemptions, user_streaks
- User endpoints: grant, balance, today, history, streaks, catalog, redeem, redemptions
- Admin endpoints: settings CRUD, catalog CRUD, analytics
- Anti-abuse: unique actions once/day, per-context dedup, daily limits
- Streak tracking with 7/14-day bonuses
- Integration into water_tracking.py, medications.py, diary.py

**Frontend:**
- `rewards.tsx` – Full rewards page with balance, tabs, catalog, redeem
- Dashboard: Points badge card + streak (index.tsx)
- Daily check-in: auto-grant on dashboard load
- Water tracking: "+X Punkte" in feedback toast
- Plan screen (supplements/medications): reward toast notification with FadeInDown animation
- Localized: DE + IT

**Admin Briefing:** `/app/memory/REWARDS_SYSTEM_BRIEFING.md`

### Database Migration to MongoDB Atlas (2026-03-19) - COMPLETED
### Enriched Product Matching (2026-03-19) - COMPLETED
### Personalized Recipes (2026-03-17) - COMPLETED

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications)

### P2 - Upcoming
- Medication Progress Tracking
- Historical Data Visualization (water intake graphs)

### Future
- Admin Web Dashboard: Rewards admin pages (briefing ready)
- Reactivate TR, FR, ES, RU languages
