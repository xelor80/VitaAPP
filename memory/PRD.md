# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content, health profile dashboard.

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

### Evidence-Based Supplement Plan (Feb 28, 2026)
- 17 supplements knowledge base with algorithmic + LLM summaries
- Safety module, 8-week plan, daily schedule, browser notifications
- Admin panel supplement management

### Dynamic Content Integration (Feb 28, 2026) - P1 COMPLETE
- SettingsProvider fetches translations, chips, disclaimer from backend
- Admin panel changes reflected in mobile app

### Health Profile Screen (Feb 28, 2026) - P2 COMPLETE
- Bio data display (age, gender, diet, BMI, stress, sleep)
- Risk overview badges (Hoch/Mittel/Niedrig counts)
- Color-coded deficiency cards with localized nutrient names
- Priority areas with localized labels
- Links to supplement plan and onboarding redo
- OnboardingButton dynamically switches: "Gesundheitsprofil anzeigen" vs "Gesundheits-Check starten"

## Key Routes
- `/` - Home (symptom input, chips, buttons)
- `/onboarding` - 6-step health wizard
- `/health-profile` - Health profile dashboard
- `/supplement-plan` - 8-week supplement plan
- `/results` - Symptom analysis results
- `/diary` - Daily health diary
- `/api/admin-app` - Admin panel

## Credentials
- **Admin Panel**: `/api/admin-app`, Password: `Wk220480xel!`

## Prioritized Backlog

### P3 - Recipe Catalog Search/Filter UI
Searchable, filterable recipe catalog interface

### P4 - Admin Health Statistics Dashboard
Anonymized, aggregated health statistics from onboarding data

### Refactoring
- `admin_app/app.js` modularization
