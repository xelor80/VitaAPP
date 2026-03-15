import os
import json
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from core.config import db, get_products_collection

router = APIRouter()

LANG_NAMES = {"de": "German", "it": "Italian", "en": "English", "tr": "Turkish", "fr": "French", "es": "Spanish", "ru": "Russian"}

async def translate_recipe(recipe: dict, lang: str) -> dict:
    """Translate recipe fields using AI and cache in DB."""
    if lang in recipe:
        return recipe[lang]
    
    source = recipe.get("de", {})
    if not source:
        return source
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=f"recipe-translate-{recipe.get('id','')}-{lang}",
            system_message=f"You are a translator. Translate recipe content to {LANG_NAMES.get(lang, 'English')}. Return ONLY valid JSON, no markdown, no explanation."
        )
        
        prompt = f"""Translate this recipe JSON to {LANG_NAMES.get(lang, 'English')}:
{{
  "title": "{source.get('title', '')}",
  "ingredients": {json.dumps(source.get('ingredients', []), ensure_ascii=False)},
  "steps": {json.dumps(source.get('steps', []), ensure_ascii=False)},
  "tags": {json.dumps(source.get('tags', []), ensure_ascii=False)}
}}"""
        
        resp = await chat.send_message(UserMessage(text=prompt))
        text = str(resp).strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        translated = json.loads(text)
        
        # Cache in DB
        await db.recipes.update_one(
            {"id": recipe["id"]},
            {"$set": {lang: translated}}
        )
        return translated
    except Exception as e:
        print(f"Recipe translation error ({lang}): {e}")
        return source

# Mapping: nutrient key -> (primary_tags, secondary_tags)
# Primary tags = specific to the nutrient (high relevance)
# Secondary tags = general health area (lower relevance)
NUTRIENT_TAG_MAP_SCORED = {
    "iron": {
        "primary_de": ["eisen", "iron"],
        "primary_it": ["ferro", "iron"],
        "secondary_de": ["müdigkeit", "blutarmut", "energie"],
        "secondary_it": ["stanchezza", "anemia", "energia"],
    },
    "zinc": {
        "primary_de": ["zink", "zinc"],
        "primary_it": ["zinco", "zinc"],
        "secondary_de": ["immunsystem", "haut"],
        "secondary_it": ["sistema immunitario", "pelle"],
    },
    "omega3": {
        "primary_de": ["omega-3", "omega", "omega 3", "epa", "dha"],
        "primary_it": ["omega-3", "omega", "omega 3", "epa", "dha"],
        "secondary_de": ["herz", "gehirn"],
        "secondary_it": ["cuore", "cervello"],
    },
    "vitamin_d": {
        "primary_de": ["vitamin-d", "vitamin d", "vitamin d3"],
        "primary_it": ["vitamina d", "vitamina d3", "vitamin d3"],
        "secondary_de": ["knochen", "immunsystem"],
        "secondary_it": ["ossa", "sistema immunitario"],
    },
    "vitamin_b12": {
        "primary_de": ["b12", "vitamin b12", "b-vitamine", "b-komplex"],
        "primary_it": ["b12", "vitamina b12", "b-complex", "vitamine b"],
        "secondary_de": ["nerven", "nervensystem"],
        "secondary_it": ["nervi", "sistema nervoso"],
    },
    "vitamin_c": {
        "primary_de": ["vitamin-c", "vitamin c"],
        "primary_it": ["vitamina-c", "vitamina c"],
        "secondary_de": ["immunsystem"],
        "secondary_it": ["sistema immunitario"],
    },
    "magnesium": {
        "primary_de": ["magnesium"],
        "primary_it": ["magnesio"],
        "secondary_de": ["muskeln", "schlaf", "nerven"],
        "secondary_it": ["muscoli", "sonno", "nervi"],
    },
    "calcium": {
        "primary_de": ["calcium", "kalzium"],
        "primary_it": ["calcio"],
        "secondary_de": ["knochen"],
        "secondary_it": ["ossa"],
    },
    "b_vitamins": {
        "primary_de": ["b-vitamine", "b-komplex"],
        "primary_it": ["vitamine b", "b-complex"],
        "secondary_de": ["nerven", "energie"],
        "secondary_it": ["nervi", "energia"],
    },
    "coq10": {
        "primary_de": ["q10", "coq10", "coenzym", "ubiquinol"],
        "primary_it": ["q10", "coq10", "coenzima", "ubiquinol"],
        "secondary_de": ["herz", "energie"],
        "secondary_it": ["cuore", "energia"],
    },
    "probiotics": {
        "primary_de": ["probiotika", "microbiom"],
        "primary_it": ["probiotici", "microbioma"],
        "secondary_de": ["darm", "verdauung"],
        "secondary_it": ["intestino", "digestione"],
    },
    "folate": {
        "primary_de": ["folat", "folsaeure"],
        "primary_it": ["folato", "acido folico"],
        "secondary_de": ["b-vitamine", "b-komplex"],
        "secondary_it": ["vitamine b", "b-complex"],
    },
    "selenium": {
        "primary_de": ["selen", "selenium"],
        "primary_it": ["selenio", "selenium"],
        "secondary_de": ["spurenelemente", "schilddruese"],
        "secondary_it": ["minerali", "tiroide"],
    },
    "iodine": {
        "primary_de": ["jod", "iodine"],
        "primary_it": ["iodio", "iodine"],
        "secondary_de": ["spurenelemente", "schilddruese"],
        "secondary_it": ["minerali", "tiroide"],
    },
    "vitamin_k2": {
        "primary_de": ["vitamin k", "k2"],
        "primary_it": ["vitamina k", "k2"],
        "secondary_de": ["knochen", "calcium"],
        "secondary_it": ["ossa", "calcio"],
    },
    "vitamin_e": {
        "primary_de": ["vitamin e", "tocopherol"],
        "primary_it": ["vitamina e", "tocopherol"],
        "secondary_de": ["antioxidantien", "zellschutz"],
        "secondary_it": ["antiossidanti", "cellule"],
    },
    "ashwagandha": {
        "primary_de": ["ashwagandha", "ksm-66"],
        "primary_it": ["ashwagandha", "ksm-66"],
        "secondary_de": ["stress", "cortisol", "entspannung"],
        "secondary_it": ["stress", "cortisolo", "rilassamento"],
    },
}

