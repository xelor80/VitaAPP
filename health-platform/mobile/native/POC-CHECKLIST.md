# PoC-Checkliste – Mecorly V500 (Veepoo HBand)

Ziel: **Pairing + ein realer Metrik-Sync** auf iOS **und** Android, Ende-zu-Ende bis ins Backend.
Erst danach schrittweiser MVP-Ausbau (docs/14). Keine erfundenen Werte (docs/50).

## 0. Voraussetzungen
- [ ] Mecorly V500 geladen (> 30 %), in Reichweite, nicht mit der HBand-App verbunden.
- [ ] Veepoo-SDK-Dateien: Android `.aar` + iOS `.framework` (github.com/HBandSDK).
- [ ] `flutter create .` im `mobile/`-Ordner ausgeführt (Plattformordner vorhanden).
- [ ] Backend läuft lokal (`api/v1`), Test-Nutzer registriert (Access-Token vorhanden).

## 1. Einbinden
- [ ] Native Wrapper nach Anleitung ([README.md](README.md)) integriert (Android + iOS).
- [ ] Permissions gesetzt (BLE/Standort/Background wie beschrieben).

## 2. Verbindung
- [ ] `scan()` liefert das V500 (Name/MAC/RSSI).
- [ ] `connect(device, password: "0000")` erfolgreich; `connectionState` = connected.
- [ ] `getDeviceInfo()` zeigt Firmware/Modell; `getBattery()` liefert Prozent.

## 3. Capability-Discovery (entscheidend)
- [ ] `capabilities()` gibt die **real** unterstützten Metriken des V500 zurück.
- [ ] Ergebnis dokumentieren → Mapping-Tabelle (docs/19 §4/§7) final verifizieren.
- [ ] Prüfen: hat das V500 EKG (`ecgType > 0`)? Wenn nein → EKG-UI ausblenden.

## 4. Sync (ein Tag)
- [ ] `sync()` liefert normalisierte Messwerte (HR/SpO2/Steps/…); Zeitbasis → UTC korrekt.
- [ ] Werte plausibel gegen die HBand-App gegenprüfen (Stichprobe).
- [ ] `ingestKey` je Messung stabil (Dedup testbar durch zweiten Sync).

## 5. End-to-End ins Backend
- [ ] `POST /api/v1/sync/measurements` mit dem Batch → Antwort `accepted/duplicate/rejected`.
- [ ] Zweiter Sync desselben Zeitraums → alles `duplicate` (Idempotenz bestätigt).
- [ ] `GET /api/v1/metrics/heart_rate/series` zeigt die Punkte; `GET /api/v1/today` reagiert.

## 6. Ergebnis festhalten
- [ ] Reale Capability-Flags + Einheiten/Frequenzen in docs/19 nachtragen.
- [ ] Offene SDK-Punkte (docs/19 §8) beantworten oder als Rückfrage an Veepoo sammeln.
- [ ] Entscheid: welche Metriken erscheinen im MVP-UI (nur real gelieferte).

> Stolpersteine (docs/08/17): iOS-Background-BLE ist eingeschränkt → im PoC Vordergrund-Sync
> testen. Keine parallelen SDK-Aufrufe (die Dart-CommandQueue serialisiert automatisch).
