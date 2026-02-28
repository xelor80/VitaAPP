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
