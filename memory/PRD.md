# VitaGuide PRD - Bilingual Health & Nutrition App

## Problem Statement
A health-focused, bilingual (German/Italian) mobile app. Core functionality: LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo) web app
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (DB: test_database)
- **LLM**: OpenAI GPT-4o via Emergent LLM Key

## Implemented Features (Complete)
1. Intelligent Onboarding (multi-step anamnesis)
2. Personalized Supplement Plan (LLM-powered 8-week plan)
3. Health Tracking System (symptoms + compliance)
4. Admin Panel (products, recipes, supplements, UI text, videos)
5. Video Library (contextual YouTube videos)
6. Product Label Analysis (AI ingredient extraction)
7. Enhanced Symptom Analysis (personalized, in-depth)
8. Health Score Dashboard (0-100 score with trend)
9. Searchable Recipe Catalog (filterable)
10. Admin Health Statistics
11. Supplement Interaction Analysis (synergies, risks, over-dosages)
12. Symptom Correlation Analysis (supplement intake vs symptom improvement)
13. Persistent Analysis Results
14. Admin AI Recipe Generation
15. Evidence-Based Recommendations (scientific evidence levels)
16. Personalized Recommendation Reasons
17. Monetization CTAs (affiliate products)
18. Symptom Severity Tracking (1-10 scale)
19. Full Italian Translation (P0) - Completed March 2026
20. IT Product Linking Fix - Completed March 2026
21. Shopify Shop Import (AI-powered) - Completed March 2026
22. Auto-Sync Scheduler - Completed March 2026
23. Intelligent Product Ranking (Top 3) - Completed March 2026
24. Email Health Report Export - Completed March 2026
25. **Automatic Language Detection** - Completed March 2026

## Automatic Language Detection (March 2026)
- Detects browser/device language on first app start
- Italian browser → IT, otherwise → DE (fallback)
- Manual DE/IT toggle buttons remain available
- Once manually switched, choice is saved and persists across sessions
- File: `frontend/src/LangContext.tsx`

## Email Export Feature (March 2026)
### Architecture
- **Backend**: `POST /api/export/email` endpoint
- **PDF Generation**: reportlab library
- **SMTP**: Python smtplib via kasserver.com
- **Frontend**: EmailExportModal component in supplement plan screen

### Email Content
- HTML email body with: Health Score, Health Profile, Complaints, Deficiencies, Supplement Plan (table + details), Phases, Warnings, Disclaimer
- PDF attachment with same content, formatted for print
- Bilingual (DE/IT) support

## Auto-Sync Feature (March 2026)
### Shops
- DE: https://joachim-kaeser.de (weekly sync)
- IT: https://joachimkaeser.it (monthly sync)

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health data as CSV
- Push notifications for supplement plan
