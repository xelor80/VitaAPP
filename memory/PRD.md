# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content, health profile dashboard, affiliate product recommendations, health tracking & progress system.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS at `/api/admin-app`
- **LLM**: OpenAI/Anthropic/Google via emergentintegrations
- **Charts**: react-native-chart-kit for data visualization

## Completed Features

### Core Features
1. Symptom Analysis, Recipe Catalog, Symptom Diary
2. Admin Panel (products, recipes, texts, chips, disclaimers, AI settings, supplements)
3. Click Tracking with geolocation
4. Data Migration to MongoDB

### Intelligent Onboarding + Health Profile
- 6-step wizard with risk assessment engine
- Health Profile screen with bio data, risk badges, deficiency cards

### Supplement Plan + Affiliate Products
- 17 supplements, 8-week plan, 4 phases, LLM summary, reminders
- **Home screen button** with alert modal when no profile exists
- **Affiliate product recommendations** in supplement cards (matched by nutrient tags)
- Click tracking for affiliate links
- Admin panel supplement management

### Dynamic Content (P1)
- SettingsProvider fetches translations, chips, disclaimer from backend
- Admin changes reflected in app

### Health Tracking & Progress System (P0) - Completed 2026-02-28
- **Home Screen**: "Mein Fortschritt" button navigates to /tracking
- **Progress Dashboard**: Overall progress %, streak days, days tracked, compliance rate
- **Symptom Tracking**: Daily rating (1-10) for overall + 5 categories (energy, sleep, mood, concentration, digestion)
- **Compliance Tracking**: Checklist for supplement intake based on user's plan
- **Trend Analysis**: Line charts showing symptom and compliance trends over time
- **Milestones**: Gamified achievements (3/7/14/30 day streaks, 80%/90% compliance)
- **Coach Insights**: AI-powered personalized feedback based on tracking data
- **Backend APIs**: 
  - `POST /api/tracking/symptoms` - Save symptom ratings
  - `POST /api/tracking/compliance` - Save supplement compliance
  - `GET /api/tracking/dashboard/{profile_id}` - Full dashboard data
  - `GET /api/tracking/symptoms/{profile_id}` - Symptom history
  - `GET /api/tracking/compliance/{profile_id}` - Compliance history

## Key Routes
- `/` - Home | `/onboarding` - Wizard | `/health-profile` - Profile
- `/supplement-plan` - Plan | `/tracking` - Progress Dashboard
- `/results` - Analysis | `/diary` - Diary
- `/api/admin-app` - Admin (Password: `Wk220480xel!`)

## Prioritized Backlog
- **P2**: Push Notifications for Supplement Reminders (placeholder functions exist)
- **P3**: Recipe Catalog Search/Filter UI
- **P4**: Admin Health Statistics Dashboard
- **Refactoring**: admin_app/app.js modularization

## Key Database Collections
- `health_profiles` - User health data from onboarding
- `supplement_plans` - Generated supplement plans
- `symptom_tracking` - Daily symptom ratings
- `compliance_tracking` - Daily supplement compliance
- `products_de`, `products_it` - Affiliate products
- `settings` - Dynamic UI content
