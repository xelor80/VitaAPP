# EAS Preview Build – Schritt-für-Schritt

Diese Anleitung beschreibt, wie du VitaGuide als **iOS TestFlight-Preview**
und als **Android APK Preview** baust.

Das Repo ist bereits vorbereitet:
- `app.json` enthält HealthKit- und Health-Connect-Permissions
- `eas.json` enthält Profile `preview` (iOS Ad-hoc + Android APK), `preview-simulator` (iOS Simulator) und `production`
- `iOS buildNumber` = **2**, `Android versionCode` = **2**

---

## 1) Voraussetzungen (einmalig)

```bash
# In deinem lokalen Terminal (nicht im Emergent-Container!)
npm install -g eas-cli
eas login          # dein Expo-Account
eas whoami         # prüft Login
```

Wenn du das Repo bei Emergent liegen hast: Nutze `Save to Github` und
klone es lokal, damit du die iOS/Android-Builds von deiner Maschine
starten kannst (Container-Builds über EAS funktionieren, benötigen aber
identisch die selben Credentials).

---

## 2) Projekt einrichten (einmalig)

```bash
cd frontend
eas init            # verlinkt Projekt mit deiner Expo-Organisation
eas credentials     # richte iOS/Android-Signing ein (interaktiv)
```

Für iOS wählst du:
- **iOS Distribution Certificate**: „Let EAS handle for me"
- **Push Notifications Key**: bereits vorhanden → auswählen, sonst „Create"
- **Provisioning Profile**: „Ad Hoc" (für Preview) oder „App Store" (für TestFlight)

Für Android:
- **Keystore**: „Let EAS generate one" (nur einmal!)

---

## 3) iOS TestFlight Preview

```bash
cd frontend
eas build --profile preview --platform ios
```

- Build läuft ca. 15–25 Min in EAS-Cloud.
- Ergebnis: `.ipa` Download-Link + QR-Code zum Installieren auf getesteten Geräten.
- Für **TestFlight**: `eas submit --platform ios --profile production` (das lädt in App Store Connect hoch; danach in TestFlight Tester einladen).

> ⚠️ Falls du damals den Apple-Developer-Agreement-Fehler hattest: **App Store Connect → Business → Agreements** und die neuen Verträge akzeptieren. Danach den Build re-triggern.

## 4) Android APK Preview

```bash
cd frontend
eas build --profile preview --platform android
```

- Ergebnis: `.apk` Download-Link.
- Teile den Link mit deinen Testern (Android → Einstellungen → Unbekannte Quellen erlauben → installieren).
- Alternativ: `eas submit --platform android --profile production` für Play-Store Internal Testing.

## 5) Beides parallel bauen

```bash
cd frontend
eas build --profile preview --platform all
```

---

## 6) Health Connect / HealthKit Testschritte

### iOS (TestFlight-Build auf iPhone)
1. App öffnen → Onboarding → **„Apple Health"** wählen
2. HealthKit-Prompt „Erlauben" (alle Kategorien haken)
3. Zurück in VitaGuide → **Sync starten**
4. Prüfen: Dashboard zeigt Herzfrequenz, HRV, Schlaf, Schritte aus Apple Health

### Android (APK auf Handy)
1. **Health Connect** muss installiert sein (Play Store, ab Android 14 vorinstalliert)
2. Datenquellen (Samsung Health, Fitbit, Google Fit …) müssen mit Health Connect verbunden sein
3. App öffnen → Onboarding → **„Health Connect"** wählen
4. Berechtigungs-Prompt → alle Kategorien erlauben
5. **Sync starten** → Dashboard zeigt echte Werte

---

## 7) Fehlerdiagnose

| Symptom | Ursache | Fix |
|---|---|---|
| Build schlägt fehl: "no provisioning profile" | iOS Certs abgelaufen | `eas credentials` → Profile neu erstellen |
| TestFlight zeigt "Missing Compliance" | Export-Compliance-Angabe fehlt | In App Store Connect → App → Verschlüsselungsangabe „None" |
| Android-APK crasht beim Start | Native Module inkonsistent | `expo doctor` lokal ausführen, dann `eas build:list` → letzten Build löschen |
| Health Connect: „Keine Berechtigungen" | Datenquellen nicht verbunden | User muss Samsung Health/Google Fit erst mit Health Connect koppeln |
| HealthKit: „Kein Zugriff" | Simulator hat keine Health-Daten | Nur auf echtem iPhone testen |

---

## 8) CI / EAS Update (Später)

Sobald mind. ein Build live ist, kannst du OTA-Updates ohne App-Store-Roundtrip pushen:

```bash
eas update --branch preview --message "kleine UI-Fixes"
```

Nutzer bekommen das Update beim nächsten App-Start (nur JS-Änderungen; Native-Module brauchen weiterhin einen neuen Build).
