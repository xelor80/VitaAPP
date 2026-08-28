# 09 – Datenschutz- & Security-Konzept

Gesundheitsdaten sind besondere personenbezogene Daten (DSGVO **Art. 9**). Grundsatz:
**Privacy by Design & by Default** – Datenminimierung, Zweckbindung, Verschlüsselung, strikte
Zugriffskontrolle, vollständige Nachvollziehbarkeit.

## 1. Rechtsgrundlage & Einwilligung

- Verarbeitung von Gesundheitsdaten nur mit **ausdrücklicher, granularer Einwilligung**
  (Art. 9 Abs. 2 lit. a). Getrennt von AGB-/Terms-Zustimmung.
- **Consent-Management:** jede Einwilligung mit Typ, Version, Zeitpunkt, Quelle im **Consent-Log**
  (append-only, unveränderlich). Widerruf jederzeit möglich → Verarbeitung stoppt.
- Onboarding trennt: (a) Konto/Terms, (b) Gesundheitsdaten-Verarbeitung, (c) optional Marketing/Push,
  (d) optional KI-Analyse. Ohne (b) keine Gesundheitsfunktionen.

## 2. Betroffenenrechte (in Produkt eingebaut)

| Recht | Umsetzung |
|-------|-----------|
| Auskunft/Export | `POST /me/export` → maschinenlesbares Paket (JSON) via signiertem Link |
| Löschung | `DELETE /me` → Purge-Job löscht DB-Zeilen **und** S3-Objekte, Consent-Widerruf protokolliert |
| Berichtigung | Profil/manuelle Einträge editierbar |
| Widerspruch/Widerruf | Consent widerrufbar, Push/KI abschaltbar |
| Datenübertragbarkeit | Export in offenem Format |

## 3. Datenminimierung

- Nur erheben, was die Funktion braucht (z. B. **Geburtsjahr** statt volles Geburtsdatum;
  Geschlecht nur, wo fachlich relevant).
- Affiliate erhält **keine** Gesundheitsdaten; nur pseudonyme Event-Daten.
- Analytics privacy-first, keine Gesundheitsdaten an Dritte; keine Rohwerte in Logs.

## 4. Verschlüsselung

| Ebene | Maßnahme |
|-------|----------|
| Transport | **TLS 1.2+** überall (App↔API, Admin↔API, intern) |
| At Rest (DB) | Volumenverschlüsselung; zusätzlich **Feldverschlüsselung** für besonders sensible Felder (z. B. Seriennummer, ggf. Roh-Identifikatoren) via AES-256-GCM |
| At Rest (Objektspeicher) | Server-Side-Encryption für S3/MinIO (Bilder, **EKG-Rohsignale**, Reports) |
| Secrets | Key-Management über Umgebungsvariablen/Vault; Rotationsfähigkeit; nie im Repo |
| Tokens (Client) | Keychain (iOS) / Keystore (Android) via secure storage |

## 5. Authentifizierung & Autorisierung

- Passwörter: **Argon2id**. Login-Rate-Limiting, Brute-Force-Schutz.
- **JWT Access** (kurzlebig) + **Refresh-Token-Rotation** (widerrufbar, gerätegebunden).
- **RBAC** überall serverseitig erzwungen (`resource:action`), nie nur im UI.
- **Nutzerdaten-Isolation:** jede Query auf Gesundheitsdaten filtert zwingend nach `user_id` des
  Token-Subjekts. Admin-Zugriff auf individuelle Gesundheitsdaten nur mit Sonderrolle + Audit.
- Admin-Logins: **2FA** empfohlen.

## 6. Auditierung & Protokollierung

- **Audit-Log** (unveränderlich): jeder Admin-Zugriff auf/Änderung an Nutzer- oder
  Konfigurationsdaten (wer, wann, was, Ziel).
- **Consent-Log** (append-only): Erteilung/Widerruf.
- Betriebs-Logs: strukturiert, **ohne** Gesundheitsdaten/PII; Zugriff beschränkt.

## 7. Sicherheit im Betrieb

- Eingaben strikt validieren (Zod/DTO), Ausgaben kontextsicher (kein Injection/XSS im Admin).
- Prinzip der geringsten Rechte für DB-/Storage-/Service-Accounts.
- Abhängigkeiten überwachen (Dependabot/Audit), regelmäßige Updates.
- Backups verschlüsselt; Restore getestet. Aufbewahrungsfristen definiert und durchgesetzt.
- Sicherheits-Header, CORS restriktiv, Secrets nie an Client.

## 8. Nicht-medizinische Positionierung (rechtlich zentral)

- Die App ist **kein Medizinprodukt** und stellt **keine Diagnosen**. Alle Hinweise sind
  Wellness-/Informationscharakter.
- Standardtext bei Auffälligkeiten (Auftrag Abschnitt 8):
  > „Der gemessene Wert liegt außerhalb des hinterlegten Referenzbereichs. Wiederhole die Messung
  > in Ruhe. Bei anhaltend auffälligen Werten oder Beschwerden solltest du medizinischen Rat
  > einholen.“
- KI-Antworten unterscheiden immer zwischen **Wellness-Information** und **medizinischer Beratung**.
- **Hinweis:** Ob die Kombination aus Sensorik/EKG/Warnungen in Ziel­märkten regulatorisch als
  Medizinprodukt eingestuft werden könnte, ist rechtlich zu prüfen (→ Dok. 17).

## 9. Datenresidenz & Auftragsverarbeitung

- Hosting/Datenspeicherung möglichst in der EU. Auftragsverarbeitungsverträge (AVV) mit allen
  Dienstleistern (Hosting, Push, ggf. KI). KI-Nutzung nur auf freigegebenen Daten, AVV/Zweckbindung.
