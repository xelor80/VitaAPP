from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import base64

from core.config import logger

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    lang: str = "de"

@router.post("/tts/generate")
async def generate_tts(req: TTSRequest):
    """Generate TTS audio from text using OpenAI TTS."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    # Truncate to 4096 chars (OpenAI TTS limit)
    text = req.text.strip()[:4096]

    try:
        from emergentintegrations.llm.openai import OpenAITextToSpeech

        api_key = os.environ.get('EMERGENT_LLM_KEY', '')
        tts = OpenAITextToSpeech(api_key=api_key)

        audio_base64 = await tts.generate_speech_base64(
            text=text,
            model="tts-1",
            voice="nova",
            response_format="mp3",
            speed=1.0
        )

        return {"audio_base64": audio_base64, "format": "mp3"}

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise HTTPException(status_code=500, detail="Audio generation failed")
