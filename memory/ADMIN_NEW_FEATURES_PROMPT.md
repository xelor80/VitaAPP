# VitaGuide Admin Dashboard – Erweiterung: Neue Features Integration

## KONTEXT

Die VitaGuide+ App wurde um mehrere Features erweitert. Das Admin Dashboard muss diese neuen Funktionen integrieren, damit der Admin alle Daten einsehen und verwalten kann.

Das bestehende Admin Dashboard hat bereits Seiten fuer: Uebersicht/Stats, Kundenverwaltung, Gesundheitsprofile, Rewards-Verwaltung, Produkte & Rezepte, Analytics.

Alle Basis-Informationen zum Admin Dashboard findest du in: `/app/memory/ADMIN_DASHBOARD_BRIEFING.md`

**Backend-URL:** Dieselbe API wie die App (alle Endpoints mit Prefix `/api/`)
**Admin-Passwort:** `X-Admin-Password: Wk220480xel!`
**Datenbank:** MongoDB Atlas, DB-Name: `test_database`

---

## NEUE FEATURES DIE INTEGRIERT WERDEN MUESSEN

### 1. STRESSMANAGEMENT-MODUL

**Was es tut:** Nutzer koennen gefuehrte Entspannungsuebungen (Atmen, Mini-Pausen, Schlaf, Fokus, Bewegung) durchfuehren und ihren Stresslevel vor/nach der Uebung tracken (1-10 Skala).

**Bestehende API Endpoints:**
- `GET /api/stress/exercises?lang=de` – Alle 15 Uebungen (5 Kategorien)
- `GET /api/stress/recommend/{profile_id}?lang=de` – Personalisierte Empfehlung
- `GET /api/stress/sessions/{profile_id}/history?limit=20` – Session-Historie
- `GET /api/stress/sessions/{profile_id}/stats` – Statistiken (total_sessions, avg_improvement, total_minutes)

**Neue DB Collections:**

```json
// stress_exercises (15 Eintraege, geseeded)
{
  "id": "breath_478",
  "name_de": "4-7-8 Atemtechnik",
  "name_it": "Tecnica respiratoria 4-7-8",
  "category": "breathing",       // breathing, mini, sleep, focus, movement
  "duration_seconds": 180,
  "difficulty": "beginner",       // beginner, intermediate, advanced
  "primary_goal": "calm",
  "instruction_type": "breathing_phases",
  "content_json": {
    "phases": [
      {"type": "inhale", "duration": 4, "label_de": "Einatmen", "label_it": "Inspira"},
      {"type": "hold", "duration": 7, "label_de": "Halten", "label_it": "Trattieni"},
      {"type": "exhale", "duration": 8, "label_de": "Ausatmen", "label_it": "Espira"}
    ],
    "cycles": 4
  }
}

// user_stress_sessions
{
  "id": "stress_abc123",
  "profile_id": "f97fdefb-...",
  "exercise_id": "breath_478",
  "started_at": "2026-04-11T...",
  "completed_at": "2026-04-11T...",
  "stress_before": 7,
  "stress_after": 3,
  "mood_after": "relaxed",
  "completion_status": "completed"   // completed, abandoned
}
```

**Was der Admin braucht:**
- Uebersicht aller Stress-Uebungen (Tabelle: Name, Kategorie, Dauer, Schwierigkeitsgrad)
- CRUD fuer Stress-Uebungen (neue Uebungen erstellen, bearbeiten, loeschen)
- Analytics: Beliebteste Uebungen, durchschnittliche Stressverbesserung, Sessions pro Tag
- Nutzer-Detail: Stress-Sessions eines Nutzers (Datum, Uebung, Vorher/Nachher, Verbesserung)

**Fehlende Admin API Endpoints (muessen erstellt werden):**
```
GET  /api/admin/stress/exercises          – Alle Uebungen (CRUD-faehig)
POST /api/admin/stress/exercises          – Neue Uebung erstellen
PUT  /api/admin/stress/exercises/{id}     – Uebung bearbeiten
DELETE /api/admin/stress/exercises/{id}   – Uebung loeschen
GET  /api/admin/stress/analytics          – Sessions-Statistiken aggregiert
GET  /api/admin/stress/sessions?profile_id=&limit=50 – Alle Sessions (optional gefiltert)
```

---

### 2. DAILY PLAN (TAGESPLAN)

**Was es tut:** Aggregiert alle taeglichen Aufgaben (Supplements, Medikamente, Wasser, Stress, Tagebuch) in eine einzige "Mein Tag" Checkliste. Berechnet Fortschritt (0-100%) und zeigt VERO-Coaching.

**Bestehende API Endpoints:**
- `GET /api/daily-plan/{profile_id}?lang=de` – Tagesplan mit allen Tasks + Fortschritt
- `GET /api/daily-plan/{profile_id}/weekly?lang=de` – 7-Tage Wochen-Zusammenfassung

**Daten:** Der Daily Plan hat KEINE eigene Collection. Er aggregiert Live-Daten aus: `supplement_plans`, `supplement_check_ins`, `medications`, `medication_logs`, `water_tracking`, `water_goals`, `user_stress_sessions`, `diary_entries`, `symptom_tracking`.

