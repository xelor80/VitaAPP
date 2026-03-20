# VitaGuide Admin Dashboard – Komplettes Briefing fuer Kundenverwaltung

## Ueberblick
Das Admin Dashboard soll eine vollstaendige Verwaltung aller Kundendaten ermoeglichen. Die Daten liegen in einer MongoDB Atlas Instanz (DB: `test_database`). Das Backend (FastAPI) stellt bereits einige Admin-Endpoints bereit, weitere muessen ergaenzt werden.

---

## 1. BESTEHENDE Admin API Endpoints (bereits vorhanden)

Alle Endpoints haben Prefix `/api/admin/` und erfordern den Header `X-Admin-Password: Wk220480xel!`

### Allgemein
- `GET /api/admin/health` – Systemstatus
- `GET /api/admin/stats` – Uebersichtsstatistiken (Anzahl Profile, Analysen, Produkte, Rezepte)
- `GET /api/admin/user-stats` – Detaillierte Nutzerstatistiken

### Produkte
- `GET /api/admin/products?lang=de&search=&skip=0&limit=50` – Produktliste
- `POST /api/admin/products` – Produkt erstellen
- `PUT /api/admin/products/{product_id}` – Produkt bearbeiten
- `DELETE /api/admin/products/{product_id}` – Produkt loeschen

### Rezepte
- `GET /api/admin/recipes?search=&category=&active_only=&skip=0&limit=50`
- `POST /api/admin/recipes` – Rezept erstellen
- `PUT /api/admin/recipes/{recipe_id}` – Rezept bearbeiten
- `DELETE /api/admin/recipes/{recipe_id}` – Rezept loeschen
- `PATCH /api/admin/recipes/{recipe_id}/toggle` – Rezept aktivieren/deaktivieren
- `POST /api/admin/recipes/generate` – KI-Rezeptgenerierung

### Klick-Tracking
- `GET /api/admin/clicks?days=7&skip=0&limit=100`

### LLM Logs
- `GET /api/admin/llm-logs?limit=20&endpoint=`

### Rewards System (bereits vorhanden, siehe REWARDS_SYSTEM_BRIEFING.md)
- `GET /api/rewards/admin/settings` – Punkteregeln lesen
- `PUT /api/rewards/admin/settings` – Punkteregeln aendern
- `GET /api/rewards/admin/catalog` – Praemienkatalog verwalten
- `POST /api/rewards/admin/catalog` – Praemie erstellen
- `PUT /api/rewards/admin/catalog/{item_id}` – Praemie bearbeiten
- `DELETE /api/rewards/admin/catalog/{item_id}` – Praemie loeschen
- `GET /api/rewards/admin/analytics` – Rewards-Analytik

---

## 2. NEUE Endpoints (muessen im Backend erstellt werden)

### 2.1 Kundenverwaltung (Users)

```
GET /api/admin/users?search=&skip=0&limit=50
```
Liefert alle registrierten Nutzer mit Pagination und Suchfunktion (nach Email, Name).

```
GET /api/admin/users/{user_id}
```
Detailansicht eines Nutzers inkl. verlinktem Gesundheitsprofil.

```
DELETE /api/admin/users/{user_id}
```
Nutzer loeschen (und Verknuepfung zum Profil aufheben).

### 2.2 Gesundheitsprofile

```
GET /api/admin/profiles?search=&skip=0&limit=50
```
Alle Gesundheitsprofile mit Pagination. Zeigt Basis-Daten (Name, Alter, Geschlecht, Beschwerden).

```
GET /api/admin/profiles/{profile_id}
```
Komplettes Profil mit allen Details.

```
GET /api/admin/profiles/{profile_id}/activity
```
Aktivitaets-Uebersicht: Letzte Wasser-Eintraege, Supplement-Check-ins, Symptom-Tracking, Punkte.

### 2.3 Nutzer-Aktivitaet & Analytics

```
GET /api/admin/analytics/overview
```
Dashboard-Uebersicht: Aktive Nutzer (7/30 Tage), Registrierungen pro Woche, beliebteste Supplements, durchschnittliche Punkte.

```
GET /api/admin/analytics/engagement
```
Engagement-Daten: Durchschnittliche Streak-Laenge, taegliche Wassererfuellung, Supplement-Compliance-Rate.

---

## 3. DATENBANK-COLLECTIONS & SCHEMA

