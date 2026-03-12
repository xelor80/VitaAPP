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
6. **Digital Mascot "VIO"** - Onboarding tour + contextual help
7. **In-App Admin Access** - WebView with token-based auto-login
8. **Mobile-Responsive Admin** - Full mobile-first CSS redesign
9. **Text-to-Speech** - OpenAI TTS for analysis results
10. **Supplement Plans** - Daily dose calculations

## Completed Work
- [2026-03-12] VIO→VERO Umbenennung: Alle Referenzen geändert, 4 neue VERO-Bilder (Hallo/Super/Achtung/Herz) integriert, Bounce-In + Spring-Slide-Up + Slide-Fade Animationen, Event-Bus für Screen-Refresh
- [2026-03-12] Bugfix: Profildaten werden nach Navigation zur Startseite nicht aktualisiert - eventBus Pattern implementiert
- [2026-03] Mobile-responsive admin panel verified
- [2026-03] In-app admin access via WebView
- [2026-03] Shopify sync overhaul (soft deletion, hashing, expanded data extraction)
- [2026-03] Digital mascot "VIO" with onboarding
- [2026-03] Admin panel feature expansion (user stats, sync history, daily sync)

## Key Architecture
```
/app
├── backend/
│   ├── admin_webapp/ (index.html, styles.css, app.js)
│   ├── models/
│   ├── routes/admin.py
│   └── utils/shopify_sync.py
└── frontend/
    ├── src/app/(tabs)/ & admin.tsx
    └── src/components/guide/ (VIO mascot)
```

## Credentials
- Admin Password: Wk220480xel!
- DE Shop: https://joachim-kaeser.de
- IT Shop: https://joachimkaeser.it

## Backlog (P2)
- No open issues or pending tasks
- Awaiting user direction for next features
