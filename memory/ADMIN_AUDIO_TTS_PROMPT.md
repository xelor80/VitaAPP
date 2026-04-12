# VitaGuide Admin Dashboard – Audio & TTS Verwaltung

## KONTEXT

Die VitaGuide+ App hat ein Audio-System fuer gefuehrte Entspannungsuebungen. Dieses besteht aus:

1. **ElevenLabs TTS Voice Guidance** – Gesprochene Anleitungen waehrend Atemuebungen
2. **Web Audio API Ambient Sounds** – Programmatisch generierte Hintergrundklaenge
3. **Completion/UI Sounds** – Abschluss-Chime und Start-Sound

Der Admin soll ueber das Dashboard folgendes steuern koennen:
- Voice-Clips verwalten (anhoeren, loeschen, neu generieren, Texte aendern)
- ElevenLabs Voice-Einstellungen aendern (Stimme, Stabilitaet, Stil)
- Voice-Texte bearbeiten (Intro, Atem-Phasen, Midpoint, Outro)
- Ambient-Sound Parameter konfigurieren

**Backend-URL:** Dieselbe API wie die App (alle Endpoints mit Prefix `/api/`)
**Admin-Passwort:** `X-Admin-Password: Wk220480xel!`
**Datenbank:** MongoDB Atlas, DB-Name: `test_database`
**ElevenLabs API Key:** Bereits in Backend `.env` als `ELEVENLABS_API_KEY`

---

## 1. DATENBANK-STRUKTUR

### Collection: `tts_cache`

Enthaelt alle generierten Voice-Clips. Aktuell 34 Eintraege (17 DE + 17 IT).

```json
{
  "cache_key": "44ede18beb2033a08525ada787d07f58",  // MD5 von text+lang+voice_id
  "text": "Finde eine bequeme Position.",              // Der gesprochene Text
  "lang": "de",                                        // Sprache: "de" oder "it"
  "voice_id": "pFZP5JQG7iQjIQuC4Bku",               // ElevenLabs Voice ID (aktuell: Lily)
  "audio_b64": "//PkxABdDDnZV1nAAAPG...",            // Base64-kodiertes MP3 Audio
  "size_bytes": 31391,                                 // Dateigroesse in Bytes
  "created_at": "2026-04-12T12:10:11.702099+00:00"
}
```

**Cache-Key Berechnung:**
```python
cache_key = hashlib.md5(f"{text}_{lang}_{voice_id or ''}".encode()).hexdigest()
```

### Aktuelle Voice-Clips (34 Stueck):

**Deutsche Clips (17):**

| Kategorie | Text | Verwendung |
|-----------|------|------------|
| Intro 1 | "Finde eine bequeme Position." | Vor der Uebung, 1. Satz |
| Intro 2 | "Schliesse die Augen, wenn du moechtest." | Vor der Uebung, 2. Satz |
| Intro 3 | "Wir beginnen gleich." | Vor der Uebung, 3. Satz |
| Einatmen 1 | "Atme langsam ein..." | Waehrend Atem-Einatmen Phase |
| Einatmen 2 | "Einatmen..." | Waehrend Atem-Einatmen Phase (Variante) |
| Einatmen 3 | "Tief einatmen..." | Waehrend Atem-Einatmen Phase (Variante) |
| Halten 1 | "Halte..." | Waehrend Atem-Halten Phase |
| Halten 2 | "Halten..." | Waehrend Atem-Halten Phase (Variante) |
| Halten 3 | "Sanft halten..." | Waehrend Atem-Halten Phase (Variante) |
| Ausatmen 1 | "Langsam ausatmen..." | Waehrend Atem-Ausatmen Phase |
| Ausatmen 2 | "Ausatmen..." | Waehrend Atem-Ausatmen Phase (Variante) |
| Ausatmen 3 | "Loslassen..." | Waehrend Atem-Ausatmen Phase (Variante) |
| Midpoint 1 | "Du machst das gut." | Ermutigung nach 3 Atemzyklen |
| Midpoint 2 | "Spuere die Ruhe." | Ermutigung nach 3 Atemzyklen (Variante) |
| Outro 1 | "Gut gemacht." | Nach der Uebung, 1. Satz |
| Outro 2 | "Komm langsam zurueck." | Nach der Uebung, 2. Satz |
| Outro 3 | "Oeffne die Augen, wenn du bereit bist." | Nach der Uebung, 3. Satz |

