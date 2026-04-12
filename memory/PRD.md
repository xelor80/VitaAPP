# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB Atlas.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images), Emergent Google Auth

## What's Been Implemented

### Core Features
- Health Profile & Onboarding
- AI-powered Supplement Plans (8-week personalized)
- Medication Management (CRUD + daily plan + check-in)
- Water Tracking with AI-based goal calculation
- VERO Water Reminders & Guide Mascot
- Symptom Analysis & Tracking
- Daily Tasks & Achievements
- Recipe Catalog with Personalized + All tabs
- Progress Dashboard, Admin Panel, Product Selection

### Auth + Sync System (2026-03-20) - COMPLETED
**Backend (`/app/backend/routes/auth.py`):**
- `users` collection with email, password_hash, google_id, profile_id, auth_provider
- JWT token auth (30-day expiry) with bcrypt password hashing
- POST `/api/auth/register` - Email+Password registration with profile linking
- POST `/api/auth/login` - Email+Password login, auto-links local profile
- POST `/api/auth/google` - Google OAuth via Emergent Auth session exchange
- GET `/api/auth/me` - Returns authenticated user data
- GET `/api/auth/sync-data/{profile_id}` - Returns all user data (profile, supplements, meds, water, points, streak)
- POST `/api/auth/link-profile` - Links health_profile to user account
- POST `/api/auth/logout`
- All 20 backend tests passed (100%)

**Frontend:**
- `/app/frontend/src/AuthContext.tsx` - Auth state provider with token persistence
- `/app/frontend/app/login.tsx` - Login/Register screen with Email+Password + Google Auth
- `/app/frontend/app/_layout.tsx` - Updated with AuthProvider
- `/app/frontend/app/health-profile.tsx` - Account section (logged in: email + sync badge + logout; logged out: login prompt)
- `/app/frontend/app/onboarding.tsx` - Auto-links new profiles to logged-in users
- "Ohne Anmeldung fortfahren" skip option for users who don't want to register yet

### Rewards System (2026-03-20) - COMPLETED
- 6 new DB collections, 21 API endpoints
- Frontend: Rewards page, dashboard integration, VERO mascot tips
- Bug fix: next_reward hint now works for new users (0 balance)

### Database Migration to MongoDB Atlas (2026-03-19) - COMPLETED
### Enriched Product Matching (2026-03-19) - COMPLETED

## Key DB Schema
- `users`: user_id, email, password_hash, google_id, profile_id, auth_provider, first_name, picture, created_at, last_login
- `health_profiles`: id (UUID), age, gender, height, weight, diet, conditions, etc.
- `reward_settings`, `reward_events`, `user_points`, `rewards_catalog`, `reward_redemptions`, `user_streaks`

### Stress Management Module (2026-04-11) - COMPLETED
**Backend (`/app/backend/routes/stress.py`):**
- 15 exercises across 5 categories (breathing, mini, sleep, focus, movement)
- 6 API endpoints: exercises list, recommendation, session start/complete, stats, history
- Personalized recommendations based on profile stress level, sleep quality, energy, time of day
- Automatic reward points (10 pts) on exercise completion via `grant_points_internal`
- Seeded exercises with German + Italian content

**Frontend:**
- `/app/frontend/app/stress.tsx` - Main screen: SOS button, VERO recommendation, category filters, quick exercises, full list
- `/app/frontend/app/stress-player.tsx` - Player: pre-phase (stress slider 1-10), active-phase (breathing animation or guided steps with timer), post-phase (completion + improvement badge)
- `/app/frontend/app/(tabs)/index.tsx` - Dashboard stress card (data-testid='stress-dashboard-card')
- Full pre/post stress tracking with visual improvement feedback
- 17/17 backend tests passed, all frontend E2E flows verified

### Medication Reminders with Push Notifications (2026-04-11) - COMPLETED
**Backend (`/app/backend/routes/medications.py`):**
- GET/PUT `/api/medications/{profile_id}/reminders` - CRUD for reminder settings
- Settings: enabled, morning_time, noon_time, evening_time
- Route ordering fixed: reminder routes placed before /{medication_id} routes

**Frontend (`/app/frontend/app/medications.tsx`):**
- VERO Erinnerungen section with toggle switch
- Per-timing time inputs (only shows timings that have medications assigned)
- Shows which medications are assigned to each timing
- Save & Test buttons for notifications
- Uses existing `scheduleCombinedReminders` from NotificationService