### 3.1 `users` (Registrierte Nutzer)
```json
{
  "user_id": "user_70071c56d754",
  "email": "nutzer@email.de",
  "password_hash": "...",
  "first_name": "Max",
  "picture": "https://...",
  "profile_id": "f97fdefb-...",
  "auth_provider": "email",
  "google_id": "...",
  "created_at": "2026-03-20T10:17:27",
  "last_login": "2026-03-20T10:17:29"
}
```
**Wichtig**: `password_hash` NIEMALS im Admin Dashboard anzeigen oder exportieren!

### 3.2 `health_profiles` (Gesundheitsprofile)
```json
{
  "id": "f97fdefb-c81f-4d01-8d02-e38dd2132e74",
  "age": 45,
  "gender": "male",
  "height": "180",
  "weight": "85",
  "diet": "omnivore",
  "activity_level": "moderate",
  "sleep_quality": "moderate",
  "sleep_duration": "6-7",
  "sleep_issues": [],
  "stress_level": "moderate",
  "stress_type": [],
  "energy_level": "moderate",
  "conditions": [],
  "medications": [],
  "allergies": [],
  "intolerances": [],
  "goals": [],
  "symptoms": [],
  "first_name": "Max",
  "last_name": "Muster",
  "user_id": "user_70071c56d754",
  "lang": "de",
  "created_at": "2026-03-19T...",
  "updated_at": "2026-03-20T..."
}
```

### 3.3 `supplement_plans` (Supplement-Plaene)
```json
{
  "profile_id": "f97fdefb-...",
  "id": "plan_abc123",
  "lang": "de",
  "plan": [
    {
      "id": "supp_1",
      "name_de": "Vitamin D3",
      "name_it": "Vitamina D3",
      "dosage": "2000 IU",
      "timing": "morgens",
      "reason_de": "Unterstuetzt das Immunsystem",
      "reason_it": "Supporta il sistema immunitario",
      "duration_weeks": 8,
      "priority": "high",
      "category": "vitamin"
    }
  ],
  "reminders": true,
  "created_at": "...",
  "updated_at": "..."
}
```

### 3.4 `medications` (Medikamente)
```json
{
  "id": "med_abc123",
  "profile_id": "f97fdefb-...",
  "name": "Ibuprofen",
  "dosage": "400",
  "unit": "mg",
  "timings": ["morgens", "abends"],
  "frequency": "daily",
  "specific_days": [],
  "notes": "Nach dem Essen einnehmen",
  "active": true,
  "created_at": "..."
}
```

### 3.5 `medication_logs` (Medikamenten-Einnahme-Protokoll)
```json
{
  "profile_id": "f97fdefb-...",
  "medication_id": "med_abc123",
  "date": "2026-03-20",
  "timing": "morgens",
  "taken_at": "2026-03-20T08:30:00"
}
```

### 3.6 `water_tracking` (Wasseraufnahme)
```json
{
  "date": "2026-03-20",
  "profile_id": "f97fdefb-...",
  "entries": [
    { "ml": 250, "time": "08:30", "type": "Wasser" },
    { "ml": 300, "time": "12:00", "type": "Tee" }
  ],
  "total_ml": 550
}
```

### 3.7 `water_goals` (Wasserziel)
```json
{
  "profile_id": "f97fdefb-...",
  "auto_calculated": true,
  "daily_goal_ml": 2500
}
```

### 3.8 `compliance_tracking` (Supplement-Compliance)
```json
{
  "date": "2026-03-20",
  "profile_id": "f97fdefb-...",
  "supplements": {
    "supp_1": { "taken": true, "timing": "morgens" },
    "supp_2": { "taken": false }
  },
  "updated_at": "..."
}
```

### 3.9 `supplement_check_ins` (Supplement Check-ins)
```json
{
  "profile_id": "f97fdefb-...",
  "date": "2026-03-20",
  "supplement_ids": ["supp_1", "supp_2"],
  "timing": "morgens",
  "taken_at": "2026-03-20T08:15:00"
}
```

### 3.10 `symptom_tracking` (Symptom-Verlauf)
```json
{
  "date": "2026-03-20",
  "profile_id": "f97fdefb-...",
  "notes": "Kopfschmerzen besser",
  "overall": 7,
  "ratings": {
    "Schlaf": 8,
    "Energie": 6,
    "Verdauung": 7
  },
  "updated_at": "..."
}
```

