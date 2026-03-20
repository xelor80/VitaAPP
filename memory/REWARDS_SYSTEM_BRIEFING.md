# VitaGuide Rewards System – Briefing fuer Admin WebApp Agent

## Neue Collections in MongoDB Atlas (`test_database`)

### 1. `reward_settings` (1 Dokument – Singleton)
```json
{
  "action_points": {
    "water_confirm": 5,          // Punkte pro Wasserbestaetigung
    "water_goal": 10,            // Bonus: Wasserziel erreicht
    "supplement": 8,             // Punkte pro Supplement-Einnahme
    "medication": 8,             // Punkte pro Medikamenten-Einnahme
    "diary": 12,                 // Punkte fuer Tagebuch-Eintrag
    "daily_checkin": 5,          // Punkte fuer taeglichen App-Besuch
    "complete_day": 25,          // Bonus: Kompletter Tag
    "streak_7": 50,              // Bonus: 7-Tage-Streak
    "streak_14": 100             // Bonus: 14-Tage-Streak
  },
  "daily_limits": {
    "max_total": 200,            // Max Punkte pro Tag gesamt
    "max_water_confirm": 30,     // Max Punkte pro Tag fuer Wasser
    "max_supplement": 40,        // Max Punkte pro Tag fuer Supplements
    "max_medication": 40         // Max Punkte pro Tag fuer Medikamente
  },
  "enabled": true,               // System ein/aus
  "created_at": "ISO-Date",
  "updated_at": "ISO-Date"
}
```

### 2. `reward_events` (Protokoll jeder Punktevergabe)
```json
{
  "id": "uuid",
  "profile_id": "uuid",         // Referenz zu health_profiles.id
  "action": "water_confirm",     // Art der Aktion
  "points": 5,                   // Vergebene Punkte
  "date": "2026-03-20",          // Datum (fuer Tages-Aggregation)
  "timestamp": "ISO-DateTime",   // Genauer Zeitpunkt
  "context": "vitamin_d_morning" // Optional: Kontext (z.B. Supplement+Timing)
}
```

### 3. `user_points` (Punktestand pro Nutzer)
```json
{
  "profile_id": "uuid",          // Referenz zu health_profiles.id
  "current_balance": 150,        // Aktuelle verfuegbare Punkte
  "lifetime_points": 500,        // Alle jemals verdienten Punkte
  "redeemed_points": 350,        // Fuer Praemien eingeloeste Punkte
  "last_updated": "ISO-DateTime"
}
```

### 4. `rewards_catalog` (Praemien-Katalog)
```json
{
  "id": "uuid",
  "title_de": "10% Rabattcode",
  "title_it": "Codice sconto 10%",
  "title_en": "10% Discount Code",
  "description_de": "10% Rabatt auf deinen naechsten Einkauf",
  "description_it": "10% di sconto sul prossimo acquisto",
  "description_en": "10% discount on your next purchase",
  "image_url": "https://...",
  "points_required": 100,
  "category": "coupon",           // coupon, premium, download, partner, general
  "reward_type": "coupon",        // coupon, premium, download, partner
  "status": "active",             // active, inactive
  "stock": null,                  // null = unbegrenzt, Zahl = Bestand
  "start_date": "2026-01-01",    // Optional: Gueltig ab
  "end_date": "2026-12-31",      // Optional: Gueltig bis
  "code_template": "VITA-{random}", // Fuer Coupon-Generierung
  "created_at": "ISO-DateTime",
  "updated_at": "ISO-DateTime"
}
```

### 5. `reward_redemptions` (Eingeloeste Praemien)
```json
{
  "id": "uuid",
  "profile_id": "uuid",
  "reward_id": "uuid",            // Referenz zu rewards_catalog.id
  "reward_title": "10% Rabattcode",
  "points_spent": 100,
  "redeemed_at": "ISO-DateTime",
  "status": "fulfilled",          // fulfilled, pending
  "code": "VITA-A3F2B1C4"        // Generierter Code (bei Coupons)
}
```

