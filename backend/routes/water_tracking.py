from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import os
import uuid
from core.config import db, logger

router = APIRouter(prefix="/water-tracking", tags=["water-tracking"])

# ── Models ──

class AddWaterRequest(BaseModel):
    amount_ml: int

class UpdateGoalRequest(BaseModel):
    daily_goal_ml: int

class UpdateReminderRequest(BaseModel):
    enabled: bool
    times: Optional[List[str]] = None

class WaterReminderSettings(BaseModel):
    enabled: bool = False
    interval_hours: int = 2
    start_time: str = "08:00"
    end_time: str = "22:00"

# ── Helpers ──

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def calculate_water_goal_fallback(profile: dict) -> int:
    """Simple fallback formula when AI is unavailable."""
    weight = profile.get("weight")
    if not weight:
        return 2400
    base_ml = int(weight * 33)
    gender = profile.get("gender", "")
    if gender == "male":
        base_ml += 200
    activity = profile.get("activity_level", "")
    if activity in ("moderate", "moderately_active"):
        base_ml += 400
    elif activity in ("active", "very_active"):
        base_ml += 700
    elif activity == "athlete":
        base_ml += 1000
    return round(base_ml / 100) * 100

async def calculate_water_goal_ai(profile: dict) -> int:
    """Use AI to calculate personalized water goal from health profile."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        profile_summary = (
            f"Geschlecht: {profile.get('gender', 'unbekannt')}, "
            f"Alter: {profile.get('age', 'unbekannt')}, "
            f"Gewicht: {profile.get('weight', 'unbekannt')} kg, "
            f"Groesse: {profile.get('height', 'unbekannt')} cm, "
            f"Aktivitaetslevel: {profile.get('activity_level', 'unbekannt')}, "
            f"Schlafqualitaet: {profile.get('sleep_quality', 'unbekannt')}/10, "
            f"Schlafdauer: {profile.get('sleep_duration', 'unbekannt')} Stunden, "
            f"Stresslevel: {profile.get('stress_level', 'unbekannt')}/10, "
            f"Energielevel: {profile.get('energy_level', 'unbekannt')}/10, "
            f"Ernaehrung: {profile.get('diet', 'unbekannt')}, "
            f"Erkrankungen: {profile.get('conditions', [])}, "
            f"Medikamente: {profile.get('medications', [])}, "
            f"Allergien: {profile.get('allergies', [])}"
        )

        system_msg = (
            "Du bist ein Ernaehrungsexperte. Berechne die empfohlene taegliche Wasserzufuhr in Millilitern "
            "basierend auf dem Gesundheitsprofil. Beruecksichtige Gewicht, Groesse, Alter, Aktivitaetslevel, "
            "Schlafqualitaet, Stresslevel und Ernaehrungsweise. "
            "Antworte NUR mit einer einzigen Zahl in ml (z.B. 2400). Keine Erklaerung, kein Text, nur die Zahl."
        )

        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=str(uuid.uuid4()),
            system_message=system_msg
        ).with_model("openai", "gpt-4o")

        response = await chat.send_message(UserMessage(text=f"Gesundheitsprofil:\n{profile_summary}"))
        # Extract number from response
        import re
        numbers = re.findall(r'\d+', str(response).replace('.', '').replace(',', ''))
        if numbers:
            goal = int(numbers[0])
            # Sanity check: between 1000 and 6000 ml
            if 1000 <= goal <= 6000:
                return round(goal / 100) * 100
        logger.warning(f"AI returned unexpected value: {response}, using fallback")
    except Exception as e:
        logger.error(f"AI water calculation failed: {e}")

    return calculate_water_goal_fallback(profile)

def get_vero_message(current_ml: int, goal_ml: int, lang: str, hour: int) -> Optional[dict]:
    pct = (current_ml / goal_ml * 100) if goal_ml > 0 else 0
    remaining = max(0, goal_ml - current_ml)
    remaining_l = remaining / 1000
    if lang == "de":
        if pct >= 100:
            return {"text": "Perfekt! Du hast dein Tagesziel erreicht!", "mood": "celebrate"}
        if pct >= 80:
            return {"text": f"Fast geschafft! Nur noch {remaining} ml!", "mood": "excited"}
        if pct >= 50:
            return {"text": "Du bist auf einem guten Weg! Weiter so!", "mood": "happy"}
        if hour < 10:
            return {"text": "Guten Morgen! Starte den Tag mit einem Glas Wasser.", "mood": "greeting"}
        if hour >= 14 and pct < 30:
            return {"text": f"Noch {remaining_l:.1f} L bis zum Ziel. Trink etwas!", "mood": "remind"}
        if current_ml == 0:
            return {"text": "Vergiss nicht zu trinken! Dein Koerper braucht Wasser.", "mood": "remind"}
        return None
    else:
        if pct >= 100:
            return {"text": "Perfetto! Hai raggiunto il tuo obiettivo!", "mood": "celebrate"}
        if pct >= 80:
            return {"text": f"Quasi fatto! Solo {remaining} ml!", "mood": "excited"}
        if pct >= 50:
            return {"text": "Stai andando bene! Continua cosi!", "mood": "happy"}
        if hour < 10:
            return {"text": "Buongiorno! Inizia la giornata con un bicchiere d'acqua.", "mood": "greeting"}
        if hour >= 14 and pct < 30:
            return {"text": f"Ancora {remaining_l:.1f} L al traguardo. Bevi qualcosa!", "mood": "remind"}
        if current_ml == 0:
            return {"text": "Non dimenticare di bere! Il tuo corpo ha bisogno di acqua.", "mood": "remind"}
        return None

# ── Endpoints ──

@router.get("/{profile_id}/today")
async def get_today(profile_id: str, lang: str = "de"):
    date = today_str()
    doc = await db.water_tracking.find_one({"profile_id": profile_id, "date": date}, {"_id": 0})
    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})

    if goal_doc:
        daily_goal = goal_doc["daily_goal_ml"]
    else:
        profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
        daily_goal = await calculate_water_goal_ai(profile) if profile else 2400
        await db.water_goals.update_one(
            {"profile_id": profile_id},
            {"$set": {"profile_id": profile_id, "daily_goal_ml": daily_goal, "auto_calculated": True}},
            upsert=True
        )

    current_ml = doc["total_ml"] if doc else 0
    entries = doc.get("entries", []) if doc else []
    hour = datetime.now(timezone.utc).hour
    vero = get_vero_message(current_ml, daily_goal, lang, hour)

    return {
        "date": date,
        "total_ml": current_ml,
        "daily_goal_ml": daily_goal,
        "percentage": min(round(current_ml / daily_goal * 100) if daily_goal > 0 else 0, 100),
        "remaining_ml": max(0, daily_goal - current_ml),
        "entries": entries,
        "vero_message": vero,
    }

@router.post("/{profile_id}/add")
async def add_water(profile_id: str, req: AddWaterRequest, lang: str = "de"):
    if req.amount_ml <= 0 or req.amount_ml > 5000:
        raise HTTPException(400, "Amount must be between 1 and 5000 ml")

    date = today_str()
    now = datetime.now(timezone.utc).isoformat()
    entry = {"amount_ml": req.amount_ml, "time": now}

    result = await db.water_tracking.find_one_and_update(
        {"profile_id": profile_id, "date": date},
        {"$inc": {"total_ml": req.amount_ml}, "$push": {"entries": entry}, "$setOnInsert": {"profile_id": profile_id, "date": date}},
        upsert=True,
        return_document=True,
        projection={"_id": 0}
    )

    total = result["total_ml"]
    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    daily_goal = goal_doc["daily_goal_ml"] if goal_doc else 2400
    pct = min(round(total / daily_goal * 100) if daily_goal > 0 else 0, 100)
    remaining = max(0, daily_goal - total)

    if lang == "de":
        if pct >= 100: feedback = "Tagesziel erreicht!"
        elif pct >= 75: feedback = f"Fast geschafft! Noch {remaining} ml"
        elif pct >= 50: feedback = f"Ueber die Haelfte! Noch {remaining} ml"
        else: feedback = f"Weiter so! Noch {remaining} ml bis zum Ziel"
    else:
        if pct >= 100: feedback = "Obiettivo raggiunto!"
        elif pct >= 75: feedback = f"Quasi fatto! Ancora {remaining} ml"
        elif pct >= 50: feedback = f"Oltre la meta! Ancora {remaining} ml"
        else: feedback = f"Continua cosi! Ancora {remaining} ml"

    hour = datetime.now(timezone.utc).hour
    vero = get_vero_message(total, daily_goal, lang, hour)

    return {
        "total_ml": total, "daily_goal_ml": daily_goal, "percentage": pct,
        "remaining_ml": remaining, "added_ml": req.amount_ml,
        "feedback": feedback, "goal_reached": pct >= 100, "vero_message": vero,
    }

@router.get("/{profile_id}/history")
async def get_history(profile_id: str, period: str = "week"):
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=30 if period == "month" else 7)).strftime("%Y-%m-%d")

    cursor = db.water_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": start}},
        {"_id": 0, "date": 1, "total_ml": 1}
    ).sort("date", 1)
    docs = await cursor.to_list(length=31)

    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    daily_goal = goal_doc["daily_goal_ml"] if goal_doc else 2400

    days_with_data = len(docs)
    days_goal_reached = sum(1 for d in docs if d.get("total_ml", 0) >= daily_goal)
    avg_ml = round(sum(d.get("total_ml", 0) for d in docs) / max(days_with_data, 1))

    return {
        "period": period, "daily_goal_ml": daily_goal, "days": docs,
        "days_with_data": days_with_data, "days_goal_reached": days_goal_reached, "average_ml": avg_ml,
    }

@router.get("/{profile_id}/goal")
async def get_goal(profile_id: str):
    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    if goal_doc:
        return {"daily_goal_ml": goal_doc["daily_goal_ml"], "auto_calculated": goal_doc.get("auto_calculated", False)}
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    daily_goal = await calculate_water_goal_ai(profile) if profile else 2400
    return {"daily_goal_ml": daily_goal, "auto_calculated": True}

@router.put("/{profile_id}/goal")
async def update_goal(profile_id: str, req: UpdateGoalRequest):
    if req.daily_goal_ml < 500 or req.daily_goal_ml > 8000:
        raise HTTPException(400, "Goal must be between 500 and 8000 ml")
    await db.water_goals.update_one(
        {"profile_id": profile_id},
        {"$set": {"profile_id": profile_id, "daily_goal_ml": req.daily_goal_ml, "auto_calculated": False}},
        upsert=True
    )
    return {"daily_goal_ml": req.daily_goal_ml, "auto_calculated": False}

@router.get("/{profile_id}/reminder")
async def get_reminder(profile_id: str):
    doc = await db.water_reminders.find_one({"profile_id": profile_id}, {"_id": 0})
    if doc:
        return {"enabled": doc.get("enabled", False), "times": doc.get("times", ["08:00", "12:00", "16:00", "20:00"])}
    return {"enabled": False, "times": ["08:00", "12:00", "16:00", "20:00"]}

@router.put("/{profile_id}/reminder")
async def update_reminder(profile_id: str, req: UpdateReminderRequest):
    await db.water_reminders.update_one(
        {"profile_id": profile_id},
        {"$set": {"profile_id": profile_id, "enabled": req.enabled, "times": req.times or ["08:00", "12:00", "16:00", "20:00"]}},
        upsert=True
    )
    return {"enabled": req.enabled, "times": req.times or ["08:00", "12:00", "16:00", "20:00"]}


@router.post("/{profile_id}/recalculate-goal")
async def recalculate_goal(profile_id: str):
    """Recalculate goal using AI based on current health profile."""
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    daily_goal = await calculate_water_goal_ai(profile)
    await db.water_goals.update_one(
        {"profile_id": profile_id},
        {"$set": {"profile_id": profile_id, "daily_goal_ml": daily_goal, "auto_calculated": True}},
        upsert=True
    )
    return {"daily_goal_ml": daily_goal, "auto_calculated": True}

@router.get("/{profile_id}/hydration-tip")
async def get_hydration_tip(profile_id: str, lang: str = "de"):
    """Get a contextual hydration tip from VERO using AI."""
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    date = today_str()
    doc = await db.water_tracking.find_one({"profile_id": profile_id, "date": date}, {"_id": 0})
    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})

    current_ml = doc["total_ml"] if doc else 0
    daily_goal = goal_doc["daily_goal_ml"] if goal_doc else 2400
    pct = round(current_ml / daily_goal * 100) if daily_goal > 0 else 0
    hour = datetime.now(timezone.utc).hour

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        context = (
            f"Aktuelle Uhrzeit: {hour}:00, "
            f"Wasseraufnahme heute: {current_ml} ml von {daily_goal} ml ({pct}%), "
            f"Aktivitaet: {profile.get('activity_level', 'unbekannt') if profile else 'unbekannt'}, "
            f"Stresslevel: {profile.get('stress_level', 'unbekannt') if profile else 'unbekannt'}/10"
        )

        system_msg = (
            "Du bist VERO, ein freundliches Gesundheitsmaskottchen. "
            "Gib einen kurzen, motivierenden Tipp zur Hydration (max 2 Saetze). "
            "Beziehe dich auf die aktuelle Tageszeit und den Fortschritt. "
            "Sei ermutigend und freundlich. " +
            ("Antworte auf Deutsch." if lang == "de" else "Rispondi in italiano.")
        )

        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=str(uuid.uuid4()),
            system_message=system_msg
        ).with_model("openai", "gpt-4o")

        tip = await chat.send_message(UserMessage(text=context))
        return {"tip": str(tip), "source": "ai"}
    except Exception as e:
        logger.error(f"Hydration tip AI error: {e}")
        # Fallback tips
        tips_de = [
            "Wusstest du, dass dein Gehirn zu 75% aus Wasser besteht? Trinke regelmaessig!",
            "Ein Glas Wasser vor dem Essen kann dir helfen, dich besser zu fuehlen.",
            "Dein Koerper verliert taeglich etwa 2.5 Liter Wasser. Fuelle es wieder auf!",
            "Kaltes Wasser kann deinen Stoffwechsel leicht ankurbeln.",
            "Muedigkeit ist oft ein Zeichen von Dehydration. Trink ein Glas Wasser!",
        ]
        tips_it = [
            "Sapevi che il tuo cervello e composto al 75% di acqua? Bevi regolarmente!",
            "Un bicchiere d'acqua prima dei pasti puo aiutarti a sentirti meglio.",
            "Il tuo corpo perde circa 2.5 litri di acqua al giorno. Reintegrali!",
            "L'acqua fredda puo accelerare leggermente il metabolismo.",
            "La stanchezza e spesso un segno di disidratazione. Bevi un bicchiere d'acqua!",
        ]
        import random
        tips = tips_de if lang == "de" else tips_it
        return {"tip": random.choice(tips), "source": "fallback"}


# ── Water Reminder Settings ──

@router.get("/{profile_id}/water-reminders")
async def get_water_reminders(profile_id: str):
    doc = await db.water_reminders.find_one({"profile_id": profile_id}, {"_id": 0})
    if not doc:
        return {"enabled": False, "interval_hours": 2, "start_time": "08:00", "end_time": "22:00"}
    return doc

@router.put("/{profile_id}/water-reminders")
async def update_water_reminders(profile_id: str, settings: WaterReminderSettings):
    data = {
        "profile_id": profile_id,
        "enabled": settings.enabled,
        "interval_hours": settings.interval_hours,
        "start_time": settings.start_time,
        "end_time": settings.end_time,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.water_reminders.update_one(
        {"profile_id": profile_id},
        {"$set": data},
        upsert=True,
    )
    return data
