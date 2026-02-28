# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content, health profile dashboard, affiliate product recommendations.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS at `/api/admin-app`
- **LLM**: OpenAI/Anthropic/Google via emergentintegrations

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

## Key Routes
- `/` - Home | `/onboarding` - Wizard | `/health-profile` - Profile
- `/supplement-plan` - Plan | `/results` - Analysis | `/diary` - Diary
- `/api/admin-app` - Admin (Password: `Wk220480xel!`)

## Prioritized Backlog
- **P3**: Recipe Catalog Search/Filter UI
- **P4**: Admin Health Statistics Dashboard
- **Refactoring**: admin_app/app.js modularization
