# VitaGuide - Product Requirements Document (PRD)

## Ubersicht
VitaGuide ist eine kostenlose Gesundheits-Informations-App, die uber eine KI-Anbindung (GPT-4o) symptombezogene, allgemeine Informationen verarbeitet und Nutzern evidenzbasierte Ernahrungstipps, Rezepte, allgemeine Supplement-Informationen und Affiliate-Produktempfehlungen liefert.

**WICHTIG:** Die App ist KEIN Medizinprodukt, ersetzt keine arztliche Beratung, stellt keine Diagnosen und gibt keine personalisierten medizinischen Behandlungsanweisungen.

## Tech Stack
- **Frontend:** Expo React Native (SDK 54), expo-router, TypeScript
- **Backend:** FastAPI (Python), MongoDB (Motor)
- **KI:** OpenAI GPT-4o via Emergent LLM Key
- **Datenbank:** MongoDB
- **Sprachen:** Deutsch + Italienisch (mit Sprachumschaltung)

## Implementierte Features

### 1. Zweisprachigkeit (DE/IT) - DONE
- Sprachumschaltung: DE/IT Toggle im Header des Homescreens und Disclaimer
- LangContext: React Context fur app-weite Sprachverwaltung mit AsyncStorage-Persistenz
- i18n System: Ubersetzungsdatei (i18n.ts) mit allen UI-Texten inkl. Tagebuch
- Separater IT System-Prompt: Kompletter italienischer KI-Prompt mit Sicherheitshinweisen
- Italiano Produktkatalog: 61 Einzelprodukte von joachimkaeser.it (gescraped)
- Produkt-Videos: 8 italienische Produkte mit YouTube-Video-Links
- Video-Button: "Guarda il video" / "Video ansehen" Button auf Produktkarten
- Tagebuch zweisprachig: Alle Labels, Rating-Beschriftungen, Alerts, Trend-Ansicht auf IT ubersetzt

### 2. Produktkataloge - DONE
- Deutsch: 30 Produkte von joachim-kaeser.de mit offiziellen Anwendungshinweisen
- Italienisch: 61 Einzelprodukte von joachimkaeser.it mit Anwendungshinweisen + Videos
- Affiliate-Links: Sprachabhangig (.de fur DE, .it fur IT)

### 3. Onboarding / Disclaimer (zweisprachig) - DONE
- Blockierender Disclaimer-Screen mit Sicherheitshinweisen
- Sprachauswahl bereits im Disclaimer moglich
- Persistente Zustimmung via AsyncStorage

### 4. Symptom-Eingabe (zweisprachig) - DONE
- Freitext-Eingabe mit sprachabhangigen Platzhaltern
- 10 Symptom-Chips pro Sprache (DE/IT)
- lang Parameter wird an API ubergeben

### 5. KI-Analyse (GPT-4o, zweisprachig) - DONE
- Separate System-Prompts fur DE und IT
- Sprachabhangiger Produktkatalog
- Prompt Version 1.2 mit offiziellen Anwendungshinweisen
- Red-Flag-Erkennung in beiden Sprachen

### 6. Ergebnis-Ansicht (4 Tabs, zweisprachig) - DONE + REFACTORED (27.02.2026)
- Ubersicht/Panoramica: Zusammenfassung, Red-Flag-Warnungen, Featured Product
- Supplements/Integratori: Nahrstoff-Infos mit Evidenzlevel + Produktkarten
- Ernahrung/Nutrizione: Einnahmeplan mit offiziellen Herstellerhinweisen + Ernahrungstipps
- Rezepte/Ricette: Rezept-Cards mit Bildern aus dem statischen Katalog (30 Rezepte)
- **Refactoring:** results.tsx (788 Zeilen -> 147 Zeilen) in 4 Tab-Komponenten aufgeteilt:
  - components/tabs/OverviewTab.tsx (85 Zeilen)
  - components/tabs/SupplementsTab.tsx (81 Zeilen)
  - components/tabs/NutritionTab.tsx (102 Zeilen)
  - components/tabs/RecipesTab.tsx (121 Zeilen)
  - components/styles/resultsStyles.ts (gemeinsame Styles)

### 7. Rezeptkatalog - DONE (27.02.2026)
- 30 zweisprachige Rezepte mit hochwertigen Bildern (Unsplash/Pexels)
- Backend: GET /api/recipes?lang={de|it}&tags= Endpoint mit symptom-basierter Filterung
- Frontend: RecipesTab in results.tsx integriert mit expandierbaren Karten
- Rezeptbilder via CSS-Workaround (.rimg-wrap Klasse in +html.tsx) wegen React Native Web Limitierung
- Filterung: Nur passende Katalog-Rezepte bei ausgewahlten Symptom-Chips, sonst nur LLM-Rezepte
- Klickbare Karten mit Zutaten und Zubereitungsschritten (expandierbar)

