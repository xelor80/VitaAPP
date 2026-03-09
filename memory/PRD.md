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
57. **Guide-Maskottchen-System** (2026-03-09):
    - 5-Schritt-Onboarding-Tour fuer neue Nutzer (Welcome, Health Score, Supplement-Plan, Tracking, Erinnerungen)
    - Schwebendes Mascot-Bubble (unten rechts) auf allen Screens
    - Kontextsensitives Guide-Panel als Bottom Sheet mit:
      - Screen-spezifische Begruessung
      - Quick Actions (Haeufige Fragen)
      - Naechster-Schritt-Empfehlung
      - Guide ausblenden/spaeter Optionen
    - 4 Maskottchen-Zustaende: idle, highlight, explaining, success
    - Vollstaendig zweisprachig (DE/IT)
    - State-Management via GuideContext + AsyncStorage
    - Modulare Textpflege ueber guideData.ts
    - Keine bestehende Funktion veraendert oder ersetzt

## Key Files (Guide System)
- `frontend/components/GuideMascot.tsx` - Hauptkomponente (Bubble, Panel, Tour)
- `frontend/src/GuideContext.tsx` - State Management (Onboarding-Status, Sichtbarkeit, gesehene Tipps)
- `frontend/src/guideData.ts` - Zentrale zweisprachige Texte fuer alle Screens
- `frontend/app/_layout.tsx` - Integration mit GuideProvider und GuideOverlay

## Key API Endpoints
- `GET /api/admin/user-stats` - Detaillierte Nutzerstatistiken
- `GET /api/admin/sync-history` - Sync-Verlauf
- `POST /api/admin/sync-config` - Akzeptiert 'daily', 'weekly', 'monthly'
- `GET /api/tracking/compliance/today/{profile_id}` - Heutiger Einnahme-Status
- `POST /api/daily-tasks/complete-supplements` - Einnahme speichern

## Backlog
- Personalisierte Guide-Tipps basierend auf echten Nutzerdaten (hohes Risiko, offene Einnahmen)
- Guide-Texte ueber Admin-Panel verwaltbar machen
- Weitere UI/UX Verbesserungen nach Feedback
- Erweiterte Gamification (Achievements, Wochenziele)
- Rezept-Erweiterungen (Einkaufsliste, Essensplan-Generator)
