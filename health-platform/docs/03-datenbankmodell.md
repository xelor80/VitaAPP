# 03 – Datenbankmodell

Relationales Kernmodell (PostgreSQL). Hochvolumige Messwerte als Zeitreihen (TimescaleDB
Hypertables). Alle Tabellen mit `id (uuid)`, `created_at`, `updated_at`. Gesundheitsbezogene
Tabellen tragen `user_id` und werden auf Feldebene bzw. Storage-Ebene geschützt (siehe
[Dok. 09](09-datenschutz-security.md)).

## 1. Übersichts-ERD (vereinfacht)

```
users ──1:1── user_profiles
  │  ├──1:n── devices ──1:n── device_connections
  │  ├──1:n── health_measurements   (generische Zeitreihe)
  │  ├──1:n── sleep_sessions
  │  ├──1:n── activity_sessions
  │  ├──1:n── daily_health_scores
  │  ├──1:n── personal_baselines
  │  ├──1:n── health_insights
  │  ├──1:n── health_alerts
  │  ├──1:1── notification_preferences
  │  ├──1:n── push_notifications
  │  ├──1:n── consents
  │  ├──1:n── diary_entries            (Lifestyle/Tagebuch)
  │  └──1:n── affiliate_events (pseudonymisiert)

health_rules ──(referenziert)── health_alerts
articles / recipes / products ── content (admin-gepflegt)
products ──1:n── affiliate_links ──1:n── affiliate_events
recommendation_rules ──(verknüpft)── products/articles
admin_users ──1:n── audit_logs
translations (i18n)   app_config (Feature-Flags, Score-Gewichte)
```

## 2. Nutzer & Profil

**users**
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| email | citext | unique |
| password_hash | text | Argon2id |
| status | enum | `active`, `suspended`, `deleted` |
| email_verified_at | timestamptz | null bis verifiziert |
| locale | text | z. B. `de-DE` |
| country | text | ISO |
| entitlement | enum | `free`, `premium`, `premium_plus` |
| last_login_at | timestamptz | |
| deleted_at | timestamptz | Soft-Delete / DSGVO |

**user_profiles**
| Feld | Typ | Hinweise |
|------|-----|---------|
| user_id | uuid | FK, PK |
| first_name | text | |
| last_name | text | optional |
| birth_year | int | Alter statt exaktem Geburtsdatum (Datenminimierung) |
| sex | enum | `female`,`male`,`diverse`,`unspecified` – nur wo fachlich nötig |
| height_cm | numeric | optional |
| weight_kg | numeric | optional (Verlauf separat, s. u.) |
| activity_level | enum | `low`,`moderate`,`high` |
| goals | text[] | `sleep`,`move_more`,`reduce_stress`,`fitness`,`weight`,`healthier` |

## 3. Geräte

**devices**
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| user_id | uuid | FK |
| vendor | text | Hersteller |
| model | text | Modell |
| serial | text | ggf. verschlüsselt |
| firmware | text | |
| provider_key | text | welcher `WearableProvider` (z. B. `vendorX_v1`) |
| capabilities | jsonb | unterstützte Metriken laut SDK (aus Capability-Discovery, Dok. 07) |
| paired_at | timestamptz | |

**device_connections** (Verlauf/Diagnose)
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| device_id | uuid | FK |
| event | enum | `connected`,`disconnected`,`sync_ok`,`sync_error`,`ble_error` |
| battery | int | 0–100, optional |
| detail | jsonb | Diagnose (keine Gesundheitsdaten) |
| at | timestamptz | |

## 4. Messwerte (Zeitreihen)

**health_measurements** – generisches Kernmodell (Hypertable, Partition nach `time`)
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| user_id | uuid | FK, Index |
| device_id | uuid | FK, null wenn manuell |
| metric | text | `heart_rate`,`hrv`,`spo2`,`temperature`,`stress`,`steps`,`met`,`bp_systolic`,`bp_diastolic` … |
| value | double precision | |
| unit | text | `bpm`,`ms`,`%`,`°C`,`count` … |
| time | timestamptz | Messzeitpunkt (Partitionsschlüssel) |
| source | enum | `wearable`,`manual`,`healthkit`,`health_connect` |
| quality | enum | `good`,`fair`,`poor`,`unknown` |
| raw_ref | text | optional: S3-Key für Rohdaten (z. B. EKG) |
| ingest_key | text | Idempotenz (Dedup beim Sync), unique je user |

> **Spezialisierte Tabellen** bei komplexen Strukturen (statt in `value` zu pressen):
> - **blood_pressure_measurements** (systolic, diastolic, pulse, time)
> - **ecg_recordings** (user_id, device_id, duration_s, sample_rate, s3_key, classification_label?, time) – Rohsignal in S3, DB nur Metadaten
> - **sleep_sessions** (start, end, total_min, deep_min, light_min, rem_min, awake_min, latency_min, efficiency, sleep_score, regularity)
> - **activity_sessions** (type, start, end, steps, distance_m, active_kcal, avg_hr, met, source)
>
> Einfache Skalar-Metriken (HR, HRV, SpO2, Temp, Stress, Steps-Snapshots) bleiben im generischen
> Modell. So bleibt das Schema erweiterbar, ohne für jede neue Metrik zu migrieren.

