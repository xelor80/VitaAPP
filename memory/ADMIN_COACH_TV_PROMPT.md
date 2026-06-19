# 🎬 ADMIN DASHBOARD AGENT PROMPT – Coach‑TV (Video-Verwaltung)

> **Sprache:** Antworte und kommentiere durchgehend auf Deutsch.
> **Stack:** Das bestehende Admin-Dashboard (FastAPI + statisches HTML/JS unter
> `/api/admin-app`) erweitern. Designsprache "JK Red" (`#C2272F`) wie im Rest des
> Admin-Webapps.

---

## 1. Kontext – was bereits in der App existiert

In der **VitaGuide+ Mobile-App** wurde ein neuer Bottom-Tab **„Coach‑TV"** ausgerollt.
Dort erklärt Joachim Kaeser per YouTube-Video, wobei welche Nahrungsergänzungen helfen.

- Videos werden **inline** in einem App-Modal abgespielt (WebView auf Mobile, `<iframe>` auf Web).
- Daten liegen in MongoDB-Collection **`videos`**.
- Die FastAPI-Endpoints stehen bereits live unter `/api/videos/*` (siehe unten).
- Es gibt bereits **15 Seed-Einträge** (5 Videos × DE/IT/EN).

Deine Aufgabe: **Eine vollständige Admin-UI** zum Anlegen, Bearbeiten, Sortieren und
Deaktivieren dieser Videos bauen.

---

## 2. Datenmodell `videos` (MongoDB)

```jsonc
{
  "video_id":   "string (uuid8, autom. generiert beim POST)",
  "title":      "string",                  // sprachspezifisch
  "youtube_url":"https://www.youtube.com/watch?v=<id>",
  "youtube_id": "string (11-Zeichen YouTube-ID)",
  "description":"string",
  "category":   "string",                  // siehe Liste in §4
  "lang":       "de | it | en",
  "tags":       ["string", ...],
  "duration":   "string (mm:ss, optional)",
  "sort_order": 0,                          // Sortierung innerhalb Kategorie/Sprache
  "active":     true,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

## 3. Backend-API (alle Endpoints **bereits implementiert**, nichts daran ändern)

| Method | Path | Beschreibung |
|---|---|---|
| `GET` | `/api/videos/categories` | Liefert alle Kategorien inkl. `name_de`/`name_it`/`icon` |
| `GET` | `/api/videos?lang=de&category=peso&active_only=true` | Liste aller Videos (Filter optional) |
| `GET` | `/api/videos/by-category/{lang}` | Gruppiert nach Kategorie (für App-Tab) |
| `GET` | `/api/videos/{video_id}` | Einzeleintrag |
| `POST` | `/api/videos` | **Anlegen**. Body siehe `VideoInput` |
| `PUT` | `/api/videos/{video_id}` | **Update**. Body siehe `VideoUpdate` (alle Felder optional, inkl. `active`) |
| `DELETE` | `/api/videos/{video_id}` | Hard-Delete |

**Body-Schema für POST/PUT** (Python Pydantic):
```python
class VideoInput(BaseModel):
    title: str
    youtube_url: str
    youtube_id: str
    description: str = ""
    category: str
    lang: str = "it"
    tags: List[str] = []
    duration: str = ""
    sort_order: int = 0
```

---

## 4. Kategorien-Master (festkodiert in `routes/videos.py`)

| `category` key | Name DE | Name IT | Icon (MaterialCommunity) |
|---|---|---|---|
| `articolazioni` | Gelenke & Mobilität | Articolazioni e mobilità | `bone` |
| `digestione` | Verdauung & Detox | Digestione e detox | `stomach` |
| `peso` | Gewichtskontrolle | Controllo del peso | `scale-bathroom` |
| `cuore` | Herz & Kreislauf | Cuore e circolazione | `heart-pulse` |
| `energia` | Energie & Vitalität | Energia e vitalità | `lightning-bolt` |
| `pelle` | Haut, Haare & Nägel | Pelle, capelli e unghie | `face-woman` |
| `immunsystem` | Immunsystem | Sistema immunitario | `shield-check` |
| `schlaf` | Schlaf & Entspannung | Sonno e relax | `sleep` |
| `memoria` | Gedächtnis & Konzentration | Memoria e concentrazione | `brain` |
| `allgemein` | Allgemein | Generale | `information` |

---

## 5. Aufgaben fürs Admin-Dashboard

### 5.1 Neue Navigation-Sektion „Coach‑TV / Videos"
- Sidebar-Eintrag mit Icon `play-circle`, Farbe `#C2272F`.
- Route z.B. `#/videos` oder `?section=videos`.

### 5.2 Übersichtsseite (`VideoListView`)
**Toolbar (sticky oben):**
- Sprach-Tabs: `DE | IT | EN` (Default DE).
- Kategorie-Dropdown (Multi-Select optional) – Werte aus `GET /api/videos/categories`.
- Suchfeld (filtert client-seitig nach `title` + `description`).
- Schalter „Auch inaktive anzeigen" → ruft `?active_only=false` auf.
- Button **„+ Neues Video"** rechts → öffnet Edit-Modal im Anlegemodus.

