# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS at `/api/admin-app`
- **LLM**: OpenAI/Anthropic/Google via emergentintegrations

## Completed Features

### Core Features (Previous Sessions)
1. Symptom Analysis - AI-driven nutrition/supplement recommendations
2. Recipe Catalog - Static catalog
3. Symptom Diary - Daily health tracking
4. Admin Panel - Full CRUD: products, recipes, texts, chips, disclaimers, AI settings
5. Click Tracking - Affiliate analytics with geolocation
6. Data Migration - JSON to MongoDB

### Intelligent Onboarding (Feb 28, 2026)
- 6-step wizard: Basic Data, Lifestyle/Sleep, Stress/Energy, Health Conditions, Complaints, Lab Values
- Backend risk assessment engine
- Personalized assessment results (BMI, deficiencies, priority areas, warnings)
- Improved slider UI with large tap targets

### Evidence-Based Supplement Plan (Feb 28, 2026)
- **17 supplements** in knowledge base (vitamins, minerals, fatty acids, adaptogens, probiotics)
- **Algorithmic plan generation** based on health profile: dosages, timing, synergies, evidence levels
- **Safety module**: contraindication checks, medication interaction warnings, side effects
- **LLM personal summary** via emergentintegrations (with static fallback)
- **8-week plan** with 4 phases: Aufbau, Voll, Stabilisierung, Bewertung
- **Daily schedule**: Morning/Noon/Evening grouping
- **Browser notifications** for supplement reminders (configurable times)
- **Admin panel**: Supplements tab for editing dosages, timing, enabling/disabling supplements
- **Frontend**: 3-tab view (Stack, Tagesplan, Wochenplan) with expandable detail cards

## Key API Endpoints
- `POST /api/supplement-plan/{profile_id}` - Generate plan
- `GET /api/supplement-plan/{profile_id}` - Retrieve plan
- `GET /api/supplement-plan/{profile_id}/week/{n}` - Week view
- `PUT /api/supplement-plan/{profile_id}/reminders` - Configure reminders
- `GET /api/admin/supplements` - List all supplements (admin)
- `PUT /api/admin/supplements/{id}` - Update supplement config (admin)
- All previous endpoints (health-profile, settings, products, recipes, etc.)

## Key Files
- `backend/core/supplement_engine.py` - Supplement DB + plan algorithm
- `backend/routes/supplement_plan.py` - Plan API endpoints
- `frontend/app/supplement-plan.tsx` - Plan display page
- `frontend/components/supplement/planStyles.ts` - Plan styles

## Credentials
- **Admin Panel**: `/api/admin-app`, Password: `Wk220480xel!`

## Prioritized Backlog

### P1 - Dynamic Content Integration
Update mobile app to fetch UI texts, symptom chips, disclaimers from `/api/settings` (currently hardcoded in `i18n.ts`)

### P2 - Health Profile Screen
Dedicated screen to revisit health summary after onboarding

### P3 - Recipe Catalog Search/Filter
Searchable, filterable recipe catalog UI

### P4 - Admin Health Statistics Dashboard
Anonymized, aggregated health statistics from onboarding data

### Refactoring
- `admin_app/app.js` modularization
- Remove hardcoded values from `i18n.ts`
