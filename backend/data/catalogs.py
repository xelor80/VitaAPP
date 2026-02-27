import json
from core.config import ROOT_DIR


def _load_json(filename: str) -> list:
    path = ROOT_DIR / filename
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


PRODUCT_CATALOG_DE = _load_json("products_de.json")
PRODUCT_CATALOG_IT = _load_json("products_it.json")
RECIPE_CATALOG = _load_json("recipes.json")
