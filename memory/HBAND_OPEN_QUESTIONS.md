# HBand Integration – Offene Fragen

> **Status:** Wird während der Integration laufend ergänzt.
> **Bandmodell:** ✅ **Mecoly E500 (display-lose Variante)** – Veepoo/HBand-kompatibel
> **Companion-App:** H Band (`com.veepoo.hband`)
> **SDK-Base:** HBandSDK / Veepoo `com.veepoo.protocol.VPOperateManager`

---

## ✅ Bereits geklärt (nach Web-Recherche)

- Companion-App: **H Band** (Play Store `com.veepoo.hband`) → HBandSDK ist der offizielle Weg
- BLE 5.1, Chip GR5515 (Goodix)
- Sensoren laut Marketing: ECG, PPG (SFH2201), Temp, SpO₂, HRV, Blutdruck-Schätzung, Blutzucker-Schätzung
- Community-Referenz: `geekswamp/flutter_veepoo_sdk_plus` (Apache-2.0) – enthält die kompletten Kotlin-Bridge-Signaturen für **20+ SDK-Methoden**. Details siehe `HBAND_NATIVE_BRIDGE_SPEC.md`.

## 🔴 Kritische Blocker (jetzt klären)

- [ ] **AAR-Bibliothek für Android besorgen.**
  Repo enthält nur Docs. Optionen:
  1. Direkter Kontakt mit Veepoo (Cooperation Agreement) – offiziell
  2. Über den Reseller/Distributor der Mecoly-Bänder (evtl. bereits mit dem Muster im Lieferumfang)
  3. Community-AAR aus `vpht1/hband` (rechtliche Grauzone, nicht empfohlen für Prod)
- [ ] **iOS-Framework besorgen.** Analog zu Android. Öffentliche Header sind da, aber die
      kompilierte `VeepooSDK.framework`/`VeepooKit.framework` fehlt.
- [ ] **Konkrete Firmware-Version** des gelieferten Mecoly E500
- [ ] **Standard-Kopplungs-PIN** (üblich `0000` oder Geräteseriennummer – muss bestätigt werden)

## 🟡 Bandmodell-spezifisch (nach Erhalt des Musters testen)

- [ ] Capability-Flags auslesen (`readCapabilities()`) und dokumentieren. Erwartet:
  - ECG: ✅
  - HRV: ✅
  - SpO₂ (continuous): ✅
  - Temp (Haut): ✅
  - Blutdruck (Schätzung): ✅ – **muss als „Wellness-Schätzung" gelabelt werden**
  - Blutzucker (Schätzung): ✅ – **muss als „nicht validiert" gelabelt werden**
  - Display: ❌ (display-lose Version)
- [ ] Sampling-Frequenz ECG (typisch 250 Hz)
- [ ] Wie viele Tage historische Daten speichert das Band lokal?
- [ ] Sync-Protokoll: Delta-Sync via `syncHealthData(since)` unterstützt?
- [ ] Wecker (vibrations-basiert) verfügbar?
- [ ] Anti-Lost / Find Band?

## 🔵 SDK-Verhalten

- [ ] Wie liefert das SDK HRV: als **RMSSD**, **SDNN** oder proprietärer Wert?
      → wir labeln bis zur Klärung neutral als „HRV (Bandmesswert)"
- [ ] Passwort/Auth-Flow für `bindDevice()` – wo genau kommt der PIN her?
- [ ] Rate-Limits bei Streaming (Realtime-Events)?
- [ ] Verhalten bei App-Kill: läuft Sync im Hintergrund weiter oder muss App laufen?

## 🟢 Für später (nach Prototyp)

- [ ] OTA-Firmware-Update-Protokoll (DFU-Standard oder proprietär?)
- [ ] Bulk-Import bereits vom Band gesammelter Daten (Multi-Tage-Backfill)
- [ ] Health Connect (Android) & HealthKit (iOS) – separates Modul
- [ ] Weibliche Gesundheit / Zyklus – vorerst nein

---

## 📎 Referenzen

- Repo Übersicht: https://github.com/HBandSDK
- Android Docs: https://github.com/HBandSDK/Android_Ble_SDK
- Android DeepWiki: https://deepwiki.com/HBandSDK/Android_Ble_SDK
- iOS Header: https://github.com/HBandSDK/iOS_Ble_SDK
- iOS Wiki: https://deepwiki.com/HBandSDK/iOS_Ble_SDK
- Community-Flutter-Plugin (Referenz-Bridge): https://github.com/geekswamp/flutter_veepoo_sdk_plus
- Companion-App (Play Store): https://play.google.com/store/apps/details?id=com.veepoo.hband
- Native-Bridge-Spec: `HBAND_NATIVE_BRIDGE_SPEC.md`

**Letzte Aktualisierung:** 2026-08-04
