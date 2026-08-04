# Veepoo / HBand SDK – Beschaffungs-Anleitung

> **Ziel:** Offizieller Zugang zur Android-AAR und iOS-Framework-Datei des HBand-SDK,
> damit die native BLE-Bridge im EAS-Build funktioniert.
> **Bandmodell:** Mecoly E500 (display-lose Variante, Veepoo-Chip)
> **Companion-App:** H Band (`com.veepoo.hband`)

---

## 🎯 Was du am Ende brauchst

| Artefakt | Format | Wo eingesetzt |
|---|---|---|
| **Android-SDK** | `.aar`-Datei (typisch `vpbluetooth-<version>.aar`) | `frontend/android/app/libs/` |
| **iOS-SDK** | `.framework` oder `.xcframework` (typisch `VeepooSDK.framework`) | Podfile / iOS project |
| **API-Dokumentation** | PDF oder Wiki-Link, aktuelle Version | intern für Bridge-Dev |
| **Testgerät-Passwort** | 6-stelliger Default-PIN (oft `0000`) | für `bindDevice()` Call |
| **Kooperations-/NDA-Vertrag** | PDF | zur Rechtssicherheit |

---

## 📞 Kontaktkanäle in Reihenfolge (schneller → langsamer)

### Option 1 – Über deinen Mecoly-Reseller (empfohlen zuerst)
Frage den Anbieter, von dem du das E500 bezogen hast, ob **SDK-Zugang bereits im Lieferumfang enthalten** ist. Viele Reseller haben eine Veepoo-Freischaltung und leiten dich an einen konkreten Support-Account weiter. **Dauer:** 1–3 Werktage.

### Option 2 – Veepoo direkt kontaktieren
- **Website:** https://www.veepoo.com
- **Sales-Kontakt:** `sales@veepoo.com` (allgemein) oder das Kontaktformular auf der Site
- **Alternative Adressen** (wenn Sales nicht antwortet):
  - `support@veepoo.com`
  - `oem@veepoo.com` (für OEM/White-Label Partner)
- **Dauer:** üblicherweise 3–7 Werktage, oft langsamer wg. Zeitzone (Shenzhen, CN).

### Option 3 – Über den HBand-App-Entwickler-Kanal
Auf der HBand-App-Seite im Play/App-Store findet man manchmal einen `contact@` – funktioniert selten schnell, aber ist einen Versuch wert.

---

## ✉️ E-Mail-Vorlage (Deutsch → Englisch)

**Betreff:** `SDK Access Request – Mecoly E500 for VitaGuide+ Health App`

---

Dear Veepoo Sales Team,

I am developing a health & wellness mobile application called **VitaGuide+** (iOS + Android, React Native)
which integrates with wearable devices to offer personal recovery, sleep and activity insights.

We have already tested and purchased a **Mecoly E500 fitness band** (display-less variant), which is
based on your platform and works with the H Band companion app.

To integrate the band natively into VitaGuide+, I would kindly ask for:

1. **Android SDK** – the current `vpbluetooth-*.aar` library file with API documentation
2. **iOS SDK** – the corresponding `VeepooSDK.framework` (or `.xcframework`) plus API documentation
3. **Cooperation / NDA agreement** – any contract required to use the SDK in a commercial app
4. **Default pairing PIN** – the standard 6-digit password for the E500 device

**About the project:**
- Purpose: personal wellness dashboard (recovery / sleep / HRV / SpO₂ / ECG snapshot)
- Distribution: closed beta first, later Play Store & App Store
- Company: [BITTE FIRMENNAME EINTRAGEN]
- Country: Germany / Switzerland

We already have a device architecture in place that isolates the vendor SDK behind an abstraction
layer (`WearableProvider`), so integrating your SDK is a self-contained work stream and no data
leaves the user's phone without their explicit consent.

Could you please confirm:
- what steps are required to obtain SDK access, and
- whether the E500 is covered by your standard SDK or requires a device-specific build?

Thank you very much – I look forward to your reply.

Kind regards,
[BITTE DEINEN NAMEN + POSITION EINTRAGEN]
[Firmenname]
[E-Mail] · [Telefon]
Website: https://vitaguide.app

---

## 🧾 Was du vor dem Absenden vorbereiten solltest

- [ ] Firmenname + rechtliche Form (GmbH, GbR, Einzelunternehmer, …)
- [ ] Handelsregister-Nummer / USt-ID (macht Anfrage seriöser)
- [ ] Kurzbeschreibung der App (2–3 Sätze) auf Englisch
- [ ] Testgerät-Seriennummer bereithalten (steht auf der Verpackung, häufig auf der Innenseite)
- [ ] Falls möglich: einen Link zu vitaguide.app oder einer Roadmap-Seite

## 🔒 NDA/Vertrag – Was üblicherweise darin steht

- **Non-Disclosure**: SDK-Interna, API-Docs, PIN-Verfahren dürfen nicht öffentlich gemacht werden.
- **Territorium**: meist weltweit oder EU/EWR.
- **Kommerzielle Nutzung**: erlaubt in eigenen Apps, Redistribution des SDK selbst untersagt.
- **Support & Updates**: teils kostenpflichtig, teils inklusive für X Monate.
- **Firmware-Rechte**: OTA-Firmware ist meist an das Modell gebunden.

**Wenn du Umsatzbeteiligung oder Lizenzkosten vermeiden willst**, achte auf:
- Klausel „Royalty-Free"
- Klausel „No per-user / per-device fees"
- Bevorzugt Einmalzahlung oder komplett kostenlos für Partner

---

## ✅ Wenn die Files eingetroffen sind

1. `.aar` → `frontend/android/app/libs/vpbluetooth-<version>.aar`
2. `.framework`/`.xcframework` → iOS `Frameworks/`-Ordner, im Podfile referenzieren
3. `HBAND_OPEN_QUESTIONS.md` fertig beantworten
4. Native-Bridge-Modul `HBandBridge` gemäß `HBAND_NATIVE_BRIDGE_SPEC.md` implementieren
5. `HBandProvider.stub.ts` durch echte Implementierung ersetzen
6. Erster EAS-Dev-Build: `cd frontend && eas build --profile development --platform android`
7. Beim ersten Verbindungsversuch: PIN im BindDevice-Call verwenden

---

## ⚠️ Fallback wenn Veepoo nicht antwortet (>2 Wochen)

- **Reseller wechseln**: manche Distributoren (z.B. auf Alibaba) haben SDK-Zugang direkt zur Bestellung dabei
- **Community-Plugin nutzen** (rechtliche Grauzone): Das öffentliche `geekswamp/flutter_veepoo_sdk_plus` Repo enthält historisch bereits kompilierte SDK-Files. Nicht für Prod empfohlen, aber für frühen POC brauchbar.
- **Alternatives Band**: es gibt weitere Veepoo-basierte Modelle bei ANNCOE, LEMFO, VerveLife – gleicher SDK, aber andere Reseller mit ggf. besserem Support.
