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

## Admin Recipe Management (Mar 2026)
- **KI Rezepte generieren**: GPT-4o generates bilingual recipes by category with optional focus
- **Aktiv/Inaktiv Toggle**: Admin can enable/disable recipes per toggle button
- **Kategorie & Status Filter**: Dropdown filters in the recipe table
- **Mobile Filter**: Mobile app only shows active recipes (`active != false`)
- Endpoints: `POST /api/admin/recipes/generate`, `PATCH /api/admin/recipes/{id}/toggle`, `GET /api/admin/recipes/categories`

## Evidenz-Level System (Mar 2026)
- Color-coded evidence badges on each supplement: Green (Hohe Evidenz), Yellow (Mittlere Evidenz), Orange (Explorativ)
- Expanded detail card with understandable explanation (no study citations)

## Recommendation Reasons (Mar 2026)
- "Empfohlen aufgrund von:" section with up to 4 personalized reasons per supplement
- Deterministic mapping (SUPPLEMENT_TRIGGERS) from profile data: complaints, stress, sleep, diet, age, deficiencies
- No LLM needed - computed from user health data instantly
- Data comes from `evidence_level` field in supplement_engine.py SUPPLEMENT_DB
- Shows: Overall trend, symptom bars, compliance bars, KI-Erkenntnisse, recommendations
- Endpoint: GET `/api/tracking/correlation-analysis/{profile_id}?days=30&lang=de`

## Persistent Analysis Feature & Bug Fix (Mar 2026)
- Analysis results saved to in-memory store + AsyncStorage
- Home screen shows conditional buttons: "Letzte Analyse anzeigen" / "Neue Analyse starten" when analysis exists
- **Bug Fix (P0)**: `useFocusEffect` from `@react-navigation/native` crashed app on web. Replaced with synchronous state init from in-memory store (`getCurrentAnalysis() !== null`)
- `SavedAnalysisButtons` simplified to pure presentational component (no internal state)
- `clearCurrentAnalysis()` added to store.ts for proper cleanup
- **UX Improvement**: "Neue Analyse starten" now directly starts analysis with current symptoms (validates first, shows loading spinner "Analysiere...", auto-navigates to results). Uses `setHasSaved(false) + setTimeout(analyzeSymptoms, 50)` pattern.

## Key Files
- `backend/routes/supplement_interactions.py` - Interaction analysis endpoint
- `backend/routes/correlation_analysis.py` - Correlation analysis endpoint
- `frontend/components/supplement/InteractionAnalysis.tsx` - Supplement analyse tab
- `frontend/components/tracking/CorrelationAnalysis.tsx` - Tracking analyse tab
- `frontend/components/home/SavedAnalysisButtons.tsx` - Pure presentational buttons component
- `frontend/src/store.ts` - In-memory + AsyncStorage persistence for analysis results
- `frontend/app/supplement-plan.tsx` - 4-tab supplement plan page
- `frontend/app/tracking.tsx` - 3-tab tracking page
- `frontend/app/results.tsx` - Loads saved analysis from store

## Supplement Plan Restructured to Medical Report (Mar 2026)
- Stack tab: accordion/flowing-text replaced with flat, structured medical report cards
- Each card: counter (X/10), name, status badge (HOCH red/MITTEL orange), WIRKUNG, WARUM EMPFOHLEN (personalized reasons), 2x2 data grid (Dosierung/Einnahme/Evidenz/Wirkung ab), synergies, warnings
- Dual CTAs per card: "Empfohlenes Produkt anzeigen" (primary) + "Qualitaetsgepruefte Optionen vergleichen" (secondary)
- Cards are flat/non-collapsible - all info visible at once

## Nutrient Risk CTAs & Product Comparison (Mar 2026)
- Enhanced deficiency cards in health profile with dual CTAs for HIGH/MEDIUM risk nutrients
- Primary CTA: "Optimierungsplan anzeigen" → navigates to supplement plan
- Secondary CTA: "Empfohlene Produkte ansehen" → navigates to product comparison page
- Visual: HIGH = red accent (#EF4444), MEDIUM = orange accent (#F59E0B)
- New product comparison page: risk banner, quality info (dose/form/tip), product cards with price/rating/affiliate links
- New backend endpoint: `GET /api/products/by-nutrient/{nutrient}` with nutrient-to-tag mapping and quality info

## Recipe Catalog UX Improvement (Mar 2026)
- Initially hide all recipe cards, show only filter options + "Für dich empfohlen"
- "Kategorie oder Tag wählen" prompt when no filter active
- Recommendations hidden when filter active
- Header shows "Gesunde Rezepte entdecken" → "[N] Rezepte" when filter applied
- Reset via "Alle" button or filter-reset icon

## P1: Symptom Severity Tracking (Mar 2026)
- Redesigned SymptomTracker with visual severity bars (1-10 scale)
- Color-coded: 1-3 green (Gut), 4-6 yellow (Maessig), 7-10 red (Stark)
- 7 categories: Energie, Schlafqualitaet, Stimmung, Konzentration, Verdauung, Schmerzen (NEW), Stress (NEW)
- ALLGEMEINBEFINDEN overall severity section
- Per-symptom mini sparkline charts when history data exists
- Saves all ratings to backend, dashboard refreshes after save

## Backlog (P1)
- Symptom Severity Tracking (1-10 scale with visualization)
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health stats as CSV
- Push notifications for supplement plan
