# Admin-Agent-Prompt — White-Label Branding (Brand-Templates)

> **Datei**: `/app/memory/ADMIN_BRANDING_PROMPT.md`
> **Erstellt**: 15.05.2026
> **Zielsystem**: Admin-Web-Dashboard (extern, separate Codebase)
> **Quelle**: VitaGuide+ FastAPI Backend
> **Status**: Backend live, Mobile-App live-fähig (in-app Switch ohne Rebuild)

---

## 🎯 Ziel

Erstelle ein **Branding-Management-Modul** im Admin-Web-Dashboard, mit dem der Operator:

1. **Brand-Templates anlegen, bearbeiten, löschen kann** (Name, Logo, Tagline, Primärfarbe)
2. **Den aktiven Brand global umschalten kann** (alle Nutzer der Mobile-App sehen sofort das neue Branding, max. 30 s Verzögerung)
3. **Zurück zum Standard-Brand „VitaGuide+" zurücksetzen kann**

**Use-Case**: Kundenpräsentationen / Sales-Demos / White-Label-Verkauf, ohne separaten App-Build pro Kunde.

---

## 📐 Architektur (bereits implementiert auf Backend-Seite)

| Komponente | Status | Pfad |
|---|---|---|
| Mongo-Collection `brands` | ✅ live | DB `vitaguide_db` |
| FastAPI-Router `/api/branding/*` | ✅ live | `/app/backend/routes/branding.py` |
| Mobile-App `BrandContext` mit 30s-Polling | ✅ live | `/app/frontend/src/BrandContext.tsx` |
| Default-Brand-Fallback | ✅ live | hardcoded in Backend + Frontend |
| Admin-Web Modul | ⏳ **zu bauen** | external Admin-Repo |

**Hinweis:** Native App-Icon und nativer Splash-Screen bleiben „VitaGuide+" (im Binary). In-App-Header, App-Name in der UI und Akzentfarbe wechseln live.

---

## 📡 Backend-Endpoints (live, einsatzbereit)

Alle Endpoints unter dem `/api/branding/` Prefix. Authentifizierung über das bestehende Admin-JWT-System (siehe `/admin/login`).

### 1. Public — vom Mobile-App genutzt

```http
GET /api/branding/active
```
**Response 200:**
```json
{
  "id": "default | <uuid>",
  "name": "VitaGuide+ (Default) | <admin label>",
  "app_name_de": "VitaGuide+",
  "app_name_it": "VitaGuide+",
  "app_name_en": "VitaGuide+",
  "tagline_de": "Dein KI-Gesundheitscoach",
  "tagline_it": "Il tuo coach IA della salute",
  "tagline_en": "Your AI health coach",
  "logo_url": "" | "https://..." | "data:image/png;base64,iVBOR...",
  "primary_color": "#2E7D52",
  "is_active": true,
  "is_default": true  // nur wenn kein Brand aktiv ist
}
```

> **Wichtig:** Wenn kein Brand mit `is_active=true` existiert, gibt der Endpoint das hardcoded DEFAULT_BRAND zurück (id="default"). Das Admin-Web zeigt diesen Zustand als „Standard-Brand aktiv (VitaGuide+)".

### 2. Admin CRUD

```http
GET /api/branding/admin/brands
```
Listet alle Brand-Templates (sortiert nach `created_at desc`).
**Response 200:**
```json
{ "items": [ /* Brand[] */ ], "total": 5 }
```

```http
POST /api/branding/admin/brands
Content-Type: application/json

{
  "name": "Acme Demo",                  // Admin-internes Label (Pflicht, 1-80 Zeichen)
  "app_name_de": "Acme Health",         // Pflicht, 1-40 Zeichen
  "app_name_it": "Acme Health",         // Pflicht
  "app_name_en": "Acme Health",         // Pflicht
  "tagline_de": "Dein Gesundheits-Hub", // Optional, max 120
  "tagline_it": "Il tuo hub salute",
  "tagline_en": "Your health hub",
  "logo_url": "data:image/png;base64,...",  // siehe Logo-Upload unten
  "primary_color": "#0066FF"            // #RRGGBB hex
}
```
**Response 200**: Komplettes Brand-Dokument mit neu generierter `id` (UUID). `is_active=false` per default.

```http
PUT /api/branding/admin/brands/{brand_id}
```
Body: gleiche Felder wie POST, alle optional (partial update).
**Response 200**: aktualisiertes Dokument.

```http
DELETE /api/branding/admin/brands/{brand_id}
```
**Response 200**: `{ "deleted": true, "id": "..." }`
**Response 400** wenn `is_active=true` → erst anderen Brand aktivieren.

### 3. Activate / Reset

```http
PUT /api/branding/admin/brands/{brand_id}/activate
```
Setzt `is_active=true` für den Ziel-Brand, `is_active=false` für alle anderen.
**Response 200**: `{ "activated": true, "brand": { ... } }`

