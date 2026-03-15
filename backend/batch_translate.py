#!/usr/bin/env python3
"""Batch-translate all recipes to all languages and cache in MongoDB."""
import asyncio, json, os, sys
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')
LANGS = ['en', 'tr', 'fr', 'es', 'ru']
LANG_NAMES = {"en": "English", "tr": "Turkish", "fr": "French", "es": "Spanish", "ru": "Russian"}

async def translate_one(recipe_id: str, source: dict, lang: str) -> dict:
    chat = LlmChat(
        api_key=os.environ['EMERGENT_LLM_KEY'],
        session_id=f"batch-{recipe_id}-{lang}",
        system_message=f"Translate recipe to {LANG_NAMES[lang]}. Return ONLY valid JSON."
    )
    prompt = json.dumps({
        "title": source.get("title", ""),
        "ingredients": source.get("ingredients", []),
        "steps": source.get("steps", []),
        "tags": source.get("tags", []),
    }, ensure_ascii=False)
    
    resp = await chat.send_message(UserMessage(text=f"Translate this recipe JSON to {LANG_NAMES[lang]}:\n{prompt}"))
    text = str(resp).strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    return json.loads(text)

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(100)
    total = len(recipes)
    print(f"Found {total} recipes to translate")
    
    done = 0
    errors = 0
    for r in recipes:
        recipe_id = r.get("id", "unknown")
        source = r.get("de", {})
        if not source.get("title"):
            continue
        
        for lang in LANGS:
            if lang in r and r[lang].get("title"):
                done += 1
                continue  # Already translated
            
            try:
                translated = await translate_one(recipe_id, source, lang)
                await db.recipes.update_one(
                    {"id": recipe_id},
                    {"$set": {lang: translated}}
                )
                done += 1
                print(f"[{done}/{total*5}] {recipe_id} -> {lang}: {translated.get('title', '?')}")
            except Exception as e:
                errors += 1
                print(f"[ERROR] {recipe_id} -> {lang}: {e}")
            
            await asyncio.sleep(0.5)  # Rate limiting
    
    print(f"\nDone! {done} translated, {errors} errors")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
