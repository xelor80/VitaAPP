"""
Weight & Metabolism Module
Tracks daily calories, protein, intermittent fasting windows and weight log.
Neutral, health-oriented (no crash-diet mechanics).
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

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


class FastingSettingsRequest(BaseModel):
    default_target_hours: float = 16.0
    eating_window_hours: Optional[float] = 8.0
    reminders_enabled: bool = False


# ── Helpers ──

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


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

    return {
        "entries": entries,
        "current_kg": latest["weight_kg"] if latest else None,
        "delta_kg": delta,
        "target_kg": target,
        "days": days,
    }


@router.delete("/{profile_id}/weight/{entry_id}")
async def delete_weight(profile_id: str, entry_id: str):
    res = await db.weight_log.delete_one({"id": entry_id, "profile_id": profile_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return {"deleted": True}


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
    # Stop any active session
    await db.fasting_sessions.update_many(
        {"profile_id": profile_id, "ended_at": None},
        {"$set": {"ended_at": now_iso(), "auto_closed": True}},
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


# ── Dashboard summary (lightweight) ──

@router.get("/{profile_id}/summary")
async def summary(profile_id: str):
    """Compact summary for embedding in Dashboard / Daily Plan card."""
    today = await get_today(profile_id)
    state = await fasting_state(profile_id)
    weight = await weight_history(profile_id, 30)
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
        "current_weight_kg": weight.get("current_kg"),
        "weight_delta_kg": weight.get("delta_kg"),
    }
