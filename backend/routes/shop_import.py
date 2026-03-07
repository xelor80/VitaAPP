"""
Shopify Shop Import & Auto-Sync
- Manual import with AI-powered data extraction
- Automatic scheduled sync (weekly/monthly) per language
- Full sync: add new, update existing, remove deleted products
"""
import os
import re
import uuid
import json
import asyncio
import logging
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import db

logger = logging.getLogger("vitaguide")
router = APIRouter(prefix="/admin", tags=["shop-import"])

# In-memory job store
_import_jobs: dict[str, dict] = {}

SYNC_CONFIG_COLLECTION = "sync_config"


class ShopImportRequest(BaseModel):
    shop_url: str
    lang: str = "de"


class SyncConfigRequest(BaseModel):
    lang: str
    shop_url: str
    interval: str  # "weekly" or "monthly"
    enabled: bool


def _clean_html(html: str) -> str:
    if not html:
        return ""
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'\s+', ' ', text).strip()
    return text[:3000]


def _normalize_shop_url(url: str) -> str:
    url = url.strip().rstrip('/')
    if not url.startswith('http'):
        url = 'https://' + url
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


SKIP_TYPES = {"workbook", "buch", "book", "kleidung", "clothing", "gutschein", "voucher", "gift card"}


async def _fetch_shopify_products(shop_url: str) -> list[dict]:
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
  "is_supplement": true,
  "servings": 30
}

Wichtig:
- "servings" = Anzahl Tagesdosen pro Packung. Berechne: Gesamtmenge (Kapseln/Tabletten/ml) geteilt durch taegliche Dosis. Beispiel: 90 Kapseln bei 3 pro Tag = 30 Tagesdosen. Wenn unklar, schaetze 30.
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
  "is_supplement": true,
  "servings": 30
}

Importante:
- "servings" = numero di dosi giornaliere per confezione. Calcola: quantita totale (capsule/compresse/ml) diviso dose giornaliera. Esempio: 90 capsule con 3 al giorno = 30 dosi. Se non chiaro, stima 30.
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
        "description_short": "", "ingredients": [], "dosage": "",
        "intake_recommendation": "", "benefits": [],
        "health_tags": tags[:5] if isinstance(tags, list) else [],
        "is_supplement": True
    }


def _shopify_to_product(shopify_product: dict, ai_data: dict, lang: str, shop_url: str) -> dict:
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
        "servings": ai_data.get("servings") or None,
    }


