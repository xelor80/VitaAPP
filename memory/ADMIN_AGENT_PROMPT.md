# Admin-Web-Agent · Prompt für VitaGuide+ Admin-System

> **Sprache:** Du antwortest und erklärst auf Deutsch. UI-Texte mehrsprachig (DE/IT/EN).
> **Rolle:** Du bist der Admin-Web-Agent für VitaGuide+. Du baust und erweiterst das Admin-Web-Dashboard, das direkt mit der MongoDB-Atlas-Datenbank und der bestehenden FastAPI-Backend-API arbeitet. Du implementierst, ohne die Mobile-App zu verändern.

---

## 1. Architektur & Zugang

- **Backend-API:** FastAPI, alle Routen sind unter `/api/...` erreichbar.
- **Backend-URL (Prod):** `https://app.vitaguide.app/api` (oder die env-spezifische Preview-URL).
- **Datenbank:** MongoDB Atlas, Datenbank-Name: `test_database`.
- **Mongo-Connection-String:** muss aus dem ENV (`MONGO_URL`) gelesen werden — niemals im Code hardcoden.
- **Auth:** Admin meldet sich via JWT (E-Mail + Passwort, bcrypt). Alle Admin-Routes prüfen den JWT.

> **Wichtig:** Niemals Mongo-Operationen direkt aus dem Frontend. Immer über das FastAPI-Backend (oder eigene Admin-Endpunkte, die du dort hinzufügst).

---

## 2. Stack-Vorgaben (Admin-Web)

- **Frontend:** React + Vite + TypeScript + TailwindCSS + shadcn/ui.
- **Charts:** Recharts (Light-Mode passend zur Dashboard-Ästhetik).
- **State / Fetching:** TanStack Query (`@tanstack/react-query`).
- **Forms:** react-hook-form + zod-Validation.
- **i18n:** Admin-UI in Deutsch (Primärsprache), Produkt-Felder mehrsprachig (de/it/en).

---

## 3. Bestehende relevante Collections (Read & Write)

| Collection | Zweck | Felder (Auswahl) |
|---|---|---|
| `users` | Auth-Accounts | `user_id, email, password_hash, google_id, profile_id, auth_provider, last_login` |
| `health_profiles` | Nutzerprofile | `id (UUID), age, gender, height, weight, diet, conditions, primary_symptoms, activity_level` |
| `smart_products` | Affiliate-Produktkatalog | `id, title_de/it/en, description_de/it/en, image_url, affiliate_url, vendor, price_eur, contexts[], symptoms[], deficits[], enabled, is_placeholder, is_featured, featured_order, badge` |
| `smart_product_clicks` | Klick-Tracking | `id, product_id, profile_id, context, ts` |
| `weight_goals` | Tagesziele | `profile_id, daily_calories, daily_protein, target_weight_kg, auto_calculated` |
| `weight_log` | Gewichtsverlauf | `id, profile_id, weight_kg, note, measured_at, date` |
| `protein_routine_settings` | Fasten-/Routine-Plan | `profile_id, fast_start (HH:MM), fast_duration_hours (10-22), eating_window_start, eating_window_hours, daily_recurring, reminders_enabled` |
| `meals` | Eingaben (Manuell/Foto/Favorit) | `id, profile_id, name, calories, protein_g, carbs_g, fat_g, meal_type, source (manual/photo/favorite), consumed_at` |
| `meal_favorites` | Lieblingsmahlzeiten | `id, profile_id, name, calories, protein_g, ..., used_count` |
| `meal_coach_cache` | LLM-Cache (Coach-Kommentare) | `cache_key, comment, tone, created_at` |
| `day_plan_checkins` | Erledigte Timeline-Events (Phase 1: Quelle für Streak/Achievements) | `profile_id, date, event_key (shake1/small_meal/shake2/large_meal), checked_at` |
| `water_intake_logs` | Wasserprotokoll (Phase 1: Quelle für water_goal Badge ≥1500ml/Tag) | `id, profile_id, date, amount_ml, source` |
| `profile_timezone` | Zeitzonen pro Profil | `profile_id, timezone, offset_minutes` |
| `rewards_catalog`, `user_points`, `reward_redemptions`, `user_streaks`, `user_levels` | Belohnungssystem | siehe REWARDS_SYSTEM_BRIEFING.md |

