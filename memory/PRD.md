# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core functionality: LLM-based symptom analysis for nutrition tips, supplement information, and affiliate links. Features include a recipe catalog, symptom diary, and mandatory safety disclaimers.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS web app served by FastAPI at `/api/admin-app`
- **LLM Integration**: OpenAI/Anthropic/Google via emergentintegrations (configurable in admin panel)

## Core Features

### Completed Features
1. **Symptom Analysis** - Users input symptoms, get AI-driven nutrition/supplement recommendations
2. **Recipe Catalog** - Static recipe catalog with filtering
3. **Symptom Diary** - Daily health tracking (mood, sleep, stress, water, exercise)
4. **Admin Panel** - Password-protected management for products, recipes, UI texts, symptom chips, disclaimers, AI model selection
5. **Click Tracking** - Affiliate link analytics with geolocation, device/browser data
6. **Data Migration** - All data migrated from JSON files to MongoDB
7. **Intelligent Onboarding Wizard** (COMPLETED Feb 28, 2026)
   - 6-step multi-step wizard: Basic Data, Lifestyle/Sleep, Stress/Energy, Health Conditions, Complaints, Lab Values
   - Backend risk assessment engine calculating micronutrient deficiency risks
   - Personalized assessment results with BMI, deficiency cards, priority areas, warnings
   - Full bilingual support (DE/IT)
   - Navigation: progress bar, back/next, skip
   - Home page "Gesundheits-Check starten" button

### Key Files
- `frontend/app/onboarding.tsx` - Onboarding wizard main page
- `frontend/components/home/OnboardingButton.tsx` - Home page navigation button
- `frontend/components/onboarding/onboardingStyles.ts` - Wizard styles
- `backend/routes/health_profile.py` - Health profile CRUD + onboarding options API
- `backend/core/health_engine.py` - Risk assessment engine

### Key API Endpoints
- `POST /api/health-profile` - Submit health profile, get assessment
- `GET /api/health-profile/{id}` - Retrieve profile + assessment
- `PUT /api/health-profile/{id}` - Update profile + regenerate assessment
- `GET /api/onboarding/options?lang=de|it` - Get all form options
- `GET/POST/PUT/DELETE /api/settings/{key}` - Dynamic app content
- `POST /api/symptoms/analyze` - Symptom analysis
- `POST /api/track/click` - Affiliate click tracking
- `GET /api/admin-app` - Admin panel

### Credentials
- **Admin Panel**: URL `/api/admin-app`, Password: `Wk220480xel!`

## Prioritized Backlog

### P1 - Dynamic Content Integration
Update mobile app to fetch UI texts, symptom chips, disclaimers from `/api/settings` endpoints (currently hardcoded in `i18n.ts`)

### P2 - Health Profile Screen
Create dedicated screen to view/revisit personalized health summary after onboarding completion

### P3 - Recipe Catalog Search/Filter UI
Implement searchable, filterable recipe catalog interface

### P4 - Admin Health Statistics Dashboard
Add dashboard in admin panel for anonymized, aggregated health statistics from onboarding data

### Refactoring
- `admin_app/app.js` growing large - split into modules
- Remaining hardcoded values in `i18n.ts` should use backend settings API
