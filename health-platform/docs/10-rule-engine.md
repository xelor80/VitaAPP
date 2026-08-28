# 10 – Health-Rule-Engine (Alarm-/Warnsystem)

Serverseitige, vollständig konfigurierbare Regel-Engine. Regeln werden im Admin gepflegt
([Dok. 06](06-admin-webapp-module.md)), nicht in der App codiert. Ziel: nicht-alarmistische,
kontextsensible Hinweise – **keine Diagnosen**.

## 1. Regel-Datenmodell (`health_rules.definition` als JSON)

```jsonc
{
  "metric": "spo2",
  "condition": {
    "type": "threshold",          // threshold | baseline_deviation | trend
    "operator": "lt",             // lt | gt | lte | gte | outside_range
    "value": 90,                  // absoluter Grenzwert ...
    "baseline": { "window": "30d", "deviation_pct": -15 } // ... oder relativ
  },
  "window": { "duration_min": 5 },      // Zeitfenster der Beobachtung
  "occurrences": { "count": 3, "within": "1d" }, // Mehrfach-Auffälligkeit
  "context": {                          // optionale Einschränkungen
    "time_of_day": ["night"],
    "activity": ["rest"],               // nicht während Sport werten
    "min_age": 0, "max_age": 120,
    "sex": ["any"]
  },
  "severity": "notable",                // info | hint | notable | important
  "notify": true,
  "content": { "title_key": "alert.spo2.low.title",
               "body_key": "alert.spo2.low.body" },
  "cooldown": { "hours": 12 },          // Anti-Spam
  "active": true
}
```

## 2. Faktoren, die eine Regel berücksichtigen kann (Auftrag Abschnitt 9)

- absoluter Messwert
- persönlicher Durchschnitt (Baseline 7/30/90 Tage)
- prozentuale Abweichung von der Baseline
- Dauer (Zeitfenster)
- Anzahl Messungen (Occurrences)
- Uhrzeit / Tageszeit
- Aktivitätskontext (Ruhe vs. Sport)
- Schlafkontext
- Alter, ggf. Geschlecht (nur wo fachlich relevant)
- individuelle Konfiguration je Nutzer/Zielgruppe

## 3. Schweregrade

| Severity | Bedeutung | UI |
|----------|-----------|----|
| `info` | rein informativ | dezent |
| `hint` | Hinweis, Kontext | dezent |
| `notable` | auffällig, Beobachtung empfohlen | hervorgehoben, ruhig |
| `important` | mehrfach/deutlich außerhalb – aufmerksam prüfen | deutlich, aber nicht angst­auslösend |

**Gewichtung:** Mehrere aufeinanderfolgende Auffälligkeiten wiegen stärker als eine einzelne
(über `occurrences` + Trend). Beispiel-Ausgaben:
- „Deine Sauerstoffsättigung lag heute mehrfach unter deinem üblichen Bereich.“
- „Dein Ruhepuls liegt seit drei Tagen deutlich über deinem persönlichen Durchschnitt.“

## 4. Auswertungspipeline

```
measurement.ingested (Event)
   └► Rule-Evaluator (Worker)
        1. relevante aktive Regeln für metric + Nutzerkontext laden
        2. Baselines/Aggregate abrufen
        3. condition prüfen (threshold | baseline_deviation | trend)
        4. window + occurrences über Zeit prüfen (Zustands-/Zählspeicher)
        5. context-Filter anwenden (Ruhe/Nacht/Alter …)
        6. cooldown prüfen (kein Spam)
        7. bei Treffer → health_alert anlegen (+ optional Push)
```
Zusätzlich **zeitfensterbasierte** Läufe (z. B. „3 Tage in Folge“) über den Scheduler.

## 5. Nicht-medizinische Formulierung (verbindlich)

- **Nie**: „Du hast Bluthochdruck.“
- **Sondern**: „Der gemessene Wert liegt außerhalb des hinterlegten Referenzbereichs. Wiederhole
  die Messung in Ruhe. Bei anhaltend auffälligen Werten oder Beschwerden solltest du medizinischen
  Rat einholen.“
- Grenzwerte **und** Texte sind im Admin konfigurierbar (i18n-Keys).
- Keine Verkaufsangebote im direkten Kontext kritischer Warnungen (Auftrag Abschnitt 37).

## 6. Test & Sicherheit der Regeln

- **Regel-Vorschau im Admin:** Regel gegen Beispiel-/historische Daten simulieren, bevor sie aktiv
  wird (verhindert Fehlalarme).
- **Versionierung:** Regeländerungen versioniert (Nachvollziehbarkeit im Audit-Log).
- **Cooldown & Deduplizierung** verhindern Benachrichtigungsfluten.
- **Kill-Switch:** Regeln global deaktivierbar.

## 7. Beispielregeln (Startset, Werte final medizinisch/rechtlich zu prüfen)

| Metrik | Bedingung | Occurrences | Severity |
|--------|-----------|-------------|----------|
| SpO2 | Wert < konfig. Grenzwert in Ruhe | 3× in Fenster | notable |
| Ruhepuls | > Baseline(30d) + X % | 3 Tage in Folge | notable |
| Ruhepuls | < konfig. Untergrenze | mehrfach | hint |
| Temperatur | Abweichung > X °C von Baseline | mehrfach | notable |
| HRV | < Baseline(30d) − X % | anhaltend | hint |
| Blutdruck | außerhalb Referenzbereich | wiederholt | notable |
| Stress | anhaltend hoch | über Tage | hint |

> Grenzwerte sind Platzhalter und werden mit fachlicher/rechtlicher Prüfung final gesetzt.
