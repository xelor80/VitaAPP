from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import base64
import hashlib
import os

from core.config import db, logger

router = APIRouter(prefix="/tts", tags=["tts-elevenlabs"])

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")

# Calm, warm voices for meditation
# ElevenLabs multilingual voices
VOICE_MAP = {
    "de": "pFZP5JQG7iQjIQuC4Bku",   # Lily (calm female)
    "it": "pFZP5JQG7iQjIQuC4Bku",   # same voice, multilingual model handles language
}


class TTSRequest(BaseModel):
    text: str
    lang: str = "de"
    voice_id: Optional[str] = None


@router.post("/generate")
async def generate_tts(req: TTSRequest):
    """Generate TTS audio. Returns cached version if available."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    cache_key = hashlib.md5(f"{req.text}_{req.lang}_{req.voice_id or ''}".encode()).hexdigest()

    # Check cache
    cached = await db.tts_cache.find_one({"cache_key": cache_key}, {"_id": 0})
    if cached:
        return {"audio_b64": cached["audio_b64"], "cached": True, "cache_key": cache_key}

    # Generate via ElevenLabs
    try:
        from elevenlabs import ElevenLabs
        from elevenlabs import VoiceSettings

        client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        voice_id = req.voice_id or VOICE_MAP.get(req.lang, VOICE_MAP["de"])

        audio_generator = client.text_to_speech.convert(
            text=req.text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            voice_settings=VoiceSettings(
                stability=0.75,
                similarity_boost=0.6,
                style=0.15,
                use_speaker_boost=False,
            ),
        )

        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk

        audio_b64 = base64.b64encode(audio_data).decode()

        # Cache in DB
        await db.tts_cache.insert_one({
            "cache_key": cache_key,
            "text": req.text,
            "lang": req.lang,
            "voice_id": voice_id,
            "audio_b64": audio_b64,
            "size_bytes": len(audio_data),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

        return {"audio_b64": audio_b64, "cached": False, "cache_key": cache_key}

    except Exception as e:
        logger.error(f"ElevenLabs TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


@router.get("/audio/{cache_key}")
async def get_cached_audio(cache_key: str):
    """Stream cached audio as MP3."""
    cached = await db.tts_cache.find_one({"cache_key": cache_key}, {"_id": 0})
    if not cached:
        raise HTTPException(status_code=404, detail="Audio not found")
    audio_bytes = base64.b64decode(cached["audio_b64"])
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/pregenerate-stress")
async def pregenerate_stress_voices(lang: str = "de"):
    """Pre-generate all voice guidance texts for stress exercises."""
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")

    texts = {
        "de": [
            "Finde eine bequeme Position.",
            "Schliesse die Augen, wenn du moechtest.",
            "Wir beginnen gleich.",
            "Atme langsam ein...",
            "Einatmen...",
            "Tief einatmen...",
            "Halte...",
            "Halten...",
            "Sanft halten...",
            "Langsam ausatmen...",
            "Ausatmen...",
            "Loslassen...",
            "Du machst das gut.",
            "Spuere die Ruhe.",
            "Gut gemacht.",
            "Komm langsam zurueck.",
            "Oeffne die Augen, wenn du bereit bist.",
        ],
        "it": [
            "Trova una posizione comoda.",
            "Chiudi gli occhi, se vuoi.",
            "Cominciamo.",
            "Inspira lentamente...",
            "Inspira...",
            "Inspira profondamente...",
            "Trattieni...",
            "Mantieni...",
            "Dolcemente trattieni...",
            "Espira lentamente...",
            "Espira...",
            "Lascia andare...",
            "Stai andando bene.",
            "Senti la calma.",
            "Ben fatto.",
            "Torna lentamente.",
            "Apri gli occhi quando sei pronto.",
        ],
    }

    target_texts = texts.get(lang, texts["de"])
    generated = 0
    skipped = 0

    for text in target_texts:
        cache_key = hashlib.md5(f"{text}_{lang}_".encode()).hexdigest()
        existing = await db.tts_cache.find_one({"cache_key": cache_key})
        if existing:
            skipped += 1
            continue

        try:
            from elevenlabs import ElevenLabs
            from elevenlabs import VoiceSettings

            client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
            voice_id = VOICE_MAP.get(lang, VOICE_MAP["de"])

            audio_generator = client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                voice_settings=VoiceSettings(
                    stability=0.75,
                    similarity_boost=0.6,
                    style=0.15,
                    use_speaker_boost=False,
                ),
            )

            audio_data = b""
            for chunk in audio_generator:
                audio_data += chunk

            audio_b64 = base64.b64encode(audio_data).decode()

            await db.tts_cache.insert_one({
                "cache_key": cache_key,
                "text": text,
                "lang": lang,
                "voice_id": voice_id,
                "audio_b64": audio_b64,
                "size_bytes": len(audio_data),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            generated += 1
        except Exception as e:
            logger.error(f"TTS pregenerate error for '{text}': {e}")

    return {"generated": generated, "skipped": skipped, "total": len(target_texts), "lang": lang}
