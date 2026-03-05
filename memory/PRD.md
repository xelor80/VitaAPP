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

## Implemented Features (Complete) - 49 Features
1-44: [See previous PRD versions for full history]
45. **TTS fuer Symptom-Analyse** (2026-03-05) - TTSButton in OverviewTab
46. **Klickbare Supplement-Icons** (2026-03-05) - Tagesplan + Uebersicht → Affiliate-Shop
47. **Arbeitstyp im Onboarding** (2026-03-05):
    - 6 Arbeitstypen, bedingte Schichtdetails, KI-Risikobewertung
    - Priority Areas: Schichtarbeit-Ausgleich, Koerperliche Belastung
48. **Schicht-Vorlagen** (2026-03-05):
    - 3 Presets (Frueh/Spaet/Nacht) in Erinnerungen, nur fuer Schichtarbeiter
49. **Schichtzyklus-Rotator** (2026-03-05):
    - Vorlagen: VK 4x4, 3-Schicht, FFSSNN--, 2-Schicht
    - Visueller Zyklus-Editor: Farbige Quadrate (F=orange, S=blau, N=lila, -=grau)
    - Tag antippen zum Aendern (F→S→N→-→F)
    - Startdatum waehlbar
    - "Heute: Nachtschicht (Tag 5)" Anzeige
    - Gruener Rand markiert aktuellen Tag
    - Automatische Zeitanpassung basierend auf aktuellem Schichttag
    - Backend: GET /api/supplement-plan/{id}/today-shift berechnet aktuelle Schicht
    - Nur sichtbar fuer Schicht-/Nachtarbeiter

## Key API Endpoints
- `POST /api/tts/generate` - TTS audio generation
- `GET /api/onboarding/options?lang=de` - Options incl. work_types, shift_models, shift_types
- `POST /api/health-profile` - Create profile incl. work_type, shift_model, current_shift
- `PUT /api/supplement-plan/{id}/reminders` - Update reminders with shift_cycle
- `GET /api/supplement-plan/{id}/today-shift` - Calculate today's shift from cycle
- `GET /api/recipes/personalized/{id}` - Personalized recipe scoring

## Backlog
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
