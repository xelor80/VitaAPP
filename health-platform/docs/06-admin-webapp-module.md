# 06 – Admin-WebApp-Modulstruktur (Next.js)

Separate, geschützte Web-Anwendung unter `admin.<domain>`. Modernes SaaS-Dashboard.
Eigene Admin-Auth + RBAC, alle sensiblen Zugriffe im Audit-Log.

## 1. Navigation (Auftrag Abschnitt 23)

```
Dashboard · Benutzer · Geräte · Gesundheitsmetriken · Regeln · Warnungen ·
Inhalte · Tipps · Produkte · Affiliate · Rezepte · Push-Mitteilungen ·
Statistiken · Übersetzungen · App-Konfiguration · Administratoren · Audit-Log
```

## 2. Ordnerstruktur

```
app/(admin)/
├── dashboard/                # KPIs (DAU/MAU, Geräte, Messungen, Push, Alerts, Affiliate)
├── users/                    # Nutzerverwaltung
│   └── [id]/                 # Detail: Status, Login, Gerät, App-Version, Sprache, Land
├── devices/                  # verbundene/aktive Wearables, Firmware-Verteilung
├── metrics/                  # Gesundheitsmetriken: Definitionen, Einheiten, Referenzbereiche
├── rules/                    # Rule-Engine: Regeln CRUD + Test/Vorschau
├── alerts/                   # ausgelöste Warnungen (aggregiert, nicht personenzentriert)
├── content/                  # CMS: Artikel/Videos/Infografiken/Challenges
├── tips/                     # Tipps je Metrik („So beeinflusst du diesen Wert“)
├── products/                 # Produktverwaltung + Affiliate-Links
├── affiliate/                # Affiliate-Analytics (Klicks, CTR, Top-Produkte)
├── recipes/                  # Rezeptverwaltung
├── push/                     # Push-Kampagnen-Manager
├── stats/                    # erweiterte Statistiken/Reports
├── translations/             # i18n-Verwaltung (Keys je Sprache)
├── config/                   # App-Konfiguration (Score-Gewichte, Feature-Flags, Ziel-Defaults)
├── admins/                   # Administratoren + Rollen
└── audit/                    # Audit-Log-Ansicht
components/  lib/  (API-Client, Auth, RBAC-Guards)
```

## 3. Bereiche im Detail

| Bereich | Funktionen | Datenschutz-Hinweis |
|---------|-----------|---------------------|
| **Dashboard** | Registrierte/aktive Nutzer, DAU/MAU, Wearables (verbunden/aktiv), Messungen heute, Push, Warnungen, Affiliate-Klicks, Content-Views, App-Versionen, iOS/Android-Anteil | **Keine** individuellen Gesundheitsdaten auf dem Hauptdashboard |
| **Benutzer** | Suchen, Status, Registrierungsdatum, letzter Login, Gerät, App-Version, Sprache, Land, sperren, löschen, Support-Infos | Gesundheitsdaten nur mit **Sonderberechtigung** + Audit-Eintrag |
| **Geräte** | Übersicht Wearables, Firmware-Verteilung, Sync-/BLE-Fehlerraten | Diagnosedaten, keine Messwerte |
| **Gesundheitsmetriken** | Metrik-Katalog: Einheit, Referenzbereiche, „Was bedeutet dieser Wert?“-Texte | Konfiguration, keine Personendaten |
| **Regeln** | Rule-Engine CRUD, Severity, Occurrences, Zielgruppen, Test gegen Beispieldaten | siehe Dok. 10 |
| **Warnungen** | ausgelöste Alerts, aggregierte Auswertung | anonymisiert/aggregiert |
| **Inhalte (CMS)** | Artikel/Videos/Infografiken/Rezepte-Teaser: RichText, Kategorie, Tags, Status (Draft/Published/Archived), Sprache, Veröffentlichungsdatum | ohne App-Update publizierbar |
| **Tipps** | Tipps je Metrik pflegen | |
| **Produkte** | Anlegen/Bearbeiten/Deaktivieren, Affiliate-Link, Bild-Upload, Kategorien, Tags, Länder, Sprachen, Priorität, Empfehlungsgewicht | keine Krankheits-Heilaussagen |
| **Affiliate** | Klicks heute/Monat, Top-Produkte/-Kategorien, CTR, Umsatz (falls API) | pseudonymisiert |
| **Rezepte** | Vollständige Rezeptpflege (Nährwerte, Zutaten, Zubereitung, Tags) | |
| **Push-Mitteilungen** | Kampagnen: Zielgruppen (alle/iOS/Android/Land/Sprache/aktiv/inaktiv), Planung (sofort/geplant), Segmentierung (später) | |
| **Statistiken** | Nutzung, Retention, Wearable-Aktivität, Content-Performance | aggregiert |
| **Übersetzungen** | i18n-Keys je Sprache, Import/Export | |
| **App-Konfiguration** | Score-Gewichte, Tagesziel-Defaults, Feature-Flags, Empfehlungsregeln | versioniert |
| **Administratoren** | Admin-Accounts, Rollen/Rechte | |
| **Audit-Log** | Wer hat wann was gesehen/geändert | unveränderlich |

## 4. RBAC (Admin-Rollen, Vorschlag)

| Rolle | Rechte (Kurzform) |
|-------|-------------------|
| `superadmin` | alles inkl. Administratoren-Verwaltung, App-Config |
| `content_manager` | Inhalte, Tipps, Rezepte, Übersetzungen |
| `product_manager` | Produkte, Affiliate |
| `health_ops` | Regeln, Metriken, Warnungen |
| `support` | Nutzerverwaltung (ohne Gesundheitsdaten), Support-Infos |
| `health_data_viewer` | **temporärer** Zugriff auf individuelle Gesundheitsdaten (Support-Fall), stark auditiert |

Rechte granular als `resource:action`. Jede sensible Aktion erzeugt einen Audit-Eintrag.

## 5. Prinzipien

- **Konfiguration statt Code:** Regeln, Score-Gewichte, Content, Empfehlungen, Texte werden hier
  gepflegt und live an App/Backend ausgeliefert – kein App-Update nötig.
- **Datensparsamkeit im Admin:** Gesundheitsrohdaten sind standardmäßig **nicht** sichtbar.
- **Zwei-Faktor** für Admin-Logins empfohlen.
