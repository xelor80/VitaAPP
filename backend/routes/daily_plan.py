from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.config import db, logger

router = APIRouter(prefix="/daily-plan", tags=["daily-plan"])


# ── Models ──

class CompleteTaskRequest(BaseModel):
    task_type: str  # supplement, medication, water, stress, diary
    related_id: Optional[str] = None
    timing: Optional[str] = None
    value: Optional[int] = None  # for water: ml amount


# ── Helpers ──

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def current_hour():
    return datetime.now(timezone.utc).hour


LEVEL_THRESHOLDS = [
    (0, "Start", "seed-outline"),
    (100, "Bewusst", "sprout"),
    (300, "Aktiv", "leaf"),
    (600, "Routine", "tree"),
    (1000, "Diszipliniert", "shield-check"),
    (1500, "Fortgeschritten", "star-outline"),
    (2500, "Optimiert", "star-four-points"),
    (4000, "Meister", "crown"),
    (6000, "Legende", "trophy"),
    (10000, "Gesundheits-Held", "medal"),
]


def get_level_info(total_points: int) -> dict:
    level = 1
    title_de = "Start"
    icon = "seed-outline"
    next_threshold = 100
    for i, (threshold, title, ic) in enumerate(LEVEL_THRESHOLDS):
        if total_points >= threshold:
            level = i + 1
            title_de = title
            icon = ic
    if level < len(LEVEL_THRESHOLDS):
        next_threshold = LEVEL_THRESHOLDS[level][0]
    else:
        next_threshold = total_points
    current_threshold = LEVEL_THRESHOLDS[level - 1][0] if level > 0 else 0
    progress_in_level = total_points - current_threshold
    needed_for_next = next_threshold - current_threshold
    pct = round(progress_in_level / needed_for_next * 100) if needed_for_next > 0 else 100
    return {
        "level": level,
        "title": title_de,
        "icon": icon,
        "total_points": total_points,
        "next_level_at": next_threshold,
        "progress_pct": min(100, pct),
    }


def get_vero_message(completion_pct: int, hour: int, lang: str) -> dict:
    if lang == "de":
        if completion_pct >= 100:
            return {"text": "Perfekter Tag! Du hast alles erledigt.", "mood": "celebrate"}
        if completion_pct >= 80:
            return {"text": "Fast geschafft! Nur noch ein kleiner Schritt.", "mood": "excited"}
        if completion_pct >= 50:
            return {"text": "Guter Fortschritt! Weiter so.", "mood": "happy"}
        if hour < 10:
            return {"text": "Guten Morgen! Starte deinen Tag mit einer gesunden Routine.", "mood": "greeting"}
        if hour >= 20:
            return {"text": "Noch offene Aufgaben? Nimm dir einen Moment.", "mood": "remind"}
        return {"text": "Du hast noch offene Aufgaben. Schritt fuer Schritt.", "mood": "encourage"}
    else:
        if completion_pct >= 100:
            return {"text": "Giornata perfetta! Hai completato tutto.", "mood": "celebrate"}
        if completion_pct >= 80:
            return {"text": "Quasi fatto! Solo un piccolo passo.", "mood": "excited"}
        if completion_pct >= 50:
            return {"text": "Buon progresso! Continua cosi.", "mood": "happy"}
        if hour < 10:
            return {"text": "Buongiorno! Inizia la giornata con una routine sana.", "mood": "greeting"}
        if hour >= 20:
            return {"text": "Hai ancora compiti aperti? Prenditi un momento.", "mood": "remind"}
        return {"text": "Hai ancora compiti aperti. Passo dopo passo.", "mood": "encourage"}


# ── Main endpoint ──