# Flat tag maps per language for DB queries
def _get_nutrient_tags(nutrient: str, lang: str) -> tuple[list[str], list[str]]:
    """Return (primary_tags, secondary_tags) for a nutrient in a given language."""
    scored = NUTRIENT_TAG_MAP_SCORED.get(nutrient)
    if not scored:
        return [], []
    primary = scored.get(f"primary_{lang}", scored.get("primary_de", []))
    secondary = scored.get(f"secondary_{lang}", scored.get("secondary_de", []))
    return primary, secondary

# Backwards-compatible flat map (primary tags only, language-specific)
NUTRIENT_TAG_MAP = {
    k: v["primary_de"] + v["primary_it"]
    for k, v in NUTRIENT_TAG_MAP_SCORED.items()
}

MAX_PRODUCTS_PER_NUTRIENT = 3


def _score_product(product: dict, nutrient: str, lang: str = "de") -> float:
    """Score a product by relevance to a specific nutrient. Higher = more relevant."""
    primary, secondary = _get_nutrient_tags(nutrient, lang)
    if not primary:
        return 0

    score = 0.0
    product_tags = [t.lower() for t in product.get("tags", [])]
    name_lower = product.get("name", "").lower()
    desc_lower = product.get("description", "").lower()

    # +20 if primary nutrient keyword in product name
    for pt in primary:
        if pt in name_lower:
            score += 20
            break

    # +8 if primary nutrient keyword in description
    for pt in primary:
        if pt in desc_lower:
            score += 8
            break

    # +5 per matching primary tag
    for pt in primary:
        if pt in product_tags:
            score += 5

    # +1 per matching secondary tag
    for st in secondary:
        if st in product_tags:
            score += 1

    # Bonus for specific supplement formats
    ptype = (product.get("product_type", "") or "").lower()
    if ptype in ("spray", "tropfen", "kapseln", "capsule", "gocce", "gummies"):
        score += 2

    return score

