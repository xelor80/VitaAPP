# Admin-Agent-Prompt — Smart Product „Slim & Beauty" (Abnehm-Guide)

> **Datei**: `/app/memory/ADMIN_SLIM_BEAUTY_PROMPT.md`
> **Erstellt**: 18.06.2026
> **Zielsystem**: Admin-Web-Dashboard (extern, separate Codebase)
> **Quelle**: VitaGuide+ FastAPI Backend
> **Status**: Produkt bereits in DB, im Frontend live sichtbar im Abnehm-Guide
> **Voraussetzungen**: Admin-Modul „Smart Products Manager" muss laut Master-Prompt (`ADMIN_AGENT_PROMPT.md`) bereits vorhanden sein. Dieses Update ergänzt nur die spezifische Anzeige/Bearbeitung des Slim & Beauty Produkts.

---

## 🎯 Ziel

Im Admin-Web-Dashboard soll das Produkt **„Slim & Beauty"** im Smart-Products-Bereich:

1. **Sofort sichtbar/auffindbar** sein (gepinnt an der Spitze der Liste oder als Featured-Item markiert)
2. **Vollständig editierbar** sein: Titel (DE/IT/EN), Beschreibung (DE/IT/EN), Bild-URL, Affiliate-URL, Preis, Vendor, Aktivierungs-Status, Featured-Status, Badge-Text
3. **Live-Vorschau** zeigen, wie das Produkt im Mobile-App (Abnehm-Guide Sektion „Empfehlungen") aussehen wird
4. **Direkt deaktivierbar** sein (z. B. wenn der Affiliate-Vertrag pausiert wird) ohne löschen zu müssen

---

## 📐 Architektur (bereits implementiert)

| Komponente | Status | Pfad |
|---|---|---|
| Mongo-Doc `smart_products` mit ID `smart-slim-beauty-001` | ✅ live | DB `vitaguide_db` |
| Backend-Endpoints | ✅ live | `/app/backend/routes/smart_products.py` |
| Mobile-App-Anzeige im Abnehm-Guide | ✅ live | `/app/frontend/app/weight-metabolism.tsx` (Empfehlungen-Card) |
| Admin-Web Editor | ⏳ **anzupassen/zu erweitern** | external Admin-Repo |

**Datenobjekt in DB:**
```json
{
  "id": "smart-slim-beauty-001",
  "title_de": "Slim & Beauty",
  "title_it": "Slim & Beauty",
  "title_en": "Slim & Beauty",
  "description_de": "Premium-Komplex fuer Stoffwechsel, Haut und gesunde Gewichtsreduktion.",
  "description_it": "Complesso premium per metabolismo, pelle e perdita di peso sana.",
  "description_en": "Premium complex for metabolism, skin and healthy weight loss.",
  "image_url": null,                    // ← Admin soll Produktbild hochladen
  "affiliate_url": null,                // ← Admin soll Shop-Link einsetzen
  "vendor": "Platzhalter",              // ← Vendor-Name aktualisierbar
  "price_eur": null,                    // ← Preis in EUR
  "contexts": ["weight", "weight_metabolism", "abnehm_guide"],
  "symptoms": ["abnehmen", "stoffwechsel", "haut"],
  "deficits": [],
  "enabled": true,
  "is_featured": true,                  // wird oben im Empfehlungs-Block angezeigt
  "featured_order": 1,                  // Reihenfolge bei mehreren featured
  "badge": "NEU",                       // kleines Ribbon-Tag in der App
  "created_at": "2026-06-18T...",
  "is_placeholder": true                // Marker, dass es noch ein Default-Seed ist
}
```

---

## 📡 Backend-Endpoints

Alle Endpoints unter `/api/smart-products/`. Authentifizierung über bestehendes Admin-JWT.

### 1. Public — vom Mobile-App genutzt

```http
GET /api/smart-products/recommendations?context=weight&limit=3&profile_id={pid}
```
Liefert Top-N Produkte für Kontext. Slim & Beauty hat höchste Priorität (is_featured=true, featured_order=1).

Verfügbare Contexts in der App (alle relevant für Slim & Beauty):
- `weight` — generischer Gewichts-Kontext
- `weight_metabolism` — speziell Stoffwechsel-Sektion
- `abnehm_guide` — speziell Abnehm-Guide Recommendations

### 2. Admin Update

```http
PUT /api/smart-products/admin/{product_id}
Content-Type: application/json
Authorization: Bearer {admin_jwt}

{
  "title_de": "Slim & Beauty",
  "title_it": "Slim & Beauty",
  "title_en": "Slim & Beauty",
  "description_de": "...",
  "description_it": "...",
  "description_en": "...",
  "image_url": "https://shop.example.com/products/slim-beauty.jpg",
  "affiliate_url": "https://shop.example.com/product/slim-beauty?ref=jk",
  "vendor": "JK Health Shop",
  "price_eur": 39.90,
  "contexts": ["weight", "weight_metabolism", "abnehm_guide"],
  "symptoms": ["abnehmen", "stoffwechsel", "haut"],
  "deficits": [],
  "enabled": true,
  "is_featured": true,
  "featured_order": 1,
  "badge": "NEU"
}
```
**Response 200**: aktualisiertes Produkt-Dokument.

### 3. Quick Toggle Enable/Disable

```http
PUT /api/smart-products/admin/{product_id}/toggle
```
**Response 200**: `{ "id": "...", "enabled": true|false }`

### 4. Click-Tracking (optional fürs Admin-Dashboard)

```http
GET /api/smart-products/admin/clicks?product_id=smart-slim-beauty-001&days=30
```
Liefert Aggregations-Statistiken aller Affiliate-Klicks für das Produkt (Quelle: collection `smart_product_clicks`).

---

## 🎨 Admin-Web UI — Anforderungen

### Erweiterung der Smart-Products-Seite

**Spezielle Behandlung von Slim & Beauty:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Smart Products Manager                              [+ New]      │
├─────────────────────────────────────────────────────────────────┤
│ 🌟 FEATURED PRODUKTE (oben gepinnt, größere Cards)               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Bild] Slim & Beauty                  [NEU Badge] [● ACTIVE]│ │
│ │ Kontext: weight, weight_metabolism, abnehm_guide            │ │
│ │ Vendor: JK Health Shop · 39,90 EUR                          │ │
│ │ Affiliate-Link: https://shop.example.com/...               │ │
│ │ [Edit] [Disable] [Live-Preview] [📊 Stats: 142 Klicks]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Alle Produkte (Filter: [Alle] [Aktiv] [Inaktiv])                 │
│ ...                                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Edit-Modal — Slim & Beauty-spezifisch

