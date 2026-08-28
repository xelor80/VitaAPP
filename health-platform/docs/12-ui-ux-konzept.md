# 12 – UI/UX-Konzept & Design-System

Zielbild: **clean, modern, hochwertig, freundlich, Health-Tech** – ruhig statt überladen, große
lesbare Messwerte, klare Diagramme, weiche Rundungen, dezente Animationen. Referenzrichtung
(nicht kopieren): Apple Health, Oura, WHOOP, Garmin Connect, Fitbit.

## 1. Designprinzipien

1. **Ruhe & Vertrauen** – wenig Farben, viel Weißraum, klare Hierarchie. Kein „bunter Kachelbrei“.
2. **Ein zentraler Fokus pro Screen** – „Heute“ führt mit Health-Score, nicht mit 20 Kästchen.
3. **Werte werden übersetzt** – jede Zahl bekommt eine verständliche Einordnung.
4. **Semantische Farben** – Status (gut/normal/auffällig) über wenige, konsistente Farben, nicht
   jede Metrik in eigener Knallfarbe.
5. **Nicht-alarmistisch** – Warnungen deutlich, aber beruhigend gestaltet.
6. **Barrierearm & für ältere Nutzer verständlich** – große Schrift, hoher Kontrast, dynamische
   Type, klare Labels, Screenreader-Support.

## 2. Design-Tokens

| Token | Beispiel |
|-------|----------|
| Farben | Neutrale Basis + 1 ruhige Primärfarbe; Status: `success`, `info`, `attention`, `warning` (dezent) |
| Modi | **Light** + **Dark**, vollständig getrennt definiert, systemgesteuert + manuell |
| Radius | groß/weich (z. B. 16–24 px) |
| Spacing | konsistente 4/8-Skala |
| Typografie | System-Font (SF/Roboto), große Messwert-Größe (H1 ~32), klare Hierarchie |
| Elevation | dezente Schatten, keine harten Kanten |
| Motion | kurze, weiche Übergänge; reduzierbar bei „Bewegung reduzieren“ |

Alle Tokens zentral; Light/Dark als vollständige Paletten (kein Einzelfarben-Hardcoding).

## 3. Kern-Komponenten (Design-System, Auftrag Abschnitt 39)

| Komponente | Zweck |
|------------|------|
| `HealthScoreRing` | großer zentraler Score-Ring mit Komponenten |
| `HealthMetricCard` | Wert + Einheit + Status-Einordnung („Normal“) |
| `TrendCard` | Delta über Zeitraum (▲/▼ %, Minuten …) |
| `InsightCard` | erkannter Zusammenhang in einfacher Sprache |
| `AlertCard` | Warnung, severity-gefärbt, beruhigend |
| `RecommendationCard` | kontextuelle Produkt-/Content-Empfehlung |
| `ProductCard` | Produkt (Bild, Name, Tags, Affiliate-CTA) |
| `RecipeCard` | Rezept (Bild, Zeit, Nährwerte, Tags) |
| `SleepChart` | Schlafphasen-Visualisierung |
| `HeartRateChart` / `MetricChart` | Zeitreihen mit Range-Umschaltung (24h/7T/30T/3M/1J) |
| `ActivityRing` | Tagesziele (Schritte/Kalorien/Minuten) |
| `StatusBadge` | „Gut“, „Normal“, „Auffällig“ – semantisch |

## 4. UX-Muster

- **Übersetzung von Werten:** `HRV 51 ms` + „In deinem persönlichen Normalbereich.“
- **Progressive Disclosure:** Today zeigt das Wichtigste; Details auf eigener Metrik-Seite.
- **Range-Umschaltung** einheitlich (24h/7T/30T/3M/1J) auf allen Detailseiten.
- **Leere & nicht unterstützte Zustände** klar: „Noch keine Daten vorhanden.“ /
  „Von diesem Gerät nicht unterstützt.“ (nie Fake-Daten).
- **Warnungen** mit klarer, nicht-diagnostischer Sprache und Handlungsempfehlung.

## 5. Metrik-Detailseite (einheitliches Muster, Auftrag Abschnitt 6)

```
[Metrik-Titel]  [aktueller großer Wert]  [Status]
[Ruhewert / Tagesbereich]
[Chart: 24h | 7T | 30T | 3M | 1J]
„Was bedeutet dieser Wert?“   – kurze verständliche Erklärung
„Deine Entwicklung“           – z. B. „Ruhepuls −4 bpm in 30 Tagen“
„So kannst du diesen Wert positiv beeinflussen“ – Tipps (admin-verwaltet)
```

## 6. Navigation & Informationsarchitektur

Bottom-Nav: `Heute · Trends · Coach · Entdecken · Profil`. „Heute“ ist der Ausgangspunkt.
Konsistente Rücknavigation, große Tap-Ziele, keine tiefe Verschachtelung für Kernaufgaben.

## 7. Internationalisierung

Alle Texte über i18n-Keys (Auftrag Abschnitt 29), Start: Deutsch + Englisch. Datums-/Zahlen-/
Einheitenformate lokalisiert (de: TT.MM.JJJJ). Keine hartcodierten UI-Texte.

## 8. Barrierefreiheit (Detail)

- Kontrastverhältnisse ≥ WCAG AA; Statusfarben nie als einzige Information (zusätzlich Text/Icon).
- Dynamische Schriftgrößen respektieren; Layouts skalieren.
- Screenreader-Labels für Werte inkl. Einordnung.
- Reduzierte Bewegung respektieren.
