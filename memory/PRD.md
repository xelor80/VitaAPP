# VitaGuide PRD

## Original Problem Statement
Health Coach App (VitaGuide) - A comprehensive health management platform built with React Native/Expo (frontend) + FastAPI (backend) + MongoDB Atlas.

## Architecture
- **Frontend**: React Native (Expo) with expo-router, served via tunnel
- **Backend**: FastAPI on port 8001
- **Database**: MongoDB Atlas (cloud) - DB_NAME=test_database
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **3rd Party**: Shopify (products), SMTP (emails), Unsplash (images), Emergent Google Auth


### HBand Wearable Integration – Grundgerüst (2026-08-04) – COMPLETED
- **Vendor-agnostic architecture**: `WearableProvider` interface (see `/app/memory/HBAND_ARCHITECTURE.md`).
- **Backend**: `routes/wearable.py` with `wearable_devices`, `health_measurements`, `sleep_sessions`, `wearable_sync_logs` collections.
  Endpoints: POST/GET/PUT/DELETE `/api/wearable/devices`, POST/GET `/api/wearable/measurements(batch)`,
  POST/GET `/api/wearable/sleep-sessions/batch`, POST/GET `/api/wearable/sync-status`, GET `/api/wearable/daily-summary/{user_id}`.
- **Dedupe** via unique compound index `(user_id, device_id, metric_type, measured_at)` + $setOnInsert upserts.
- **Frontend**:
  - `src/wearable/types.ts` / `WearableProvider.ts` – abstract interface
  - `src/wearable/DemoProvider.ts` – simulator (clearly labelled DEMO)
  - `src/wearable/HBandProvider.stub.ts` – stub, real bridge later via EAS Dev-Client
  - `src/WearableContext.tsx` – React context (state, sync, actions)
  - `app/wearable/onboarding.tsx` – 7-step pairing assistant
  - `app/wearable/device-settings.tsx` – "Mein VitaGuide Band"
  - Link in Profile → "Mein VitaGuide Band"
- **EAS-Config**: `frontend/eas.json` (dev/preview/prod), `expo-dev-client` installed.
- **Permissions**: iOS `NSBluetoothAlwaysUsageDescription` + `bluetooth-central`; Android `BLUETOOTH_SCAN/CONNECT`, Location.
- **Tests**: 16 pytest backend tests in `/app/backend/tests/test_wearable_api.py` – 100% pass.
- **Docs**: `HBAND_OPEN_QUESTIONS.md`, `HBAND_INTEGRATION_CHANGELOG.md`, `HBAND_ARCHITECTURE.md` in `/app/memory/`.
- **NOT yet done** (needs physical device + native module):
  - Native Kotlin/Swift bridge to real HBand AAR / iOS Framework
  - Dashboard cards, detail pages, VitaGuide-Scores, baselines
  - HealthKit / Health Connect
  - Real BLE connection (Demo Provider used in Expo Go)


### Coach‑TV Video Section (2026-06-19) – COMPLETED
- **New Bottom-Tab**: `Coach‑TV` (play-circle icon, JK red `#C2272F`).
- **Inline YouTube Player**: WebView modal on mobile, `<iframe>` on web. No more external browser jumps.
- **Backend**: `videos` collection + full CRUD at `/api/videos` (already existed, now extended with seed function `seed_default_videos`).
- **Trilingual seed data**: 5 Joachim Kaeser videos × DE/IT/EN = 15 entries, categorised across `articolazioni`, `digestione`, `energia`, `pelle`, `allgemein`.
- **Admin Prompt**: `/app/memory/ADMIN_COACH_TV_PROMPT.md` describes how to expose Coach‑TV management in the Admin Dashboard.
- **Frontend file**: `/app/frontend/app/(tabs)/videos.tsx` (replaces deleted stack route).

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

### Plan Swipe-Gesten + Smart Coach + Rezepte (2026-04-12) - COMPLETED
**Plan Swipe-Gesten (`/app/frontend/app/(tabs)/plan.tsx`):**
- Swipeable (react-native-gesture-handler) um jedes Plan-Item
- Swipe rechts → gruenes "Erledigt" Panel → markiert als erledigt + Toast
- Swipe links → graues "Skip" Panel
- Swipe-Hint Icon (gesture-swipe-right) auf unerledigten Items
- Nur auf unerledigten Items aktiv, erledigte haben kein Swipe

