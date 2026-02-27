#!/usr/bin/env python3
"""
Migration script: Import products and recipes from JSON files into MongoDB.
Run once to seed the database, then remove JSON file dependencies.
"""
import asyncio
import json
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']


async def migrate():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Load JSON files
    products_de_path = ROOT_DIR / "products_de.json"
    products_it_path = ROOT_DIR / "products_it.json"
    recipes_path = ROOT_DIR / "recipes.json"
    
    # Migrate German products
    if products_de_path.exists():
        with open(products_de_path, "r", encoding="utf-8") as f:
            products_de = json.load(f)
        
        # Clear existing and insert
        await db.products_de.delete_many({})
        if products_de:
            result = await db.products_de.insert_many(products_de)
            print(f"✅ Migrated {len(result.inserted_ids)} German products to MongoDB")
    else:
        print("⚠️  products_de.json not found")
    
    # Migrate Italian products
    if products_it_path.exists():
        with open(products_it_path, "r", encoding="utf-8") as f:
            products_it = json.load(f)
        
        await db.products_it.delete_many({})
        if products_it:
            result = await db.products_it.insert_many(products_it)
            print(f"✅ Migrated {len(result.inserted_ids)} Italian products to MongoDB")
    else:
        print("⚠️  products_it.json not found")
    
    # Migrate recipes
    if recipes_path.exists():
        with open(recipes_path, "r", encoding="utf-8") as f:
            recipes = json.load(f)
        
        await db.recipes.delete_many({})
        if recipes:
            result = await db.recipes.insert_many(recipes)
            print(f"✅ Migrated {len(result.inserted_ids)} recipes to MongoDB")
    else:
        print("⚠️  recipes.json not found")
    
    # Create indexes for better query performance
    await db.products_de.create_index("product_id", unique=True)
    await db.products_de.create_index("tags")
    await db.products_it.create_index("product_id", unique=True)
    await db.products_it.create_index("tags")
    await db.recipes.create_index("id", unique=True)
    await db.recipes.create_index("symptom_tags")
    print("✅ Created indexes for products and recipes")
    
    # Verify migration
    de_count = await db.products_de.count_documents({})
    it_count = await db.products_it.count_documents({})
    recipes_count = await db.recipes.count_documents({})
    
    print(f"\n📊 Migration Summary:")
    print(f"   - German products: {de_count}")
    print(f"   - Italian products: {it_count}")
    print(f"   - Recipes: {recipes_count}")
    
    client.close()
    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(migrate())
