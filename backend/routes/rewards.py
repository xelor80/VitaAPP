from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from core.config import db, logger

router = APIRouter(prefix="/rewards", tags=["rewards"])

# ── Models ──

class GrantPointsRequest(BaseModel):
    profile_id: str
    action: str  # water_confirm, water_goal, supplement, medication, diary, daily_checkin, complete_day, streak_7, streak_14
    context: Optional[str] = None  # e.g. timing slot, supplement name

class RedeemRequest(BaseModel):
    reward_id: str

class AdminRewardSettingsUpdate(BaseModel):
    action_points: Optional[dict] = None
    daily_limits: Optional[dict] = None
    enabled: Optional[bool] = None

class AdminCatalogItem(BaseModel):
    title_de: str
    title_it: Optional[str] = ""
    title_en: Optional[str] = ""
    description_de: Optional[str] = ""
    description_it: Optional[str] = ""
    description_en: Optional[str] = ""
    image_url: Optional[str] = ""
    points_required: int
    category: str = "general"  # coupon, premium, download, partner, general
    reward_type: str = "coupon"  # coupon, premium, download, partner
    status: str = "active"  # active, inactive
    stock: Optional[int] = None  # None = unlimited
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    code_template: Optional[str] = None  # e.g. "VITA-{random}" for coupon generation
    min_level: int = 0  # 0 = no level requirement

# ── Default Settings ──

DEFAULT_SETTINGS = {
    "action_points": {
        "water_confirm": 5,
        "water_goal": 10,
        "supplement": 8,
        "medication": 8,
        "diary": 12,
        "daily_checkin": 5,
        "complete_day": 25,
        "streak_7": 50,
        "streak_14": 100,
    },
    "daily_limits": {
        "max_total": 200,
        "max_water_confirm": 30,
        "max_supplement": 40,
        "max_medication": 40,
    },
    "enabled": True,
}

# ── Helpers ──

def today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_reward_settings() -> dict:
    """Get reward settings from DB or return defaults."""
    settings = await db.reward_settings.find_one({}, {"_id": 0})
    if not settings:
        await db.reward_settings.insert_one({**DEFAULT_SETTINGS, "created_at": datetime.now(timezone.utc).isoformat()})
        return DEFAULT_SETTINGS
    return settings


async def get_today_points(profile_id: str, action: str = None) -> int:
    """Get total points earned today, optionally filtered by action."""
    today = today_str()
    query = {"profile_id": profile_id, "date": today}
    if action:
        query["action"] = action
    pipeline = [
        {"$match": query},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]
    result = await db.reward_events.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0


async def check_event_exists(profile_id: str, action: str, context: str = None) -> bool:
    """Check if a specific event already exists today."""
    query = {"profile_id": profile_id, "action": action, "date": today_str()}
    if context:
        query["context"] = context
    return await db.reward_events.find_one(query) is not None


async def update_streak(profile_id: str):
    """Update user streak after a qualifying action."""
    today = today_str()
    streak_doc = await db.user_streaks.find_one({"profile_id": profile_id}, {"_id": 0})

    if not streak_doc:
        streak_doc = {
            "profile_id": profile_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_activity_date": today,
        }
        await db.user_streaks.insert_one(streak_doc)
        return 1

    last_date = streak_doc.get("last_activity_date", "")
    if last_date == today:
        return streak_doc.get("current_streak", 1)

    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    if last_date == yesterday:
        new_streak = streak_doc.get("current_streak", 0) + 1
    else:
        new_streak = 1

    longest = max(streak_doc.get("longest_streak", 0), new_streak)
    await db.user_streaks.update_one(
        {"profile_id": profile_id},
        {"$set": {
            "current_streak": new_streak,
            "longest_streak": longest,
            "last_activity_date": today,
        }}
    )
    return new_streak