```http
PUT /api/branding/admin/brands/reset-to-default
```
Deaktiviert alle Brands → Mobile-App fällt auf DEFAULT_BRAND (VitaGuide+) zurück.
**Response 200**: `{ "reset": true, "active": { /* DEFAULT_BRAND */ } }`

---

## 🖼️ Logo-Handling

Das `logo_url`-Feld akzeptiert **3 Formate**:

1. **Leerer String** `""` → Mobile-App nutzt das fest eingebaute Leaf-Icon mit `primary_color`.
2. **HTTPS-URL** `https://...` → Mobile-App lädt das Bild direkt.
3. **Data-URL** `data:image/png;base64,iVBORw0K...` → Bild ist direkt im Brand-Dokument eingebettet (max. ~300 KB Rohgröße).

**Empfehlung für das Admin-Web**: Upload-Komponente mit folgender Logik:

```js
// Pseudocode in Admin-Web
async function handleLogoFile(file) {
  if (file.size > 300 * 1024) {
    throw new Error('Logo zu groß (max 300 KB). Bitte verkleinern.');
  }
  // Optional: Browser-side resize auf max 256x256
  const dataUrl = await fileToDataUrl(file);  // FileReader.readAsDataURL
  return dataUrl;  // wird als logo_url gespeichert
}
```

**Bildanforderungen für Operator:**
- **Format**: PNG (mit Transparenz) oder SVG
- **Größe**: 256×256 px empfohlen (max ~300 KB nach Base64-Kodierung)
- **Quadratisch** (1:1)
- **Hintergrund**: transparent

Falls SVG gewünscht: `data:image/svg+xml;base64,...` ist auch akzeptiert. SVGs sind in der Regel <10 KB.

---

## 🎨 Admin-Web UI — Anforderungen

### Seite `/admin/branding`

**Struktur:**

```
┌──────────────────────────────────────────────────────────┐
│ Branding & White-Label                          [+ New]  │
├──────────────────────────────────────────────────────────┤
│ Aktiver Brand                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [Logo] FitCoach Demo               [● ACTIVE]      │   │
│ │ Primary: #FF6B35 ●   "Dein Trainer"                │   │
│ │ [Edit] [Set Inactive (= Reset to Default)]         │   │
│ └────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│ Inaktive Brands                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [Logo] Acme Health Demo                            │   │
│ │ Primary: #0066FF ●   "Dein Gesundheits-Hub"        │   │
│ │ [Edit] [Activate] [Delete]                         │   │
│ └────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [Logo] WellnessPlus Demo                           │   │
│ │ [Edit] [Activate] [Delete]                         │   │
│ └────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│ ⚠ Wenn kein Brand aktiv → Mobile App zeigt VitaGuide+    │
└──────────────────────────────────────────────────────────┘
```

### Create/Edit-Modal