**Tabelle:**
| Spalte | Inhalt |
|---|---|
| Thumb | `<img src="https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg" width=80>` |
| Titel | `title` (Bold) + 1 Zeile `description` (gekürzt) |
| Kategorie | Pill in JK-Red, Text aus Kategorien-Mapping |
| Sprache | Badge `DE`/`IT`/`EN` |
| Dauer | `duration` |
| Sort | Editierbare Zahl (Inline-Update auf Blur) → `PUT /api/videos/{id}` `{sort_order}` |
| Aktiv | Toggle-Switch → `PUT /api/videos/{id}` `{active}` |
| Aktionen | Buttons: Bearbeiten (Stift), Löschen (Mülltonne mit Confirm) |

**Sortierung:** Default nach `sort_order ASC`, innerhalb gleichen `sort_order` nach `created_at DESC`.

### 5.3 Anlege-/Bearbeiten-Modal (`VideoEditModal`)
Felder:
1. **YouTube-URL** (Text) – Pflicht.
   - **Live-Parser**: Bei Eingabe automatisch `youtube_id` aus `?v=…`, `youtu.be/…` oder `/embed/…` extrahieren.
   - **Vorschau-Thumbnail** sofort anzeigen + Fehler-Hinweis bei ungültiger URL.
2. **YouTube-ID** (read-only, befüllt durch Parser).
3. **Sprache** (Radio: DE / IT / EN) – Pflicht.
4. **Kategorie** (Dropdown aus Mapping in §4) – Pflicht.
5. **Titel** (Text, max ~120 Zeichen) – Pflicht.
6. **Beschreibung** (Textarea, max ~280 Zeichen).
7. **Dauer** (Text-Eingabe `mm:ss`, optional).
8. **Tags** (Multi-Chip-Input, optional; Default leer).
9. **Sortierung** (Number, default 0).
10. **Aktiv** (Toggle, default true).

**Footer-Buttons:** „Abbrechen" (Sekundär), „Speichern" (Primär, JK-Red).

**Validierung vor POST/PUT:**
- `youtube_id` muss 11 Zeichen lang sein.
- `title`, `category`, `lang` nicht leer.
- `lang` ∈ {`de`,`it`,`en`}.
- `category` ∈ Mapping-Keys aus §4.

### 5.4 (Optional) Bulk-Import
- Button „Import via CSV/JSON" in der Toolbar.
- CSV-Format-Beispiel:
  ```csv
  youtube_url;title;description;category;lang;duration;sort_order
  https://youtu.be/abc;Titel;Beschr.;peso;de;5:30;1
  ```
- Pro Zeile ein `POST /api/videos`.

---

## 6. UX-Vorgaben

- Farben analog zum bestehenden Admin-Webapp (`#C2272F` Primary, `#FEE2E2` Hover/Tag-BG).
- Schrift: System-Stack (wie aktuell).
- Buttons rund/pill, Modal mit Backdrop-Blur.
- **Mobile-Responsive** ist Pflicht (Tabelle → Kartenliste unter 640px).
- Toast-Notifications (top-right) bei Speichern/Löschen.

---

## 7. Akzeptanzkriterien

- ✅ Admin kann pro Sprache (DE/IT/EN) Videos anlegen, bearbeiten, deaktivieren und löschen.
- ✅ Live-Vorschau des Thumbnails sobald gültige YouTube-URL eingegeben wird.
- ✅ Änderungen erscheinen **sofort** im App-Tab „Coach‑TV" (App ruft `GET /api/videos/by-category/{lang}` bei jedem Tab-Fokus auf).
- ✅ Inaktive Videos werden im App-Tab **nicht** angezeigt.
- ✅ Sort-Order respektiert Anzeigereihenfolge in der App.
- ✅ Validierung verhindert ungültige YouTube-IDs.

---

## 8. Nicht-Ziele (vorerst)

- Kein Upload eigener MP4s – nur YouTube-Embeds.
- Kein Facebook-Embedding (vom Nutzer ausgeschlossen).
- Keine View-/Click-Analytics (Phase 2, wäre analog zu Smart-Product-Impressions).

---

## 9. Curl-Beispiele zum Testen

```bash
# Liste DE Videos
curl -s "$API_URL/api/videos?lang=de"

# Neues Video anlegen
curl -X POST "$API_URL/api/videos" \
  -H "Content-Type: application/json" \
  -d '{
        "title":"Magnesium – richtig dosieren",
        "youtube_url":"https://www.youtube.com/watch?v=ABCDEFGHIJK",
        "youtube_id":"ABCDEFGHIJK",
        "description":"Joachim Kaeser über Magnesium-Formen und Dosierung.",
        "category":"energia",
        "lang":"de",
        "tags":["magnesium","joachim-kaeser"],
        "duration":"6:42",
        "sort_order":1
      }'

# Inaktivieren
curl -X PUT "$API_URL/api/videos/{video_id}" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'

# Löschen
curl -X DELETE "$API_URL/api/videos/{video_id}"
```

---

## 10. Definition of Done

Wenn diese Sektion fertig ist:
1. Sidebar-Eintrag „Coach‑TV" sichtbar im Admin-Webapp.
2. Übersichtstabelle mit allen 15 Seed-Einträgen ladbar (3 Sprachen).
3. Anlegen, Bearbeiten, Sortieren, Aktivieren/Deaktivieren, Löschen funktioniert per API.
4. Live-Thumbnail-Vorschau im Modal funktioniert.
5. App-Tab „Coach‑TV" zeigt Änderungen nach Pull-to-Refresh / Tab-Wechsel.

Liefere am Ende eine kurze Status-Zusammenfassung mit Screenshots der neuen Sektion.
