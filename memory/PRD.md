# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile app. Core functionality: LLM analyzes user-inputted symptoms to provide nutrition tips, supplement info, and affiliate links.

## Core Features
1. Symptom analysis with AI (GPT-4.1 via Emergent LLM Key)
2. Bilingual UI (DE/IT)
3. Affiliate product recommendations with click tracking
4. Admin panel for full content management
5. Intelligent onboarding (anamnesis) with health profile
6. Personalized 8-week supplement plan
7. Health tracking (symptoms + compliance)
8. YouTube video integration
9. Product label analysis (Image + PDF) with AI vision
10. Health Score Dashboard with 8-week trend chart
11. **Searchable/filterable recipe catalog** (NEW)
12. **Admin health statistics dashboard** (NEW)

## Tech Stack
- **Frontend:** React Native (Expo) for web
- **Backend:** FastAPI + MongoDB
- **AI:** GPT-4.1 via emergentintegrations (Emergent LLM Key)
- **PDF Processing:** PyMuPDF
- **Image Processing:** Pillow

## Key API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/api/analyze` | POST | Symptom analysis |
| `/api/recipes` | GET | Recipes (with search, category, time filters) |
| `/api/recipes/filters` | GET | Available filter options for recipe catalog |
| `/api/health-score` | GET | AI-calculated health score |
| `/api/health-score/history` | GET | 8-week score history |
| `/api/health-profile` | GET/POST | User health profile |
| `/api/supplement-plan` | GET/POST | Supplement plan |
| `/api/admin/health-stats` | GET | Aggregated health statistics |
| `/api/admin/stats` | GET | Admin dashboard stats |
| `/api/products/{id}/label` | POST | Product label analysis |
| `/api/admin-app` | GET | Admin panel webapp |

## DB Collections
- `products_de`, `products_it`, `recipes`, `analyses`, `clicks`
- `health_profiles`, `health_score_history`
- `symptom_tracking`, `compliance_tracking`, `diary_entries`
- `supplement_plans`, `videos`, `settings`

## Architecture
```
backend/
  routes/
    admin.py              # Product/recipe CRUD, stats, clicks (288 lines)
    admin_health_stats.py # Health statistics aggregation (130 lines)
    analysis.py           # Symptom analysis
    health_profile.py     # Onboarding/health profile
    health_score.py       # Health score calculation
    label_analysis.py     # Product label AI analysis
    products.py           # Public recipe/product endpoints
    supplement_plan.py    # Supplement plan
    tracking.py           # Health tracking
    videos.py             # Video management
    settings.py           # App settings
  admin_webapp/           # Admin panel (HTML/JS/CSS)
  models/schemas.py
  core/config.py, analysis_engine_v2.py

frontend/
  app/
    index.tsx             # Home screen
    recipes-catalog.tsx   # Recipe catalog with search/filter (NEW)
    results.tsx           # Analysis results
    _layout.tsx           # Navigation
  components/
    home/
      RecipeCatalogButton.tsx  # (NEW)
      HealthScoreCard.tsx
      ScoreHistoryChart.tsx
    tabs/, tracking/, onboarding/
  src/services/, src/i18n.ts
```

## What's Implemented (as of 2026-03-02)
- All 12 core features listed above
- P0: Product label analysis (fixed, enhanced with PDF + GPT-4.1 vision)
- P1: Searchable/filterable recipe catalog with search, category, tag, time filters
- P2: Admin health statistics dashboard with 15+ aggregated metrics
- Refactoring: health stats extracted to own route, unused imports removed

## Backlog (Remaining)
- No known pending issues or bugs
- Potential: More chart types in admin dashboard
- Potential: Export health stats data as CSV
- Potential: Recipe favorites/bookmarks
- Potential: Push notification reminders for supplement plan