async def _run_import(job_id: str, shop_url: str, lang: str, is_sync: bool = False):
    """Background task that processes all products. If is_sync=True, also removes deleted products."""
    job = _import_jobs[job_id]
    try:
        shopify_products = await _fetch_shopify_products(shop_url)
        job["total"] = len(shopify_products)
        collection = db.products_de if lang == "de" else db.products_it

        # Track which product_ids we see from Shopify (for deletion detection)
        seen_handles = set()
        imported_handles = set()

        for i, sp in enumerate(shopify_products):
            handle = sp.get("handle", f"unknown-{i}")
            title = sp.get("title", "")
            ptype = (sp.get("product_type", "") or "").lower()

            job["current_product"] = title
            job["processed"] = i
            seen_handles.add(handle)

            try:
                if ptype in SKIP_TYPES:
                    job["skipped"] += 1
                    continue

                body_text = _clean_html(sp.get("body_html", ""))
                tags = sp.get("tags", [])
                if isinstance(tags, str):
                    tags = [t.strip() for t in tags.split(",")]

                # For sync: check if product already exists (by handle OR name)
                existing = await collection.find_one({"product_id": handle}, {"_id": 0, "imported_at": 1})
                # Also check for old manually-created duplicate by name
                if not existing:
                    name_match = await collection.find_one(
                        {"name": title, "product_id": {"$ne": handle}},
                        {"_id": 0, "product_id": 1}
                    )
                    if name_match:
                        # Remove old duplicate and let Shopify version take over
                        await collection.delete_one({"product_id": name_match["product_id"]})
                        logger.info(f"[{job_id}] Removed old duplicate: {name_match['product_id']} -> {handle}")

                if is_sync and existing:
                    # Update price, image, tags from Shopify but keep AI data
                    variants = sp.get("variants", [])
                    images = sp.get("images", [])
                    shopify_tags = tags
                    base_url = _normalize_shop_url(shop_url)

                    update_fields = {
                        "name": title,
                        "price": f"{variants[0]['price']} EUR" if variants else "",
                        "image_url": images[0]["src"] if images else "",
                        "affiliate_url": f"{base_url}/products/{handle}",
                        "product_type": sp.get("product_type", ""),
                        "imported_at": datetime.now(timezone.utc).isoformat(),
                    }
                    # Merge new Shopify tags with existing tags
                    existing_doc = await collection.find_one({"product_id": handle}, {"_id": 0, "tags": 1, "price": 1})
                    old_tags = existing_doc.get("tags", []) if existing_doc else []
                    merged_tags = list(set([t.lower() for t in shopify_tags + old_tags]))
                    update_fields["tags"] = merged_tags

                    # Track price changes for price alerts
                    old_price_str = existing_doc.get("price", "") if existing_doc else ""
                    new_price_str = update_fields.get("price", "")
                    if old_price_str and new_price_str and old_price_str != new_price_str:
                        await db.price_history.insert_one({
                            "product_id": handle,
                            "lang": lang,
                            "old_price": old_price_str,
                            "new_price": new_price_str,
                            "changed_at": datetime.now(timezone.utc).isoformat(),
                        })

                    await collection.update_one({"product_id": handle}, {"$set": update_fields})
                    job["updated"] += 1
                    imported_handles.add(handle)
                    # Remove old duplicates with same name but different product_id
                    old_dupes = await collection.delete_many({
                        "name": title,
                        "product_id": {"$ne": handle}
                    })
                    if old_dupes.deleted_count > 0:
                        logger.info(f"[{job_id}] Cleaned {old_dupes.deleted_count} old duplicate(s) for: {title}")
                    logger.info(f"[{job_id}] Updated [{i+1}/{job['total']}]: {title}")
                else:
                    # Full AI extraction for new products
                    ai_data = await _ai_extract_supplement_data(title, body_text, tags, lang)

                    if not ai_data.get("is_supplement", True):
                        job["skipped"] += 1
                        continue

                    product = _shopify_to_product(sp, ai_data, lang, shop_url)
                    await collection.update_one({"product_id": handle}, {"$set": product}, upsert=True)
                    job["imported"] += 1
                    imported_handles.add(handle)
                    job["products"].append({
                        "product_id": handle,
                        "name": title,
                        "tags": product["tags"][:5],
                    })
                    logger.info(f"[{job_id}] Imported [{i+1}/{job['total']}]: {title}")

            except Exception as e:
                job["errors"].append(f"{handle}: {str(e)[:100]}")
                logger.error(f"[{job_id}] Error importing {handle}: {e}")

        # Remove products that no longer exist in Shopify
        if is_sync:
            all_db_products = await collection.find(
                {"shopify_id": {"$exists": True}},
                {"_id": 0, "product_id": 1}
            ).to_list(1000)

            for doc in all_db_products:
                pid = doc["product_id"]
                if pid not in seen_handles:
                    await collection.delete_one({"product_id": pid})
                    job["removed"] += 1
                    logger.info(f"[{job_id}] Removed (not in shop): {pid}")

        job["processed"] = job["total"]
        job["status"] = "complete"
        logger.info(
            f"[{job_id}] {'Sync' if is_sync else 'Import'} complete: "
            f"{job['imported']} new, {job.get('updated',0)} updated, "
            f"{job.get('removed',0)} removed, {job['skipped']} skipped"
        )

        # Update last sync time in config
        if is_sync:
            await db[SYNC_CONFIG_COLLECTION].update_one(
                {"lang": lang},
                {"$set": {
                    "last_sync": datetime.now(timezone.utc).isoformat(),
                    "last_sync_result": {
                        "imported": job["imported"],
                        "updated": job.get("updated", 0),
                        "removed": job.get("removed", 0),
                        "skipped": job["skipped"],
                        "errors": len(job["errors"]),
                    }
                }}
            )

    except Exception as e:
        job["status"] = "error"
        job["errors"].append(f"Fatal: {str(e)[:200]}")
        logger.error(f"[{job_id}] Import failed: {e}")


def _create_job(is_sync: bool = False) -> tuple[str, dict]:
    job_id = uuid.uuid4().hex[:12]
    job = {
        "status": "running",
        "total": 0,
        "processed": 0,
        "imported": 0,
        "updated": 0,
        "removed": 0,
        "skipped": 0,
        "errors": [],
        "products": [],
        "current_product": "",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "is_sync": is_sync,
    }
    _import_jobs[job_id] = job
    return job_id, job


# ==================== SYNC CONFIG ENDPOINTS ====================

@router.get("/sync-config")
async def get_sync_configs():
    """Get sync configurations for all languages."""
    configs = await db[SYNC_CONFIG_COLLECTION].find({}, {"_id": 0}).to_list(10)
    # Return defaults if no config exists
    result = {"de": None, "it": None}
    for c in configs:
        result[c["lang"]] = c
    return result


