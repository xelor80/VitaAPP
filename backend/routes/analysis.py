from fastapi import APIRouter, Request, HTTPException
import os
import uuid
import time
from datetime import datetime, timezone

from core.config import db, logger
from core.helpers import check_rate_limit, parse_llm_response
from models.schemas import SymptomInput
from data.prompts import get_system_prompt

router = APIRouter()


async def get_product_catalog(lang: str):
    """Get product catalog from MongoDB."""
    collection = db.products_de if lang == "de" else db.products_it
    cursor = collection.find({}, {"_id": 0})
    return await cursor.to_list(length=None)


@router.post("/symptoms/analyze")
async def analyze_symptoms(data: SymptomInput, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte warten Sie eine Minute.")

    lang = data.lang if data.lang in ("de", "it") else "de"
    catalog = await get_product_catalog(lang)
    
    # Get profile_id from request if available
    profile_id = data.profile_id if hasattr(data, 'profile_id') and data.profile_id else None
    
    # Get enhanced prompt with health profile
    prompt = await get_system_prompt(lang, profile_id)

    symptom_text = data.text.strip()
    tag_text = ", ".join(data.tags) if data.tags else ""
    user_text = f"Meine Symptome: {symptom_text}" if lang == "de" else f"I miei sintomi: {symptom_text}"
    if tag_text:
        user_text += f"\n{'Bereiche' if lang == 'de' else 'Aree'}: {tag_text}"

    # Get AI config from database
    ai_config = await db.ai_config.find_one({"_id": "active"})
    ai_provider = ai_config.get("provider", "openai") if ai_config else "openai"
    ai_model = ai_config.get("model", "gpt-4o") if ai_config else "gpt-4o"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=session_id,
            system_message=prompt
        ).with_model(ai_provider, ai_model)

        t0 = time.time()
        response_text = await chat.send_message(UserMessage(text=user_text))
        latency_ms = int((time.time() - t0) * 1000)
        parsed = parse_llm_response(response_text)
        llm_success = True
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        response_text = str(e)
        latency_ms = 0
        llm_success = False
        parsed = {
            "summary": "Die Analyse konnte momentan nicht durchgeführt werden. Bitte versuchen Sie es später erneut.",
            "red_flags": [], "supplements_general_info": [], "brand_products": [],
            "nutrition_tips": [],
            "recipes": [],
            "disclaimer_short": "Dieser Inhalt dient nur der allgemeinen Information und ersetzt keine ärztliche Beratung."
        }

    # Log LLM call
    try:
        await db.llm_responses.insert_one({
            "id": str(uuid.uuid4()), "endpoint": "symptoms/analyze", 
            "provider": ai_provider, "model": ai_model,
            "prompt_version": "1.3", "lang": lang, "input_text": user_text,
            "input_tags": data.tags,
            "raw_output": response_text[:5000] if isinstance(response_text, str) else "",
            "success": llm_success, "latency_ms": latency_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception:
        pass

    # Enrich brand products with catalog data
    for bp in parsed.get("brand_products", []):
        pid = bp.get("product_id", "")
        match = next((p for p in catalog if p["product_id"] == pid), None)
        if match:
            bp["affiliate_url"] = match.get("affiliate_url", bp.get("affiliate_url", ""))
            bp["image_url"] = match.get("image_url", "")
            bp["price"] = match.get("price", "")
            bp["rating"] = match.get("rating", "")
            bp["application_instructions"] = match.get("application_instructions", "")
            if lang == "it":
                bp["video_url"] = match.get("video_url", "")

    for item in parsed.get("supplement_schedule", []):
        pid = item.get("product_id", "")
        match = next((p for p in catalog if p["product_id"] == pid), None)
        if match:
            item["image_url"] = match.get("image_url", "")
            item["application_instructions"] = match.get("application_instructions", "")

    analysis_id = str(uuid.uuid4())
    result = {
        "id": analysis_id,
        "summary": parsed.get("summary", ""),
        "priority_level": parsed.get("priority_level", "mittel"),
        "red_flags": parsed.get("red_flags", []),
        "supplements_general_info": parsed.get("supplements_general_info", []),
        "brand_products": parsed.get("brand_products", []),
        "supplement_schedule": parsed.get("supplement_schedule", []),
        "nutrition_tips": parsed.get("nutrition_tips", []),
        "recipes": parsed.get("recipes", []),
        "disclaimer_short": parsed.get("disclaimer_short", ""),
        "input_text": data.text,
        "input_tags": data.tags,
        "lang": lang,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prompt_version": "1.3",
        "model": "gpt-4o"
    }

    db_doc = {**result}
    await db.analyses.insert_one(db_doc)

    return result


@router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    doc = await db.analyses.find_one({"id": analysis_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return doc
