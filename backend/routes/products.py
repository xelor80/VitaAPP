from fastapi import APIRouter
from core.config import db

router = APIRouter()

# Mapping: nutrient key → product tags
NUTRIENT_TAG_MAP = {
    "iron": ["eisen"],
    "zinc": ["zink"],
    "omega3": ["omega-3"],
    "vitamin_d": ["vitamin-d"],
    "vitamin_b12": ["b-vitamine"],
    "vitamin_c": ["vitamin-c"],
    "magnesium": ["magnesium"],
    "calcium": ["calcium"],
    "b_vitamins": ["b-vitamine"],
    "coq10": ["q10"],
    "probiotics": ["probiotika"],
    "folate": ["b-vitamine"],
    "selenium": ["mineralstoffe"],
    "iodine": ["mineralstoffe"],
    "vitamin_k2": ["knochen", "calcium"],
    "vitamin_e": ["antioxidantien", "zellschutz"],
}

NUTRIENT_QUALITY_INFO = {
    "iron": {"daily_dose_hint": "14-20 mg", "form": "Eisen-Bisglycinat", "tip": "Nicht zusammen mit Kaffee/Tee einnehmen"},
    "zinc": {"daily_dose_hint": "10-15 mg", "form": "Kolloidales Zink", "tip": "Am besten abends, nüchtern einnehmen"},
    "omega3": {"daily_dose_hint": "1-2 g EPA/DHA", "form": "Triglycerid-Form", "tip": "Zu einer fetthaltigen Mahlzeit einnehmen"},
    "vitamin_d": {"daily_dose_hint": "1000-4000 IE", "form": "Vitamin D3 + K2", "tip": "Immer mit Fett einnehmen"},
    "vitamin_b12": {"daily_dose_hint": "500-1000 µg", "form": "Methylcobalamin", "tip": "Morgens sublingual einnehmen"},
    "vitamin_c": {"daily_dose_hint": "500-1000 mg", "form": "Retard-Form", "tip": "Über den Tag verteilt einnehmen"},
    "magnesium": {"daily_dose_hint": "300-400 mg", "form": "Magnesiumcitrat", "tip": "Abends einnehmen für besseren Schlaf"},
    "calcium": {"daily_dose_hint": "500-1000 mg", "form": "Calciumcitrat", "tip": "Nicht zusammen mit Eisen einnehmen"},
    "b_vitamins": {"daily_dose_hint": "Komplex", "form": "Bioaktive Formen", "tip": "Morgens einnehmen für Energie"},
    "coq10": {"daily_dose_hint": "100-200 mg", "form": "Ubiquinol", "tip": "Mit einer fetthaltigen Mahlzeit einnehmen"},
    "probiotics": {"daily_dose_hint": "10-20 Mrd. KBE", "form": "Mehrere Stämme", "tip": "Morgens nüchtern einnehmen"},
}


@router.get("/products/by-nutrient/{nutrient}")
async def get_products_by_nutrient(nutrient: str, lang: str = "de"):
    """Get products matched to a specific nutrient deficiency."""
    tags = NUTRIENT_TAG_MAP.get(nutrient, [])
    if not tags:
        return {"products": [], "quality_info": None}

    collection = db.products_de if lang == "de" else db.products_it
    regex_pattern = f"^({'|'.join(tags)})$"
    cursor = collection.find(
        {"tags": {"$elemMatch": {"$regex": regex_pattern, "$options": "i"}}},
        {"_id": 0}
    )
    products = await cursor.to_list(length=None)
    quality_info = NUTRIENT_QUALITY_INFO.get(nutrient)
    return {"products": products, "quality_info": quality_info}



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
    cursor = db.recipes.find({"active": {"$ne": False}}, {"_id": 0})
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


# Complaint name → recipe symptom_tags mapping
COMPLAINT_TAG_MAP = {
    "fatigue": ["müdigkeit", "energie", "stanchezza", "energia"],
    "headache": ["kopfschmerzen", "mal di testa", "entzündung"],
    "digestive": ["verdauung", "darm", "digestione"],
    "joint_pain": ["gelenkschmerzen", "dolori articolari", "gelenke"],
    "muscle_pain": ["rückenschmerzen", "muskeln", "mal di schiena"],
    "skin_problems": ["hautprobleme", "haut", "pelle", "problemi di pelle"],
    "hair_loss": ["hautprobleme", "haut", "pelle"],
    "concentration": ["konzentration", "gedächtnis", "concentrazione", "memoria"],
    "mood_swings": ["stress", "stimmung", "nerven"],
    "anxiety_symptoms": ["stress", "nerven", "entspannung"],
    "sleep_problems": ["schlafprobleme", "schlaf", "sonno", "problemi di sonno"],
    "weight_issues": ["verdauung", "energie"],
    "immune_weakness": ["immunsystem", "erkältung", "sistema immunitario", "raffreddore"],
    "cold_hands_feet": ["energie", "müdigkeit"],
}


@router.get("/recipes/recommendations")
async def get_recipe_recommendations(profile_id: str = "", lang: str = "de", limit: int = 3):
    """Get personalized recipe recommendations based on user's health profile."""
    import random

    cursor = db.recipes.find({}, {"_id": 0})
    recipes_raw = await cursor.to_list(length=None)

    all_recipes = []
    for r in recipes_raw:
        loc = r.get(lang, r.get("de", {}))
        all_recipes.append({
            "id": r["id"],
            "title": loc.get("title", ""),
            "ingredients": loc.get("ingredients", []),
            "steps": loc.get("steps", []),
            "time_min": r.get("time_min", 20),
            "tags": loc.get("tags", []),
            "symptom_tags": r.get("symptom_tags", []),
            "image_url": r.get("image_url", ""),
        })

    matched = []
    reason_map = {}

    if profile_id:
        profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
        if profile:
            complaints = profile.get("complaints", [])
            # Sort complaints by intensity (highest first)
            complaints.sort(key=lambda c: int(c.get("intensity", 0)), reverse=True)

            for complaint in complaints:
                c_name = complaint.get("name", "")
                tags_to_match = COMPLAINT_TAG_MAP.get(c_name, [])
                if not tags_to_match:
                    continue

                for recipe in all_recipes:
                    if recipe["id"] in [m["id"] for m in matched]:
                        continue
                    recipe_st = [st.lower() for st in recipe["symptom_tags"]]
                    if any(t.lower() in recipe_st for t in tags_to_match):
                        matched.append(recipe)
                        reason_map[recipe["id"]] = c_name

                if len(matched) >= limit * 2:
                    break

    # If not enough matched, fill with random popular recipes
    if len(matched) < limit:
        remaining = [r for r in all_recipes if r["id"] not in [m["id"] for m in matched]]
        random.shuffle(remaining)
        for r in remaining:
            if len(matched) >= limit:
                break
            matched.append(r)

    # Trim to limit and add reason
    result = []
    for r in matched[:limit]:
        r["recommendation_reason"] = reason_map.get(r["id"], "")
        result.append(r)

    return result


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
