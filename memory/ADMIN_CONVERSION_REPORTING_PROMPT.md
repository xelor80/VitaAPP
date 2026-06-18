# Admin-Agent-Prompt — Conversion-Reporting (Smart Products)

> **Datei**: `/app/memory/ADMIN_CONVERSION_REPORTING_PROMPT.md`
> **Erstellt**: 18.06.2026
> **Zielsystem**: Admin-Web-Dashboard
> **Quelle**: VitaGuide+ FastAPI Backend
> **Status**: Backend voll implementiert, Frontend trackt Impressions automatisch
> **Voraussetzungen**: Smart-Products-Manager Modul (siehe `ADMIN_AGENT_PROMPT.md` + `ADMIN_SLIM_BEAUTY_PROMPT.md`)

---

## 🎯 Ziel

Conversion-Dashboard im Admin-Web aufbauen, das **Impressions, Klicks, CTR (Click-Through-Rate) und Unique-Viewer→Clicker-Conversion** für alle Smart-Products visualisiert. Spezielle Fokus auf Featured-Produkte wie **Slim & Beauty**.

---

## 📐 Datenmodell

Zwei neue/erweiterte Collections:

### `smart_product_impressions` (neu)
Wird automatisch befüllt, sobald eine Produktkarte in der Mobile-App gerendert wird (passiver View).

```json
{
  "id": "uuid",
  "product_id": "smart-slim-beauty-001",
  "profile_id": "f97fdefb-...",   // optional, kann null sein
  "context": "weight",            // dashboard | stress | fasting | weight | weight_metabolism | abnehm_guide | analysis | featured_slider
  "ts": "2026-06-18T12:34:56Z"
}
```

### `smart_product_clicks` (existierte schon)
Wird befüllt beim Tap auf eine Produktkarte (vor Affiliate-Link-Öffnung).

```json
{
  "id": "uuid",
  "product_id": "smart-slim-beauty-001",
  "profile_id": "f97fdefb-...",
  "context": "weight",
  "ts": "2026-06-18T12:35:10Z"
}
```

**Indexe** (bereits angelegt):
- `smart_product_impressions`: `(product_id, ts)`, `(context, ts)`
- `smart_product_clicks`: `(product_id, ts)`, `(context, ts)`

---

## 📡 Backend-Endpoints (alle live)

Alle unter `/api/smart-products/`. Admin-JWT-Schutz empfohlen für Stats-Endpoints.

### 1. Impression-Logging (vom Mobile-App genutzt — Admin braucht nichts machen)

```http
POST /impression                    # Single
POST /impression/batch              # Batch (bis 50 Items)
```

### 2. Click-Logging (existierte schon)

```http
POST /click
```

### 3. Aggregierte Stats — Hauptquelle fürs Admin-Dashboard

```http
GET /stats?days=30
```
**Response:**
```json
{
  "window_days": 30,
  "totals": {
    "impressions": 1842,
    "clicks": 124,
    "ctr_pct": 6.73,
    "products_with_clicks": 8
  },
  "per_product": [
    {
      "product_id": "smart-slim-beauty-001",
      "title_de": "Slim & Beauty",
      "is_featured": true,
      "impressions": 412,
      "clicks": 38,
      "ctr_pct": 9.22,
      "last_click": "2026-06-18T07:22:00Z"
    },
    ...
  ]
}
```

### 4. Time-Series für Charts

```http
GET /stats/timeseries?product_id={pid}&days=30
```
Optional `product_id`: wenn weggelassen, aggregierte Daily-Stats über alle Produkte.

**Response:**
```json
{
  "product_id": "smart-slim-beauty-001",
  "days": 30,
  "series": [
    {"date": "2026-05-20", "impressions": 12, "clicks": 1, "ctr_pct": 8.33},
    {"date": "2026-05-21", "impressions": 18, "clicks": 2, "ctr_pct": 11.11},
    ...
  ]
}
```

### 5. By-Context Breakdown

```http
GET /stats/by-context?days=30
```
Liefert KPIs pro App-Bereich (welcher Kontext konvertiert am besten?).

**Response:**
```json
{
  "window_days": 30,
  "by_context": [
    {"context": "weight",        "impressions": 412, "clicks": 38, "ctr_pct": 9.22},
    {"context": "dashboard",     "impressions": 720, "clicks": 22, "ctr_pct": 3.06},
    {"context": "abnehm_guide",  "impressions": 188, "clicks": 19, "ctr_pct": 10.11},
    ...
  ]
}
```

### 6. Produkt-Detail (KPI-Drill-Down)

