# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management
- Water Tracking with AI-based goal calculation
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog
- Progress Dashboard
- VERO Mascot (context-aware guide)
- Admin Panel
- Bilingual support (German/Italian)

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB (local)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images)

## What's Been Implemented

### Completed Features
- Water Tracking with AI goal calculation and animated dashboard card
- Symptom Analysis bug fix (chips + text fields)
- Context-Aware VERO mascot
- Manual Product Pricing (admin panel)
- UI/UX cleanups (TTS removal, rename dashboard card)
- Medication Management - Phase 1 (Backend CRUD + Frontend pages)
- P0 Crash Fix: medication pages (useSwipeBack import)

### Completed (2026-03-15) - Plan Restructuring
- **Supplement Plan**: Removed schedule/daily-plan tab, reminder card, and reminder settings. Now only shows Stack, Phases, and Interactions tabs (info-only).
- **Mein Plan Tab (plan.tsx)**: Complete rewrite as central intake hub:
  - Combined daily check-off list (supplements + medications) grouped by timing
  - Interactive checkboxes with toggle (check/uncheck)
  - Progress bar showing daily intake percentage
  - Integrated reminder settings (push notifications with time configuration)
  - Navigation cards to Supplement Plan and Medications management
  - Medical disclaimer
- **New Backend Endpoint**: `POST /api/medications/{profile_id}/supplement-check-in` for toggling supplement intake
- **Dashboard**: Renamed "Dein Supplement Plan" to "Dein Einnahme Plan"
- All 16 backend tests passed (100%)

## Key API Endpoints
- `GET/POST /api/medications/{profile_id}` - List/Create medications
- `PUT/DELETE /api/medications/{profile_id}/{medication_id}` - Update/Delete
- `GET /api/medications/{profile_id}/daily-plan?lang=de` - Combined daily plan
- `POST /api/medications/{profile_id}/{medication_id}/check-in` - Toggle medication intake
- `POST /api/medications/{profile_id}/supplement-check-in` - Toggle supplement intake
- `GET/PUT /api/supplement-plan/{profile_id}/reminders` - Reminder CRUD
- `GET /api/medications/{profile_id}/stats?days=7` - Adherence stats

## DB Collections
- `medications`: { id, profile_id, name, dosage, unit, timings, frequency, specific_days, meal_relation, note, start_date, end_date, active, created_at }
- `medication_logs`: { profile_id, medication_id, date, timing, taken_at }
- `supplement_check_ins`: { profile_id, date, supplement_ids, timing, taken_at }
- `water_tracking`: { user_id, date, intake, goal }

## Prioritized Backlog

### P1 - User Verification
- User should test: Plan tab check-off flow, reminder settings, supplement-plan without schedule tab

### P2 - Future
- Medication Reminders (push notifications per medication)
- Medication Progress Tracking (integrate into Progress section)
- Historical Data Visualization (water intake graphs)
