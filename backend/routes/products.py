from fastapi import APIRouter
from data.catalogs import PRODUCT_CATALOG_DE, PRODUCT_CATALOG_IT, RECIPE_CATALOG

router = APIRouter()


@router.get("/products")
async def get_products(tags: str = "", lang: str = "de"):
    catalog = PRODUCT_CATALOG_DE if lang == "de" else PRODUCT_CATALOG_IT
    if not tags:
        return catalog
    tag_list = [t.strip().lower() for t in tags.split(",")]
    return [p for p in catalog if any(t in [pt.lower() for pt in p.get("tags", [])] for t in tag_list)]


@router.get("/recipes")
async def get_recipes(tags: str = "", lang: str = "de"):
    results = []
    for r in RECIPE_CATALOG:
        results.append({
            "id": r["id"],
            "title": r["name_de"] if lang == "de" else r["name_it"],
            "symptoms_text": r.get("symptoms_de", "") if lang == "de" else r.get("symptoms_it", ""),
            "ingredients": r.get("ingredients_de", []) if lang == "de" else r.get("ingredients_it", []),
            "steps": r.get("steps_de", []) if lang == "de" else r.get("steps_it", []),
            "time_min": r.get("time_min", 20),
            "tags": r.get("tags", []),
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
