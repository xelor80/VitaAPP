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
19. Full Italian Translation
20. IT Product Linking Fix
21. Shopify Shop Import (AI-powered)
22. Auto-Sync Scheduler
23. Intelligent Product Ranking (Top 3)
24. Email Health Report Export
25. Automatic Language Detection
26. Android Bottom Padding Fix
27. **Practical Dosage Forms in Tagesplan** - Completed March 2026

## Practical Dosage Forms (March 2026)
- Each supplement in SUPPLEMENT_DB now has a `form` field: `{type_de, type_it, per_unit, unit}`
- `_build_weekly_schedule()` calculates `form_count` and `form_label` (e.g., "2 Kapseln", "4 Tropfen")
- Frontend shows: "4 Tropfen" as primary, "(4000 IE)" as secondary info
- Redundant displays avoided (B-Komplex: "1 Kapsel" without brackets)
- All 20 existing plans in DB migrated via one-time script
- Dosage forms: Kapsel, Tropfen, Softgel, Tablette (+ Italian equivalents)

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health data as CSV
- Push notifications for supplement plan
