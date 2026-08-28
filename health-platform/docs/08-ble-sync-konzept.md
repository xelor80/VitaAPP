# 08 – BLE- & Sync-Konzept

## 1. Pairing-Flow (Auftrag Abschnitt 42)

```
1. Gerät suchen        → WearableProvider.scan()  (BLE-Berechtigung vorher anfragen)
2. Gerät auswählen     → Liste gefundener Geräte (Name, Signal)
3. Verbindung herstellen → connect() ; Fortschritt/Status anzeigen
4. Gerät registrieren  → POST /devices  (inkl. capabilities aus Discovery)
5. Firmware anzeigen   → getDeviceInfo()
6. Batteriestand       → getBattery()
7. Letzte Sync         → nach erstem sync() anzeigen
```

Berechtigungen: iOS `NSBluetoothAlwaysUsageDescription`, Android `BLUETOOTH_SCAN/CONNECT`
(+ ggf. Standort je nach OS-Version). Klarer Erklärungsdialog vor der Systemabfrage.

## 2. Sync-Strategien

| Modus | Auslöser | Hinweis |
|-------|----------|---------|
| **Manuell** | Nutzer zieht zum Aktualisieren / Button | immer verfügbar |
| **Auto-Sync (Vordergrund)** | App aktiv + Gerät verbunden, in Intervallen | Standard |
| **Background-Sync** | OS-Hintergrundmechanismen | **abhängig von SDK & OS** (klären, Dok. 18) |

**iOS-Realität:** echter dauerhafter BLE-Background-Sync ist stark eingeschränkt (State
Preservation/Restoration, spezielle Background-Modi). **Android:** Foreground-Service /
WorkManager möglich, herstellerspezifische Akku-Restriktionen beachten. → Wir versprechen im UI
nur, was die SDK/OS real erlauben; sonst „Zum Synchronisieren App öffnen“.

## 3. Sync-Ablauf (inkrementell, idempotent)

```
1. since = letzter erfolgreicher Sync-Zeitpunkt (lokal gespeichert)
2. batch = provider.sync(since)                 // aus Gerätespeicher
3. normalisieren → lokale DB (Drift) schreiben  // offline sofort sichtbar
4. jede Messung erhält ingest_key (deterministisch: device+metric+timestamp[+hash])
5. Offline-Queue → POST /sync/measurements (Batch)
6. Server antwortet accepted|duplicate|rejected  → Queue bereinigen
7. since aktualisieren (nur bei Bestätigung)
```

## 4. Offline-Fähigkeit (Auftrag Abschnitt 43)

- **Lokaler Zwischenspeicher:** alle Messwerte zuerst in SQLite/Drift → App funktioniert offline.
- **Queue:** unbestätigte Uploads bleiben in einer persistenten Queue; erneuter Versuch bei
  Konnektivität (Exponential Backoff).
- **Anzeige:** UI liest lokalen Cache; „zuletzt synchronisiert“ transparent anzeigen.

## 5. Duplicate Detection

- **Client:** `ingest_key` deterministisch aus stabilen Feldern (Gerät, Metrik, exakter
  Zeitstempel, ggf. Wert-Hash). Wiederholtes Senden ist folgenlos.
- **Server:** Unique-Constraint auf `(user_id, ingest_key)` → doppelte Einträge werden verworfen
  und als `duplicate` quittiert.
- **Grenzfälle:** Uhr-Drift des Geräts (Zeitbasis normalisieren), überlappende Sync-Fenster
  (Fenster leicht überlappen lassen, Dedup fängt ab).

## 6. Konflikte & Korrekturen

- Messwerte sind grundsätzlich **append-only** (unveränderliche Fakten).
- Manuelle Nutzereinträge (Tagebuch/Gewicht) sind editierbar und getrennt von Gerätemesswerten.
- Bei widersprüchlichen Quellen (Wearable vs. HealthKit, Phase 2): Quelle priorisieren
  (`source`-Rang), keine stillschweigende Überschreibung.

## 7. Fehlerbehandlung & Diagnose

- BLE-/Sync-Fehler werden lokal geloggt und **ohne Gesundheitsdaten** als
  `device_connections`-Events ans Backend gemeldet (Diagnose, Dok. 03/45).
- Nutzerfreundliche Zustände: „Gerät nicht gefunden“, „Verbindung verloren“, „Sync fehlgeschlagen –
  erneut versuchen“. Keine kryptischen SDK-Fehlercodes im UI.

## 8. Energie & Frequenz

- Echtzeit-Streams (falls SDK) sind akku-intensiv → nur bei aktiver Detailansicht, mit Timeout.
- Sync-Intervalle konfigurierbar (Remote-Config), Default konservativ.
