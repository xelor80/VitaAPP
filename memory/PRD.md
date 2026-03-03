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

## Implemented Features (Complete) - 32 Features
1-26: [See previous PRD versions]
27. TTS Audio Playback (OpenAI TTS - read aloud personal summary, DE/IT)
28. Daily Tasks "Heute fuer dich wichtig" (dynamic coach section)
29. Interactive Task Completion (check off supplements + quick symptom rating from home)
30. Achievement System (streaks, milestones, progress tracking, micro-animations)
31. Optimized Affiliate CTAs (advisory tone, dynamic nutrient-specific CTAs, transparent disclaimers)
32. **Data-Driven Personalized Summary** (no generic greetings, top 2 health drivers, strategic tone)

## Data-Driven Summary Details
- `_identify_health_drivers()`: Analyzes stress_level, sleep_quality, and complaint keywords
- Priority: Stress > Sleep > Pain > Energy > Digestion > Immune
- LLM prompt: "Beginne NIEMALS mit Begruesssung. Beginne mit den 2 wichtigsten Belastungsfaktoren."
- Fallback also data-driven (uses identified drivers)
- Example output: "Stresslevel 8/10 und Schlafqualitaet 4/10 sind die primaeren Belastungsfaktoren..."

## Backlog
- No pending feature requests
- Consider migrating expo-av to expo-audio (SDK 54)
- TTS on symptom analysis page
- Populate 'servings' field for price/day calculation