**Smart Coach Engine (`/app/backend/routes/coach.py`):**
- GET `/api/coach/{profile_id}` - Analysiert 7-Tage Trends
- Insights: critical, warning, suggestion, praise - jeweils mit Icon, Farbe, Action
- Integriert als "VERO empfiehlt" Cards auf Home Screen
- Beispiele: "Stress & Schlaf" Warnung, "Mehr trinken", "Tolle Woche!" Lob

**Rezepte-Personalisierung (`recipes.tsx`):**
- "Fuer dich" Badge mit Herz-Icon auf personalisierten Rezepten
- recommendation_reason + relevance_tags prominent angezeigt

### Gewicht & Stoffwechsel-Modul (2026-05-03) - COMPLETED
**Backend (`/app/backend/routes/weight_metabolism.py`):**
- 14 Endpoints: Goals (auto Mifflin-St Jeor), Mahlzeiten (CRUD), Gewichtslog mit Tagesreplace, Intervallfasten (start/state/stop, frei konfigurierbar 4-48h), Settings, History, kompakte Summary
- Auto-Goals aus Health-Profile (BMR + Aktivitaetsmultiplikator), Protein 1.2-1.6 g/kg
- Validation: Kalorien 800-6000, Protein 20-400g, Gewicht 30-300 kg, Fastenstunden 4-48
- 97.7% Backend-Tests bestanden (42/43)

**Frontend (`/app/frontend/app/weight-metabolism.tsx`):**
- Zwei SVG-Ringe: Kalorien + Protein mit Live-Werten und Zielen
- Mahlzeit-Modal mit Typ-Auswahl (Fruehstueck/Mittag/Abend/Snack), Name, Kalorien, Protein
- Fasten-Timer: SVG-Ring mit Live-Countdown (Sekunden-Tick), 4 Presets (14/16/18/20h) + Freitext
- Gewichtskurve (SVG-Polyline) mit aktuell/30-Tage-Delta/Ziel-Stats
- Goal-Modal zum Anpassen aller Tagesziele

**Integration:**
- `WeightMetabolismCard` Component im Dashboard und Mein-Tag Tab
- Live-Fortschritts-Bars + aktiver Fasten-Banner (mit Zeitanzeige)
- EventBus `weight_metabolism_changed` synct Karten cross-tab
- Stack.Screen registriert in `_layout.tsx`

### Smart Product Integration / Affiliate (2026-05-03) - COMPLETED
**Backend (`/app/backend/routes/smart_products.py`):**
- 6 Endpoints: Recommendations (kontext-bewusst), Click-Tracking, Catalog, Upsert (Admin), Delete, Stats
- 7 Platzhalter-Produkte auto-seeded (Magnesium, D3+K2, Omega-3, Elektrolyt, Protein, Ashwagandha, B12)
- Scoring: Profilsymptome + Supplement-Plan-Defizite (z.B. Magnesium-Eintrag → Score-Boost)
- `affiliate_url`-Feld zum spaeteren Befuellen via Admin

**Frontend (`/app/frontend/components/SmartProductBlock.tsx`):**
- Dezente, "Anzeige"-gekennzeichnete Karten (max 1-2 pro Block)
- Kontextbasierte Platzierung: Dashboard, Stress-Screen, Gewicht-Screen, Fasten-Sektion
- Click-Tracking via `/api/smart-products/click` + `Linking.openURL` fuer affiliate_url
- Mehrsprachig (de/it/en)

### Weight & Metabolism UPGRADE v2 (2026-05-03) - COMPLETED
**Backend (`/app/backend/routes/weight_metabolism.py`) - neue Endpoints:**
- **Fasten-Schedule** (zeitbasiert, statt Einzel-Timer):
  - `GET/PUT/DELETE /api/weight-metabolism/{pid}/schedule` mit eating_window_start (HH:MM) + eating_window_hours (1-14), daily_recurring
  - Auto-Berechnung: aktuelle Phase (eating/fasting), remaining_seconds, progress_pct, Wrap-Around ueber Mitternacht
- **Favorites CRUD**: `GET/POST/DELETE /favorites` + `POST /favorites/{id}/use` (loggt Meal + inkrementiert used_count)
- **Photo AI Analysis**: `POST /analyze-meal-photo` mit base64-Image → GPT-4o Vision → strukturiertes JSON (name, items, kcal, protein_g, carbs_g, fat_g, confidence, note). Fallback: success=false mit manuell-Hinweis
- **Summary erweitert**: schedule_* Felder + `vero_hint` (kontextbasiert: Fenster-Start in X Min / Fasten-Start in X Min / Rest-Protein)
- 100% Backend-Tests (18/18 in iteration_83)

