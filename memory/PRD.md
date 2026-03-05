# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo SDK 54) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Atlas in production)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)

## Implemented Features (Complete) - 46 Features
1-39: [See CHANGELOG.md for full history]
40. **Gesundheitsprofil Redesign** - 2x2 card grid
41. **Supplement-Plan Redesign** - Teal gradient header, Tagesplan
42. **Erinnerungseinstellungen** - Push notification settings
43. **Mein Fortschritt Ueberarbeitung** - 8-Wochen-Fortschritt, taegliche Sperre
44. **Personalisierte Rezept-Sortierung** (BUG FIXED 2026-03-05)
45. **TTS fuer Symptom-Analyse** (2026-03-05) - TTSButton in OverviewTab
46. **Klickbare Supplement-Icons** (2026-03-05):
    - Tagesplan Pill-Icons navigieren per Klick zum Produktvergleich/Affiliate-Shop
    - Supplement Uebersicht Karten navigieren per Klick zum Produktvergleich/Affiliate-Shop
    - Nutzt bestehende /product-comparison Route mit nutrient und risk params

## Key API Endpoints
- `POST /api/tts/generate` - TTS audio generation (OpenAI)
- `GET /api/recipes/personalized/{profile_id}` - Personalized recipe scoring
- `GET /api/recipes?lang=de` - All recipes
- `GET /api/products?lang=de` - Products for affiliate shop
- `GET /api/products/pricing-summary` - Pricing info per supplement
- `GET /api/supplement-plan/{profile_id}` - Supplement plan data
- `GET /api/health-profile/{profile_id}` - Profile + assessment

## Backlog
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
