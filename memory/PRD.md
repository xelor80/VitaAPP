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
6. Digital Mascot "VERO"
7. Supplement Plans (baseline fallback)
8. Tab-Based Navigation (4 tabs, always visible)
9. Dashboard Home Screen (VERO hero, feature cards, recipes)
10. Swipe-Back Gesture
11. **Water Tracking** — Personalized hydration tracking with:
    - **AI-powered daily goal calculation** from health profile (GPT-4o via Emergent LLM Key)
    - Animated dashboard card with water glass SVG, progress bar, speech bubble, quick-add buttons
    - Quick-add buttons (+100, +200, +250, +500ml, custom) on dashboard card
    - VERO contextual tips (morning, progress-based, goal reached)
    - **VERO AI hydration tips** (tap VERO for personalized AI-generated hydration advice)
    - 7-day/30-day history with bar chart
    - Custom goal adjustment
    - Reminder settings (user opt-in push notifications)

## Architecture
```
backend/
  routes/water_tracking.py — GET today, POST add, GET history, GET/PUT goal, GET/PUT reminder,
                              POST recalculate-goal (AI), GET hydration-tip (AI)
  (MongoDB collections: water_tracking, water_goals, water_reminders)
frontend/
  components/WaterTrackerCard.tsx — Animated dashboard card (water glass SVG, progress, quick-add)
  app/water-tracking.tsx — Full water tracking screen with VERO tips
  app/(tabs)/index.tsx — Dashboard with WaterTrackerCard
```

## Credentials
- Admin Password: Wk220480xel!

## Completed Work
- [2026-03-14] Water Tracking Revamp:
  - AI-based water goal calculation (GPT-4o) replacing simple formula
  - Animated WaterTrackerCard component: SVG water glass, progress bar, speech bubble, quick-add buttons
  - VERO AI hydration tips: tap VERO on water-tracking page for personalized AI advice
  - New endpoints: /recalculate-goal (AI), /hydration-tip (AI)
  - Backend: 16/16 tests passed (100%)
- [2026-03-14] Water Tracking Feature: Backend (7 endpoints, 17/17 tests passed) + Frontend (animated UI, dashboard card)
- [2026-03-12] UI improvements: Header redesign, VERO positioning, tab navigation, color scheme

## Backlog
- P1: Progress & Reminder Integration — Integrate hydration data into main "Progress" section. Implement push notifications.
- P2: Historical Data Visualization — Graphs/charts for water intake over weeks/months.
- Push notification scheduling for water reminders (expo-notifications local)