### Medication Progress Tracking in Progress Screen (2026-04-11) - COMPLETED
**Backend:** Uses existing `GET /api/medications/{profile_id}/stats?days=7`
**Frontend (`/app/frontend/app/progress.tsx`):**
- Medication Adherence card in overview tab
- Shows adherence percentage + taken/expected count
- 7-day daily bar chart (color-coded: green=100%, blue=50%+, yellow=<50%)

### Water History Visualization in Progress Screen (2026-04-11) - COMPLETED
**Backend:** Uses existing `GET /api/water-tracking/{profile_id}/history?period=week`
**Frontend (`/app/frontend/app/progress.tsx`):**
- Water intake history card in overview tab
- Shows average daily intake + days goal reached
- 7-day daily bar chart (green=goal reached, blue=below goal)
- Already had detailed chart in `/app/frontend/app/water-tracking.tsx` (bar chart with week/month toggle)

### Daily Plan Feature - "Mein Tag" (2026-04-11) - COMPLETED
**Backend (`/app/backend/routes/daily_plan.py`):**
- `GET /api/daily-plan/{profile_id}` - Generates full daily plan aggregating supplements, medications, water, stress, diary
- `GET /api/daily-plan/{profile_id}/weekly` - 7-day weekly summary with activity scores
- Smart time-based section ordering (evening tasks first after 6pm, noon first after 12pm)
- Level system with 10 tiers (Start → Gesundheits-Held) based on total reward points
- Contextual VERO coaching messages based on completion % and time of day
- Progress calculation: completed/total tasks with percentage

**Frontend (`/app/frontend/app/(tabs)/my-day.tsx`):**
- New "Mein Tag" tab in tab bar (calendar-check icon)
- Dark gradient header with progress bar (0-100%) and level badge
- VERO coaching card with avatar
- Task sections grouped by timing (Morgens, Mittags, Abends, Heute, Flexibel)
- Checkable tasks: supplements and medications complete inline, water/stress/diary navigate to screens
- Completed tasks: green checkbox + strikethrough styling
- Water task: embedded progress bar
- Weekly overview: 7-day dots (green=full, yellow=partial)
- 27/27 backend tests passed, 19/19 frontend flows verified

### Level System (2026-04-11) - COMPLETED
**Backend (`/app/backend/routes/level.py`):**
- GET `/api/level/{profile_id}` - Detailed level info with level-up detection
- GET `/api/level/config` - Full 12-tier configuration
- POST `/api/level/{profile_id}/acknowledge-levelup` - Mark level-up as seen
- 12 configurable tiers (Start → Gesundheits-Held, 0 → 7000 pts)
- Level-up detection via `user_levels` collection
- Bilingual (German/Italian)

**Frontend:**
- Rewards page: Level card with icon, progress bar, points to next level
- Daily Plan header: Level badge (already present)
- Weekly Report: Level section with progress

### Weekly Health Report (2026-04-11) - COMPLETED
**Backend (`/app/backend/routes/weekly_report.py`):**
- GET `/api/weekly-report/{profile_id}` - Comprehensive 7-day health summary
- Sections: overview, supplements %, medications %, water, stress, diary
- VERO recommendation targeting weakest health area
- Daily task completion breakdown for each day

**Frontend (`/app/frontend/app/weekly-report.tsx`):**
- Full report screen with gradient header
- Overview ring (completion %)
- Area cards with percentage badges and progress bars
- Stress improvement badge
- 7-day dot overview
- VERO recommendation card
- Accessible via "Wochenbericht ansehen" button on Mein Tag tab
- 24/24 backend tests + 18/18 frontend flows verified

### Level-basierte Praemien-Freischaltung (2026-04-11) - COMPLETED
**Backend (`/app/backend/routes/rewards.py`):**
- `min_level` Feld im AdminCatalogItem Model (default 0 = kein Level noetig)
- Catalog endpoint: `level_locked` Status wenn `min_level > user_level`, inkl. `min_level` + `user_level` in Response
- Redeem endpoint: Level-Check VOR Punkte-Check, blockiert mit 400 wenn Level zu niedrig
- 3 Seed-Praemien: Premium Meditationsguide (Lv.5), VIP Ernaehrungsberatung (Lv.8), Exklusives Wellness-Paket (Lv.10)

