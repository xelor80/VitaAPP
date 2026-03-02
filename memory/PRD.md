# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content, health tracking & progress, YouTube video integration, product label analysis, health score dashboard.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS at `/api/admin-app`
- **LLM**: emergentintegrations (GPT-4o text, GPT-4.1 vision)
- **Charts**: react-native-chart-kit, react-native-svg

## Completed Features

### Core Features
1. Symptom Analysis, Recipe Catalog, Symptom Diary
2. Admin Panel (products, recipes, texts, chips, disclaimers, AI settings, supplements, videos)
3. Click Tracking, Data Migration

### Intelligent Onboarding + Health Profile
- 6-step wizard, risk assessment, deficiency cards

### Supplement Plan + Affiliate Products
- 17 supplements, 8-week plan, push notifications

### Health Tracking & Progress - Completed 2026-02-28
- Progress Dashboard, Symptom/Compliance Tracking, Trend Charts, Milestones

### YouTube Video Integration - Completed 2026-03-01
- Videos in analysis, admin CRUD, platform-specific player

### Enhanced Symptom Analysis (v2.0) - Completed 2026-03-01
- Health profile integration, scientific tone

### Product Label Analysis (Image + PDF) - Completed 2026-03-02
- GPT-4.1 Vision for images, PyMuPDF for PDF text extraction
- Dual upload in admin panel (Bild + PDF)

### Health Score Dashboard - Completed 2026-03-02
- **Backend**: `GET /api/health-score/{profile_id}?lang=de|it`
  - Calculates 0-100 score from: symptom intensity, compliance, sleep, stress, energy, nutrient risk
  - GPT-4o generates label + recommendation + sub-category scores
  - Month-over-month trend comparison (30d vs 60d)
- **Frontend**: `HealthScoreCard` component on home screen
  - Circular SVG score indicator with gradient (Red 0-40, Yellow 41-70, Green 71-100)
  - 4 sub-categories: Mikronährstoffe, Schlaf, Stress, Energie (with Gut/Mittel/Niedrig badges)
  - AI-generated label and recommendation
  - Trend change display (+/- points)
  - Bilingual (DE/IT) with lang-reactive useEffect
  - Only shows when health_profile_id exists in AsyncStorage
- **Testing**: Backend 100% (6/6), Frontend 100% (after lang fix) - iteration_19.json

### Bug Fixes - Completed 2026-03-02
- nutrition_tips render error (OverviewTab + NutritionTab: objects vs strings)

## Key Routes
- `/` - Home (with Health Score Card)
- `/onboarding` - Wizard | `/health-profile` - Profile
- `/supplement-plan` - Plan | `/tracking` - Progress Dashboard
- `/api/admin-app` - Admin (Password: `Wk220480xel!`)

## Prioritized Backlog
- **P3**: Recipe Catalog Search/Filter UI
- **P4**: Admin Health Statistics Dashboard
- **Refactoring**: admin_webapp/app.js modularization

## Key DB Collections
- `health_profiles`, `supplement_plans`, `symptom_tracking`, `compliance_tracking`
- `products_de/it`, `videos`, `settings`
