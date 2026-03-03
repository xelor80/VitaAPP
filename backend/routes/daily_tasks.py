from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import List

from core.config import db

router = APIRouter()


class QuickSupplementInput(BaseModel):
    profile_id: str
    supplement_ids: List[str]
    timing: str = ""

class QuickSymptomInput(BaseModel):
    profile_id: str
    overall: int = 5


def _get_current_timing() -> str:
    """Get current time-of-day slot: morning, noon, or evening."""
    hour = datetime.now(timezone.utc).hour
    if hour < 11:
        return "morning"
    elif hour < 16:
        return "noon"
    return "evening"


def _timing_label(timing: str, lang: str) -> str:
    labels = {
        "morning": {"de": "Morgens", "it": "Mattina"},
        "noon": {"de": "Mittags", "it": "Mezzogiorno"},
        "evening": {"de": "Abends", "it": "Sera"},
    }
    return labels.get(timing, {}).get(lang, timing)


@router.get("/daily-tasks/{profile_id}")
async def get_daily_tasks(profile_id: str, lang: str = "de"):
    """Get up to 3 prioritized daily tasks for the home screen coach."""

    tasks = []
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")

    # Fetch first_name for personalization
    profile_doc = await db.health_profiles.find_one(
        {"id": profile_id}, {"_id": 0, "first_name": 1}
    )
    first_name_user = (profile_doc or {}).get("first_name") or None

    # --- 1. Fällige Supplement-Einnahme (Priority: HIGHEST) ---
    plan_doc = await db.supplement_plans.find_one(
        {"profile_id": profile_id}, {"_id": 0}
    )
    if plan_doc:
        plan = plan_doc.get("plan", {})
        schedule = plan.get("weekly_schedule", {})
        current_timing = _get_current_timing()

        # Check today's compliance
        compliance_today = await db.compliance_tracking.find_one(
            {"profile_id": profile_id, "date": today}, {"_id": 0}
        )
        taken_ids = set()
        if compliance_today:
            for s in compliance_today.get("supplements", []):
                if s.get("taken"):
                    taken_ids.add(s.get("id"))

        # Find due supplements for current timing slot
        timing_order = ["morning", "noon", "evening"]
        for timing in timing_order:
            section = schedule.get(timing, {})
            items = section.get("items", [])
            pending = [i for i in items if i.get("id") not in taken_ids]
            if pending:
                count = len(pending)
                first_name = pending[0].get("product_name") or pending[0].get("name", "")
                timing_lbl = _timing_label(timing, lang)

                if lang == "de":
                    title = f"{timing_lbl}: {count} Supplement{'e' if count > 1 else ''}"
                    if first_name_user:
                        if count == 1:
                            reason = f"{first_name_user}, dein {first_name} wartet"
                        else:
                            reason = f"{first_name_user}, {first_name} + {count - 1} weitere warten"
                    else:
                        reason = f"{first_name}" + (f" + {count - 1} weitere" if count > 1 else "")
                else:
                    title = f"{timing_lbl}: {count} supplement{'i' if count > 1 else 'o'}"
                    if first_name_user:
                        if count == 1:
                            reason = f"{first_name_user}, il tuo {first_name} ti aspetta"
                        else:
                            reason = f"{first_name_user}, {first_name} + {count - 1} altri ti aspettano"
                    else:
                        reason = f"{first_name}" + (f" + {count - 1} altri" if count > 1 else "")

                # Calculate total compliance for today
                all_items = []
                for t in timing_order:
                    all_items.extend(schedule.get(t, {}).get("items", []))
                total = len(all_items)
                done = len(taken_ids)
                progress = round(done / total * 100) if total > 0 else 0

                is_current = (timing == current_timing)
                tasks.append({
                    "id": f"supplement_{timing}",
                    "type": "supplement",
                    "priority": 1 if is_current else 2,
                    "icon": "pill",
                    "title": title,
                    "reason": reason,
                    "progress": progress,
                    "progress_label": f"{done}/{total}",
                    "status": "urgent" if is_current else "pending",
                    "cta_label": lang == "de" and "Einnahme tracken" or "Traccia assunzione",
                    "cta_route": "/tracking",
                    "items": [
                        {
                            "id": i.get("id"),
                            "name": i.get("product_name") or i.get("name", ""),
                            "dosage": i.get("dosage_instruction") or i.get("dosage", ""),
                        }
                        for i in pending
                    ],
                    "timing": timing,
                })
                break  # Only show the most urgent timing slot

    # --- 2. Offenes Risiko (Priority: HIGH) ---
    assessment = await db.health_assessments.find_one(
        {"profile_id": profile_id}, {"_id": 0},
        sort=[("created_at", -1)]
    )
    if assessment:
        risks = assessment.get("assessment", {}).get("risk_scores", {})
        high_risks = [
            (k, v) for k, v in risks.items()
            if isinstance(v, dict) and v.get("level") == "high"
        ]
        if not high_risks:
            # Try flat structure
            risk_levels = assessment.get("assessment", {}).get("risk_levels", {})
            high_risks = [(k, {"level": "high"}) for k, v in risk_levels.items() if v == "high"]

        if high_risks:
            nutrient_id, _ = high_risks[0]
            nutrient_name = nutrient_id.replace("_", " ").title()

            if lang == "de":
                title = f"Hohes Risiko: {nutrient_name}"
                reason = "Dieser Nährstoff sollte priorisiert werden"
                cta = "Produkt ansehen"
            else:
                title = f"Rischio alto: {nutrient_name}"
                reason = "Questo nutriente dovrebbe essere prioritario"
                cta = "Vedi prodotto"

            tasks.append({
                "id": f"risk_{nutrient_id}",
                "type": "risk",
                "priority": 3,
                "icon": "alert-circle",
                "title": title,
                "reason": reason,
                "progress": None,
                "progress_label": None,
                "status": "warning",
                "cta_label": cta,
                "cta_route": f"/product-comparison?nutrient={nutrient_id}&risk=high",
            })

    # --- 3. Symptom-Check (Priority: MEDIUM) ---
    last_symptom = await db.symptom_tracking.find_one(
        {"profile_id": profile_id},
        {"_id": 0},
        sort=[("date", -1)]
    )
    hours_since_tracking = None
    if last_symptom:
        last_date_str = last_symptom.get("date", "")
        try:
            last_date = datetime.strptime(last_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            hours_since_tracking = (now - last_date).total_seconds() / 3600
        except ValueError:
            hours_since_tracking = 48  # assume stale

    needs_tracking = hours_since_tracking is None or hours_since_tracking > 24

    if needs_tracking:
        # Calculate tracking streak
        tracking_entries = await db.symptom_tracking.find(
            {"profile_id": profile_id}, {"_id": 0, "date": 1}
        ).sort("date", -1).limit(30).to_list(30)
        streak = 0
        check_date = now
        for _ in range(30):
            check_str = check_date.strftime("%Y-%m-%d")
            if any(e.get("date") == check_str for e in tracking_entries):
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break

        if lang == "de":
            title = f"{first_name_user + ', ' if first_name_user else ''}Symptom-Check faellig"
            reason = f"Streak: {streak} Tage" if streak > 0 else "Starten Sie Ihr taegliches Tracking"
            cta = "Jetzt bewerten"
        else:
            title = f"{first_name_user + ', ' if first_name_user else ''}Controllo sintomi dovuto"
            reason = f"Serie: {streak} giorni" if streak > 0 else "Inizia il monitoraggio giornaliero"
            cta = "Valuta ora"

        tasks.append({
            "id": "symptom_check",
            "type": "tracking",
            "priority": 4,
            "icon": "clipboard-pulse",
            "title": title,
            "reason": reason,
            "progress": None,
            "progress_label": f"{streak} " + ("Tage" if lang == "de" else "giorni"),
            "status": "info",
            "cta_label": cta,
            "cta_route": "/tracking",
        })

    # --- 4. 30-Tage-Ziel (Priority: LOW) ---
    if plan_doc:
        created_at = plan_doc.get("created_at", "")
        try:
            plan_start = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            days_elapsed = (now - plan_start).days
            plan_progress = min(100, round(days_elapsed / 56 * 100))  # 8 weeks = 56 days

            if days_elapsed < 56:
                week_num = min(8, (days_elapsed // 7) + 1)
                if lang == "de":
                    title = f"Woche {week_num} von 8"
                    reason = f"Tag {days_elapsed + 1} Ihres Plans"
                    cta = "Plan ansehen"
                else:
                    title = f"Settimana {week_num} di 8"
                    reason = f"Giorno {days_elapsed + 1} del piano"
                    cta = "Vedi piano"

                tasks.append({
                    "id": "plan_progress",
                    "type": "goal",
                    "priority": 5,
                    "icon": "flag-checkered",
                    "title": title,
                    "reason": reason,
                    "progress": plan_progress,
                    "progress_label": f"{plan_progress}%",
                    "status": "progress",
                    "cta_label": cta,
                    "cta_route": "/supplement-plan",
                })
        except (ValueError, TypeError):
            pass

    # Sort by priority and return max 3
    tasks.sort(key=lambda t: t["priority"])
    return {"tasks": tasks[:3], "total_available": len(tasks), "first_name": first_name_user}


@router.post("/daily-tasks/complete-supplements")
async def complete_supplements(req: QuickSupplementInput):
    """Quick-complete supplements from the home screen."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Get existing compliance for today
    existing = await db.compliance_tracking.find_one(
        {"profile_id": req.profile_id, "date": today}
    )

    if existing:
        # Merge: mark the given IDs as taken
        supplements = existing.get("supplements", [])
        existing_ids = {s["id"] for s in supplements}
        for s in supplements:
            if s["id"] in req.supplement_ids:
                s["taken"] = True
        # Add any new IDs not already in the list
        for sid in req.supplement_ids:
            if sid not in existing_ids:
                supplements.append({"id": sid, "name": sid, "taken": True})
        await db.compliance_tracking.update_one(
            {"profile_id": req.profile_id, "date": today},
            {"$set": {"supplements": supplements, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        # Create new compliance entry
        supplements = [{"id": sid, "name": sid, "taken": True} for sid in req.supplement_ids]
        await db.compliance_tracking.insert_one({
            "profile_id": req.profile_id,
            "date": today,
            "supplements": supplements,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"success": True, "completed": len(req.supplement_ids)}


@router.post("/daily-tasks/complete-symptom-check")
async def complete_symptom_check(req: QuickSymptomInput):
    """Quick symptom check from the home screen (overall rating only)."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    existing = await db.symptom_tracking.find_one(
        {"profile_id": req.profile_id, "date": today}
    )
    if existing:
        await db.symptom_tracking.update_one(
            {"profile_id": req.profile_id, "date": today},
            {"$set": {"overall": req.overall, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.symptom_tracking.insert_one({
            "profile_id": req.profile_id,
            "date": today,
            "overall": req.overall,
            "ratings": {},
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"success": True, "overall": req.overall}
