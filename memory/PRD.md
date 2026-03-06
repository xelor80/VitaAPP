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

## Implemented Features (Complete) - 50 Features
1-46: [See previous PRD versions for full history]
47. **Arbeitstyp im Onboarding** (2026-03-05): 6 Arbeitstypen, KI-Risikobewertung
48. **Schichtplan-Konfigurator + Zyklus-Rotator** (2026-03-05): VK 4x4, 3-Schicht, FFSSNN-- Vorlagen
49. **Sicherheitshaertung** (2026-03-06):
    - Rate-Limiting Middleware (IP-basiert, 3 Tiers: 5/min KI, 20/min Schreib, 60/min Lese)
    - CORS auf eigene Domains beschraenkt (nicht mehr allow_origins=*)
    - Admin-Token-Ablauf nach 24h (statt ewig gueltig)
    - API-Keys korrekt in .env, nicht im Code
50. **Performance-Optimierung** (2026-03-06):
    - GZip-Komprimierung fuer Responses > 500 Bytes
    - MongoDB-Indizes: profile_id (unique/sparse), symptom_tracking compound, recipes, products
    - In-Memory-Cache-Decorator fuer statische Endpunkte (5-min TTL)

## Security Summary
- Rate limits: Expensive AI (5/min), Write (20/min), Read (60/min)
- CORS: Only own domains + localhost
- Admin tokens: 24h TTL, auto-cleanup
- Credentials: All in .env, never in code
- MongoDB: Indexes with sparse unique constraints

## Backlog
- `expo-av` zu `expo-audio` Migration (P2)
- Weitere UI/UX Verbesserungen nach Feedback
