# Admin-Agent-Master-Prompt — Aktualisierungen Q2/2026

> **Datei**: `/app/memory/ADMIN_MASTER_PROMPT_2026Q2.md`
> **Erstellt**: 18.06.2026
> **Zielsystem**: Admin-Web-Dashboard (extern, separate Codebase)
> **Quelle**: VitaGuide+ / JK-App FastAPI Backend
> **Status**: Alle Backend-Endpoints live, alle Mobile-App-Integrationen deployed
> **Voraussetzungen**: Bestehender Admin-Master-Prompt (`ADMIN_AGENT_PROMPT.md`) ist bereits implementiert

---

## 🧭 Übersicht der Erweiterungen

Diese Datei bündelt **vier neue Admin-Module**, die seit 2026-05-15 zur App hinzugekommen sind. Sie ergänzen den Original-Master-Prompt, ersetzen ihn aber **nicht**. Bei Konflikten gilt diese Datei.

| Modul | Was | Detail-Prompt |
|---|---|---|
| 1️⃣ **Branding / White-Label** | App-Name, Logo, Akzentfarbe pro Kunde umschaltbar | `ADMIN_BRANDING_PROMPT.md` |
| 2️⃣ **Smart-Product „Slim & Beauty"** | Featured-Produkt im Abnehm-Guide editierbar | `ADMIN_SLIM_BEAUTY_PROMPT.md` |
| 3️⃣ **Conversion-Reporting** | Impressions, Clicks, CTR, Viewer-Conversion | `ADMIN_CONVERSION_REPORTING_PROMPT.md` |
| 4️⃣ **Slot-Manager (UI-Kategorien)** | Produkt-Platzierung in 3 App-Bereichen | `ADMIN_PRODUCT_SLOTS_PROMPT.md` |

Plus seit Phase 1–3 Abnehm-Guide (siehe `ADMIN_AGENT_PROMPT.md` Update vom 13.05.2026):
- Achievements / Streaks
- Wochenübersicht Gewicht
- Engagement-KPIs

---

## 📦 Modul 1 — Branding / White-Label

**Ziel**: Operator kann mehrere Brand-Templates verwalten und live umschalten (App-Name, Logo, Tagline, Primärfarbe).

### Endpoints (live)
```
GET    /api/branding/active                          # public, vom Mobile-App genutzt
GET    /api/branding/admin/brands                    # alle Templates auflisten
POST   /api/branding/admin/brands                    # neu anlegen
PUT    /api/branding/admin/brands/{id}               # editieren
DELETE /api/branding/admin/brands/{id}               # löschen (nur inaktive)
PUT    /api/branding/admin/brands/{id}/activate      # global aktivieren
PUT    /api/branding/admin/brands/reset-to-default   # zurück zu VitaGuide+
```

### Aktuell aktiv
**JK Joachim Kaeser** mit Markenrot `#C2272F`, JK-Logo (rotes Oval, weißes JK).