**Frontend (`/app/frontend/app/weight-metabolism.tsx`) - komplett ueberarbeitet:**
- Grosser Fasten-Kreis (200px) mit Phasen-Badge (eating/fasting), Live-Countdown
- Preset-Chips fuer Startzeit (08:00/10:00/12:00/14:00) + Dauer (6/8/10/12h), freie Eingabe moeglich
- 3-Kachel Mahlzeit-Picker (Foto / Manuell / Favoriten) in Bottom-Sheet
- Foto-Flow: Kamera oder Galerie → Live-Analyse-Spinner → editierbare Schaetzung → optional als Favorit speichern
- Unsicherheit-Banner bei confidence=low ("Nicht eindeutig erkannt")
- Favoriten-Modal mit 1-Tap-Add, Used-Count, Inline-Erstellung
- VERO-Hinweis-Card oben (nur wenn relevant), groessere Touch-Targets ueberall
- Abhaengigkeit: `expo-image-picker@17`

### Weight & Metabolism v2.1 (2026-05-03) - COMPLETED
**VERO Post-Meal Coach Comments + Timezone + Push-Reminder:**
- Backend: `POST /api/weight-metabolism/{pid}/coach-comment` via gpt-4o-mini
  - Tone-Klassifikator (positive/suggestive/caution/neutral) spart LLM-Calls bei trivialen Snacks
  - Cache per `(name|cal|protein)`-Hash in `meal_coach_cache` Collection
  - Kurzer deutscher Coach-Satz (<=180 Zeichen, kein Emoji, kein Markdown)
- Backend: `GET/PUT /timezone` speichert IANA-Timezone + UTC-Offset per Profil
- Frontend: `FastingReminderService.ts` – plant 4 tägliche lokale Notifications via expo-notifications
  - 15min vor Essensfenster-Start ("Essensfenster startet bald")
  - Bei Fenster-Start ("Essensfenster geoeffnet")
  - 15min vor Fenster-Ende ("Fasten beginnt bald")
  - Bei Fenster-Ende ("Fasten beginnt jetzt")
  - Auto-Reschedule beim Öffnen des Screens (Idempotenz via lastScheduledKey-ref)
  - Cancel-All beim Löschen des Plans
- Frontend: Device-Timezone wird beim Screen-Mount automatisch ans Backend gemeldet
- Frontend: Nach Mahlzeit-Save (Foto/Manuell/Favorit) wird Coach-Kommentar als Action-Toast angezeigt
- Tests: 9/9 bestanden (iteration_84) inkl. Tone-Logik, Cache-Verhalten, Validierung, No-`_id`-Leak

### Weight & Metabolism v2.2 (2026-05-03) - COMPLETED
**KI-Tagesziele-Berechnung in den Einstellungen:**
- Backend: `POST /api/weight-metabolism/{pid}/ai-calculate-goals`
  - Input: Geschlecht + aktuelles Gewicht (Fallback: latest weight_log → profile.weight), optional Groesse/Alter/Aktivitaet/Ziel
  - Mifflin-St Jeor Anchor + Aktivitaets-Multiplikator + Ziel-Adjustment (±300 kcal)
  - GPT-4o-mini verfeinert und liefert kurze deutsche Begruendung
  - Safety Clamps: Kalorien 1200-5000 (multiples of 50), Protein 40-300g (multiples of 5)
  - Fallback auf pure Formel wenn LLM fehlschlaegt
- Frontend: Lila KI-Sektion im Goals-Modal mit Chips fuer Geschlecht/Aktivitaet/Ziel + Berechnen-Button
  - Zeigt Vorschlag (kcal + Protein + Coach-Begruendung) inline
  - Werte werden automatisch in die Input-Felder uebernommen, User kann anpassen
- 5/5 Backend-Tests bestanden (iteration_85)

### Weight & Metabolism v3.0 GUIDED COACHING (2026-05-04) - COMPLETED
**Paradigmenwechsel: Von Tracker zu gefuehrtem Coach.**

**Backend-Changes (`/app/backend/routes/weight_metabolism.py`):**
- `PUT /schedule` akzeptiert jetzt BEIDE Formate (backwards compatible):
  - NEU: `fast_start` (HH:MM) + `fast_duration_hours` (10-22)
  - ALT: `eating_window_start` + `eating_window_hours`
  - Beide Felder werden intern synchronisiert gespeichert