### 3.11 `health_assessments` (KI-Gesundheitsbewertungen)
```json
{
  "id": "assess_abc123",
  "profile_id": "f97fdefb-...",
  "assessment": "...",
  "risk_scores": {},
  "created_at": "..."
}
```

### 3.12 `health_score_history` (Gesundheitsscore-Verlauf)
```json
{
  "date": "2026-03-20",
  "profile_id": "f97fdefb-...",
  "score": 72,
  "categories": {
    "Ernaehrung": 75,
    "Schlaf": 60,
    "Bewegung": 80,
    "Stress": 65
  },
  "timestamp": "..."
}
```

### 3.13 `user_points` (Punkte-Guthaben)
```json
{
  "profile_id": "f97fdefb-...",
  "current_balance": 25,
  "lifetime_points": 75,
  "redeemed_points": 50,
  "last_updated": "2026-03-20T09:00:49"
}
```

### 3.14 `user_streaks` (Streaks)
```json
{
  "profile_id": "f97fdefb-...",
  "current_streak": 3,
  "longest_streak": 14,
  "last_activity_date": "2026-03-20"
}
```

### 3.15 `reward_events` (Punkte-Transaktionslog)
```json
{
  "id": "evt_abc123",
  "profile_id": "f97fdefb-...",
  "action": "water_confirm",
  "points": 5,
  "date": "2026-03-20",
  "timestamp": "2026-03-20T09:00:49",
  "context": {}
}
```

### 3.16 `reward_redemptions` (Eingeloeste Praemien)
```json
{
  "id": "red_abc123",
  "profile_id": "f97fdefb-...",
  "reward_id": "6df1e49a-...",
  "reward_title": "10 Euro Gutschein",
  "points_spent": 500,
  "redeemed_at": "2026-03-20T...",
  "status": "active",
  "code": "VITA-ABC123"
}
```

### 3.17 `rewards_catalog` (Praemienkatalog)
```json
{
  "id": "6df1e49a-...",
  "title_de": "10 Euro Gutschein",
  "title_it": "Buono da 10 Euro",
  "title_en": "10 Euro Voucher",
  "description_de": "...",
  "description_it": "...",
  "description_en": "...",
  "image_url": "https://...",
  "points_required": 500,
  "status": "active",
  "code_template": "VITA-{RANDOM}",
  "start_date": "2026-02-01",
  "end_date": "2026-12-31",
  "created_at": "...",
  "updated_at": "..."
}
```

### 3.18 `reward_settings` (Belohnungsregeln – Singleton)
```json
{
  "action_points": {
    "water_confirm": 5,
    "water_goal": 10,
    "supplement": 8,
    "medication": 8,
    "diary": 12,
    "daily_checkin": 5,
    "complete_day": 25,
    "streak_7": 50,
    "streak_14": 100
  },
  "daily_limits": {
    "max_total": 200,
    "max_water_confirm": 30,
    "max_supplement": 40,
    "max_medication": 40
  },
  "enabled": true,
  "created_at": "...",
  "updated_at": "..."
}
```

### 3.19 `products_de` / `products_it` (Produktkatalog)
```json
{
  "product_id": "prod_abc",
  "name": "Vitamin D3 2000 IU",
  "description": "...",
  "affiliate_url": "https://...",
  "tags": ["vitamin-d", "immunsystem"],
  "price": 19.90,
  "rating": 4.5,
  "image_url": "https://...",
  "beschreibung": "...",
  "inhaltsstoffe": "...",
  "zutaten": "...",
  "hinweise": "..."
}
```

### 3.20 `analyses` (KI-Analysen) – 283 Dokumente
### 3.21 `click_events` / `clicks` (Affiliate-Klicks) – 57 Dokumente
### 3.22 `llm_responses` (LLM-Audit-Log) – 201 Dokumente
### 3.23 `diary` / `diary_entries` (Tagebuch) – 6 Dokumente
### 3.24 `recipes` (Rezepte) – 40 Dokumente

---

## 4. ADMIN DASHBOARD SEITEN (zu erstellen)

### 4.1 Dashboard / Uebersicht
- **Statistiken**: Registrierte Nutzer, aktive Nutzer (7/30 Tage), Gesamtpunkte vergeben, Praemien eingeloest
- **Schnellzugriff-Karten**: Letzte Registrierungen, Top-Nutzer nach Punkten, Durchschnittlicher Health-Score
- **Charts**: Registrierungen pro Woche, Aktive Nutzer pro Tag, Punkte-Vergabe Trend