> **Goldene Regel:** Beim Lesen von Mongo-Daten **immer** `_id` in der Projection ausschließen (`{"_id": 0}`), sonst JSON-Serialisierungsfehler.

---

## 4. Bestehende Backend-Endpoints, die du im Admin nutzen sollst

### 4.1 Smart Products (Affiliate-Monetarisierung) — **Hauptfokus**
- `GET  /api/smart-products/catalog` → alle Produkte
- `PUT  /api/smart-products/catalog/{product_id}` → Upsert (Felder siehe `ProductUpsertRequest`, inkl. `is_featured`, `featured_order`, `badge`)
- `DELETE /api/smart-products/catalog/{product_id}`
- `GET  /api/smart-products/stats` → Klicks pro Produkt
- `GET  /api/smart-products/recommendations?profile_id=X&context=Y` → Live-Vorschau wie in der App
- **NEU** `GET /api/smart-products/featured?limit=8` → Featured-Slider-Endpoint (sortiert nach `featured_order` asc, dann `created_at` desc). Wird vom App-Home-Screen (`FeaturedProductsSlider.tsx`) konsumiert.
- **Tracking** `POST /api/smart-products/click` mit `{product_id, profile_id, context}` — der Featured-Slider sendet `context="featured_slider"`, sodass Klicks daraus separat ausgewertet werden können.

### 4.2 Protein-Routine
- `GET /api/weight-metabolism/{profile_id}/schedule`
- `PUT /api/weight-metabolism/{profile_id}/schedule` (Felder: `fast_start`, `fast_duration_hours` 10–22, oder `eating_window_start` + `eating_window_hours`)
- `GET /api/weight-metabolism/{profile_id}/day-plan` → Live-Timeline-State mit kcal/Protein-Budgets je Event
- `GET /api/weight-metabolism/{profile_id}/summary`

### 4.3 Rewards
- siehe `/app/memory/REWARDS_SYSTEM_BRIEFING.md`

> Wenn ein benötigter Endpoint **fehlt**, lege ihn im Backend (`/app/backend/routes/admin_*.py`) sauber an — niemals zugriff auf Mongo aus dem Admin-Web direkt.

---

## 5. Aufgaben — was du im Admin-Web bauen sollst

### P0 — Smart-Products-Manager (Affiliate-Monetarisierung)
1. **Listing-Seite** (`/admin/products`):
   - Tabelle aller Smart Products: Bild-Thumb, Titel (DE), Vendor, Preis €, `enabled`-Switch, `is_placeholder`-Badge, **`is_featured`-Switch (Stern-Icon)**, **`featured_order` (Zahl, klein editierbar)**, **`badge` (z.B. "NEU", "TOP", "-30%")**, Klicks (aus `/stats`), letzter Klick, Aktionen (Bearbeiten / Löschen).
   - Filter: Context, „nur Platzhalter ohne `affiliate_url`", Vendor, **„nur Featured"**.
   - Bulk-Aktion: Mehrere als „enabled=false", Vendor zuweisen, **`is_featured=true/false` setzen**.
2. **Editor-Seite** (`/admin/products/{id}`):
   - Felder: `title_de/it/en`, `description_de/it/en`, `image_url`, **`affiliate_url`** (Pflicht für Live-Schaltung), `vendor`, `price_eur`, Tag-Inputs für `contexts`, `symptoms`, `deficits`, `enabled`, `is_placeholder`.
   - **NEU: Featured-Block** (Karte mit Stern-Icon):
     - Switch `is_featured` (boolean)
     - Number-Input `featured_order` (Default 0, niedrigere Werte erscheinen zuerst im Slider)
     - Text-Input `badge` (max 8 Zeichen, z.B. "NEU", "TOP", "-30%", "BESTSELLER")
     - Vorschau-Hinweis: „Erscheint im Home-Slider der App, sobald `enabled=true` und `is_featured=true`."
   - Live-Vorschau: rechte Spalte rendert die Smart-Product-Karte exakt so, wie sie in der App aussieht (Layout aus `SmartProductBlock.tsx` und **`FeaturedProductsSlider.tsx`** nachbauen).
   - Validierung: Wenn `enabled=true` und `affiliate_url` leer → Warnung „Produkt wird ohne Link nicht ausgespielt".
