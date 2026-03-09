# VitaGuide - Product Requirements Document

## Original Problem Statement
A health-focused, bilingual (German/Italian) mobile app where an LLM analyzes user-inputted symptoms to provide nutrition tips, supplement information, and affiliate links.

## Architecture
- **Frontend**: React Native (Expo SDK 54) - Mobile App
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Atlas in production)
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **TTS**: OpenAI TTS via Emergent LLM Key (expo-audio)
- **Integrations**: Shopify (product import), SMTP (email export), Unsplash (recipe images)
- **Admin Panel**: Static HTML/JS/CSS served at /api/admin-app

## Implemented Features (Complete)
1-53: All features through supplement compliance sync
54. Admin: Nutzerstatistiken-Dashboard (2026-03-07)
55. Admin: Shopify-Sync-Status & Historie (2026-03-07)
56. Admin: Taegliches Sync-Intervall (2026-03-07)
57. VIO Guide-Maskottchen-System (2026-03-09)
58. VIO: Disclaimer-Timing Fix (2026-03-09)
59. **Shopify Sync v2 - 5 Verbesserungen** (2026-03-09):
    - **Verfuegbarkeitspruefung**: `_is_product_available()` prueft `variants[].available`. Produkte die nicht mehr im Shop sind werden als `available: false` + `removed_from_shop: true` markiert
    - **KI-Re-Extraktion bei Aenderungen**: `body_html_hash` (MD5) erkennt Beschreibungsaenderungen. Bei Aenderung wird automatisch KI-Analyse fuer Einnahme, Dosierung, Inhaltsstoffe erneut ausgefuehrt
    - **Manuelle Produkte bereinigen**: Alte Produkte ohne `shopify_id` werden per Namensabgleich erkannt und geloescht wenn Shopify-Pendant existiert
    - **Vollstaendiger Re-Import**: Neuer Endpoint `POST /api/admin/full-reimport/{lang}` + Admin-Panel Buttons. Re-importiert ALLE Produkte inkl. KI-Analyse
    - **Per-Produkt Sync-Status**: Neue Felder `last_synced_at`, `body_html_hash`, `available`, `source`, `compare_at_price`
    - Sync-Historie zeigt jetzt "Typ" (Sync vs Re-Import)

## Key New API Endpoints
- `POST /api/admin/full-reimport/{lang}` - Vollstaendiger Re-Import mit KI
- `GET /api/admin/sync-history` - Erweitert mit type-Feld
- Alle Produkt-Dokumente haben jetzt: last_synced_at, body_html_hash, available, source

## Key DB Changes
- `products_de/it`: Neue Felder: `available`, `removed_from_shop`, `removed_at`, `last_synced_at`, `body_html_hash`, `source`, `compare_at_price`
- `sync_history`: Neues Feld `type` (sync | force_reimport)
- `price_history`: Unveraendert

## Backlog
- Verschiedene VIO-Posen fuer unterschiedliche Zustaende
- Personalisierte VIO-Tipps basierend auf Nutzerdaten
- Guide-Texte ueber Admin-Panel verwaltbar
- Erweiterte Gamification (Achievements, Wochenziele)
- Rezept-Erweiterungen (Einkaufsliste, Essensplan)
