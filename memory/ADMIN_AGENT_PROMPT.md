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
| `day_plan_checkins` | Erledigte Timeline-Events | `profile_id, date, event_key (shake1/small_meal/shake2/large_meal), checked_at` |
| `water_intake_logs` | Wasserprotokoll | `id, profile_id, date, amount_ml, source` |
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
