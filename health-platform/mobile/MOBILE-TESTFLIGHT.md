# VitaGuide aufs iPhone – TestFlight über Codemagic (ohne Mac)

Diese Anleitung bringt das **Flutter-UI-Gerüst** über die Cloud-CI **Codemagic**
nach **TestFlight** auf dein iPhone. Kein eigener Mac nötig. Die Pipeline liegt
im Repo-Root: [`codemagic.yaml`](../../codemagic.yaml).

> **Was du bekommst:** die App startet, Theme (Light/Dark), Tab-Navigation
> (Heute · Trends · Coach · Entdecken · Profil), ehrliche Leerzustände
> („Noch keine Daten vorhanden."). **Noch keine echten Messwerte** – die
> kommen mit der Veepoo-SDK-Anbindung. Es ist ein **Design-/Navigations-Test**.

---

## Schritt 1 – App-Store-Connect-API-Key erstellen (bei Apple)

1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access**
   → Reiter **Integrations** → **App Store Connect API**.
2. **Team Keys** → **+** → Name z. B. `Codemagic`, Rolle **App Manager**
   (oder Admin) → **Generate**.
3. Notiere dir:
   - **Issuer ID** (oben auf der Seite, UUID)
   - **Key ID** (in der Zeile des neuen Keys)
   - Lade die **`.p8`-Datei** herunter (**nur einmal möglich!** sicher ablegen).

Ein passender App-Eintrag wird beim ersten Build automatisch angelegt
(Bundle-ID `app.vitaguide.mobile`). Du kannst ihn auch vorab unter
**Apps → +** manuell anlegen (Name „VitaGuide", Bundle-ID `app.vitaguide.mobile`).

## Schritt 2 – Codemagic einrichten

1. Auf [codemagic.io](https://codemagic.io) mit **GitHub** anmelden.
2. **Add application** → Repository **`xelor80/VitaAPP`** verbinden →
   Projekttyp **Flutter**. (Codemagic nutzt automatisch die `codemagic.yaml`.)
3. **Team-Integration für den API-Key** anlegen: Zahnrad **Teams / Settings**
   → **Integrations** → **App Store Connect** → **Add key**:
   - **Name: `VitaGuide ASC Key`**  ← muss exakt so heißen (die Pipeline
     verweist darauf).
   - Issuer ID, Key ID und die `.p8`-Datei aus Schritt 1 eintragen.

## Schritt 3 – Build starten

1. In Codemagic beim Projekt **Start new build**.
2. Branch **`claude/health-fitness-platform-7u4jsn`**, Workflow
   **„VitaGuide iOS → TestFlight"** wählen → **Start**.
3. Der Build (~10–15 Min) baut die IPA und lädt sie zu TestFlight hoch.

## Schritt 4 – Auf dem iPhone testen

1. In **App Store Connect → Apps → VitaGuide → TestFlight** kann es einige
   Minuten „Processing" anzeigen.
2. Dich als **internen Tester** hinzufügen (deine Apple-ID unter **Users and
   Access** muss der App zugeordnet sein → interne Gruppe).
3. **TestFlight-App** aus dem App Store aufs iPhone laden → mit deiner Apple-ID
   anmelden → VitaGuide erscheint → installieren.

---

## Fehlerbehebung

- **Erster Build ist eine Inbetriebnahme.** Da das Mobile-Projekt bisher nie
  gebaut wurde, kann der erste Lauf eine Kleinigkeit brauchen (z. B. iOS-
  Mindestversion, ein Paket). Schick mir das Build-Log, ich passe die Pipeline
  an.
- **„No matching profiles"** o. ä.: prüfen, dass die Integration exakt
  `VitaGuide ASC Key` heißt und der Key die Rolle App Manager/Admin hat.
- **Android zum Vergleich:** Workflow **„VitaGuide Android APK (Test)"** baut
  eine installierbare Debug-APK als Artefakt – kein Mac/Account nötig.

## Später (wenn die App reift)

- `ios/`- und `android/`-Ordner **einchecken** (statt sie im Build zu erzeugen),
  damit App-Icon, Anzeigename und – wichtig für die Bandkopplung – die
  **BLE-Berechtigungstexte** in der `Info.plist` versioniert sind
  (`NSBluetoothAlwaysUsageDescription`).
- Signing dann klassisch über die eingecheckten Projektdateien.
