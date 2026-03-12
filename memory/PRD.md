# VitaGuide+ - Product Requirements Document

## Original Problem Statement
Bilingual (German/Italian) health app using an LLM to provide nutrition tips based on user symptoms. Evolved into a comprehensive personal health coach application.

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: FastAPI + MongoDB
- **3rd Party**: OpenAI GPT-4o (Emergent LLM Key), OpenAI TTS, Shopify API, SMTP (kasserver.com), Unsplash, react-native-webview

## Core Features (Implemented)
1. **Symptom Analysis** - AI-powered symptom analysis with bilingual support (DE/IT)
2. **Product Recommendations** - Shopify-synced supplements with affiliate links
3. **Recipe System** - AI-generated healthy recipes
4. **Health Profiles** - User health data tracking
5. **Admin Panel** - Full-featured web admin
6. **Digital Mascot "VERO"** - Onboarding tour + contextual help
7. **In-App Admin Access** - WebView with token-based auto-login
8. **Mobile-Responsive Admin** - Full mobile-first CSS redesign
9. **Text-to-Speech** - OpenAI TTS for analysis results
10. **Supplement Plans** - Daily dose calculations with baseline fallback
11. **Tab-Based Navigation** - 4 tabs: Home, Gesundheitsprofil, Supplement Plan, Rezepte
12. **Dashboard Home Screen** - Feature cards, recipe carousel, expandable symptom analysis
13. **Shift Work Support** - Shift cycle rotator for supplement timing
14. **Embedded Sub-Screens in Tabs** - Supplement Plan and Health Profile render directly within tabs (tab bar always visible)

## Key Architecture
```
/app
backend/
  admin_webapp/ (index.html, styles.css, app.js)
  core/supplement_engine.py (baseline supplement logic)
  models/
  routes/admin.py, supplement_plan.py, etc.
  utils/shopify_sync.py
frontend/
  app/(tabs)/ (Home, Profile, Plan, Recipes tabs)
  app/(tabs)/plan.tsx -> imports SupplementPlanScreen directly
  app/(tabs)/profile.tsx -> imports HealthProfileScreen directly
  app/_layout.tsx (root layout)
  app/supplement-plan.tsx (also used standalone, green color scheme)
  app/health-profile.tsx (also used standalone, conditional back button)
  src/components/guide/ (VERO mascot)
```

## Credentials
- Admin Password: Wk220480xel!
- DE Shop: https://joachim-kaeser.de
- IT Shop: https://joachimkaeser.it

## Completed Work
- [2026-03-12] 4 UI Improvements: Tab bar always visible, full profile in tab, no intermediate screens, green color scheme consistency - 100% tested
- [2026-03-12] VERIFIED: All 8 bug fixes from UI redesign session - 100% backend and frontend
- [2026-03-12] GROSSES REDESIGN: Tab-basierte Navigation, Dashboard, VERO-Mascot, diverse Bugfixes

## Backlog (P2)
- No open issues or pending tasks
- Awaiting user direction for next features