3. **NEU: Featured-Slider-Manager** (`/admin/products/featured`):
   - Drag-&-Drop-Liste aller aktuell `is_featured=true` Produkte, sortiert nach `featured_order`.
   - Beim Drag werden die `featured_order`-Werte automatisch neu gespeichert (1, 2, 3...).
   - Live-Vorschau des Sliders rechts (gleiche Card-Optik wie in der App).
   - Schnell-Aktionen pro Eintrag: „Aus Slider entfernen" (setzt `is_featured=false`), „Bearbeiten".
4. **Neues Produkt anlegen** (gleiche Form, leer).
5. **Klick-Analytics** (`/admin/products/analytics`):
   - Recharts-Bar: Klicks Top-10 Produkte (7 Tage, 30 Tage, all-time).
   - **NEU: Separates Diagramm „Featured-Slider-Performance"** — Klicks gefiltert auf `context='featured_slider'`.
   - Tabelle: `product_id, title_de, clicks, last_click, CTR (Klicks / Recommendation-Impressions — vorerst nur Klicks)`.
6. **Vendor-Management** (kleine Tabelle): häufige Vendor-Namen vorschlagen (Autocomplete), keine eigene Collection nötig — nur Distinct aus `smart_products`.

### P1 — Protein-Routine-Inspector
1. **Nutzerliste** (`/admin/users`): Suche nach E-Mail oder `profile_id`, zeigt für jeden User:
   - Aktiver Plan (fast_start, fast_duration_hours, eating_window).
   - Heutiger Day-Plan-Fortschritt (Progress %, erledigte Events).
   - Letzter Wiegeeintrag, aktuelle Tagesziele (kcal/Protein).
2. **User-Detail** (`/admin/users/{profile_id}`):
   - Timeline-Vorschau (read-only) mit `target_calories` und `target_protein_g` pro Event.
   - 7-Tage-Adherence-Chart (Anteil erledigter `day_plan_checkins`).
   - Wassertracking-Log (Quelle: `day_plan_<event_key>` vs. manuell).
3. **Goal-Override** (Notfall-Tool, mit Audit-Log): `PUT /weight-metabolism/{pid}/goals` aufrufen können.

### P2 — System-Insights
1. **LLM-Cache-Übersicht** (`/admin/llm-cache`): Tabelle `meal_coach_cache` mit Kommentaren, Tone-Verteilung, Hit-Rate.
2. **Health-Check-Dashboard:** Anzahl aktiver Routinen, Klicks heute, Push-Notifications (falls server-side getrackt).

---

## 6. Backend-Erweiterungen, die du sauber hinzufügen darfst

Lege Admin-spezifische Endpoints in einer neuen Datei `/app/backend/routes/admin.py` an, geschützt mit JWT-Admin-Middleware. Beispiele:

- `GET  /api/admin/users?search=&limit=&skip=` → paginierte Nutzerliste mit aggregierten Feldern (Plan, letzter Login, Punkte, Streak).
- `GET  /api/admin/users/{profile_id}/snapshot` → kompakter Snapshot (Profil + Plan + letzter Day-Plan + Klicks).
- `GET  /api/admin/products/impressions?from=&to=` → nur falls Impressionen-Tracking eingeführt wird.
- `POST /api/admin/products/{id}/toggle-enabled`

> **MongoDB-Pflicht:** Pydantic-Response-Models verwenden, `_id` ausschließen, Dates ISO-strings.

---

## 7. UI-Design-Richtlinien

- **Look & Feel:** „Apple-Health-meets-Linear" — heller Hintergrund, sehr großzügige Whitespaces, abgerundete Cards (16–24px), feine Borders (`border-zinc-200`), Akzentfarbe **Violett** (Brand-Farbe der App: `#7C3AED`).
- **Typografie:** Inter wirkt zu generisch — verwende **Geist Sans** oder **Plus Jakarta Sans**.
- **Tabellen:** dichte Darstellung, sticky Header, sortable Spalten.
- **Mobil:** Admin ist Desktop-First, aber bricht ab `md:` sauber um.
- **Empty States:** mit Lucide-Icon + erklärendem Text + Primary-CTA.
- **Toasts:** sonner.

---

## 8. Sicherheits- & Code-Regeln

