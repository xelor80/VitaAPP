# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key (emergentintegrations)
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)

## Implemented Features (Complete)
1. Intelligent Onboarding (multi-step anamnesis)
2. Personalized 8-week Supplement Plan (LLM-powered)
3. Health Tracking System (symptoms + supplement compliance)
4. Admin Panel (products, recipes, supplements, UI text, videos)
5. Video Library (contextual YouTube videos)
6. Product Label Analysis (AI ingredient extraction)
7. Enhanced Symptom Analysis (professional, personalized)
8. Health Score Dashboard (0-100 with trend chart)
9. Searchable Recipe Catalog (filterable, responsive grid)
10. Admin Health Statistics (aggregated, anonymized)
11. Supplement Interaction Analysis (synergies, risks, over-dosages)
12. Symptom Correlation Analysis (supplement intake vs symptom improvement)
13. Persistent Analysis Results (save/view last analysis)
14. Admin AI Recipe Generation (generate, activate/deactivate)
15. Evidence-Based Recommendations (scientific evidence levels)
16. Personalized Recommendation Reasons (why a supplement was recommended)
17. Monetization CTAs (affiliate product guidance on nutrient risk page)
18. Symptom Severity Tracking (1-10 scale)
19. Shopify Product Automation (import, AI enrichment, sync)
20. Intelligent Product Filtering (top 3 per nutrient)
21. Email Health Report (HTML body + PDF attachment)
22. Automatic Language Detection (browser/device-based, manual override)
23. Android Navigation Bar Fix (bottom padding)
24. Product-Driven Daily Plan (real product names, practical dosage)
25. Redesigned Recipe Section (two-column image grid)
26. Licensed Recipe Images (Unsplash, commercially safe)
27. TTS Audio Playback (OpenAI TTS - read aloud personal summary, DE/IT)
28. **Daily Tasks "Heute fuer dich wichtig"** (dynamic coach section on home screen)

## Key API Endpoints
- `GET /api/daily-tasks/{profile_id}` - Get up to 3 prioritized daily tasks
- `POST /api/tts/generate` - Generate TTS audio (text + lang -> base64 MP3)
- `POST /api/export/email` - Email health report
- `GET /api/supplement-plan/{id}` - Get enriched supplement plan
- `GET /api/health-score/{profile_id}` - Get health score with AI assessment
- `POST /api/admin/auth` - Admin authentication

## Key Files
- `/app/backend/routes/daily_tasks.py` - Daily tasks logic (supplements, symptoms, risks, goals)
- `/app/backend/routes/tts.py` - TTS endpoint
- `/app/frontend/components/home/DailyTasks.tsx` - Daily tasks UI component
- `/app/frontend/app/index.tsx` - Home screen with DailyTasks integration
- `/app/frontend/app/supplement-plan.tsx` - Plan screen with TTS button

## Key Credentials
- Admin Password: stored in `ADMIN_PASSWORD` env var in backend/.env
- SMTP: kasserver.com credentials in backend/.env
- LLM/TTS: Emergent LLM Key in backend/.env

## Deployment Fix (March 2026)
- Deleted conflicting `package-lock.json` (project uses yarn)
- Moved hardcoded admin password to environment variable

## Backlog
- No pending feature requests
- Consider migrating from expo-av to expo-audio (expo-av deprecated in SDK 54)
- TTS on symptom analysis page (future enhancement)