### 4.2 Kundenverwaltung
- **Tabelle**: user_id, Email, Name, Auth-Provider, Profil-ID, Registriert am, Letzter Login
- **Suche**: Nach Email oder Name
- **Filter**: Nach Auth-Provider (email/google), nach Zeitraum
- **Detail-Ansicht** (Klick auf Nutzer):
  - Account-Daten (Email, Provider, Erstellt, Letzter Login)
  - Gesundheitsprofil (Alter, Geschlecht, Beschwerden, Ziele, Diaet)
  - Supplement-Plan (aktuelle Empfehlungen)
  - Medikamente (aktive Medikamente mit Dosierung)
  - Wasser-Tracking (heutiger Stand, Wochenverlauf)
  - Punkte & Rewards (Balance, Streak, letzte Aktivitaeten)
  - Symptom-Verlauf (letzte 7 Eintraege)
  - Health-Score (aktueller Score + Verlauf)

### 4.3 Gesundheitsprofile (ohne Account)
- Zeigt Profile, die noch keinem User-Account zugeordnet sind
- Nuetzlich um zu sehen, wie viele Nutzer die App ohne Registrierung nutzen

### 4.4 Rewards-Verwaltung
- Praemienkatalog CRUD
- Punkteregeln bearbeiten
- Analytics (Punkte vergeben/eingeloest, beliebteste Aktionen)

### 4.5 Produkte & Rezepte
- Produktkatalog verwalten (DE + IT)
- Rezepte verwalten (CRUD + KI-Generierung)

### 4.6 Analytics & Reports
- Engagement: Streak-Laenge, aktive Nutzer, Compliance-Rate, Wasser-Ziel-Erreichung
- Punkte-Analytics: Vergabe pro Tag, beliebteste Aktionen, Einloese-Rate
- LLM-Nutzung: API-Kosten, meistgenutzte Endpoints

---

## 5. VERKNUEPFUNGEN ZWISCHEN COLLECTIONS

```
users.profile_id ──> health_profiles.id
health_profiles.id ──> supplement_plans.profile_id
health_profiles.id ──> medications.profile_id
health_profiles.id ──> medication_logs.profile_id
health_profiles.id ──> water_tracking.profile_id
health_profiles.id ──> water_goals.profile_id
health_profiles.id ──> compliance_tracking.profile_id
health_profiles.id ──> supplement_check_ins.profile_id
health_profiles.id ──> symptom_tracking.profile_id
health_profiles.id ──> health_assessments.profile_id
health_profiles.id ──> health_score_history.profile_id
health_profiles.id ──> user_points.profile_id
health_profiles.id ──> user_streaks.profile_id
health_profiles.id ──> reward_events.profile_id
health_profiles.id ──> reward_redemptions.profile_id
health_profiles.id ──> product_selections.profile_id
```

**WICHTIG**: Das Verbindungsfeld in `health_profiles` heisst `id` (nicht `profile_id`!). Alle anderen Collections verwenden `profile_id` als Fremdschluessel.

---

## 6. AUTHENTIFIZIERUNG

Alle Admin-Endpoints nutzen den Header:
```
X-Admin-Password: Wk220480xel!
```

---

## 7. TECHNISCHE HINWEISE

- **MongoDB Atlas**: Connection via `CUSTOM_MONGO_URL` in Backend `.env`
- **Datenbank**: `test_database`
- **Backend**: FastAPI (Python 3.11)
- **Admin Dashboard**: Separates React-Webprojekt
- **Sprachen**: Daten existieren in DE und IT
- **ObjectId**: Alle API-Responses muessen `_id` excluden (`{"_id": 0}`)
- **Datumsformat**: ISO 8601

---

## 8. AKTUELLE DATENMENGEN (Stand: Maerz 2026)

| Collection | Anzahl |
|---|---|
| users | 10 |
| health_profiles | 80 |
| supplement_plans | 39 |
| medications | 3 |
| medication_logs | 5 |
| water_tracking | 9 |
| water_goals | 8 |
| compliance_tracking | 94 |
| supplement_check_ins | 17 |
| symptom_tracking | 98 |
| health_assessments | 82 |
| health_score_history | 41 |
| user_points | 12 |
| user_streaks | 11 |
| reward_events | 69 |
| reward_redemptions | 4 |
| rewards_catalog | 3 |
| products_de | 118 |
| products_it | 128 |
| recipes | 40 |
| analyses | 283 |
| llm_responses | 201 |
