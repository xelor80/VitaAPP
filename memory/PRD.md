# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content, health profile dashboard, affiliate product recommendations, health tracking & progress system, YouTube video integration.

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
2. Admin Panel (products, recipes, texts, chips, disclaimers, AI settings, supplements, **videos**)
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
- **Symptom Tracking**: Daily rating (1-10) for overall + 5 categories
- **Compliance Tracking**: Checklist for supplement intake based on user's plan
- **Trend Analysis**: Line charts showing symptom and compliance trends
- **Milestones**: Gamified achievements
- **Coach Insights**: AI-powered personalized feedback

### YouTube Video Integration - Completed 2026-03-01
- Videos in symptom analysis results, matched by tags
- Video player: YouTube app on mobile, embedded on web
- Admin Panel: Full CRUD for video management

### Push Notifications for Supplement Reminders - Completed 2026-03-01
- NotificationService with expo-notifications
- Configurable reminder times for morning, noon, evening

### Enhanced Symptom Analysis (v2.0) - Completed 2026-03-01
- Health profile integration, scientific tone, deep symptom analysis
- Label data used in recommendations

### Product Label Analysis - Fixed 2026-03-01
- **Model**: GPT-4.1 via emergentintegrations (upgraded from GPT-4o for better vision)
- **Image Processing**: Auto-resize to max 2048px, JPEG optimization
- **Error Handling**: Separate library error catching, user-friendly German messages
- **Cache-Busting**: Admin panel serves JS/CSS with no-cache headers
- **API Endpoints**:
  - `POST /api/products/{product_id}/label` - Upload + AI analysis
  - `GET /api/products/{product_id}/label` - Retrieve analysis
  - `DELETE /api/products/{product_id}/label` - Delete label data
- **Testing**: Backend tests passed with various image sizes (400x300 to 4000x3000)

## Key Routes
- `/` - Home | `/onboarding` - Wizard | `/health-profile` - Profile
- `/supplement-plan` - Plan | `/tracking` - Progress Dashboard | `/videos` - Video Library
- `/results` - Analysis | `/diary` - Diary
- `/api/admin-app` - Admin (Password: `Wk220480xel!`)

## Known Issues
- OverviewTab.tsx line 38: `nutrition_tips` contains objects instead of strings (frontend render error in Expo logs)

## Prioritized Backlog
- **P3**: Recipe Catalog Search/Filter UI
- **P4**: Admin Health Statistics Dashboard
- **Refactoring**: admin_webapp/app.js modularization

## Key Database Collections
- `health_profiles` - User health data from onboarding
- `supplement_plans` - Generated supplement plans
- `symptom_tracking` - Daily symptom ratings
- `compliance_tracking` - Daily supplement compliance
- `products_de`, `products_it` - Affiliate products (with label_image, label_analysis fields)
- `videos` - YouTube video metadata with category and language
- `settings` - Dynamic UI content