@router.post("/sync-config")
async def save_sync_config(req: SyncConfigRequest):
    """Save or update sync configuration for a language."""
    if req.lang not in ("de", "it"):
        raise HTTPException(status_code=400, detail="Sprache muss 'de' oder 'it' sein")
    if req.interval not in ("weekly", "monthly"):
        raise HTTPException(status_code=400, detail="Intervall muss 'weekly' oder 'monthly' sein")

    now = datetime.now(timezone.utc).isoformat()

    # Calculate next sync time
    if req.interval == "weekly":
        next_sync = (datetime.now(timezone.utc) + timedelta(weeks=1)).isoformat()
    else:
        next_sync = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()

    config = {
        "lang": req.lang,
        "shop_url": req.shop_url,
        "interval": req.interval,
        "enabled": req.enabled,
        "next_sync": next_sync,
        "updated_at": now,
    }

    existing = await db[SYNC_CONFIG_COLLECTION].find_one({"lang": req.lang})
    if existing:
        # Preserve last_sync data
        config["last_sync"] = existing.get("last_sync")
        config["last_sync_result"] = existing.get("last_sync_result")
        await db[SYNC_CONFIG_COLLECTION].update_one({"lang": req.lang}, {"$set": config})
    else:
        config["last_sync"] = None
        config["last_sync_result"] = None
        await db[SYNC_CONFIG_COLLECTION].insert_one(config)

    return {"status": "saved", "config": {k: v for k, v in config.items() if k != "_id"}}


@router.post("/sync-now/{lang}")
async def trigger_sync_now(lang: str):
    """Manually trigger a sync for a specific language."""
    if lang not in ("de", "it"):
        raise HTTPException(status_code=400, detail="Sprache muss 'de' oder 'it' sein")

    config = await db[SYNC_CONFIG_COLLECTION].find_one({"lang": lang}, {"_id": 0})
    if not config or not config.get("shop_url"):
        raise HTTPException(status_code=400, detail="Keine Sync-Konfiguration fuer diese Sprache vorhanden")

    job_id, _ = _create_job(is_sync=True)
    asyncio.create_task(_run_import(job_id, config["shop_url"], lang, is_sync=True))
    return {"job_id": job_id, "status": "started"}


# ==================== IMPORT ENDPOINTS ====================

@router.post("/shop-import")
async def start_import(req: ShopImportRequest):
    """Start a background shop import job."""
    lang = req.lang if req.lang in ("de", "it") else "de"
    job_id, _ = _create_job(is_sync=False)
    asyncio.create_task(_run_import(job_id, req.shop_url, lang, is_sync=False))
    return {"job_id": job_id, "status": "started"}


@router.get("/shop-import/status/{job_id}")
async def get_import_status(job_id: str):
    """Get the status of a running import/sync job."""
    job = _import_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    return {
        "status": job["status"],
        "total": job["total"],
        "processed": job["processed"],
        "imported": job["imported"],
        "updated": job.get("updated", 0),
        "removed": job.get("removed", 0),
        "skipped": job["skipped"],
        "errors": job["errors"][:20],
        "current_product": job["current_product"],
        "products": job["products"][-10:],
        "is_sync": job.get("is_sync", False),
    }


@router.post("/shop-import/preview")
async def preview_shop(req: ShopImportRequest):
    """Preview products from a Shopify shop without importing."""
    shopify_products = await _fetch_shopify_products(req.shop_url)
    preview = []
    for sp in shopify_products:
        tags = sp.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",")]
        preview.append({
            "handle": sp.get("handle", ""),
            "title": sp.get("title", ""),
            "price": sp["variants"][0]["price"] if sp.get("variants") else "",
            "image": sp["images"][0]["src"] if sp.get("images") else "",
            "tags": tags[:5],
            "product_type": sp.get("product_type", ""),
            "has_description": bool(sp.get("body_html", "")),
        })
    return {"total": len(preview), "products": preview}


# ==================== BACKGROUND SYNC SCHEDULER ====================

