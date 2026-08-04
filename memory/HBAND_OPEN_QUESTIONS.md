# HBand Integration – Offene Fragen

> **Status:** Wird während der Integration laufend ergänzt.
> **Verantwortlich:** Wird pro Frage geklärt (SDK-Support, eigene Tests, Herstellerkontakt).

---

## 1. SDK-Zugang & Lizenz

- [ ] **Vertrag / kooperative Partnerschaft mit Veepoo/HBand vorhanden?**
  Android-Repo README sagt explizit: *„SDK provided only to cooperative customers."*
  → Ohne Vertrag ist die eigentliche `.aar` (Android) evtl. nicht offiziell nutzbar.
- [ ] **iOS `.framework` bereits verfügbar?** Public-Repo enthält Objective-C-Header + Demo, aber muss geprüft werden ob Framework-Datei enthalten oder separat.
- [ ] **Welches konkrete Bandmodell wurde bestellt?** (Modellname, Firmware-Version, Feature-Set)
- [ ] **Gibt es einen technischen Ansprechpartner beim Hersteller?**

## 2. Unterstützte Messwerte

Zu prüfen anhand der iOS/Android-SDK-Doku (siehe DeepWiki & Wiki-Seiten):

- [ ] Liefert das konkrete Modell **HRV**? Falls ja: als **RMSSD**, **SDNN** oder proprietärer Wert?
- [ ] Liefert das Modell **SpO₂**? Kontinuierlich oder nur On-Demand?
- [ ] **Temperatur**: Haut oder Körperkern? Genauigkeit?
- [ ] **Blutdruck-Schätzung**: verfügbar? Als **Wellness-Schätzwert** oder ist medizinisch validiert?
- [ ] **Stress-Wert**: verfügbar? Auf welcher Berechnungsbasis?
- [ ] **Atemfrequenz**: verfügbar?
- [ ] Schlaf-Phasen: nur `light/deep` oder auch `REM`?
- [ ] **Trainingsmodi**: welche Sportarten werden erkannt?

## 3. Echtzeitmessung (Real-time)

- [ ] Welche Metriken können in Echtzeit gestreamt werden? (Herz, SpO₂, HRV, Temp?)
- [ ] Maximale Streaming-Dauer / Timeouts?
- [ ] Sampling-Frequenz?
- [ ] Muss das Band still gehalten werden?

## 4. Historische Daten & Sync

- [ ] Wie viele Tage historische Daten speichert das Band lokal, bevor überschrieben wird?
- [ ] Sync-Protokoll: Delta-Sync (nach `last_sync_at`) möglich?
- [ ] Data-Chunk-Größe pro BLE-Transfer?
- [ ] Kann ein abgebrochener Sync fortgesetzt werden?

## 5. Firmware-OTA

- [ ] Welches OTA-Protokoll wird verwendet? DFU-Standard oder proprietär?
- [ ] Checksum-Prüfung durch SDK oder manuell?
- [ ] Fallback / Recovery-Mode dokumentiert?

## 6. Berechtigungen / Plattform

- [ ] Android 12+: brauchen wir `BLUETOOTH_SCAN` mit `neverForLocation` oder mit Location-Permission?
- [ ] iOS: benötigen wir **Background BLE**-Berechtigung für Auto-Sync?

## 7. Datenschutz

- [ ] Persistiert das SDK personenbezogene Daten in eigenen Files auf dem Gerät? Falls ja, wo & verschlüsselt?
- [ ] Nutzt das SDK eigene Analytics / Netzwerkkommunikation nach Hause?
- [ ] Werden BLE-Advertising-Daten gefiltert?

## 8. Sonstiges

- [ ] Unterstützt das Modell **Anti-Lost / Find Device**?
- [ ] Weibliche Gesundheitsfunktionen (Zyklus)? – Fokus in VitaGuide+ zunächst nein.
- [ ] Wecker / Notifications an das Band – erwünscht?

---

## 📎 Referenzen

- Repo Übersicht: https://github.com/HBandSDK
- Android Docs (HTML): https://github.com/HBandSDK/Android_Ble_SDK
- Android DeepWiki: https://deepwiki.com/HBandSDK/Android_Ble_SDK
- iOS Header: https://github.com/HBandSDK/iOS_Ble_SDK
- iOS Wiki (Veepoo SDK): https://github-wiki-see.page/m/HBandSDK/iOS_Ble_SDK/wiki/VeepooSDK-iOS-API-Document

---

**Letzte Aktualisierung:** 2026-06-19
