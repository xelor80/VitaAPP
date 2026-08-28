# 11 – Health-Score- & Readiness-Konzept

Ein täglicher, verständlicher Gesundheits-/Erholungsscore (0–100), zusammengesetzt aus mehreren
Komponenten. **Immer relativ zur persönlichen Baseline**, nicht nur zu allgemeinen Normwerten.
Gewichtung ist im Admin konfigurierbar.

## 1. Score-Komponenten

```
Health Score (0–100)  =  gewichtete Summe der Komponenten
├─ Schlaf          (sleep)
├─ Erholung        (recovery)   ← v. a. HRV vs. Baseline, Ruhepuls
├─ Stress          (stress)
├─ Aktivität       (activity)
└─ Herz-Kreislauf  (cardio)     ← Ruhepuls, SpO2, ggf. Blutdruck
```

Jede Komponente 0–100. Beispiel-Anzeige (Auftrag Abschnitt 5):
```
Health Score 82
Schlaf 88 · Erholung 81 · Stress 72 · Aktivität 79 · Herz-Kreislauf 86
```

## 2. Berechnungsprinzip

Pro Komponente wird ein normierter Teilscore gebildet, primär als **Abweichung vom persönlichen
30-Tage-Durchschnitt** (Baseline), sekundär gegen hinterlegte Referenzbereiche:

```
komponente_score = clamp( f(
    aktueller_wert,
    baseline_avg(30d),
    baseline_stddev(30d),
    referenzbereich
), 0, 100 )

total = Σ (gewicht_i × komponente_score_i) / Σ gewicht_i
```

- **Baseline-basiert:** z. B. HRV heute vs. 30-Tage-Schnitt → Abweichung in % → Teilscore.
- **Fehlende Daten:** Komponente ohne Daten wird nicht geschätzt, sondern **ausgeklammert**
  (Gewichte renormalisiert) und transparent gemacht („Für Erholung fehlen heute Daten“). Keine
  erfundenen Werte.
- **Gewichte** liegen in `app_config` (versioniert) und sind im Admin änderbar. `daily_health_scores`
  speichert `config_version` für Nachvollziehbarkeit.

## 3. Erklärbarkeit (zentral)

Der Nutzer soll **verstehen, warum** der Score so ist. Zu jedem Score werden begründende
Textbausteine (i18n) mit konkreten Zahlen generiert:

- „Deine HRV liegt heute 12 % unter deinem persönlichen Durchschnitt.“
- „Du hast letzte Nacht 48 Minuten weniger geschlafen als üblich.“
- „Dein Ruhepuls liegt im normalen Bereich.“

Diese Erklärungen stammen aus derselben Baseline-Berechnung wie der Score (kein Doppelmaß).

## 4. Persönliche Baselines (Baseline-Engine, Auftrag Abschnitt 33)

Eigener Dienst berechnet je Nutzer und Metrik Durchschnitt/Streuung über **7 / 30 / 90 Tage** für:
Ruhepuls, HRV, Schlaf, SpO2, Stress, Aktivität, Temperatur.

```
Beispiel HRV:
  Ø 30 Tage: 54 ms
  Heute:     46 ms
  Abweichung: −15 %
```

- Neuberechnung nightly + on-demand nach relevantem Sync.
- Mindest-Datenmenge (`n`) bevor Baseline „belastbar“ ist; vorher zurückhaltende Aussagen.
- Ausreißer-Robustheit (z. B. Median/rob«uste Statistik) erwägen.

## 5. Readiness vs. Health-Score

- **Readiness** (Erholung „bin ich heute fit?“) betont Schlaf + HRV + Ruhepuls der letzten Nacht.
- **Health-Score** (Gesamtbild) integriert zusätzlich Aktivität/Stress/Herz-Kreislauf über den Tag.
- Beide teilen Baseline-Engine und Erklärlogik. Start: **ein** Health-Score mit Komponenten;
  Readiness als betonte Teilmenge, später ausbaubar.

## 6. Datenfluss

```
Sync → measurements → Baseline-Engine (Aggregate) 
     → Score-Berechnung (morgens je Nutzer + on-demand)
     → daily_health_scores (total, components, explanations, config_version)
     → GET /today , GET /score
```

## 7. Verständliche Übersetzung (UX, Auftrag Abschnitt 40)

Technische Werte werden immer eingeordnet:
```
HRV 51 ms
„In deinem persönlichen Normalbereich.“    (statt nur „51 ms“)
```
Status-Sprache konsistent: „Gut“, „Normal“, „Etwas niedriger als üblich“, „Auffällig“.

## 8. Grenzen & Ehrlichkeit

- Score ist **Orientierung**, keine medizinische Bewertung.
- Bei zu wenig Daten: klar kommunizieren statt raten.
- Gewichtungen und Referenzbereiche werden mit fachlicher Prüfung kalibriert (→ Dok. 17).
