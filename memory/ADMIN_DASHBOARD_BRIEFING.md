# VitaGuide Admin Web-Dashboard – Briefing fuer neuen Agenten

## Aufgabe
Baue ein **Admin Web-Dashboard** (React + FastAPI) fuer die VitaGuide Health Coach App.
Das Dashboard laeuft als eigenstaendige Web-App und verbindet sich mit der gleichen MongoDB wie die mobile App.

## Technologie
- **Frontend**: React (Vite), TailwindCSS, Recharts (fuer Diagramme)
- **Backend**: FastAPI (Python), MongoDB (Atlas)
- **Auth**: Passwort-basiert → Token → alle Admin-Requests mit `Authorization: Bearer <token>`

---

## Authentifizierung

**Login-Endpunkt (bereits vorhanden):**
```
POST /api/admin/auth
Body: {"password": "ADMIN_PASSWORD_FROM_ENV"}
Response: {"success": true, "token": "xxxxx"}
```
Alle weiteren Admin-Requests brauchen: `Authorization: Bearer <token>`

---

## Seiten & Funktionen

### 1. Dashboard (Startseite)
**Endpunkt:** `GET /api/admin/stats`
```json
{
  "products_de": 110,
  "products_it": 109,
  "recipes": 37,
  "analyses": 282,
  "affiliate_clicks": 32,
  "profiles": 77,
  "diary_entries": 2
}
```

**Endpunkt:** `GET /api/admin/user-stats`
```json
{
  "total_profiles": 77,
  "new_profiles_7d": 3,
  "active_users_7d": 5,
  "active_users_30d": 12,
  "compliance_rate_7d": 75.3,
  "total_analyses": 282,
  "registration_timeline": [{"month": "2025-12", "count": 5}],
  "work_types": [{"label": "buero", "count": 30}],
  "top_symptoms": [{"label": "Kopfschmerzen", "count": 45, "avg_intensity": 3.2}]
}
```

### 2. Rezepte verwalten
**CRUD Endpunkte:**
- `GET /api/admin/recipes?search=&category=&active_only=true&skip=0&limit=50`
  → `{"total": 37, "recipes": [...]}`
- `POST /api/admin/recipes` → Rezept erstellen
- `PUT /api/admin/recipes/{recipe_id}` → Rezept aktualisieren
- `DELETE /api/admin/recipes/{recipe_id}` → Rezept loeschen
- `PATCH /api/admin/recipes/{recipe_id}/toggle` → Aktiv/Inaktiv umschalten
- `GET /api/admin/recipes/categories` → Alle Kategorien
- `POST /api/admin/recipes/generate` → AI-generierte Rezepte (Body: `{"category":"smoothie","count":3,"focus":"proteinreich"}`)

**Rezept-Schema:**
```json
{
  "id": "gruener-power-smoothie",
  "de": {
    "title": "Gruener Power-Smoothie",
    "ingredients": ["200g Spinat", "1 Banane"],
    "steps": ["Alles in den Mixer geben.", "2 Minuten mixen."],
    "tags": ["glutenfrei", "vegan"]
  },
  "it": {
    "title": "Frullato Verde Energetico",
    "ingredients": ["200g di spinaci", "1 banana"],
    "steps": ["Mettere tutto nel frullatore.", "Frullare 2 minuti."],
    "tags": ["senza glutine", "vegano"]
  },
  "en": {
    "title": "Green Power Smoothie",
    "ingredients": ["200g spinach", "1 banana"],
    "steps": ["Add everything to blender.", "Blend for 2 minutes."],
    "tags": ["gluten-free", "vegan"]
  },
  "time_min": 10,
  "symptom_tags": ["energie", "immunsystem"],
  "image_url": "https://images.unsplash.com/...",
  "category": "smoothie",
  "active": true
}
```

**UI-Anforderungen:**
- Tabelle mit allen Rezepten (Titel DE/IT/EN, Kategorie, Status aktiv/inaktiv)
- Such- und Filterfunktion
- Bearbeitungs-Modal mit Tabs fuer DE/IT/EN Uebersetzungen
- Zutaten und Schritte als editierbare Liste
- Button "AI Rezepte generieren" mit Kategorie-Auswahl

### 3. Produkte & Affiliate-Links verwalten
**CRUD Endpunkte:**
- `GET /api/admin/products?lang=de&search=&skip=0&limit=50`
  → `{"total": 110, "products": [...]}`
- `POST /api/admin/products?lang=de` → Produkt erstellen
- `PUT /api/admin/products/{product_id}?lang=de` → Produkt aktualisieren
- `DELETE /api/admin/products/{product_id}?lang=de` → Produkt loeschen

**Produkt-Schema (DE):**
```json
{
  "product_id": "vitamin-d3-k2",
  "name": "Vitamin D3+K2 Tropfen",
  "description": "Hochdosiertes Vitamin D3 mit K2 MK7",
  "affiliate_url": "https://shop.example.com/vitamin-d3?ref=vitaguide",
  "tags": ["vitamin_d", "vitamin_k2", "immunsystem"],
  "price": "24.90",
  "rating": "4.8",
  "image_url": "https://...",
  "application_instructions": "Taeglich 1 Tropfen mit Fett einnehmen"
}
```