NUTRIENT_QUALITY_INFO = {
    "iron": {
        "daily_dose_hint": "14-20 mg",
        "form": {"de": "Eisen-Bisglycinat", "it": "Ferro bisglicinato"},
        "tip": {"de": "Nicht zusammen mit Kaffee/Tee einnehmen", "it": "Non assumere con caffe/te"}
    },
    "zinc": {
        "daily_dose_hint": "10-15 mg",
        "form": {"de": "Kolloidales Zink", "it": "Zinco colloidale"},
        "tip": {"de": "Am besten abends, nüchtern einnehmen", "it": "Meglio alla sera, a stomaco vuoto"}
    },
    "omega3": {
        "daily_dose_hint": "1-2 g EPA/DHA",
        "form": {"de": "Triglycerid-Form", "it": "Forma trigliceride"},
        "tip": {"de": "Zu einer fetthaltigen Mahlzeit einnehmen", "it": "Assumere con un pasto ricco di grassi"}
    },
    "vitamin_d": {
        "daily_dose_hint": "1000-4000 IE",
        "form": {"de": "Vitamin D3 + K2", "it": "Vitamina D3 + K2"},
        "tip": {"de": "Immer mit Fett einnehmen", "it": "Assumere sempre con grassi"}
    },
    "vitamin_b12": {
        "daily_dose_hint": "500-1000 mcg",
        "form": {"de": "Methylcobalamin", "it": "Metilcobalamina"},
        "tip": {"de": "Morgens sublingual einnehmen", "it": "Assumere al mattino per via sublinguale"}
    },
    "vitamin_c": {
        "daily_dose_hint": "500-1000 mg",
        "form": {"de": "Retard-Form", "it": "Forma a rilascio prolungato"},
        "tip": {"de": "Über den Tag verteilt einnehmen", "it": "Distribuire durante la giornata"}
    },
    "magnesium": {
        "daily_dose_hint": "300-400 mg",
        "form": {"de": "Magnesiumcitrat", "it": "Citrato di magnesio"},
        "tip": {"de": "Abends einnehmen für besseren Schlaf", "it": "Assumere alla sera per un sonno migliore"}
    },
    "calcium": {
        "daily_dose_hint": "500-1000 mg",
        "form": {"de": "Calciumcitrat", "it": "Citrato di calcio"},
        "tip": {"de": "Nicht zusammen mit Eisen einnehmen", "it": "Non assumere insieme al ferro"}
    },
    "b_vitamins": {
        "daily_dose_hint": {"de": "Komplex", "it": "Complesso"},
        "form": {"de": "Bioaktive Formen", "it": "Forme bioattive"},
        "tip": {"de": "Morgens einnehmen für Energie", "it": "Assumere al mattino per energia"}
    },
    "coq10": {
        "daily_dose_hint": "100-200 mg",
        "form": {"de": "Ubiquinol", "it": "Ubiquinolo"},
        "tip": {"de": "Mit einer fetthaltigen Mahlzeit einnehmen", "it": "Assumere con un pasto ricco di grassi"}
    },
    "probiotics": {
        "daily_dose_hint": {"de": "10-20 Mrd. KBE", "it": "10-20 mld. UFC"},
        "form": {"de": "Mehrere Stämme", "it": "Multi-ceppo"},
        "tip": {"de": "Morgens nüchtern einnehmen", "it": "Assumere al mattino a stomaco vuoto"}
    },
}


def _localize_quality_info(info: dict, lang: str) -> dict:
    """Return quality info with strings resolved for the given language."""
    if not info:
        return info
    result = {}
    for key, val in info.items():
        if isinstance(val, dict) and "de" in val:
            result[key] = val.get(lang, val["de"])
        else:
            result[key] = val
    return result


