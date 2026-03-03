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
21. **Shopify Shop Import (AI-powered)** - Completed March 2026

## Shopify Shop Import Feature (March 2026)
### Architecture
- **Backend**: `routes/shop_import.py` - Background job with status polling
- **Admin UI**: New "Shop Import" tab in admin panel
- **AI Processing**: GPT-4o extracts ingredients, dosage, intake recommendations, health tags

### Flow
1. Admin enters Shopify shop URL + selects language (DE/IT)
2. "Vorschau" shows all products from shop
3. "Importieren" starts background AI processing
4. Each product's body_html is analyzed by GPT-4o
5. Non-supplements (workbooks, sets) are auto-skipped
6. Products are upserted into products_de/products_it collections
7. Real-time progress polling shows status

### Endpoints
- `POST /api/admin/shop-import` - Start background import job
- `GET /api/admin/shop-import/status/{job_id}` - Poll job progress
- `POST /api/admin/shop-import/preview` - Preview without importing

### Shops
- DE: https://joachim-kaeser.de
- IT: https://joachimkaeser.it

## Translation (i18n) Status - Complete
### Backend files translated:
- `core/supplement_engine.py`: med_interactions bilingual
- `routes/health_score.py`: AI assessment bilingual
- `routes/label_analysis.py`: Separate DE/IT system prompts
- `routes/products.py`: NUTRIENT_QUALITY_INFO + NUTRIENT_TAG_MAP bilingual
- `routes/supplement_interactions.py`: Stack description bilingual
- `routes/supplement_plan.py`: LLM user message bilingual
- `routes/correlation_analysis.py`: SUPPLEMENT_NAMES_DE/IT
- `routes/analysis.py`: Fallback text bilingual
- `core/config.py`: get_products_collection() with IT->DE fallback
- `data/prompts.py`: Uses get_products_collection()

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health data as CSV
- Push notifications for supplement plan
