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

### VERO Water Reminders (2026-03-17) - NEW
- **Feature**: Push notification reminders for water intake
- **Backend**: `GET/PUT /api/water-tracking/{profile_id}/water-reminders`
  - Settings: enabled, interval_hours (1/2/3), start_time, end_time
  - Stored in `water_reminders` MongoDB collection
- **Frontend**: New "VERO Erinnerungen" section in water-tracking.tsx
  - Toggle on/off with Switch
  - Interval selection: 1h, 2h, 3h buttons
  - Custom active hours (start/end time inputs)
  - Preview showing number of daily reminders
  - Save & Test buttons
- **Notifications**: `scheduleWaterReminders()` in NotificationService.ts
  - Daily repeating notifications at chosen interval
  - VERO messages in DE/IT/EN
  - Automatic cancellation when disabled
- **Testing**: 11/11 backend tests passed (iteration_72)

### Internationalization (i18n) - 3 Active Languages
- Active: DE, IT, EN (reduced from 7)
- Language switcher on dashboard and disclaimer screen
- All UI text translated via tx() helper
- Recipe content pre-translated in MongoDB

### Performance Optimization (2026-03-15) - COMPLETED
- Recipe endpoints response time: ~100-270ms (down from 5-10s)
- All 37 recipes pre-translated in 7 languages in DB

### Previous Completions
- Combined Reminders (supplements + medications) with item preview
- Plan Restructuring: Mein Plan tab as central intake hub
- Dashboard layout, Language Switcher
- P0 Crash Fix, Product Selection Feature
- Disclaimer screen 7-language selector
- Cyrillic character fixes in notification buttons

## Key API Endpoints
- `GET/PUT /api/water-tracking/{profile_id}/water-reminders` - Water reminder settings (NEW)
- `GET /api/recipes?lang=X` - Get recipes in specified language
- `GET /api/recipes/recommendations?lang=X` - Personalized recipes
- `POST /api/products/select` - Save product selection
- `GET /api/medications/{profile_id}/daily-plan?lang=de` - Combined daily plan

## Prioritized Backlog
### P2 - Upcoming
- Medication Reminders (push notifications for medication intake)
- Medication Progress Tracking (integrate into Progress section)

### P2 - Future
- Historical Data Visualization (water intake graphs)
- Reactivate TR, FR, ES, RU languages
