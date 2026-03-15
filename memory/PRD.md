# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB (local)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images)

## What's Been Implemented

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (CRUD + daily plan + check-in)
- Water Tracking with AI-based goal calculation
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog, Progress Dashboard
- VERO Mascot (context-aware guide)
- Admin Panel
- Bilingual support (German/Italian) with in-app switcher

### Completed (2026-03-15) - Product Selection Feature
- **Product Comparison Page**: "Ich nehme dieses Produkt" button on each product card
  - Green border + "Mein Produkt" banner for selected products
  - Toggle: tap again to deselect
- **Daily Plan Integration**: Selected product name replaces generic supplement name
  - e.g., "Factor D" instead of "Vitamin D3"
  - `product_selected` flag and `original_name` preserved in API response
- **Backend Endpoints**:
  - `POST /api/products/select` - Save product selection (upsert)
  - `GET /api/products/selections/{profile_id}` - Get all selections
  - `DELETE /api/products/selections/{profile_id}/{nutrient_id}` - Remove selection
- **DB Collection**: `product_selections` { profile_id, nutrient_id, product_name, product_id, selected_at }
- All 16 backend tests passed (100%) - iteration_70

### Previous Completions
- Combined Reminders (supplements + medications) with item preview per timing slot
- Plan Restructuring: Mein Plan tab as central intake hub
- Dashboard: Symptom-Analyse before Wasseraufnahme, Language Switcher
- P0 Crash Fix (useSwipeBack), Daily plan supplement parsing fix

## Key API Endpoints
- `POST /api/products/select` - Save product selection
- `GET /api/products/selections/{profile_id}` - Get all selections
- `DELETE /api/products/selections/{profile_id}/{nutrient_id}` - Remove selection
- `GET /api/medications/{profile_id}/daily-plan?lang=de` - Combined daily plan (with product names)
- `POST /api/medications/{profile_id}/{medication_id}/check-in` - Toggle medication intake
- `POST /api/medications/{profile_id}/supplement-check-in` - Toggle supplement intake

## Prioritized Backlog
### P2 - Future
- Medication Progress Tracking (integrate into Progress section)
- Historical Data Visualization (water intake graphs)
