# 13 – Wireframes (Hauptscreens)

Text-Wireframes als Layout-Grundlage. Finale visuelle Gestaltung folgt im Design-System
([Dok. 12](12-ui-ux-konzept.md)). Ruhig, große Werte, verständliche Einordnung.

## Onboarding (5 Screens)

```
┌───────────────────────────┐   ┌───────────────────────────┐
│        [Illustration]     │   │        [Illustration]     │
│                           │   │                           │
│  Deine Gesundheit.        │   │  Verbinde dein Health     │
│  Jeden Tag ein bisschen   │   │  Band.                    │
│  besser.                  │   │                           │
│                    ● ○ ○ ○ ○│  │                    ○ ● ○ ○ ○│
│      [ Weiter ]           │   │      [ Weiter ]           │
└───────────────────────────┘   └───────────────────────────┘
Screen 3 „Verstehe deinen Körper.“  · 4 „Erhalte persönliche Einblicke.“
· 5 „Behalte Veränderungen im Blick.“  → danach: Registrierung + Consent + Pairing
```

## Consent (Gesundheitsdaten)

```
┌───────────────────────────┐
│  Einwilligung             │
│  Wir verarbeiten deine    │
│  Gesundheitsdaten nur mit │
│  deiner Zustimmung.       │
│  [✓] Gesundheitsdaten     │
│  [✓] AGB & Datenschutz    │
│  [ ] Push-Nachrichten     │
│  [ ] KI-Analyse (optional)│
│      [ Zustimmen ]        │
│  Datenschutz · Terms      │
└───────────────────────────┘
```

## Today / Home (zentraler Screen)

```
┌───────────────────────────┐
│ Guten Morgen, Anna        │
│ Donnerstag, 28.08.2026    │
│                           │
│        ╭───────────╮      │
│        │   82/100  │      │  ← HealthScoreRing
│        │ HEALTH    │      │
│        ╰───────────╯      │
│  „Deine Werte sehen heute │
│   insgesamt gut aus.“     │
│                           │
│  Heute wichtig            │
│  ❤️ Herzfrequenz  72 bpm  Normal   │
│  🫁 Sauerstoff    96 %    Normal   │
│  🧠 Stress        38      Normal   │
│  ⚡ Erholung      78 %    Gut      │
│  😴 Schlaf     7 h 14 min Gut      │
│  🚶 Aktivität  5.840  73 % Ziel    │
│  ── (falls vorhanden) ──  │
│  [!] Hinweis: SpO2 heute  │
│      mehrfach niedriger…  │
└───────────────────────────┘
[ Heute ][ Trends ][ Coach ][ Entdecken ][ Profil ]
```

## Metrik-Detail (z. B. Herzfrequenz – einheitliches Muster)

```
┌───────────────────────────┐
│ ‹ Herzfrequenz            │
│      72 bpm   ● Normal    │
│ Ruhepuls 64 · Bereich     │
│ 58–108 bpm                │
│ [24h][7T][30T][3M][1J]    │
│ ┌───────────────────────┐ │
│ │      /\   /\  Chart    │ │
│ │  ___/  \_/  \___       │ │
│ └───────────────────────┘ │
│ Was bedeutet dieser Wert? │
│  Kurze Erklärung …        │
│ Deine Entwicklung         │
│  „Ruhepuls −4 bpm / 30 T“ │
│ So beeinflusst du ihn     │
│  • bewegen • schlafen …   │
└───────────────────────────┘
```

## Trends „Meine Entwicklung“

```
┌───────────────────────────┐
│ Meine Entwicklung         │
│ [Heute][7T][30T][90T][1J] │
│ Ruhepuls     −4 %   ▼ gut │
│ HRV          +8 %   ▲     │
│ Schlaf   +23 Min    ▲     │
│ Schritte    +14 %   ▲     │
│ Stress       −9 %   ▼ gut │
│ [Mini-Charts je Zeile]    │
└───────────────────────────┘
```

## Schlaf

