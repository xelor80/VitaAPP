from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.config import db
from core.tracking_engine import (
    calculate_trend, calculate_compliance_rate, detect_milestones,
    generate_insights, calculate_streak, get_overall_progress
)

router = APIRouter()


class SymptomRating(BaseModel):
    profile_id: str
    date: str  # YYYY-MM-DD
    ratings: dict  # { "fatigue": 7, "concentration": 5, ... }
    overall: int = Field(ge=1, le=10)
    notes: str = ""


class ComplianceEntry(BaseModel):
    profile_id: str
    date: str
    supplements: list  # [{ "id": "vitamin_d", "taken": true }, ...]


@router.post("/tracking/symptoms")
async def save_symptom_rating(data: SymptomRating):
    """Save daily symptom rating. Only one entry per day allowed."""
    doc = {
        "profile_id": data.profile_id,
        "date": data.date,
        "ratings": data.ratings,
        "overall": data.overall,
        "notes": data.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.symptom_tracking.update_one(
        {"profile_id": data.profile_id, "date": data.date},
        {"$set": doc}, upsert=True
    )
    return {"status": "saved", "date": data.date}


@router.get("/tracking/symptoms/today/{profile_id}")
async def get_today_symptom_status(profile_id: str):
    """Check if today's symptom entry already exists."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = await db.symptom_tracking.find_one(
        {"profile_id": profile_id, "date": today}, {"_id": 0}
    )
    # Get plan start date for week calculation
    plan = await db.supplement_plans.find_one(
        {"profile_id": profile_id}, {"_id": 0, "created_at": 1}
    )
    plan_week = 0
    plan_day = 0
    total_plan_days = 56  # 8 weeks
    if plan and plan.get("created_at"):
        try:
            start = datetime.fromisoformat(plan["created_at"].replace("Z", "+00:00")) if isinstance(plan["created_at"], str) else plan["created_at"]
            if hasattr(start, 'tzinfo') and start.tzinfo is None:
                from datetime import timezone as tz
                start = start.replace(tzinfo=tz.utc)
            delta = datetime.now(timezone.utc) - start
            plan_day = min(delta.days + 1, total_plan_days)
            plan_week = min((delta.days // 7) + 1, 8)
        except Exception:
            pass
    return {
        "submitted": entry is not None,
        "entry": entry,
        "date": today,
        "plan_week": plan_week,
        "plan_day": plan_day,
        "total_plan_days": total_plan_days,
    }


@router.get("/tracking/symptoms/{profile_id}")
async def get_symptom_history(profile_id: str, days: int = 30):
    """Get symptom history for chart."""
    entries = await db.symptom_tracking.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("date", -1).limit(days).to_list(days)
    entries.reverse()  # oldest first for charts
    return {"entries": entries, "count": len(entries)}


@router.post("/tracking/compliance")
async def save_compliance(data: ComplianceEntry):
    """Save daily supplement compliance."""
    doc = {
        "profile_id": data.profile_id,
        "date": data.date,
        "supplements": data.supplements,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.compliance_tracking.update_one(
        {"profile_id": data.profile_id, "date": data.date},
        {"$set": doc}, upsert=True
    )
    return {"status": "saved", "date": data.date}


@router.get("/tracking/compliance/today/{profile_id}")
async def get_today_compliance(profile_id: str):
    """Get today's supplement compliance status."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.compliance_tracking.find_one(
        {"profile_id": profile_id, "date": today}, {"_id": 0}
    )
    if not doc:
        return {"date": today, "supplements": [], "taken_ids": []}
    taken_ids = [s["id"] for s in doc.get("supplements", []) if s.get("taken")]
    return {"date": today, "supplements": doc.get("supplements", []), "taken_ids": taken_ids}


@router.get("/tracking/compliance/{profile_id}")
async def get_compliance_history(profile_id: str, days: int = 30):
    """Get compliance history."""
    entries = await db.compliance_tracking.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("date", -1).limit(days).to_list(days)
    entries.reverse()

    # Calculate overall compliance rate
    total_checks = 0
    taken_checks = 0
    for e in entries:
        for s in e.get("supplements", []):
            total_checks += 1
            if s.get("taken"):
                taken_checks += 1

    rate = round((taken_checks / total_checks * 100), 1) if total_checks > 0 else 0
    return {"entries": entries, "count": len(entries), "rate": rate}


@router.get("/tracking/dashboard/{profile_id}")
async def get_tracking_dashboard(profile_id: str, lang: str = "de"):
    """Get complete tracking dashboard data."""
    # Fetch all data
    symptoms = await db.symptom_tracking.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("date", 1).limit(90).to_list(90)

    compliance = await db.compliance_tracking.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("date", 1).limit(90).to_list(90)

    # Symptom trend
    overall_values = [s["overall"] for s in symptoms]
    symptom_trend = calculate_trend(overall_values)

    # Chart data for individual symptoms
    symptom_chart = {}
    for entry in symptoms:
        for key, val in entry.get("ratings", {}).items():
            if key not in symptom_chart:
                symptom_chart[key] = []
            symptom_chart[key].append({"date": entry["date"], "value": val})

    # Compliance data
    total_checks = 0
    taken_checks = 0
    for e in compliance:
        for s in e.get("supplements", []):
            total_checks += 1
            if s.get("taken"):
                taken_checks += 1
    compliance_rate = round((taken_checks / total_checks * 100), 1) if total_checks > 0 else 0

    compliance_daily = []
    for e in compliance:
        sups = e.get("supplements", [])
        day_taken = sum(1 for s in sups if s.get("taken"))
        day_total = len(sups)
        compliance_daily.append({
            "date": e["date"],
            "rate": round((day_taken / day_total * 100), 1) if day_total > 0 else 0
        })
    compliance_trend = calculate_trend([d["rate"] for d in compliance_daily]) if compliance_daily else {"direction": "neutral", "change_pct": 0}

    # Streak
    all_dates = list(set(
        [s["date"] for s in symptoms] + [c["date"] for c in compliance]
    ))
    streak = calculate_streak(all_dates)
    days_tracked = len(set(all_dates))

    # Milestones
    milestones = detect_milestones(streak, days_tracked, compliance_rate)

    # Insights
    insights = generate_insights(days_tracked, symptom_trend, compliance_rate, compliance_trend, lang)

    # Overall progress
    progress = get_overall_progress(days_tracked, compliance_rate, symptom_trend)

    # Overall chart (for line chart)
    overall_chart = [{"date": s["date"], "value": s["overall"]} for s in symptoms]

    return {
        "progress": progress,
        "streak": streak,
        "days_tracked": days_tracked,
        "symptom_trend": symptom_trend,
        "symptom_chart": symptom_chart,
        "overall_chart": overall_chart,
        "compliance_rate": compliance_rate,
        "compliance_daily": compliance_daily,
        "compliance_trend": compliance_trend,
        "milestones": milestones,
        "insights": insights,
    }