**Italienische Clips (17):** Identische Struktur, uebersetzt.

---

## 2. BESTEHENDE API ENDPOINTS

### TTS Generierung

```
POST /api/tts/generate
Body: { "text": "Atme langsam ein...", "lang": "de", "voice_id": "optional" }
Response: { "audio_b64": "...", "cached": true/false, "cache_key": "..." }
```
- Prueft zuerst den Cache (tts_cache Collection)
- Generiert ueber ElevenLabs falls nicht gecacht
- Speichert im Cache fuer zukuenftige Aufrufe

### Audio Streaming

```
GET /api/tts/audio/{cache_key}
Response: MP3 Audio Stream (Content-Type: audio/mpeg)
```
- Streamt gecachtes Audio direkt als MP3
- **Wichtig fuer Admin:** Damit kann der Admin die Clips direkt im Browser anhoeren!

### Pre-Generierung aller Clips

```
POST /api/tts/pregenerate-stress?lang=de
Response: { "generated": 17, "skipped": 0, "total": 17, "lang": "de" }
```
- Generiert alle Voice-Clips einer Sprache auf einmal
- Ueberspringt bereits gecachte Clips

---

## 3. ELEVENLABS KONFIGURATION

### Aktuelle Einstellungen (hardcoded in `/app/backend/routes/tts_elevenlabs.py`):

```python
VOICE_MAP = {
    "de": "pFZP5JQG7iQjIQuC4Bku",   # Lily (calm female, multilingual)
    "it": "pFZP5JQG7iQjIQuC4Bku",   # Gleiche Stimme, multilingual model
}

# Voice Settings:
VoiceSettings(
    stability=0.75,          # 0-1: Hoeher = konsistenter, niedriger = expressiver
    similarity_boost=0.6,    # 0-1: Aehnlichkeit zur Originalstimme
    style=0.15,              # 0-1: Stil-Expressivitaet (niedrig = neutral)
    use_speaker_boost=False, # Kein Speaker Boost (ruhiger Ton)
)

model_id = "eleven_multilingual_v2"  # Multilingual Model fuer DE+IT
```

### Verfuegbare ElevenLabs Stimmen (Auswahl):

| Voice ID | Name | Beschreibung |
|----------|------|-------------|
| pFZP5JQG7iQjIQuC4Bku | Lily | Calm female, warm (AKTUELL) |
| EXAVITQu4vr4xnSDxMaL | Sarah | Soft, professional female |
| IKne3meq5aSn9XLyUdCD | Charlie | Casual male |
| TX3LPaxmHKxFdv7VOQHJ | Liam | Male, articulate |
| nPczCjzI2devNBz1zQrb | Brian | Deep male, calm |
| XB0fDUnXU5powFXDhCwa | Charlotte | Elegant female |

**Hinweis:** Die vollstaendige Stimmliste kann ueber die ElevenLabs API abgefragt werden:
```
GET https://api.elevenlabs.io/v1/voices
Headers: xi-api-key: {ELEVENLABS_API_KEY}
```

---

## 4. WAS DER ADMIN STEUERN SOLL

### A. Voice-Clip Verwaltung (CRUD)

**Tabelle aller Clips:**
- Text, Sprache, Voice, Groesse, Erstellungsdatum
- Play-Button (streamt ueber `/api/tts/audio/{cache_key}`)
- Loeschen-Button (entfernt aus tts_cache)
- Neu-generieren Button (loescht alten + generiert neu)

**Fehlender Admin Endpoint (muss erstellt werden):**
```
GET  /api/admin/tts/clips                     – Alle Clips auflisten (ohne audio_b64, nur Metadaten)
DELETE /api/admin/tts/clips/{cache_key}        – Clip loeschen
POST /api/admin/tts/clips/regenerate/{cache_key} – Clip loeschen + neu generieren
DELETE /api/admin/tts/clips/all                – Alle Clips loeschen (z.B. bei Stimmwechsel)
```

### B. Voice-Texte bearbeiten

Der Admin soll die Texte aendern koennen, die als Sprachanleitung verwendet werden.

**Aktuelle Texte sind hardcoded in:**
- Backend: `/app/backend/routes/tts_elevenlabs.py` (pregenerate Funktion)
- Frontend: `/app/frontend/src/services/StressAudioService.ts` (VOICE_TEXTS Objekt)

**Loesung: In Datenbank auslagern!**

Neue Collection: `voice_guidance_texts`

