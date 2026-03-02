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
async def get_recipes(tags: str = "", lang: str = "de", search: str = "", category: str = "", max_time: int = 0):
    """Get recipes from MongoDB with search, category and time filters."""
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
    
    # Filter by symptom_tags
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        results = [
            r for r in results
            if any(t in [st.lower() for st in r["symptom_tags"]] for t in tag_list)
        ]
    
    # Filter by category (symptom group)
    if category:
        cat_lower = category.lower()
        results = [
            r for r in results
            if any(cat_lower in st.lower() for st in r["symptom_tags"])
        ]
    
    # Filter by text search
    if search:
        s = search.lower()
        results = [
            r for r in results
            if s in r["title"].lower()
            or any(s in ing.lower() for ing in r["ingredients"])
            or any(s in tag.lower() for tag in r["tags"])
        ]
    
    # Filter by max preparation time
    if max_time > 0:
        results = [r for r in results if r["time_min"] <= max_time]
    
    return results


@router.get("/recipes/filters")
async def get_recipe_filters(lang: str = "de"):
    """Get available filter options for the recipe catalog."""
    cursor = db.recipes.find({}, {"_id": 0})
    recipes_raw = await cursor.to_list(length=None)
    
    # Collect unique categories from symptom_tags and tags
    category_map_de = {
        "müdigkeit": "Energie & Müdigkeit",
        "kopfschmerzen": "Kopfschmerzen",
        "verdauung": "Verdauung",
        "gelenkschmerzen": "Gelenkschmerzen",
        "schlafprobleme": "Schlaf",
        "stress": "Stress",
        "erkältung": "Erkältung & Immunsystem",
        "hautprobleme": "Haut & Haare",
        "rückenschmerzen": "Rückenschmerzen",
        "konzentration": "Konzentration & Gedächtnis",
    }
    category_map_it = {
        "stanchezza": "Energia & Stanchezza",
        "mal di testa": "Mal di testa",
        "digestione": "Digestione",
        "dolori articolari": "Dolori articolari",
        "problemi di sonno": "Sonno",
        "stress": "Stress",
        "raffreddore": "Raffreddore & Sistema immunitario",
        "problemi di pelle": "Pelle & Capelli",
        "mal di schiena": "Mal di schiena",
        "concentrazione": "Concentrazione & Memoria",
    }
    
    cat_map = category_map_de if lang == "de" else category_map_it
    
    categories = []
    all_tags = set()
    time_values = set()
    
    for r in recipes_raw:
        loc = r.get(lang, r.get("de", {}))
        for tag in loc.get("tags", []):
            all_tags.add(tag)
        time_values.add(r.get("time_min", 20))
        for st in r.get("symptom_tags", []):
            if st.lower() in cat_map:
                cat_entry = {"key": st.lower(), "label": cat_map[st.lower()]}
                if cat_entry not in categories:
                    categories.append(cat_entry)
    
    return {
        "categories": categories,
        "tags": sorted(all_tags),
        "time_options": sorted(time_values),
    }


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