@router.get("/products/by-nutrient/{nutrient}")
async def get_products_by_nutrient(nutrient: str, lang: str = "de"):
    """Get top 3 most relevant products for a specific nutrient deficiency."""
    primary, secondary = _get_nutrient_tags(nutrient, lang)
    if not primary:
        return {"products": [], "quality_info": None}

    collection = await get_products_collection(lang)
    # Search ONLY with language-specific primary tags
    regex_pattern = f"^({'|'.join(primary)})$"
    cursor = collection.find(
        {"tags": {"$elemMatch": {"$regex": regex_pattern, "$options": "i"}}},
        {"_id": 0}
    )
    all_products = await cursor.to_list(length=500)

    # Deduplicate by product name (case-insensitive)
    seen_names = set()
    unique_products = []
    for p in all_products:
        name_key = p.get("name", "").strip().lower()
        if name_key not in seen_names:
            seen_names.add(name_key)
            unique_products.append(p)

    # Score and rank products by relevance
    scored = [(p, _score_product(p, nutrient, lang)) for p in unique_products]
    scored.sort(key=lambda x: x[1], reverse=True)
    top_products = [p for p, _ in scored[:MAX_PRODUCTS_PER_NUTRIENT]]

    quality_info = _localize_quality_info(NUTRIENT_QUALITY_INFO.get(nutrient), lang)
    return JSONResponse(
        content={"products": top_products, "quality_info": quality_info},
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    )


import re as _re

def _parse_price(price_str: str) -> float | None:
    """Extract numeric price from strings like '19.90 EUR' or '24,50 €'."""
    if not price_str:
        return None
    cleaned = price_str.replace(",", ".").strip()
    m = _re.search(r"(\d+\.?\d*)", cleaned)
    return float(m.group(1)) if m else None


@router.get("/products/pricing-summary")
async def get_pricing_summary(nutrients: str = "", lang: str = "de"):
    """Return price-per-day estimates for a list of nutrients.
    Uses manual product-level price_per_day first, then falls back to auto-calculation."""
    if not nutrients:
        return {"pricing": {}}

    nutrient_list = [n.strip() for n in nutrients.split(",") if n.strip()]
    collection = await get_products_collection(lang)
    result = {}

    for nutrient in nutrient_list:
        tags = NUTRIENT_TAG_MAP.get(nutrient, [])
        if not tags:
            continue
        regex_pattern = f"^({'|'.join(tags)})$"
        products = await collection.find(
            {"tags": {"$elemMatch": {"$regex": regex_pattern, "$options": "i"}}},
            {"_id": 0, "price": 1, "servings": 1, "price_per_day": 1}
        ).limit(10).to_list(10)

        prices_per_day = []
        for p in products:
            # Use manual price_per_day if set on the product
            if p.get("price_per_day") is not None:
                prices_per_day.append(round(float(p["price_per_day"]), 2))
                continue
            # Otherwise auto-calculate
            price = _parse_price(p.get("price", ""))
            if price is None or price <= 0:
                continue
            servings = p.get("servings")
            if servings and isinstance(servings, (int, float)) and servings > 0:
                daily = price / servings
            else:
                daily = price / 30
            prices_per_day.append(round(daily, 2))

        if prices_per_day:
            avg = round(sum(prices_per_day) / len(prices_per_day), 2)
            result[nutrient] = {
                "avg_per_day": avg,
                "min_per_day": min(prices_per_day),
                "max_per_day": max(prices_per_day),
                "product_count": len(prices_per_day),
            }

    return {"pricing": result}




@router.get("/products")
async def get_products(tags: str = "", lang: str = "de"):
    """Get products from MongoDB, optionally filtered by tags."""
    collection = await get_products_collection(lang)
    
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
        loc = r.get(lang) or r.get("en") or r.get("de", {})
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

