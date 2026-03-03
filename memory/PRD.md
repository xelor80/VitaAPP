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
27. Practical Dosage Forms in Tagesplan
28. Real Product Names in Tagesplan
29. **Recipe Catalog Redesign** - Completed March 2026

## Recipe Catalog Redesign (March 2026)
- 2-column photo grid (like Pinterest/food app style)
- Each card: food photo, difficulty badge, cooking time badge, title, ingredient count
- Difficulty derived from time_min: ≤10 Einfach, ≤25 Medium, >25 Aufwändig
- Dynamic card width using useWindowDimensions (mobile-friendly)
- "Für dich empfohlen" section (personalized recommendations)
- "Alle Rezepte" section with total count
- Recipe detail page: hero image + API loading by recipe ID
- Fully bilingual (DE/IT)

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health data as CSV
- Push notifications for supplement plan
