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

## Implemented Features (Complete) - 42 Features
1-39: [See CHANGELOG.md for full history]
40. **Gesundheitsprofil Redesign** - 2x2 card grid (Profile, BMI gauge, Stress slider, Sleep slider)
41. **Supplement-Plan Redesign** - Teal gradient header, Tagesplan with pill icons, Erinnerung card
42. **Erinnerungseinstellungen** - Push notification settings integrated in reminder card:
    - Toggle for push notifications (on/off)
    - Editable time inputs per day slot (Morgens/Mittags/Abends)
    - Test notification button
    - Save button with gradient design
    - Settings accessible via gear icon, closeable via X icon

## Key Files Modified (Latest Session)
- `frontend/app/health-profile.tsx` - 2x2 card grid redesign
- `frontend/components/profile/profileStyles.ts` - Health profile styles
- `frontend/app/supplement-plan.tsx` - Complete supplement plan redesign + reminder settings
- `expo-linear-gradient@15.0.8` added as dependency

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern (P1)
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
