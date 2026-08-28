# 18 – Was ich von dir zur Fitnessband-SDK brauche

> ✅ **Teilweise erledigt:** Die SDK ist bekannt – **Veepoo HBand / VPBluetooth**
> ([github.com/HBandSDK](https://github.com/HBandSDK), Android + iOS, Apache-2.0, Binaries + Wiki
> öffentlich). Die SDK-Analyse steht in [Dok. 19](19-sdk-mapping-veepoo-hband.md). Damit sind die
> meisten SDK-/Plattform-Fragen unten **beantwortet**. Es bleiben v. a. **gerätespezifische** Punkte.

## 🔴 Jetzt noch nötig (Restpunkte)

- [ ] **Konkrete Bandmodelle** (Name/Modellnummer je Gerät), die wir unterstützen.
- [ ] **Capability-Flags** je Modell (welche Metriken kann es real: ECG, BP, Temp, HRV, accurate
      Sleep …) – lesen wir sonst am Testgerät aus (`DeviceFunctionPackage` / `ecgType` etc.).
- [ ] **Physisches Testgerät** für den PoC (Pairing + realer Sync auf iOS & Android).
- [ ] **Geräte-Passwort** (Standard `0000`? geändert?), 12/24h-Vorgabe.
- [ ] Genaue **SDK-/Firmware-Version**, falls du eine bestimmte einsetzen willst.
- [ ] Herstellerangaben zur **Messgenauigkeit** (v. a. Blutdruck/SpO2), falls vorhanden.

Der Rest dieses Dokuments bleibt als **Checkliste/Referenz** stehen (vieles ist durch Dok. 19
bereits geklärt). Bitte liefere so viel wie möglich der offenen Punkte.

## A. SDK-Dateien & Dokumentation

- [ ] **SDK-Pakete**: iOS (`.framework`/`.xcframework`/CocoaPod) **und** Android (`.aar`/Maven).
- [ ] **Offizielle SDK-Dokumentation** (PDF/Link), inkl. API-Referenz.
- [ ] **Beispielprojekt / Demo-App** des Herstellers (iOS und/oder Android) – sehr hilfreich.
- [ ] **Integrationsanleitung / Getting-Started** des Herstellers.
- [ ] **Lizenz-/Nutzungsbedingungen** der SDK (dürfen wir sie in einer eigenen App vertreiben?).
- [ ] **App-ID/Key/Secret**, falls die SDK eine Registrierung/Authentifizierung braucht.
- [ ] **Kontakt** des Hersteller-Supports (für Rückfragen).

## B. Gerät(e)

- [ ] Welche **Modelle** genau? (Name/Modellnummer je Gerät.)
- [ ] Pro Modell: Liste der **unterstützten Messwerte** (laut Hersteller).
- [ ] **Firmware-Version(en)** der vorliegenden Geräte.
- [ ] Gibt es **mehrere unterschiedliche** Geräte mit unterschiedlichem Funktionsumfang?

## C. Funktionale SDK-Details (für das SDK-Mapping)

Für **jede** verfügbare Messgröße bräuchte ich (soweit dokumentiert):

- [ ] SDK-**Funktionsname/Methode** und **Callback/Event**, über den der Wert kommt.
- [ ] **Echtzeit** (Live-Stream) oder nur **Historie** (aus Gerätespeicher)?
- [ ] **Datenformat & Einheit** (z. B. bpm, ms, %, °C).
- [ ] **Auflösung/Frequenz** (z. B. 1/min, 1/s, punktuell).
- [ ] **Zeitstempel**: UTC oder Gerätezeit? Format?
- [ ] **Rohdaten** verfügbar (v. a. **EKG**: Sample-Rate, Format, Länge)?
- [ ] Herstellerangabe zur **Messgenauigkeit** je Wert (falls vorhanden).

Konkret für: Schritte, Distanz, Kalorien, Herzfrequenz, HRV, SpO2, Blutdruck, Temperatur,
Stress, MET, Schlaf, EKG, (ggf. Körperzusammensetzung / weitere).

## D. Verbindung & Synchronisation

- [ ] **BLE-Scan/Pairing**: Wie findet/koppelt die SDK Geräte? Besondere Schritte?
- [ ] **Verbindungs-Events** (connected/disconnected/error) – wie signalisiert?
- [ ] **Sync-Modell**: Wie werden historische Daten abgerufen (voll/inkrementell, „since“)?
- [ ] **Hintergrund-Synchronisation** unterstützt? iOS und/oder Android? Wie?
- [ ] **Batterie**: Wie wird der Ladestand ausgelesen (Event/Abfrage)?
- [ ] **Geräteinfo**: Seriennummer/ID, Firmware – wie identifiziert?
- [ ] **Firmware-Update**: über die SDK möglich/nötig?

## E. Plattform-Details

- [ ] **iOS-Unterstützung** vollständig? Minimale iOS-Version? Nötige Background-Modes?
- [ ] **Android-Unterstützung** vollständig? Minimale API-Level? Nötige Permissions/Foreground-Service?
- [ ] Gibt es **Unterschiede** im Funktionsumfang zwischen iOS und Android?
- [ ] Liefert der Hersteller **Flutter- oder React-Native-Bindings** (statt/zusätzlich zu nativ)?
      → Diese Antwort entscheidet ggf. Flutter vs. React Native.

## F. Format der Antwort

Am hilfreichsten:
1. Die **SDK-Dateien** (Upload/Link) + **Doku** + **Beispielprojekt**.
2. Kurze Antworten zu B–E (Stichpunkte reichen).
3. Falls vorhanden: eine **Herstellertabelle**, welches Modell welche Werte kann.

## Was danach passiert

1. Ich analysiere SDK + Beispielprojekt vollständig.
2. Ich fülle die **SDK-Mapping-Tabelle** aus [Dok. 07](07-sdk-integration.md) mit realen Daten.
3. Wir bauen einen **PoC** (Pairing + ein echter Metrik-Sync auf iOS & Android).
4. Nach deiner Freigabe: schrittweiser MVP-Aufbau ([Dok. 14](14-mvp-umfang.md)).

> Bis diese Grundlagen stehen, wird **keine** SDK-abhängige Funktion implementiert – nur Dinge, die
> unabhängig von der SDK sind (z. B. Backend-Grundgerüst, Auth, Datenmodell, Admin-Basis), sofern
> du das vorziehen möchtest.
