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
5. **Admin Panel** - Full-featured web admin with:
   - Product/Recipe/Translation/Chip management
   - Shopify auto-sync with soft deletion, change detection, full re-import
   - User statistics dashboard
   - Sync history log
   - AI settings configuration
   - Click tracking & analytics
   - Health statistics
   - Video management
   - Label analysis
6. **Digital Mascot "VERO"** - Onboarding tour + contextual help (renamed from VIO)
7. **In-App Admin Access** - WebView with token-based auto-login
8. **Mobile-Responsive Admin** - Full mobile-first CSS redesign
9. **Text-to-Speech** - OpenAI TTS for analysis results
10. **Supplement Plans** - Daily dose calculations with baseline fallback
11. **Tab-Based Navigation** - 4 tabs: Home, Gesundheitsprofil, Supplement Plan, Rezepte
12. **Dashboard Home Screen** - Feature cards, recipe carousel, expandable symptom analysis
13. **Shift Work Support** - Shift cycle rotator for supplement timing

## Key Architecture
```
/app
├── backend/
│   ├── admin_webapp/ (index.html, styles.css, app.js)
│   ├── core/supplement_engine.py (baseline supplement logic)
│   ├── models/
│   ├── routes/admin.py, supplement_plan.py, etc.
│   └── utils/shopify_sync.py
└── frontend/
    ├── app/(tabs)/ (Home, Profile, Plan, Recipes tabs)
    ├── app/_layout.tsx (root layout)
    └── src/components/guide/ (VERO mascot)
```

## Credentials
- Admin Password: Wk220480xel!
- DE Shop: https://joachim-kaeser.de
- IT Shop: https://joachimkaeser.it

## Completed Work
- [2026-03-12] VERIFIED: All 8 bug fixes from UI redesign session (recipes display, symptom analysis, supplement plan generation, dashboard components, tab navigation, expandable symptom analysis) - 100% backend (12/12) and 100% frontend
- [2026-03-12] Bugfix: Leerer Supplement-Plan bei Profil ohne Beschwerden - Basis-Supplement-Set + Frontend leerer-Stack-Check
- [2026-03-12] Bugfix: VERO-Bubble Position, Go-Back Navigation repariert
- [2026-03-12] GROSSES REDESIGN: Tab-basierte Navigation mit 4 Tabs nach Screenshot-Vorlage
- [2026-03-12] VIO->VERO Umbenennung, neue Bilder, Animationen, Event-Bus
- [2026-03-12] Bugfix: Profildaten werden nach Navigation zur Startseite aktualisiert
- [2026-03] Mobile-responsive admin panel, In-app admin access
- [2026-03] Shopify sync overhaul (soft deletion, hashing, expanded data extraction)
- [2026-03] Admin panel feature expansion (user stats, sync history, daily sync)

## Backlog (P2)
- No open issues or pending tasks
- Awaiting user direction for next features