```json
{
  "lang": "de",
  "category": "intro",          // intro, inhale, hold, exhale, midpoint, outro
  "index": 0,                   // Reihenfolge innerhalb der Kategorie
  "text": "Finde eine bequeme Position.",
  "duration_ms": 3000,          // Wie lange der Text angezeigt wird
  "active": true                // Kann deaktiviert werden
}
```

**Fehlende Admin Endpoints (muessen erstellt werden):**
```
GET    /api/admin/voice-texts?lang=de        – Alle Texte einer Sprache
PUT    /api/admin/voice-texts/{id}           – Text bearbeiten
POST   /api/admin/voice-texts                – Neuen Text hinzufuegen
DELETE /api/admin/voice-texts/{id}           – Text loeschen
POST   /api/admin/voice-texts/regenerate-all?lang=de – Alle Clips fuer geaenderte Texte neu generieren
```

**Admin-Workflow bei Textaenderung:**
1. Admin aendert Text in der Tabelle
2. Klickt "Neu generieren"
3. Alter Clip wird geloescht, neuer generiert
4. Frontend laedt beim naechsten Start den neuen Clip

### C. ElevenLabs Einstellungen

Der Admin soll steuern koennen:

**Voice auswaeHlen:**
- Dropdown mit verfuegbaren Stimmen
- Vorhoer-Funktion (kurzen Testtext generieren)

**Voice Settings:**
- Stability Slider (0-1)
- Similarity Boost Slider (0-1)
- Style Slider (0-1)
- Speaker Boost Toggle

**Loesung: In Datenbank speichern!**

Neue Collection: `tts_settings`

```json
{
  "id": "global",
  "voice_id_de": "pFZP5JQG7iQjIQuC4Bku",
  "voice_id_it": "pFZP5JQG7iQjIQuC4Bku",
  "model_id": "eleven_multilingual_v2",
  "stability": 0.75,
  "similarity_boost": 0.6,
  "style": 0.15,
  "use_speaker_boost": false,
  "updated_at": "2026-04-12T..."
}
```

**Fehlende Admin Endpoints:**
```
GET  /api/admin/tts/settings                – Aktuelle TTS-Einstellungen
PUT  /api/admin/tts/settings                – Einstellungen aktualisieren
POST /api/admin/tts/test-voice              – Test-Clip mit aktuellen Settings generieren
GET  /api/admin/tts/available-voices        – Liste aller ElevenLabs Stimmen
```

### D. Ambient-Sound Konfiguration

Der Ambient Sound wird aktuell programmatisch via Web Audio API generiert.

**Parameter die der Admin steuern koennte:**

Neue Collection: `ambient_settings`

```json
{
  "id": "global",
  "noise_filter_freq": 400,      // Tiefpass-Frequenz fuer Rauschen (200-800 Hz)
  "noise_volume": 0.7,           // Rausch-Lautstaerke (0-1)
  "drone_frequencies": [65, 98, 131],  // Drone-Toene (Hz)
  "drone_volume": 0.04,          // Drone-Lautstaerke (0-1)
  "lfo_speed": 0.08,             // LFO-Geschwindigkeit (Hz, 0.02-0.2)
  "lfo_depth": 150,              // LFO-Modulationstiefe (50-300)
  "fade_duration_ms": 2000,      // Fade-In/Out Dauer
  "updated_at": "2026-04-12T..."
}
```

**Fehlende Admin Endpoints:**
```
GET  /api/admin/ambient/settings         – Aktuelle Ambient-Einstellungen
PUT  /api/admin/ambient/settings         – Einstellungen aktualisieren
```

**Frontend-Anpassung noetig:** Die App muss beim Start die Ambient-Settings vom Server laden statt Hardcoded-Werte zu verwenden.

---

## 5. ADMIN UI STRUKTUR

### Neue Seite: "Audio & Stimmen"

**Tab 1: Voice-Clips**
- Tabelle mit allen 34 Clips
- Spalten: Sprache | Kategorie | Text | Groesse | Datum | Play | Aktionen
- Filter: nach Sprache (DE/IT), nach Kategorie (intro/inhale/hold/exhale/midpoint/outro)
- Bulk-Aktionen: "Alle loeschen", "Alle neu generieren"
- Play-Button nutzt: `<audio src="/api/tts/audio/{cache_key}" />`

