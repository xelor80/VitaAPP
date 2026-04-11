from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.config import db, logger

router = APIRouter(prefix="/medications", tags=["medications"])

# ── Models ──

class MedicationCreate(BaseModel):
    name: str
    dosage: float
    unit: str  # mg, ml, Tropfen, Tablette, Kapsel
    timings: List[str]  # ["morning", "evening"]
    frequency: str = "daily"  # daily, every_other_day, specific_days
    specific_days: Optional[List[str]] = None  # ["Mo","Di","Mi",...]
    meal_relation: Optional[str] = None  # before_meal, with_meal, after_meal, fasting
    note: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class MedicationUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[float] = None
    unit: Optional[str] = None
    timings: Optional[List[str]] = None
    frequency: Optional[str] = None
    specific_days: Optional[List[str]] = None
    meal_relation: Optional[str] = None
    note: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    active: Optional[bool] = None

class MedicationLogEntry(BaseModel):
    timing: str  # morning, noon, evening

class MedicationReminderSettings(BaseModel):
    enabled: bool = False
    morning_time: str = "08:00"
    noon_time: str = "12:00"
    evening_time: str = "20:00"

# ── Helpers ──

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def current_weekday_de():
    days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
    return days[datetime.now(timezone.utc).weekday()]

def is_medication_due_today(med: dict) -> bool:
    today = today_str()
    if med.get("start_date") and today < med["start_date"]:
        return False
    if med.get("end_date") and today > med["end_date"]:
        return False
    freq = med.get("frequency", "daily")
    if freq == "daily":
        return True
    if freq == "specific_days":
        return current_weekday_de() in (med.get("specific_days") or [])
    if freq == "every_other_day":
        start = med.get("start_date", today)
        from datetime import date
        d0 = date.fromisoformat(start)
        d1 = date.fromisoformat(today)
        return (d1 - d0).days % 2 == 0
    return True

TIMING_ORDER = {"morning": 0, "noon": 1, "evening": 2}

# ── Medication Reminders (MUST be before /{medication_id} routes) ──

@router.get("/{profile_id}/reminders")
async def get_medication_reminders(profile_id: str):
    """Get medication reminder settings for a user."""
    doc = await db.medication_reminders.find_one({"profile_id": profile_id}, {"_id": 0})
    if not doc:
        return {"enabled": False, "morning_time": "08:00", "noon_time": "12:00", "evening_time": "20:00"}
    return {
        "enabled": doc.get("enabled", False),
        "morning_time": doc.get("morning_time", "08:00"),
        "noon_time": doc.get("noon_time", "12:00"),
        "evening_time": doc.get("evening_time", "20:00"),
    }

@router.put("/{profile_id}/reminders")
async def update_medication_reminders(profile_id: str, settings: MedicationReminderSettings):
    """Update medication reminder settings."""
    data = {
        "profile_id": profile_id,
        "enabled": settings.enabled,
        "morning_time": settings.morning_time,
        "noon_time": settings.noon_time,
        "evening_time": settings.evening_time,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.medication_reminders.update_one(
        {"profile_id": profile_id},
        {"$set": data},
        upsert=True,
    )
    return data

# ── CRUD ──

@router.get("/{profile_id}")
async def list_medications(profile_id: str, active_only: bool = True):
    query = {"profile_id": profile_id}
    if active_only:
        query["active"] = {"$ne": False}
    meds = await db.medications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"medications": meds}

@router.post("/{profile_id}")
async def create_medication(profile_id: str, data: MedicationCreate):
    med = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "name": data.name,
        "dosage": data.dosage,
        "unit": data.unit,
        "timings": data.timings,
        "frequency": data.frequency,
        "specific_days": data.specific_days,
        "meal_relation": data.meal_relation,
        "note": data.note,
        "start_date": data.start_date or today_str(),
        "end_date": data.end_date,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.medications.insert_one({**med})
    return {"medication": med}

