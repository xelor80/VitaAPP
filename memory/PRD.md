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
22. **Auto-Sync Scheduler** - Completed March 2026

## Auto-Sync Feature (March 2026)
### Architecture
- **Config stored in**: MongoDB `sync_config` collection (per language)
- **Scheduler**: Background asyncio loop, checks every hour
- **Admin UI**: Two config cards (DE/IT) with toggle, interval, URL, manual trigger

### Sync Behavior
- **New products**: AI-analyzed and added
- **Existing products**: Price, image, availability updated (no re-AI)
- **Deleted products**: Removed from DB if no longer in Shopify shop
- **Non-supplements**: Auto-skipped (workbooks, sets, clothing)

### Endpoints
- `GET /api/admin/sync-config` - Get all sync configurations
- `POST /api/admin/sync-config` - Save/update sync config per language
- `POST /api/admin/sync-now/{lang}` - Manually trigger sync
- `POST /api/admin/shop-import` - Start manual import (full AI)
- `GET /api/admin/shop-import/status/{job_id}` - Poll job progress
- `POST /api/admin/shop-import/preview` - Preview without importing

### Config per language
- `shop_url`: Shopify store URL
- `interval`: "weekly" or "monthly"
- `enabled`: toggle on/off
- `next_sync`: calculated from interval
- `last_sync` / `last_sync_result`: tracking

### Shops
- DE: https://joachim-kaeser.de (weekly sync)
- IT: https://joachimkaeser.it (monthly sync)

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health data as CSV
- Push notifications for supplement plan