- `fast_duration_hours` validiert auf 10-22 (Presets: 14/15/16)
- `GET /day-plan` liefert auto-generierten Tagesplan mit 4 Events:
  - **shake1** bei Essensfenster-Start (+300ml Wasser)
  - **small_meal** +45 Min nach shake1 (+300ml Wasser)
  - **shake2** bei Essens-Halbzeit (+300ml Wasser)
  - **large_meal** 90 Min vor Fastenbeginn (+400ml Wasser)
- Jedes Event hat `status` (now/upcoming/missed/done) berechnet aus aktueller Zeit
- `POST /day-plan/check` toggled Event + auto-logged Wasser in `water_intake_logs`
- 22/22 Backend-Tests bestanden (iteration_86)

**Frontend (`weight-metabolism.tsx`):**
- Schedule-Modal umgebaut: Fastenstart (Presets 18/19/20/21:00) + Dauer (14/15/16h)
  - Live-Vorschau "Fasten 20:00-12:00 · Essen 12:00-20:00"
- Fasten-Card zeigt jetzt die **Timeline als Hero**:
  - Progress-Bar 0-100%
  - 4 Event-Zeilen mit Icon, Zeit, Wasser-Hinweis
  - Checkbox-Tap markiert als erledigt (optimistic UI)
  - "Jetzt"-Badge bei aktivem Event (±30 Min)
- **VERO-Hinweise** jetzt plan-aware:
  - "Jetzt dran: Shake 1 · 12:00"
  - "Du bist im Plan. Naechster: Shake 2 · 16:00"
  - "Perfekt – du hast heute alles erledigt!"

**FastingReminderService erweitert auf 6 tägliche Notifications:**
- 15 Min vor Essensfenster-Start
- Shake 1 (bei Fenster-Start)
- Kleine Mahlzeit (+45 Min)
- Shake 2 (Halbzeit)
- Grosse Mahlzeit (-90 Min)
- Fasten beginnt (bei Fenster-Ende)

**Wasser-Integration:** Automatisches Logging bei jedem Check-in (300/300/300/400ml), shared mit bestehender Wasser-Tracking-Infrastruktur.

## Prioritized Backlog
### P1 - Upcoming
- Medication Reminders (push notifications) - COMPLETED

### P2 - Upcoming
- Medication Progress Tracking - COMPLETED
- Historical Data Visualization (water intake graphs) - COMPLETED

### Future
- Admin Web Dashboard: Rewards admin pages (briefing ready in `/app/memory/REWARDS_SYSTEM_BRIEFING.md`)
- Admin: UI zum Befuellen der Smart-Product `affiliate_url` und neue Produkte anlegen
- Push-Reminder fuer Fasten-Start/-Ende und Wiegeerinnerung
- Reactivate TR, FR, ES, RU languages
- Refactor `/app/frontend/app/(tabs)/index.tsx` (>1200 Zeilen) in kleinere Komponenten

### Snappier "Heute für dich" + Deutsche Umlaute (2026-05-12) - COMPLETED
**Snappier task list** (`/app/frontend/app/(tabs)/index.tsx`):
- `useFocusEffect` von expo-router hinzugefügt → bei jedem Tab-Re-Focus wird **nur** focus/water/reward neu geladen (lightweight, kein voller dashboard-reload mehr).
- **Optimistic UI**: Beim Tippen auf einen Eintrag in "Heute für dich" verschwindet er sofort lokal (`setFocusData → filter items`), bevor der echte Server-State zurückkommt → User-feeling ist instant.

**Deutsche Umlaute** (`/app/frontend/src/i18n.ts` + `guideData.ts`):
- Neue Funktion `restoreGermanUmlauts()` + exportierte Variante `deUmlauts()` mit ~100 Wörter-Mapping (`fuer→für`, `ueber→über`, `naechste→nächste`, `Ernaehrung→Ernährung`, `unterstuetzt→unterstützt`, etc.).
- `tx(lang, ...)` und `t(textObj, lang)` in `guideData.ts` rufen den Restorer für `lang==='de'` auf → automatisch alle ASCII-Transliterationen werden ersetzt.
- Word-Liste mit `\b`-Boundaries verhindert false-positives (kein "neu→nü", kein "Mauer→Maür").
- Lokal-Strings in `(tabs)/index.tsx` (Bereiche-Sektion) direkt mit echten Umlauten überschrieben.
- Smoke-Test: "Bereit für heute?", "Neu für dich", "Atemübungen", "Ernährung & Rezepte", "Personalisiert für dich", "persönlicher Gesundheitsbegleiter" alle korrekt im DOM.


