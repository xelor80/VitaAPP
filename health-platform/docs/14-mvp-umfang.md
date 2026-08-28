# 14 – MVP-Funktionsumfang (Phase 1)

Ziel: die **kleinste vollständige, ehrliche** Version – Gerät koppeln, echte Daten sehen,
verstehen, gewarnt werden. Keine Zukunftsfunktion, deren technische Grundlage (SDK!) ungeklärt ist.

> **Vorbedingung:** SDK-Analyse + SDK-Mapping-Dokumentation abgeschlossen
> ([Dok. 07](07-sdk-integration.md) / [Dok. 18](18-sdk-informationsbedarf.md)). Welche Metriken im
> MVP real erscheinen, hängt davon ab, **was die SDK/Hardware liefert**.

## 1. Mobile App (MVP)

**Konto & Onboarding**
- Registrierung (E-Mail/Passwort), Login, Passwort-Reset, E-Mail-Verifizierung
- Onboarding-Screens + **Consent** (Gesundheitsdaten, Terms, optional Push)
- Profil-Basisdaten (Vorname, Geburtsjahr, Größe/Gewicht optional, Ziel)

**Gerät & Daten**
- BLE-Pairing-Flow, Geräteinfo (Firmware, Batterie), Auto-/Manueller Sync
- SDK-Integration über `WearableProvider` (nur real unterstützte Metriken)
- Offline-Cache + idempotenter Batch-Sync (Dedup)

**Anzeige**
- **Today-Dashboard**: Begrüßung, „Heute wichtig“
- Metrik-Detailseiten (einheitliches Muster) für die real gelieferten Metriken aus:
  Schritte, Kalorien, Distanz, Herzfrequenz, HRV, SpO2, Temperatur, Stress, Schlaf,
  Blutdruck *(sofern SDK liefert)*, EKG *(sofern SDK liefert)*
- Detail-Charts + **7-/30-Tage-Trends**
- **Persönliche Baselines** (7/30 Tage)
- **Warnsystem** (Rule-Engine) + **Push-Benachrichtigungen**
- Zustände „Noch keine Daten“ / „Von diesem Gerät nicht unterstützt“
- Light/Dark, Deutsch + Englisch (i18n), Basis-Barrierefreiheit

> **Health-Score im MVP:** technisch vorbereitet (Baseline-Engine steht). Der **vollwertige,
> gewichtete Health-Score** ist als Phase-2-Feature markiert (Auftrag Abschnitt 47); im MVP kann
> eine einfache, transparente Vorstufe gezeigt werden, sofern genügend Daten vorliegen — sonst
> ehrlich ausgeblendet. (Abstimmung: siehe [Dok. 17](17-risiken-offene-fragen.md).)

## 2. Backend (MVP)

- Auth (JWT + Refresh-Rotation), Nutzer/Profil, Consent-Log
- Geräte-Registrierung, Sync-Endpunkt (idempotent), Diagnose-Events
- Messwert-Speicherung (Zeitreihe), Continuous Aggregates
- Baseline-Engine (7/30 Tage), Trend-Berechnung
- Rule-Engine + Alerts + Push-Versand (FCM/APNs)
- Read-APIs: `/today`, `/metrics/*`, `/sleep`, `/activity`, `/trends`, `/alerts`
- DSGVO: Export + Account-Löschung (Purge), Audit-Log-Grundlage

## 3. Admin-WebApp (MVP)

- Admin-Login + RBAC
- **Benutzerverwaltung** (Status, Login, Gerät, App-Version, Sprache, Land; sperren/löschen)
- **Regeln** (Rule-Engine CRUD + Vorschau)
- **Metriken/Referenzbereiche** + **Tipps** je Metrik
- **Content-Verwaltung** (Artikel/Tipps – CMS-Grundlage)
- **Produktverwaltung** + **Affiliate-Links**
- **Übersetzungen** (i18n-Keys)
- **App-Konfiguration** (Score-Gewichte, Tagesziele-Defaults)
- **Dashboard** (Kern-KPIs) + **Audit-Log**

## 4. Bewusst NICHT im MVP (→ Phase 2/3)

Health-Score/Readiness in voller Ausprägung, Insights-Automatik über einfache Regeln hinaus,
Rezepte, Content-Hub-Vollausbau, Gamification, HealthKit/Health-Connect-Sync, Affiliate-Analytics-
Tiefe, Premium-Accounts, AI-Health-Coach, Tagebuch/Lifestyle, weitere Wearables, Smart Scale,
Ernährung, Reports.

## 5. „Fertig“-Kriterien (Definition of Done, MVP)

- Kopplung + Sync mit **echtem** Gerät nachweisbar (keine Fake-Daten).
- Alle angezeigten Metriken stammen aus SDK oder manueller Eingabe; nicht unterstützte klar markiert.
- Warnsystem löst nach konfigurierten Regeln aus, Texte nicht-diagnostisch.
- DSGVO-Grundfunktionen (Consent, Export, Löschung) funktionsfähig.
- Admin kann Regeln/Tipps/Produkte/Übersetzungen ohne App-Update pflegen.
- Build grün (Typecheck), Tests grün, keine Secrets im Repo.