@router.get("/{profile_id}")
async def get_daily_plan(profile_id: str, lang: str = "de"):
    """Generate the full daily plan aggregating all health tasks."""
    today = today_str()
    hour = current_hour()
    tasks = []

    # ── A. Supplements ──
    plan_doc = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    if plan_doc:
        schedule = plan_doc.get("plan", {}).get("weekly_schedule", {})
        supp_logs = await db.supplement_check_ins.find(
            {"profile_id": profile_id, "date": today}, {"_id": 0}
        ).to_list(500)
        supp_done = set()
        for sl in supp_logs:
            for sid in sl.get("supplement_ids", []):
                supp_done.add((sid, sl.get("timing", "")))

        for timing in ["morning", "noon", "evening"]:
            section = schedule.get(timing, {})
            items = section.get("items", []) if isinstance(section, dict) else (section if isinstance(section, list) else [])
            for item in items:
                sid = item.get("id", "")
                done = (sid, timing) in supp_done
                name = item.get("name_de", item.get("name", sid)) if lang == "de" else item.get("name_it", item.get("name", sid))
                dosage = item.get("dosage", "")
                if isinstance(dosage, dict):
                    dosage = f"{dosage.get('amount', '')} {dosage.get('unit', '')}"
                tasks.append({
                    "id": f"supp_{sid}_{timing}",
                    "type": "supplement",
                    "timing": timing,
                    "name": name,
                    "detail": str(dosage).strip(),
                    "done": done,
                    "related_id": sid,
                    "priority": 1,
                    "icon": "pill",
                })

    # ── B. Medications ──
    all_meds = await db.medications.find(
        {"profile_id": profile_id, "active": {"$ne": False}}, {"_id": 0}
    ).to_list(100)
    med_logs = await db.medication_logs.find(
        {"profile_id": profile_id, "date": today}, {"_id": 0}
    ).to_list(500)
    med_done = {(l["medication_id"], l["timing"]) for l in med_logs}

    for med in all_meds:
        for timing in med.get("timings", []):
            done = (med["id"], timing) in med_done
            tasks.append({
                "id": f"med_{med['id']}_{timing}",
                "type": "medication",
                "timing": timing,
                "name": med["name"],
                "detail": f"{med['dosage']} {med['unit']}",
                "done": done,
                "related_id": med["id"],
                "priority": 1,
                "icon": "medical-bag",
            })

    # ── C. Water ──
    water_doc = await db.water_tracking.find_one({"profile_id": profile_id, "date": today}, {"_id": 0})
    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    water_total = water_doc["total_ml"] if water_doc else 0
    water_goal = goal_doc["daily_goal_ml"] if goal_doc else 2400
    water_pct = min(100, round(water_total / water_goal * 100)) if water_goal > 0 else 0
    tasks.append({
        "id": "water_today",
        "type": "water",
        "timing": "all_day",
        "name": lang == "de" and "Wasser trinken" or "Bere acqua",
        "detail": f"{water_total} / {water_goal} ml",
        "done": water_pct >= 100,
        "progress": water_pct,
        "water_ml": water_total,
        "water_goal": water_goal,
        "priority": 2,
        "icon": "water",
    })

    # ── D. Stress exercise ──
    stress_session = await db.user_stress_sessions.find_one(
        {"profile_id": profile_id, "started_at": {"$gte": today}, "completion_status": "completed"},
        {"_id": 0}
    )
    tasks.append({
        "id": "stress_today",
        "type": "stress",
        "timing": "flexible",
        "name": lang == "de" and "Entspannungsuebung" or "Esercizio di rilassamento",
        "detail": lang == "de" and "Atmen, entspannen, fokussieren" or "Respira, rilassati, concentrati",
        "done": stress_session is not None,
        "priority": 3,
        "icon": "weather-windy",
    })

    # ── E. Diary / wellbeing check-in ──
    diary_entry = await db.diary_entries.find_one({"date": today}, {"_id": 0})
    symptom_entry = await db.symptom_tracking.find_one(
        {"profile_id": profile_id, "date": today}, {"_id": 0}
    )
    diary_done = diary_entry is not None or symptom_entry is not None
    tasks.append({
        "id": "diary_today",
        "type": "diary",
        "timing": "flexible",
        "name": lang == "de" and "Tages-Check-in" or "Check-in giornaliero",
        "detail": lang == "de" and "Wie geht es dir heute?" or "Come stai oggi?",
        "done": diary_done,
        "priority": 4,
        "icon": "notebook-outline",
    })

    # ── Group by section ──
    timing_labels = {
        "morning": {"de": "Morgens", "it": "Mattina", "en": "Morning"},
        "noon": {"de": "Mittags", "it": "Mezzogiorno", "en": "Noon"},
        "evening": {"de": "Abends", "it": "Sera", "en": "Evening"},
        "all_day": {"de": "Heute", "it": "Oggi", "en": "Today"},
        "flexible": {"de": "Flexibel", "it": "Flessibile", "en": "Flexible"},
    }

    # Sort tasks: by timing order, then priority
    timing_order = {"morning": 0, "noon": 1, "evening": 2, "all_day": 3, "flexible": 4}
    # Smart reorder based on time of day
    if hour >= 18:
        timing_order = {"evening": 0, "all_day": 1, "flexible": 2, "morning": 3, "noon": 4}
    elif hour >= 12:
        timing_order = {"noon": 0, "all_day": 1, "evening": 2, "flexible": 3, "morning": 4}

    tasks.sort(key=lambda t: (timing_order.get(t["timing"], 5), t["priority"]))

    # Group into sections
    sections = {}
    for task in tasks:
        timing = task["timing"]
        if timing not in sections:
            lbl = timing_labels.get(timing, {})
            sections[timing] = {
                "timing": timing,
                "label": lbl.get(lang, lbl.get("de", timing)),
                "tasks": [],
            }
        sections[timing]["tasks"].append(task)

    section_list = sorted(sections.values(), key=lambda s: timing_order.get(s["timing"], 5))

    # ── Stats ──
    total = len(tasks)
    completed = sum(1 for t in tasks if t["done"])
    pct = round(completed / total * 100) if total > 0 else 0

    # ── Level ──
    points_doc = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
    total_points = points_doc.get("lifetime_points", points_doc.get("total_earned", 0)) if points_doc else 0
    level_info = get_level_info(total_points)

    # ── VERO ──
    vero = get_vero_message(pct, hour, lang)

    return {
        "date": today,
        "sections": section_list,
        "total_tasks": total,
        "completed_tasks": completed,
        "completion_pct": pct,
        "level": level_info,
        "vero": vero,
    }