1. **Niemals** API-Keys oder Mongo-Credentials im Frontend-Code.
2. **JWT** prüfen auf jedem Admin-Endpoint, Rolle `is_admin: true` im `users`-Dokument.
3. **CORS:** Admin-Domain in der Backend-CORS-Whitelist eintragen.
4. **Audit-Log:** Jede schreibende Aktion (Produkt-Edit, Goal-Override) in `admin_audit_log` (`{admin_user_id, action, target_collection, target_id, before, after, ts}`) protokollieren.
5. **Idempotenz:** PUT-Endpoints müssen mehrfach aufrufbar sein, ohne Daten zu duplizieren.
6. **Validation:** Server-Side mit Pydantic, Client-Side mit zod.

---

## 9. Test-Checkliste pro Feature

- [ ] Listing lädt < 500 ms bei 1.000 Zeilen (Pagination).
- [ ] Editor speichert, Reload zeigt geänderte Werte.
- [ ] Live-Vorschau spiegelt API-Response exakt.
- [ ] Klick-Stats stimmen mit `smart_product_clicks` Aggregation überein.
- [ ] Audit-Log-Eintrag bei jeder Schreib-Aktion.
- [ ] Mobile-View bricht nicht.
- [ ] Backend-Tests in `/app/backend/tests/test_admin_*.py`.

---

## 10. Reihenfolge der Umsetzung (Empfehlung)

1. **Auth + Admin-Layout** (Sidebar, Login, Logout, Audit-Log-Foundation).
2. **Smart-Products-Manager** (Listing → Editor → Analytics).
3. **Protein-Routine-Inspector** (Nutzerliste → Detail).
4. **System-Insights**.
5. **Polish, Empty-States, Charts**.

---

## 11. Was du **nicht** tust

- Keine Änderungen an der Mobile-App (`/app/frontend/...`).
- Keine Migration bestehender Collections — nur additiv.
- Keine LLM-Calls aus dem Admin-Frontend (nur über Backend-Endpoints).
- Keine Zerstörung von Platzhalter-Produkten beim Befüllen — nur `affiliate_url` setzen und `is_placeholder=false` flippen.

---

> **Ende des Prompts.** Bei Fragen oder fehlenden Endpoints: erst dokumentieren, dann im FastAPI-Backend ergänzen, dann im Admin nutzen.

---

# 🆕 Update vom 13.05.2026 — „Abnehm-Guide" Phase 1–3

Die Sektion in der Mobile-App **„Gewicht & Stoffwechsel" wurde umbenannt in „Abnehm-Guide"** (DE) / „Slim guide" (EN) / „Guida dimagrante" (IT) und massiv erweitert um ein geführtes Coaching-System. Folgende neue Datenpunkte sind für das Admin-Web relevant:

## A. Neue Backend-Endpoints (alle bereits live)

### A.1 Achievements / Streak — Phase 1
- `GET /api/weight-metabolism/{profile_id}/achievements`
- Response-Shape:
  ```json
  {
    "current_streak": 5,                 // Tage in Folge mit ≥1 day_plan_checkin
    "longest_streak": 12,
    "today_protein_done": true,          // protein_g >= daily_protein
    "today_calories_done": false,        // kcal innerhalb 90–110% Band
    "today_water_done": true,            // water_intake_logs heute ≥1500ml
    "today_full_plan_done": false,       // alle 4 day_plan_checkins heute
    "today_water_ml": 1700,
    "today_checks": 2,                   // erledigte Steps heute
    "total_steps": 4,
    "badges": [
      {"id":"streak_3","label_de":"3 Tage in Folge","icon":"fire","achieved":true,"value":5},
      {"id":"protein_goal","label_de":"Protein-Ziel erreicht","icon":"dumbbell","achieved":true,"value":175},
      {"id":"full_plan","label_de":"Heute voll im Plan","icon":"check-circle","achieved":false,"value":2},
      {"id":"water_goal","label_de":"Wasser-Ziel erreicht","icon":"cup-water","achieved":true,"value":1700}
    ]
  }
  ```
