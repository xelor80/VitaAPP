from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

from core.config import db

router = APIRouter(prefix="/admin", tags=["admin"])


# ============== MODELS ==============
class ProductCreate(BaseModel):
    product_id: str
    name: str
    description: str = ""
    tags: list[str] = []
    affiliate_url: str = ""
    image_url: str = ""
    price: str = ""
    rating: str = ""
    application_instructions: str = ""
    video_url: str = ""  # Only for IT products


class RecipeCreate(BaseModel):
    id: str
    de: dict  # {"title", "ingredients", "steps", "tags"}
    it: dict  # {"title", "ingredients", "steps", "tags"}
    time_min: int = 20
    symptom_tags: list[str] = []
    image_url: str = ""


# ============== HEALTH & STATS ==============
@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/stats")
async def get_stats():
    """Get overall system statistics."""
    products_de = await db.products_de.count_documents({})
    products_it = await db.products_it.count_documents({})
    recipes = await db.recipes.count_documents({})
    analyses = await db.analyses.count_documents({})
    clicks = await db.clicks.count_documents({})
    diary_entries = await db.diary_entries.count_documents({})
    
    return {
        "products_de": products_de,
        "products_it": products_it,
        "recipes": recipes,
        "analyses": analyses,
        "affiliate_clicks": clicks,
        "diary_entries": diary_entries,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ============== LLM LOGS ==============
@router.get("/llm-logs")
async def get_llm_logs(limit: int = 20, endpoint: str = None):
    query = {}
    if endpoint:
        query["endpoint"] = endpoint
    logs = await db.llm_responses.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 100)).to_list(min(limit, 100))

    total = await db.llm_responses.count_documents({})
    success_count = await db.llm_responses.count_documents({"success": True})
    avg_pipeline = [{"$match": {"success": True}}, {"$group": {"_id": None, "avg_latency": {"$avg": "$latency_ms"}}}]
    avg_result = await db.llm_responses.aggregate(avg_pipeline).to_list(1)
    avg_latency = int(avg_result[0]["avg_latency"]) if avg_result else 0

    return {
        "stats": {
            "total_calls": total,
            "success_rate": f"{(success_count/total*100):.1f}%" if total > 0 else "0%",
            "avg_latency_ms": avg_latency,
        },
        "logs": logs
    }


# ============== PRODUCTS CRUD ==============
@router.get("/products")
async def list_products(lang: str = "de", search: str = "", skip: int = 0, limit: int = 50):
    """List products with optional search."""
    collection = db.products_de if lang == "de" else db.products_it
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"product_id": {"$regex": search, "$options": "i"}}
        ]
    
    total = await collection.count_documents(query)
    products = await collection.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {"total": total, "products": products, "lang": lang}