async def grant_points_internal(profile_id: str, action: str, context: str = None) -> dict:
    """Core logic for granting points. Returns {"granted": bool, "points": int, "message": str}."""
    settings = await get_reward_settings()

    if not settings.get("enabled", True):
        return {"granted": False, "points": 0, "message": "Reward system disabled"}

    action_points = settings.get("action_points", {})
    daily_limits = settings.get("daily_limits", {})
    points = action_points.get(action, 0)

    if points <= 0:
        return {"granted": False, "points": 0, "message": f"No points configured for action: {action}"}

    # Anti-abuse: Check if this specific event already happened today
    unique_actions = ["daily_checkin", "diary", "water_goal", "complete_day", "streak_7", "streak_14"]
    if action in unique_actions:
        if await check_event_exists(profile_id, action):
            return {"granted": False, "points": 0, "message": f"Already earned points for {action} today"}

    # For supplement/medication with context (timing slot), check per-slot
    if action in ("supplement", "medication") and context:
        if await check_event_exists(profile_id, action, context):
            return {"granted": False, "points": 0, "message": f"Already earned points for {action}/{context} today"}

    # Check daily limits per action type
    limit_key = f"max_{action}"
    action_limit = daily_limits.get(limit_key)
    if action_limit:
        today_action_pts = await get_today_points(profile_id, action)
        if today_action_pts + points > action_limit:
            return {"granted": False, "points": 0, "message": f"Daily limit for {action} reached"}

    # Check total daily limit
    max_total = daily_limits.get("max_total", 200)
    today_total = await get_today_points(profile_id)
    if today_total + points > max_total:
        return {"granted": False, "points": 0, "message": "Daily total limit reached"}

    # Grant the points
    now = datetime.now(timezone.utc)
    event = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "action": action,
        "points": points,
        "date": today_str(),
        "timestamp": now.isoformat(),
        "context": context,
    }
    await db.reward_events.insert_one(event)

    # Update user balance
    await db.user_points.update_one(
        {"profile_id": profile_id},
        {
            "$inc": {"current_balance": points, "lifetime_points": points},
            "$set": {"last_updated": now.isoformat()},
            "$setOnInsert": {"redeemed_points": 0},
        },
        upsert=True,
    )

    # Update streak
    streak = await update_streak(profile_id)

    # Check for streak bonuses
    streak_bonus = 0
    if streak == 7 and not await check_event_exists(profile_id, "streak_7"):
        streak_bonus = action_points.get("streak_7", 50)
        if streak_bonus > 0:
            streak_event = {
                "id": str(uuid.uuid4()),
                "profile_id": profile_id,
                "action": "streak_7",
                "points": streak_bonus,
                "date": today_str(),
                "timestamp": now.isoformat(),
                "context": "7-day streak bonus",
            }
            await db.reward_events.insert_one(streak_event)
            await db.user_points.update_one(
                {"profile_id": profile_id},
                {"$inc": {"current_balance": streak_bonus, "lifetime_points": streak_bonus}}
            )
    elif streak == 14 and not await check_event_exists(profile_id, "streak_14"):
        streak_bonus = action_points.get("streak_14", 100)
        if streak_bonus > 0:
            streak_event = {
                "id": str(uuid.uuid4()),
                "profile_id": profile_id,
                "action": "streak_14",
                "points": streak_bonus,
                "date": today_str(),
                "timestamp": now.isoformat(),
                "context": "14-day streak bonus",
            }
            await db.reward_events.insert_one(streak_event)
            await db.user_points.update_one(
                {"profile_id": profile_id},
                {"$inc": {"current_balance": streak_bonus, "lifetime_points": streak_bonus}}
            )

    total_granted = points + streak_bonus
    return {
        "granted": True,
        "points": points,
        "streak_bonus": streak_bonus,
        "total_granted": total_granted,
        "action": action,
        "streak": streak,
    }


# ══════════════════════════════════════
# USER ENDPOINTS
# ══════════════════════════════════════

@router.post("/grant")
async def grant_points(req: GrantPointsRequest):
    """Grant points for a user action. Server-side validated."""
    result = await grant_points_internal(req.profile_id, req.action, req.context)
    return result


@router.get("/{profile_id}/balance")
async def get_balance(profile_id: str):
    """Get user's current point balance."""
    balance = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
    if not balance:
        return {
            "profile_id": profile_id,
            "current_balance": 0,
            "lifetime_points": 0,
            "redeemed_points": 0,
        }
    balance.pop("_id", None)
    return balance


