"""
Catalog loaders - Now uses MongoDB as primary data source.
JSON files are only used for initial migration via migrate_to_mongodb.py.
"""
from core.config import db


async def get_products_de():
    """Get all German products from MongoDB."""
    cursor = db.products_de.find({}, {"_id": 0})
    return await cursor.to_list(length=None)


async def get_products_it():
    """Get all Italian products from MongoDB."""
    cursor = db.products_it.find({}, {"_id": 0})
    return await cursor.to_list(length=None)


async def get_recipes():
    """Get all recipes from MongoDB."""
    cursor = db.recipes.find({}, {"_id": 0})
    return await cursor.to_list(length=None)


async def get_products_by_lang(lang: str = "de"):
    """Get products by language."""
    return await get_products_de() if lang == "de" else await get_products_it()
