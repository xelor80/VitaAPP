from fastapi import APIRouter
from datetime import datetime, timezone, timedelta

from core.config import db, logger
from routes.level import calc_level

router = APIRouter(prefix="/weekly-report", tags=["weekly-report"])


@router.get("/{profile_id}")
async def get_weekly_report(profile_id: str, lang: str = "de"):
    """Generate a comprehensive weekly health report."""
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)

    t = lambda de, it: it if lang == "it" else de

    # ── A. Active days + points ──
    total_week_points = 0
    active_days = 0

    # ── B. Supplements ──
    supp_plan = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    supp_total_expected = 0
    supp_total_taken = 0
    supp_days_good = 0

    # ── C. Medications ──
    all_meds = await db.medications.find(
        {"profile_id": profile_id, "active": {"$ne": False}}, {"_id": 0}
    ).to_list(100)
    med_total_expected = 0
    med_total_taken = 0
    med_days_good = 0

    # ── D. Water ──
    water_goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    water_goal = water_goal_doc["daily_goal_ml"] if water_goal_doc else 2400
    water_days_reached = 0
    water_total_ml = 0
    water_days_data = 0

    # ── E. Stress ──
    stress_sessions = 0
    stress_before_sum = 0
    stress_after_sum = 0

    # ── F. Diary ──
    diary_entries_count = 0

    # ── G. Daily Plan completion ──
    plan_full_days = 0

    day_details = []

    for i in range(7):
        day = start_date + timedelta(days=i)
        day_str = day.isoformat()
        day_active = False
        day_tasks_done = 0
        day_tasks_total = 0

        # Supplements for this day
        if supp_plan:
            schedule = supp_plan.get("plan", {}).get("weekly_schedule", {})
            supp_logs = await db.supplement_check_ins.find(
                {"profile_id": profile_id, "date": day_str}, {"_id": 0}
            ).to_list(200)
            supp_done_ids = set()
            for sl in supp_logs:
                for sid in sl.get("supplement_ids", []):
                    supp_done_ids.add((sid, sl.get("timing", "")))

            day_supp_expected = 0
            day_supp_taken = 0
            for timing in ["morning", "noon", "evening"]:
                section = schedule.get(timing, {})
                items = section.get("items", []) if isinstance(section, dict) else (section if isinstance(section, list) else [])
                for item in items:
                    day_supp_expected += 1
                    if (item.get("id", ""), timing) in supp_done_ids:
                        day_supp_taken += 1

            supp_total_expected += day_supp_expected
            supp_total_taken += day_supp_taken
            day_tasks_total += day_supp_expected
            day_tasks_done += day_supp_taken
            if day_supp_expected > 0 and day_supp_taken >= day_supp_expected:
                supp_days_good += 1
            if day_supp_taken > 0:
                day_active = True

        # Medications for this day
        med_logs = await db.medication_logs.find(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        ).to_list(200)
        med_done_set = {(l["medication_id"], l["timing"]) for l in med_logs}
        day_med_expected = 0
        day_med_taken = 0
        for med in all_meds:
            for timing in med.get("timings", []):
                day_med_expected += 1
                if (med["id"], timing) in med_done_set:
                    day_med_taken += 1
        med_total_expected += day_med_expected
        med_total_taken += day_med_taken
        day_tasks_total += day_med_expected
        day_tasks_done += day_med_taken
        if day_med_expected > 0 and day_med_taken >= day_med_expected:
            med_days_good += 1
        if day_med_taken > 0:
            day_active = True

        # Water
        water_doc = await db.water_tracking.find_one(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        )
        day_water = water_doc["total_ml"] if water_doc else 0
        water_total_ml += day_water
        if day_water > 0:
            water_days_data += 1
            day_active = True
        if day_water >= water_goal:
            water_days_reached += 1
        day_tasks_total += 1
        if day_water >= water_goal:
            day_tasks_done += 1

        # Stress
        next_day = (day + timedelta(days=1)).isoformat()
        stress_docs = await db.user_stress_sessions.find(
            {"profile_id": profile_id, "started_at": {"$gte": day_str, "$lt": next_day}, "completion_status": "completed"},
            {"_id": 0}
        ).to_list(20)
        stress_sessions += len(stress_docs)
        for sd in stress_docs:
            stress_before_sum += sd.get("stress_before", 0)
            stress_after_sum += sd.get("stress_after", 0)
            day_active = True
        day_tasks_total += 1
        if len(stress_docs) > 0:
            day_tasks_done += 1

        # Diary
        diary_doc = await db.diary_entries.find_one({"date": day_str}, {"_id": 0})
        symptom_doc = await db.symptom_tracking.find_one(
            {"profile_id": profile_id, "date": day_str}, {"_id": 0}
        )
        has_diary = diary_doc is not None or symptom_doc is not None
        if has_diary:
            diary_entries_count += 1
            day_active = True
        day_tasks_total += 1
        if has_diary:
            day_tasks_done += 1

        if day_active:
            active_days += 1
        if day_tasks_total > 0 and day_tasks_done >= day_tasks_total:
            plan_full_days += 1

        day_names_de = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
        day_names_it = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"]
        wd = day.weekday()
        day_details.append({
            "date": day_str,
            "label": day_names_de[wd] if lang == "de" else day_names_it[wd],
            "is_today": day == today,
            "tasks_done": day_tasks_done,
            "tasks_total": day_tasks_total,
            "active": day_active,
        })

    # ── Calculate percentages ──
    supp_pct = round(supp_total_taken / supp_total_expected * 100) if supp_total_expected > 0 else None
    med_pct = round(med_total_taken / med_total_expected * 100) if med_total_expected > 0 else None
    water_avg = round(water_total_ml / max(1, water_days_data)) if water_days_data > 0 else 0
    stress_improvement = round(stress_before_sum - stress_after_sum, 1) if stress_sessions > 0 else None

    # ── Level info ──
    points_doc = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
    total_points = points_doc.get("lifetime_points", points_doc.get("total_earned", 0)) if points_doc else 0
    level_info = calc_level(total_points, lang)

    # ── VERO recommendation (find weakest area) ──
    areas = []
    if supp_pct is not None:
        areas.append(("supplements", supp_pct))
    if med_pct is not None:
        areas.append(("medications", med_pct))
    areas.append(("water", round(water_days_reached / 7 * 100)))
    if stress_sessions > 0:
        areas.append(("stress", min(100, stress_sessions * 15)))
    else:
        areas.append(("stress", 0))
    areas.append(("diary", round(diary_entries_count / 7 * 100)))

    weakest = min(areas, key=lambda a: a[1]) if areas else ("general", 50)

    vero_tips = {
        "supplements": {
            "de": "Versuche naechste Woche, deine Supplements regelmaessiger einzunehmen. Kleine Erinnerungen helfen!",
            "it": "Prova a prendere gli integratori piu regolarmente la prossima settimana.",
        },
        "medications": {
            "de": "Deine Medikamenten-Einnahme kann noch verbessert werden. Stelle dir feste Zeiten ein.",
            "it": "L'assunzione dei farmaci puo essere migliorata. Imposta orari fissi.",
        },
        "water": {
            "de": "Trinke naechste Woche mehr Wasser. Stelle eine Flasche gut sichtbar hin!",
            "it": "Bevi piu acqua la prossima settimana. Tieni una bottiglia in vista!",
        },
        "stress": {
            "de": "Nimm dir mehr Zeit fuer Entspannung. Schon 5 Minuten taeglich machen einen Unterschied.",
            "it": "Prenditi piu tempo per rilassarti. Anche 5 minuti al giorno fanno la differenza.",
        },
        "diary": {
            "de": "Ein kurzer taeglicher Check-in hilft, Muster zu erkennen. Probier es oefter!",
            "it": "Un breve check-in quotidiano aiuta a riconoscere i pattern. Provalo piu spesso!",
        },
        "general": {
            "de": "Weiter so! Setze dir kleine Ziele fuer naechste Woche.",
            "it": "Continua cosi! Fissa piccoli obiettivi per la prossima settimana.",
        },
    }

    vero_text = vero_tips.get(weakest[0], vero_tips["general"]).get(lang, vero_tips["general"]["de"])

    # ── Overall week score ──
    total_done = sum(d["tasks_done"] for d in day_details)
    total_tasks = sum(d["tasks_total"] for d in day_details)
    week_pct = round(total_done / total_tasks * 100) if total_tasks > 0 else 0

    return {
        "period": f"{start_date.isoformat()} - {today.isoformat()}",
        "overview": {
            "active_days": active_days,
            "total_days": 7,
            "week_completion_pct": week_pct,
            "total_points": total_points,
            "plan_full_days": plan_full_days,
        },
        "level": level_info,
        "supplements": {
            "adherence_pct": supp_pct,
            "taken": supp_total_taken,
            "expected": supp_total_expected,
            "days_good": supp_days_good,
        } if supp_total_expected > 0 else None,
        "medications": {
            "adherence_pct": med_pct,
            "taken": med_total_taken,
            "expected": med_total_expected,
            "days_good": med_days_good,
        } if med_total_expected > 0 else None,
        "water": {
            "days_reached": water_days_reached,
            "goal_ml": water_goal,
            "avg_ml": water_avg,
            "total_ml": water_total_ml,
        },
        "stress": {
            "sessions": stress_sessions,
            "improvement": stress_improvement,
        },
        "diary": {
            "entries": diary_entries_count,
        },
        "days": day_details,
        "vero": {
            "text": vero_text,
            "focus_area": weakest[0],
        },
    }
