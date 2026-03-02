# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile app. LLM analyzes user symptoms to provide nutrition tips, supplement info, and affiliate links.

## Core Features (All Implemented)
1. Symptom analysis with AI (GPT-4o via Emergent LLM Key)
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
13. Personalized recipe recommendations (in catalog page)
14. Medical report format for analysis results
15. Compact home screen UI (Feb 2026)
16. Supplement Interaction Analysis (Mar 2026) - LLM-powered stack optimizer
17. **Health-Data Correlation Analysis** (Mar 2026) - Supplement intake vs symptom progression

## Supplement Interaction Analysis
"Analyse" tab in Supplement Plan page:
- Detects: Double dosages, overdose risks, mutual inhibitions, synergies
- Warning system: Red/Yellow/Green color-coded cards
- Optimizations: Timing, dosage, replacements
- Endpoints: POST `/api/supplement-plan/{id}/analyze-interactions`, GET `/api/supplement-plan/{id}/interactions`

## Health-Data Correlation Analysis
"Analyse" tab in Tracking/Progress page:
- Compares per-supplement compliance rates with individual symptom trends
- Period selector: 14/30/60 days
- Calculates: % improvement, trend direction, overall score
- LLM-powered personalized insights (e.g. "Seit Beginn der Magnesium-Einnahme hat sich dein Schlaf um 26% verbessert")
- Shows: Overall trend, symptom bars, compliance bars, KI-Erkenntnisse, recommendations
- Endpoint: GET `/api/tracking/correlation-analysis/{profile_id}?days=30&lang=de`

## Key Files
- `backend/routes/supplement_interactions.py` - Interaction analysis endpoint
- `backend/routes/correlation_analysis.py` - Correlation analysis endpoint
- `frontend/components/supplement/InteractionAnalysis.tsx` - Supplement analyse tab
- `frontend/components/tracking/CorrelationAnalysis.tsx` - Tracking analyse tab
- `frontend/components/home/SavedAnalysisButtons.tsx` - Persistent analysis buttons
- `frontend/src/store.ts` - AsyncStorage persistence for analysis results
- `frontend/app/supplement-plan.tsx` - 4-tab supplement plan page
- `frontend/app/tracking.tsx` - 3-tab tracking page
- `frontend/app/results.tsx` - Loads saved analysis from AsyncStorage

## Backlog (P1)
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health stats as CSV
- Push notifications for supplement plan
