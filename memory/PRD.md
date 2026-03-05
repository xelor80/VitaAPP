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

## Implemented Features (Complete) - 48 Features
1-44: [See previous PRD versions for full history]
45. **TTS fuer Symptom-Analyse** (2026-03-05) - TTSButton in OverviewTab Sektion 1
46. **Klickbare Supplement-Icons** (2026-03-05) - Tagesplan + Uebersicht → Affiliate-Shop
47. **Arbeitstyp im Onboarding** (2026-03-05):
    - 6 Arbeitstypen mit Icons: Buero, Homeoffice, Koerperliche Arbeit, Aussendienst, Schichtarbeit, Nachtarbeit
    - Bedingte Schichtdetails: Schichtmodell (2-Schicht, 3-Schicht, Vollkonti) + Aktuelle Schicht (Frueh/Spaet/Nacht)
    - Info-Banner fuer Schichtarbeiter erklaert Auswirkungen auf Supplement-Plan
    - KI-Risikobewertung: Neue Gewichtungen fuer Schicht-/Nacht-/koerperliche Arbeit
    - Priority Areas: "Schichtarbeit-Ausgleich" (Schicht/Nacht), "Koerperliche Belastung ausgleichen" (Physisch)
    - Risikofaktoren: Vitamin D, Magnesium, B-Vitamine, Melatonin-Vorlaeufer, Cortisol-Regulation
48. **Schichtplan-Konfigurator** (2026-03-05):
    - 3 Schicht-Vorlagen in Erinnerungs-Einstellungen (Frueh/Spaet/Nacht)
    - Automatische Zeitanpassung: Morgens/Mittags/Abends je nach Schicht
    - Fruehschicht: 05:00 / 11:30 / 20:00
    - Spaetschicht: 09:30 / 15:30 / 23:00
    - Nachtschicht: 14:30 / 20:00 / 03:00
    - Nur sichtbar fuer Schicht-/Nachtarbeiter

## Key API Endpoints
- `POST /api/tts/generate` - TTS audio generation (OpenAI)
- `GET /api/onboarding/options?lang=de` - Onboarding options (incl. work_types, shift_models, shift_types)
- `POST /api/health-profile` - Create profile (incl. work_type, shift_model, current_shift)
- `GET /api/recipes/personalized/{profile_id}` - Personalized recipe scoring
- `GET /api/supplement-plan/{profile_id}` - Supplement plan data

## Backlog
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
