"""Price alerts – notify users when products in their supplement plan drop in price."""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from core.config import db, get_products_collection
from routes.products import NUTRIENT_TAG_MAP, _parse_price

router = APIRouter()

PRICE_DROP_THRESHOLD = 0.10  # 10% drop triggers alert


@router.get("/price-alerts/{profile_id}")
async def get_price_alerts(profile_id: str, lang: str = "de"):
    """Get personalized price alerts for products matching the user's supplement plan."""

    # 1. Get user's supplement plan
    plan_doc = await db.supplement_plans.find_one(
        {"profile_id": profile_id}, {"_id": 0, "plan": 1}
    )
    if not plan_doc or not plan_doc.get("plan"):
        return {"alerts": [], "first_name": None}

    plan = plan_doc["plan"]
    nutrient_ids = [s.get("id") for s in plan.get("stack", []) if s.get("id")]

    if not nutrient_ids:
        return {"alerts": [], "first_name": None}

    # 2. Get user's first name for personalization
    profile = await db.health_profiles.find_one(
        {"id": profile_id}, {"_id": 0, "first_name": 1}
    )
    first_name = (profile or {}).get("first_name") or None

    # 3. Get recent price changes (last 30 days)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    price_changes = await db.price_history.find(
        {"lang": lang, "changed_at": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("changed_at", -1).limit(200).to_list(200)

    if not price_changes:
        return {"alerts": [], "first_name": first_name}

    # 4. Build product_id -> price change map (latest change per product)
    product_changes = {}
    for pc in price_changes:
        pid = pc["product_id"]
        if pid not in product_changes:
            product_changes[pid] = pc

    # 5. For each nutrient in plan, find matching products with price drops
    collection = await get_products_collection(lang)
    alerts = []

    for nutrient_id in nutrient_ids:
        tags = NUTRIENT_TAG_MAP.get(nutrient_id, [])
        if not tags:
            continue

        regex_pattern = f"^({'|'.join(tags)})$"
        products = await collection.find(
            {"tags": {"$elemMatch": {"$regex": regex_pattern, "$options": "i"}}},
            {"_id": 0, "product_id": 1, "name": 1, "price": 1, "affiliate_url": 1, "image_url": 1, "servings": 1}
        ).limit(20).to_list(20)

        for product in products:
            pid = product["product_id"]
            if pid not in product_changes:
                continue

            change = product_changes[pid]
            old_price = _parse_price(change["old_price"])
            new_price = _parse_price(change["new_price"])

            if not old_price or not new_price or old_price <= 0:
                continue

            drop_pct = (old_price - new_price) / old_price
            if drop_pct < PRICE_DROP_THRESHOLD:
                continue

            # Calculate new price per day
            servings = product.get("servings")
            if servings and isinstance(servings, (int, float)) and servings > 0:
                new_per_day = round(new_price / servings, 2)
            else:
                new_per_day = round(new_price / 30, 2)

            # Get nutrient display name from plan
            nutrient_name = nutrient_id
            for s in plan.get("stack", []):
                if s.get("id") == nutrient_id:
                    nutrient_name = s.get("name", nutrient_id)
                    break

            alerts.append({
                "product_id": pid,
                "product_name": product.get("name", ""),
                "nutrient_id": nutrient_id,
                "nutrient_name": nutrient_name,
                "old_price": round(old_price, 2),
                "new_price": round(new_price, 2),
                "drop_percent": round(drop_pct * 100),
                "price_per_day": new_per_day,
                "affiliate_url": product.get("affiliate_url", ""),
                "image_url": product.get("image_url", ""),
                "changed_at": change["changed_at"],
            })

    # Sort by drop percentage (biggest drops first) and limit
    alerts.sort(key=lambda a: a["drop_percent"], reverse=True)
    return {"alerts": alerts[:5], "first_name": first_name}
