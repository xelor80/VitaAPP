# 17 – Risiken & technische offene Fragen

Ehrliche Auflistung der Punkte, die Erfolg oder Aufwand am stärksten beeinflussen. Viele hängen an
der **SDK** (→ [Dok. 18](18-sdk-informationsbedarf.md)) und an **rechtlichen** Fragen.

## 1. Größte Risiken

| # | Risiko | Auswirkung | Minderung |
|---|--------|-----------|-----------|
| R1 | **SDK-Reife/Doku unzureichend** (China-Hersteller) | Integration blockiert/aufwändig | Frühe Analyse + Beispielprojekt; HAL kapselt; PoC vor Zusagen |
| R2 | **iOS-Background-Sync stark limitiert** | „Dauer-Sync“ nicht wie erwartet | Ehrliche UX („App öffnen zum Sync“); nutzen, was OS/SDK erlauben |
| R3 | **Regulatorik (Medizinprodukt?)** | Rechtliche/Marktzulassungs-Risiken (v. a. EKG/Blutdruck/Warnungen) | Rechtsberatung früh; klare Wellness-Positionierung; Disclaimer; ggf. Features gaten |
| R4 | **Messgenauigkeit der Hardware** | Falsche Warnungen, Vertrauensverlust | Herstellerangaben dokumentieren; Qualitätsflag; konservative Regeln |
| R5 | **DSGVO Art. 9** | Bußgeld-/Reputationsrisiko | Privacy by Design (Dok. 09), AVV, EU-Hosting, Consent-Log |
| R6 | **Fake-Werte-Verbot vs. „leere“ App** | App wirkt anfangs leer | Ehrliche Leerzustände + gutes Onboarding, keine Simulation |
| R7 | **Zeitreihen-Datenvolumen** | DB-Last/Kosten | TimescaleDB + Aggregate + Retention; früh Lasttests |
| R8 | **Push-Payload-Datenschutz** | sensible Daten in Notifications | neutrale Payloads, Details in App |
| R9 | **App-Store-Review** (Gesundheits-Apps streng) | Ablehnung/Verzögerung | Richtlinien früh prüfen, Consent/Disclaimer sauber |
| R10 | **SDK-Lizenz/Weitergabe** | rechtliche Nutzungsgrenzen | Lizenzbedingungen prüfen (Dok. 18) |
| R11 | **Zeitbasis/Uhr-Drift des Geräts** | falsche Zeitstempel, Dedup-Fehler | Zeit normalisieren, Serverzeit-Abgleich |
| R12 | **Mehrsprachigkeit medizinischer Texte** | Fehlübersetzungen bei sensiblen Hinweisen | Review sensibler i18n-Texte, Versionierung |

## 2. Offene technische Fragen (klären vor/mit Umsetzung)

**SDK / Gerät** (Details Dok. 18)
- Welche Metriken liefert das/die konkrete(n) Gerät(e) real? Echtzeit oder nur Historie?
- iOS- **und** Android-Parität? Native `.framework`/`.aar` oder fertige Flutter/RN-Bindings?
- Background-Sync-Fähigkeit? Firmware-Update-Weg? Batterie-Events?
- Rohdaten (EKG-Sample-Rate/Format)? Zeitbasis (UTC/lokal)? Geräte-Identifikation?
- Herstellerangaben zur Messgenauigkeit? Callback-/Event-Struktur?

**Produkt / Fachlich**
- Health-Score im MVP zeigen oder erst Phase 2? (Empfehlung: erst mit belastbarer Baseline.)
- Konkrete Referenzbereiche/Grenzwerte je Metrik (medizinisch geprüft) – Quelle?
- Zielmärkte/-sprachen zum Start (beeinflusst Recht + i18n)?
- Projekt-/Markenname und Domain: **geklärt → VitaGuide / vitaguide.app** (reserviert).

**Rechtlich / Compliance**
- Einstufung als Medizinprodukt in Zielmärkten? (EKG/Blutdruck/Warnsystem prüfen.)
- Datenstandort-Anforderungen? KI-Verarbeitung erlaubt/gewünscht?
- Impressum/Datenschutzerklärung/AGB – wer erstellt (Recht)?

**Betrieb**
- Hosting-Umgebung (EU-VPS/Cloud)? Bestehende Infrastruktur nutzbar?
- Backup-/Aufbewahrungsfristen für Gesundheitsdaten?

## 3. Annahmen (bis anders geklärt)

- Flutter als Mobile-Framework (Revision falls SDK nur RN-Bindings bietet).
- Ein primäres Gerät/Provider zum Start; Multi-Vendor über Registry vorbereitet.
- EU-Hosting, deutscher Erststart, Deutsch + Englisch.
- Wellness-Positionierung, kein Medizinprodukt (vorbehaltlich Rechtsprüfung).

## 4. Empfohlene Reihenfolge zur Risikoreduktion

1. SDK-Unterlagen sichten → **SDK-Mapping-Doku** (Dok. 07-Vorlage füllen).
2. **PoC**: Pairing + ein realer Metrik-Sync auf iOS **und** Android.
3. Rechtscheck (Medizinprodukt/DSGVO) parallel.
4. Erst dann MVP-Feature-Ausbau gemäß Dok. 14.