async def _check_and_run_syncs():
    """Check if any sync is due and run it."""
    now = datetime.now(timezone.utc)
    configs = await db[SYNC_CONFIG_COLLECTION].find({"enabled": True}, {"_id": 0}).to_list(10)

    for config in configs:
        next_sync_str = config.get("next_sync")
        if not next_sync_str:
            continue

        next_sync = datetime.fromisoformat(next_sync_str.replace("Z", "+00:00"))
        if now >= next_sync:
            lang = config["lang"]
            shop_url = config["shop_url"]
            logger.info(f"Auto-sync due for {lang}: {shop_url}")

            job_id, _ = _create_job(is_sync=True)
            asyncio.create_task(_run_import(job_id, shop_url, lang, is_sync=True))

            # Schedule next sync
            if config["interval"] == "weekly":
                new_next = (now + timedelta(weeks=1)).isoformat()
            else:
                new_next = (now + timedelta(days=30)).isoformat()

            await db[SYNC_CONFIG_COLLECTION].update_one(
                {"lang": lang},
                {"$set": {"next_sync": new_next}}
            )
            logger.info(f"Next sync for {lang} scheduled at {new_next}")


async def start_sync_scheduler():
    """Background loop that checks for due syncs every hour."""
    logger.info("Sync scheduler started")
    while True:
        try:
            await _check_and_run_syncs()
        except Exception as e:
            logger.error(f"Sync scheduler error: {e}")
        await asyncio.sleep(3600)  # Check every hour


# ── Backfill servings for existing products ──────────────────────

_backfill_jobs: dict[str, dict] = {}


async def _ai_extract_servings(name: str, description: str, dosage: str, price: str, lang: str) -> int | None:
    """Use AI to extract the number of daily servings from product info."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system = (
        "Du bist ein Experte fuer Nahrungsergaenzungsmittel. "
        "Bestimme die Anzahl der TAGESDOSEN pro Packung.\n\n"
        "Berechne: Gesamtmenge (Kapseln/Tabletten/Tropfen/ml) geteilt durch taegliche Dosis.\n"
        "Beispiel: 90 Kapseln bei 3 pro Tag = 30 Tagesdosen.\n"
        "Beispiel: 60 ml bei 2 ml pro Tag = 30 Tagesdosen.\n\n"
        "Antworte NUR mit einer Zahl (Integer). Wenn unklar, antworte 30."
    ) if lang == "de" else (
        "Sei un esperto di integratori alimentari. "
        "Determina il numero di DOSI GIORNALIERE per confezione.\n\n"
        "Calcola: quantita totale (capsule/compresse/gocce/ml) diviso dose giornaliera.\n"
        "Esempio: 90 capsule con 3 al giorno = 30 dosi.\n\n"
        "Rispondi SOLO con un numero (intero). Se non chiaro, rispondi 30."
    )

    prompt = f"Produkt: {name}\nPreis: {price}\nDosierung: {dosage}\nBeschreibung: {description[:1500]}"

    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"backfill-servings-{uuid.uuid4().hex[:8]}",
            system_message=system,
        ).with_model("openai", "gpt-4o")
        resp = await chat.send_message(UserMessage(text=prompt))
        match = re.search(r'(\d+)', resp.strip())
        if match:
            val = int(match.group(1))
            return val if 1 <= val <= 365 else 30
    except Exception as e:
        logger.error(f"AI servings extraction failed for '{name}': {e}")
    return None


@router.post("/backfill-servings")
async def backfill_servings(lang: str = "de"):
    """Backfill servings field for all products missing it. Runs in background."""
    from core.config import get_products_collection

    job_id = uuid.uuid4().hex[:12]
    _backfill_jobs[job_id] = {"status": "running", "processed": 0, "updated": 0, "errors": 0, "total": 0}

    async def _run():
        job = _backfill_jobs[job_id]
        try:
            collection = await get_products_collection(lang)
            products = await collection.find(
                {"$or": [{"servings": None}, {"servings": {"$exists": False}}]},
                {"_id": 0, "product_id": 1, "name": 1, "description": 1, "application_instructions": 1, "price": 1}
            ).limit(200).to_list(200)

            job["total"] = len(products)
            for p in products:
                try:
                    dosage_text = p.get("application_instructions", "")
                    servings = await _ai_extract_servings(
                        p.get("name", ""), p.get("description", ""), dosage_text, p.get("price", ""), lang
                    )
                    if servings:
                        await collection.update_one(
                            {"product_id": p["product_id"]},
                            {"$set": {"servings": servings}}
                        )
                        job["updated"] += 1
                except Exception as e:
                    logger.error(f"Backfill error for {p.get('product_id')}: {e}")
                    job["errors"] += 1
                job["processed"] += 1
            job["status"] = "done"
        except Exception as e:
            job["status"] = "error"
            job["error"] = str(e)

    asyncio.create_task(_run())
    return {"job_id": job_id, "message": f"Backfill gestartet fuer {lang}"}


@router.get("/backfill-servings/{job_id}")
async def get_backfill_status(job_id: str):
    """Check backfill job status."""
    job = _backfill_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job nicht gefunden")
    return job