**Continuous Aggregates** (TimescaleDB, materialisiert): tägliche/wöchentliche Min/Max/Avg je
`(user_id, metric)` → schnelle Charts und Baseline-Berechnung.

## 5. Ableitungen & Analytik

**personal_baselines**
| Feld | Typ | Hinweise |
|------|-----|---------|
| user_id | uuid | FK |
| metric | text | |
| window | enum | `7d`,`30d`,`90d` |
| avg | double precision | |
| stddev | double precision | |
| n | int | Anzahl Messungen im Fenster |
| computed_at | timestamptz | |
| PK | (user_id, metric, window) | |

**daily_health_scores**
| Feld | Typ | Hinweise |
|------|-----|---------|
| user_id | uuid | FK |
| date | date | |
| total | int | 0–100 |
| components | jsonb | `{sleep:88, recovery:81, stress:72, activity:79, cardio:86}` |
| explanations | jsonb | begründende Textbausteine/Referenzen |
| config_version | int | welche Gewichtung galt |
| PK | (user_id, date) | |

**health_insights** (regelbasiert generiert)
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| user_id | uuid | FK |
| type | text | z. B. `sleep_hrv_correlation` |
| period | text | Zeitraum |
| text_key | text | i18n-Key + Parameter |
| params | jsonb | z. B. `{pct: 9, threshold_h: 7}` |
| generated_at | timestamptz | |

## 6. Regeln, Warnungen, Benachrichtigungen

**health_rules** (admin-konfiguriert) – Schema-Details in [Dok. 10](10-rule-engine.md)
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| metric | text | |
| definition | jsonb | Bedingung (absolut/relativ), Dauer, Occurrences, Zeit/Kontext |
| severity | enum | `info`,`hint`,`notable`,`important` |
| notify | bool | |
| content_key | jsonb | i18n Titel/Text |
| active | bool | |
| scope | jsonb | Zielgruppe (Alter/Geschlecht/Land), optional |

**health_alerts** (ausgelöste Warnung)
| Feld | Typ | Hinweise |
|------|-----|---------|
| id | uuid | PK |
| user_id | uuid | FK |
| rule_id | uuid | FK |
| severity | enum | |
| metric | text | |
| triggered_at | timestamptz | |
| context | jsonb | Messwerte/Abweichung, die auslösten |
| acknowledged_at | timestamptz | |

**notification_preferences** (1:1 user): Kanäle & Kategorien an/aus, Ruhezeiten.
**push_notifications**: id, user_id, title_key, body_key, params, sent_at, delivered, opened_at, campaign_id?.

## 7. Content, Produkte, Affiliate

**articles**: id, slug, title, body_richtext, category, tags[], status(`draft`/`published`/`archived`), locale, published_at.
**recipes**: id, title, image, prep_time_min, kcal, protein, fat, carbs, fiber, ingredients(jsonb), steps(jsonb), servings, tags[], locale, status.
**products**: id, name, manufacturer, image, description, category, ingredients, price?, country[], locale[], active, priority, recommendation_weight, tags[].
**affiliate_links**: id, product_id, network, url, campaign.
**affiliate_events**: id, user_pseudonym, product_id, link_id, event(`click`/`conversion`), screen, source, at, revenue?. → **keine** Gesundheitsdaten, `user_pseudonym` statt `user_id`.
**recommendation_rules**: id, trigger(jsonb, z. B. „avg sleep < X“), targets(jsonb: articles/products/tips), active.

## 8. Plattform, Compliance, i18n

**consents**: id, user_id, type(`health_processing`,`terms`,`privacy`,`marketing`), version, granted, at, revoked_at, source. → **Consent-Log**, unveränderlich (append-only).
**audit_logs**: id, actor(admin_user_id/system), action, target_type, target_id, meta(jsonb), at. → Admin-Zugriffe auf Nutzerdaten protokollieren.
**admin_users**: id, email, password_hash, roles[], last_login_at, status.
**translations**: key, locale, value → alle UI-Texte datengetrieben.
**app_config**: key, value(jsonb), version → Score-Gewichte, Feature-Flags, Tagesziel-Defaults.
**diary_entries** (Lifestyle, Dok. 14/15): user_id, date, fields(jsonb: mood, energy, alcohol, caffeine, training, illness, meds, supplements, weight, water).

## 9. Indizes & Aufbewahrung

- `health_measurements`: Index `(user_id, metric, time desc)`; Hypertable-Chunks nach Zeit.
- Aufbewahrungsrichtlinie konfigurierbar (Roh-Rohdaten ggf. kürzer als Aggregate).
- Alle Löschungen DSGVO-fähig: harter Purge-Job je `user_id` (inkl. S3-Objekte) bei Account-Löschung.