**Frontend (`/app/frontend/app/rewards.tsx`):**
- Level-locked Items: Violettes Schloss-Icon statt Kategorie-Icon
- "Ab Level X (Dein Level: Y)" Badge in Violett mit shield-lock Icon
- Visuell klar unterscheidbar von normalen locked Items (Violett vs Grau)
- 11/11 Backend + 12/12 Frontend Tests bestanden

### Level-Up Animation/Modal (2026-04-11) - COMPLETED
**Frontend (`/app/frontend/app/(tabs)/my-day.tsx`):**
- Level-Up overlay with ZoomIn animation (stars, level icon, title, transition text)
- Triggers automatically when user's points cross a level threshold
- "Weiter" button dismisses and acknowledges via POST `/api/level/{profile_id}/acknowledge-levelup`
- Level check integrated into loadPlan flow (runs on every page load and after task completion)

**Backend bug fix:** Changed `total_earned` → `lifetime_points` in level.py, daily_plan.py, weekly_report.py to match rewards system's actual field name

### Audio-System fuer Stressuebungen (2026-04-12) - COMPLETED
**AudioService (`/app/frontend/src/services/StressAudioService.ts`):**
- Multi-Layer Audio Architecture (Ambient, Voice, UI) vorbereitet fuer native App
- Voice Guidance Texte DE/IT: Intro (3 Saetze), Atem-Phasen (3 Varianten je), Midpoint-Ermutigung, Outro (3 Saetze)
- Guided Steps Voice Texte (begin, focus, breathe, relax, almost, done)
- Persistente AudioSettings via AsyncStorage (Sound/Voice an/aus, Lautstaerke-Level)

**Stress Player (`/app/frontend/app/stress-player.tsx`) - Komplett ueberarbeitet:**
- 5 Phasen: pre → intro → active → outro → post
- Intro-Sequenz: Ruhiger dunkler Screen mit sequenziellen Voice-Texten ("Finde eine bequeme Position...")
- Active Phase: Synchronisierte Voice-Overlays mit Atem-Animation
- Midpoint-Ermutigung alle 3 Zyklen ("Du machst das gut.")
- Outro-Sequenz: Sanfter Abschluss ("Gut gemacht. Komm langsam zurueck.")
- Settings Panel: Voice On/Off, Sound On/Off Toggles
- Pause-Funktion mit Voice-Feedback
- Visuell verifiziert: Intro, Active mit Voice, Timer, Fortschrittsbalken

### ElevenLabs TTS Voice Guidance (2026-04-12) - COMPLETED
**Backend (`/app/backend/routes/tts_elevenlabs.py`):**
- POST `/api/tts/generate` - Generiert TTS-Audio via ElevenLabs, cached in MongoDB
- GET `/api/tts/audio/{cache_key}` - Streamt gecachtes Audio als MP3
- POST `/api/tts/pregenerate-stress?lang=de|it` - Pre-generiert alle 17 Voice-Clips pro Sprache
- ElevenLabs multilingual_v2 Model, Lily Voice, calm settings (stability=0.75, style=0.15)
- 34 Voice-Clips generiert und gecacht (17 DE + 17 IT)

**Frontend:**
- `StressAudioService.ts`: Spielt TTS-Audio via HTML5 Audio API ab, synchron mit Text-Overlays
- `stress-player.tsx`: Intro/Outro Sequenzen mit TTS, Atem-Phasen mit Sprachanleitung, Midpoint-Ermutigung
- Settings: Voice On/Off + Sound On/Off getrennt steuerbar
- 5-Phasen Flow: Pre → Intro (TTS) → Active (TTS + Animation) → Outro (TTS) → Post

### Ambient Sound Layer (2026-04-12) - COMPLETED
**Frontend (`/app/frontend/src/services/StressAudioService.ts`):**
- Web Audio API Ambient Engine: 3 Layer (Pink Noise + Drone Pad + LFO Modulation)
- Pink Noise: Vester-Algorithmus, Tiefpass 400Hz, ocean-like warmth
- Drone Pad: C2-G2-C3 Sinus-Harmonie (65/98/131 Hz) bei 4% Volume
- LFO: 0.08 Hz Modulation auf Noise-Filter fuer natuerliche Bewegung
- 2s Fade-In beim Start, 2s Fade-Out beim Ende
- Completion Chime: C5-E5-G5 Major-Akkord mit sanftem Decay (3s)
- UI Start Sound: 440→523 Hz sanfter Glissando
- Alle Sounds ueber Web Audio API generiert (keine externen Dateien noetig)

