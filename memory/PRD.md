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

## Implemented Features (Complete) - 39 Features
1-36: [See previous versions - onboarding through swipe-back]
37. Preis-Transparenz unter CTA
38. Servings Backfill System
39. Preis-Alert System

## Bug Fixes (This Session)
- **Product Language Mixing Fix**: NUTRIENT_TAG_MAP split into language-specific primary/secondary tags. DE view no longer shows IT products. Deduplication added.

## Key API Endpoints
- `GET /api/price-alerts/{profile_id}?lang=de` - Personalized price drop alerts
- `GET /api/products/by-nutrient/{nutrient}?lang=de` - FIXED: language-specific tag matching
- `GET /api/products/pricing-summary?nutrients=...&lang=de` - Price per day
- `POST /api/admin/backfill-servings?lang=de` - AI backfill for servings

## Backlog
- TTS auf Symptom-Analyse-Seite erweitern
- `expo-av` zu `expo-audio` Migration (SDK 54)