### Featured Products Slider — Home Screen (2026-05-12) - COMPLETED
**Frontend (`/app/frontend/components/FeaturedProductsSlider.tsx` neu)**:
- Horizontaler Slider direkt unter den Hero-CTAs auf der Home-Tab.
- 160px breite Karten mit Bild (110px hoch), Badge-Overlay (z.B. "NEU", "TOP", "-30%"), Titel, kurzer Beschreibung, Preis (grün), violette „Ansehen →" CTA-Pille.
- Klick → trackt Klick mit `context="featured_slider"` + öffnet `affiliate_url` extern.
- Mehrsprachig (DE/IT/EN), unsichtbar wenn keine Featured-Produkte vorhanden.
- Klar als „Anzeige" gelabelt (Disclosure).
- Eingebunden in `/app/frontend/app/(tabs)/index.tsx` zwischen Hero-Block und Today-Card.

**Backend (`/app/backend/routes/smart_products.py`)**:
- Schema-Erweiterung in `ProductUpsertRequest`: `is_featured: bool`, `featured_order: int`, `badge: str` (max 8 Zeichen empfohlen).
- Neuer Endpoint `GET /api/smart-products/featured?limit=8` — sortiert nach `featured_order` (asc) dann `created_at` (desc), nur `enabled=true` + `is_featured=true`.
- Tests via curl + Web-Smoke: ✅ 3 Demo-Featured-Produkte erstellt, Slider rendert mit 3 Cards inkl. NEU-Badge, Klick-Tracking funktioniert.

**Admin-Prompt** (`/app/memory/ADMIN_AGENT_PROMPT.md`) erweitert:
- Featured-Switch, `featured_order`-Input und Badge-Text-Input im Product-Editor
- Neue Sektion: **Featured-Slider-Manager** mit Drag-&-Drop-Sortierung + Live-Vorschau
- Separates Klick-Analytics-Diagramm für `context="featured_slider"`


### testID Refactoring (2026-05-12) - COMPLETED
**Frontend-weit**: 227 `data-testid="..."` Vorkommen in 33 Dateien zu `testID="..."` migriert (bulk sed). React Native Web filterte `data-testid` als unbekannten Prop aus dem DOM. Mit `testID` wird der Wert:
- Auf Web automatisch als `data-testid` im DOM gerendert (für Playwright/Selenium/E2E Tests)
- Auf iOS/Android als `accessibilityIdentifier` (Voice Control, Screen Reader, Detox/Appium Tests)

Verifiziert: 14 testIDs auf Hauptseite + 15 weitere im Goal-Modal (darunter `wm-ai-age-input`, `wm-ai-height-input`, `wm-ai-weight-input`, `wm-ai-run-btn`) sichtbar im DOM — vorher 0.


### Weight & Metabolism v3.2 — Profil-Eingaben + Tagesdefizit (2026-05-04) - COMPLETED
**Frontend (`/app/frontend/app/weight-metabolism.tsx`):**
- **Goal-Modal AI-Sektion** erweitert um 3 Pflicht-Eingabefelder: `Alter`, `Größe (cm)`, `Gewicht (kg)`. Werte werden aus `today.profile` vorbefüllt.
- **Tagesdefizit-Card** zwischen Kalorien-Ring und "Mahlzeit hinzufügen": zeigt live `Defizit (grün)` / `Überschuss (rot)` / `Im Ziel (grau)` mit kcal-Wert + Sub-Zeile mit geschätztem Abnehm-Tempo (`kg / Woche`, basierend auf 7700 kcal = 1 kg Fett).

**Backend (`/app/backend/routes/weight_metabolism.py`):**
- `POST /ai-calculate-goals` persistiert jetzt `age`, `height`, `weight` zurück ins `health_profiles`-Dokument und legt automatisch einen `weight_log`-Eintrag für den heutigen Tag an, falls neues Gewicht angegeben.
- `GET /today` liefert zusätzlich `profile`-Snapshot (`age, gender, height, weight, activity_level, goal`) für Frontend-Vorbefüllung.
- Validierungs-Reichweiten: Alter 14-100, Größe 120-230 cm, Gewicht 30-300 kg.
- Tests via curl: ✅ AI-calc mit Alter/Größe/Gewicht → kcal=2100, protein=120g, profile persistiert.

