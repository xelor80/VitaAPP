# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)

## Implemented Features (Complete) - 33 Features
1-26: [See previous PRD versions - onboarding through licensed recipe images]
27. TTS Audio Playback (OpenAI TTS - read aloud personal summary, DE/IT)
28. Daily Tasks "Heute fuer dich wichtig" (dynamic coach section)
29. Interactive Task Completion (check off supplements + quick symptom rating from home)
30. Achievement System (streaks, milestones, progress tracking, micro-animations)
31. Optimized Affiliate CTAs (advisory tone, dynamic nutrient-specific CTAs, transparent disclaimers)
32. Data-Driven Personalized Summary (no generic greetings, top 2 health drivers, strategic tone)
33. **Trust Elements & Social Proof** (star ratings, review counts, Laborgeprüft badge, analysis counter)

## Trust Elements Details
- Star rating parsed from product data (format: 'X.XX/5 (N)')
- "Laborgeprüft" badge for products with label_analysis data
- "Ueber X Gesundheitsanalysen durchgefuehrt" banner on home screen
- Dynamic counter from /api/stats/trust endpoint

## Key API Endpoints (New)
- `GET /api/stats/trust` - Trust statistics (total actions, display count)
- `GET /api/achievements/{profile_id}` - Streaks, milestones
- `GET /api/daily-tasks/{profile_id}` - Prioritized daily tasks
- `POST /api/tts/generate` - TTS audio generation

## Key Files (This Session)
- `/app/backend/routes/trust_stats.py` - Trust stats endpoint
- `/app/backend/routes/achievements.py` - Achievement engine
- `/app/backend/routes/daily_tasks.py` - Daily tasks + quick-complete
- `/app/backend/routes/tts.py` - TTS endpoint
- `/app/frontend/components/home/TrustBanner.tsx` - Trust counter on home
- `/app/frontend/components/home/Achievements.tsx` - Streak + badges UI
- `/app/frontend/components/home/DailyTasks.tsx` - Interactive daily tasks
- `/app/frontend/app/product-comparison.tsx` - Trust elements in product cards

## Backlog
- No pending feature requests
- Consider migrating expo-av to expo-audio (SDK 54)
- TTS on symptom analysis page
- Populate 'servings' field for price/day calculation
