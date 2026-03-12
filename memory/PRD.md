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
6. Digital Mascot "VERO" - Dashboard integration (large + small circular), onboarding tour
7. In-App Admin Access - WebView with token-based auto-login
8. Text-to-Speech - OpenAI TTS
9. Supplement Plans - Daily dose calculations with baseline fallback
10. Tab-Based Navigation - 4 tabs always visible
11. Dashboard Home Screen - Feature cards, recipe carousel, VERO mascot, symptom analysis
12. Embedded Sub-Screens in Tabs - No intermediate screens

## Key Architecture
```
backend/ - FastAPI + MongoDB
frontend/
  app/(tabs)/ - Tab navigation (plan.tsx imports SupplementPlanScreen, profile.tsx imports HealthProfileScreen)
  app/supplement-plan.tsx - Green color scheme, conditional back button
  app/health-profile.tsx - Conditional back button
  assets/images/vero-dashboard.png - VERO heart-gesture pose for dashboard
```

## Credentials
- Admin Password: Wk220480xel!

## Completed Work
- [2026-03-12] VERO Dashboard Integration: Large heart-gesture mascot in greeting area + small circular VERO near nutrition tips
- [2026-03-12] 4 UI Improvements: Tab bar always visible, full profile in tab, no intermediate screens, green color scheme
- [2026-03-12] All bug fixes verified (recipes, symptoms, supplements, navigation)

## Backlog
- No open issues
- Awaiting user direction for next features
