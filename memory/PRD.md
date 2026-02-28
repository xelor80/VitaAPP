# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS at `/api/admin-app`
- **LLM**: OpenAI/Anthropic/Google via emergentintegrations
- **Dynamic Content**: SettingsProvider context fetches translations, chips, disclaimer from backend

## Completed Features

### Core Features
1. Symptom Analysis - AI-driven nutrition/supplement recommendations
2. Recipe Catalog - Static catalog
3. Symptom Diary - Daily health tracking
4. Admin Panel - Full CRUD: products, recipes, texts, chips, disclaimers, AI settings, supplements
5. Click Tracking - Affiliate analytics with geolocation
6. Data Migration - JSON to MongoDB

### Intelligent Onboarding (Feb 28, 2026)
- 6-step wizard with backend risk assessment engine
- Personalized assessment results (BMI, deficiencies, priority areas)
- Improved slider UI

### Evidence-Based Supplement Plan (Feb 28, 2026)
- 17 supplements knowledge base
- Algorithmic + LLM personal summary
- Safety module (contraindications, medication interactions)
- 8-week plan with 4 phases, daily schedule
- Browser notification reminders
- Admin panel supplement management

### Dynamic Content Integration (Feb 28, 2026) - P1 COMPLETE
- SettingsProvider context fetches translations, chips, disclaimer on app load
- t() function extended with dynamicOverrides for backend-first translations
- All home components (HomeHeader, SymptomInput, AnalyzeButton, DiaryButton, FooterDisclaimer) use dynamic overrides
- DisclaimerScreen shows dynamic content from backend
- SymptomChips load from backend settings with icons
- Results page uses dynamic translations
- Fallback to hardcoded i18n values when backend unavailable
- Admin panel changes now reflected in mobile app

## Key Files
- `frontend/src/SettingsContext.tsx` - Dynamic content provider
- `frontend/src/i18n.ts` - Translation function with overrides
- `frontend/app/_layout.tsx` - SettingsProvider wrapping all screens
- `backend/routes/settings.py` - Settings CRUD endpoints
- `backend/core/supplement_engine.py` - Supplement plan algorithm
- `backend/routes/supplement_plan.py` - Plan API endpoints

## Credentials
- **Admin Panel**: `/api/admin-app`, Password: `Wk220480xel!`

## Prioritized Backlog

### P2 - Health Profile Screen
Dedicated screen to revisit health summary after onboarding completion

### P3 - Recipe Catalog Search/Filter UI
Searchable, filterable recipe catalog interface

### P4 - Admin Health Statistics Dashboard
Anonymized, aggregated health statistics from onboarding data

### Refactoring
- `admin_app/app.js` modularization