# Nutrient deficiency → recipe tag mapping
DEFICIENCY_RECIPE_MAP = {
    "iron": {"tags": ["eisenreich", "proteinreich"], "de": "Eisenreich", "it": "Ricco di ferro"},
    "omega3": {"tags": ["omega-3"], "de": "Reich an Omega-3", "it": "Ricco di Omega-3"},
    "magnesium": {"tags": ["magnesiumreich"], "de": "Magnesiumreich", "it": "Ricco di magnesio"},
    "vitamin_c": {"tags": ["vitamin-c", "antioxidantien", "antioxidantienreich", "immunstärkend"], "de": "Vitamin C", "it": "Vitamina C"},
    "vitamin_b12": {"tags": ["B-Vitamine", "proteinreich"], "de": "B-Vitamine", "it": "Vitamine B"},
    "vitamin_d": {"tags": ["vitaminreich"], "de": "Vitaminreich", "it": "Ricco di vitamine"},
    "zinc": {"tags": ["immunstärkend", "proteinreich"], "de": "Immunstaerkend", "it": "Immunostimolante"},
    "calcium": {"tags": ["proteinreich"], "de": "Calciumreich", "it": "Ricco di calcio"},
    "folate": {"tags": ["vitaminreich", "ballaststoffreich"], "de": "Folsaeurereich", "it": "Ricco di folato"},
    "probiotics": {"tags": ["probiotisch", "darmfreundlich", "fermentiert"], "de": "Darmfreundlich", "it": "Per l'intestino"},
    "vitamin_e": {"tags": ["vitamin-e", "antioxidantienreich"], "de": "Vitamin E", "it": "Vitamina E"},
    "selenium": {"tags": ["proteinreich", "antioxidantienreich"], "de": "Selenreich", "it": "Ricco di selenio"},
    "b_vitamins": {"tags": ["B-Vitamine", "vitaminreich"], "de": "B-Vitamine", "it": "Vitamine B"},
    "vitamin_k2": {"tags": ["vitaminreich"], "de": "Vitamin K2", "it": "Vitamina K2"},
    "coq10": {"tags": ["antioxidantienreich"], "de": "Antioxidantien", "it": "Antiossidanti"},
    "iodine": {"tags": ["proteinreich"], "de": "Jodreich", "it": "Ricco di iodio"},
}