**Pflichtfelder hervorheben:**
- ⚠️ **Affiliate-URL fehlt** → roter Warning-Banner: "Produkt noch ohne Affiliate-Link – Klicks gehen nirgendwo hin"
- ⚠️ **Bild fehlt** → gelber Warning: "Ohne Bild wird der generische rote Tropfen-Icon angezeigt"

**Hilfetexte:**
- "Badge" → "Optional. Max 5 Zeichen. Beispiele: NEU, TOP, -30%, HOT. Wird als kleines Ribbon über dem Produktbild angezeigt."
- "Featured Order" → "Reihenfolge in der Empfehlungs-Liste (1 = ganz oben). Niedrigere Zahlen erscheinen zuerst."
- "Contexts" → Multi-Select-Chips: `weight`, `weight_metabolism`, `abnehm_guide` (Standardauswahl). Erklärung: "Wo dieses Produkt in der App auftauchen darf."

### Live-Preview-Komponente

Rechts neben dem Edit-Modal ein Mockup, das genau so aussieht wie die Mobile-App-Card im Abnehm-Guide:

```jsx
// Pseudocode für die Vorschau
function SmartProductCardPreview({ product }) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 12,
      padding: 12,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        background: product.image_url
          ? `url(${product.image_url}) center/cover`
          : '#FEE2E2',
      }}>
        {!product.image_url && '🌿'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#1F2937' }}>
          {product.title_de}
          {product.badge && <span className="badge">{product.badge}</span>}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
          {product.description_de}
        </div>
        {product.price_eur && (
          <div style={{ fontSize: 12, fontWeight: 700, color: '#C2272F', marginTop: 4 }}>
            {product.price_eur.toFixed(2).replace('.', ',')} €
          </div>
        )}
      </div>
      <div style={{ color: '#9CA3AF' }}>↗</div>
    </div>
  );
}
```

---

## 🔒 Sicherheit & Validierung

1. **Auth Pflicht**: Admin-JWT für alle `PUT/DELETE` Operationen.
2. **Audit-Log** schreiben bei jeder Änderung an Slim & Beauty (besonders relevant, weil es Featured ist):
   ```json
   {
     "action": "product_updated",
     "product_id": "smart-slim-beauty-001",
     "changed_fields": ["affiliate_url", "price_eur"],
     "admin_user": "admin@vitaguide.de",
     "timestamp": "2026-06-18T12:34:56Z"
   }
   ```
