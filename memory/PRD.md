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
11. **NEW: Water Tracking** — Personalized hydration tracking with:
    - Auto-calculated daily goal from health profile (33ml/kg + adjustments)
    - Animated water circle with wave visualization
    - Quick-add buttons (+100, +200, +250, +500ml, custom)
    - VERO contextual tips (morning, progress-based, goal reached)
    - 7-day/30-day history with bar chart
    - Custom goal adjustment
    - Reminder settings (user opt-in push notifications)
    - Dashboard card with progress bar

## Architecture
```
backend/
  routes/water_tracking.py — GET today, POST add, GET history, GET/PUT goal, GET/PUT reminder
  (MongoDB collections: water_tracking, water_goals, water_reminders)
frontend/
  app/water-tracking.tsx — Full water tracking screen
  app/(tabs)/index.tsx — Dashboard with water card
```

## Credentials
- Admin Password: Wk220480xel!

## Completed Work
- [2026-03-14] Water Tracking Feature: Backend (7 endpoints, 17/17 tests passed) + Frontend (animated UI, dashboard card)
- [2026-03-12] UI improvements: Header redesign, VERO positioning, tab navigation, color scheme

## Backlog
- Push notification scheduling for water reminders (expo-notifications local)
- Awaiting user feedback on water tracking UI
