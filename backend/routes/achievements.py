from fastapi import APIRouter
from datetime import datetime, timezone, timedelta

from core.config import db

router = APIRouter()

# Milestone definitions
MILESTONES = [
    {
        "id": "intake_7",
        "icon": "shield-check",
        "threshold": 7,
        "metric": "compliance_streak",
        "title_de": "7 Tage konsequent",
        "title_it": "7 giorni consecutivi",
        "msg_de": "Starke Disziplin! Sie haben 7 Tage durchgehalten.",
        "msg_it": "Grande disciplina! Hai resistito per 7 giorni.",
    },
    {
        "id": "tracking_14",
        "icon": "clipboard-check",
        "threshold": 14,
        "metric": "tracking_streak",
        "title_de": "14 Tage Tracking",
        "title_it": "14 giorni di monitoraggio",
        "msg_de": "Beeindruckend! 14 Tage lueckenloses Tracking.",
        "msg_it": "Impressionante! 14 giorni di monitoraggio continuo.",
    },
    {
        "id": "stress_10",
        "icon": "head-heart",
        "threshold": -10,
        "metric": "stress_change",
        "title_de": "Stress -10%",
        "title_it": "Stress -10%",
        "msg_de": "Ihr Stresslevel ist um 10% gesunken. Weiter so!",
        "msg_it": "Il tuo livello di stress e diminuito del 10%. Continua cosi!",
    },
    {
        "id": "sleep_15",
        "icon": "weather-night",
        "threshold": 15,
        "metric": "sleep_change",
        "title_de": "Schlaf +15%",
        "title_it": "Sonno +15%",
        "msg_de": "Ihre Schlafqualitaet hat sich um 15% verbessert!",
        "msg_it": "La qualita del tuo sonno e migliorata del 15%!",
    },
]


async def _calc_streak(collection_name: str, profile_id: str, check_field: str = None) -> int:
    """Calculate consecutive day streak backwards from today."""
    now = datetime.now(timezone.utc)
    streak = 0
    for i in range(90):  # max 90 days back
        check_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        query = {"profile_id": profile_id, "date": check_date}
        doc = await db[collection_name].find_one(query, {"_id": 0})
        if doc:
            if check_field:
                # For compliance: check if any supplement was taken
                items = doc.get(check_field, [])
                if any(s.get("taken") for s in items):
                    streak += 1
                else:
                    break
            else:
                streak += 1
        else:
            if i == 0:
                continue  # today not yet tracked is ok
            break
    return streak


async def _calc_symptom_change(profile_id: str, symptom_key: str, days: int = 30) -> float:
    """Calculate percentage change for a specific symptom over given days."""
    now = datetime.now(timezone.utc)
    cutoff = (now - timedelta(days=days)).strftime("%Y-%m-%d")

    entries = await db.symptom_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": cutoff}},
        {"_id": 0, "date": 1, "ratings": 1, "overall": 1}
    ).sort("date", 1).to_list(90)

    if len(entries) < 4:
        return 0.0

    # Split into first half and second half
    mid = len(entries) // 2
    first_half = entries[:mid]
    second_half = entries[mid:]

    def avg_val(docs):
        vals = []
        for d in docs:
            r = d.get("ratings", {})
            if symptom_key in r:
                vals.append(r[symptom_key])
            elif symptom_key == "overall":
                vals.append(d.get("overall", 5))
        return sum(vals) / len(vals) if vals else 0

    avg_first = avg_val(first_half)
    avg_second = avg_val(second_half)

    if avg_first == 0:
        return 0.0

    # For stress/pain: lower is better (negative change = improvement)
    # For sleep/energy: higher is better (but in our 1-10 scale, lower = better too)
    # Since all symptoms use 1-10 where 1=good, 10=bad:
    # A decrease = improvement, so return negative percentage
    change_pct = ((avg_second - avg_first) / avg_first) * 100
    return round(change_pct, 1)


@router.get("/achievements/{profile_id}")
async def get_achievements(profile_id: str, lang: str = "de"):
    """Get user achievements, streaks, and milestones."""

    # Calculate streaks
    compliance_streak = await _calc_streak("compliance_tracking", profile_id, "supplements")
    tracking_streak = await _calc_streak("symptom_tracking", profile_id)

    # Calculate symptom changes
    stress_change = await _calc_symptom_change(profile_id, "stress")
    sleep_change = await _calc_symptom_change(profile_id, "sleep")

    metrics = {
        "compliance_streak": compliance_streak,
        "tracking_streak": tracking_streak,
        "stress_change": stress_change,
        "sleep_change": sleep_change,
    }

    # Check milestones
    unlocked = []
    next_milestone = None

    for ms in MILESTONES:
        metric_val = metrics.get(ms["metric"], 0)
        threshold = ms["threshold"]

        # For symptom changes (stress): negative change is good
        if ms["metric"] == "stress_change":
            achieved = metric_val <= threshold  # e.g. -12% <= -10%
        elif ms["metric"] == "sleep_change":
            # Sleep: lower score = better, so negative change = improvement
            achieved = metric_val <= -threshold  # e.g. -18% <= -15%
        else:
            achieved = metric_val >= threshold

        entry = {
            "id": ms["id"],
            "icon": ms["icon"],
            "title": ms[f"title_{lang}"] if f"title_{lang}" in ms else ms["title_de"],
            "message": ms[f"msg_{lang}"] if f"msg_{lang}" in ms else ms["msg_de"],
            "achieved": achieved,
            "current_value": metric_val,
            "threshold": abs(threshold),
        }

        if achieved:
            unlocked.append(entry)
        elif next_milestone is None:
            next_milestone = entry

    # Determine best streak for display
    best_streak = max(compliance_streak, tracking_streak)
    streak_type = "compliance" if compliance_streak >= tracking_streak else "tracking"

    # Determine next goal
    streak_goals = [7, 14, 21, 30, 60, 90]
    next_goal = None
    for g in streak_goals:
        if best_streak < g:
            next_goal = g
            break

    # Check for NEW milestones (not yet seen)
    seen_doc = await db.achievements_seen.find_one(
        {"profile_id": profile_id}, {"_id": 0}
    )
    seen_ids = set(seen_doc.get("seen", [])) if seen_doc else set()
    new_milestones = [m for m in unlocked if m["id"] not in seen_ids]

    # Mark new milestones as seen
    if new_milestones:
        all_seen = list(seen_ids | {m["id"] for m in new_milestones})
        await db.achievements_seen.update_one(
            {"profile_id": profile_id},
            {"$set": {"seen": all_seen, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )

    return {
        "streak": {
            "current": best_streak,
            "type": streak_type,
            "compliance_streak": compliance_streak,
            "tracking_streak": tracking_streak,
            "next_goal": next_goal,
            "label": (
                (lang == "de" and f"Aktuelle Serie: {best_streak} Tage" or f"Serie attuale: {best_streak} giorni")
                if best_streak > 0
                else (lang == "de" and "Starten Sie Ihre Serie!" or "Inizia la tua serie!")
            ),
            "next_label": (
                (lang == "de" and f"Naechstes Ziel: {next_goal} Tage" or f"Prossimo obiettivo: {next_goal} giorni")
                if next_goal
                else None
            ),
        },
        "milestones": {
            "unlocked": unlocked,
            "new": new_milestones,
            "next": next_milestone,
            "total_unlocked": len(unlocked),
            "total": len(MILESTONES),
        },
    }