@router.get("/{profile_id}/history")
async def get_history(profile_id: str, days: int = 7, limit: int = 50):
    """Get user's recent reward events."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    events = await db.reward_events.find(
        {"profile_id": profile_id, "date": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return events


@router.get("/{profile_id}/today")
async def get_today_summary(profile_id: str, lang: str = "de"):
    """Get today's points summary with breakdown."""
    today = today_str()
    events = await db.reward_events.find(
        {"profile_id": profile_id, "date": today},
        {"_id": 0}
    ).to_list(100)

    total = sum(e.get("points", 0) for e in events)
    breakdown = {}
    for e in events:
        action = e.get("action", "unknown")
        breakdown[action] = breakdown.get(action, 0) + e.get("points", 0)

    streak = await db.user_streaks.find_one({"profile_id": profile_id}, {"_id": 0})
    balance = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})

    # Next reward hint
    next_reward = None
    current = balance.get("current_balance", 0) if balance else 0
    catalog_item = await db.rewards_catalog.find_one(
        {"status": "active", "points_required": {"$gt": current}},
        {"_id": 0, "title_de": 1, "title_it": 1, "title_en": 1, "points_required": 1},
        sort=[("points_required", 1)]
    )
    if catalog_item:
        title_field = f"title_{lang}" if f"title_{lang}" in catalog_item else "title_de"
        next_reward = {
            "title": catalog_item.get(title_field, catalog_item.get("title_de", "")),
            "points_required": catalog_item["points_required"],
            "points_remaining": catalog_item["points_required"] - current,
        }

    action_labels = {
        "de": {
            "water_confirm": "Wasser getrunken",
            "water_goal": "Wasserziel erreicht",
            "supplement": "Supplement eingenommen",
            "medication": "Medikament eingenommen",
            "diary": "Tagebuch ausgefuellt",
            "daily_checkin": "Taeglicher Check-in",
            "complete_day": "Kompletter Tag",
            "streak_7": "7-Tage-Streak",
            "streak_14": "14-Tage-Streak",
        },
        "it": {
            "water_confirm": "Acqua bevuta",
            "water_goal": "Obiettivo acqua raggiunto",
            "supplement": "Integratore assunto",
            "medication": "Farmaco assunto",
            "diary": "Diario compilato",
            "daily_checkin": "Check-in giornaliero",
            "complete_day": "Giornata completa",
            "streak_7": "Serie di 7 giorni",
            "streak_14": "Serie di 14 giorni",
        },
    }
    labels = action_labels.get(lang, action_labels["de"])

    return {
        "today_points": total,
        "breakdown": breakdown,
        "action_labels": labels,
        "events_count": len(events),
        "current_balance": balance.get("current_balance", 0) if balance else 0,
        "current_streak": streak.get("current_streak", 0) if streak else 0,
        "next_reward": next_reward,
    }


@router.get("/{profile_id}/streaks")
async def get_streaks(profile_id: str):
    """Get user's streak data."""
    streak = await db.user_streaks.find_one({"profile_id": profile_id}, {"_id": 0})
    if not streak:
        return {
            "profile_id": profile_id,
            "current_streak": 0,
            "longest_streak": 0,
            "last_activity_date": None,
        }
    streak.pop("_id", None)
    return streak


# ══════════════════════════════════════
# CATALOG ENDPOINTS
# ══════════════════════════════════════

