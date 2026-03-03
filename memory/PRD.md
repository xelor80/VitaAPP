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
19. **Full Italian Translation (P0)** - Completed March 2026
20. **IT Product Linking Fix** - Completed March 2026

## Translation (i18n) Status
### Frontend
- Handled via `frontend/src/lib/i18n.ts` - complete

### Backend (Completed March 2026)
Files translated:
- `core/supplement_engine.py`: SUPPLEMENT_DB med_interactions now bilingual dicts
- `routes/health_score.py`: AI assessment prompt bilingual, fallback labels bilingual
- `routes/label_analysis.py`: Separate DE/IT system prompts, bilingual error messages
- `routes/products.py`: NUTRIENT_QUALITY_INFO bilingual, NUTRIENT_TAG_MAP expanded for IT tags
- `routes/supplement_interactions.py`: Stack description, profile context bilingual
- `routes/supplement_plan.py`: LLM user message bilingual
- `routes/correlation_analysis.py`: SUPPLEMENT_NAMES_DE/IT separate dicts
- `routes/analysis.py`: Fallback text and rate limit error bilingual
- `core/config.py`: get_products_collection() with IT->DE fallback
- `data/prompts.py`: Uses get_products_collection() for correct language products

## Product Linking Fix (March 2026)
- **Root cause**: NUTRIENT_TAG_MAP only had German tags (e.g., "eisen", "zink"), but IT products used Italian tags (e.g., "stanchezza", "muscoli", "cuore")
- **Fix**: Extended NUTRIENT_TAG_MAP with both DE and IT tags for cross-language matching
- **Fallback**: get_products_collection() in core/config.py falls back to DE products if IT collection is empty

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health data as CSV
- Push notifications for supplement plan