```
┌───────────────────────────┐
│ Schlaf   7 h 14 min       │
│ Schlafscore  81   Gut     │
│ [Phasen-Balken: Tief/Leicht/REM/Wach] │
│ Einschlafen 23:10 · Auf 06:42         │
│ Regelmäßigkeit  gut       │
│ [7T | 30T | 3M] Trend     │
│ Tipp: „An Tagen mit ≥7 h  │
│  Schlaf ist deine HRV      │
│  höher.“                  │
└───────────────────────────┘
```

## Aktivität / Fitness

```
┌───────────────────────────┐
│ Aktivität                 │
│  ◍ Schritte 5.840 / 8.000 │
│  ◍ Kalorien  320 / 500    │
│  ◍ Minuten    22 / 30     │
│ Distanz 4,1 km · MET …    │
│ Training: [Liste]         │
│ Badges: 🏅7-Tage 🏅10k    │
└───────────────────────────┘
```

## Insights / Coach (Phase 1: regelbasiert)

```
┌───────────────────────────┐
│ Insights                  │
│ • „An Tagen mit >7 h Schlaf│
│    ist deine HRV Ø +9 %.“ │
│ • „Stress ist montags      │
│    höher als am Wochenende.“│
│ • „Schritte +18 % in 4 Wo.“│
│ (Phase 3: „Frag deinen    │
│  Health Coach“ Eingabe)   │
└───────────────────────────┘
```

## Warnungen / Alerts

```
┌───────────────────────────┐
│ Hinweise                  │
│ [!] SpO2                  │
│  „Deine Sauerstoff-        │
│   sättigung lag heute      │
│   mehrfach unter deinem    │
│   üblichen Bereich.        │
│   Wiederhole die Messung   │
│   in Ruhe …“              │
│      [ Verstanden ]       │
└───────────────────────────┘
```

## Entdecken (Content-Hub)

```
┌───────────────────────────┐
│ Entdecken                 │
│ [Schlaf][Stress][Fitness] │
│ [Ernährung][Herz][Mindset]│
│ ┌──────┐ ┌──────┐         │
│ │Artikel│ │Rezept│  Cards │
│ └──────┘ └──────┘         │
│ Empfohlen zu „Schlaf“:    │
│ [ProductCard]             │
└───────────────────────────┘
```

## Geräte / Pairing

```
┌───────────────────────────┐   ┌───────────────────────────┐
│ Gerät koppeln             │   │ Mein Gerät                │
│ Suche…  ◐                 │   │ Band X  · verbunden ●     │
│ • Band X   ▶              │   │ Firmware 1.4.2            │
│ • Band X-2 ▶              │   │ Batterie 78 %             │
│   [ Verbinden ]           │   │ Letzte Sync 07:15         │
│                           │   │ [Auto-Sync ✓] [Sync jetzt]│
└───────────────────────────┘   └───────────────────────────┘
```

## Profil / Einstellungen

```
┌───────────────────────────┐
│ Profil                    │
│ Anna · Ziel: Besser schlafen │
│ • Persönliche Daten       │
│ • Tagesziele              │
│ • Benachrichtigungen      │
│ • Einwilligungen (Consent)│
│ • Daten exportieren       │
│ • Account löschen         │
│ • Sprache / Theme         │
└───────────────────────────┘
```

## Admin-WebApp (Auszug)

```
┌── admin.<domain> ──────────────────────────────────────────┐
│ [Logo]  Dashboard Benutzer Geräte Metriken Regeln Warnungen│
│         Inhalte Tipps Produkte Affiliate Rezepte Push …     │
├────────────────────────────────────────────────────────────┤
│ Dashboard                                                  │
│ [Nutzer] [DAU/MAU] [Wearables] [Messungen heute]           │
│ [Push]  [Warnungen] [Affiliate-Klicks] [iOS/Android %]     │
│ [Charts: Registrierungen, Aktivität]                       │
└────────────────────────────────────────────────────────────┘
```
