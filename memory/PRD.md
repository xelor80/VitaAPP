# VitaGuide - Product Requirements Document (PRD)

## Übersicht
VitaGuide ist eine kostenlose Gesundheits-Informations-App, die über eine KI-Anbindung (GPT-4o) symptombezogene, allgemeine Informationen verarbeitet und Nutzern evidenzbasierte Ernährungstipps, Rezepte, allgemeine Supplement-Informationen und Affiliate-Produktempfehlungen liefert.

**WICHTIG:** Die App ist KEIN Medizinprodukt, ersetzt keine ärztliche Beratung, stellt keine Diagnosen und gibt keine personalisierten medizinischen Behandlungsanweisungen.

## Tech Stack
- **Frontend:** Expo React Native (SDK 54), expo-router, TypeScript
- **Backend:** FastAPI (Python), MongoDB (Motor)
- **KI:** OpenAI GPT-4o via Emergent LLM Key (umstellbar auf eigenen API-Key)
- **Datenbank:** MongoDB (lokal)
- **Sprache:** Deutsch (MVP), später Italienisch/Englisch

## MVP Features (implementiert)

### 1. Onboarding / Disclaimer
- Blockierender Disclaimer-Screen beim ersten Start
- Drei Sicherheitshinweise: Kein Medizinprodukt, Allgemeine Informationen, Arztverweis
- Persistente Zustimmung via AsyncStorage

### 2. Symptom-Eingabe
- Freitext-Eingabe für Symptome
- 10 vordefinierte Symptom-Chips (Müdigkeit, Kopfschmerzen, Verdauung, Gelenkschmerzen, Schlafprobleme, Stress, Erkältung, Hautprobleme, Rückenschmerzen, Konzentration)
- Validierung (mindestens Text oder Chip-Auswahl)

### 3. KI-Analyse (GPT-4o)
- Strukturierte JSON-Ausgabe mit Zusammenfassung, Red Flags, Supplement-Infos, Produkte, Ernährungstipps, Rezepte
- Red-Flag-Erkennung (Brustschmerzen, Atemnot, neurologische Ausfälle etc.)
- Sicherheits-Guardrails im System-Prompt
- Rate Limiting (10 Anfragen/60s pro IP)
- **Prompt Version 1.2**: Enthält offizielle Anwendungshinweise der Produkte für den Einnahmeplan

### 4. Ergebnis-Ansicht (4 Tabs)
- **Übersicht:** Zusammenfassung, Red-Flag-Warnungen, Schnell-Tipps, Featured Product
- **Supplements:** Nährstoff-Infos mit Evidenzlevel, Vorsichtshinweisen, natürlichen Quellen + Produkt-Cards
- **Ernährung:** Einnahmeplan mit offiziellen Herstellerhinweisen + Ernährungstipps
- **Rezepte:** Rezept-Cards mit Zubereitungszeit und Zutaten-Anzahl

### 5. Rezept-Detail
- Vollständige Zutatenliste
- Nummerierte Zubereitungsschritte
- Meta-Badges (Zeit, Zutaten, Schritte)
- Tags

### 6. Affiliate-Integration
- 30 Produkte der Marke "Joachim Kaeser" mit echten Daten (Preis, Bild, Rating, Beschreibung)
- Produktkarten mit "Im Shop ansehen"-Button
- Click-Tracking (POST /api/track/click) mit MongoDB-Persistenz
- UTM-Parameter in Affiliate-URLs

### 7. Sicherheitsfeatures
- Red-Flag-Banner bei erkannten Warnsignalen
- Keine Produktempfehlungen bei Red Flags
- Disclaimer-Footer auf allen Ergebnisseiten
- Vorsichtshinweise bei Supplements

### 8. Offizielle Anwendungshinweise (NEU - 27.02.2026)
- 30 Produkt-Anwendungshinweise von joachim-kaeser.de gescraped
- Scraper-Script: `/app/backend/scrape_instructions.py`
- Hinweise im Einnahmeplan als blaue Info-Box angezeigt
- LLM nutzt offizielle Dosierungsangaben für Empfehlungen
- 26/30 automatisch gescraped, 4 manuell ergänzt (Eisen, NADH, Mental Kraft, Kreislauf Vital)

### 9. Symptom-Tagebuch + Trend-Ansicht
- **Tägliches Tracking:** Befinden (1-5), Schlaf (1-5), Stress (1-5), Wasser (Gläser), Bewegung (Minuten), Notizen
- **Upsert-Logik:** Ein Eintrag pro Tag, wird bei erneutem Speichern aktualisiert
- **Trend-Ansicht:** Durchschnittswerte (Mood/Schlaf/Stress/Wasser), Tagesübersicht
- **KI-Lifestyle-Tipps:** GPT-4o analysiert die letzten 14 Tage und gibt allgemeine Lifestyle-Empfehlungen
- **Navigation:** Tagebuch-Button auf dem Home-Screen

## API Endpoints
| Method | Endpoint | Beschreibung |
|--------|---------|-------------|
| GET | /api/health | Health Check |
| POST | /api/symptoms/analyze | Symptom-Analyse via KI |
| GET | /api/analysis/{id} | Gespeicherte Analyse abrufen |
| GET | /api/products?tags= | Produkt-Katalog mit Anwendungshinweisen |
| GET | /api/recipes?tags= | Rezepte aus Analysen |
| POST | /api/track/click | Affiliate-Click-Tracking |
| POST | /api/diary | Tagebuch-Eintrag speichern |
| GET | /api/diary | Tagebuch-Einträge abrufen |
| GET | /api/diary/trends | Trend-Analyse mit KI-Tipps |

## Datenmodelle (MongoDB)
- **analyses:** Vollständige KI-Analyse-Ergebnisse inkl. Input, Timestamp, Prompt-Version (1.2), Model (gpt-4o)
- **products:** Produkt-Katalog (geseedet beim Start) mit application_instructions
- **click_events:** Affiliate-Click-Events mit Timestamp
- **diary:** Tägliche Tagebuch-Einträge

## Affiliate-Marke
- **Marke:** Joachim Kaeser – Natürliche Nahrungsergänzungsmittel aus der Schweiz
- **Website:** https://joachim-kaeser.de
- **Produkte im Katalog:** 30 Produkte mit offiziellen Anwendungshinweisen
- **Affiliate-Parameter:** `?ref=vitaguide&utm_source=vitaguide&utm_medium=app`

## Geplante Features (Post-MVP)
- [ ] Mehrsprachigkeit (Italienisch, Englisch)
- [ ] Eigener API-Key statt Emergent LLM Key
- [ ] Benutzer-History (vergangene Analysen)
- [ ] Erweiterte Rezept-Datenbank
- [ ] Push-Benachrichtigungen
- [ ] Einkaufslisten-Funktion
- [ ] Detaillierte Analytics-Dashboard
- [ ] A/B-Testing für Affiliate-Conversion
- [ ] DSGVO-Compliance (Privacy Policy, Cookie Consent)
- [ ] Produktkatalog von Hardcoded → MongoDB Collection migrieren
- [ ] server.py in Module aufteilen (routes, models, prompts)

## Sicherheits- & Compliance-Regeln
1. Keine Diagnosen
2. Keine Heilversprechen
3. Keine personalisierten Dosierungsempfehlungen
4. Red-Flag-Erkennung mit Arzt-Verweis
5. Besondere Vorsicht bei: Schwangerschaft, Kindern, chronischen Erkrankungen, Medikamenten
6. API-Key nur serverseitig
7. Rate Limiting aktiv