@router.put("/{profile_id}/{medication_id}")
async def update_medication(profile_id: str, medication_id: str, data: MedicationUpdate):
    update = {k: v for k, v in data.dict().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.medications.update_one(
        {"id": medication_id, "profile_id": profile_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Medication not found")
    return {"success": True}

@router.delete("/{profile_id}/{medication_id}")
async def delete_medication(profile_id: str, medication_id: str):
    result = await db.medications.delete_one({"id": medication_id, "profile_id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Medication not found")
    await db.medication_logs.delete_many({"medication_id": medication_id})
    return {"success": True}

# ── Daily Plan (combined supplements + medications) ──

@router.get("/{profile_id}/daily-plan")
async def get_daily_plan(profile_id: str, lang: str = "de"):
    """Get combined daily plan with supplements and medications, grouped by timing."""
    today = today_str()

    # Get medications due today
    all_meds = await db.medications.find(
        {"profile_id": profile_id, "active": {"$ne": False}}, {"_id": 0}
    ).to_list(100)
    due_meds = [m for m in all_meds if is_medication_due_today(m)]

    # Get supplement plan
    plan_doc = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    supplements_by_timing = {}
    if plan_doc:
        schedule = plan_doc.get("plan", {}).get("weekly_schedule", {})
        for timing_key, section in schedule.items():
            if isinstance(section, dict):
                supplements_by_timing[timing_key] = section.get("items", [])
            elif isinstance(section, list):
                supplements_by_timing[timing_key] = section
            else:
                supplements_by_timing[timing_key] = []

    # Get today's logs (both supplements and medications)
    med_logs = await db.medication_logs.find(
        {"profile_id": profile_id, "date": today}, {"_id": 0}
    ).to_list(500)
    med_log_set = {(l["medication_id"], l["timing"]) for l in med_logs}

    supp_logs = await db.supplement_check_ins.find(
        {"profile_id": profile_id, "date": today}, {"_id": 0}
    ).to_list(500)
    supp_log_set = set()
    for sl in supp_logs:
        for sid in sl.get("supplement_ids", []):
            supp_log_set.add((sid, sl.get("timing", "")))

    # Get product selections (user's chosen product for each nutrient)
    sel_docs = await db.product_selections.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).to_list(100)
    product_selections = {d["nutrient_id"]: d.get("product_name", "") for d in sel_docs}

    # Build plan grouped by timing
    timing_labels = {
        "morning": {"de": "Morgens", "it": "Mattina"},
        "noon": {"de": "Mittags", "it": "Mezzogiorno"},
        "evening": {"de": "Abends", "it": "Sera"},
    }

    meal_labels = {
        "before_meal": {"de": "Vor dem Essen", "it": "Prima del pasto"},
        "with_meal": {"de": "Mit dem Essen", "it": "Durante il pasto"},
        "after_meal": {"de": "Nach dem Essen", "it": "Dopo il pasto"},
        "fasting": {"de": "Nuechtern", "it": "A digiuno"},
    }

    plan = []
    total_items = 0
    checked_items = 0

    for timing in ["morning", "noon", "evening"]:
        items = []

        # Supplements for this timing
        for supp in supplements_by_timing.get(timing, []):
            supp_id = supp.get("id", "")
            is_checked = (supp_id, timing) in supp_log_set
            # Handle different dosage formats
            dosage_info = supp.get("dosage", "")
            if isinstance(dosage_info, dict):
                dosage_str = f"{dosage_info.get('amount', '')} {dosage_info.get('unit', '')}"
            else:
                unit = supp.get("unit", "")
                dosage_str = f"{dosage_info} {unit}".strip()
            supp_name = supp.get(f"name_{lang}", supp.get("name_de", supp.get("name", supp_id)))
            # Use selected product name if available
            selected_product = product_selections.get(supp_id, "")
            display_name = selected_product if selected_product else supp_name
            items.append({
                "id": supp_id,
                "type": "supplement",
                "name": display_name,
                "original_name": supp_name,
                "product_selected": bool(selected_product),
                "dosage": dosage_str,
                "checked": is_checked,
                "timing": timing,
            })
            total_items += 1
            if is_checked:
                checked_items += 1

        # Medications for this timing
        for med in due_meds:
            if timing in med.get("timings", []):
                is_checked = (med["id"], timing) in med_log_set
                meal = med.get("meal_relation")
                meal_text = meal_labels.get(meal, {}).get(lang, "") if meal else ""
                items.append({
                    "id": med["id"],
                    "type": "medication",
                    "name": med["name"],
                    "dosage": f"{med['dosage']} {med['unit']}",
                    "meal_relation": meal_text,
                    "note": med.get("note", ""),
                    "checked": is_checked,
                    "timing": timing,
                })
                total_items += 1
                if is_checked:
                    checked_items += 1

        if items:
            plan.append({
                "timing": timing,
                "label": timing_labels.get(timing, {}).get(lang, timing),
                "items": items,
            })

    pct = round(checked_items / total_items * 100) if total_items > 0 else 0

    return {
        "date": today,
        "plan": plan,
        "total_items": total_items,
        "checked_items": checked_items,
        "percentage": pct,
        "medication_count": len(due_meds),
    }

# ── Check-in (mark medication as taken) ──

class SupplementCheckIn(BaseModel):
    supplement_id: str
    timing: str

@router.post("/{profile_id}/supplement-check-in")
async def check_in_supplement(profile_id: str, entry: SupplementCheckIn):
    """Toggle supplement check-in for today."""
    today = today_str()
    existing = await db.supplement_check_ins.find_one({
        "profile_id": profile_id,
        "date": today,
        "supplement_ids": entry.supplement_id,
        "timing": entry.timing,
    })
    if existing:
        await db.supplement_check_ins.delete_one({"_id": existing["_id"]})
        return {"checked": False}

    await db.supplement_check_ins.insert_one({
        "profile_id": profile_id,
        "date": today,
        "supplement_ids": [entry.supplement_id],
        "timing": entry.timing,
        "taken_at": datetime.now(timezone.utc).isoformat(),
    })

    # Grant reward points in background (non-blocking)
    import asyncio
    try:
        from routes.rewards import grant_points_internal
        asyncio.create_task(grant_points_internal(
            profile_id, "supplement", context=f"{entry.supplement_id}_{entry.timing}"
        ))
    except Exception:
        pass

    return {"checked": True}

@router.post("/{profile_id}/{medication_id}/check-in")
async def check_in_medication(profile_id: str, medication_id: str, entry: MedicationLogEntry):
    today = today_str()
    existing = await db.medication_logs.find_one({
        "profile_id": profile_id,
        "medication_id": medication_id,
        "date": today,
        "timing": entry.timing,
    })
    if existing:
        # Undo: remove log
        await db.medication_logs.delete_one({"_id": existing["_id"]})
        return {"checked": False}

    log = {
        "profile_id": profile_id,
        "medication_id": medication_id,
        "date": today,
        "timing": entry.timing,
        "taken_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.medication_logs.insert_one({**log})

    # Grant reward points in background (non-blocking)
    import asyncio
    try:
        from routes.rewards import grant_points_internal
        asyncio.create_task(grant_points_internal(
            profile_id, "medication", context=f"{medication_id}_{entry.timing}"
        ))
    except Exception:
        pass

    return {"checked": True}

# ── Statistics ──

@router.get("/{profile_id}/stats")
async def get_medication_stats(profile_id: str, days: int = 7):
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)

    all_meds = await db.medications.find(
        {"profile_id": profile_id, "active": {"$ne": False}}, {"_id": 0}
    ).to_list(100)

    logs = await db.medication_logs.find({
        "profile_id": profile_id,
        "date": {"$gte": start.isoformat(), "$lte": today.isoformat()},
    }, {"_id": 0}).to_list(1000)

    log_by_date = {}
    for l in logs:
        log_by_date.setdefault(l["date"], set()).add((l["medication_id"], l["timing"]))

    daily_stats = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        expected = 0
        taken = 0
        for med in all_meds:
            for t in med.get("timings", []):
                expected += 1
                if (med["id"], t) in log_by_date.get(d, set()):
                    taken += 1
        daily_stats.append({
            "date": d,
            "expected": expected,
            "taken": taken,
            "percentage": round(taken / expected * 100) if expected > 0 else 0,
        })

    total_expected = sum(d["expected"] for d in daily_stats)
    total_taken = sum(d["taken"] for d in daily_stats)

    return {
        "period_days": days,
        "daily": daily_stats,
        "total_expected": total_expected,
        "total_taken": total_taken,
        "adherence_pct": round(total_taken / total_expected * 100) if total_expected > 0 else 0,
    }
