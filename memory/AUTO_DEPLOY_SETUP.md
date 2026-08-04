# 🤖 Automatisches Deployment ohne Konsole

Ab jetzt: **Save-to-Github in Emergent → GitHub Actions läuft → EAS baut → Downloads landen im Expo-Dashboard.** Ganz ohne Terminal.

---

## Setup (einmalig, ~3 Min)

### 1. Expo-Access-Token generieren
1. Öffne https://expo.dev/settings/access-tokens
2. **Create Token** klicken
3. Name: `github-actions-vitaguide`
4. Expiration: **Never** (oder 1 Jahr)
5. **Copy** — den Token nur EINMAL zeigt Expo an, sofort kopieren!

### 2. Token als GitHub-Secret speichern
1. Öffne dein GitHub-Repo: `https://github.com/<dein-user>/<repo>`
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** klicken
4. Name: **`EXPO_TOKEN`**
5. Value: den vorher kopierten Token einfügen
6. **Add secret**

### 3. (Optional) Repo-Variable für schönere Logs
Im selben Menü:
1. Tab **Variables** → **New repository variable**
2. Name: **`EXPO_ACCOUNT`**
3. Value: dein Expo-Username (z.B. `waldemar`)

### 4. Zwei Workflow-Dateien sind bereits committed:

```
.github/workflows/
├── eas-build.yml    → Full Native-Build bei Native-Änderungen
└── eas-update.yml   → OTA-Update bei reinen JS-Änderungen
```

Beide werden von GitHub automatisch erkannt und aktiviert, sobald sie auf `main` liegen.

---

## Was passiert dann bei welcher Änderung?

| Du änderst … | Trigger | Ergebnis |
|---|---|---|
| `frontend/app/*.tsx`, `frontend/src/*.ts` | **eas-update.yml** | ⚡ OTA-Push in ~30 Sek → alle User bekommen Update beim nächsten App-Start |
| `frontend/plugins/**` (Native SDK-Files) | **eas-build.yml** | 🔨 Full Rebuild ~20 Min → neue APK/IPA im Expo-Dashboard |
| `frontend/app.json`, `frontend/eas.json` | **eas-build.yml** | 🔨 Full Rebuild |
| `frontend/package.json` | **eas-build.yml** | 🔨 Full Rebuild |
| `backend/**` | Keiner | Backend deployt Emergent separat |

---

## Workflow manuell auslösen

Falls du zwischendrin einen Build willst ohne Code-Änderung:

1. GitHub-Repo → Tab **Actions**
2. Links: **EAS Build & Auto-Deploy** wählen
3. Rechts oben: **Run workflow** klicken
4. Platform + Profile wählen (default = all + preview)
5. **Run workflow** → läuft in 30 Sek an

Dasselbe für **EAS Update** — auch dort kannst du manuell einen OTA-Push machen und deine Update-Message eingeben.

---

## Wo landen die Downloads?

Nach ~20 Min Build:
1. **Expo-Dashboard**: https://expo.dev/accounts/`<dein-user>`/projects/vitaguide/builds
2. Jeder Build hat einen **QR-Code** — den kannst du direkt mit dem Handy scannen
3. Optional: Expo verschickt eine Email an dich mit den Links
4. Optional: Du kannst Expo auch mit Slack/Discord verbinden (Dashboard → Notifications)

---

## Alternative: EAS's eingebaute GitHub-Integration (noch einfacher!)

Falls du GARKEIN YAML willst und alles im Browser klicken willst:

1. Öffne https://expo.dev/accounts/`<dein-user>`/projects/vitaguide
2. Menü links: **Configuration → GitHub**
3. **Connect GitHub repository** klicken
4. Repo auswählen, Autorisierung bestätigen
5. **Set up Build Triggers** klicken
6. **On push to `main` → Profile `preview` → Platform `all`** speichern

Fertig — kein Workflow-File, kein Secret, kein GitHub-Actions. EAS macht alles selbst.

**Nachteil**: Weniger Kontrolle (kein Path-Filter, kein OTA-Trigger separat).

---

## Empfehlung

**Für dich:** Mach zuerst die **EAS-GitHub-Integration** (5 Klicks im Browser).
Wenn du merkst du brauchst mehr Kontrolle (z.B. OTA-Updates nur bei JS-Änderungen), aktiviere dann die GitHub-Actions-Workflows dazu — sie sind ja schon eingecheckt und warten nur auf den `EXPO_TOKEN`-Secret.

Beide Systeme können parallel laufen — GitHub Actions triggert manuell/über Path-Filter, EAS-Integration triggert bei jedem Push.

---

## Was ist mit iOS-Zertifikaten?

Beim allerersten Build musst du **einmal manuell** durch `eas credentials` (siehe frühere Anleitung) — Zertifikate werden dann in **EAS-Cloud gespeichert** und automatisch für alle zukünftigen Builds verwendet. Danach: reine Automatisierung.

Falls das Zertifikat mal abläuft (Apple: nach 1 Jahr), zeigt EAS eine Warnung — dann einmal `eas credentials` neu, danach läuft die Automatisierung wieder.
