from fastapi import APIRouter
from core.config import db

router = APIRouter()


@router.get("/products")
async def get_products(tags: str = "", lang: str = "de"):
    """Get products from MongoDB, optionally filtered by tags."""
    collection = db.products_de if lang == "de" else db.products_it
    
    if not tags:
        # Return all products, exclude MongoDB _id
        cursor = collection.find({}, {"_id": 0})
        return await cursor.to_list(length=None)
    
    # Filter by tags (case-insensitive)
    tag_list = [t.strip().lower() for t in tags.split(",")]
    cursor = collection.find(
        {"tags": {"$elemMatch": {"$regex": f"^({'|'.join(tag_list)})$", "$options": "i"}}},
        {"_id": 0}
    )
    return await cursor.to_list(length=None)


@router.get("/recipes")
async def get_recipes(tags: str = "", lang: str = "de"):
    """Get recipes from MongoDB, optionally filtered by symptom_tags."""
    cursor = db.recipes.find({}, {"_id": 0})
    recipes_raw = await cursor.to_list(length=None)
    
    results = []
    for r in recipes_raw:
        loc = r.get(lang, r.get("de", {}))
        results.append({
            "id": r["id"],
            "title": loc.get("title", ""),
            "ingredients": loc.get("ingredients", []),
            "steps": loc.get("steps", []),
            "time_min": r.get("time_min", 20),
            "tags": loc.get("tags", []),
            "symptom_tags": r.get("symptom_tags", []),
            "image_url": r.get("image_url", ""),
        })
    
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        filtered = [
            r for r in results
            if any(t in [st.lower() for st in r["symptom_tags"]] for t in tag_list)
        ]
        return filtered
    
    return results


@router.get("/products/{product_id}")
async def get_product_by_id(product_id: str, lang: str = "de"):
    """Get a single product by ID."""
    collection = db.products_de if lang == "de" else db.products_it
    product = await collection.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        return {"error": "Product not found"}
    return product


@router.get("/recipes/{recipe_id}")
async def get_recipe_by_id(recipe_id: str, lang: str = "de"):
    """Get a single recipe by ID."""
    recipe = await db.recipes.find_one({"id": recipe_id}, {"_id": 0})
    if not recipe:
        return {"error": "Recipe not found"}
    
    loc = recipe.get(lang, recipe.get("de", {}))
    return {
        "id": recipe["id"],
        "title": loc.get("title", ""),
        "ingredients": loc.get("ingredients", []),
        "steps": loc.get("steps", []),
        "time_min": recipe.get("time_min", 20),
        "tags": loc.get("tags", []),
        "symptom_tags": recipe.get("symptom_tags", []),
        "image_url": recipe.get("image_url", ""),
    }
