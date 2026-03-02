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
11. Searchable/filterable recipe catalog ("Deine Rezepte")
12. Admin health statistics dashboard
13. Personalized recipe recommendations (inside recipe catalog)

## Architecture
```
backend/routes/
  products.py     # Recipes, recommendations, filters
  admin.py        # Product/recipe CRUD, stats
  admin_health_stats.py  # Health statistics
  ...

frontend/app/
  index.tsx              # Home: "Deine Rezepte" button
  recipes-catalog.tsx    # Catalog with inline recommendations
frontend/components/home/
  RecipeCatalogButton.tsx  # "Deine Rezepte" button
  RecipeRecommendations.tsx  # Standalone component (kept for reuse)
```

## What's Implemented (as of 2026-03-02)
- All 13 core features
- Recommendations moved from home screen INTO recipe catalog page
- "Rezeptkatalog" renamed to "Deine Rezepte" everywhere

## Backlog
- Recipe favorites/bookmarks
- Export health stats as CSV
- Push notifications for supplement plan
- Weekly meal plan generator