### Weight & Metabolism v3.1 — VERO Info Modal + Verlauf-Reset (2026-05-04) - COMPLETED
**Frontend (`/app/frontend/app/weight-metabolism.tsx`):**
- Klickbarer Fasten-Kreis: Tap auf den großen SVG-Timer öffnet das **VERO-Info-Modal** mit ausführlicher Erklärung der Protein-Routine (5 Sektionen: Warum 4 Schritte, Protein, Essensfenster, Wasser, Tagesziele) + Tipp-Box. Kleiner violetter Hint-Chip "Tippe für VERO-Erklärung" unter dem Kreis.
- **History-Modal** im Weight-Card: neuer "Verlauf"-Button öffnet Liste aller Einträge (chronologisch absteigend), jeder Eintrag ist einzeln löschbar (Trash-Icon), zusätzlich roter "Verlauf komplett zurücksetzen"-Button am Ende.
- Bestätigungsdialoge (Alert) für Löschen + Reset, ActionToast nach Aktion.

**Backend (`/app/backend/routes/weight_metabolism.py`):**
- Neuer Endpoint `DELETE /api/weight-metabolism/{profile_id}/weight` → löscht alle Gewichtseinträge eines Nutzers (Reset).
- Bestehender Endpoint `DELETE /weight/{entry_id}` für Einzel-Löschung weiterverwendet.
- Tests via curl: ✅ POST → 2 entries → DELETE all → 0 entries.

**Marketing-Prompts erstellt:**
- `/app/memory/ADMIN_AGENT_PROMPT.md` — vollständiger Prompt für den externen Admin-Web-Agenten (Smart-Products-Manager, Protein-Routine-Inspector, LLM-Cache-Übersicht).
- `/app/memory/LANDING_PAGE_AGENT_PROMPT.md` — vollständiger Prompt für vitaguide.app Landing-Page-Agent (14 Sektionen, Hero-Feature Protein-Routine, Conversion-Optimierung, SEO, DSGVO).


### iOS Build Fix — notification.icon (2026-05-12) - COMPLETED
- **Problem**: EAS iOS Build schlug fehl mit `Field: notification.icon - image should be square...` (vero-hallo.png war 1024×1536, nicht quadratisch).
- **Fix**: In `/app/frontend/app.json` (Zeile 22) `notification.icon` von `./assets/images/vero-hallo.png` auf `./assets/icon.png` (1024×1024, quadratisch) geändert.
- **Validierung**: `npx expo-doctor` → 17/17 checks passed. Deployment-Blocker behoben.

### Abnehm-Guide Phase 1 (2026-05-13) - COMPLETED
**Umbenennung**: Sektion „Gewicht & Stoffwechsel" → **„Abnehm-Guide"** (DE) / „Slim guide" (EN) / „Guida dimagrante" (IT). Header-Titel angepasst.

**Frontend (`/app/frontend/components/AbnehmGuideModal.tsx` — neu):**
- 6 Swipeable Karten (Warum Protein → Weniger Heißhunger → Struktur → Wasser → Defizit → Konstanz) mit Icon + Titel + Erklärung.
- Dots-Navigation, „Weiter"/„Fertig"-Button, Close (X). TestIDs: `abnehm-guide-scroll`, `abnehm-guide-card-*`, `abnehm-guide-next-btn`, `abnehm-guide-close`.
- Auto-Anzeige beim ersten Besuch (`AsyncStorage` Flag `abnehm_guide_seen`).
- Trigger über neuen Buchsymbol-Button im Header (`wm-guide-btn`, lila, links neben dem Zahnrad).

**Frontend (`/app/frontend/app/weight-metabolism.tsx`):**
- **Phase-Erklärungs-Cards** unter dem Fasten-Kreis: zwei farbcodierte Cards (lila Proteinphase, grün Essensfenster) mit Uhrzeit + Erklärungstext (ersetzt die alten `scheduleInfo` rows).
- **Heißhunger-Hinweise** unter jedem nicht-abgehakten Timeline-Step: lila italic-Box mit Lightbulb-Icon + statische VERO-Coach-Zeile pro Step (shake_1, shake_2, small_meal, large_meal). TestID-Schema: `wm-coach-line-{event_key}`.
- **Achievements-Card** (nach dem Today-Summary): Streak-Badge (🔥 + Tage), motivierender Untertitel, 2×2 Grid mit 4 Badges (3 Tage in Folge, Protein-Ziel, Heute voll im Plan, Wasser-Ziel). TestID: `wm-achievements` + `wm-badge-{id}`.

