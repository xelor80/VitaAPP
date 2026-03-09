# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo SDK 54) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Atlas in production)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key (expo-audio)
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)
- **Admin Panel**: Static HTML/JS/CSS served at /api/admin-app

## Implemented Features (Complete)
1-53: All features through supplement compliance sync (see previous sessions)
54. **Admin: Nutzerstatistiken-Dashboard** (2026-03-07)
55. **Admin: Shopify-Sync-Status & Historie** (2026-03-07)
56. **Admin: Taegliches Sync-Intervall** (2026-03-07)
57. **VIO Guide-Maskottchen-System** (2026-03-09):
    - 5-Schritt-Onboarding-Tour mit VIO-Avatar
    - Schwebendes VIO-Bubble (unten rechts) auf allen Screens
    - Kontextsensitives Guide-Panel als Bottom Sheet
    - VIO-Baerchen-Bild integriert (assets/images/vio-mascot.png)
    - Panel-Header: VIO-Avatar + "Dein Gesundheitsbegleiter"
    - Quick Actions, Naechster-Schritt, Ausblenden-Option
    - 4 Zustaende: idle, highlight, explaining, success
    - Vollstaendig zweisprachig (DE/IT)
    - State via GuideContext + AsyncStorage

## Key Files (Guide System)
- `frontend/components/GuideMascot.tsx` - Hauptkomponente mit VIO-Bild
- `frontend/src/GuideContext.tsx` - State Management
- `frontend/src/guideData.ts` - Zweisprachige Texte
- `frontend/assets/images/vio-mascot.png` - VIO-Maskottchen-Bild
- `frontend/app/_layout.tsx` - Integration mit GuideProvider

## Backlog
- Verschiedene VIO-Posen fuer unterschiedliche Zustaende
- Personalisierte VIO-Tipps basierend auf Nutzerdaten
- Guide-Texte ueber Admin-Panel verwaltbar
- Erweiterte Gamification (Achievements, Wochenziele)
- Rezept-Erweiterungen (Einkaufsliste, Essensplan)
