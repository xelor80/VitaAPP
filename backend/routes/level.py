from fastapi import APIRouter
from datetime import datetime, timezone, timedelta

from core.config import db, logger

router = APIRouter(prefix="/level", tags=["level"])


# ── Configurable Level Thresholds ──

LEVEL_CONFIG = [
    {"level": 1, "required_points": 0, "title_de": "Start", "title_it": "Inizio", "icon": "seed-outline"},
    {"level": 2, "required_points": 50, "title_de": "Einstieg", "title_it": "Primo passo", "icon": "sprout"},
    {"level": 3, "required_points": 150, "title_de": "Bewusst", "title_it": "Consapevole", "icon": "sprout-outline"},
    {"level": 4, "required_points": 300, "title_de": "Aktiv", "title_it": "Attivo", "icon": "leaf"},
    {"level": 5, "required_points": 500, "title_de": "Routine", "title_it": "Routine", "icon": "tree"},
    {"level": 6, "required_points": 800, "title_de": "Diszipliniert", "title_it": "Disciplinato", "icon": "shield-check"},
    {"level": 7, "required_points": 1200, "title_de": "Fortgeschritten", "title_it": "Avanzato", "icon": "star-outline"},
    {"level": 8, "required_points": 1800, "title_de": "Optimiert", "title_it": "Ottimizzato", "icon": "star-four-points"},
    {"level": 9, "required_points": 2500, "title_de": "Meister", "title_it": "Maestro", "icon": "crown"},
    {"level": 10, "required_points": 3500, "title_de": "Experte", "title_it": "Esperto", "icon": "trophy"},
    {"level": 11, "required_points": 5000, "title_de": "Legende", "title_it": "Leggenda", "icon": "trophy-variant"},
    {"level": 12, "required_points": 7000, "title_de": "Gesundheits-Held", "title_it": "Eroe della salute", "icon": "medal"},
]


def calc_level(total_points: int, lang: str = "de") -> dict:
    current = LEVEL_CONFIG[0]
    for cfg in LEVEL_CONFIG:
        if total_points >= cfg["required_points"]:
            current = cfg
        else:
            break

    lvl = current["level"]
    title_key = f"title_{lang}" if f"title_{lang}" in current else "title_de"
    title = current.get(title_key, current["title_de"])

    if lvl < len(LEVEL_CONFIG):
        next_cfg = LEVEL_CONFIG[lvl]
        next_at = next_cfg["required_points"]
        pts_in_level = total_points - current["required_points"]
        pts_needed = next_at - current["required_points"]
        pct = round(pts_in_level / pts_needed * 100) if pts_needed > 0 else 100
    else:
        next_at = total_points
        pts_in_level = 0
        pts_needed = 0
        pct = 100

    return {
        "level": lvl,
        "title": title,
        "icon": current["icon"],
        "total_points": total_points,
        "current_threshold": current["required_points"],
        "next_level_at": next_at,
        "points_in_level": pts_in_level,
        "points_to_next": max(0, next_at - total_points),
        "progress_pct": min(100, max(0, pct)),
    }


@router.get("/config")
async def get_level_config():
    """Return the full level configuration."""
    return {"levels": LEVEL_CONFIG}


@router.get("/{profile_id}")
async def get_user_level(profile_id: str, lang: str = "de"):
    """Get detailed level info for a user including level-up detection."""
    points_doc = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
    total_points = points_doc.get("total_earned", 0) if points_doc else 0

    level_info = calc_level(total_points, lang)

    # Level-up detection
    stored = await db.user_levels.find_one({"profile_id": profile_id}, {"_id": 0})
    last_known_level = stored.get("current_level", 0) if stored else 0
    leveled_up = level_info["level"] > last_known_level and last_known_level > 0

    # Persist current level
    await db.user_levels.update_one(
        {"profile_id": profile_id},
        {"$set": {
            "profile_id": profile_id,
            "current_level": level_info["level"],
            "total_points": total_points,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {
        **level_info,
        "leveled_up": leveled_up,
        "previous_level": last_known_level if leveled_up else None,
    }


@router.post("/{profile_id}/acknowledge-levelup")
async def acknowledge_levelup(profile_id: str):
    """Mark the level-up as acknowledged so it won't show again."""
    level_doc = await db.user_levels.find_one({"profile_id": profile_id}, {"_id": 0})
    if level_doc:
        await db.user_levels.update_one(
            {"profile_id": profile_id},
            {"$set": {"last_acknowledged_level": level_doc.get("current_level", 1)}},
        )
    return {"success": True}