```http
GET /stats/product/{product_id}?days=30
```
**Response für Slim & Beauty:**
```json
{
  "product": {
    "id": "smart-slim-beauty-001",
    "title_de": "Slim & Beauty",
    "is_featured": true,
    "enabled": true,
    "badge": "NEU"
  },
  "window_days": 30,
  "impressions": 412,
  "clicks": 38,
  "ctr_pct": 9.22,
  "unique_viewers": 287,           // Reichweite
  "unique_clickers": 31,           // Conversion
  "viewer_to_clicker_conversion_pct": 10.8,   // ← wichtigste Metrik
  "by_context": [
    {"context": "weight",      "clicks": 19},
    {"context": "abnehm_guide", "clicks": 14},
    {"context": "weight_metabolism", "clicks": 5}
  ]
}
```

---

## 🎨 Admin-Web UI — Vorgaben

### Neue Seite `/admin/conversion-reports`

```
┌─────────────────────────────────────────────────────────────────┐
│ Conversion Reports                  [Zeitraum: 7d | 30d | 90d]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┬─────────────┬─────────────┬─────────────────┐   │
│ │ Impressions │ Klicks      │ CTR         │ Aktive Produkte │   │
│ │ 1.842       │ 124         │ 6,73%       │ 8 von 12        │   │
│ └─────────────┴─────────────┴─────────────┴─────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ 📈 Trend (Daily) — alle Produkte                                 │
│ [Line Chart: Impressions + Klicks + CTR über 30 Tage]            │
├─────────────────────────────────────────────────────────────────┤
│ 🏆 Top Performers                                                │
│ ┌────────────────────────────────────────────────────────┐      │
│ │ 1. Slim & Beauty 🌟    412 imp · 38 cl · 9,22% CTR    │      │
│ │ 2. CortiONE            380 imp · 22 cl · 5,79% CTR    │      │
│ │ 3. Vitamin B12         220 imp · 18 cl · 8,18% CTR    │      │
│ │ 4. Omega-3 Algenoel    188 imp · 12 cl · 6,38% CTR    │      │
│ └────────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────┤
│ 🗺️ Konvertierung nach Kontext (welcher Bereich konvertiert?)    │
│ [Bar Chart: weight, dashboard, abnehm_guide, stress, ...]        │
│   weight        ████████████ 9.22%                               │
│   abnehm_guide ████████████████ 10.11%   ← best                  │
│   dashboard    ███ 3.06%                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Produkt-Detail-Seite `/admin/conversion-reports/{product_id}`

Klick auf einen Top-Performer öffnet:

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Zurück     Slim & Beauty 🌟 NEU                                │
├─────────────────────────────────────────────────────────────────┤
│ [Featured · Aktiviert · Badge: NEU]                              │
│                                                                  │
│ KPI-Kacheln:                                                     │
│ ┌────────────┬────────────┬────────────┬────────────────────┐   │
│ │ Impressions│ Klicks     │ CTR        │ Viewer → Clicker   │   │
│ │ 412        │ 38         │ 9,22%      │ 10,8%              │   │
│ │            │            │            │ (31 von 287 Usern) │   │
│ └────────────┴────────────┴────────────┴────────────────────┘   │
│                                                                  │
│ 📈 Tägliche Performance (30 Tage)                                │
│ [Stacked Line Chart: Impressions (blau) + Klicks (rot)]          │
│                                                                  │
│ 🗂️ Klicks nach Kontext                                           │
│ • weight             → 19 Klicks (50%)                           │
│ • abnehm_guide       → 14 Klicks (37%)                           │
│ • weight_metabolism  → 5 Klicks (13%)                            │
│                                                                  │
│ [Edit Product] [View in App]                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 KPI-Definitionen

| Metrik | Berechnung | Wofür wichtig |
|---|---|---|
| **Impressions** | Count `smart_product_impressions` | Reichweite — wie oft wurde das Produkt angezeigt |
| **Clicks** | Count `smart_product_clicks` | Aktivität — wie oft wurde es angetippt |
| **CTR (%)** | `(Clicks / Impressions) × 100` | Wirkkraft pro Anzeige — höher = bessere Card-Performance |
| **Unique Viewers** | `distinct(profile_id) WHERE impressions` | Wie viele individuelle User haben das Produkt überhaupt gesehen |
| **Unique Clickers** | `distinct(profile_id) WHERE clicks` | Wie viele individuelle User haben getappt |
| **Viewer → Clicker Conversion (%)** | `(Unique Clickers / Unique Viewers) × 100` | **Wichtigste Metrik** — wie viel % der Sichtkontakte werden zu echtem Interesse |

> **Faustregel für Wellness-Affiliate**: CTR > 5% ist solide, > 8% ist sehr gut. Viewer-Conversion > 10% deutet auf starkes Match Produkt↔Kontext hin.

---

## 🚦 Empfohlene Alerts/Insights

Im Admin-Dashboard automatisch anzeigen:

1. **🟢 Top-Performer**: Wenn Produkt CTR > 10% UND Klicks ≥ 20 in den letzten 7 Tagen → grüner Badge „🚀 Top Conversion".
2. **🔴 Underperformer**: Wenn `is_featured=true` UND CTR < 2% nach 14 Tagen Featured → roter Warn-Banner „⚠️ Featured-Slot underperformt — Badge oder Bild austauschen?"
3. **🟡 Context-Mismatch**: Wenn Produkt 50%+ Klicks aus einem Kontext bekommt, der NICHT in `product.contexts` ist → Empfehlung „Kontext X zur Liste hinzufügen für höhere Sichtbarkeit".
4. **📊 Wochenrückblick-Email**: Optionaler Cron-Job (z. B. Montag 08:00) — schickt Admin eine Email mit Top-3-Performern + 3 Underperformern der vergangenen Woche.

---

## 🔒 Sicherheit & Datenschutz

1. **GDPR-Anonymisierung**: Beim Export oder externen Berichten **niemals** `profile_id` mit ausgeben. Stets aggregierte Counts.
2. **Retention**: `smart_product_impressions` ältere als 180 Tage automatisch löschen (Cron-Job). `smart_product_clicks` 365 Tage behalten (Conversion-Tracking).
3. **Audit-Log nicht erforderlich** für Read-Stats (nur Lesezugriff).
4. **Rate-Limit** für Impression-Endpoint: max 100 req/min pro Profile_ID (Schutz gegen Spam).

---

## ✅ Test-Checkliste

- [ ] `GET /stats?days=30` liefert valide JSON mit `totals.ctr_pct` und `per_product` Array.
- [ ] `GET /stats/product/smart-slim-beauty-001?days=30` zeigt detaillierte KPIs inkl. Viewer-Conversion.
- [ ] Time-Series liefert mindestens einen Datenpunkt pro Tag mit Aktivität.
- [ ] By-Context Breakdown listet alle Kontexte mit nicht-null Counts.
- [ ] KPI-Kacheln formatieren Zahlen korrekt (Tausender-Trennung, %-Symbol, 2 Dezimalstellen).
- [ ] Charts skalieren x-Achse adaptiv (7d / 30d / 90d).
- [ ] Klick auf Top-Performer öffnet Detail-Seite.
- [ ] Underperformer-Alert erscheint bei Test-Daten (Manuel einen Featured-Eintrag mit niedrigem CTR erzeugen).

---

## 🧪 cURL-Schnelltest

```bash
API_URL="https://stress-relief-app-11.preview.emergentagent.com"

