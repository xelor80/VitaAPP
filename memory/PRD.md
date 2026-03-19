# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images)
- **Deploy Note**: Use CUSTOM_MONGO_URL/CUSTOM_DB_NAME env vars to prevent Emergent from overwriting Atlas connection

## What's Been Implemented

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (CRUD + daily plan + check-in)
- Water Tracking with AI-based goal calculation
- VERO Water Reminders
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog with Personalized + All tabs
- Progress Dashboard, Admin Panel, Product Selection

### Database Migration to MongoDB Atlas (2026-03-19) - COMPLETED
- 36 collections, 1688 documents migrated
- CUSTOM_MONGO_URL/CUSTOM_DB_NAME prevents Emergent overwrite

### Enriched Product Matching (2026-03-19) - COMPLETED
- DB query now searches tags, name, inhaltsstoffe, auswirkungen_studien, beschreibung, zutaten
- Scoring uses all 6 data sources with weighted points (name:20, inhaltsstoffe:15, auswirkungen:12, desc:8, beschreibung:6, tags:5, zutaten:4)
- Combined DE+IT tags for search (DB has mixed-language tags)
- Smart deduplication: prefers enriched product versions over empty ones
- Result: 12/12 core nutrients find products (was 0/12 before)
- pricing-summary also uses enriched fields

### UI Changes (2026-03-19)
- Removed "Alle Videos auf YouTube ansehen" button from Gesundheits-Tipps page

## Key API Endpoints
- `GET /api/products/by-nutrient/{nutrient}?lang=X` - Products for nutrient (uses enriched fields)
- `GET /api/products/pricing-summary?nutrients=X&lang=X` - Price estimates
- `GET /api/recipes/personalized/{profile_id}?lang=X` - Personalized recipes

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications)

### P2 - Upcoming
- Medication Progress Tracking
- Historical Data Visualization (water intake graphs)

### Future
- Admin Web Dashboard enhancements
- Reactivate TR, FR, ES, RU languages