**Was der Admin braucht:**
- Dashboard-Widget: Tagesaktive Nutzer (wie viele haben heute mindestens 1 Task erledigt)
- Analytics: Durchschnittliche Completion Rate, beliebteste Task-Typen, Drop-off Analyse
- Nutzer-Detail: Daily Plan eines bestimmten Nutzers einsehen (heutiger Stand)

**Fehlende Admin API Endpoints (muessen erstellt werden):**
```
GET /api/admin/daily-plan/analytics?days=7  – Aggregierte Completion Stats
GET /api/admin/daily-plan/{profile_id}/today – Tagesplan eines Nutzers (Admin-Sicht)
```

---

### 3. LEVEL-SYSTEM (GAMIFICATION)

**Was es tut:** Nutzer steigen durch gesammelte Punkte (Rewards) automatisch Level auf. 12 konfigurierbare Stufen. Level-Up wird erkannt und im Frontend als Animation gezeigt.

**Bestehende API Endpoints:**
- `GET /api/level/config` – Alle 12 Level-Konfigurationen
- `GET /api/level/{profile_id}?lang=de` – User-Level (inkl. Level-Up Detection)

**DB Collections:**

```json
// user_levels
{
  "profile_id": "f97fdefb-...",
  "current_level": 2,
  "total_points": 100,
  "updated_at": "2026-04-11T...",
  "last_acknowledged_level": 2
}
```

**Level-Konfiguration (hardcoded in `/app/backend/routes/level.py`):**

| Level | Punkte | Titel (DE)       | Icon              |
|-------|--------|-------------------|-------------------|
| 1     | 0      | Start             | seed-outline      |
| 2     | 50     | Einstieg          | sprout            |
| 3     | 150    | Bewusst           | sprout-outline    |
| 4     | 300    | Aktiv             | leaf              |
| 5     | 500    | Routine           | tree              |
| 6     | 800    | Diszipliniert     | shield-check      |
| 7     | 1200   | Fortgeschritten   | star-outline      |
| 8     | 1800   | Optimiert         | star-four-points  |
| 9     | 2500   | Meister           | crown             |
| 10    | 3500   | Experte           | trophy            |
| 11    | 5000   | Legende           | trophy-variant    |
| 12    | 7000   | Gesundheits-Held  | medal             |

**Was der Admin braucht:**
- Level-Verteilung aller Nutzer (Balkendiagramm: wie viele Nutzer auf welchem Level)
- Level-Konfiguration bearbeiten (Punkte-Schwellen, Titel, Icons anpassen)
- Nutzer-Detail: Aktuelles Level, Fortschritt, Lifetime-Punkte

**Fehlende Admin API Endpoints:**
```
GET /api/admin/level/distribution      – Nutzer-Verteilung pro Level
PUT /api/admin/level/config            – Level-Schwellen bearbeiten (Optional: in DB statt hardcoded)
```

---

### 4. LEVEL-BASIERTE PRAEMIEN-FREISCHALTUNG

**Was es tut:** Praemien im Rewards-Katalog koennen ein `min_level` haben. Nutzer mit niedrigerem Level sehen diese als "level_locked" und koennen sie nicht einloesen.

**Aenderungen am Rewards-Katalog:**

```json
// rewards_catalog (erweitert)
{
  "id": "2170cd9b-...",
  "title_de": "Premium Meditationsguide",
  "title_it": "Guida meditazione premium",
  "description_de": "Exklusiver 30-Tage Meditationskurs",
  "points_required": 200,
  "category": "premium",
  "reward_type": "download",
  "status": "active",
  "min_level": 5,               // <-- NEU: 0 = kein Level noetig
  "created_at": "..."
}
```

**Was der Admin braucht:**
- Beim Erstellen/Bearbeiten von Praemien: `min_level` Feld (Dropdown 0-12)
- In der Praemien-Tabelle: Level-Anforderung als Spalte anzeigen
- Bestehende Endpoints reichen: `POST/PUT /api/rewards/admin/catalog` akzeptiert bereits `min_level`

**Aktuelle Level-gesperrte Praemien im System:**

| Praemie                   | Punkte | Min Level |
|---------------------------|--------|-----------|
| Premium Meditationsguide  | 200    | 5         |
| VIP Ernaehrungsberatung   | 500    | 8         |
| Exklusives Wellness-Paket | 1000   | 10        |

---

### 5. MEDIKAMENTEN-ERINNERUNGEN

**Was es tut:** Nutzer koennen Push-Erinnerungen fuer Medikamenten-Einnahme konfigurieren (Morgens/Mittags/Abends, mit individuellen Uhrzeiten).

**Bestehende API Endpoints:**
- `GET /api/medications/{profile_id}/reminders` – Erinnerungseinstellungen lesen
- `PUT /api/medications/{profile_id}/reminders` – Erinnerungseinstellungen speichern

**DB Collection:**

```json
// medication_reminders
{
  "profile_id": "f97fdefb-...",
  "enabled": true,
  "morning_time": "07:30",
  "noon_time": "12:00",
  "evening_time": "21:00",
  "updated_at": "2026-04-11T..."
}
```