@router.post("/products")
async def create_product(product: ProductCreate, lang: str = "de"):
    """Create a new product."""
    collection = db.products_de if lang == "de" else db.products_it
    
    # Check if product_id already exists
    existing = await collection.find_one({"product_id": product.product_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with ID '{product.product_id}' already exists")
    
    product_data = product.model_dump()
    product_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await collection.insert_one(product_data)
    return {"success": True, "product_id": product.product_id, "lang": lang}


@router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate, lang: str = "de"):
    """Update an existing product."""
    collection = db.products_de if lang == "de" else db.products_it
    
    existing = await collection.find_one({"product_id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_data = product.model_dump()
    product_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await collection.update_one({"product_id": product_id}, {"$set": product_data})
    return {"success": True, "product_id": product_id, "lang": lang}


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, lang: str = "de"):
    """Delete a product."""
    collection = db.products_de if lang == "de" else db.products_it
    
    result = await collection.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"success": True, "deleted": product_id, "lang": lang}


# ============== RECIPES CRUD ==============
@router.get("/recipes")
async def list_recipes(search: str = "", skip: int = 0, limit: int = 50):
    """List recipes with optional search."""
    query = {}
    if search:
        query["$or"] = [
            {"de.title": {"$regex": search, "$options": "i"}},
            {"it.title": {"$regex": search, "$options": "i"}},
            {"id": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.recipes.count_documents(query)
    recipes = await db.recipes.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {"total": total, "recipes": recipes}


@router.post("/recipes")
async def create_recipe(recipe: RecipeCreate):
    """Create a new recipe."""
    existing = await db.recipes.find_one({"id": recipe.id})
    if existing:
        raise HTTPException(status_code=400, detail=f"Recipe with ID '{recipe.id}' already exists")
    
    recipe_data = recipe.model_dump()
    recipe_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.recipes.insert_one(recipe_data)
    return {"success": True, "recipe_id": recipe.id}


@router.put("/recipes/{recipe_id}")
async def update_recipe(recipe_id: str, recipe: RecipeCreate):
    """Update an existing recipe."""
    existing = await db.recipes.find_one({"id": recipe_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    recipe_data = recipe.model_dump()
    recipe_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.recipes.update_one({"id": recipe_id}, {"$set": recipe_data})
    return {"success": True, "recipe_id": recipe_id}


@router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str):
    """Delete a recipe."""
    result = await db.recipes.delete_one({"id": recipe_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    return {"success": True, "deleted": recipe_id}


# ============== AFFILIATE CLICKS ==============
@router.get("/health-stats")
async def get_health_stats():
    """Get anonymized, aggregated health statistics from onboarding data."""
    total_profiles = await db.health_profiles.count_documents({})
    if total_profiles == 0:
        return {"total_profiles": 0, "message": "Keine Gesundheitsprofile vorhanden."}

    # Gender distribution
    gender_pipeline = [
        {"$group": {"_id": "$gender", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    gender_data = await db.health_profiles.aggregate(gender_pipeline).to_list(10)

    # Age distribution (buckets)
    age_pipeline = [
        {"$match": {"age": {"$ne": None}}},
        {"$bucket": {
            "groupBy": "$age",
            "boundaries": [0, 18, 25, 35, 45, 55, 65, 100],
            "default": "unbekannt",
            "output": {"count": {"$sum": 1}}
        }}
    ]
    age_data = await db.health_profiles.aggregate(age_pipeline).to_list(20)

    # Diet distribution
    diet_pipeline = [
        {"$match": {"diet": {"$ne": None}}},
        {"$group": {"_id": "$diet", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    diet_data = await db.health_profiles.aggregate(diet_pipeline).to_list(20)

    # Activity level distribution
    activity_pipeline = [
        {"$match": {"activity_level": {"$ne": None}}},
        {"$group": {"_id": "$activity_level", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    activity_data = await db.health_profiles.aggregate(activity_pipeline).to_list(20)

    # Top complaints
    complaints_pipeline = [
        {"$unwind": "$complaints"},
        {"$group": {"_id": "$complaints.name", "count": {"$sum": 1}, "avg_intensity": {"$avg": {"$toDouble": "$complaints.intensity"}}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    complaints_data = await db.health_profiles.aggregate(complaints_pipeline).to_list(15)

    # Top conditions
    conditions_pipeline = [
        {"$unwind": "$conditions"},
        {"$group": {"_id": "$conditions", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    conditions_data = await db.health_profiles.aggregate(conditions_pipeline).to_list(15)

    # Known deficiencies
    deficiencies_pipeline = [
        {"$unwind": "$known_deficiencies"},
        {"$group": {"_id": "$known_deficiencies", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    deficiencies_data = await db.health_profiles.aggregate(deficiencies_pipeline).to_list(15)

    # Sleep quality average
    sleep_pipeline = [
        {"$match": {"sleep_quality": {"$ne": None}}},
        {"$group": {"_id": None, "avg_quality": {"$avg": "$sleep_quality"}, "avg_duration": {"$avg": "$sleep_duration"}}}
    ]
    sleep_data = await db.health_profiles.aggregate(sleep_pipeline).to_list(1)

    # Stress level average
    stress_pipeline = [
        {"$match": {"stress_level": {"$ne": None}}},
        {"$group": {"_id": None, "avg_stress": {"$avg": "$stress_level"}, "avg_energy": {"$avg": "$energy_level"}}}
    ]
    stress_data = await db.health_profiles.aggregate(stress_pipeline).to_list(1)

    # Sleep issues distribution
    sleep_issues_pipeline = [
        {"$unwind": "$sleep_issues"},
        {"$group": {"_id": "$sleep_issues", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    sleep_issues_data = await db.health_profiles.aggregate(sleep_issues_pipeline).to_list(10)

    # Stress type distribution
    stress_type_pipeline = [
        {"$unwind": "$stress_type"},
        {"$group": {"_id": "$stress_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    stress_type_data = await db.health_profiles.aggregate(stress_type_pipeline).to_list(10)

    # Medications distribution
    medications_pipeline = [
        {"$unwind": "$medications"},
        {"$group": {"_id": "$medications", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 15}
    ]
    medications_data = await db.health_profiles.aggregate(medications_pipeline).to_list(15)

    # BMI distribution (calculated from height/weight)
    bmi_pipeline = [
        {"$match": {"height": {"$ne": None}, "weight": {"$ne": None}, "height": {"$gt": 0}}},
        {"$addFields": {"bmi": {"$divide": ["$weight", {"$pow": [{"$divide": ["$height", 100]}, 2]}]}}},
        {"$bucket": {
            "groupBy": "$bmi",
            "boundaries": [0, 18.5, 25, 30, 35, 100],
            "default": "unbekannt",
            "output": {"count": {"$sum": 1}}
        }}
    ]
    bmi_data = await db.health_profiles.aggregate(bmi_pipeline).to_list(10)

    # Profiles created over time (by month)
    timeline_pipeline = [
        {"$match": {"created_at": {"$ne": None}}},
        {"$addFields": {"month": {"$substr": ["$created_at", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 12}
    ]
    timeline_data = await db.health_profiles.aggregate(timeline_pipeline).to_list(12)

    return {
        "total_profiles": total_profiles,
        "gender": [{"label": g["_id"] or "unbekannt", "count": g["count"]} for g in gender_data],
        "age": [{"label": str(a["_id"]), "count": a["count"]} for a in age_data],
        "diet": [{"label": d["_id"] or "unbekannt", "count": d["count"]} for d in diet_data],
        "activity": [{"label": a["_id"] or "unbekannt", "count": a["count"]} for a in activity_data],
        "complaints": [{"label": c["_id"], "count": c["count"], "avg_intensity": round(c["avg_intensity"], 1) if c.get("avg_intensity") else None} for c in complaints_data],
        "conditions": [{"label": c["_id"], "count": c["count"]} for c in conditions_data],
        "deficiencies": [{"label": d["_id"], "count": d["count"]} for d in deficiencies_data],
        "sleep": sleep_data[0] if sleep_data else {},
        "stress": stress_data[0] if stress_data else {},
        "sleep_issues": [{"label": s["_id"], "count": s["count"]} for s in sleep_issues_data],
        "stress_types": [{"label": s["_id"], "count": s["count"]} for s in stress_type_data],
        "medications": [{"label": m["_id"], "count": m["count"]} for m in medications_data],
        "bmi": [{"label": str(b["_id"]), "count": b["count"]} for b in bmi_data],
        "timeline": [{"label": t["_id"], "count": t["count"]} for t in timeline_data],
    }


@router.get("/clicks")
async def get_clicks(days: int = 7, skip: int = 0, limit: int = 100):
    """Get detailed affiliate click statistics."""
    from datetime import timedelta
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff.isoformat()
    
    # Total clicks in period
    total = await db.clicks.count_documents({"timestamp": {"$gte": cutoff_str}})
    
    # By product (with name)
    pipeline_product = [
        {"$match": {"timestamp": {"$gte": cutoff_str}}},
        {"$group": {
            "_id": "$product_id",
            "product_name": {"$first": "$product_name"},
            "clicks": {"$sum": 1}
        }},
        {"$sort": {"clicks": -1}},
        {"$limit": 20}
    ]
    by_product = await db.clicks.aggregate(pipeline_product).to_list(20)
    
    # By country
    pipeline_country = [
        {"$match": {"timestamp": {"$gte": cutoff_str}}},
        {"$group": {"_id": "$country", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 10}
    ]
    by_country = await db.clicks.aggregate(pipeline_country).to_list(10)
    
    # By device type
    pipeline_device = [
        {"$match": {"timestamp": {"$gte": cutoff_str}}},
        {"$group": {"_id": "$device_type", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}}
    ]
    by_device = await db.clicks.aggregate(pipeline_device).to_list(10)
    
    # By day (for trend chart)
    pipeline_daily = [
        {"$match": {"timestamp": {"$gte": cutoff_str}}},
        {"$group": {"_id": "$date", "clicks": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    by_day = await db.clicks.aggregate(pipeline_daily).to_list(days)
    
    # By hour (heatmap data)
    pipeline_hour = [
        {"$match": {"timestamp": {"$gte": cutoff_str}}},
        {"$group": {"_id": "$hour", "clicks": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    by_hour = await db.clicks.aggregate(pipeline_hour).to_list(24)
    
    # By browser
    pipeline_browser = [
        {"$match": {"timestamp": {"$gte": cutoff_str}}},
        {"$group": {"_id": "$browser", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
        {"$limit": 5}
    ]
    by_browser = await db.clicks.aggregate(pipeline_browser).to_list(5)
    
    # Recent clicks with full details
    recent = await db.clicks.find(
        {}, {"_id": 0, "user_agent": 0}  # Exclude large fields
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "period_days": days,
        "total_clicks": total,
        "by_product": by_product,
        "by_country": by_country,
        "by_device": by_device,
        "by_day": by_day,
        "by_hour": by_hour,
        "by_browser": by_browser,
        "recent_clicks": recent
    }