@router.get("/recipes/personalized/{profile_id}")
async def get_personalized_recipes(profile_id: str, lang: str = "de"):
    """Sort and tag all recipes based on user health profile (deficiencies + complaints)."""
    from core.health_engine import generate_health_assessment

    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        return {"error": "profile_not_found", "recipes": []}

    # Generate assessment dynamically (same as health-profile GET endpoint)
    assessment = generate_health_assessment(profile, lang)
    deficiencies = assessment.get("deficiencies", [])
    complaints = profile.get("complaints", [])

    # Load all active recipes
    cursor = db.recipes.find({"active": {"$ne": False}}, {"_id": 0})
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

    # Score and tag each recipe
    RISK_SCORE = {"high": 3, "medium": 2, "low": 1}

    for recipe in all_recipes:
        score = 0
        relevance_tags = []
        recipe_tags_lower = [t.lower() for t in recipe["tags"]]
        recipe_stags_lower = [t.lower() for t in recipe["symptom_tags"]]

        # 1. Match deficiencies to recipe tags
        for deficiency in deficiencies:
            nutrient = deficiency.get("nutrient", "")
            risk = deficiency.get("risk_level", "low")
            mapping = DEFICIENCY_RECIPE_MAP.get(nutrient)
            if not mapping:
                continue
            matched = any(mt.lower() in recipe_tags_lower for mt in mapping["tags"])
            if matched:
                points = RISK_SCORE.get(risk, 1)
                score += points
                tag_label = mapping.get(lang, mapping.get("de", nutrient))
                if tag_label not in relevance_tags:
                    relevance_tags.append(tag_label)

        # 2. Match complaints to recipe symptom_tags
        for complaint in complaints:
            c_name = complaint.get("name", "")
            intensity = int(complaint.get("intensity", 0))
            c_tags = COMPLAINT_TAG_MAP.get(c_name, [])
            matched = any(ct.lower() in recipe_stags_lower for ct in c_tags)
            if matched:
                score += min(intensity // 3, 3)
                reason_labels = {
                    "de": {
                        "fatigue": "Gegen Muedigkeit", "headache": "Gegen Kopfschmerzen",
                        "digestive": "Fuer die Verdauung", "joint_pain": "Fuer die Gelenke",
                        "muscle_pain": "Gegen Muskelschmerzen", "skin_problems": "Fuer Haut & Haare",
                        "concentration": "Fuer Konzentration", "mood_swings": "Fuer die Stimmung",
                        "anxiety_symptoms": "Gegen Stress", "sleep_problems": "Fuer besseren Schlaf",
                        "immune_weakness": "Fuer das Immunsystem", "cold_hands_feet": "Fuer die Durchblutung",
                    },
                    "it": {
                        "fatigue": "Contro la stanchezza", "headache": "Contro il mal di testa",
                        "digestive": "Per la digestione", "joint_pain": "Per le articolazioni",
                        "muscle_pain": "Contro i dolori", "skin_problems": "Per pelle e capelli",
                        "concentration": "Per la concentrazione", "mood_swings": "Per l'umore",
                        "anxiety_symptoms": "Contro lo stress", "sleep_problems": "Per dormire meglio",
                        "immune_weakness": "Per il sistema immunitario", "cold_hands_feet": "Per la circolazione",
                    },
                }
                label = reason_labels.get(lang, reason_labels["de"]).get(c_name, "")
                if label and label not in relevance_tags:
                    relevance_tags.append(label)

        # 3. Bonus for diet-appropriate recipes
        diet = profile.get("diet", "")
        if diet == "vegan" and "vegan" in recipe_tags_lower:
            score += 1
        elif diet == "vegetarian" and ("vegetarisch" in recipe_tags_lower or "vegan" in recipe_tags_lower):
            score += 1

        recipe["relevance_score"] = score
        recipe["relevance_tags"] = relevance_tags[:3]  # max 3 tags

    # Sort by relevance score (highest first), then by title
    all_recipes.sort(key=lambda r: (-r["relevance_score"], r["title"]))

    return {"recipes": all_recipes, "profile_diet": profile.get("diet", "")}


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
    collection = await get_products_collection(lang)
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
    
    loc = recipe.get(lang) or recipe.get("en") or recipe.get("de", {})
    
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


# ── Product Selections (user picks a product for a supplement) ──

from pydantic import BaseModel
from datetime import datetime, timezone

class ProductSelection(BaseModel):
    profile_id: str
    nutrient_id: str
    product_name: str
    product_id: str = ""

@router.post("/products/select")
async def select_product(entry: ProductSelection):
    """Save which product the user takes for a given nutrient."""
    await db.product_selections.update_one(
        {"profile_id": entry.profile_id, "nutrient_id": entry.nutrient_id},
        {"$set": {
            "profile_id": entry.profile_id,
            "nutrient_id": entry.nutrient_id,
            "product_name": entry.product_name,
            "product_id": entry.product_id,
            "selected_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"success": True, "product_name": entry.product_name}

@router.get("/products/selections/{profile_id}")
async def get_product_selections(profile_id: str):
    """Get all product selections for a user."""
    docs = await db.product_selections.find(
        {"profile_id": profile_id}, {"_id": 0}
    ).to_list(100)
    result = {}
    for d in docs:
        result[d["nutrient_id"]] = {
            "product_name": d.get("product_name", ""),
            "product_id": d.get("product_id", ""),
        }
    return {"selections": result}

@router.delete("/products/selections/{profile_id}/{nutrient_id}")
async def remove_product_selection(profile_id: str, nutrient_id: str):
    """Remove a product selection."""
    await db.product_selections.delete_one(
        {"profile_id": profile_id, "nutrient_id": nutrient_id}
    )
    return {"success": True}
