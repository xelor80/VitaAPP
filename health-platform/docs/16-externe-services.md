# 16 – Benötigte externe Services

Übersicht der externen/gehosteten Dienste, ihr Zweck, Alternativen und Datenschutz-Hinweise.
Grundsatz: möglichst **EU-Hosting**, AVV mit jedem Dienstleister, **keine Gesundheitsdaten** an
Dienste, die sie nicht zwingend brauchen.

## 1. Pflicht für MVP

| Service | Zweck | Optionen | Datenschutz |
|---------|------|----------|-------------|
| **Hersteller-SDK** | Wearable-Datenzugriff (BLE) | vom Hersteller | Kernkomponente; Verhalten klären (Dok. 18) |
| **Push: FCM** (Android) | Push-Benachrichtigungen | Firebase Cloud Messaging | nur Token + neutrale Payload, keine Gesundheitsdaten im Klartext |
| **Push: APNs** (iOS) | Push-Benachrichtigungen | Apple | s. o. |
| **Object Storage** | Bilder, EKG-Rohdaten, Exporte/Reports | MinIO (self-host, EU) / AWS S3 | SSE-Verschlüsselung |
| **PostgreSQL-Hosting** | Kern-/Zeitreihen-DB | Managed (EU) / self-host | Volumen- + Feldverschlüsselung |
| **Redis-Hosting** | Cache + Queue | Managed / self-host | keine dauerhaften Gesundheitsdaten |
| **Transaktions-Mail** | Verifizierung, Reset, Reports | Postmark / SES / SMTP | nur nötige Daten |
| **Crash/Error-Monitoring** | Stabilität App+Backend | **Sentry** (self-host möglich) | keine PII/Gesundheitsdaten in Events |
| **App-Distribution** | Store-Builds | Apple App Store, Google Play | Entwickler-Accounts nötig |
| **CI/CD** | Build/Test/Deploy | GitHub Actions + Fastlane/Codemagic | Secrets sicher verwalten |

## 2. Phase 2/3

| Service | Zweck | Hinweis |
|---------|------|---------|
| **HealthKit / Health Connect** | optionaler Sync | OS-seitig, Nutzer-Consent |
| **KI-Anbieter** (z. B. Anthropic) | Insights/Health-Coach | nur freigegebene Daten, AVV, Zweckbindung, ggf. EU-Region |
| **Affiliate-Netzwerke** | Produkt-Tracking/Umsatz | nur pseudonyme Events, keine Gesundheitsdaten |
| **Billing/Subscriptions** | Premium (App-Store-IAP / RevenueCat) | Store-Vorgaben beachten |
| **Analytics (privacy-first)** | Produktnutzung | PostHog self-host / eigene Events |
| **CDN** | Auslieferung Bilder/Content | EU-Edge bevorzugt |

## 3. Accounts/Zugänge, die du besorgen musst

- **Apple Developer Program** (99 $/Jahr) – für iOS-Build, Push (APNs-Keys), HealthKit.
- **Google Play Developer** (einmalig 25 $) – Android-Veröffentlichung.
- **Firebase-Projekt** – FCM (und ggf. Android-Push-Konfiguration).
- **Domain + Subdomains** (`api.`, `admin.`) + TLS.
- **Hersteller-SDK-Zugang** + Lizenz/Nutzungsbedingungen (siehe Dok. 18).
- Hosting-Umgebung (VPS/Cloud, EU) für Backend/DB/Storage.

## 4. Datenschutz-Leitplanken für externe Dienste

- Push-Payloads neutral halten (kein „Dein Blutdruck ist zu hoch“), Details erst in der App.
- KI nur mit expliziter, separater Einwilligung und auf freigegebenen Daten.
- Affiliate/Analytics erhalten niemals Rohgesundheitswerte.
- Für jeden Dienst: AVV, Datenstandort prüfen, Aufbewahrung/Löschung regeln.