**Tab 2: Voice-Texte**
- Editierbare Tabelle mit allen Anleitungstexten
- Gruppiert nach Kategorie (Intro, Einatmen, Halten, Ausatmen, Midpoint, Outro)
- Inline-Bearbeitung der Texte
- "Vorhoeren" Button (generiert Clip mit aktuellem Text)
- "Speichern & Neu generieren" Button

**Tab 3: Stimm-Einstellungen**
- Voice-Auswahl Dropdown (mit Vorhoer-Funktion)
- Slider fuer: Stability, Similarity Boost, Style
- Toggle fuer Speaker Boost
- "Test-Clip generieren" Button
- "Alle Clips mit neuer Stimme regenerieren" Button (Achtung: generiert 34 Clips neu!)

**Tab 4: Ambient-Sound**
- Slider fuer: Noise-Frequenz, Noise-Volume, Drone-Volume, LFO-Speed
- Frequenz-Eingabefelder fuer Drone-Toene
- "Vorhoeren" Button (oeffnet Player mit aktuellen Settings)
- Fade-Duration Einstellung

---

## 6. AUDIO SESSION FLOW (Referenz)

So werden die Clips in der App abgespielt:

```
1. Nutzer klickt "Uebung starten"
   → UI Start Sound (Web Audio: 440→523 Hz Glissando)
   → Ambient startet (Fade-In 2s)

2. INTRO Phase (3 Clips nacheinander):
   → "Finde eine bequeme Position."     [3s Pause]
   → "Schliesse die Augen, wenn du moechtest."  [3s Pause]
   → "Wir beginnen gleich."             [2s Pause]

3. ACTIVE Phase (Atemzyklus, wiederholt):
   → "Atme langsam ein..."    [waehrend Einatmen, 4s]
   → "Halte..."               [waehrend Halten, 7s]
   → "Langsam ausatmen..."    [waehrend Ausatmen, 8s]
   (nach 3 Zyklen: Midpoint "Du machst das gut.")
   (Varianten rotieren: "Einatmen...", "Tief einatmen..." etc.)

4. OUTRO Phase (3 Clips nacheinander):
   → Completion Chime (Web Audio: C5-E5-G5 Major Akkord)
   → "Gut gemacht."                     [3s Pause]
   → "Komm langsam zurueck."            [3s Pause]
   → "Oeffne die Augen, wenn du bereit bist."  [3s Pause]
   → Ambient stoppt (Fade-Out 2s)
```

---

## 7. VERKNUEPFUNGEN

```
tts_cache.cache_key      ←→  Frontend fetcht Audio via /api/tts/audio/{cache_key}
tts_cache.voice_id       ←→  ElevenLabs Voice ID
tts_cache.text           ←→  voice_guidance_texts.text (nach Migration)
tts_settings.voice_id_*  ←→  ElevenLabs Voice ID
stress_exercises         ←→  Welche Uebungen die Audio-Clips verwenden
```

---

## 8. PRIORITAET

1. **Hoch**: Voice-Clips Tabelle mit Play/Delete (liest nur tts_cache)
2. **Hoch**: Stimm-Einstellungen (Voice wechseln, Settings aendern)
3. **Mittel**: Voice-Texte bearbeitbar machen (neue Collection + CRUD)
4. **Mittel**: "Alle regenerieren" Funktion nach Stimmwechsel
5. **Niedrig**: Ambient-Sound Parameter konfigurierbar machen

---

## 9. WICHTIGE HINWEISE

- **ElevenLabs API Key** ist bereits im Backend konfiguriert (`.env`). Der Admin braucht keinen eigenen Key.
- **Base64 Audio** in der DB ist gross (~20-40 KB pro Clip). Die Admin-Tabelle sollte NICHT `audio_b64` laden, sondern nur Metadaten. Audio nur ueber den Streaming-Endpoint `/api/tts/audio/{cache_key}` abspielen.
- **Cache-Invalidierung**: Wenn der Admin einen Text aendert oder die Stimme wechselt, muss der alte Cache-Eintrag geloescht und ein neuer generiert werden.
- **Kosten**: Jede Generierung kostet ElevenLabs Credits. Bei 34 Clips (17 DE + 17 IT) mit kurzen Texten ist der Verbrauch minimal. Aber "Alle regenerieren" sollte eine Bestaetigung erfordern.
- **Frontend-Sync**: Das Frontend laedt Clips on-demand via `/api/tts/generate` (cached). Nach einer Admin-Aenderung sind neue Clips sofort verfuegbar.
