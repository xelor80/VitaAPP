# VitaGuide - Product Requirements Document (PRD)

## Übersicht
VitaGuide ist eine kostenlose Gesundheits-Informations-App, die über eine KI-Anbindung (GPT-4o) symptombezogene, allgemeine Informationen verarbeitet und Nutzern evidenzbasierte Ernährungstipps, Rezepte, allgemeine Supplement-Informationen und Affiliate-Produktempfehlungen liefert.

**WICHTIG:** Die App ist KEIN Medizinprodukt, ersetzt keine ärztliche Beratung, stellt keine Diagnosen und gibt keine personalisierten medizinischen Behandlungsanweisungen.

## Tech Stack
- **Frontend:** Expo React Native (SDK 54), expo-router, TypeScript
- **Backend:** FastAPI (Python), MongoDB (Motor)
- **KI:** OpenAI GPT-4o via Emergent LLM Key
- **Datenbank:** MongoDB
- **Sprachen:** Deutsch + Italienisch (mit Sprachumschaltung)

## Implementierte Features

### 1. Zweisprachigkeit (DE/IT) - NEU 27.02.2026
- **Sprachumschaltung**: DE/IT Toggle im Header des Homescreens und Disclaimer
- **LangContext**: React Context für app-weite Sprachverwaltung mit AsyncStorage-Persistenz
- **i18n System**: Übersetzungsdatei (`i18n.ts`) mit allen UI-Texten
- **Separater IT System-Prompt**: Kompletter italienischer KI-Prompt mit Sicherheitshinweisen
- **Italiano Produktkatalog**: 61 Einzelprodukte von joachimkaeser.it (gescraped)
- **Produkt-Videos**: 8 italienische Produkte mit YouTube-Video-Links
- **Video-Button**: "Guarda il video" / "Video ansehen" Button auf Produktkarten

### 2. Produktkataloge
- **Deutsch**: 30 Produkte von joachim-kaeser.de mit offiziellen Anwendungshinweisen
- **Italienisch**: 61 Einzelprodukte von joachimkaeser.it mit Anwendungshinweisen + Videos
- **Affiliate-Links**: Sprachabhängig (.de für DE, .it für IT)

### 3. Onboarding / Disclaimer (zweisprachig)
- Blockierender Disclaimer-Screen mit Sicherheitshinweisen
- Sprachauswahl bereits im Disclaimer möglich
- Persistente Zustimmung via AsyncStorage

### 4. Symptom-Eingabe (zweisprachig)
- Freitext-Eingabe mit sprachabhängigen Platzhaltern
- 10 Symptom-Chips pro Sprache (DE/IT)
- `lang` Parameter wird an API übergeben

### 5. KI-Analyse (GPT-4o, zweisprachig)
- Separate System-Prompts für DE und IT
- Sprachabhängiger Produktkatalog
- Prompt Version 1.2 mit offiziellen Anwendungshinweisen
- Red-Flag-Erkennung in beiden Sprachen

### 6. Ergebnis-Ansicht (4 Tabs, zweisprachig)
- **Übersicht/Panoramica**: Zusammenfassung, Red-Flag-Warnungen, Featured Product (mit Video-Button wenn verfügbar)
- **Supplements/Integratori**: Nährstoff-Infos mit Evidenzlevel + Produktkarten
- **Ernährung/Nutrizione**: Einnahmeplan mit offiziellen Herstellerhinweisen + Ernährungstipps
- **Rezepte/Ricette**: Rezept-Cards

### 7. Anwendungshinweise (gescraped)
- **DE**: 30 Produkte (26 auto-gescraped, 4 manuell ergänzt)
- **IT**: 61 Produkte (60 auto-gescraped, 1 ohne Hinweise)
- Scraper-Scripts: `scrape_instructions.py`, `scrape_it_products.py`

### 8. Symptom-Tagebuch
- Tägliches Tracking: Befinden, Schlaf, Stress, Wasser, Bewegung
- KI-Trend-Analyse

### 9. Affiliate-System
- Click-Tracking (POST /api/track/click)
- Sprachabhängige Affiliate-URLs

## API Endpoints
| Method | Endpoint | Beschreibung |
|--------|---------|-------------|
| GET | /api/health | Health Check |
| POST | /api/symptoms/analyze | Symptom-Analyse (lang=de\|it) |
| GET | /api/analysis/{id} | Gespeicherte Analyse |
| GET | /api/products?lang=&tags= | Produktkatalog (DE: 30, IT: 61) |
| POST | /api/track/click | Affiliate-Click-Tracking |
| POST | /api/diary | Tagebuch-Eintrag speichern |
| GET | /api/diary | Tagebuch-Einträge abrufen |
| GET | /api/diary/trends | Trend-Analyse mit KI-Tipps |

## Dateien
- `backend/server.py`: Haupt-Backend mit DE/IT Prompts + Produktkatalogen
- `backend/products_it.json`: Italienischer Produktkatalog (61 Produkte)
- `backend/scrape_instructions.py`: DE Anwendungshinweise Scraper
- `backend/scrape_it_products.py`: IT Produkte Scraper
- `frontend/app/i18n.ts`: Übersetzungen DE/IT
- `frontend/app/LangContext.tsx`: Sprach-Context
- `frontend/app/index.tsx`: Home mit Sprachumschaltung
- `frontend/app/results.tsx`: Ergebnisse (zweisprachig)
- `frontend/app/diary.tsx`: Tagebuch
- `frontend/app/recipe.tsx`: Rezept-Detail

## Geplante Features (Post-MVP)
- [ ] Englisch-Support (3. Sprache)
- [ ] Produktkatalog → MongoDB migrieren
- [ ] server.py in Module aufteilen
- [ ] Erweiterte Rezept-Datenbank
- [ ] Benutzer-History
- [ ] DSGVO-Compliance
- [ ] Analytics-Dashboard
- [ ] A/B-Testing für Affiliate-Conversion