**Backend (`/app/backend/routes/weight_metabolism.py`):**
- Neuer Endpoint `GET /api/weight-metabolism/{profile_id}/achievements`:
  - `current_streak` (consecutive days mit ≥1 day_plan_checkin)
  - `longest_streak` (max run aller Daten)
  - `today_protein_done`, `today_calories_done` (90-110% band), `today_water_done` (≥1500 ml), `today_full_plan_done`
  - `badges` Array (4 Items, immer in fester Reihenfolge: streak_3, protein_goal, full_plan, water_goal)

**Tests**: `/app/backend/tests/test_abnehm_guide_achievements.py` — 10/10 pytest cases PASSED (shape, streak counting, badge logic, regression auf /today, /goals, /schedule, /day-plan, /summary).



### Abnehm-Guide Phase 2 (2026-05-13) - COMPLETED
**Frontend (`/app/frontend/app/weight-metabolism.tsx`):**
- **Einklappbare Sektionen** mit Chevron-Toggle: Mahlzeiten (`wm-meals-toggle`), Gewicht (`wm-weight-toggle`), Empfehlungen (`wm-reco-toggle`, default eingeklappt). Sanftere Hierarchie auf langen Screen.
- **Gewicht-Wochenübersicht** (Phase 2 Card unter Stats-Row): 7-Tage Ø, Trend-Chip (down/up/stable mit Icon), kontextueller Hinweistext (good_progress / stay_consistent / stable_is_normal / more_data_needed). TestID: `wm-weekly-insight`.
- **KI-Foto-Coach-Zeile** im Photo-Modal: Lila Box mit Lightbulb-Icon + kontextuelle Coach-Zeile basierend auf verbleibendem Protein-Ziel. Plus neue Makro-Chips (KH, Fett, Sicherheit). TestID: `wm-photo-coach-line`.
- **Bug-Fix**: `coachLineFor` map keys von `shake_1`/`shake_2` → `shake1`/`shake2` (matched backend `DAY_PLAN_EVENTS`). Shake 2 zeigt jetzt korrekt eigene Coach-Zeile statt der Shake 1 Zeile.

**Backend (`/app/backend/routes/weight_metabolism.py`):**
- `GET /weight-metabolism/{pid}/weight/history` erweitert: neue Felder `week_avg_kg`, `prev_week_avg_kg`, `week_delta_kg`, `trend` (down/up/stable/unknown), `hint_key`, `entries_last_week`. Trend-Logik: |Δ|<0.2 kg = stable, sonst down/up.
- `POST /weight-metabolism/{pid}/analyze-meal-photo` erweitert: Antwort enthält jetzt `coach_line` Feld — kontextuell aus aktuellem Protein-Tagesziel berechnet (5 Stufen: erreicht / fast erreicht / passt gut / solide / wenig Protein).

**Tests**: `/app/backend/tests/test_abnehm_guide_phase2.py` — 14/14 pytest cases PASSED (4 Trend-Branches, Endpoint-Vertrag, Regression auf alle Phase 1 + bestehenden Endpoints).