@router.get("/catalog/list")
async def get_catalog(lang: str = "de", profile_id: str = None):
    """Get available rewards catalog for users."""
    from routes.level import calc_level

    now = datetime.now(timezone.utc).isoformat()
    query = {"status": "active"}
    items = await db.rewards_catalog.find(query, {"_id": 0}).sort("points_required", 1).to_list(100)

    # Filter by date validity
    valid_items = []
    for item in items:
        if item.get("start_date") and item["start_date"] > now[:10]:
            continue
        if item.get("end_date") and item["end_date"] < now[:10]:
            continue
        if item.get("stock") is not None and item["stock"] <= 0:
            continue
        valid_items.append(item)

    # Get user balance + level for status calculation
    user_balance = 0
    user_level = 1
    redeemed_ids = set()
    if profile_id:
        balance = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
        user_balance = balance.get("current_balance", 0) if balance else 0
        total_pts = balance.get("lifetime_points", 0) if balance else 0
        user_level = calc_level(total_pts, lang).get("level", 1)
        redemptions = await db.reward_redemptions.find(
            {"profile_id": profile_id}, {"_id": 0, "reward_id": 1}
        ).to_list(100)
        redeemed_ids = {r["reward_id"] for r in redemptions}

    # Build response with status
    catalog = []
    for item in valid_items:
        title_field = f"title_{lang}" if f"title_{lang}" in item else "title_de"
        desc_field = f"description_{lang}" if f"description_{lang}" in item else "description_de"
        min_level = item.get("min_level", 0)

        status = "locked"
        if item["id"] in redeemed_ids:
            status = "redeemed"
        elif min_level > 0 and user_level < min_level:
            status = "level_locked"
        elif user_balance >= item["points_required"]:
            status = "available"

        catalog.append({
            "id": item["id"],
            "title": item.get(title_field, item.get("title_de", "")),
            "description": item.get(desc_field, item.get("description_de", "")),
            "image_url": item.get("image_url", ""),
            "points_required": item["points_required"],
            "category": item.get("category", "general"),
            "reward_type": item.get("reward_type", "coupon"),
            "status": status,
            "points_remaining": max(0, item["points_required"] - user_balance) if status == "locked" else 0,
            "min_level": min_level,
            "user_level": user_level,
        })

    return catalog


@router.post("/{profile_id}/redeem")
async def redeem_reward(profile_id: str, req: RedeemRequest):
    """Redeem a reward from the catalog."""
    from routes.level import calc_level

    # Get reward
    reward = await db.rewards_catalog.find_one({"id": req.reward_id, "status": "active"}, {"_id": 0})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found or inactive")

    # Check stock
    if reward.get("stock") is not None and reward["stock"] <= 0:
        raise HTTPException(status_code=400, detail="Reward out of stock")

    # Get user balance first (needed for both level and points checks)
    balance = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
    
    # Check level requirement FIRST (more fundamental restriction)
    min_level = reward.get("min_level", 0)
    if min_level > 0:
        total_pts = balance.get("lifetime_points", 0) if balance else 0
        user_level = calc_level(total_pts).get("level", 1)
        if user_level < min_level:
            raise HTTPException(status_code=400, detail=f"Level {min_level} required (current: {user_level})")

    # Check balance
    current = balance.get("current_balance", 0) if balance else 0
    if current < reward["points_required"]:
        raise HTTPException(status_code=400, detail="Not enough points")

    # Check if already redeemed (for one-time rewards)
    existing = await db.reward_redemptions.find_one(
        {"profile_id": profile_id, "reward_id": req.reward_id}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already redeemed")

    # Deduct points
    now = datetime.now(timezone.utc)
    await db.user_points.update_one(
        {"profile_id": profile_id},
        {
            "$inc": {"current_balance": -reward["points_required"], "redeemed_points": reward["points_required"]},
            "$set": {"last_updated": now.isoformat()},
        }
    )

    # Decrease stock if applicable
    if reward.get("stock") is not None:
        await db.rewards_catalog.update_one(
            {"id": req.reward_id},
            {"$inc": {"stock": -1}}
        )

    # Generate code if coupon
    code = None
    if reward.get("reward_type") == "coupon" and reward.get("code_template"):
        import secrets
        random_part = secrets.token_hex(4).upper()
        code = reward["code_template"].replace("{random}", random_part)

    # Save redemption
    redemption = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "reward_id": req.reward_id,
        "reward_title": reward.get("title_de", ""),
        "points_spent": reward["points_required"],
        "redeemed_at": now.isoformat(),
        "status": "fulfilled" if code else "pending",
        "code": code,
    }
    await db.reward_redemptions.insert_one(redemption)

    return {
        "success": True,
        "redemption_id": redemption["id"],
        "code": code,
        "points_spent": reward["points_required"],
        "new_balance": current - reward["points_required"],
        "status": redemption["status"],
    }


@router.get("/{profile_id}/redemptions")
async def get_redemptions(profile_id: str):
    """Get user's redeemed rewards."""
    redemptions = await db.reward_redemptions.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).sort("redeemed_at", -1).to_list(50)
    return redemptions