### 8. Anwendungshinweise (gescraped) - DONE
- DE: 30 Produkte (26 auto-gescraped, 4 manuell erganzt)
- IT: 61 Produkte (60 auto-gescraped, 1 ohne Hinweise)
- Scraper-Scripts: scrape_instructions.py, scrape_it_products.py

### 9. Symptom-Tagebuch - DONE
- Tagliches Tracking: Befinden, Schlaf, Stress, Wasser, Bewegung
- KI-Trend-Analyse
- Zweisprachig (DE/IT)

### 10. Affiliate-System - DONE
- Click-Tracking: POST /api/track/click (speichert in MongoDB clicks Collection)
- Sprachabhangige Affiliate-URLs
- Frontend-Integration: trackClick Funktion in results.tsx

### 11. LLM Response Logging - DONE (27.02.2026)
- Eigene `llm_responses` MongoDB Collection
- Logging fur beide LLM-Endpoints: symptoms/analyze und diary/trends
- Gespeicherte Daten: id, endpoint, model, prompt_version, lang, input_text, input_tags, raw_output, success, latency_ms, timestamp
- Admin-Endpoint: GET /api/llm-logs?limit=&endpoint= mit aggregierten Stats (total_calls, success_rate, avg_latency_ms)

## API Endpoints
| Method | Endpoint | Beschreibung |
|--------|---------|-------------|
| GET | /api/health | Health Check |
| POST | /api/symptoms/analyze | Symptom-Analyse (lang=de|it) |
| GET | /api/analysis/{id} | Gespeicherte Analyse |
| GET | /api/products?lang=&tags= | Produktkatalog (DE: 30, IT: 61) |
| GET | /api/recipes?lang=&tags= | Rezeptkatalog (30 zweisprachig) |
| POST | /api/track/click | Affiliate-Click-Tracking |
| POST | /api/diary | Tagebuch-Eintrag speichern |
| GET | /api/diary | Tagebuch-Eintrage abrufen |
| GET | /api/diary/trends | Trend-Analyse mit KI-Tipps |
| GET | /api/llm-logs | LLM-Response-Logs mit Stats (limit, endpoint Filter) |

## Dateien
### Backend (modular seit 27.02.2026)
- server.py: Schlanke Haupt-App (35 Zeilen), importiert Router-Module
- core/config.py: DB-Verbindung (MongoDB/Motor), Logger
- core/helpers.py: Rate-Limiting, LLM-Response-Parsing
- models/schemas.py: Pydantic Models (SymptomInput, ClickEventInput, DiaryEntryInput)
- data/catalogs.py: Ladt products_de.json, products_it.json, recipes.json
- data/prompts.py: System-Prompts DE + IT fur LLM
- routes/analysis.py: /symptoms/analyze, /analysis/{id}
- routes/products.py: /products, /recipes (mit Tag-Filterung)
- routes/tracking.py: /track/click
- routes/diary.py: /diary, /diary/trends
- routes/admin.py: /health, /llm-logs
- products_de.json: Deutscher Produktkatalog (30 Produkte, exportiert aus Server)
- products_it.json: Italienischer Produktkatalog (61 Produkte)
- recipes.json: Zweisprachiger Rezeptkatalog (30 Rezepte)

### Frontend
- app/index.tsx: Home mit Sprachumschaltung
- app/results.tsx: Ergebnisse (zweisprachig, 4 Tabs, expandierbare Rezepte)
- app/diary.tsx: Tagebuch
- app/+html.tsx: Web-Template mit Custom CSS (.rimg-wrap fur Rezeptbilder)
- app/_layout.tsx: Root-Layout mit LangProvider
- src/i18n.ts: Ubersetzungen DE/IT
- src/LangContext.tsx: Sprach-Context
- src/store.ts: In-memory Store fur Analyse-Daten

## Testing Status (27.02.2026)
- Backend: 18/18 Tests bestanden (iteration_3.json)
- Frontend: Alle E2E-Flows verifiziert
- Test Files: backend/tests/test_recipes_products_api.py, backend/tests/test_diary_api.py

## Geplante Features (Post-MVP)
- [ ] Englisch-Support (3. Sprache)
- [ ] Produktkatalog -> MongoDB migrieren
- [ ] server.py in Module aufteilen (routes/, models/, services/)
- [ ] Grosse Frontend-Dateien in Komponenten zerlegen
- [ ] Suchbare/filterbare Rezepte
- [ ] Benutzer-History
- [ ] DSGVO-Compliance
- [ ] Analytics-Dashboard fur Affiliate-Conversion
- [ ] A/B-Testing fur Affiliate-Conversion
