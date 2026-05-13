"""
Weight & Metabolism Module
Tracks daily calories, protein, intermittent fasting windows and weight log.
Neutral, health-oriented (no crash-diet mechanics).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta, time as dtime
import uuid
import os
import json as json_mod

from core.config import db, logger

router = APIRouter(prefix="/weight-metabolism", tags=["weight-metabolism"])


# ── Models ──

class GoalsRequest(BaseModel):
    daily_calories: Optional[int] = None  # kcal
    daily_protein: Optional[int] = None   # g
    target_weight_kg: Optional[float] = None
    auto_calculated: Optional[bool] = False


class MealRequest(BaseModel):
    name: str
    calories: int
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    meal_type: str = "snack"  # breakfast, lunch, dinner, snack
    recipe_id: Optional[str] = None
    consumed_at: Optional[str] = None  # ISO string


class WeightRequest(BaseModel):
    weight_kg: float
    note: Optional[str] = None
    measured_at: Optional[str] = None


class FastingStartRequest(BaseModel):
    target_hours: float = 16.0  # how long the fast should last
    started_at: Optional[str] = None  # ISO; default = now


class FastingScheduleRequest(BaseModel):
    """Eating window OR Fasting window – either can be provided.
    If fast_start + fast_duration_hours are set, we compute the eating window from them.
    """
    eating_window_start: Optional[str] = None  # "HH:MM" (24h) - when eating window opens
    eating_window_hours: Optional[float] = None  # duration of eating window (1-14)
    fast_start: Optional[str] = None  # "HH:MM" - when fasting begins
    fast_duration_hours: Optional[float] = None  # 12-20
    daily_recurring: bool = True
    reminders_enabled: bool = True


class FastingSettingsRequest(BaseModel):
    default_target_hours: float = 16.0
    eating_window_hours: Optional[float] = 8.0
    reminders_enabled: bool = False


class FavoriteMealRequest(BaseModel):
    name: str
    calories: int
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    category: str = "snack"  # breakfast, lunch, dinner, snack, shake


class PhotoAnalyzeRequest(BaseModel):
    image_base64: str
    hint: Optional[str] = None  # optional text hint from user


class ProfileTimezoneRequest(BaseModel):
    timezone: str  # IANA tz, e.g. "Europe/Berlin"
    offset_minutes: Optional[int] = None  # UTC offset at time of capture


# ── Helpers ──

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def get_user_local_now(profile_id: str) -> datetime:
    """Return the current wall-clock time in the user's timezone.
    Uses stored profile_timezone.offset_minutes (set automatically on screen mount).
    Fallback: server UTC.
    """
    try:
        tz_doc = await db.profile_timezone.find_one(
            {"profile_id": profile_id},
            {"_id": 0, "offset_minutes": 1},
        )
        if tz_doc and tz_doc.get("offset_minutes") is not None:
            offset = int(tz_doc["offset_minutes"])
            return datetime.now(timezone.utc) + timedelta(minutes=offset)
    except Exception:
        pass
    return datetime.now(timezone.utc)


def calc_recommended_calories(profile: dict) -> int:
    """Mifflin-St Jeor BMR with activity multiplier."""
    try:
        weight = float(profile.get("weight") or 70)
        height = float(profile.get("height") or 170)
        age = int(profile.get("age") or 35)
        gender = (profile.get("gender") or "").lower()

        if gender == "male":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161

        activity = (profile.get("activity_level") or "").lower()
        multiplier = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "moderately_active": 1.55,
            "active": 1.725,
            "very_active": 1.9,
            "athlete": 1.9,
        }.get(activity, 1.4)
        return round(bmr * multiplier / 50) * 50
    except Exception:
        return 2000


def calc_recommended_protein(profile: dict) -> int:
    """1.2-1.6g/kg body weight."""
    try:
        weight = float(profile.get("weight") or 70)
        activity = (profile.get("activity_level") or "").lower()
        factor = 1.6 if activity in ("active", "very_active", "athlete") else 1.2
        return round(weight * factor / 5) * 5
    except Exception:
        return 90


# ── Goals ──

@router.get("/{profile_id}/goals")
async def get_goals(profile_id: str):
    doc = await db.weight_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    if doc:
        return doc
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        return {
            "profile_id": profile_id,
            "daily_calories": 2000,
            "daily_protein": 90,
            "target_weight_kg": None,
            "auto_calculated": True,
        }
    cal = calc_recommended_calories(profile)
    pro = calc_recommended_protein(profile)
    goals = {
        "profile_id": profile_id,
        "daily_calories": cal,
        "daily_protein": pro,
        "target_weight_kg": None,
        "auto_calculated": True,
        "created_at": now_iso(),
    }
    await db.weight_goals.update_one(
        {"profile_id": profile_id},
        {"$set": goals},
        upsert=True,
    )
    return goals


@router.put("/{profile_id}/goals")
async def update_goals(profile_id: str, req: GoalsRequest):
    update: dict = {"profile_id": profile_id, "updated_at": now_iso()}
    if req.daily_calories is not None:
        if req.daily_calories < 800 or req.daily_calories > 6000:
            raise HTTPException(400, "Calories must be between 800 and 6000")
        update["daily_calories"] = req.daily_calories
    if req.daily_protein is not None:
        if req.daily_protein < 20 or req.daily_protein > 400:
            raise HTTPException(400, "Protein must be between 20 and 400 g")
        update["daily_protein"] = req.daily_protein
    if req.target_weight_kg is not None:
        if req.target_weight_kg < 30 or req.target_weight_kg > 300:
            raise HTTPException(400, "Weight must be between 30 and 300 kg")
        update["target_weight_kg"] = req.target_weight_kg
    update["auto_calculated"] = bool(req.auto_calculated)

    await db.weight_goals.update_one(
        {"profile_id": profile_id},
        {"$set": update},
        upsert=True,
    )
    doc = await db.weight_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    return doc


@router.post("/{profile_id}/recalculate-goals")
async def recalculate_goals(profile_id: str):
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(404, "Profile not found")
    cal = calc_recommended_calories(profile)
    pro = calc_recommended_protein(profile)
    update = {
        "profile_id": profile_id,
        "daily_calories": cal,
        "daily_protein": pro,
        "auto_calculated": True,
        "updated_at": now_iso(),
    }
    await db.weight_goals.update_one(
        {"profile_id": profile_id},
        {"$set": update},
        upsert=True,
    )
    doc = await db.weight_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    return doc


class AIGoalRequest(BaseModel):
    gender: Optional[str] = None  # "male" | "female" | other
    current_weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = None  # sedentary | light | moderate | active | very_active
    goal: Optional[str] = None  # "maintain" | "lose" | "gain" | "build_muscle"


@router.post("/{profile_id}/ai-calculate-goals")
async def ai_calculate_goals(profile_id: str, req: AIGoalRequest):
    """AI-powered personalized daily calories + protein based on gender, current weight,
    and optional profile/health context. Uses GPT-4o-mini + a deterministic formula check."""
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0}) or {}

    # Resolve current weight (priority: request → latest weight_log → profile)
    current_kg = req.current_weight_kg
    if not current_kg:
        last = await db.weight_log.find_one(
            {"profile_id": profile_id},
            {"_id": 0, "weight_kg": 1},
            sort=[("measured_at", -1)],
        )
        if last:
            current_kg = last.get("weight_kg")
    if not current_kg:
        try:
            current_kg = float(profile.get("weight") or 0) or None
        except Exception:
            current_kg = None

    gender = (req.gender or profile.get("gender") or "").lower() or None
    height = req.height_cm or (float(profile.get("height") or 0) or None)
    age = req.age or (int(profile.get("age") or 0) or None)
    activity = (req.activity_level or profile.get("activity_level") or "moderate").lower()
    goal = (req.goal or profile.get("goal") or "maintain").lower()

    if not current_kg or not gender:
        raise HTTPException(400, "Geschlecht und aktuelles Gewicht werden benötigt.")

    # Deterministic baseline (Mifflin-St Jeor) as anchor for the AI
    h = height or 170
    a = age or 35
    if gender == "male":
        bmr = 10 * current_kg + 6.25 * h - 5 * a + 5
    else:
        bmr = 10 * current_kg + 6.25 * h - 5 * a - 161
    mult = {"sedentary": 1.2, "light": 1.375, "moderate": 1.55,
            "active": 1.725, "very_active": 1.9}.get(activity, 1.4)
    tdee = bmr * mult
    protein_factor = 1.6 if activity in ("active", "very_active") or goal in ("build_muscle", "lose") else 1.2
    baseline_cal = round(tdee / 50) * 50
    baseline_pro = round(current_kg * protein_factor / 5) * 5

    # Adjust for goal
    goal_adj = {"lose": -300, "gain": 300, "build_muscle": 200, "maintain": 0}.get(goal, 0)
    anchor_cal = max(1200, baseline_cal + goal_adj)

    # AI reasoning step (short, German, respects anchor)
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system_msg = (
            "Du bist VitaGuide Coach. Berechne gesunde Tagesziele fuer Kalorien + Protein. "
            "Antworte AUSSCHLIESSLICH mit JSON in diesem Format:\n"
            "{\"daily_calories\": INT, \"daily_protein\": INT, \"note\": \"kurze deutsche Begruendung (1 Satz, max 22 Woerter)\"}\n"
            "Runde Kalorien auf 50er, Protein auf 5er. Keine Extremdiaeten. Keine Markdown-Blocks."
        )
        prompt = (
            f"Geschlecht: {gender}. Aktuelles Gewicht: {current_kg} kg. "
            f"Groesse: {h} cm. Alter: {a}. Aktivitaet: {activity}. Ziel: {goal}.\n"
            f"Wissenschaftlicher Anker (TDEE): {anchor_cal} kcal, Protein ~{baseline_pro}g. "
            "Weiche nur begruendet innerhalb +/-10% vom Anker ab."
        )
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=f"ai-goals-{uuid.uuid4()}",
            system_message=system_msg,
        ).with_model("openai", "gpt-4o-mini")
        response = await chat.send_message(UserMessage(text=prompt))
        raw = str(response).strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:].strip()
        data = json_mod.loads(raw)
        ai_cal = int(data.get("daily_calories") or anchor_cal)
        ai_pro = int(data.get("daily_protein") or baseline_pro)
        note = str(data.get("note") or "")[:200]
    except Exception as e:
        logger.warning(f"ai-goals LLM fallback: {e}")
        ai_cal = anchor_cal
        ai_pro = baseline_pro
        note = f"Berechnung basierend auf Mifflin-St Jeor Formel ({activity}, Ziel: {goal})."

    # Safety clamps
    ai_cal = max(1200, min(5000, round(ai_cal / 50) * 50))
    ai_pro = max(40, min(300, round(ai_pro / 5) * 5))

    # Persist age / height / current weight back to the profile so they are remembered
    profile_updates = {}
    if req.age:
        profile_updates["age"] = int(req.age)
    if req.height_cm:
        profile_updates["height"] = float(req.height_cm)
    if req.current_weight_kg:
        profile_updates["weight"] = float(req.current_weight_kg)
    if profile_updates:
        try:
            await db.health_profiles.update_one(
                {"id": profile_id},
                {"$set": profile_updates},
                upsert=False,
            )
        except Exception as e:
            logger.warning(f"profile update skipped: {e}")

    # If a fresh weight was provided and differs from the latest log entry, also add it to weight_log
    if req.current_weight_kg and 30 <= req.current_weight_kg <= 300:
        try:
            today = today_str()
            await db.weight_log.delete_many({"profile_id": profile_id, "date": today})
            await db.weight_log.insert_one({
                "id": str(uuid.uuid4()),
                "profile_id": profile_id,
                "weight_kg": float(req.current_weight_kg),
                "note": "ai-goals",
                "date": today,
                "measured_at": now_iso(),
            })
        except Exception as e:
            logger.warning(f"weight log skipped: {e}")

    return {
        "daily_calories": ai_cal,
        "daily_protein": ai_pro,
        "note": note,
        "inputs": {
            "gender": gender,
            "current_weight_kg": current_kg,
            "height_cm": h,
            "age": a,
            "activity_level": activity,
            "goal": goal,
        },
        "anchor": {"tdee": anchor_cal, "protein": baseline_pro},
    }


# ── Meals (Calorie/Protein log) ──

@router.post("/{profile_id}/meal")
async def add_meal(profile_id: str, req: MealRequest):
    if req.calories < 0 or req.calories > 5000:
        raise HTTPException(400, "Calories must be 0-5000")
    if req.protein_g < 0 or req.protein_g > 500:
        raise HTTPException(400, "Protein out of range")

    meal_id = str(uuid.uuid4())
    consumed = req.consumed_at or now_iso()
    date = consumed[:10]
    meal = {
        "id": meal_id,
        "profile_id": profile_id,
        "date": date,
        "name": req.name.strip()[:80],
        "calories": int(req.calories),
        "protein_g": float(req.protein_g),
        "carbs_g": float(req.carbs_g),
        "fat_g": float(req.fat_g),
        "meal_type": req.meal_type,
        "recipe_id": req.recipe_id,
        "consumed_at": consumed,
    }
    await db.meal_log.insert_one(meal)
    meal.pop("_id", None)
    return meal


@router.delete("/{profile_id}/meal/{meal_id}")
async def delete_meal(profile_id: str, meal_id: str):
    res = await db.meal_log.delete_one({"id": meal_id, "profile_id": profile_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Meal not found")
    return {"deleted": True}


@router.get("/{profile_id}/today")
async def get_today(profile_id: str):
    date = today_str()
    cursor = db.meal_log.find(
        {"profile_id": profile_id, "date": date},
        {"_id": 0},
    ).sort("consumed_at", 1)
    meals = await cursor.to_list(length=200)

    total_cal = sum(m.get("calories", 0) for m in meals)
    total_pro = sum(m.get("protein_g", 0) for m in meals)
    total_carbs = sum(m.get("carbs_g", 0) for m in meals)
    total_fat = sum(m.get("fat_g", 0) for m in meals)

    goals_doc = await db.weight_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    if not goals_doc:
        goals_doc = await get_goals(profile_id)

    daily_cal = goals_doc.get("daily_calories", 2000)
    daily_pro = goals_doc.get("daily_protein", 90)

    # Profile snapshot (used by frontend Goal-Modal to prefill age/height/weight/activity)
    profile_doc = await db.health_profiles.find_one(
        {"id": profile_id},
        {"_id": 0, "age": 1, "gender": 1, "height": 1, "weight": 1, "activity_level": 1, "goal": 1},
    ) or {}

    return {
        "date": date,
        "totals": {
            "calories": total_cal,
            "protein_g": round(total_pro, 1),
            "carbs_g": round(total_carbs, 1),
            "fat_g": round(total_fat, 1),
        },
        "goals": {
            "daily_calories": daily_cal,
            "daily_protein": daily_pro,
        },
        "progress": {
            "calories_pct": min(100, round(total_cal / daily_cal * 100) if daily_cal else 0),
            "protein_pct": min(100, round(total_pro / daily_pro * 100) if daily_pro else 0),
        },
        "remaining": {
            "calories": max(0, daily_cal - total_cal),
            "protein_g": round(max(0, daily_pro - total_pro), 1),
        },
        "meals": meals,
        "profile": profile_doc,
    }


@router.get("/{profile_id}/history")
async def get_history(profile_id: str, days: int = 7):
    days = max(1, min(90, days))
    start = (datetime.now(timezone.utc) - timedelta(days=days - 1)).strftime("%Y-%m-%d")
    cursor = db.meal_log.find(
        {"profile_id": profile_id, "date": {"$gte": start}},
        {"_id": 0, "date": 1, "calories": 1, "protein_g": 1, "carbs_g": 1, "fat_g": 1},
    )
    rows = await cursor.to_list(length=2000)

    by_day: dict = {}
    for r in rows:
        d = r["date"]
        if d not in by_day:
            by_day[d] = {"date": d, "calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
        by_day[d]["calories"] += r.get("calories", 0)
        by_day[d]["protein_g"] += r.get("protein_g", 0)
        by_day[d]["carbs_g"] += r.get("carbs_g", 0)
        by_day[d]["fat_g"] += r.get("fat_g", 0)
    days_list = sorted(by_day.values(), key=lambda x: x["date"])
    for d in days_list:
        d["protein_g"] = round(d["protein_g"], 1)
        d["carbs_g"] = round(d["carbs_g"], 1)
        d["fat_g"] = round(d["fat_g"], 1)

    return {"days": days_list, "count": len(days_list)}


# ── Weight Log ──

@router.post("/{profile_id}/weight")
async def add_weight(profile_id: str, req: WeightRequest):
    if req.weight_kg < 30 or req.weight_kg > 300:
        raise HTTPException(400, "Weight out of range")
    measured = req.measured_at or now_iso()
    date = measured[:10]
    entry = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "weight_kg": float(req.weight_kg),
        "note": (req.note or "")[:200],
        "date": date,
        "measured_at": measured,
    }
    # Replace same-day entry if exists (one weight per day)
    await db.weight_log.delete_many({"profile_id": profile_id, "date": date})
    await db.weight_log.insert_one(entry)
    entry.pop("_id", None)
    return entry


@router.get("/{profile_id}/weight/history")
async def weight_history(profile_id: str, days: int = 30):
    days = max(1, min(365, days))
    start = (datetime.now(timezone.utc) - timedelta(days=days - 1)).strftime("%Y-%m-%d")
    cursor = db.weight_log.find(
        {"profile_id": profile_id, "date": {"$gte": start}},
        {"_id": 0},
    ).sort("date", 1)
    entries = await cursor.to_list(length=400)

    latest = entries[-1] if entries else None
    first = entries[0] if entries else None
    delta = None
    if latest and first and latest["id"] != first["id"]:
        delta = round(latest["weight_kg"] - first["weight_kg"], 1)

    goals_doc = await db.weight_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    target = goals_doc.get("target_weight_kg") if goals_doc else None

    # Phase 2: weekly insights — last 7 days vs prior 7 days
    week_cutoff = (datetime.now(timezone.utc) - timedelta(days=6)).strftime("%Y-%m-%d")
    prev_week_cutoff = (datetime.now(timezone.utc) - timedelta(days=13)).strftime("%Y-%m-%d")
    last_week = [e for e in entries if e["date"] >= week_cutoff]
    prev_week = [e for e in entries if prev_week_cutoff <= e["date"] < week_cutoff]
    week_avg = round(sum(e["weight_kg"] for e in last_week) / len(last_week), 1) if last_week else None
    prev_avg = round(sum(e["weight_kg"] for e in prev_week) / len(prev_week), 1) if prev_week else None
    week_delta = round(week_avg - prev_avg, 1) if (week_avg is not None and prev_avg is not None) else None
    # Trend: stable if |delta| < 0.2 kg, else down/up
    if week_delta is None:
        trend = "unknown"
    elif abs(week_delta) < 0.2:
        trend = "stable"
    elif week_delta < 0:
        trend = "down"
    else:
        trend = "up"
    # Hint logic (DE primary; FE will translate via lang dict on its side)
    if trend == "unknown":
        hint_key = "more_data_needed"
    elif trend == "down":
        hint_key = "good_progress"
    elif trend == "up":
        hint_key = "stay_consistent"
    else:
        hint_key = "stable_is_normal"

    return {
        "entries": entries,
        "current_kg": latest["weight_kg"] if latest else None,
        "delta_kg": delta,
        "target_kg": target,
        "days": days,
        # Phase 2 weekly insights
        "week_avg_kg": week_avg,
        "prev_week_avg_kg": prev_avg,
        "week_delta_kg": week_delta,
        "trend": trend,
        "hint_key": hint_key,
        "entries_last_week": len(last_week),
    }


@router.delete("/{profile_id}/weight/{entry_id}")
async def delete_weight(profile_id: str, entry_id: str):
    res = await db.weight_log.delete_one({"id": entry_id, "profile_id": profile_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return {"deleted": True}


@router.delete("/{profile_id}/weight")
async def reset_weight_history(profile_id: str):
    """Reset entire weight history for a profile."""
    res = await db.weight_log.delete_many({"profile_id": profile_id})
    return {"deleted": res.deleted_count}


# ── Intermittent Fasting ──

@router.get("/{profile_id}/fasting/state")
async def fasting_state(profile_id: str):
    """Return current fasting session and settings."""
    settings = await db.fasting_settings.find_one({"profile_id": profile_id}, {"_id": 0})
    if not settings:
        settings = {
            "profile_id": profile_id,
            "default_target_hours": 16.0,
            "eating_window_hours": 8.0,
            "reminders_enabled": False,
        }

    active = await db.fasting_sessions.find_one(
        {"profile_id": profile_id, "ended_at": None},
        {"_id": 0},
    )

    now = datetime.now(timezone.utc)
    progress = None
    if active:
        try:
            started = datetime.fromisoformat(active["started_at"].replace("Z", "+00:00"))
            target_h = float(active.get("target_hours", 16))
            elapsed_s = (now - started).total_seconds()
            elapsed_h = elapsed_s / 3600
            remaining_h = max(0.0, target_h - elapsed_h)
            target_end = started + timedelta(hours=target_h)
            progress = {
                "elapsed_seconds": int(max(0, elapsed_s)),
                "elapsed_hours": round(elapsed_h, 2),
                "target_hours": target_h,
                "remaining_seconds": int(remaining_h * 3600),
                "progress_pct": min(100, round(elapsed_h / target_h * 100)) if target_h else 0,
                "target_end_iso": target_end.isoformat(),
                "is_complete": elapsed_h >= target_h,
            }
        except Exception as e:
            logger.warning(f"fasting progress calc: {e}")

    # Recent history (last 7 sessions)
    hist_cursor = db.fasting_sessions.find(
        {"profile_id": profile_id, "ended_at": {"$ne": None}},
        {"_id": 0},
    ).sort("started_at", -1).limit(7)
    history = await hist_cursor.to_list(length=7)

    return {
        "active_session": active,
        "progress": progress,
        "settings": settings,
        "history": history,
    }


@router.post("/{profile_id}/fasting/start")
async def fasting_start(profile_id: str, req: FastingStartRequest):
    if req.target_hours < 4 or req.target_hours > 48:
        raise HTTPException(400, "target_hours must be 4-48")
    # Stop any active session (compute actual_hours so analytics stay accurate)
    now_dt = datetime.now(timezone.utc)
    auto_closed_iso = now_dt.isoformat()
    async for prev in db.fasting_sessions.find({"profile_id": profile_id, "ended_at": None}):
        try:
            started_dt = datetime.fromisoformat(prev["started_at"].replace("Z", "+00:00"))
            actual = round((now_dt - started_dt).total_seconds() / 3600, 2)
        except Exception:
            actual = 0
        await db.fasting_sessions.update_one(
            {"id": prev["id"]},
            {"$set": {"ended_at": auto_closed_iso, "actual_hours": actual, "auto_closed": True}},
        )
    started = req.started_at or now_iso()
    session = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "started_at": started,
        "target_hours": float(req.target_hours),
        "ended_at": None,
        "actual_hours": None,
    }
    await db.fasting_sessions.insert_one(session)
    session.pop("_id", None)
    return session


@router.post("/{profile_id}/fasting/stop")
async def fasting_stop(profile_id: str):
    active = await db.fasting_sessions.find_one(
        {"profile_id": profile_id, "ended_at": None},
        {"_id": 0},
    )
    if not active:
        raise HTTPException(404, "No active fasting session")
    ended = now_iso()
    try:
        started = datetime.fromisoformat(active["started_at"].replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(ended.replace("Z", "+00:00"))
        actual = round((end_dt - started).total_seconds() / 3600, 2)
    except Exception:
        actual = 0
    await db.fasting_sessions.update_one(
        {"id": active["id"]},
        {"$set": {"ended_at": ended, "actual_hours": actual}},
    )
    target = float(active.get("target_hours", 16))
    return {
        "stopped": True,
        "started_at": active["started_at"],
        "ended_at": ended,
        "actual_hours": actual,
        "target_hours": target,
        "goal_reached": actual >= target,
    }


@router.put("/{profile_id}/fasting/settings")
async def fasting_settings_update(profile_id: str, req: FastingSettingsRequest):
    if req.default_target_hours < 4 or req.default_target_hours > 48:
        raise HTTPException(400, "default_target_hours must be 4-48")
    data = {
        "profile_id": profile_id,
        "default_target_hours": float(req.default_target_hours),
        "eating_window_hours": float(req.eating_window_hours or 8.0),
        "reminders_enabled": bool(req.reminders_enabled),
        "updated_at": now_iso(),
    }
    await db.fasting_settings.update_one(
        {"profile_id": profile_id},
        {"$set": data},
        upsert=True,
    )
    return data


# ── Fasting Schedule (time-of-day based, recurring) ──

def _parse_hhmm(s: str) -> dtime:
    parts = s.strip().split(":")
    if len(parts) != 2:
        raise HTTPException(400, "Invalid time format (HH:MM)")
    try:
        h, m = int(parts[0]), int(parts[1])
        if not (0 <= h < 24 and 0 <= m < 60):
            raise ValueError()
        return dtime(h, m)
    except ValueError:
        raise HTTPException(400, "Invalid time format (HH:MM)")


def _minutes_since_midnight(t: dtime) -> int:
    return t.hour * 60 + t.minute


def _format_hhmm(t: dtime) -> str:
    return f"{t.hour:02d}:{t.minute:02d}"


@router.get("/{profile_id}/schedule")
async def get_schedule(profile_id: str):
    """Return time-of-day based eating window schedule and current live phase."""
    doc = await db.fasting_schedule.find_one({"profile_id": profile_id}, {"_id": 0})
    if not doc:
        return {"active": False}

    start_t = _parse_hhmm(doc["eating_window_start"])
    window_h = float(doc.get("eating_window_hours", 8))
    start_m = _minutes_since_midnight(start_t)
    end_m = (start_m + int(window_h * 60)) % (24 * 60)

    now = await get_user_local_now(profile_id)
    now_m = now.hour * 60 + now.minute

    def in_window(cur: int, s: int, e: int) -> bool:
        if s == e:
            return False
        if s < e:
            return s <= cur < e
        return cur >= s or cur < e  # wrap past midnight

    is_eating = in_window(now_m, start_m, end_m)

    # Compute time until next transition
    def mins_until(cur: int, target: int) -> int:
        diff = (target - cur) % (24 * 60)
        return diff if diff != 0 else 24 * 60

    if is_eating:
        remaining_m = mins_until(now_m, end_m)
        phase = "eating"
        next_change_label = "fasting_starts"
    else:
        remaining_m = mins_until(now_m, start_m)
        phase = "fasting"
        next_change_label = "eating_starts"

    # Progress within current phase
    total_phase_m = int(window_h * 60) if is_eating else (24 * 60 - int(window_h * 60))
    elapsed_in_phase = total_phase_m - remaining_m
    progress_pct = min(100, max(0, round(elapsed_in_phase / total_phase_m * 100))) if total_phase_m else 0

    end_t = dtime((start_m + int(window_h * 60)) // 60 % 24, (start_m + int(window_h * 60)) % 60)
    fasting_hours = round(24 - window_h, 1)
    # Fast start = eating end
    fast_start = _format_hhmm(end_t)

    return {
        "active": True,
        "eating_window_start": doc["eating_window_start"],
        "eating_window_end": _format_hhmm(end_t),
        "eating_window_hours": window_h,
        "fasting_hours": fasting_hours,
        "fast_start": fast_start,
        "fast_duration_hours": float(doc.get("fast_duration_hours", fasting_hours)),
        "daily_recurring": bool(doc.get("daily_recurring", True)),
        "reminders_enabled": bool(doc.get("reminders_enabled", True)),
        "phase": phase,  # "eating" | "fasting"
        "is_eating": is_eating,
        "remaining_seconds": remaining_m * 60,
        "remaining_minutes": remaining_m,
        "progress_pct": progress_pct,
        "next_change": next_change_label,
    }


@router.put("/{profile_id}/schedule")
async def update_schedule(profile_id: str, req: FastingScheduleRequest):
    # If fast_start + fast_duration_hours provided, derive eating window
    if req.fast_start and req.fast_duration_hours:
        _parse_hhmm(req.fast_start)
        if req.fast_duration_hours < 10 or req.fast_duration_hours > 22:
            raise HTTPException(400, "fast_duration_hours must be 10-22")
        fast_start_t = _parse_hhmm(req.fast_start)
        fast_minutes = int(req.fast_duration_hours * 60)
        # eating window starts when fasting ends
        ew_total = (_minutes_since_midnight(fast_start_t) + fast_minutes) % (24 * 60)
        ew_start_t = dtime(ew_total // 60, ew_total % 60)
        ew_hours = 24.0 - float(req.fast_duration_hours)
        eating_window_start = _format_hhmm(ew_start_t)
        eating_window_hours = ew_hours
        fast_start = req.fast_start
        fast_duration = float(req.fast_duration_hours)
    elif req.eating_window_start and req.eating_window_hours:
        _parse_hhmm(req.eating_window_start)
        if req.eating_window_hours < 1 or req.eating_window_hours > 14:
            raise HTTPException(400, "eating_window_hours must be 1-14")
        eating_window_start = req.eating_window_start
        eating_window_hours = float(req.eating_window_hours)
        # Compute fasting start = eating window end
        ew_t = _parse_hhmm(eating_window_start)
        fs_total = (_minutes_since_midnight(ew_t) + int(eating_window_hours * 60)) % (24 * 60)
        fs_t = dtime(fs_total // 60, fs_total % 60)
        fast_start = _format_hhmm(fs_t)
        fast_duration = 24.0 - eating_window_hours
    else:
        raise HTTPException(400, "Provide fast_start+fast_duration_hours or eating_window_start+eating_window_hours")

    data = {
        "profile_id": profile_id,
        "eating_window_start": eating_window_start,
        "eating_window_hours": eating_window_hours,
        "fast_start": fast_start,
        "fast_duration_hours": fast_duration,
        "daily_recurring": bool(req.daily_recurring),
        "reminders_enabled": bool(req.reminders_enabled),
        "updated_at": now_iso(),
    }
    await db.fasting_schedule.update_one(
        {"profile_id": profile_id},
        {"$set": data},
        upsert=True,
    )
    return await get_schedule(profile_id)


@router.delete("/{profile_id}/schedule")
async def delete_schedule(profile_id: str):
    await db.fasting_schedule.delete_one({"profile_id": profile_id})
    return {"deleted": True}


# ── Favorite Meals ──

@router.get("/{profile_id}/favorites")
async def list_favorites(profile_id: str, category: Optional[str] = None):
    query = {"profile_id": profile_id}
    if category:
        query["category"] = category
    cursor = db.meal_favorites.find(query, {"_id": 0}).sort("used_count", -1)
    items = await cursor.to_list(length=200)
    return {"items": items, "count": len(items)}


@router.post("/{profile_id}/favorites")
async def add_favorite(profile_id: str, req: FavoriteMealRequest):
    if req.calories < 0 or req.calories > 5000:
        raise HTTPException(400, "Calories out of range")
    fav = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "name": req.name.strip()[:80],
        "calories": int(req.calories),
        "protein_g": float(req.protein_g),
        "carbs_g": float(req.carbs_g),
        "fat_g": float(req.fat_g),
        "category": req.category,
        "used_count": 0,
        "created_at": now_iso(),
    }
    await db.meal_favorites.insert_one(fav)
    fav.pop("_id", None)
    return fav


@router.delete("/{profile_id}/favorites/{fav_id}")
async def delete_favorite(profile_id: str, fav_id: str):
    res = await db.meal_favorites.delete_one({"id": fav_id, "profile_id": profile_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Favorite not found")
    return {"deleted": True}


@router.post("/{profile_id}/favorites/{fav_id}/use")
async def use_favorite(profile_id: str, fav_id: str):
    """Log a favorite as a meal for today and bump used_count."""
    fav = await db.meal_favorites.find_one({"id": fav_id, "profile_id": profile_id}, {"_id": 0})
    if not fav:
        raise HTTPException(404, "Favorite not found")
    # Create meal from favorite
    meal_id = str(uuid.uuid4())
    consumed = now_iso()
    meal = {
        "id": meal_id,
        "profile_id": profile_id,
        "date": consumed[:10],
        "name": fav["name"],
        "calories": fav["calories"],
        "protein_g": fav["protein_g"],
        "carbs_g": fav.get("carbs_g", 0),
        "fat_g": fav.get("fat_g", 0),
        "meal_type": fav.get("category", "snack"),
        "recipe_id": None,
        "consumed_at": consumed,
        "from_favorite_id": fav_id,
    }
    await db.meal_log.insert_one(meal)
    await db.meal_favorites.update_one(
        {"id": fav_id},
        {"$inc": {"used_count": 1}, "$set": {"last_used_at": consumed}},
    )
    meal.pop("_id", None)
    return meal


# ── Photo AI Analysis ──

@router.post("/{profile_id}/analyze-meal-photo")
async def analyze_meal_photo(profile_id: str, req: PhotoAnalyzeRequest):
    """Analyze a meal photo and estimate calories + protein using GPT-4o vision."""
    if not req.image_base64 or len(req.image_base64) < 200:
        raise HTTPException(400, "Invalid image")
    # Strip data-url prefix if present
    img_b64 = req.image_base64.split(",", 1)[-1] if "," in req.image_base64 else req.image_base64

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except Exception as e:
        logger.error(f"emergentintegrations import failed: {e}")
        raise HTTPException(500, "LLM client not available")

    system_msg = (
        "Du bist ein Ernaehrungsexperte. Der Nutzer sendet ein Foto einer Mahlzeit. "
        "Erkenne die wichtigsten Lebensmittel auf dem Teller und schaetze die gesamten Kalorien (kcal) und Protein (g). "
        "Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in diesem exakten Format:\n"
        "{\n"
        '  "name": "Kurze Beschreibung der Mahlzeit (z.B. Haehnchen mit Reis und Brokkoli)",\n'
        '  "items": ["Haehnchenbrust", "Reis", "Brokkoli"],\n'
        '  "calories": 650,\n'
        '  "protein_g": 45,\n'
        '  "carbs_g": 55,\n'
        '  "fat_g": 15,\n'
        '  "confidence": "high | medium | low",\n'
        '  "note": "Kurzer Hinweis zur Schaetzung in DEUTSCH, max 1 Satz"\n'
        "}\n"
        "KEINE Markdown-Code-Blocks, KEIN Text davor oder danach, nur das JSON."
    )

    prompt = "Analysiere bitte diese Mahlzeit."
    if req.hint:
        prompt += f" Hinweis des Nutzers: {req.hint[:150]}"

    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=f"meal-photo-{uuid.uuid4()}",
            system_message=system_msg,
        ).with_model("openai", "gpt-4o")

        image_content = ImageContent(image_base64=img_b64)
        response = await chat.send_message(UserMessage(
            text=prompt,
            file_contents=[image_content],
        ))
    except Exception as e:
        logger.error(f"GPT-4o vision error: {e}")
        raise HTTPException(500, "Bilderkennung fehlgeschlagen")

    raw = str(response).strip()
    # Try to strip code-fencing if model wraps JSON
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    try:
        data = json_mod.loads(raw)
    except Exception:
        logger.warning(f"Model returned non-JSON: {raw[:200]}")
        # Fallback - user must enter manually
        return {
            "success": False,
            "name": "Unbekannte Mahlzeit",
            "items": [],
            "calories": 0,
            "protein_g": 0,
            "carbs_g": 0,
            "fat_g": 0,
            "confidence": "low",
            "note": "Konnte nicht erkannt werden. Bitte manuell anpassen.",
            "raw": raw[:300],
        }

    # Sanitize fields
    try:
        cal = max(0, min(5000, int(float(data.get("calories", 0) or 0))))
        pro = max(0.0, min(500.0, float(data.get("protein_g", 0) or 0)))
        carbs = max(0.0, min(800.0, float(data.get("carbs_g", 0) or 0)))
        fat = max(0.0, min(500.0, float(data.get("fat_g", 0) or 0)))
    except Exception:
        cal, pro, carbs, fat = 0, 0.0, 0.0, 0.0

    # Phase 2: contextual coach line based on user's remaining protein goal today
    coach_line = ""
    try:
        today = await get_today(profile_id)
        daily_pro = today["goals"]["daily_protein"]
        consumed_pro = today["totals"]["protein_g"]
        remaining_pro = max(0, daily_pro - consumed_pro)
        # How much of remaining does this meal cover?
        if remaining_pro <= 0:
            coach_line = "Tagesziel beim Protein ist bereits erreicht."
        elif pro >= remaining_pro:
            coach_line = "Mit dieser Mahlzeit erreichst du dein Tages-Protein-Ziel."
        elif pro >= remaining_pro * 0.4:
            coach_line = f"Passt gut zu deinem Protein-Ziel — noch {round(remaining_pro - pro)}g offen."
        elif pro >= 15:
            coach_line = f"Solide Mahlzeit. Noch {round(remaining_pro - pro)}g Protein bis zum Ziel."
        else:
            coach_line = f"Wenig Protein hier. Plane noch {round(remaining_pro - pro)}g für den Rest des Tages ein."
    except Exception:
        coach_line = ""

    return {
        "success": True,
        "name": str(data.get("name", "Mahlzeit"))[:80],
        "items": [str(x)[:40] for x in (data.get("items") or [])][:6],
        "calories": cal,
        "protein_g": round(pro, 1),
        "carbs_g": round(carbs, 1),
        "fat_g": round(fat, 1),
        "confidence": str(data.get("confidence", "medium"))[:20],
        "note": str(data.get("note", ""))[:160],
        "coach_line": coach_line,
    }


# ── Profile timezone (for accurate scheduling) ──

@router.put("/{profile_id}/timezone")
async def set_timezone(profile_id: str, req: ProfileTimezoneRequest):
    """Store user's IANA timezone (e.g. Europe/Berlin) and UTC offset."""
    tz = (req.timezone or "").strip()[:64]
    if not tz:
        raise HTTPException(400, "Invalid timezone")
    data = {
        "profile_id": profile_id,
        "timezone": tz,
        "offset_minutes": req.offset_minutes,
        "updated_at": now_iso(),
    }
    await db.profile_timezone.update_one(
        {"profile_id": profile_id},
        {"$set": data},
        upsert=True,
    )
    return {"profile_id": profile_id, "timezone": tz, "offset_minutes": req.offset_minutes}


