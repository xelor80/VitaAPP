# 🚀 Wie du JETZT den Preview-Build startest

**Status:** ✅ Alles vorbereitet. Trockentest lokal bestanden — Config-Plugin
injiziert AARs, iOS-Frameworks, Podspec und Podfile-Patch korrekt.

**Warum kann ich (der Agent) den Build nicht selbst starten?**
- EAS Cloud-Build braucht deine Expo-Account-Credentials (Login läuft interaktiv im Browser)
- iOS-Builds brauchen deine Apple-Developer-Zertifikate (nur in deinem Apple Account)
- Der Build dauert 15–25 Min pro Plattform; der Download-Link erscheint nur in **deinem** Expo-Dashboard

---

## Option 1 — Vom eigenen Rechner starten (empfohlen)

### Schritt 1: Save to GitHub
Klick oben rechts in Emergent auf **"Save to Github"** — pushed das komplette
Repo (inkl. AARs, iOS-Frameworks, Config-Plugin) zu deinem GitHub-Repo.

### Schritt 2: Repo lokal klonen
```bash
git clone https://github.com/<dein-user>/<repo-name>.git vitaguide
cd vitaguide/frontend
yarn install
```

### Schritt 3: EAS CLI installieren + einloggen
```bash
npm install -g eas-cli
eas login
# → Browser öffnet sich → mit deinem Expo-Account einloggen
eas whoami  # sollte deinen Username zeigen
```

### Schritt 4: Projekt bei EAS registrieren (nur einmal)
```bash
cd frontend
eas init
# → wählt Expo-Organisation, verlinkt app.json mit EAS-Projekt-ID
```

### Schritt 5: Credentials einrichten (nur einmal)
```bash
eas credentials
# Interaktives Menü:
#   Platform → iOS
#   → Setup Push Notifications: "Let EAS handle"
#   → Distribution Certificate: "Let EAS create for me"
#   → Provisioning Profile: "Ad Hoc"  (für Preview auf getesteten Geräten)
#   → Fertig
#   Platform → Android
#   → Keystore: "Let EAS generate one"
```

### Schritt 6: Build starten (beide Plattformen parallel!)
```bash
eas build --profile preview --platform all
```

- Cloud-Build läuft **~15-25 Min pro Plattform**
- Nach Abschluss bekommst du **2 Download-Links** in deinem Terminal:
  - iOS `.ipa` (installiere via QR-Code auf iPhone → funktioniert nur auf Geräten, die im Apple-Developer-Portal registriert sind für Ad-hoc)
  - Android `.apk` (direkt aufs Handy → Einstellungen → Unbekannte Quellen erlauben)

---

## Option 2 — Ohne Repo-Klon, via Emergent-Deployer

Wenn du das Emergent-Deploy-Feature nutzt (für Web), aber für **native Apps musst du zwingend über EAS gehen** (Option 1). Emergent deployed nur Web-Bundles.

---

## Was du danach testen wirst

### iOS (via TestFlight oder Ad-hoc Install)
1. App öffnen → Onboarding startet
2. **Datenquellen-Auswahl** erscheint (weil isNativeBridgeAvailable auf iOS = false):
   → **Apple Health** wählen (grüner Haken)
3. HealthKit-Prompt erscheint → alle Kategorien erlauben
4. Zurück in VitaGuide → **Dashboard** → HR, HRV, Schritte, Schlaf aus Apple Health sichtbar
5. **KI-Chat "VERO"** → Nachricht schreiben → Coach kennt deine Werte

### Android (via APK)
1. App öffnen → Onboarding
2. **Datenquellen-Auswahl**: mögliche Optionen:
   - **VitaGuide Band** (HBand SDK — nur Scan aktiv in Phase A)
   - **Health Connect** (Samsung Health, Fitbit, Google Fit)
   - **Demo**
3. Wähle **VitaGuide Band** → **Step 3: Gerätesuche** → dein Mecoly E500 sollte in der Liste erscheinen!
4. **PIN-Toggle** öffnen → Standard 0000 (oder eigenen PIN eintragen)
5. Auf das Band tippen → aktuell folgt "Connect wird in Phase B implementiert" (das ist erwartet in Phase A!)
6. Zurück → **Health Connect** wählen → **Sync** → echte Daten aus Samsung Health / Fitbit / Google Fit im Dashboard

## Was, wenn der Build fehlschlägt?

### Häufige iOS-Build-Fehler
| Fehler | Ursache | Fix |
|---|---|---|
| `no provisioning profile` | Certs abgelaufen | `eas credentials` → Profile neu erstellen |
| `duplicate symbol _OBJC_CLASS_$_...` | `-ObjC` Konflikt zwischen VeepooBleSDK und anderen Pods | In Podspec `OTHER_LDFLAGS` von `-ObjC` auf `-force_load $(PODS_ROOT)/HBandSdkLocal/VeepooBleSDK.framework/VeepooBleSDK` ändern |
| `Framework not found` | Pod install lief nicht | `cd ios && pod install` manuell |
| `Missing Compliance` in TestFlight | Export-Compliance | App Store Connect → Verschlüsselungsangabe „None" |

### Häufige Android-Build-Fehler
| Fehler | Ursache | Fix |
|---|---|---|
| `Could not resolve vpprotocol...` | AAR-Datei fehlt oder wurde nicht gepusht | Prüfe `plugins/with-hband-sdk/android-libs/` in GitHub — alle 7 AARs müssen da sein |
| `Cannot find symbol HBandBridgePackage` | MainApplication-Patch fehlgeschlagen | `expo prebuild --clean` local, dann prüfe `MainApplication.kt` |
| `AAPT: error: attribute health-permission not defined` | Health Connect Attributes fehlen | Setze `compileSdkVersion` auf mind. 34 in `build.gradle` |

---

## Optionale Beschleunigung: nur eine Plattform

Wenn du nur Android schnell testen willst (schneller als iOS):
```bash
eas build --profile preview --platform android
```

Wenn du nur iOS (TestFlight) willst:
```bash
eas build --profile preview --platform ios
eas submit --profile production --platform ios  # nach erfolgreichem Build
```

---

**TL;DR:**
```bash
git clone <dein-repo> && cd vitaguide/frontend
npm i -g eas-cli && eas login && eas init && eas credentials
eas build --profile preview --platform all
```