# ══════════════════════════════════════
# ADMIN ENDPOINTS
# ══════════════════════════════════════

@router.get("/admin/settings")
async def get_admin_settings():
    """Get reward system settings (admin)."""
    return await get_reward_settings()


@router.put("/admin/settings")
async def update_admin_settings(data: AdminRewardSettingsUpdate):
    """Update reward system settings (admin)."""
    update = {}
    if data.action_points is not None:
        update["action_points"] = data.action_points
    if data.daily_limits is not None:
        update["daily_limits"] = data.daily_limits
    if data.enabled is not None:
        update["enabled"] = data.enabled

    if update:
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.reward_settings.update_one({}, {"$set": update}, upsert=True)

    return await get_reward_settings()


@router.get("/admin/catalog")
async def admin_list_catalog():
    """List all catalog items (admin, including inactive)."""
    items = await db.rewards_catalog.find({}, {"_id": 0}).sort("points_required", 1).to_list(200)
    return items


@router.post("/admin/catalog")
async def admin_create_catalog_item(item: AdminCatalogItem):
    """Create a new reward catalog item (admin)."""
    doc = item.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.rewards_catalog.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/admin/catalog/{item_id}")
async def admin_update_catalog_item(item_id: str, item: AdminCatalogItem):
    """Update a reward catalog item (admin)."""
    update = item.model_dump()
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.rewards_catalog.update_one({"id": item_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    updated = await db.rewards_catalog.find_one({"id": item_id}, {"_id": 0})
    return updated


@router.delete("/admin/catalog/{item_id}")
async def admin_delete_catalog_item(item_id: str):
    """Delete a reward catalog item (admin)."""
    result = await db.rewards_catalog.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"deleted": True}


@router.get("/admin/analytics")
async def admin_analytics(days: int = 30):
    """Get reward system analytics (admin)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    # Total points granted
    points_pipeline = [
        {"$match": {"date": {"$gte": cutoff}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}, "count": {"$sum": 1}}}
    ]
    points_result = await db.reward_events.aggregate(points_pipeline).to_list(1)
    total_points = points_result[0]["total"] if points_result else 0
    total_events = points_result[0]["count"] if points_result else 0

    # Points by action
    action_pipeline = [
        {"$match": {"date": {"$gte": cutoff}}},
        {"$group": {"_id": "$action", "total": {"$sum": "$points"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}}
    ]
    action_result = await db.reward_events.aggregate(action_pipeline).to_list(20)
    by_action = {r["_id"]: {"points": r["total"], "count": r["count"]} for r in action_result}

    # Points by day
    daily_pipeline = [
        {"$match": {"date": {"$gte": cutoff}}},
        {"$group": {"_id": "$date", "total": {"$sum": "$points"}, "users": {"$addToSet": "$profile_id"}}},
        {"$sort": {"_id": -1}},
        {"$limit": 30}
    ]
    daily_result = await db.reward_events.aggregate(daily_pipeline).to_list(30)
    daily = [{"date": r["_id"], "points": r["total"], "unique_users": len(r["users"])} for r in daily_result]

    # Redemptions
    redemption_count = await db.reward_redemptions.count_documents({"redeemed_at": {"$gte": cutoff + "T00:00:00"}})

    # Active users (with points)
    active_users = await db.user_points.count_documents({"lifetime_points": {"$gt": 0}})

    # Avg streak
    streak_pipeline = [
        {"$match": {"current_streak": {"$gt": 0}}},
        {"$group": {"_id": None, "avg": {"$avg": "$current_streak"}, "max": {"$max": "$longest_streak"}}}
    ]
    streak_result = await db.user_streaks.aggregate(streak_pipeline).to_list(1)

    return {
        "period_days": days,
        "total_points_granted": total_points,
        "total_events": total_events,
        "by_action": by_action,
        "daily": daily,
        "redemptions": redemption_count,
        "active_users": active_users,
        "avg_streak": round(streak_result[0]["avg"], 1) if streak_result else 0,
        "max_streak": streak_result[0]["max"] if streak_result else 0,
    }
