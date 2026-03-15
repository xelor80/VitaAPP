# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (NEW)
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
- UI/UX cleanups (TTS removal, rename Ernährungs-Tipps → Gesundheits-Tipps)
- **Medication Management - Phase 1** (Backend CRUD + Frontend pages)
  - Backend: Full CRUD, daily-plan, check-in toggle, stats endpoints
  - Frontend: medications.tsx (add/edit/delete), daily-plan.tsx (combined view)
  - Plan tab refactored as hub page

### Bug Fixes Applied (2026-03-15)
- P0: Fixed crash on medication pages (medications.tsx, daily-plan.tsx)
  - Removed unused useSwipeBack import/panHandlers (handled globally in _layout.tsx)
  - Added missing Stack.Screen registrations in _layout.tsx
  - Cleared Metro cache
  - All 23 backend tests passing (100%)

## Prioritized Backlog

### P1 - In Progress
- User verification of Medication Feature (needs testing on device)

### P1 - Upcoming
- Medication Daily Plan Logic enhancement (interactive checkboxes fully wired)
- Medication Intake Logging verification

### P2 - Future
- Medication Reminders (push notifications)
- Medication Progress Tracking (integrate into Progress section)
- Historical Data Visualization (water intake graphs)

## Key API Endpoints
- `GET/POST /api/medications/{profile_id}` - List/Create medications
- `PUT/DELETE /api/medications/{profile_id}/{medication_id}` - Update/Delete
- `GET /api/medications/{profile_id}/daily-plan?lang=de` - Combined daily plan
- `POST /api/medications/{profile_id}/{medication_id}/check-in` - Toggle intake
- `GET /api/medications/{profile_id}/stats?days=7` - Adherence stats

## DB Collections
- `medications`: { id, profile_id, name, dosage, unit, timings, frequency, specific_days, meal_relation, note, start_date, end_date, active, created_at }
- `medication_logs`: { profile_id, medication_id, date, timing, taken_at }
- `water_tracking`: { user_id, date, intake, goal }
