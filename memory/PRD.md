# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile web app. Core: LLM-based symptom analysis for nutrition tips, supplement info, affiliate links. Features: recipe catalog, symptom diary, safety disclaimers, intelligent onboarding, evidence-based supplement planning, dynamic admin-managed content, health tracking & progress system, YouTube video integration, product label analysis.

## Architecture
- **Frontend**: React Native (Expo for Web)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Admin Panel**: Standalone HTML/CSS/JS at `/api/admin-app`
- **LLM**: OpenAI/Anthropic/Google via emergentintegrations (GPT-4.1 for vision)
- **Charts**: react-native-chart-kit for data visualization

## Completed Features

### Core Features
1. Symptom Analysis, Recipe Catalog, Symptom Diary
2. Admin Panel (products, recipes, texts, chips, disclaimers, AI settings, supplements, videos)
3. Click Tracking with geolocation
4. Data Migration to MongoDB

### Intelligent Onboarding + Health Profile
- 6-step wizard with risk assessment engine
- Health Profile screen with bio data, risk badges, deficiency cards

### Supplement Plan + Affiliate Products
- 17 supplements, 8-week plan, 4 phases, LLM summary, reminders
- Home screen button with alert modal when no profile exists
- Affiliate product recommendations in supplement cards
- Click tracking for affiliate links

### Dynamic Content (P1)
- SettingsProvider fetches translations, chips, disclaimer from backend
- Admin changes reflected in app

### Health Tracking & Progress System - Completed 2026-02-28
- Progress Dashboard, Symptom Tracking, Compliance Tracking
- Trend Analysis with charts, Milestones, Coach Insights

### YouTube Video Integration - Completed 2026-03-01
- Videos in symptom analysis, matched by tags
- Video player: YouTube app on mobile, embedded on web
- Admin Panel: Full CRUD for video management

### Push Notifications - Completed 2026-03-01
- NotificationService with expo-notifications
- Configurable reminder times

### Enhanced Symptom Analysis (v2.0) - Completed 2026-03-01
- Health profile integration, scientific tone, deep analysis

### Product Label Analysis (Image + PDF) - Completed 2026-03-02
- **Image Upload**: GPT-4.1 Vision via emergentintegrations (ImageContent)
- **PDF Upload**: Text extraction via PyMuPDF + GPT-4.1 text analysis
- **Both simultaneously**: Image stored + PDF preferred for analysis (more reliable)
- **Image Processing**: Auto-resize to max 2048px
- **Admin UI**: Dual upload (Bild/PDF), existing label display with PDF link
- **API Endpoints**:
  - `POST /api/products/{product_id}/label` - Upload image/PDF + AI analysis
  - `GET /api/products/{product_id}/label` - Retrieve analysis
  - `DELETE /api/products/{product_id}/label` - Delete label data
- **DB fields**: `label_image`, `label_pdf`, `label_analysis`, `label_analyzed_at`
- **Testing**: All 4 scenarios passed (image-only, pdf-only, both, no-file)

## Key Routes
- `/` - Home | `/onboarding` - Wizard | `/health-profile` - Profile
- `/supplement-plan` - Plan | `/tracking` - Progress Dashboard
- `/results` - Analysis | `/diary` - Diary
- `/api/admin-app` - Admin (Password: `Wk220480xel!`)

## Known Issues
- OverviewTab.tsx: `nutrition_tips` contains objects instead of strings (frontend render error)

## Prioritized Backlog
- **P3**: Recipe Catalog Search/Filter UI
- **P4**: Admin Health Statistics Dashboard
- **Refactoring**: admin_webapp/app.js modularization

## Key DB Collections
- `health_profiles`, `supplement_plans`, `symptom_tracking`, `compliance_tracking`
- `products_de/it` (with label_image, label_pdf, label_analysis fields)
- `videos`, `settings`