### Abnehm-Guide Phase 3 (2026-05-13) - COMPLETED
**Frontend (`/app/frontend/app/weight-metabolism.tsx`):**
- **Routine-Mahlzeit-Templates** (1-Klick Quick-Add): 4 hardcoded Presets (Standard Shake 320/35, Protein Bowl 480/38, Hähnchen Reis 620/45, Skyr Snack 180/22) in horizontaler ScrollRow im Meal-Picker-Modal („QUICK ADD" Header). TestIDs `wm-template-std_shake`, `wm-template-protein_bowl`, `wm-template-chicken_rice`, `wm-template-skyr_snack`. `quickAddTemplate` Handler ruft existierenden `POST /meal` Endpoint auf, schließt Modal, zeigt Toast und triggert `showCoachComment`.
- **Per-Step Product Chip**: Inline Empfehlungs-Chip (lila/blau, Store-Icon + Chevron) nur unter dem `status==='now'` Timeline-Event. Tap → expandiert die Empfehlungen-Collapsible. Mapping per Event: shake1→Protein-Mix, shake2→Sättigender Protein-Boost, small_meal→Protein-Snack, large_meal→Elektrolyt-Komplex. TestID: `wm-step-product-{key}`.
- **Microinteractions**: Checkmark beim Abhaken nutzt `ZoomIn.duration(350).springify()` (reanimated). `key={`done-${ev.key}`}` erzwingt Remount → Animation feuert bei jedem Check. TestID `wm-check-anim-{key}`.

**Tests**: `/app/backend/tests/test_abnehm_guide_phase3.py` — 12/12 pytest cases PASSED (4 Template-POST + 7 Regression + 1 today-shape). Frontend Self-Test: Skyr Snack erfolgreich via Tap im Browser angelegt (verified via curl). Console-Warnings (transform-origin, raw text nodes in `<View>`) sind pre-existing aus früheren Iterationen und nicht durch Phase 3 verursacht.

**Hinweis**: Per-Step Product Chip und Check-Animation rendern nur bei aktiver Routine mit aktuellem Now-Event bzw. checked-State — visuelle Verifizierung erfordert eine laufende Routine.

### White-Label Branding System (2026-05-15) - COMPLETED
**Backend (`/app/backend/routes/branding.py` — neu):**
- Mongo-Collection `brands` mit allen Brand-Feldern (Name DE/IT/EN, Tagline DE/IT/EN, Logo-Data-URL, Primary-Color hex, is_active, is_default).
- Public Endpoint `GET /api/branding/active` (mit DEFAULT_BRAND Fallback wenn keiner aktiv).
- Admin CRUD: `GET/POST/PUT/DELETE /api/branding/admin/brands`.
- Activate-Endpoint `PUT /admin/brands/{id}/activate` (deaktiviert alle anderen).
- Reset-Endpoint `PUT /admin/brands/reset-to-default` (alle inaktiv → DEFAULT fallback).
- Logo akzeptiert: leerer String (Default-Leaf), HTTPS-URL oder Data-URL Base64 (max 300 KB).
- Color-Validierung `#RRGGBB`. Schutz: Aktiver Brand kann nicht gelöscht werden.

**Frontend (`/app/frontend/src/BrandContext.tsx` — neu):**
- React Context mit `useBrand()` Hook → liefert `{brand, loading, refresh, appName(lang), tagline(lang)}`.
- 30 s Polling via `setInterval`, AsyncStorage-Cache für Offline-Fallback.
- DEFAULT_BRAND hardcoded für Network-Fail.
- Wrapper im `app/_layout.tsx` zwischen `SettingsProvider` und `AuthProvider`.

**Frontend (Header-Integration):**
- `app/(tabs)/index.tsx`: Header-Gradient nutzt `brand.primary_color` (oder default-Gradient bei is_default). Text dynamisch via `appName(lang)`, Logo-Image bei vorhandener `logo_url`.
- `components/home/HomeHeader.tsx`: gleiche Logik, plus Tagline-Subtitle.
- TestIDs: `header-brand-name`, `header-brand-logo`, `brand-app-name`, `brand-logo-image`.

**Verifikation (live im Browser-Screenshot):**
- FitCoach-Brand erstellt (#FF6B35 orange + Logo-fallback Leaf) → aktiviert → Header zeigte sofort „FitCoach" auf orangem Hintergrund nach 30s-Poll bzw. Reload.
- Reset → Header zurück auf VitaGuide+ grün-Gradient.

**Admin-Agent-Prompt**: `/app/memory/ADMIN_BRANDING_PROMPT.md` (316 Zeilen) — vollständige Specs, Endpoint-Doku, Logo-Upload-Strategie, UI-Mockup, Audit-Anforderungen, cURL-Tests, Sicherheits-Hinweise.


### JK Branding aktiviert (2026-06-17) - COMPLETED
- **Brand erstellt**: „JK Joachim Kaeser" mit echtem JK-Logo (rotes Oval mit weißem „JK"), 256×256 PNG mit transparentem Hintergrund, ~55 KB als Data-URL gespeichert.
- **Farbe**: `#C2272F` (Markenrot des JK-Logos)
- **App-Name**: „JK" (alle Sprachen)
- **Tagline**: „Joachim Kaeser"
- **Verifiziert via Screenshot**: Header zeigt rotes JK-Logo + goldenes „JK" auf rotem Gradient — Live ohne App-Rebuild.
- Original-Asset: `https://customer-assets.emergentagent.com/job_140674c3-b5f2-4e42-ae14-4e40407a4853/artifacts/t5xllq48_IMG_1833.jpeg`
- Reset jederzeit möglich via `PUT /api/branding/admin/brands/reset-to-default` → zurück zu VitaGuide+ grün.

