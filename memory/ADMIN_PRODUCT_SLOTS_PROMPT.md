# Admin-Agent-Prompt — Smart Product Slots (UI-Kategorien)

> **Datei**: `/app/memory/ADMIN_PRODUCT_SLOTS_PROMPT.md`
> **Erstellt**: 18.06.2026
> **Zielsystem**: Admin-Web-Dashboard
> **Quelle**: VitaGuide+ FastAPI Backend
> **Status**: Backend voll implementiert + getestet
> **Voraussetzungen**: Smart-Products-Manager Modul (siehe `ADMIN_AGENT_PROMPT.md`)

---

## 🎯 Ziel

Im Admin-Web-Dashboard im Bereich „Smart Products" soll der Operator pro Produkt **per Checkbox/Multi-Select entscheiden**, in welchen **3 UI-Slots** der Mobile-App das Produkt erscheinen soll:

1. **🏠 Home Slider** — Featured-Karussell oben im Home-Dashboard
2. **🧘 Stress & Entspannung** — Empfehlungs-Block in der Stress-Sektion
3. **⚖️ Gewicht & Stoffwechsel** — Empfehlungs-Block im Abnehm-Guide

---

## 📐 Datenmodell

Slots sind ein **abgeleitetes Feld** über dem existierenden `contexts`-Array. Das Backend stellt eine **2-Wege-Abbildung** bereit:

```
slot                 → contexts (was in DB landet)
─────────────────────────────────────────────────────
home_slider          → ["featured_slider", "dashboard"]
stress_relax         → ["stress", "sleep", "stress_player"]
weight_metabolism    → ["weight", "weight_metabolism", "abnehm_guide", "fasting"]
```

**In der Produkt-Response** sieht das Admin so aus:

```json
{
  "id": "smart-slim-beauty-001",
  "title_de": "Slim & Beauty",
  "contexts": ["weight", "weight_metabolism", "abnehm_guide", "fasting"],
  "slots": ["weight_metabolism"],   // ← abgeleitet, fürs Admin-UI gedacht
  "is_featured": true,
  "enabled": true,
  ...
}
```

> **Wichtig:** Das `contexts`-Feld bleibt unverändert kompatibel zu allen bestehenden Mobile-App-Calls (`/recommendations?context=weight`). Das `slots`-Feld ist nur eine **Admin-Convenience**.

---

## 📡 Backend-Endpoints (alle live)

### 1. Slots auflisten — KPI-Übersicht

```http
GET /api/smart-products/slots
```
**Response:**
```json
{
  "slots": [
    {
      "slot": "home_slider",
      "label": { "de": "Home Slider", "it": "Slider Home", "en": "Home Slider" },
      "mapped_contexts": ["featured_slider", "dashboard"],
      "active_product_count": 2
    },
    {
      "slot": "stress_relax",
      "label": { "de": "Stress & Entspannung", "it": "Stress & Relax", "en": "Stress & Relax" },
      "mapped_contexts": ["stress", "sleep", "stress_player"],
      "active_product_count": 3
    },
    {
      "slot": "weight_metabolism",
      "label": { "de": "Gewicht & Stoffwechsel", "it": "Peso & metabolismo", "en": "Weight & Metabolism" },
      "mapped_contexts": ["weight", "weight_metabolism", "abnehm_guide", "fasting"],
      "active_product_count": 6
    }
  ]
}
```

### 2. Produkte pro Slot

```http
GET /api/smart-products/slots/{slot}/products
```
- `{slot}`: `home_slider` | `stress_relax` | `weight_metabolism`
- Liefert alle Produkte (auch deaktivierte) in dem Slot, sortiert nach Featured + featured_order.
- Jedes Item enthält das neue Feld `slots: [...]`.

**Response:**
```json
{
  "slot": "weight_metabolism",
  "count": 6,
  "items": [
    {
      "id": "smart-slim-beauty-001",
      "title_de": "Slim & Beauty",
      "slots": ["weight_metabolism"],
      "is_featured": true,
      "featured_order": 1,
      "enabled": true,
      ...
    },
    ...
  ]
}
```

### 3. Slot-Zuweisung ändern (das wichtigste fürs Admin-UI)

```http
PUT /api/smart-products/catalog/{product_id}/slots
Content-Type: application/json

{
  "slots": ["home_slider", "weight_metabolism"]
}
```
**Effekt**: Die Slot-Liste wird angewendet → `contexts`-Feld in der DB wird neu berechnet. Beliebige nicht-Slot-Contexts (z. B. `energy`, `analysis` falls vom Operator manuell gesetzt) bleiben erhalten.

**Response**: aktualisiertes Produkt mit neuen `contexts` + `slots`.

**Validierung**: Slot-Werte müssen aus `["home_slider", "stress_relax", "weight_metabolism"]` kommen, sonst HTTP 400.

### 4. Katalog (existierte schon, jetzt mit `slots` Feld)

```http
GET /api/smart-products/catalog
```
Liefert jetzt für jedes Produkt zusätzlich `slots: [...]`.

---

## 🎨 Admin-Web UI — Vorgaben

### Smart-Products-Hauptseite

**Filter-Bar oben hinzufügen:**

```
[Alle] [🏠 Home Slider (2)] [🧘 Stress (3)] [⚖️ Weight (6)] [Inaktiv]
```

Klick auf einen Filter → ruft `/slots/{slot}/products` und zeigt nur die Treffer.

**In jeder Produkt-Card** zeige die Slot-Badges:

```
┌────────────────────────────────────────────────────────┐
│ [Bild] Slim & Beauty             [NEU] [● Active]      │
│ 🏠 Home Slider  ⚖️ Gewicht & Stoffwechsel              │
│ Vendor: JK Health Shop · 39,90 EUR                     │
│ [Edit] [Slots] [Disable] [📊 9.22% CTR]                │
└────────────────────────────────────────────────────────┘
```