@router.get("/{profile_id}/timezone")
async def get_timezone(profile_id: str):
    doc = await db.profile_timezone.find_one({"profile_id": profile_id}, {"_id": 0})
    return doc or {"profile_id": profile_id, "timezone": None, "offset_minutes": None}


# ── VERO Post-Meal Coach Comment ──

class CoachCommentRequest(BaseModel):
    meal_id: Optional[str] = None
    name: str
    calories: int
    protein_g: float
    meal_type: Optional[str] = "snack"


@router.post("/{profile_id}/coach-comment")
async def meal_coach_comment(profile_id: str, req: CoachCommentRequest):
    """Generate a short, friendly coach comment after a meal is logged.
    Cached per (name|cal|protein) hash to save tokens.
    Only fires when there's something meaningful to say."""
    cache_key = f"{req.name.lower().strip()}|{req.calories}|{round(req.protein_g)}"[:160]

    cached = await db.meal_coach_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached:
        return {"comment": cached["comment"], "cached": True, "tone": cached.get("tone", "neutral")}

    # Pull today's state for context
    today = await get_today(profile_id)
    goals = today.get("goals", {})
    totals = today.get("totals", {})
    remaining_pro = max(0, goals.get("daily_protein", 90) - totals.get("protein_g", 0))
    remaining_cal = max(0, goals.get("daily_calories", 2000) - totals.get("calories", 0))
    pro_ratio_this = (req.protein_g / max(1, req.calories)) * 100  # g per 100 kcal

    # Tone classifier (quick rules) - skip LLM call if trivial
    tone = "neutral"
    if req.calories >= 150 and pro_ratio_this >= 6:
        tone = "positive"
    elif req.calories >= 300 and pro_ratio_this < 2:
        tone = "suggestive"
    elif req.calories >= 600:
        tone = "caution"

    if tone == "neutral" and req.calories < 150:
        # Tiny snack - no comment needed
        return {"comment": None, "cached": False, "tone": "neutral"}

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        return {"comment": None, "cached": False, "tone": tone}

    system_msg = (
        "Du bist VERO, ein freundlicher Health-Coach. Antworte IMMER auf Deutsch. "
        "Gib einen SEHR kurzen Kommentar (max 1 Satz, 10-16 Woerter) zur gerade gegessenen Mahlzeit. "
        "Tonalitaet: motivierend, nie belehrend, nie Kalorien-zaehlend. "
        "Wenn die Mahlzeit proteinreich ist: lobe kurz und nenne Prozent zum Tagesziel. "
        "Wenn protein-arm und kalorienreich: sanft einen Shake/Protein-Snack als Ergaenzung vorschlagen. "
        "Wenn kalorienreich: sanft erwaehnen, nie verurteilen. "
        "KEIN Emoji. KEINE Anrede. Nur der Satz."
    )
    user_prompt = (
        f"Mahlzeit: {req.name} ({req.meal_type}). "
        f"Kalorien: {req.calories} kcal, Protein: {req.protein_g}g. "
        f"Tagesziel: {goals.get('daily_calories', 2000)} kcal / {goals.get('daily_protein', 90)}g Protein. "
        f"Bereits gegessen: {totals.get('calories', 0)} kcal / {totals.get('protein_g', 0)}g. "
        f"Noch offen: {remaining_cal} kcal / {round(remaining_pro)}g Protein. "
        f"Tonalitaet-Hinweis: {tone}."
    )

    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=f"meal-coach-{uuid.uuid4()}",
            system_message=system_msg,
        ).with_model("openai", "gpt-4o-mini")
        response = await chat.send_message(UserMessage(text=user_prompt))
        comment = str(response).strip().strip('"').strip("'")[:180]
    except Exception as e:
        logger.warning(f"coach comment LLM error: {e}")
        return {"comment": None, "cached": False, "tone": tone}

    # Cache
    try:
        await db.meal_coach_cache.insert_one({
            "key": cache_key, "comment": comment, "tone": tone,
            "created_at": now_iso(),
        })
    except Exception:
        pass  # duplicate race is fine

    return {"comment": comment, "cached": False, "tone": tone}


