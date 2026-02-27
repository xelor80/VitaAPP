from fastapi import APIRouter, Request, HTTPException
import os
import uuid
import time
from datetime import datetime, timezone, timedelta

from core.config import db, logger
from core.helpers import parse_llm_response
from models.schemas import DiaryEntryInput

router = APIRouter()


@router.post("/diary")
async def save_diary_entry(data: DiaryEntryInput, request: Request):
    entry = {
        "date": data.date,
        "feeling": data.feeling,
        "sleep_hours": data.sleep_hours,
        "stress_level": data.stress_level,
        "water_glasses": data.water_glasses,
        "exercise_minutes": data.exercise_minutes,
        "notes": data.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.diary_entries.update_one(
        {"date": data.date}, {"$set": entry}, upsert=True
    )
    return {"status": "saved", "date": data.date}


@router.get("/diary")
async def get_diary_entries(days: int = 14):
    entries = await db.diary_entries.find(
        {}, {"_id": 0}
    ).sort("date", -1).limit(days).to_list(days)
    return entries


@router.get("/diary/trends")
async def get_diary_trends(request: Request):
    entries = await db.diary_entries.find(
        {}, {"_id": 0}
    ).sort("date", -1).limit(14).to_list(14)

    if not entries:
        return {"entries": [], "summary": "", "tips": [], "patterns": []}

    trend_prompt = "Analysiere diese Tagebuch-Einträge und gib allgemeine Lifestyle-Tipps:\n"
    for e in entries:
        trend_prompt += f"- {e['date']}: Befinden {e['feeling']}/5, Schlaf {e['sleep_hours']}h, Stress {e['stress_level']}/5, Wasser {e['water_glasses']}, Bewegung {e['exercise_minutes']}min"
        if e.get("notes"):
            trend_prompt += f", Notiz: {e['notes']}"
        trend_prompt += "\n"
    trend_prompt += "\nAntworte als JSON: {\"summary\": \"...\", \"tips\": [\"...\"], \"patterns\": [\"...\"]}"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=str(uuid.uuid4()),
            system_message="Du bist ein freundlicher Wellness-Coach. Gib nur allgemeine Lifestyle-Tipps, KEINE medizinischen Ratschläge oder Diagnosen."
        ).with_model("openai", "gpt-4o")

        t0 = time.time()
        response_text = await chat.send_message(UserMessage(text=trend_prompt))
        latency_ms = int((time.time() - t0) * 1000)
        parsed = parse_llm_response(response_text)
        llm_success = True
    except Exception as e:
        logger.error(f"Diary LLM Error: {e}")
        response_text = str(e)
        latency_ms = 0
        llm_success = False
        parsed = {
            "summary": "Trend-Analyse aktuell nicht verfügbar.",
            "tips": ["Regelmäßiger Schlaf unterstützt das Wohlbefinden.", "Ausreichend Wasser trinken."],
            "patterns": []
        }

    # Log diary LLM call
    try:
        await db.llm_responses.insert_one({
            "id": str(uuid.uuid4()), "endpoint": "diary/trends", "model": "gpt-4o",
            "prompt_version": "1.0", "lang": "de",
            "input_text": trend_prompt[:2000], "input_tags": [],
            "raw_output": response_text[:5000] if isinstance(response_text, str) else "",
            "success": llm_success, "latency_ms": latency_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception:
        pass

    return {
        "entries": entries,
        "summary": parsed.get("summary", ""),
        "tips": parsed.get("tips", []),
        "patterns": parsed.get("patterns", [])
    }