3. **Validierung**:
   - `affiliate_url`: nur HTTPS, nicht leer wenn `enabled=true && is_featured=true` (Warning, nicht Hard-Error)
   - `image_url`: nur HTTPS, kein localhost
   - `price_eur`: 0 ≤ Preis ≤ 9999
   - `badge`: max 5 Zeichen
   - `contexts`: muss mindestens ein gültiger Wert sein (`weight`, `weight_metabolism`, `abnehm_guide`)

---

## ✅ Test-Checkliste

- [ ] Slim & Beauty erscheint oben in der „Featured"-Sektion des Admin-Dashboards.
- [ ] Edit-Modal öffnet sich mit allen 17 Feldern (titles, descriptions, image, affiliate, vendor, price, contexts, symptoms, deficits, enabled, is_featured, featured_order, badge, + ggf. id, created_at, is_placeholder als read-only).
- [ ] Affiliate-URL kann gesetzt werden → Mobile-App-Tap (testID `wm-smart-weight-tile`) öffnet den Link.
- [ ] Bild-URL → Mobile-App zeigt das Bild statt des Default-Icons.
- [ ] Toggle `enabled=false` → Produkt verschwindet sofort aus Empfehlungen in der Mobile-App (nächster API-Call).
- [ ] Badge ändern: "NEU" → "-30%" → in der App-Card sofort sichtbar (TTL 5 Min Cache).
- [ ] Live-Preview matched 1:1 das Aussehen in der Mobile-App.
- [ ] Audit-Log enthält die letzte Änderung mit Diff.
- [ ] Stats-Widget zeigt Klick-Zahlen der letzten 30 Tage.

---

## 🧪 Schnelltest per cURL (Backend bereits live)

```bash
API_URL="https://stress-relief-app-11.preview.emergentagent.com"
ADMIN_JWT="..."  # aus /admin/login

# 1. Aktuellen Stand abfragen
curl -s "$API_URL/api/smart-products/recommendations?context=weight&limit=3" | jq

# 2. Slim & Beauty mit Affiliate-Link + Bild updaten
curl -s -X PUT "$API_URL/api/smart-products/admin/smart-slim-beauty-001" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "title_de": "Slim & Beauty",
    "title_it": "Slim & Beauty",
    "title_en": "Slim & Beauty",
    "image_url": "https://shop.example.com/slim-beauty.png",
    "affiliate_url": "https://shop.example.com/slim-beauty?ref=jk",
    "vendor": "JK Health Shop",
    "price_eur": 39.90,
    "contexts": ["weight", "weight_metabolism", "abnehm_guide"],
    "is_featured": true,
    "featured_order": 1,
    "badge": "NEU",
    "enabled": true
  }'

# 3. Verifizieren
curl -s "$API_URL/api/smart-products/recommendations?context=weight&limit=1" | jq '.items[0]'
```

---

## 📌 Implementierungs-Reihenfolge für den Agent

**P0 (sofortige Sichtbarkeit):**
1. Smart-Products-Seite erweitern: Featured-Sektion oben anzeigen.
2. Edit-Modal mit allen Feldern + Validation + Live-Preview.
3. Toggle-Button (Enable/Disable) ohne Modal-Öffnung.

**P1 (Insights):**
4. Klick-Tracking-Stats neben jedem Featured-Produkt.
5. Audit-Log-Viewer pro Produkt.
6. Bulk-Operationen (Multi-Select + Enable/Disable + Reorder).

**P2 (Convenience):**
7. Auto-Save Draft-Modus für Texte.
8. Image-Upload-Komponente mit automatischem Resize (z. B. 400×400 Crop).
9. Affiliate-URL-Validator (HEAD-Request um zu prüfen, ob Shop-Link erreichbar ist).

---

## 🚀 Deployment-Hinweise

- **Backend**: bereits deployed mit dem neuen Slim & Beauty Seed + erweiterter Sortier-Logik (featured zuerst).
- **Mobile-App**: bereits live. Slim & Beauty erscheint in der Empfehlungs-Sektion des Abnehm-Guides.
- **Admin-Web**: Smart-Products-Seite muss um die Featured-Sektion + Live-Preview erweitert werden.

> **Ende des Slim-&-Beauty-Agent-Prompts.** Bei Fragen zur Mobile-Integration siehe `/app/frontend/components/SmartProductBlock.tsx` und `/app/frontend/app/weight-metabolism.tsx` (Empfehlungen-Card ab Zeile 1380).
