# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB Atlas.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images), Emergent Google Auth

## What's Been Implemented

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (CRUD + daily plan + check-in)
- Water Tracking with AI-based goal calculation
- VERO Water Reminders & Guide Mascot
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog with Personalized + All tabs
- Progress Dashboard, Admin Panel, Product Selection

### Auth + Sync System (2026-03-20) - COMPLETED
**Backend (`/app/backend/routes/auth.py`):**
- `users` collection with email, password_hash, google_id, profile_id, auth_provider
- JWT token auth (30-day expiry) with bcrypt password hashing
- POST `/api/auth/register` - Email+Password registration with profile linking
- POST `/api/auth/login` - Email+Password login, auto-links local profile
- POST `/api/auth/google` - Google OAuth via Emergent Auth session exchange
- GET `/api/auth/me` - Returns authenticated user data
- GET `/api/auth/sync-data/{profile_id}` - Returns all user data (profile, supplements, meds, water, points, streak)
- POST `/api/auth/link-profile` - Links health_profile to user account
- POST `/api/auth/logout`
- All 20 backend tests passed (100%)

**Frontend:**
- `/app/frontend/src/AuthContext.tsx` - Auth state provider with token persistence
- `/app/frontend/app/login.tsx` - Login/Register screen with Email+Password + Google Auth
- `/app/frontend/app/_layout.tsx` - Updated with AuthProvider
- `/app/frontend/app/health-profile.tsx` - Account section (logged in: email + sync badge + logout; logged out: login prompt)
- `/app/frontend/app/onboarding.tsx` - Auto-links new profiles to logged-in users
- "Ohne Anmeldung fortfahren" skip option for users who don't want to register yet

### Rewards System (2026-03-20) - COMPLETED
- 6 new DB collections, 21 API endpoints
- Frontend: Rewards page, dashboard integration, VERO mascot tips
- Bug fix: next_reward hint now works for new users (0 balance)

### Database Migration to MongoDB Atlas (2026-03-19) - COMPLETED
### Enriched Product Matching (2026-03-19) - COMPLETED

## Key DB Schema
- `users`: user_id, email, password_hash, google_id, profile_id, auth_provider, first_name, picture, created_at, last_login
- `health_profiles`: id (UUID), age, gender, height, weight, diet, conditions, etc.
- `reward_settings`, `reward_events`, `user_points`, `rewards_catalog`, `reward_redemptions`, `user_streaks`

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications)

### P2 - Upcoming
- Medication Progress Tracking
- Historical Data Visualization (water intake graphs)

### Future
- Admin Web Dashboard: Rewards admin pages (briefing ready in `/app/memory/REWARDS_SYSTEM_BRIEFING.md`)
- Reactivate TR, FR, ES, RU languages