# ── Weekly summary ──

@router.get("/{profile_id}/weekly")
async def get_weekly_summary(profile_id: str, lang: str = "de"):
    """Get weekly completion summary."""
    today = datetime.now(timezone.utc).date()
    week_data = []

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.isoformat()

        # Count completed activities for this day
        completed = 0
        total = 0

        # Supplements
        supp_logs = await db.supplement_check_ins.find(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        ).to_list(100)
        supp_count = sum(len(sl.get("supplement_ids", [])) for sl in supp_logs)

        # Medications
        med_logs = await db.medication_logs.find(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        ).to_list(100)

        # Water
        water = await db.water_tracking.find_one(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        )
        goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
        water_goal = goal_doc["daily_goal_ml"] if goal_doc else 2400
        water_done = water and water.get("total_ml", 0) >= water_goal

        # Stress
        stress = await db.user_stress_sessions.find_one(
            {"profile_id": profile_id, "started_at": {"$gte": day_str}, "started_at": {"$lt": (day + timedelta(days=1)).isoformat()}, "completion_status": "completed"},
            {"_id": 0}
        )

        # Diary
        diary = await db.diary_entries.find_one({"date": day_str}, {"_id": 0})
        symptom = await db.symptom_tracking.find_one(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        )

        has_activity = supp_count > 0 or len(med_logs) > 0 or (water and water.get("total_ml", 0) > 0) or stress or diary or symptom
        day_score = 0
        if supp_count > 0: day_score += 1
        if len(med_logs) > 0: day_score += 1
        if water_done: day_score += 1
        if stress: day_score += 1
        if diary or symptom: day_score += 1

        day_names_de = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
        day_names_it = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"]
        wd = day.weekday()

        week_data.append({
            "date": day_str,
            "day_label": day_names_de[wd] if lang == "de" else day_names_it[wd],
            "score": day_score,
            "max_score": 5,
            "is_today": day == today,
            "active": has_activity,
        })

    active_days = sum(1 for d in week_data if d["active"])
    total_score = sum(d["score"] for d in week_data)
    max_total = sum(d["max_score"] for d in week_data)

    return {
        "days": week_data,
        "active_days": active_days,
        "total_days": 7,
        "week_score": total_score,
        "week_max": max_total,
        "week_pct": round(total_score / max_total * 100) if max_total > 0 else 0,
        "summary": (
            f"Diese Woche {active_days}/7 Tage aktiv" if lang == "de"
            else f"Questa settimana {active_days}/7 giorni attivi"
        ),
    }