### Engagement & Retention Enhancement Phase 1 (2026-04-12) - COMPLETED
**Backend (`/app/backend/routes/daily_plan.py`):**
- GET `/api/daily-plan/{profile_id}/focus` - Lightweight endpoint fuer "Dein heutiger Fokus"
- Berechnet offene Supplements, Medikamente, Wasserziel, Stress, Tagebuch
- Smart Stress Trigger basierend auf Schlaf/Energie/Stresslevel
- VERO kontextbasierte Nachrichten (morgens/abends/nach Fortschritt)

**Frontend (`/app/frontend/app/(tabs)/index.tsx`):**
- "Dein heutiger Fokus" Card: VERO Avatar + Nachricht + Top-3 offene Aufgaben (klickbar → Navigation)
- Stress Smart Trigger Banner: Violetter Banner "Du brauchst eine Pause" bei hohem Stress
- Floating Reset Button: Violetter FAB unten rechts → startet sofort 2-Min Atemuebung
- VERO Active Coach: Kontextbasierte Nachrichten integriert in Focus Card

### Engagement Phase 2 - Post-Action Feedback + Toast System (2026-04-12) - COMPLETED
**Frontend (`/app/frontend/components/ActionToast.tsx`):**
- Globale Toast-Komponente im Root-Layout (`_layout.tsx`)
- Animated Slide-In/Fade-Out (2.5s sichtbar)
- Zeigt: Aktionsname + Punktezahl + zufaelligen VERO-Cheer ("Stark!", "Super!", "Bravo!")
- Farbcodiert nach Typ (gruen=Supplement, blau=Medikament, cyan=Wasser)
- EventBus-basiert: `showActionToast()` aufrufbar von ueberall

**Integration in:**
- WaterTrackerCard: Toast bei jeder Wassereingabe (+X ml, +2 Punkte)
- Mein Tag Tab: Toast bei Supplement/Medikament Check-in (+5 Punkte)
- Plan Tab: Toast bei Check-in mit EventBus-Sync (+5 Punkte)

### Engagement Phase 2 Continued (2026-04-12) - COMPLETED
**Water Animation Enhancement:**
- Bigger bounce on water add (3-stage spring: 1.18 → 0.95 → 1.0)

**Level Progress + Daily Goal on Home:**
- Level card below Rewards: "Lv. X Title" + progress bar + "X bis Lv. Y"
- Level data fetched via `/api/level/{pid}` in parallel with other Home data

**Streak Visual Enhancement:**
- Bigger streak badge: flame icon + "X Tage" in amber badge
- More prominent display in Rewards card

### Smart Coach Engine + Rezepte-Personalisierung (2026-04-12) - COMPLETED
**Backend (`/app/backend/routes/coach.py`):**
- GET `/api/coach/{profile_id}` - Zentrale KI-Logik analysiert 7-Tage Trends
- Inputs: Schlaf, Energie, Stress, Wasser, Supplement-Adherence, Stress-Sessions
- Outputs: Priorisierte Insights (critical/warning/suggestion/praise)
- Beispiele: "Stress & Schlaf" Warnung, "Mehr trinken" Tipp, "Tolle Woche!" Lob
- Jeder Insight hat Action (navigiert zu passendem Screen)

**Frontend (Home Screen `index.tsx`):**
- "VERO empfiehlt" Sektion mit Coach-Insight-Cards (farbcodiert nach Typ)
- Klickbar: navigiert direkt zur empfohlenen Aktion
- Level Progress Bar unter Rewards Card (Lv. X Title + Fortschrittsbalken)
- Groessere Streak-Anzeige ("X Tage" mit Flammen-Icon)

**Rezepte-Personalisierung (`recipes.tsx`):**
- "Fuer dich" Badge auf personalisierten Rezepten (Herz-Icon + Text)
- recommendation_reason und relevance_tags bereits vorhanden und angezeigt

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications) - COMPLETED

### P2 - Upcoming
- Medication Progress Tracking - COMPLETED
- Historical Data Visualization (water intake graphs) - COMPLETED

### Future
- Admin Web Dashboard: Rewards admin pages (briefing ready in `/app/memory/REWARDS_SYSTEM_BRIEFING.md`)
- Reactivate TR, FR, ES, RU languages
