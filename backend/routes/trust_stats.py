from fastapi import APIRouter

from core.config import db

router = APIRouter()


@router.get("/stats/trust")
async def get_trust_stats():
    """Return aggregated trust statistics for the app."""
    profiles = await db.health_profiles.count_documents({})
    plans = await db.supplement_plans.count_documents({})
    analyses = await db.symptom_analyses.count_documents({})

    total = profiles + plans + analyses
    # Round down to nearest hundred for social proof credibility
    display_count = max(100, (total // 100) * 100)

    return {
        "total_actions": total,
        "display_count": display_count,
        "profiles": profiles,
        "plans": plans,
    }
