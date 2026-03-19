from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os
import logging

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('CUSTOM_MONGO_URL') or os.environ['MONGO_URL']
db_name = os.environ.get('CUSTOM_DB_NAME') or os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("vitaguide")


async def get_products_collection(lang: str):
    """Return the products collection for the given language.
    Falls back to products_de if products_it is empty."""
    if lang == "de":
        return db.products_de
    # Check if IT collection has products
    it_count = await db.products_it.count_documents({})
    if it_count > 0:
        return db.products_it
    # Fallback to DE products
    return db.products_de
