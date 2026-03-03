"""
Shopify Shop Import - Fetches products from a Shopify store and uses AI to extract
structured supplement data (ingredients, dosage, intake recommendations).
"""
import os
import re
import uuid
import json
import asyncio
import logging
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import db

logger = logging.getLogger("vitaguide")
router = APIRouter(prefix="/admin", tags=["shop-import"])

# In-memory job store
_import_jobs: dict[str, dict] = {}


class ShopImportRequest(BaseModel):
    shop_url: str
    lang: str = "de"


def _clean_html(html: str) -> str:
    """Strip HTML tags to get plain text."""
    if not html:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:3000]


def _normalize_shop_url(url: str) -> str:
    """Ensure URL is a proper Shopify base URL."""
    url = url.strip().rstrip('/')
    if not url.startswith('http'):
        url = 'https://' + url
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


# Non-supplement product types to skip (no AI needed)
SKIP_TYPES = {"workbook", "buch", "book", "kleidung", "clothing", "gutschein", "voucher", "gift card"}


async def _fetch_shopify_products(shop_url: str) -> list[dict]:
    """Fetch all products from Shopify's public products.json API."""
    base = _normalize_shop_url(shop_url)
    all_products = []
    page = 1

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            url = f"{base}/products.json?limit=250&page={page}"
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Shop nicht erreichbar: {resp.status_code}")
            data = resp.json()
            products = data.get("products", [])
            if not products:
                break
            all_products.extend(products)
            if len(products) < 250:
                break
            page += 1

    return all_products


async def _ai_extract_supplement_data(title: str, body_text: str, tags: list[str], lang: str) -> dict:
    """Use AI to extract structured supplement data from product description."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    if lang == "de":
        system = """Du bist ein Experte fuer Nahrungsergaenzungsmittel. Extrahiere aus der Produktbeschreibung strukturierte Daten.

Antworte NUR als JSON:
{
  "description_short": "Kurzbeschreibung (max 2 Saetze)",
  "ingredients": ["Inhaltsstoff 1 (Menge)", "Inhaltsstoff 2 (Menge)"],
  "dosage": "Empfohlene Dosierung",
  "intake_recommendation": "Einnahmeempfehlung (wann, wie)",
  "benefits": ["Vorteil 1", "Vorteil 2"],
  "health_tags": ["tag1", "tag2"],
  "is_supplement": true
}

Wichtig:
- "is_supplement" = true wenn es ein Nahrungsergaenzungsmittel/Supplement ist, false bei Buechern, Kleidung, Sets, Workbooks etc.
- "health_tags" sollen Gesundheitsthemen sein (z.B. "immunsystem", "energie", "schlaf", "verdauung", "haut", "knochen", "herz", "muskeln", "stress", "haare", "gelenke", "entgiftung", "eisen", "magnesium", "vitamin-d", "omega-3", "zink", "b-vitamine", "vitamin-c", "q10", "probiotika")
- Wenn die Beschreibung nicht auf ein Supplement hindeutet, setze is_supplement=false"""
    else:
        system = """Sei un esperto di integratori alimentari. Estrai dati strutturati dalla descrizione del prodotto.

Rispondi SOLO come JSON:
{
  "description_short": "Breve descrizione (max 2 frasi)",
  "ingredients": ["Ingrediente 1 (quantita)", "Ingrediente 2 (quantita)"],
  "dosage": "Dosaggio raccomandato",
  "intake_recommendation": "Raccomandazione di assunzione (quando, come)",
  "benefits": ["Vantaggio 1", "Vantaggio 2"],
  "health_tags": ["tag1", "tag2"],
  "is_supplement": true
}

