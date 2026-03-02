# VitaGuide PRD - Product Requirements Document

## Original Problem Statement
Health-focused, bilingual (German/Italian) mobile app. LLM analyzes user symptoms to provide nutrition tips, supplement info, and affiliate links.

## Core Features (All Implemented)
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
13. Personalized recipe recommendations (in catalog page)
14. **Medical report format for analysis results** (NEW)

## Medical Report Structure
The analysis results are now displayed as a structured medical report:
1. **Zusammenfassung** - Summary with priority badge (hoch/mittel/niedrig)
2. **Wahrscheinliche Ursachen** - Deficiency cards with evidence level, mechanism, natural sources, cautions
3. **Empfohlene Strategie** - Supplement schedule + product cards with dosage, timing, affiliate links
4. **Erwarteter Zeitraum bis Wirkung** - Short-term (1-2 weeks) and medium-term (4-8 weeks) timeline
5. **Sicherheitshinweise** - Red flags and legal disclaimer

## Key Files Modified
- `backend/data/prompts.py` - Added `priority_level` to LLM prompt
- `backend/routes/analysis.py` - Added `priority_level` to response
- `frontend/components/tabs/OverviewTab.tsx` - Complete rewrite as medical report
- `frontend/app/results.tsx` - Tab renamed to "Bericht", removed duplicate disclaimer/red flag banner

## Backlog
- Recipe favorites/bookmarks
- Weekly meal plan generator
- Export health stats as CSV
- Push notifications for supplement plan