**Felder:**
- **Internal Label** (z. B. „Acme Demo Q3-2025") — nicht für Endnutzer sichtbar
- **App-Name DE / IT / EN** — jeweils max 40 Zeichen, Pflichtfelder
- **Tagline DE / IT / EN** — max 120 Zeichen, optional (Subtitle unter dem Logo)
- **Logo Upload** — Drag-and-Drop, max 300 KB, mit Live-Preview
- **Primärfarbe** — Colorpicker, Hex-Eingabe, mit Live-Preview gegen das aktuelle App-Mockup
- **Live-Preview-Panel** rechts neben dem Formular: Mini-Mockup des Mobile-Headers mit den eingegebenen Werten

**Confirmation-Dialog** beim Aktivieren:
> „Brand **„Acme Demo"** als aktiv setzen?
> Alle Mobile-App-Nutzer sehen dieses Branding innerhalb von 30 Sekunden.
> Aktueller Brand „VitaGuide+ (Default)" bleibt erhalten und kann jederzeit reaktiviert werden."
> [Cancel] [Yes, activate]

### Mini-Mockup-Komponente (für Live-Preview)

```jsx
function MobileHeaderPreview({ appName, primaryColor, logoDataUrl }) {
  return (
    <div style={{
      background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor})`,
      padding: 20,
      borderRadius: 12,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    }}>
      {logoDataUrl && <img src={logoDataUrl} style={{ width: 22, height: 22 }} />}
      <span style={{ color: 'gold', fontSize: 18, fontWeight: 700 }}>{appName}</span>
    </div>
  );
}
```

---

## 🔒 Sicherheit & Audit

1. **Auth**: Alle `/admin/branding/*` Endpoints müssen mit Admin-JWT geschützt sein (gleiches Pattern wie andere Admin-Endpoints).
2. **Audit-Log** (Pflicht): Schreibe jede der folgenden Aktionen in `admin_audit_log`:
   - `brand_created` `{brand_id, name, admin_user}`
   - `brand_updated` `{brand_id, changed_fields, admin_user}`
   - `brand_deleted` `{brand_id, name, admin_user}`
   - `brand_activated` `{brand_id, previous_active_id, admin_user}`
   - `brand_reset_to_default` `{previous_active_id, admin_user}`
3. **Rate-Limit** bei Brand-Aktivierung: max 10 Switches pro Minute pro Admin (verhindert Demo-Flackern).
4. **Data-URL-Größen-Check** im Admin-Frontend (Backend rejected >400 KB Base64).

---

## ✅ Test-Checkliste für das Admin-Modul

- [ ] Liste lädt mit aktivem + inaktiven Brands.
- [ ] Default-Zustand (kein Brand aktiv) wird als „Standard-Brand aktiv (VitaGuide+)" angezeigt.
- [ ] Neuen Brand mit Logo-Upload (PNG 100 KB) erstellen → erscheint in Liste.
- [ ] Brand aktivieren → andere werden inaktiv, Confirmation-Dialog erscheint.
- [ ] Mobile-App-Test: nach Aktivierung ≤30 s erscheint neues Branding im Home-Header.
- [ ] Reset-to-Default → Mobile-App fällt zurück auf VitaGuide+.
- [ ] Edit-Brand → Live-Preview aktualisiert sich.
- [ ] Delete aktiven Brand → 400 Error mit klarer Fehlermeldung.
- [ ] Delete inaktiven Brand → entfernt.
- [ ] Audit-Log enthält alle Aktionen.
- [ ] Logo zu groß (>300 KB) → Frontend-Validation greift VOR Backend-Call.
- [ ] Primary-Color ungültig (z. B. „red") → Frontend-Validation greift.

---

## 🧪 Schnelltest per cURL (Backend bereits live)

```bash
API_URL="https://stress-relief-app-11.preview.emergentagent.com"

# 1. List
curl -s "$API_URL/api/branding/admin/brands"

# 2. Create
BID=$(curl -s -X POST "$API_URL/api/branding/admin/brands" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","app_name_de":"Test","app_name_it":"Test","app_name_en":"Test","tagline_de":"","tagline_it":"","tagline_en":"","logo_url":"","primary_color":"#FF0000"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")

# 3. Activate
curl -s -X PUT "$API_URL/api/branding/admin/brands/$BID/activate"

# 4. Verify active
curl -s "$API_URL/api/branding/active"

# 5. Reset + cleanup
curl -s -X PUT "$API_URL/api/branding/admin/brands/reset-to-default"
curl -s -X DELETE "$API_URL/api/branding/admin/brands/$BID"
```

---

## 📌 Implementierungshinweise für den Agent

1. **Reihenfolge der Implementierung** (P0-Sprint):
   1. Liste-Page mit GET + Activate-Button + Reset-to-Default-Button.
   2. Create/Edit-Modal mit Validierung + Live-Preview.
   3. Logo-Upload mit Browser-Resize (optional aber empfohlen).
   4. Confirmation-Dialog für Activate.
   5. Audit-Log Backend-Hooks (falls noch nicht vorhanden → ggf. erweitern).

2. **Stack-Empfehlung**:
   - Falls Admin-Web React: `react-color` für Colorpicker, `react-dropzone` für Logo-Upload.
   - Falls Vue: `vue-color`, `vue-upload-component`.
   - Keine schweren Image-Processing-Libs nötig — Browser-native `FileReader` + Canvas reicht.

3. **i18n des Admin-Web**: Die Admin-UI selbst muss nicht mehrsprachig sein. Aber die Brand-Felder DE/IT/EN sind Pflicht, damit die Mobile-App sie in der jeweiligen Nutzersprache anzeigen kann.

4. **Cache-Verhalten**: Mobile-App cached den aktiven Brand in AsyncStorage und pollt alle 30 s. Im Demo-Modus reicht das. Falls schneller benötigt: WebSocket-Push-Channel später nachrüsten (Future-Backlog).

5. **Future-Backlog** (nicht in P0):
   - Pro-User-Branding-Override (für Demo-Accounts, Brand A automatisch bei Login `demo-clientA@…`)
   - Geplante Brand-Aktivierungen (Scheduler: „Brand X aktivieren ab 14:00 Uhr für Präsentation")
   - Mehrere parallele Brands über URL-Parameter (`?brand=acme`) für gleichzeitige Demos
   - Native App-Icon-Branding (erfordert separaten EAS-Build pro Kunde)

---

## 🚀 Deployment-Hinweise

- **Backend**: bereits deployed, keine Aktion nötig.
- **Mobile-App**: bereits live mit `BrandContext`. Nächster App-Store-Release zieht Branding-Support mit.
- **Admin-Web**: neue Page `/admin/branding` deployen → fertig.

> **Ende des Branding-Agent-Prompts.** Bei Fragen zur Backend-Implementierung siehe `/app/backend/routes/branding.py`. Bei Fragen zur Mobile-Integration siehe `/app/frontend/src/BrandContext.tsx`.