# ── Daily Nutrition Plan (Timeline with Shake + Meal events) ──

DAY_PLAN_EVENTS = [
    # key, label_de, label_it, label_en, icon, water_ml, kind, cal_pct, pro_pct
    {"key": "shake1", "label_de": "Shake 1", "label_it": "Shake 1", "label_en": "Shake 1",
     "icon": "cup", "water_ml": 300, "kind": "drink",
     "cal_pct": 0.20, "pro_pct": 0.25},
    {"key": "shake2", "label_de": "Shake 2", "label_it": "Shake 2", "label_en": "Shake 2",
     "icon": "cup", "water_ml": 300, "kind": "drink",
     "cal_pct": 0.15, "pro_pct": 0.25},
    {"key": "small_meal", "label_de": "Kleine Mahlzeit", "label_it": "Piccolo pasto", "label_en": "Small meal",
     "icon": "food-apple-outline", "water_ml": 300, "kind": "meal",
     "cal_pct": 0.25, "pro_pct": 0.20},
    {"key": "large_meal", "label_de": "Grosse Mahlzeit", "label_it": "Grande pasto", "label_en": "Large meal",
     "icon": "food-turkey", "water_ml": 300, "kind": "meal",
     "cal_pct": 0.40, "pro_pct": 0.30},
]


