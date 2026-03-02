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
16. **Supplement Interaction Analysis** (Mar 2026) - LLM-powered stack optimizer with traffic-light warning system

## Supplement Interaction Analysis
New "Analyse" tab in the Supplement Plan page that:
- **Detects**: Double dosages, overdose risks, mutual inhibitions, synergies
- **Warning System**: Red (risk), Yellow (caution), Green (synergy) color-coded cards
- **Optimizations**: Timing changes, dosage adjustments, supplement replacements
- **Score**: Overall stack health score (0-100)
- **Caching**: Results cached in MongoDB for instant reload
- **Endpoints**: POST `/api/supplement-plan/{id}/analyze-interactions`, GET `/api/supplement-plan/{id}/interactions`

## Medical Report Structure
The analysis results are now displayed as a structured medical report:
1. **Zusammenfassung** - Summary with priority badge (hoch/mittel/niedrig)
2. **Wahrscheinliche Ursachen** - Deficiency cards with evidence level, mechanism, natural sources, cautions
3. **Empfohlene Strategie** - Supplement schedule + product cards with dosage, timing, affiliate links
4. **Erwarteter Zeitraum bis Wirkung** - Short-term (1-2 weeks) and medium-term (4-8 weeks) timeline
5. **Sicherheitshinweise** - Red flags and legal disclaimer

## Key Files
- `backend/routes/supplement_interactions.py` - Interaction analysis endpoint + LLM prompts
- `frontend/components/supplement/InteractionAnalysis.tsx` - Analyse tab UI component
- `frontend/app/supplement-plan.tsx` - 4-tab supplement plan page
- `frontend/components/home/homeStyles.ts` - Compact button/card styles
- `frontend/components/home/HealthScoreCard.tsx` - Smaller circle chart

## Backlog (P1)
- Symptom Severity Tracking (user rates symptoms 1-10, trend visualization)
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health stats as CSV
- Push notifications for supplement plan
