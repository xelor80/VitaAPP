from fastapi import APIRouter
from core.config import db

router = APIRouter(prefix="/admin", tags=["admin-health-stats"])


@router.get("/health-stats")
async def get_health_stats():
    """Get anonymized, aggregated health statistics from onboarding data."""
    total_profiles = await db.health_profiles.count_documents({})
    if total_profiles == 0:
        return {"total_profiles": 0, "message": "Keine Gesundheitsprofile vorhanden."}

    gender_data = await db.health_profiles.aggregate([
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)

    age_data = await db.health_profiles.aggregate([
        {"$match": {"age": {"$ne": None}}},
        {"$bucket": {
            "groupBy": "$age",
            "boundaries": [0, 18, 25, 35, 45, 55, 65, 100],
            "default": "unbekannt",
            "output": {"count": {"$sum": 1}}
        }}
    ]).to_list(20)

    diet_data = await db.health_profiles.aggregate([
        {"$match": {"diet": {"$ne": None}}},
        {"$group": {"_id": "$diet", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)

    activity_data = await db.health_profiles.aggregate([
        {"$match": {"activity_level": {"$ne": None}}},
        {"$group": {"_id": "$activity_level", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)

    complaints_data = await db.health_profiles.aggregate([
        {"$unwind": "$complaints"},
        {"$group": {"_id": "$complaints.name", "count": {"$sum": 1}, "avg_intensity": {"$avg": {"$toDouble": "$complaints.intensity"}}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]).to_list(15)

    conditions_data = await db.health_profiles.aggregate([
        {"$unwind": "$conditions"},
        {"$group": {"_id": "$conditions", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]).to_list(15)

    deficiencies_data = await db.health_profiles.aggregate([
        {"$unwind": "$known_deficiencies"},
        {"$group": {"_id": "$known_deficiencies", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]).to_list(15)

    sleep_data = await db.health_profiles.aggregate([
        {"$match": {"sleep_quality": {"$ne": None}}},
        {"$group": {"_id": None, "avg_quality": {"$avg": "$sleep_quality"}, "avg_duration": {"$avg": "$sleep_duration"}}}
    ]).to_list(1)

    stress_data = await db.health_profiles.aggregate([
        {"$match": {"stress_level": {"$ne": None}}},
        {"$group": {"_id": None, "avg_stress": {"$avg": "$stress_level"}, "avg_energy": {"$avg": "$energy_level"}}}
    ]).to_list(1)

    sleep_issues_data = await db.health_profiles.aggregate([
        {"$unwind": "$sleep_issues"},
        {"$group": {"_id": "$sleep_issues", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)

    stress_type_data = await db.health_profiles.aggregate([
        {"$unwind": "$stress_type"},
        {"$group": {"_id": "$stress_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)

    medications_data = await db.health_profiles.aggregate([
        {"$unwind": "$medications"},
        {"$group": {"_id": "$medications", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]).to_list(15)

    bmi_data = await db.health_profiles.aggregate([
        {"$match": {"height": {"$gt": 0, "$ne": None}, "weight": {"$ne": None}}},
        {"$addFields": {"bmi": {"$divide": ["$weight", {"$pow": [{"$divide": ["$height", 100]}, 2]}]}}},
        {"$bucket": {
            "groupBy": "$bmi",
            "boundaries": [0, 18.5, 25, 30, 35, 100],
            "default": "unbekannt",
            "output": {"count": {"$sum": 1}}
        }}
    ]).to_list(10)

    timeline_data = await db.health_profiles.aggregate([
        {"$match": {"created_at": {"$ne": None}}},
        {"$addFields": {"month": {"$substr": ["$created_at", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 12}
    ]).to_list(12)

    # Clean _id from sleep/stress aggregation results
    sleep_clean = {"avg_quality": sleep_data[0]["avg_quality"], "avg_duration": sleep_data[0]["avg_duration"]} if sleep_data else {}
    stress_clean = {"avg_stress": stress_data[0]["avg_stress"], "avg_energy": stress_data[0]["avg_energy"]} if stress_data else {}

    return {
        "total_profiles": total_profiles,
        "gender": [{"label": g["_id"] or "unbekannt", "count": g["count"]} for g in gender_data],
        "age": [{"label": str(a["_id"]), "count": a["count"]} for a in age_data],
        "diet": [{"label": d["_id"] or "unbekannt", "count": d["count"]} for d in diet_data],
        "activity": [{"label": a["_id"] or "unbekannt", "count": a["count"]} for a in activity_data],
        "complaints": [{"label": c["_id"], "count": c["count"], "avg_intensity": round(c["avg_intensity"], 1) if c.get("avg_intensity") else None} for c in complaints_data],
        "conditions": [{"label": c["_id"], "count": c["count"]} for c in conditions_data],
        "deficiencies": [{"label": d["_id"], "count": d["count"]} for d in deficiencies_data],
        "sleep": sleep_clean,
        "stress": stress_clean,
        "sleep_issues": [{"label": s["_id"], "count": s["count"]} for s in sleep_issues_data],
        "stress_types": [{"label": s["_id"], "count": s["count"]} for s in stress_type_data],
        "medications": [{"label": m["_id"], "count": m["count"]} for m in medications_data],
        "bmi": [{"label": str(b["_id"]), "count": b["count"]} for b in bmi_data],
        "timeline": [{"label": t["_id"], "count": t["count"]} for t in timeline_data],
    }
