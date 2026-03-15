# VitaGuide+ - Product Requirements Document

## Original Problem Statement
Bilingual (German/Italian) health app with AI-powered nutrition tips. Comprehensive personal health coach application.

## Tech Stack
- **Frontend**: React Native (Expo) — reanimated, svg, notifications
- **Backend**: FastAPI + MongoDB (Motor async)
- **3rd Party**: OpenAI GPT-4o (Emergent LLM Key), OpenAI TTS, Shopify API, SMTP, Unsplash

## Core Features
1. Symptom Analysis (AI-powered, DE/IT)
2. Product Recommendations (Shopify-synced)
3. Recipe System (AI-generated)
4. Health Profiles
5. Admin Panel (full-featured web admin)
6. Digital Mascot "VERO" (page-specific tips)
7. Supplement Plans (8-week plans with timing)
8. Tab-Based Navigation (4 tabs)
9. Dashboard Home Screen (VERO hero, feature cards, recipes)
10. Water Tracking (AI goal, animated card, VERO tips)
11. **Medications Management** (NEW):
    - CRUD: Add/edit/delete medications with name, dosage, unit, timings, frequency, meal relation, notes, dates
    - Combined daily plan (supplements green + medications blue) with checkboxes
    - Check-in toggle (mark as taken/untaken)
    - Adherence statistics (7-day, 30-day)
    - Legal disclaimer (no medical recommendations)
    - VERO integration with page-specific tips

## Architecture
```
backend/
  routes/medications.py — CRUD, daily-plan, check-in, stats
  routes/water_tracking.py — Water tracking + AI calculation
  routes/supplement_plan.py — Supplement plans
  (MongoDB: medications, medication_logs, water_tracking, water_goals, supplement_plans, supplement_check_ins)
frontend/
  app/(tabs)/plan.tsx — Plan hub: Tagesplan card + Supplement card + Medications card
  app/medications.tsx — Medication management (add/edit/delete form)
  app/daily-plan.tsx — Combined daily plan with checkboxes
  app/supplement-plan.tsx — Existing supplement plan
  app/water-tracking.tsx — Water tracking page
  components/WaterTrackerCard.tsx — Animated dashboard card
  src/guideData.ts — Page-specific VERO tips (all pages)
```

## Credentials
- Admin Password: Wk220480xel!

## Completed Work
- [2026-03-15] Medications Management Feature:
  - Backend: 7 endpoints (CRUD, daily-plan, check-in, stats) — 23/23 tests passed
  - Frontend: medications.tsx (management), daily-plan.tsx (combined plan), plan.tsx (hub)
  - Plan tab redesigned as hub with Tagesplan, Supplement Plan, Medications navigation
  - VERO tips added for /medications and /daily-plan pages
  - Legal disclaimer for medications
- [2026-03-15] Bug fixes:
  - Symptom analysis: Fixed API field mapping (symptoms → text+tags)
  - Dashboard card name: "Ernaehrungs-Tipps" → "Gesundheits-Tipps"
  - Supplement plan: TTS/Vorlesen feature removed
  - Pricing: Moved price_per_day from supplements to products in admin
  - VERO: Page-specific tips for all routes
  - VERO Water: Transparent image (vero_trinkt.png)
- [2026-03-14] Water Tracking Revamp (AI calculation, animated card, VERO tips)

## Backlog
- P1: Medication reminder push notifications (expo-notifications)
- P1: Medication adherence display in Progress section
- P1: Hydration data in Progress section
- P2: Historical data visualization (charts over weeks/months)
- P2: Push notification scheduling for water reminders
