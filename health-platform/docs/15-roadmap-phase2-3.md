# 15 – Roadmap: Phase 2 & Phase 3

Aufbauend auf dem MVP ([Dok. 14](14-mvp-umfang.md)). Reihenfolge nach Wert/Abhängigkeit,
nicht als starrer Zeitplan. Alles baut auf der modularen Architektur auf – **kein Neubau nötig**.

## Phase 2 – Verstehen & Binden (Auftrag Abschnitt 47)

| Bereich | Inhalt | Voraussetzung |
|---------|--------|---------------|
| **Health-Score / Readiness** | Vollwertiger gewichteter Score + Komponenten + Erklärungen | genug Baseline-Daten, konfigurierbare Gewichte |
| **Health-Insights** | Regelbasierte Zusammenhänge (Schlaf↔HRV, Wochentags-Stress, Schritt-Trends) | historische Daten |
| **Rezepte** | Vollständiger Rezeptbereich (Nährwerte, Tags, Filter) | CMS/Storage |
| **Content-Hub** | „Entdecken“ voll ausgebaut (Artikel/Videos/Infografiken/Challenges) | CMS |
| **Gamification** | Badges, Serien, Monatsziele | Aktivitätsdaten |
| **HealthKit / Health Connect** | optionaler Import/Export (getrennt) | Plattform-Berechtigungen |
| **Affiliate-Analytics** | Klicks/CTR/Top-Produkte/Umsatz-Dashboards | Tracking-Basis (MVP) |
| **Premium-Accounts** | Free/Premium-Gating serverseitig (Entitlements) | Billing-Anbindung |
| **Empfehlungsengine** | Regelbasierte Verknüpfung Kontext→Content/Produkte im Admin | recommendation_rules |
| **Tagebuch/Lifestyle** | Stimmung, Energie, Koffein, Training, Gewicht, Wasser … | diary_entries |

## Phase 3 – Intelligenz & Ökosystem (Auftrag Abschnitt 48)

| Bereich | Inhalt | Hinweis |
|---------|--------|---------|
| **AI-Health-Coach** | „Frag deinen Health Coach“ – Analyse aus Schlaf/HRV/Ruhepuls/Stress/Aktivität; nie Diagnose | nur freigegebene Daten, Wellness vs. med. Beratung |
| **Automatische Korrelationen** | KI-gestützte Muster über regelbasiert hinaus | Feature-Store aus Baselines/Events |
| **Erweiterte Lifestyle-Auswertung** | Zusammenhänge aus Tagebuch + Messwerten | Datenmenge |
| **Weitere Wearables** | zusätzliche `WearableProvider` | HAL bereits vorbereitet |
| **Smart Scale** | Gewicht/Körperzusammensetzung | neues Geräte-/Metrik-Modul |
| **Ernährung / Kalorientracking** | Food-Logging, Wasser | neues Modul |
| **Workout-Coach / Fitnesspläne** | angeleitete Programme | Content + Aktivität |
| **Health-Reports / PDF** | teilbare Reports | Report-Service + S3 |
| **Premium+** | erweiterte KI/Reports/Coaching | Entitlements |
| **Familienaccounts / Corporate Health** | Mehrnutzer-Strukturen | Rollen-/Tenant-Erweiterung |

## Architektur-Vorbereitungen, die wir früh treffen (damit Phase 2/3 leicht werden)

- **Server-getriebene Konfiguration** (Score-Gewichte, Regeln, Empfehlungen, Texte) → Features
  ohne App-Update.
- **Generisches Messwert-Schema** + Provider-Registry → neue Metriken/Geräte ohne Umbau.
- **Event-Outbox** → KI/Analytik können später an Datenströme andocken.
- **Entitlement-Gating serverseitig** → Premium jederzeit aktivierbar.
- **Freigegebene-Daten-Grenze** für KI von Anfang an (Consent-Typ „KI-Analyse“).
- **i18n datengetrieben** → neue Sprachen/Länder ohne App-Umbau.

## Monetarisierung (Auftrag Abschnitt 37, Architektur vorbereitet)

- **Free:** Basis-Dashboard, Schritte, Puls, Schlaf, Grundstatistiken.
- **Premium:** Health-Score, Langzeittrends, Insights, Coach, erweiterte Schlafanalyse, Reports.
- **Premium+:** erweiterte KI/Reports/Coaching.
- Zusätzlich Affiliate-Einnahmen & Content-Partnerschaften.
- **Regel:** keine aggressiven Verkaufsmechanismen im Kontext kritischer Gesundheitswarnungen.