### 6. `user_streaks` (Streak-Daten pro Nutzer)
```json
{
  "profile_id": "uuid",
  "current_streak": 7,
  "longest_streak": 14,
  "last_activity_date": "2026-03-20"
}
```

---

## API Endpoints (Backend: /api/rewards/...)

### User Endpoints
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/rewards/grant` | Punkte vergeben (Body: `{profile_id, action, context?}`) |
| GET | `/api/rewards/{profile_id}/balance` | Punktestand abrufen |
| GET | `/api/rewards/{profile_id}/today?lang=de` | Tagesueberblick (Punkte, Breakdown, Streak, naechste Praemie) |
| GET | `/api/rewards/{profile_id}/history?days=7&limit=50` | Event-Historie |
| GET | `/api/rewards/{profile_id}/streaks` | Streak-Daten |
| GET | `/api/rewards/catalog/list?lang=de&profile_id=X` | Praemien-Katalog (mit Status pro User) |
| POST | `/api/rewards/{profile_id}/redeem` | Praemie einloesen (Body: `{reward_id}`) |
| GET | `/api/rewards/{profile_id}/redemptions` | Eingeloeste Praemien |

### Admin Endpoints
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/rewards/admin/settings` | Einstellungen lesen |
| PUT | `/api/rewards/admin/settings` | Einstellungen aendern (Body: `{action_points?, daily_limits?, enabled?}`) |
| GET | `/api/rewards/admin/catalog` | Alle Katalog-Items (inkl. inaktive) |
| POST | `/api/rewards/admin/catalog` | Neues Katalog-Item anlegen |
| PUT | `/api/rewards/admin/catalog/{item_id}` | Katalog-Item bearbeiten |
| DELETE | `/api/rewards/admin/catalog/{item_id}` | Katalog-Item loeschen |
| GET | `/api/rewards/admin/analytics?days=30` | Analytics Dashboard |

### Analytics Response Felder
```json
{
  "period_days": 30,
  "total_points_granted": 12500,
  "total_events": 850,
  "by_action": {
    "water_confirm": {"points": 3000, "count": 600},
    "supplement": {"points": 4000, "count": 500}
  },
  "daily": [{"date": "2026-03-20", "points": 450, "unique_users": 12}],
  "redemptions": 5,
  "active_users": 45,
  "avg_streak": 4.2,
  "max_streak": 28
}
```

---

## Integration in bestehende Endpoints

Die folgenden bestehenden Endpoints geben jetzt ein zusaetzliches `reward` Feld zurueck:

| Endpoint | Reward-Aktion |
|----------|---------------|
| `POST /api/water-tracking/{profile_id}/add` | `water_confirm` + ggf. `water_goal` |
| `POST /api/medications/{profile_id}/supplement-check-in` | `supplement` |
| `POST /api/medications/{profile_id}/{med_id}/check-in` | `medication` |
| `POST /api/diary` (Header: `x-profile-id`) | `diary` |

Das `reward` Feld im Response sieht so aus:
```json
{
  "reward": {
    "granted": true,
    "points": 5,
    "streak_bonus": 0,
    "total_granted": 5,
    "action": "water_confirm",
    "streak": 1
  }
}
```

---

## Admin WebApp – Neue Seiten

### 1. Reward Einstellungen
- Punktwerte pro Aktion editieren
- Daily Limits konfigurieren
- System aktivieren/deaktivieren

### 2. Praemien-Katalog
- CRUD fuer Praemien
- Felder: Titel (DE/IT/EN), Beschreibung, Bild-URL, Punkte, Kategorie, Typ, Status, Bestand, Gueltigkeitszeitraum, Code-Template
- Aktiv/Inaktiv Toggle
- Sortierung nach Punktwert

### 3. Analytics Dashboard
- Vergebene Punkte (Gesamt + pro Tag Chart)
- Aktionen-Verteilung (Pie/Bar Chart)
- Aktive Nutzer
- Einloesungen
- Durchschnittliche Streak-Laenge

### 4. Einloesungen-Uebersicht
- Liste aller Einloesungen
- Nutzer, Praemie, Punkte, Datum, Status, Code
- Status aendern (pending → fulfilled)