**Produkt-Schema (IT):**
```json
{
  "product_id": "vitamina-d3-k2",
  "name": "Vitamina D3+K2 Gocce",
  "description": "Vitamina D3 ad alto dosaggio con K2 MK7",
  "affiliate_url": "https://shop.example.it/vitamina-d3?ref=vitaguide",
  "video_url": "https://youtube.com/...",
  "tags": ["vitamin_d", "vitamin_k2"],
  "price": "28.90",
  "image_url": "https://..."
}
```

**UI-Anforderungen:**
- Zwei Tabs: Produkte DE / Produkte IT
- Tabelle mit Name, Preis, Affiliate-Link (klickbar), Tags
- Bearbeitungs-Modal mit allen Feldern
- Affiliate-URL prominent anzeigen und editierbar

### 4. Affiliate-Klick Statistiken
**Endpunkt:** `GET /api/admin/clicks?days=7`
```json
{
  "total_clicks": 32,
  "by_product": [{"_id": "vitamin-d3", "product_name": "Vitamin D3", "clicks": 15}],
  "by_country": [{"_id": "DE", "clicks": 20}],
  "by_day": [{"_id": "2026-03-15", "clicks": 5}],
  "by_hour": [{"_id": 14, "clicks": 8}]
}
```

**UI:** Diagramme (Line-Chart fuer Trend, Bar-Chart fuer Produkte, Pie-Chart fuer Laender)

### 5. Einstellungen
**Uebersetzungen:**
- `GET /api/settings/translations` → Alle UI-Texte
- `PUT /api/settings/translations/{key}` → Text aktualisieren (Body: `{"de":"Text","it":"Testo"}`)

**Symptom-Chips:**
- `GET /api/settings/symptom-chips` → `[{"id":"kopfschmerzen","de":"Kopfschmerzen","it":"Mal di testa","icon":"head"}]`
- `POST/PUT/DELETE /api/settings/symptom-chips/{chip_id}`

**Disclaimer:**
- `GET /api/settings/disclaimer` → Disclaimer-Texte DE/IT
- `PUT /api/settings/disclaimer/{lang}` → Disclaimer aktualisieren

**AI-Konfiguration:**
- `GET /api/settings/ai-config` → `{"provider":"openai","model":"gpt-4o","enabled":true}`
- `PUT /api/settings/ai-config`

### 6. LLM-Logs
**Endpunkt:** `GET /api/admin/llm-logs?limit=20`
```json
{
  "stats": {"total_calls": 196, "success_rate": "98.5%", "avg_latency_ms": 2300},
  "logs": [{"endpoint":"/analyze","model":"gpt-4o","success":true,"latency_ms":1850}]
}
```

---

## Datenbank-Collections (MongoDB)

| Collection | Docs | Wichtige Felder |
|---|---|---|
| recipes | 37 | id, de, it, en, symptom_tags, image_url, time_min, category, active |
| products_de | 110 | product_id, name, price, affiliate_url, tags, image_url, rating |
| products_it | 109 | product_id, name, price, affiliate_url, tags, video_url |
| health_profiles | 77 | id, age, gender, complaints, known_deficiencies, lang |
| analyses | 282 | id, summary, supplements, created_at |
| clicks | 32 | product_id, affiliate_url, timestamp, country |
| supplement_plans | 36 | profile_id, plan, reminders |
| compliance_tracking | 93 | date, profile_id, supplements |
| symptom_tracking | 97 | date, profile_id, symptoms, overall |
| translations | 12 | key, de, it |
| symptom_chips | 10 | id, de, it, icon, order |
| disclaimer | 2 | lang, title, items, accept_button |
| ai_config | 1 | provider, model, enabled |
| llm_responses | 196 | endpoint, model, success, latency_ms |
| water_tracking | 4 | date, profile_id, entries, total_ml |
| medications | 3 | id, profile_id, name, dosage, timings |

---

## Wichtige Hinweise

1. **Gleiche Datenbank**: Die Web-App MUSS die gleiche MongoDB nutzen (ueber `MONGO_URL` Umgebungsvariable). Alle Aenderungen sind sofort in der mobilen App sichtbar.

2. **CORS**: Das Backend muss CORS fuer die Web-Dashboard-Domain erlauben.

3. **Sprachen**: Die App unterstuetzt DE, IT, EN. Rezepte haben Uebersetzungen in je einem Objekt pro Sprache.

4. **Admin-Auth**: `POST /api/admin/auth` mit Passwort → Token. Token als `Authorization: Bearer <token>` Header.

5. **Keine Aenderungen an der bestehenden API noetig** – alle Endpunkte existieren bereits.

6. **Design**: Professionelles, modernes Dashboard. Farben: Primaer #1B6B45 (Gruen), Sekundaer #2E9E6B, Akzent #F59E0B.