### UI-Anforderung im Admin (kurz)
- Seite `/admin/branding` mit Liste aller Brands
- Edit-Modal mit Logo-Upload (max 300 KB, Drag-Drop, Browser-Resize), Color-Picker, DE/IT/EN-Felder
- Live-Mockup-Vorschau des Mobile-Headers
- Confirmation-Dialog beim Aktivieren („alle Mobile-User sehen das in 30 s")

> **Vollständige Specs**: `ADMIN_BRANDING_PROMPT.md`

---

## 💊 Modul 2 — Smart-Product „Slim & Beauty"

**Ziel**: Featured-Produkt im Abnehm-Guide vollständig editierbar machen (Titel, Beschreibung, Affiliate-Link, Bild, Badge, Preis).

### Daten in DB
```json
{
  "id": "smart-slim-beauty-001",
  "title_de": "Slim & Beauty",
  "is_featured": true, "featured_order": 1,
  "badge": "NEU",
  "contexts": ["weight", "weight_metabolism", "abnehm_guide", "fasting"],
  "affiliate_url": null,    // ← vom Admin zu setzen
  "image_url": null,        // ← vom Admin zu setzen
  ...
}
```

### Endpoints (live)
```
GET /api/smart-products/recommendations?context=weight&limit=3
PUT /api/smart-products/catalog/{product_id}              # editieren
```

### UI-Anforderung
- Featured-Sektion oben auf der Smart-Products-Seite
- Warning-Banner wenn `affiliate_url` oder `image_url` fehlt
- Live-Preview-Card im Edit-Modal (matched Mobile-App 1:1)

> **Vollständige Specs**: `ADMIN_SLIM_BEAUTY_PROMPT.md`

---

## 📊 Modul 3 — Conversion-Reporting

**Ziel**: Dashboard mit Impressions, Klicks, CTR, Unique-Viewer→Clicker-Conversion pro Produkt + Zeitreihe + Context-Breakdown.

### Datenmodell
- `smart_product_impressions` (neu): jeder Render einer Produktkarte
- `smart_product_clicks` (existiert): jeder Tap

### Endpoints (live)
```
POST /api/smart-products/impression                       # einzeln
POST /api/smart-products/impression/batch                 # bis 50 Items
POST /api/smart-products/click                            # Tap-Tracking
GET  /api/smart-products/stats?days=30                    # KPI-Übersicht
GET  /api/smart-products/stats/timeseries?product_id=&days=30  # Charts
GET  /api/smart-products/stats/by-context?days=30         # Context-Vergleich
GET  /api/smart-products/stats/product/{id}?days=30       # Drill-Down
```

### KPI-Defs
| Metrik | Formel |
|---|---|
| **CTR** | `Clicks / Impressions × 100` |
| **Viewer-Conversion** | `Unique Clickers / Unique Viewers × 100` |

### UI-Anforderung
- Page `/admin/conversion-reports` mit 4 KPI-Kacheln + Top-Performer-Liste
- Time-Series-Line-Chart pro Produkt
- By-Context Bar-Chart
- Auto-Alerts: 🚀 Top (CTR > 10%), ⚠️ Underperformer (Featured + CTR < 2%)

> **Vollständige Specs + cURL-Snippets**: `ADMIN_CONVERSION_REPORTING_PROMPT.md`

---

## 🗂️ Modul 4 — Slot-Manager (UI-Kategorien)

**Ziel**: Operator wählt per Multi-Select pro Produkt, in welchen 3 App-Bereichen es erscheint.

### Slot-Mapping
```
home_slider       → Home-Slider im Dashboard
stress_relax      → „Stress & Entspannung" Sektion
weight_metabolism → „Gewicht & Stoffwechsel" / Abnehm-Guide
```

### Endpoints (live)
```
GET /api/smart-products/slots                       # Übersicht mit Counts
GET /api/smart-products/slots/{slot}/products       # Produkte pro Slot
PUT /api/smart-products/catalog/{id}/slots          # Zuweisung ändern
GET /api/smart-products/catalog                     # liefert jetzt auch slots-Feld
```

### UI-Anforderung
- Filter-Bar oben: `[Alle] [🏠 Home (2)] [🧘 Stress (3)] [⚖️ Weight (6)] [Inaktiv]`
- Slot-Badges in jeder Produkt-Card
- „Slots"-Button öffnet Multi-Select-Modal mit 3 Checkboxen + Erklärungstexten

> **Vollständige Specs**: `ADMIN_PRODUCT_SLOTS_PROMPT.md`

---

## 🏗️ Empfohlene Admin-Web Sitemap (Stand 18.06.2026)

```
/admin
├── /dashboard                       (Original)
├── /users                           (Original)
├── /branding              🆕        → ADMIN_BRANDING_PROMPT.md
├── /smart-products
│   ├── /                            → Liste mit Slot-Filter + Featured-Sektion
│   ├── /{id}             🆕        → Edit-Modal mit Live-Preview
│   ├── /{id}/slots       🆕        → Multi-Select-Modal
│   └── /{id}/analytics   🆕        → Time-Series + Context-Breakdown
├── /conversion-reports    🆕        → ADMIN_CONVERSION_REPORTING_PROMPT.md
│   └── /{product_id}                → Drill-Down KPIs
├── /abnehm-guide          🟡 P1    → Cards-CMS + Meal-Templates + Coach-Lines
├── /engagement            🟡 P1    → Streaks + Plateaus + Wasser-Compliance
└── /settings
```

---

## 🔒 Globale Sicherheits-Vorgaben

1. **Auth**: Admin-JWT für alle `/admin/*` und `PUT/POST/DELETE` Endpoints.
2. **Audit-Log** für alle Schreibzugriffe in Collection `admin_audit_log`:
   ```json
   {
     "action": "brand_activated | product_slots_updated | product_updated | ...",
     "target_id": "...",
     "before": {...},
     "after": {...},
     "admin_user": "admin@vitaguide.de",
     "ts": "2026-06-18T..."
   }
   ```
3. **Rate-Limits**:
   - Brand-Aktivierung: 10/Min/Admin
   - Impression-Endpoint: 100/Min/Profile (Mobile-Public)
   - Slot-Updates: 60/Min/Admin
4. **GDPR**: In Conversion-Berichten nie `profile_id` exportieren, nur aggregierte Counts.
5. **Retention**: `smart_product_impressions` 180 Tage, `smart_product_clicks` 365 Tage.

---

## 🚦 Implementierungs-Roadmap (Empfehlung)

**Sprint 1 — Sichtbarkeit (P0)**
- [ ] Branding-Page `/admin/branding` mit Liste + Aktivieren
- [ ] Slot-Filter-Bar in Smart-Products-Liste
- [ ] Conversion-Dashboard `/admin/conversion-reports` mit 4 KPI-Kacheln

**Sprint 2 — Editierbarkeit (P0)**
- [ ] Branding Create/Edit-Modal mit Logo-Upload + Live-Preview
- [ ] Slot-Selector-Modal pro Produkt
- [ ] Slim & Beauty Edit-Modal mit Warning-Banner + Live-Preview

**Sprint 3 — Insights (P1)**
- [ ] Conversion Drill-Down pro Produkt
- [ ] Time-Series-Charts (Recharts/Victory)
- [ ] By-Context Bar-Chart
- [ ] Auto-Alerts (Top/Under-Performer)

**Sprint 4 — Convenience (P2)**
- [ ] Drag-and-Drop Slot-Reorder
- [ ] Wochenrückblick-Email (Cron)
- [ ] CSV-Export Conversion-Reports
- [ ] Brand-Preview-Link (Demo-Feature)

---

## 🧪 End-to-End-Validierung (Backend bereits live)

```bash
API_URL="https://stress-relief-app-11.preview.emergentagent.com"

# Modul 1: Branding
curl -s "$API_URL/api/branding/active" | jq

# Modul 2: Slim & Beauty Detail
curl -s "$API_URL/api/smart-products/recommendations?context=weight&limit=1" | jq

# Modul 3: Conversion Stats
curl -s "$API_URL/api/smart-products/stats?days=30" | jq '.totals'

# Modul 4: Slot-Übersicht
curl -s "$API_URL/api/smart-products/slots" | jq '.slots[] | {slot, active_product_count}'
```

---

## 📁 Datei-Index der Prompts

```
/app/memory/
├── PRD.md                                    # Original Produkt-Anforderungen + Changelog
├── ADMIN_AGENT_PROMPT.md                     # Master-Prompt (alt + Update 13.05.2026)
├── ADMIN_BRANDING_PROMPT.md          🆕      # Modul 1: White-Label
├── ADMIN_SLIM_BEAUTY_PROMPT.md       🆕      # Modul 2: Featured-Produkt
├── ADMIN_CONVERSION_REPORTING_PROMPT.md 🆕   # Modul 3: KPI-Dashboard
├── ADMIN_PRODUCT_SLOTS_PROMPT.md     🆕      # Modul 4: Slot-Manager
└── ADMIN_MASTER_PROMPT_2026Q2.md     🆕      # Diese Datei — Master-Übersicht
```

Übergib dem Admin-Agenten alle 6 Markdown-Dateien zusammen. Diese hier (`ADMIN_MASTER_PROMPT_2026Q2.md`) ist der **Index + Roadmap**, die anderen 4 enthalten die **Detail-Specs pro Modul**.

---

## 💡 Hinweise für den Admin-Agent

1. **Reihenfolge wichtig**: Implementiere zuerst **Sprint 1**, sonst sieht der Operator gar nichts vom neuen System. Edit-Funktionalität (Sprint 2) braucht funktionierende Liste-Ansichten.

2. **Stack-Empfehlung**:
   - Charts: **Recharts** oder **Victory** (beide gut mit React + responsive)
   - Color-Picker: `react-color`
   - Logo-Upload: `react-dropzone` + Canvas-Resize (siehe Branding-Prompt)
   - Drag-Drop: `@dnd-kit/sortable` (modern, gut für Touch)

3. **Caching**: Mobile-App cached Brand 30 s, Recommendations 5 Min. Bei Admin-Edits keinen Cache-Bust nötig — User sehen es im nächsten Poll.

4. **i18n**: Brand-Felder + Slot-Labels sind dreisprachig in der DB. Admin-UI selbst nur einsprachig (vermutlich DE) genügt.

5. **Konflikt-Vermeidung**: Wenn ein Produkt aus allen Slots entfernt wird (`slots: []`), bleibt es im Katalog aber erscheint nirgendwo in der App. Das ist gewolltes Verhalten ("inaktive Inventar-Lagerung"). Klar an den Operator kommunizieren ("Produkt versteckt — keine Slot zugewiesen").

---

> **Ende des Master-Updates Q2/2026.** Bei Fragen zur Backend-Implementierung siehe die jeweiligen Detail-Prompts und `/app/backend/routes/{branding,smart_products}.py`. Bei Fragen zur Mobile-Integration siehe `/app/frontend/src/BrandContext.tsx` und `/app/frontend/components/SmartProductBlock.tsx`.