**Was der Admin braucht:**
- Nutzer-Detail: Erinnerungseinstellungen eines Nutzers sehen
- Analytics: Wie viele Nutzer haben Erinnerungen aktiviert

---

### 6. WOCHENBERICHT (WEEKLY REPORT)

**Was es tut:** Generiert einen umfassenden 7-Tage-Gesundheitsbericht mit Supplements %, Medikamenten %, Wasser, Stress-Verbesserung, Tagebuch-Eintraege, VERO-Empfehlung.

**Bestehende API Endpoints:**
- `GET /api/weekly-report/{profile_id}?lang=de` – Vollstaendiger Wochenbericht

**Daten:** Aggregiert Live-Daten, keine eigene Collection.

**Was der Admin braucht:**
- Nutzer-Detail: Wochenbericht eines bestimmten Nutzers einsehen
- Analytics: Durchschnittliche Compliance-Raten ueber alle Nutzer

---

### 7. FORTSCHRITTS-TRACKING (PROGRESS SCREEN ERWEITERUNG)

**Was es tut:** Progress Screen zeigt jetzt auch Medikamenten-Adherence (7-Tage-Chart) und Wasser-Verlaufsdiagramm.

**Bestehende API Endpoints:**
- `GET /api/medications/{profile_id}/stats?days=7` – Medikamenten-Statistiken
- `GET /api/water-tracking/{profile_id}/history?period=week` – Wasser-Verlauf

**Was der Admin braucht:**
- Nutzer-Detail: Medikamenten-Adherence + Wasser-Verlauf eines Nutzers sehen

---

## ZUSAMMENFASSUNG DER NEUEN ADMIN-SEITEN

### Neue Hauptseiten:

1. **Stressmanagement-Verwaltung** (Sidebar-Link)
   - Uebungs-Katalog (CRUD-Tabelle)
   - Session-Analytics (Charts)

2. **Daily Plan Analytics** (Unter-Seite von Analytics)
   - Tagesaktive Nutzer
   - Completion Rates
   - Drop-off Analyse

3. **Level-System** (Unter-Seite von Rewards oder eigene Seite)
   - Level-Verteilung (Balkendiagramm)
   - Level-Konfiguration (Tabelle, editierbar)

### Erweiterungen bestehender Seiten:

4. **Rewards-Verwaltung** (erweitern)
   - `min_level` Feld in Praemien CRUD (Dropdown 0-12)
   - Level-Anforderung als Spalte in Katalog-Tabelle

5. **Kunden-Detailansicht** (erweitern um)
   - Tab "Stress": Session-Historie, Stresslevel-Verlauf
   - Tab "Tagesplan": Heutiger Daily Plan mit Fortschritt
   - Tab "Level": Aktuelles Level, Fortschrittsbalken, Lifetime-Punkte
   - Tab "Wochenbericht": Generierter Weekly Report
   - Sektion "Erinnerungen": Medikamenten-Reminder Einstellungen

6. **Dashboard** (erweitern um)
   - Widget: Tagesaktive Nutzer (Daily Plan Completion)
   - Widget: Level-Verteilung Mini-Chart
   - Widget: Stress-Sessions heute

---

## NEUE DB COLLECTIONS (Zusammenfassung)

| Collection             | Beschreibung                      | Anzahl (ca.) |
|------------------------|-----------------------------------|--------------|
| stress_exercises       | Geseeded, 15 Uebungen            | 15           |
| user_stress_sessions   | Pro abgeschlossene Uebung        | variabel     |
| user_levels            | Level-Tracking pro User           | pro User     |
| medication_reminders   | Erinnerungseinstellungen          | pro User     |

Bestehende erweitert:
| rewards_catalog        | +min_level Feld                   | 4+           |
| reward_settings        | +stress_exercise: 10 Punkte       | 1            |

---

## VERKNUEPFUNGEN (Erweitert)

```
health_profiles.id ──> user_stress_sessions.profile_id
health_profiles.id ──> user_levels.profile_id
health_profiles.id ──> medication_reminders.profile_id
stress_exercises.id ──> user_stress_sessions.exercise_id
rewards_catalog.min_level ──> level_config[].level
user_points.lifetime_points ──> Level-Berechnung via calc_level()
```

---

## STIL & DESIGN

- Passt zum bestehenden Admin Dashboard Stil
- Clean, professionell, datengetrieben
- Charts fuer Analytics (Balken, Linien, Donut)
- Tabellen mit Sortierung, Suche, Pagination
- Keine Gaming-Elemente im Admin – rein funktional
- Responsive fuer Desktop

---

## PRIORITAET

1. **Hoch**: Rewards CRUD mit `min_level` (kleiner Change, grosser Impact)
2. **Hoch**: Stressmanagement-Verwaltung (neues Modul, CRUD noetig)
3. **Mittel**: Kunden-Detailansicht erweitern (Stress, Level, Tagesplan)
4. **Mittel**: Level-System Admin-Seite
5. **Niedrig**: Dashboard Widgets, Daily Plan Analytics
