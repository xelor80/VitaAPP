# VitaGuide – Health- & Fitness-Plattform · Konzept & Architektur

> **Projektname:** **VitaGuide** · **Domain:** [vitaguide.app](https://vitaguide.app) (reserviert)
> **Status:** Konzeptphase – **noch keine Implementierung**. Dieses Dokument ist die
> Entscheidungsgrundlage für deine Freigabe. Erst nach Freigabe beginnt die schrittweise Umsetzung.

Dieser Ordner (`health-platform/`) ist **bewusst getrennt** von der übrigen Codebasis in
diesem Repository. Es entsteht eine eigenständige, modulare Plattform für ein eigenes
Fitness-/Health-Armband mit Hersteller-SDK.

## Was hier entsteht

Keine reine Fitnessband-App, sondern eine **skalierbare Health-Plattform**:

```
Wearable + Health-Tracking + persönliche Trends + Health-Insights
+ Lifestyle + Content + Rezepte + Health-Coach + Affiliate + Premium
```

Zwei zentrale Systeme:

1. **Mobile App** (iOS + Android, Flutter) – für Endnutzer
2. **Admin-WebApp** – zur Verwaltung der gesamten Plattform

Dazwischen ein **Backend (NestJS/TypeScript)** mit PostgreSQL, Redis und Object-Storage.

## Leitprinzipien

- **Modular & erweiterbar:** Neue Module (Waage, Ernährung, Coach …) ohne Neubau ergänzbar.
- **SDK entkoppelt:** Hersteller-SDK niemals fest verdrahtet – Zugriff nur über einen
  abstrahierten `WearableProvider` (Hardware-Abstraction-Layer). Weitere Wearables später integrierbar.
- **Privacy by Design:** Gesundheitsdaten sind besonders sensibel (DSGVO Art. 9). Einwilligung,
  Verschlüsselung, RBAC, Audit-Logs von Anfang an.
- **Keine erfundenen Werte:** Wird ein Wert nicht unterstützt → „Von diesem Gerät nicht unterstützt.“
  Liegt keine Messung vor → „Noch keine Daten vorhanden.“ **Niemals** Fake-/Demo-Werte.
- **Keine medizinische Diagnose:** Nur Wellness-Hinweise mit klarer Abgrenzung zur medizinischen Beratung.
- **Persönliche Baselines:** Bewertung immer relativ zum individuellen 7-/30-/90-Tage-Durchschnitt,
  nicht nur gegen allgemeine Normwerte.

## Die 18 Konzeptbausteine (deine Aufgabe aus Abschnitt 52)

| # | Dokument | Inhalt |
|---|----------|--------|
| 1 | [01 – Systemarchitektur](docs/01-systemarchitektur.md) | Gesamtarchitektur, Schichten, Datenfluss |
| 2 | [02 – Tech-Stack](docs/02-tech-stack.md) | Empfohlener Technologie-Stack + Begründung |
| 3 | [03 – Datenbankmodell](docs/03-datenbankmodell.md) | Tabellen, Beziehungen, Health-Measurement-Modell |
| 4 | [04 – API-Struktur](docs/04-api-struktur.md) | REST `/api/v1`, Endpunkte, Versionierung |
| 5 | [05 – Mobile-App-Module](docs/05-mobile-app-module.md) | Feature-Module, Ordnerstruktur, Navigation |
| 6 | [06 – Admin-WebApp-Module](docs/06-admin-webapp-module.md) | Admin-Bereiche & Struktur |
| 7 | [07 – SDK-Integrationskonzept](docs/07-sdk-integration.md) | HAL, `WearableProvider`, SDK-Mapping |
| 8 | [08 – BLE-/Sync-Konzept](docs/08-ble-sync-konzept.md) | Pairing, Background-Sync, Offline, Dedup |
| 9 | [09 – Datenschutz & Security](docs/09-datenschutz-security.md) | DSGVO, Consent, Verschlüsselung, RBAC |
| 10 | [10 – Health-Rule-Engine](docs/10-rule-engine.md) | Alarm-/Regel-Engine, Warnsystem |
| 11 | [11 – Health-Score](docs/11-health-score.md) | Score-/Readiness-Berechnung, Baselines |
| 12 | [12 – UI/UX-Konzept](docs/12-ui-ux-konzept.md) | Design-System, Komponenten, UX-Prinzipien |
| 13 | [13 – Wireframes](docs/13-wireframes.md) | Alle Hauptscreens (Text-Wireframes) |
| 14 | [14 – MVP-Umfang](docs/14-mvp-umfang.md) | Funktionsumfang Phase 1 |
| 15 | [15 – Roadmap Phase 2/3](docs/15-roadmap-phase2-3.md) | Ausbaustufen |
| 16 | [16 – Externe Services](docs/16-externe-services.md) | FCM/APNs, Storage, KI, u. a. |
| 17 | [17 – Risiken & offene Fragen](docs/17-risiken-offene-fragen.md) | Technische Risiken, offene Punkte |
| 18 | [18 – SDK-Informationsbedarf](docs/18-sdk-informationsbedarf.md) | Was ich von dir zur SDK brauche |

## Nächster Schritt

1. Du prüfst dieses Konzept.
2. **Wichtig:** Du lieferst mir die Informationen/Dateien aus
   [Dokument 18](docs/18-sdk-informationsbedarf.md) zur Fitnessband-SDK.
3. Nach deiner Freigabe erstellen wir zuerst die **SDK-Mapping-Dokumentation** (aus den realen
   SDK-Daten) und beginnen dann mit **MVP Phase 1** – Schritt für Schritt, nichts, dessen
   technische Grundlage ungeklärt ist.