### Slot-Selector-Modal („Produkt zuweisen")

Klick auf [Slots]-Button öffnet ein einfaches Modal:

```
┌───────────────────────────────────────────┐
│ Wo soll „Slim & Beauty" erscheinen?       │
│                                           │
│ ☑ 🏠 Home Slider                          │
│      → Featured Karussell oben im Home    │
│                                           │
│ ☐ 🧘 Stress & Entspannung                 │
│      → Empfehlungen in Stress-Sektion     │
│                                           │
│ ☑ ⚖️ Gewicht & Stoffwechsel               │
│      → Empfehlungen im Abnehm-Guide       │
│                                           │
│ [Abbrechen] [Speichern]                   │
└───────────────────────────────────────────┘
```

**On Save** → `PUT /catalog/{product_id}/slots` mit dem Array der angehakten Slots.

### Drag-and-Drop-Reihenfolge pro Slot (P1, nice-to-have)

Eine zweite Tab-Ansicht „Slot-Manager":

```
🏠 Home Slider (2 Produkte)
  1. ▦ Vitamin D3 + K2          [featured_order=1]
  2. ▦ Omega-3 Algenöl          [featured_order=2]
  [+ Neues Produkt hinzufügen]

🧘 Stress & Entspannung (3 Produkte)
  ...
```

Drag-Ziehen → `PUT /catalog/{product_id}` mit `featured_order: N`.

---

## 🧪 cURL-Schnelltest (Backend live)

```bash
API_URL="https://stress-relief-app-11.preview.emergentagent.com"

# 1. Übersicht aller Slots
curl -s "$API_URL/api/smart-products/slots" | jq

# 2. Welche Produkte im weight_metabolism Slot?
curl -s "$API_URL/api/smart-products/slots/weight_metabolism/products" | jq '.items[] | {id, title_de, slots, is_featured}'

# 3. Slim & Beauty in Home Slider zusätzlich anzeigen
curl -s -X PUT "$API_URL/api/smart-products/catalog/smart-slim-beauty-001/slots" \
  -H "Content-Type: application/json" \
  -d '{"slots":["home_slider","weight_metabolism"]}' | jq

# 4. Verifizieren
curl -s "$API_URL/api/smart-products/slots" | jq '.slots[] | {slot, active_product_count}'
```

---

## 🔒 Sicherheit

1. **Admin-JWT** für alle `PUT/DELETE` Operationen.
2. **Audit-Log** schreiben bei jeder Slot-Änderung:
   ```json
   {
     "action": "product_slots_updated",
     "product_id": "smart-slim-beauty-001",
     "from_slots": ["weight_metabolism"],
     "to_slots": ["home_slider", "weight_metabolism"],
     "admin_user": "admin@vitaguide.de",
     "ts": "2026-06-18T..."
   }
   ```

---

## ✅ Test-Checkliste

- [ ] `GET /slots` liefert 3 Slots mit aktuellen Counts.
- [ ] Filter „Home Slider" zeigt nur Produkte mit `slots` enthält `home_slider`.
- [ ] Slot-Modal speichert die Auswahl per `PUT /catalog/{id}/slots`.
- [ ] Nach Speichern: Mobile-App zeigt das Produkt im neuen Slot (max 5 Min Cache).
- [ ] Entfernen eines Slots → Produkt verschwindet aus der App-Sektion.
- [ ] Custom Contexts (nicht zu Slots gehörend) bleiben nach Update erhalten.
- [ ] Ungültiger Slot in Request → HTTP 400 mit klarer Fehlermeldung.
- [ ] Audit-Log enthält Before/After Slot-Liste.

---

## 📌 Implementierungs-Reihenfolge

**P0 — Slot-Filter + Slot-Selector:**
1. Slot-Übersicht oben in Smart-Products-Seite (3 Karten mit Count).
2. Filter-Bar (alle / pro Slot / inaktiv).
3. Slot-Badge in jeder Produkt-Card.
4. „Slots"-Button öffnet Multi-Select-Modal.

**P1 — Slot-Manager-Tab:**
5. Dedizierte Slot-Manager-Page mit Drag-and-Drop-Reihenfolge.
6. Inline-Add-Button pro Slot.
7. Counter-Limit-Warning (z. B. „Mehr als 5 Produkte im Home Slider verringert Conversion").

**P2 — Insights:**
8. Pro-Slot Conversion-Reports (welcher Slot konvertiert am besten?).
9. A/B-Test-Mode: gleiches Produkt in 2 Slots → Vergleich der CTRs.

---

## 🛠️ Daten-Flow-Erklärung

```
[Admin-Web]
  Operator setzt: Slim & Beauty → ☑ home_slider + ☑ weight_metabolism
  → PUT /catalog/smart-slim-beauty-001/slots {"slots":["home_slider","weight_metabolism"]}

[Backend]
  merge_contexts_for_slots() berechnet:
    contexts = ["featured_slider", "dashboard", "weight", "weight_metabolism", "abnehm_guide", "fasting"]
  → Mongo update

[Mobile-App]
  Home-Slider call: GET /featured?limit=8 → trifft jetzt auch Slim & Beauty (hat "featured_slider")
  Weight-Metabolism call: GET /recommendations?context=weight → trifft Slim & Beauty (hat "weight")
```

> **Ende des Slot-Manager-Prompts.** Bei Fragen zur Mapping-Logik siehe `/app/backend/routes/smart_products.py::SLOT_TO_CONTEXTS` und `merge_contexts_for_slots()`.