# 1. Overall Stats
curl -s "$API_URL/api/smart-products/stats?days=30" | jq

# 2. Slim & Beauty Detail
curl -s "$API_URL/api/smart-products/stats/product/smart-slim-beauty-001?days=30" | jq

# 3. Time-Series (für Slim & Beauty)
curl -s "$API_URL/api/smart-products/stats/timeseries?product_id=smart-slim-beauty-001&days=30" | jq

# 4. By-Context
curl -s "$API_URL/api/smart-products/stats/by-context?days=30" | jq
```

---

## 📌 Implementierungs-Reihenfolge für den Agent

**P0 — Sofort sichtbar:**
1. Seite `/admin/conversion-reports` mit 4 KPI-Kacheln (Totals von `/stats`).
2. Top-10-Performer-Tabelle (sortierbar nach Klicks, Impressions, CTR).
3. Zeitraum-Filter (7d/30d/90d).

**P1 — Drill-Down:**
4. Produkt-Detail-Seite mit Time-Series-Chart (Recharts/Chartjs/Victory).
5. By-Context Bar-Chart auf Hauptseite.
6. Underperformer/Top-Performer Auto-Tagging.

**P2 — Polish:**
7. Wochenrückblick-Email (Cron via existierende Backend-Scheduler-Infrastruktur).
8. Export-Button (CSV/Excel der per_product-Tabelle).
9. Vergleichs-Funktion: 2 Produkte side-by-side.

---

## 🛠️ Datenfluss-Erklärung

```
[Mobile App] 
  → render SmartProductBlock → POST /impression/batch (3 items)
  → user taps card           → POST /click + Linking.openURL(affiliate_url)

[Mongo Atlas]
  smart_product_impressions ← stetig wachsende Collection
  smart_product_clicks      ← Conversion-Quelle

[Admin Web Dashboard]
  → GET /stats               → KPI-Kacheln + Top-Performer
  → GET /stats/timeseries    → Charts
  → GET /stats/product/{id}  → Detail-Drill-Down
  → GET /stats/by-context    → Bar-Chart Context-Vergleich
```

> **Ende des Conversion-Reporting-Agent-Prompts.** Bei Fragen zur Frontend-Tracking-Logik siehe `/app/frontend/components/SmartProductBlock.tsx` (impression-batch wird im useEffect getriggert nach jedem render).