Importante:
- "is_supplement" = true se e un integratore/supplemento, false per libri, abbigliamento, set, workbook etc.
- "health_tags" devono essere temi di salute (es. "sistema immunitario", "energia", "sonno", "digestione", "pelle", "ossa", "cuore", "muscoli", "stress", "capelli", "articolazioni", "detox", "ferro", "magnesio", "vitamina d", "omega-3", "zinco", "vitamine b", "vitamina c", "q10", "probiotici")
- Se la descrizione non indica un integratore, imposta is_supplement=false"""

    prompt = f"Produkt: {title}\nTags: {', '.join(tags)}\n\nBeschreibung:\n{body_text[:2500]}"

    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"shop-import-{uuid.uuid4().hex[:8]}",
            system_message=system,
        ).with_model("openai", "gpt-4o")

        resp = await chat.send_message(UserMessage(text=prompt))
        match = re.search(r'\{[\s\S]*\}', resp)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"AI extract failed for '{title}': {e}")

    return {
        "description_short": "",
        "ingredients": [],
        "dosage": "",
        "intake_recommendation": "",
        "benefits": [],
        "health_tags": tags[:5] if isinstance(tags, list) else [],
        "is_supplement": True
    }


def _shopify_to_product(shopify_product: dict, ai_data: dict, lang: str, shop_url: str) -> dict:
    """Convert a Shopify product + AI data into our DB format."""
    handle = shopify_product.get("handle", "")
    variants = shopify_product.get("variants", [])
    images = shopify_product.get("images", [])
    base_url = _normalize_shop_url(shop_url)

    price = variants[0]["price"] if variants else ""
    image_url = images[0]["src"] if images else ""

    shopify_tags = shopify_product.get("tags", [])
    if isinstance(shopify_tags, str):
        shopify_tags = [t.strip() for t in shopify_tags.split(",")]
    ai_tags = ai_data.get("health_tags", [])
    all_tags = list(set([t.lower() for t in shopify_tags + ai_tags]))

    desc_parts = []
    if ai_data.get("description_short"):
        desc_parts.append(ai_data["description_short"])
    if ai_data.get("ingredients"):
        label = "Inhaltsstoffe" if lang == "de" else "Ingredienti"
        desc_parts.append(f"{label}: {', '.join(ai_data['ingredients'])}")
    if ai_data.get("benefits"):
        label = "Vorteile" if lang == "de" else "Vantaggi"
        desc_parts.append(f"{label}: {', '.join(ai_data['benefits'])}")

    app_parts = []
    if ai_data.get("dosage"):
        label = "Dosierung" if lang == "de" else "Dosaggio"
        app_parts.append(f"{label}: {ai_data['dosage']}")
    if ai_data.get("intake_recommendation"):
        label = "Einnahme" if lang == "de" else "Assunzione"
        app_parts.append(f"{label}: {ai_data['intake_recommendation']}")

    return {
        "product_id": handle,
        "name": shopify_product.get("title", ""),
        "description": "\n".join(desc_parts),
        "tags": all_tags,
        "affiliate_url": f"{base_url}/products/{handle}",
        "image_url": image_url,
        "price": f"{price} EUR" if price else "",
        "rating": "",
        "application_instructions": "\n".join(app_parts),
        "video_url": "",
        "shopify_id": str(shopify_product.get("id", "")),
        "product_type": shopify_product.get("product_type", ""),
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "is_supplement": ai_data.get("is_supplement", True),
    }


async def _run_import(job_id: str, shop_url: str, lang: str):
    """Background task that processes all products."""
    job = _import_jobs[job_id]
    try:
        shopify_products = await _fetch_shopify_products(shop_url)
        job["total"] = len(shopify_products)
        collection = db.products_de if lang == "de" else db.products_it

        for i, sp in enumerate(shopify_products):
            handle = sp.get("handle", f"unknown-{i}")
            title = sp.get("title", "")
            ptype = (sp.get("product_type", "") or "").lower()

            job["current_product"] = title
            job["processed"] = i

            try:
                # Quick skip for obvious non-supplements
                if ptype in SKIP_TYPES:
                    job["skipped"] += 1
                    logger.info(f"[{job_id}] Skipped (type={ptype}): {title}")
                    continue

                body_text = _clean_html(sp.get("body_html", ""))
                tags = sp.get("tags", [])
                if isinstance(tags, str):
                    tags = [t.strip() for t in tags.split(",")]

                # AI extraction
                ai_data = await _ai_extract_supplement_data(title, body_text, tags, lang)

                if not ai_data.get("is_supplement", True):
                    job["skipped"] += 1
                    logger.info(f"[{job_id}] Skipped (AI): {title}")
                    continue

                product = _shopify_to_product(sp, ai_data, lang, shop_url)
                await collection.update_one({"product_id": handle}, {"$set": product}, upsert=True)
                job["imported"] += 1
                job["products"].append({
                    "product_id": handle,
                    "name": title,
                    "tags": product["tags"][:5],
                })
                logger.info(f"[{job_id}] Imported [{i+1}/{job['total']}]: {title}")

            except Exception as e:
                job["errors"].append(f"{handle}: {str(e)[:100]}")
                logger.error(f"[{job_id}] Error importing {handle}: {e}")

        job["processed"] = job["total"]
        job["status"] = "complete"
        logger.info(f"[{job_id}] Import complete: {job['imported']} imported, {job['skipped']} skipped")

    except Exception as e:
        job["status"] = "error"
        job["errors"].append(f"Fatal: {str(e)[:200]}")
        logger.error(f"[{job_id}] Import failed: {e}")


@router.post("/shop-import")
async def start_import(req: ShopImportRequest):
    """Start a background shop import job."""
    lang = req.lang if req.lang in ("de", "it") else "de"
    job_id = uuid.uuid4().hex[:12]

    _import_jobs[job_id] = {
        "status": "running",
        "total": 0,
        "processed": 0,
        "imported": 0,
        "skipped": 0,
        "errors": [],
        "products": [],
        "current_product": "",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    asyncio.create_task(_run_import(job_id, req.shop_url, lang))
    return {"job_id": job_id, "status": "started"}


@router.get("/shop-import/status/{job_id}")
async def get_import_status(job_id: str):
    """Get the status of a running import job."""
    job = _import_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    return {
        "status": job["status"],
        "total": job["total"],
        "processed": job["processed"],
        "imported": job["imported"],
        "skipped": job["skipped"],
        "errors": job["errors"][:20],
        "current_product": job["current_product"],
        "products": job["products"][-10:],
    }


@router.post("/shop-import/preview")
async def preview_shop(req: ShopImportRequest):
    """Preview products from a Shopify shop without importing."""
    shopify_products = await _fetch_shopify_products(req.shop_url)

    preview = []
    for sp in shopify_products:
        handle = sp.get("handle", "")
        title = sp.get("title", "")
        variants = sp.get("variants", [])
        images = sp.get("images", [])
        tags = sp.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",")]

        preview.append({
            "handle": handle,
            "title": title,
            "price": variants[0]["price"] if variants else "",
            "image": images[0]["src"] if images else "",
            "tags": tags[:5],
            "product_type": sp.get("product_type", ""),
            "has_description": bool(sp.get("body_html", "")),
        })

    return {"total": len(preview), "products": preview}
