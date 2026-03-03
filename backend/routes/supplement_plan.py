from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import os

from core.config import db
from core.health_engine import generate_health_assessment, calculate_risk_scores
from core.supplement_engine import generate_supplement_plan, SUPPLEMENT_DB
from routes.products import NUTRIENT_TAG_MAP_SCORED, _score_product

router = APIRouter()


class ReminderConfig(BaseModel):
    enabled: bool = True
    morning_time: str = "08:00"
    noon_time: str = "12:00"
    evening_time: str = "20:00"


class SupplementOverride(BaseModel):
    supplement_id: str
    dosage: Optional[float] = None
    timing: Optional[str] = None
    enabled: bool = True


@router.post("/supplement-plan/{profile_id}")
async def generate_plan(profile_id: str, lang: str = "de"):
    """Generate a personalized 8-week supplement plan for a health profile."""
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    assessment_doc = await db.health_assessments.find_one(
        {"profile_id": profile_id}, {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not assessment_doc:
        raise HTTPException(status_code=404, detail="No assessment found")

    assessment = assessment_doc.get("assessment", {})
    plan = generate_supplement_plan(profile, assessment, lang)

    # Generate LLM summary
    summary_text = await _generate_llm_summary(profile, plan, lang)
    plan["personal_summary"] = summary_text

    now = datetime.now(timezone.utc).isoformat()
    plan_id = str(uuid.uuid4())

    plan_doc = {
        "id": plan_id,
        "profile_id": profile_id,
        "plan": plan,
        "lang": lang,
        "reminders": {"enabled": False, "morning_time": "08:00", "noon_time": "12:00", "evening_time": "20:00"},
        "created_at": now,
        "updated_at": now
    }

    # Upsert: replace existing plan for this profile
    await db.supplement_plans.update_one(
        {"profile_id": profile_id},
        {"$set": plan_doc},
        upsert=True
    )

    return {"plan_id": plan_id, "plan": plan}


import re


def _parse_dosage_from_instructions(instructions: str, lang: str) -> dict | None:
    """Extract practical dosage form from product application instructions."""
    if not instructions:
        return None
    text = instructions.lower()

    # Patterns for German
    patterns_de = [
        (r'(\d+)\s*sprühst', 'Sprühstöße', 'spray'),
        (r'(\d+)\s*kapsel', 'Kapseln', 'capsule'),
        (r'(\d+)\s*tablette', 'Tabletten', 'tablet'),
        (r'(\d+)\s*softgel', 'Softgels', 'softgel'),
        (r'(\d+)\s*tropfen', 'Tropfen', 'drops'),
        (r'eine\s+kapsel', None, 'capsule'),
        (r'(\d+)\s*ml', 'ml', 'liquid'),
        (r'(\d+)\s*messlöffel', 'Messlöffel', 'powder'),
        (r'(\d+)\s*gummibärchen', 'Gummibärchen', 'gummy'),
        (r'1\s*pipette', None, 'pipette'),
    ]
    patterns_it = [
        (r'(\d+)\s*spray', 'spray', 'spray'),
        (r'(\d+)\s*capsul', 'capsule', 'capsule'),
        (r'(\d+)\s*compress', 'compresse', 'tablet'),
        (r'(\d+)\s*gocc', 'gocce', 'drops'),
        (r'una\s+capsula', None, 'capsule'),
        (r'(\d+)\s*ml', 'ml', 'liquid'),
    ]

    patterns = patterns_de if lang == "de" else patterns_it

    for pattern, form_word, form_type in patterns:
        match = re.search(pattern, text)
        if match:
            groups = match.groups()
            count = int(groups[0]) if groups and groups[0] and groups[0].isdigit() else 1
            if form_word is None:
                if lang == "de":
                    form_word = "Kapsel" if form_type == "capsule" else "Pipette"
                else:
                    form_word = "capsula" if form_type == "capsule" else "pipetta"
            # Singular/Plural
            if count == 1 and lang == "de":
                if form_word == "Kapseln": form_word = "Kapsel"
                elif form_word == "Tabletten": form_word = "Tablette"
                elif form_word == "Softgels": form_word = "Softgel"
                elif form_word == "Messlöffel": pass
                elif form_word == "Gummibärchen": pass
            elif count == 1 and lang == "it":
                if form_word == "capsule": form_word = "capsula"
                elif form_word == "compresse": form_word = "compressa"
            return {"count": count, "form_word": form_word, "label": f"{count} {form_word}"}
    return None


async def _enrich_schedule_with_products(weekly_schedule: dict, lang: str):
    """Enrich schedule items with real product names and dosage instructions."""
    collection = db.products_de if lang == "de" else db.products_it
    products = []
    async for p in collection.find({}, {"_id": 0}):
        products.append(p)

    for timing_key in ["morning", "noon", "evening"]:
        section = weekly_schedule.get(timing_key, {})
        items = section.get("items", [])
        for item in items:
            supplement_id = item.get("id", "")
            scored = NUTRIENT_TAG_MAP_SCORED.get(supplement_id)
            if not scored or not products:
                continue
            # Score and rank products for this supplement
            ranked = [(p, _score_product(p, supplement_id)) for p in products]
            ranked.sort(key=lambda x: x[1], reverse=True)
            # Only consider products with meaningful scores
            candidates = [(p, s) for p, s in ranked if s >= 3]
            if not candidates:
                continue
            top_score = candidates[0][1]
            # Among near-top products (within 30% of best), prefer ones with parseable instructions
            threshold = top_score * 0.7
            near_top = [(p, s) for p, s in candidates if s >= threshold]
            best = near_top[0][0]
            for p, s in near_top:
                ai = p.get("application_instructions", "")
                parsed = _parse_dosage_from_instructions(ai, lang)
                if parsed:
                    best = p
                    break

            item["product_name"] = best.get("name", "")
            item["product_image"] = best.get("image_url", "")
            item["affiliate_url"] = best.get("affiliate_url", "")
            # Parse real dosage form from product instructions
            ai = best.get("application_instructions", "")
            parsed = _parse_dosage_from_instructions(ai, lang)
            if parsed:
                item["form_label"] = parsed["label"]
                item["form_count"] = parsed["count"]
                item["form_type"] = parsed["form_word"]


@router.get("/supplement-plan/{profile_id}")
async def get_plan(profile_id: str):
    """Get the supplement plan for a profile, enriched with real product names."""
    doc = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No plan found. Generate one first.")

    # Enrich schedule items with real product names and dosage instructions
    lang = doc.get("lang", "de")
    plan = doc.get("plan", {})
    ws = plan.get("weekly_schedule", {})
    if ws:
        await _enrich_schedule_with_products(ws, lang)
        doc["plan"]["weekly_schedule"] = ws

    return doc


@router.get("/supplement-plan/{profile_id}/week/{week_num}")
async def get_week_plan(profile_id: str, week_num: int):
    """Get the plan details for a specific week."""
    if week_num < 1 or week_num > 8:
        raise HTTPException(status_code=400, detail="Week must be 1-8")

    doc = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No plan found")

    plan = doc.get("plan", {})
    phases = plan.get("phases", [])

    # Determine which phase this week belongs to
    phase = None
    for p in phases:
        weeks_range = p.get("weeks", "")
        parts = weeks_range.split("-")
        if len(parts) == 2:
            start, end = int(parts[0]), int(parts[1])
            if start <= week_num <= end:
                phase = p
                break

    return {
        "week": week_num,
        "phase": phase,
        "schedule": plan.get("weekly_schedule", {}),
        "is_loading": week_num == 1,
        "stack": plan.get("stack", [])
    }


@router.put("/supplement-plan/{profile_id}/reminders")
async def update_reminders(profile_id: str, config: ReminderConfig):
    """Update reminder configuration for a plan."""
    doc = await db.supplement_plans.find_one({"profile_id": profile_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No plan found")

    reminders = {
        "enabled": config.enabled,
        "morning_time": config.morning_time,
        "noon_time": config.noon_time,
        "evening_time": config.evening_time
    }

    await db.supplement_plans.update_one(
        {"profile_id": profile_id},
        {"$set": {"reminders": reminders, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"success": True, "reminders": reminders}


@router.get("/supplement-plan/{profile_id}/reminders")
async def get_reminders(profile_id: str):
    """Get reminder configuration."""
    doc = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No plan found")
    return doc.get("reminders", {})


# Admin endpoints for supplement database
@router.get("/admin/supplements")
async def list_supplements():
    """List all supplements from database (for admin panel)."""
    # First check MongoDB for overrides
    overrides = {}
    cursor = db.supplement_overrides.find({}, {"_id": 0})
    async for doc in cursor:
        overrides[doc["id"]] = doc

    supplements = []
    for sid, info in SUPPLEMENT_DB.items():
        entry = {
            "id": sid,
            "name_de": info["name_de"],
            "name_it": info["name_it"],
            "dosage_default": info["dosage_default"],
            "dosage_high_risk": info["dosage_high_risk"],
            "timing": info["timing"],
            "evidence_level": info["evidence_level"],
            "category": info["category"],
            "with_food": info["with_food"],
            "active": True
        }
        # Apply overrides
        if sid in overrides:
            entry.update(overrides[sid])
        supplements.append(entry)

    return supplements


@router.put("/admin/supplements/{supplement_id}")
async def update_supplement(supplement_id: str, data: dict):
    """Update a supplement's configuration (admin override)."""
    if supplement_id not in SUPPLEMENT_DB:
        raise HTTPException(status_code=404, detail="Supplement not found")

    data["id"] = supplement_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.supplement_overrides.update_one(
        {"id": supplement_id},
        {"$set": data},
        upsert=True
    )
    return {"success": True}


async def _generate_llm_summary(profile: dict, plan: dict, lang: str) -> str:
    """Generate a personalized LLM summary of the supplement plan."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        ai_config = await db.ai_config.find_one({"_id": "active"})
        provider = ai_config.get("provider", "openai") if ai_config else "openai"
        model = ai_config.get("model", "gpt-4o") if ai_config else "gpt-4o"

        stack_summary = "\n".join([
            f"- {s['name']}: {s['dosage']} {s['unit']} ({s['timing_label']}) - {s['reason']}"
            for s in plan.get("stack", [])
        ])

        system_msg = (
            "Du bist ein evidenzbasierter Ernaehrungsberater. Erstelle eine kurze, persoenliche Zusammenfassung "
            "eines Supplement-Plans. Sprich den Nutzer direkt an (Sie-Form). Keine medizinischen Diagnosen stellen. "
            "Halte die Zusammenfassung unter 200 Woertern. Antworte auf Deutsch."
            if lang == "de" else
            "Sei un consulente nutrizionale basato sull'evidenza. Crea un breve riepilogo personalizzato "
            "di un piano di supplementi. Rivolgiti direttamente all'utente. Non fare diagnosi mediche. "
            "Mantieni il riepilogo sotto le 200 parole. Rispondi in italiano."
        )

        age = profile.get("age", "unbekannt")
        gender_map_de = {"male": "maennlich", "female": "weiblich", "diverse": "divers"}
        gender_map_it = {"male": "maschile", "female": "femminile", "diverse": "diverso"}
        complaints_text = ", ".join([c.get("name", "") for c in (profile.get("complaints") or [])])
        warnings_text = "\n".join(plan.get("warnings", []))

        if lang == "de":
            gender = gender_map_de.get(profile.get("gender", ""), "unbekannt")
            user_msg = (
                f"Profil: Alter {age}, Geschlecht {gender}, Ernaehrung: {profile.get('diet', 'unbekannt')}\n"
                f"Beschwerden: {complaints_text or 'keine angegeben'}\n"
                f"Stresslevel: {profile.get('stress_level', 5)}/10, Schlafqualitaet: {profile.get('sleep_quality', 7)}/10\n\n"
                f"Supplement-Stack:\n{stack_summary}\n\n"
                f"Warnungen: {warnings_text or 'keine'}\n\n"
                f"Erstelle eine motivierende, persoenliche Zusammenfassung dieses 8-Wochen-Plans."
            )
        else:
            gender = gender_map_it.get(profile.get("gender", ""), "sconosciuto")
            user_msg = (
                f"Profilo: Eta {age}, Sesso {gender}, Alimentazione: {profile.get('diet', 'sconosciuta')}\n"
                f"Disturbi: {complaints_text or 'nessuno indicato'}\n"
                f"Livello stress: {profile.get('stress_level', 5)}/10, Qualita sonno: {profile.get('sleep_quality', 7)}/10\n\n"
                f"Stack supplementi:\n{stack_summary}\n\n"
                f"Avvertenze: {warnings_text or 'nessuna'}\n\n"
                f"Crea un riepilogo motivante e personalizzato di questo piano di 8 settimane."
            )

        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=session_id,
            system_message=system_msg
        ).with_model(provider, model)

        response = await chat.send_message(UserMessage(text=user_msg))
        return response if isinstance(response, str) else str(response)

    except Exception as e:
        # Fallback to static summary
        if lang == "de":
            return (
                f"Basierend auf Ihrem Gesundheitsprofil haben wir einen personalisierten 8-Wochen-Plan "
                f"mit {plan.get('total_supplements', 0)} Supplements erstellt. "
                f"Der Plan beruecksichtigt Ihre individuellen Beduerfnisse und ist in 4 Phasen aufgeteilt. "
                f"Beginnen Sie mit halber Dosierung und steigern Sie langsam. "
                f"Nach 8 Wochen empfehlen wir eine Blutkontrolle beim Arzt."
            )
        return (
            f"In base al tuo profilo di salute, abbiamo creato un piano personalizzato di 8 settimane "
            f"con {plan.get('total_supplements', 0)} supplementi. "
            f"Il piano tiene conto delle tue esigenze individuali ed e diviso in 4 fasi. "
            f"Inizia con meta dosaggio e aumenta gradualmente. "
            f"Dopo 8 settimane consigliamo un controllo del sangue dal medico."
        )
