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

### YouTube Video Integration - Completed 2026-03-01
- **Home Screen**: "Videos & Tipps" button with YouTube icon navigates to /videos
- **Videos Screen**: Displays videos grouped by health categories (Gelenke, Verdauung, Herz, etc.)
- **Language Separation**: Videos filtered by DE/IT based on app language
- **Video Categories**: 10 health-related categories (articolazioni, digestione, peso, cuore, energia, pelle, immunsystem, schlaf, memoria, allgemein)
- **Admin Panel**: Full CRUD for video management with thumbnail preview, category filter, language toggle
- **YouTube Channel Link**: Direct link to @joachim_kaeser_italia channel
- **Backend APIs**:
  - `GET /api/videos/categories` - Get all video categories
  - `GET /api/videos` - Get videos with optional lang/category filters
  - `GET /api/videos/by-category/{lang}` - Get videos grouped by category
  - `POST /api/videos` - Create new video
  - `PUT /api/videos/{video_id}` - Update video
  - `DELETE /api/videos/{video_id}` - Delete video

### Push Notifications for Supplement Reminders (P2) - Completed 2026-03-01
- **NotificationService**: Created `src/services/NotificationService.ts` with full notification management
- **Expo Notifications**: Native push notifications for iOS/Android using `expo-notifications`
- **Web Browser Notifications**: Fallback for web using the Notification API
- **Reminder Settings**: Configurable times for morning, noon, and evening reminders
- **Test Notification**: Button to test notification delivery
- **Permission Handling**: Automatic permission requests with user feedback
- **Features**:
  - Toggle to enable/disable reminders
  - Customizable reminder times (HH:MM format)
  - Daily recurring notifications based on supplement schedule
  - Alert confirmation when reminders are activated
  - Persistence of settings in backend

## Key Routes
- `/` - Home | `/onboarding` - Wizard | `/health-profile` - Profile
- `/supplement-plan` - Plan | `/tracking` - Progress Dashboard | `/videos` - Video Library
- `/results` - Analysis | `/diary` - Diary
- `/api/admin-app` - Admin (Password: `Wk220480xel!`)

## Prioritized Backlog
- **P3**: Recipe Catalog Search/Filter UI
- **P4**: Admin Health Statistics Dashboard
- **Refactoring**: admin_app/app.js modularization

## Key Database Collections
- `health_profiles` - User health data from onboarding
- `supplement_plans` - Generated supplement plans
- `symptom_tracking` - Daily symptom ratings
- `compliance_tracking` - Daily supplement compliance
- `products_de`, `products_it` - Affiliate products
- `videos` - YouTube video metadata with category and language
- `settings` - Dynamic UI content