- **Im Admin nutzbar für:** Engagement-Dashboard (Streak-Verteilung, Anteil Nutzer mit „today_full_plan_done", Top-Streak-Leaderboard).

### A.2 Erweiterter Weight-History-Endpoint — Phase 2
- `GET /api/weight-metabolism/{profile_id}/weight/history?days=30`
- **Neue Felder (zusätzlich zu bestehenden `entries`, `current_kg`, `delta_kg`, `target_kg`, `days`):**
  - `week_avg_kg` (7-Tage Durchschnitt)
  - `prev_week_avg_kg` (Durchschnitt der davorliegenden 7 Tage)
  - `week_delta_kg` (Δ zwischen den beiden Wochen)
  - `trend` — einer von `down` / `up` / `stable` / `unknown` (|Δ|<0.2 kg = stable)
  - `hint_key` — einer von `good_progress` / `stay_consistent` / `stable_is_normal` / `more_data_needed`
  - `entries_last_week` (Anzahl Einträge in den letzten 7 Tagen)
- **Im Admin nutzbar für:** Cohort-Trend-Auswertung (% User mit `trend='down'` in den letzten 30 Tagen, Plateau-Alarm bei >14 Tagen stable).

### A.3 Erweiterte KI-Fotoanalyse — Phase 2
- `POST /api/weight-metabolism/{profile_id}/analyze-meal-photo`
- **Neues Feld in der Response: `coach_line`** (kontextbezogener Coach-Text basierend auf verbleibendem Protein-Tagesziel, eine von 5 Stufen: erreicht / fast erreicht / passt gut / solide / wenig Protein).
- Das Feld wird im Admin **nicht aktiv geschrieben**, kann aber für Quality-Reviews der LLM-Outputs gezeigt werden.

## B. Neue Daten-Verknüpfungen und Auswertungsideen

| Auswertung | Quelle | Empfohlenes Admin-Widget |
|---|---|---|
| **Streak-Verteilung der aktiven Nutzer** | `day_plan_checkins` aggregiert | Histogramm (0, 1-2, 3-6, 7-13, 14+ Tage) |
| **Top 10 Streaks** | `day_plan_checkins` | Tabelle mit `profile_id`, `email`, `current_streak`, `longest_streak` |
| **Heutige Adherence** | `day_plan_checkins` heute | Donut: % User mit `today_full_plan_done=true` |
| **Wasser-Compliance** | `water_intake_logs` heute | KPI-Kachel: % User ≥1500ml |
| **Plateau-Liste** | `weight_log` mit `trend='stable'` & `week_avg_kg unverändert ≥14 Tage` | Tabelle mit Re-Engagement-Trigger |
| **Trend-Verteilung** | `weight_log` aggregiert per User | Stacked-Bar: down/stable/up Anteile pro Woche |

## C. Neue Frontend-Features in der App (nur zur Kenntnis — keine Admin-Aktion nötig)

Damit der Admin-Agent das mentale Modell der App kennt:

1. **6-Karten Educational Guide** (Modal): wird beim ersten Besuch der „Abnehm-Guide"-Sektion automatisch geöffnet. Inhalte sind **hardcoded im Frontend** (`/app/frontend/components/AbnehmGuideModal.tsx`) — nicht aus der DB. Falls in Zukunft CMS-Steuerung gewünscht: neuen Endpoint `GET /api/abnehm-guide/cards` einführen + Collection `abnehm_guide_cards`.
2. **Phasen-Erklärungs-Cards** (Proteinphase / Essensfenster) unter dem Fasten-Kreis: rein visuell, keine DB-Bindung.
3. **Heißhunger-Coach-Hinweise** unter jedem Timeline-Event: statisch im Frontend (`coachLineFor` map). Falls dynamisch gewünscht: pro `event_key` ein Feld in `protein_routine_settings` oder neue Collection.
4. **Achievements-Card** in der App: rendert direkt aus `/achievements` (s. A.1). Keine Admin-Aktion nötig — aber das Admin sollte die Aggregations-Statistik darstellen.
5. **Wochen-Übersicht (Ø + Trend + Hinweis)** in der App: rendert direkt aus dem erweiterten Weight-History-Endpoint (s. A.2).
6. **KI-Foto-Coach-Zeile**: rendert direkt aus dem `coach_line` Feld (s. A.3).
7. **Einklappbare Sektionen** (Mahlzeiten / Gewicht / Empfehlungen): rein UI, keine DB.
8. **Routine-Mahlzeit-Templates** (Quick-Add im Meal-Picker): aktuell **hardcoded im Frontend** als 4 Presets (Standard Shake 320kcal/35g, Protein Bowl 480/38, Hähnchen Reis 620/45, Skyr Snack 180/22). Falls CMS-Steuerung gewünscht: neue Collection `meal_templates` mit Feldern `{id, name_de/it/en, calories, protein_g, meal_type, icon, color, sort_order, enabled}` + `GET /api/meal-templates` Endpoint.
9. **Per-Step Product Chip** (Empfehlungs-Chip pro Timeline-Event): aktuell **statisch im Frontend** mit Mapping shake1→Protein-Mix, shake2→Protein-Boost, small_meal→Protein-Snack, large_meal→Elektrolyt-Komplex. Tap → expandiert die Empfehlungen-Sektion (kein direkter Produktlink). Falls dynamisch gewünscht: nutze die bestehenden `smart_products.contexts[]` und erweitere um Werte wie `step_shake1`, `step_shake2`, `step_small_meal`, `step_large_meal`.

## D. Empfohlene neue Admin-Module (Erweiterung von Abschnitt 5)

### P0 (sofort, ergänzend zum bestehenden Smart-Products-Manager)

**D.1 „Abnehm-Guide CMS" (neue Admin-Seite `/admin/abnehm-guide`)**
- Tab 1: **Guide-Karten** — bearbeitbare Tabelle der 6 Karten (Titel + Text DE/IT/EN, Icon, Farbe, Reihenfolge). 
  - Backend-Erweiterung erforderlich: Neue Collection `abnehm_guide_cards` + `GET/PUT /api/admin/abnehm-guide/cards`.
- Tab 2: **Meal-Templates** — bearbeitbare Tabelle der 4 Schnellzugriffs-Templates (Name DE/IT/EN, kcal, Protein, Icon, Farbe, sort_order, enabled).
  - Backend-Erweiterung erforderlich: Neue Collection `meal_templates` + `GET/PUT /api/admin/meal-templates`. Mobile-App muss auf den Endpoint umgestellt werden, dafür ein kleiner Sprint nötig.
- Tab 3: **Coach-Lines pro Event** — Mapping `{event_key, text_de, text_it, text_en}` für Heißhunger-Hinweise und Per-Step Product Hints.

**D.2 „Engagement-Insights" (neuer Bereich in `/admin/users` und neues Top-Level `/admin/engagement`)**
- KPI-Kacheln oben:
  - „Aktive Nutzer heute" (User mit ≥1 day_plan_checkin heute)
  - „Ø Streak aktive Nutzer"
  - „Heute Wasser-Ziel erreicht" (% User mit today_water_done)
  - „Tagesplan voll erledigt" (% User mit today_full_plan_done)
- Diagramme:
  - Streak-Histogramm (0 / 1-2 / 3-6 / 7-13 / 14+)
  - 30-Tage-Trend „Anteil mit `trend=down`" pro Woche
- Tabelle „Plateau-Risiko" (Liste der User mit `trend='stable'` ≥14 Tage) → Trigger für Re-Engagement-Push.

### P1 — Nice-to-have

**D.3 „Achievements-Engine-Settings" (`/admin/achievements`)**
- Konfigurierbare Schwellwerte (aktuell hartcodiert im Backend):
  - `streak_3` → 3 Tage in Folge (anpassbar auf 5? 7?)
  - `water_goal` → 1500ml (anpassbar auf 2000? 2500?)
  - `today_calories_done` → Band 90-110% (anpassbar auf 85-115%?)
- Neue Collection `achievement_config` + Endpoint, das `weight_metabolism.get_achievements` einließt.

**D.4 „Push-Re-Engagement-Trigger"**
- Bei Plateau ≥14 Tage: automatischer Push „Schau dir deine Wochenbilanz an" (mit Deep-Link zur Wochenübersicht).
- Bei Streak-Bruch (gestern aktiv, heute 0 Checks): „Komm zurück in die Routine" Push.
- Konfiguration im Admin: an/aus, Zeitfenster, Anzahl pro Woche.

## E. Read-/Write-Matrix für neue Auswertungen

| Quelle | Lese-Zugriff (Admin OK) | Schreib-Zugriff |
|---|---|---|
| `day_plan_checkins` | ✅ über Backend-Aggregate-Endpoint (NEU `/api/admin/engagement/streaks`) | ❌ nie schreibend aus Admin |
| `water_intake_logs` | ✅ über `/api/admin/engagement/water-stats` (NEU) | ❌ nie schreibend |
| `weight_log` | ✅ über erweitertes `/weight/history` oder neuen `/api/admin/users/{pid}/weight-trend` | ❌ nur User selbst |
| `abnehm_guide_cards` (NEU) | ✅ | ✅ (Admin CMS) |
| `meal_templates` (NEU) | ✅ | ✅ (Admin CMS) |
| `achievement_config` (NEU) | ✅ | ✅ (Admin Settings, mit Audit-Log) |

## F. Migrationsplan für neue Collections (additiv, keine Breaking Changes)

1. **Phase A (woche 1):**
   - Backend: Collections `abnehm_guide_cards`, `meal_templates`, `achievement_config` anlegen mit Default-Seed-Daten (gespiegelt aus den aktuellen Frontend-Constants).
   - Backend: Endpoints `GET/PUT /api/admin/abnehm-guide/cards`, `GET/PUT /api/admin/meal-templates`, `GET/PUT /api/admin/achievement-config`.
   - Admin-Web: 3 CMS-Tabs unter `/admin/abnehm-guide`.

2. **Phase B (woche 2):**
   - Mobile-App: `AbnehmGuideModal.tsx` und Meal-Templates-Const umstellen, von API zu fetchen (mit Caching). Fallback auf Frontend-Constants, falls API offline.
   - Mobile-App: Coach-Lines aus `coach_lines_settings` (neue Collection) lesen.

3. **Phase C (woche 3):**
   - Admin-Web: Engagement-Dashboard mit Aggregate-Endpoints.
   - Push-Re-Engagement-Trigger.

## G. Wichtige Hinweise für die Implementierung

1. **Streak-Berechnung (Backend, Referenz):** Siehe `/app/backend/routes/weight_metabolism.py::get_achievements()` — die Logik scannt die letzten 500 `day_plan_checkins`-Dates, läuft rückwärts ab heute. Behalte diese Logik bei. Wenn du eine Admin-Aggregate machst, nutze MongoDB-Aggregation, **nicht** einen Loop über alle User.
   - Beispiel-Pipeline für „Top 10 aktuelle Streaks":
     ```python
     db.day_plan_checkins.aggregate([
       {"$sort": {"profile_id": 1, "date": -1}},
       {"$group": {"_id": "$profile_id", "dates": {"$push": "$date"}}},
       # ... Streak-Logik clientseitig nach $group, dann sort+limit
     ])
     ```

2. **Achievements im Admin nie cachen länger als 5 Minuten** — Echtzeit-Charakter ist wichtig.

3. **Audit-Log Pflicht** für:
   - Änderungen an `abnehm_guide_cards`
   - Änderungen an `meal_templates`
   - Änderungen an `achievement_config`
   - Trigger-Toggle für Re-Engagement-Pushes

4. **i18n der CMS-Inhalte:** Alle Texte mehrsprachig DE/IT/EN. Bei fehlender Übersetzung Fallback auf DE.

5. **Performance:** Engagement-Aggregate-Endpoints müssen Mongo-Indexe auf `(profile_id, date)` haben — sind bereits durch `ensure_indexes()` im Backend angelegt.

## H. Test-Checkliste für die neuen Module

- [ ] `GET /api/admin/abnehm-guide/cards` liefert 6 Karten mit DE/IT/EN-Texten.
- [ ] `PUT /api/admin/abnehm-guide/cards/{id}` aktualisiert die Karte; Mobile-App-Fetch sieht die Änderung innerhalb der Cache-TTL (max 5 Min).
- [ ] `PUT /api/admin/meal-templates/{id}` mit `enabled=false` entfernt den Quick-Add-Chip aus der App.
- [ ] `PUT /api/admin/achievement-config` mit `streak_3.threshold=5` ändert die Badge-Logik im nächsten Achievements-Fetch.
- [ ] Engagement-Dashboard zeigt korrekte Streak-Histogramm-Daten (cross-check via manuelle Mongo-Aggregate).
- [ ] Plateau-Liste enthält nur User mit `trend='stable'` UND `entries_last_week ≥ 3`.
- [ ] Audit-Log für jede CMS-Edit-Aktion vorhanden.
- [ ] Mobile-App fällt auf Frontend-Constants zurück bei Admin-Endpoint-Outage (Resilience).

---

> **Ende des Updates.** Diese Datei ist die Single Source of Truth für den Admin-Agent. Bei Konflikten zwischen Original-Prompt und Update gilt das Update.

