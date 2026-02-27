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

### 4. Ergebnis-Ansicht (4 Tabs)
- **Übersicht:** Zusammenfassung, Red-Flag-Warnungen, Schnell-Tipps
- **Supplements:** Nährstoff-Infos mit Evidenzlevel, Vorsichtshinweisen, natürlichen Quellen + Produkt-Cards
- **Ernährung:** Nummerierte Ernährungstipps
- **Rezepte:** Rezept-Cards mit Zubereitungszeit und Zutaten-Anzahl

### 5. Rezept-Detail
- Vollständige Zutatenliste
- Nummerierte Zubereitungsschritte
- Meta-Badges (Zeit, Zutaten, Schritte)
- Tags

### 6. Affiliate-Integration
- 8 Platzhalter-Produkte der Marke "VitaNatura"
- Produktkarten mit Preis, Beschreibung, "Zum Shop"-Button
- Click-Tracking (POST /api/track/click)
- UTM-Parameter in Affiliate-URLs

### 7. Sicherheitsfeatures
- Red-Flag-Banner bei erkannten Warnsignalen
- Keine Produktempfehlungen bei Red Flags
- Disclaimer-Footer auf allen Ergebnisseiten
- Vorsichtshinweise bei Supplements

## API Endpoints
| Method | Endpoint | Beschreibung |
|--------|---------|-------------|
| GET | /api/health | Health Check |
| POST | /api/symptoms/analyze | Symptom-Analyse via KI |
| GET | /api/analysis/{id} | Gespeicherte Analyse abrufen |
| GET | /api/products?tags= | Produkt-Katalog |
| GET | /api/recipes?tags= | Rezepte aus Analysen |
| POST | /api/track/click | Affiliate-Click-Tracking |

## Datenmodelle (MongoDB)
- **analyses:** Vollständige KI-Analyse-Ergebnisse inkl. Input, Timestamp, Prompt-Version
- **products:** Produkt-Katalog (geseedet beim Start)
- **click_events:** Affiliate-Click-Events mit Timestamp

## Affiliate-Marke
- **Marke:** Joachim Kaeser – Natürliche Nahrungsergänzungsmittel aus der Schweiz
- **Website:** https://joachim-kaeser.de
- **Produkte im Katalog:** 30 Produkte, kategorisiert nach Beschwerden
- **Affiliate-Parameter:** `?ref=vitaguide&utm_source=vitaguide&utm_medium=app`
- **Hinweis:** Affiliate-URLs sind Platzhalter-Links mit UTM-Parametern. Echte Affiliate-Links werden später eingesetzt.

### Produkt-Zuordnung zu Symptomen:
| Symptom | Empfohlene Produkte |
|---------|-------------------|
| Müdigkeit | B-Komplex-Kolloid, Eisen, NADH, Q10 Power, Factor D, Essentials Direct |
| Kopfschmerzen | Magnesium Direct, B-Komplex-Kolloid, Omega 3 |
| Verdauung | Microbiom Complex, Leber Vital, Grüne Entgiftung, Metabol Control |
| Gelenkschmerzen | Gelenk Kraft, Weihrauch 2.0, Kurkuma-Komplex, Omega 3 |
| Schlafprobleme | Magnesium Direct, B-Komplex-Kolloid |
| Stress | Magnesium Direct, B-Komplex-Kolloid, Mental Kraft |
| Erkältung | Immunkraft, Echinacea Kolloidal, Vitamin C Retard, Kolloidales Zink |
| Hautprobleme | Haut Factor, Collagen Bi-Caps, Hyaluronsäure, Haar Aktiv, Schwarzkümmelöl |
| Rückenschmerzen | Gelenk Kraft, Weihrauch 2.0, Magnesium Direct |
| Konzentration | Mental Kraft, NADH, Omega 3, B-Komplex-Kolloid |

### 8. Symptom-Tagebuch + Trend-Ansicht
- **Tägliches Tracking:** Befinden (1-5), Schlaf (1-5), Stress (1-5), Wasser (Gläser), Bewegung (Minuten), Notizen
- **Upsert-Logik:** Ein Eintrag pro Tag, wird bei erneutem Speichern aktualisiert
- **Trend-Ansicht:** Durchschnittswerte (Mood/Schlaf/Stress/Wasser), Tagesübersicht mit Balkendiagramm
- **KI-Lifestyle-Tipps:** GPT-4o analysiert die letzten 14 Tage und gibt allgemeine Lifestyle-Empfehlungen (kein Treatment)
- **Erkannte Muster:** Automatische Trend-Erkennung (aufwärts/abwärts/stabil) pro Bereich
- **Navigation:** Tagebuch-Button auf dem Home-Screen mit Buch-Icon

## Geplante Features (Post-MVP)
- [ ] Mehrsprachigkeit (Italienisch, Englisch)
- [ ] Separate App-Instanzen für DE/IT
- [ ] Eigener API-Key statt Emergent LLM Key
- [ ] Benutzer-History (vergangene Analysen)
- [ ] Erweiterte Rezept-Datenbank
- [ ] Push-Benachrichtigungen
- [ ] Einkaufslisten-Funktion
- [ ] Detaillierte Analytics-Dashboard
- [ ] A/B-Testing für Affiliate-Conversion
- [ ] DSGVO-Compliance (Privacy Policy, Cookie Consent)

## Sicherheits- & Compliance-Regeln
1. Keine Diagnosen
2. Keine Heilversprechen
3. Keine personalisierten Dosierungsempfehlungen
4. Red-Flag-Erkennung mit Arzt-Verweis
5. Besondere Vorsicht bei: Schwangerschaft, Kindern, chronischen Erkrankungen, Medikamenten
6. API-Key nur serverseitig
7. Rate Limiting aktiv
