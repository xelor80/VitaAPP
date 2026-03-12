# VitaGuide+ - Product Requirements Document

## Original Problem Statement
Bilingual (German/Italian) health app using an LLM to provide nutrition tips based on user symptoms. Evolved into a comprehensive personal health coach application.

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: FastAPI + MongoDB
- **3rd Party**: OpenAI GPT-4o (Emergent LLM Key), OpenAI TTS, Shopify API, SMTP (kasserver.com), Unsplash, react-native-webview

## Core Features (Implemented)
1. Symptom Analysis - AI-powered with bilingual support (DE/IT)
2. Product Recommendations - Shopify-synced supplements
3. Recipe System - AI-generated healthy recipes
4. Health Profiles - User health data tracking
5. Admin Panel - Full-featured web admin
6. Digital Mascot "VERO" - Dashboard hero + small circular + onboarding tour
7. In-App Admin Access - WebView with token-based auto-login
8. Text-to-Speech - OpenAI TTS
9. Supplement Plans - Daily dose calculations with baseline fallback
10. Tab-Based Navigation - 4 tabs always visible, screens embedded in tabs
11. Dashboard Home Screen - Hero section with VERO peeking behind feature cards
12. Swipe-Back Gesture - Custom PanResponder for tab/stack navigation

## Key Architecture
```
backend/ - FastAPI + MongoDB
frontend/
  app/(tabs)/ - Tab navigation
    plan.tsx -> renders SupplementPlanScreen directly
    profile.tsx -> renders HealthProfileScreen directly
  app/supplement-plan.tsx - Green color scheme, conditional back button
  app/health-profile.tsx - Conditional back button
  src/useSwipeBack.ts - Custom swipe-back with tab support
  assets/images/vero-dashboard.png - VERO heart-gesture pose
```

## Credentials
- Admin Password: Wk220480xel!

## Completed Work
- [2026-03-12] VERO Dashboard: Hero position with peeking effect (z-index layering for native), small circular VERO
- [2026-03-12] Swipe-Back: Custom PanResponder updated with tab path support, Capture mode for ScrollView compatibility
- [2026-03-12] 4 UI Improvements: Tab bar always visible, full profile in tab, no intermediate screens, green color scheme
- [2026-03-12] All bug fixes verified (recipes, symptoms, supplements, navigation)

## Notes
- Z-index layering for VERO "peeking behind cards" effect works on native iOS/Android but not on web preview (RN Web limitation)
- Swipe-back gesture works via custom PanResponder (edge swipe from left 40px)

## Backlog
- No open issues
- Awaiting user direction for next features