def _compute_plan_times(eating_start_hhmm: str, eating_hours: float) -> dict:
    """Compute the 4 timeline events based on the eating window.
    Protein-Routine layout, dynamically scaled to the eating window length.
    Order is always: shake1 → shake2 → small_meal → large_meal
    """
    start_t = _parse_hhmm(eating_start_hhmm)
    start_m = _minutes_since_midnight(start_t)
    window_m = int(eating_hours * 60)

    shake1_m = start_m
    # Large meal sits 1.5h before window closes
    large_m = (start_m + window_m - 90) % (24 * 60)
    # Distribute shake2 and small_meal evenly between shake1 and large_meal
    span_m = window_m - 90  # from shake1 to large_meal
    if span_m < 60:  # tiny window – fallback
        span_m = 60
    shake2_m = (start_m + span_m // 3) % (24 * 60)
    small_m = (start_m + (span_m * 2) // 3) % (24 * 60)

    def to_hhmm(mins: int) -> str:
        return f"{(mins // 60):02d}:{(mins % 60):02d}"

    return {
        "shake1": to_hhmm(shake1_m),
        "shake2": to_hhmm(shake2_m),
        "small_meal": to_hhmm(small_m),
        "large_meal": to_hhmm(large_m),
    }


@router.get("/{profile_id}/day-plan")
async def get_day_plan(profile_id: str):
    """Return today's auto-generated nutrition timeline + check-in state."""
    schedule = await get_schedule(profile_id)
    if not schedule.get("active"):
        return {"active": False, "events": [], "progress_pct": 0}

    times = _compute_plan_times(schedule["eating_window_start"], schedule["eating_window_hours"])
    date = today_str()
    checkins = await db.day_plan_checkins.find(
        {"profile_id": profile_id, "date": date},
        {"_id": 0},
    ).to_list(length=20)
    checked_map = {c["event_key"]: c for c in checkins}

    # Per-step budgets from daily goals
    goals_doc = await db.weight_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    daily_cal = (goals_doc or {}).get("daily_calories", 2000)
    daily_pro = (goals_doc or {}).get("daily_protein", 120)

    now = await get_user_local_now(profile_id)
    now_m = now.hour * 60 + now.minute

    events = []
    for meta in DAY_PLAN_EVENTS:
        key = meta["key"]
        t = times[key]
        t_parts = t.split(":")
        event_m = int(t_parts[0]) * 60 + int(t_parts[1])
        status = "done" if key in checked_map else ("now" if abs(now_m - event_m) <= 30 else ("upcoming" if event_m >= now_m else "missed"))
        target_cal = round(daily_cal * meta["cal_pct"] / 10) * 10
        target_pro = round(daily_pro * meta["pro_pct"] / 5) * 5
        events.append({
            "key": key,
            "kind": meta["kind"],  # drink | meal
            "time": t,
            "label_de": meta["label_de"],
            "label_it": meta["label_it"],
            "label_en": meta["label_en"],
            "icon": meta["icon"],
            "water_ml": meta["water_ml"],
            "target_calories": target_cal,
            "target_protein_g": target_pro,
            "checked": key in checked_map,
            "checked_at": checked_map.get(key, {}).get("checked_at"),
            "status": status,
        })

    done = sum(1 for e in events if e["checked"])
    progress_pct = round(done / len(events) * 100) if events else 0
    next_event = next((e for e in events if not e["checked"]), None)

    return {
        "active": True,
        "phase": schedule.get("phase"),
        "eating_window_start": schedule.get("eating_window_start"),
        "eating_window_end": schedule.get("eating_window_end"),
        "fast_start": schedule.get("fast_start"),
        "fast_duration_hours": schedule.get("fast_duration_hours"),
        "events": events,
        "progress_pct": progress_pct,
        "done_count": done,
        "total_count": len(events),
        "next_event": next_event,
        "phase_remaining_seconds": schedule.get("remaining_seconds"),
    }


class PlanCheckRequest(BaseModel):
    event_key: str
    done: bool = True


@router.post("/{profile_id}/day-plan/check")
async def check_day_plan_event(profile_id: str, req: PlanCheckRequest):
    """Toggle a day-plan event as done/undone for today."""
    valid_keys = {e["key"] for e in DAY_PLAN_EVENTS}
    if req.event_key not in valid_keys:
        raise HTTPException(400, f"Invalid event_key. Must be one of: {valid_keys}")
    date = today_str()
    if req.done:
        await db.day_plan_checkins.update_one(
            {"profile_id": profile_id, "date": date, "event_key": req.event_key},
            {"$set": {
                "profile_id": profile_id,
                "date": date,
                "event_key": req.event_key,
                "checked_at": now_iso(),
            }},
            upsert=True,
        )
        # Auto-log water for the event
        schedule = await get_schedule(profile_id)
        if schedule.get("active"):
            meta = next((m for m in DAY_PLAN_EVENTS if m["key"] == req.event_key), None)
            if meta and meta.get("water_ml"):
                try:
                    await db.water_intake_logs.insert_one({
                        "id": str(uuid.uuid4()),
                        "profile_id": profile_id,
                        "date": date,
                        "amount_ml": meta["water_ml"],
                        "source": f"day_plan_{req.event_key}",
                        "created_at": now_iso(),
                    })
                except Exception:
                    pass
    else:
        await db.day_plan_checkins.delete_one(
            {"profile_id": profile_id, "date": date, "event_key": req.event_key}
        )
    return await get_day_plan(profile_id)


# ── Dashboard summary (lightweight) ──

@router.get("/{profile_id}/summary")
async def summary(profile_id: str):
    """Compact summary for embedding in Dashboard / Daily Plan card."""
    today = await get_today(profile_id)
    state = await fasting_state(profile_id)
    weight = await weight_history(profile_id, 30)
    schedule = await get_schedule(profile_id)

    # VERO contextual hint
    vero_hint = None
    if schedule.get("active"):
        remaining_min = schedule.get("remaining_minutes", 0)
        if schedule["phase"] == "fasting" and remaining_min <= 30:
            vero_hint = f"Essensfenster startet in {remaining_min} Min"
        elif schedule["phase"] == "eating" and remaining_min <= 60:
            vero_hint = f"Fasten beginnt in {remaining_min} Min"
    remaining_pro = max(0, today["goals"]["daily_protein"] - today["totals"]["protein_g"])
    if not vero_hint and remaining_pro > 20 and today["totals"]["calories"] > 0:
        vero_hint = f"Noch {round(remaining_pro)}g Protein offen"

    return {
        "calories": today["totals"]["calories"],
        "calories_goal": today["goals"]["daily_calories"],
        "calories_pct": today["progress"]["calories_pct"],
        "protein_g": today["totals"]["protein_g"],
        "protein_goal": today["goals"]["daily_protein"],
        "protein_pct": today["progress"]["protein_pct"],
        "fasting_active": bool(state.get("active_session")),
        "fasting_progress_pct": state["progress"]["progress_pct"] if state.get("progress") else 0,
        "fasting_remaining_seconds": state["progress"]["remaining_seconds"] if state.get("progress") else 0,
        "fasting_target_hours": state["progress"]["target_hours"] if state.get("progress") else None,
        "schedule_active": bool(schedule.get("active")),
        "schedule_phase": schedule.get("phase"),
        "schedule_progress_pct": schedule.get("progress_pct"),
        "schedule_remaining_seconds": schedule.get("remaining_seconds"),
        "schedule_eating_window_start": schedule.get("eating_window_start"),
        "schedule_eating_window_end": schedule.get("eating_window_end"),
        "current_weight_kg": weight.get("current_kg"),
        "weight_delta_kg": weight.get("delta_kg"),
        "vero_hint": vero_hint,
    }



# ── Achievements / Streak ──

@router.get("/{profile_id}/achievements")
async def get_achievements(profile_id: str):
    """Phase 1: Achievements & streak system for Abnehm-Guide.

    Returns:
      - current_streak: days in a row (incl. today) with at least one day-plan check-in
      - longest_streak: best streak ever
      - today_protein_done: protein_g >= target
      - today_calories_done: calories within 90%-110% band of target (acceptable range)
      - today_water_done: 1500ml+ water logged today
      - today_full_plan_done: all 4 day-plan steps checked
      - badges: array of unlocked badges for UI rendering
    """
    today = await get_today(profile_id)
    daily_cal = today["goals"]["daily_calories"]
    daily_pro = today["goals"]["daily_protein"]
    cal_now = today["totals"]["calories"]
    pro_now = today["totals"]["protein_g"]

    # Water today (sum of water_intake_logs)
    date = today_str()
    water_logs = await db.water_intake_logs.find(
        {"profile_id": profile_id, "date": date},
        {"_id": 0, "amount_ml": 1},
    ).to_list(length=200)
    water_ml = sum(w.get("amount_ml", 0) for w in water_logs)

    # Day-plan checks today
    todays_checks = await db.day_plan_checkins.count_documents(
        {"profile_id": profile_id, "date": date}
    )
    # Total day-plan steps (4 = shake1, shake2, small_meal, large_meal)
    total_steps = 4

    # Streak: count consecutive days back from today with >=1 check-in
    # We pull last 60 distinct check-in dates and walk backwards.
    cursor = db.day_plan_checkins.find(
        {"profile_id": profile_id},
        {"_id": 0, "date": 1},
    ).sort("date", -1).limit(500)
    rows = await cursor.to_list(length=500)
    dates_set = {r["date"] for r in rows}

    current_streak = 0
    cur = datetime.now(timezone.utc).date()
    # If today has checks, start streak with today, else start from yesterday
    if cur.strftime("%Y-%m-%d") in dates_set:
        current_streak = 1
        check_day = cur - timedelta(days=1)
    else:
        check_day = cur - timedelta(days=1)
    while check_day.strftime("%Y-%m-%d") in dates_set and current_streak < 365:
        current_streak += 1
        check_day = check_day - timedelta(days=1)

    # Longest streak (scan all dates set, compute max run of consecutive days)
    longest_streak = 0
    if dates_set:
        sorted_dates = sorted(dates_set)
        run = 1
        longest_streak = 1
        for i in range(1, len(sorted_dates)):
            prev = datetime.strptime(sorted_dates[i - 1], "%Y-%m-%d").date()
            curd = datetime.strptime(sorted_dates[i], "%Y-%m-%d").date()
            if (curd - prev).days == 1:
                run += 1
                longest_streak = max(longest_streak, run)
            else:
                run = 1

    today_protein_done = bool(daily_pro and pro_now >= daily_pro)
    today_calories_done = bool(daily_cal and cal_now >= daily_cal * 0.9 and cal_now <= daily_cal * 1.1)
    today_water_done = water_ml >= 1500
    today_full_plan_done = todays_checks >= total_steps

    # Badges (always 4 slots, achieved or not)
    badges = [
        {
            "id": "streak_3",
            "label_de": "3 Tage in Folge",
            "label_it": "3 giorni di fila",
            "label_en": "3 days in a row",
            "icon": "fire",
            "achieved": current_streak >= 3,
            "value": current_streak,
        },
        {
            "id": "protein_goal",
            "label_de": "Protein-Ziel erreicht",
            "label_it": "Obiettivo proteine",
            "label_en": "Protein goal reached",
            "icon": "dumbbell",
            "achieved": today_protein_done,
            "value": round(pro_now),
        },
        {
            "id": "full_plan",
            "label_de": "Heute voll im Plan",
            "label_it": "Piano completato",
            "label_en": "On plan today",
            "icon": "check-circle",
            "achieved": today_full_plan_done,
            "value": todays_checks,
        },
        {
            "id": "water_goal",
            "label_de": "Wasser-Ziel erreicht",
            "label_it": "Obiettivo acqua",
            "label_en": "Water goal reached",
            "icon": "cup-water",
            "achieved": today_water_done,
            "value": water_ml,
        },
    ]

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "today_protein_done": today_protein_done,
        "today_calories_done": today_calories_done,
        "today_water_done": today_water_done,
        "today_full_plan_done": today_full_plan_done,
        "today_water_ml": water_ml,
        "today_checks": todays_checks,
        "total_steps": total_steps,
        "badges": badges,
    }
