"""
Smart Product Integration (Affiliate Monetization)
Context-aware, non-intrusive product recommendations.
Placeholder products are seeded; admin can later replace affiliate_url.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.config import db, logger

router = APIRouter(prefix="/smart-products", tags=["smart-products"])


# ── Models ──

class ClickRequest(BaseModel):
    product_id: str
    profile_id: Optional[str] = None
    context: Optional[str] = None  # dashboard | stress | fasting | weight | analysis


class ProductUpsertRequest(BaseModel):
    id: Optional[str] = None
    title_de: str
    title_it: Optional[str] = None
    title_en: Optional[str] = None
    description_de: Optional[str] = None
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    image_url: Optional[str] = None
    affiliate_url: Optional[str] = None
    vendor: Optional[str] = None
    price_eur: Optional[float] = None
    contexts: List[str] = []  # tags: stress, sleep, magnesium, weight, fasting, energy
    symptoms: List[str] = []  # tags matching symptom analysis
    deficits: List[str] = []  # nutrients: magnesium, vitamin_d, omega3, ...
    enabled: bool = True


# ── Default placeholder catalog (seeded once if collection empty) ──

DEFAULT_PRODUCTS = [
    {
        "id": "smart-mag-001",
        "title_de": "Magnesium-Komplex",
        "title_it": "Complesso di magnesio",
        "title_en": "Magnesium complex",
        "description_de": "Beruhigt Nerven und unterstuetzt einen erholsamen Schlaf.",
        "description_it": "Calma i nervi e favorisce un sonno riposante.",
        "description_en": "Calms nerves and supports restful sleep.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["stress", "sleep", "fasting"],
        "symptoms": ["stress", "schlaf", "muskelkraempfe", "muedigkeit"],
        "deficits": ["magnesium"],
        "enabled": True,
    },
    {
        "id": "smart-vitd-001",
        "title_de": "Vitamin D3 + K2",
        "title_it": "Vitamina D3 + K2",
        "title_en": "Vitamin D3 + K2",
        "description_de": "Unterstuetzt Immunsystem, Knochen und Stimmung.",
        "description_it": "Supporta il sistema immunitario, le ossa e l'umore.",
        "description_en": "Supports immune system, bones and mood.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["dashboard", "energy", "weight"],
        "symptoms": ["muedigkeit", "immunsystem", "stimmung"],
        "deficits": ["vitamin_d"],
        "enabled": True,
    },
    {
        "id": "smart-omega-001",
        "title_de": "Omega-3 (Algenoel)",
        "title_it": "Omega-3 (olio di alghe)",
        "title_en": "Omega-3 (algae oil)",
        "description_de": "Pflanzliches EPA/DHA fuer Herz, Hirn und Entzuendungsregulation.",
        "description_it": "EPA/DHA vegetale per cuore, cervello e regolazione infiammatoria.",
        "description_en": "Plant-based EPA/DHA for heart, brain and inflammation balance.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["dashboard", "weight", "stress"],
        "symptoms": ["entzuendung", "herz", "konzentration"],
        "deficits": ["omega3"],
        "enabled": True,
    },
    {
        "id": "smart-electro-001",
        "title_de": "Elektrolyt-Komplex (Fasten)",
        "title_it": "Complesso di elettroliti (digiuno)",
        "title_en": "Electrolyte complex (fasting)",
        "description_de": "Natrium, Kalium, Magnesium - ideal in der Fastenphase.",
        "description_it": "Sodio, potassio, magnesio - ideale durante il digiuno.",
        "description_en": "Sodium, potassium, magnesium - ideal during fasting.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["fasting", "weight"],
        "symptoms": ["fasten", "kopfschmerzen"],
        "deficits": [],
        "enabled": True,
    },
    {
        "id": "smart-prot-001",
        "title_de": "Protein-Pulver (neutral)",
        "title_it": "Proteine in polvere (neutro)",
        "title_en": "Protein powder (neutral)",
        "description_de": "Hochwertiges Protein - perfekt zur Ergaenzung deines Tagesziels.",
        "description_it": "Proteine di alta qualita - per completare il tuo obiettivo giornaliero.",
        "description_en": "High-quality protein - to round out your daily target.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["weight", "fasting"],
        "symptoms": ["muskelaufbau", "saettigung"],
        "deficits": ["protein"],
        "enabled": True,
    },
    {
        "id": "smart-ash-001",
        "title_de": "Ashwagandha-Extrakt",
        "title_it": "Estratto di ashwagandha",
        "title_en": "Ashwagandha extract",
        "description_de": "Adaptogen zur Unterstuetzung in stressigen Phasen.",
        "description_it": "Adattogeno per supporto nelle fasi stressanti.",
        "description_en": "Adaptogen to support stressful phases.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["stress", "sleep"],
        "symptoms": ["stress", "burnout", "schlaf"],
        "deficits": [],
        "enabled": True,
    },
    {
        "id": "smart-b12-001",
        "title_de": "Vitamin B12 (Methylcobalamin)",
        "title_it": "Vitamina B12 (metilcobalamina)",
        "title_en": "Vitamin B12 (methylcobalamin)",
        "description_de": "Energie, Nerven und Bildung roter Blutkoerperchen.",
        "description_it": "Energia, nervi e formazione di globuli rossi.",
        "description_en": "Energy, nerves and red-blood-cell formation.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["dashboard", "energy"],
        "symptoms": ["muedigkeit", "konzentration"],
        "deficits": ["b12"],
        "enabled": True,
    },
]


async def ensure_seeded():
    cnt = await db.smart_products.count_documents({})
    if cnt == 0:
        for p in DEFAULT_PRODUCTS:
            doc = {**p, "created_at": datetime.now(timezone.utc).isoformat(), "is_placeholder": True}
            await db.smart_products.insert_one(doc)
        logger.info(f"Seeded {len(DEFAULT_PRODUCTS)} smart products")


# ── Endpoints ──

@router.get("/recommendations")
async def recommendations(
    profile_id: Optional[str] = Query(None),
    context: str = Query("dashboard"),
    limit: int = Query(2, ge=1, le=5),
):
    """Return up to `limit` non-intrusive product suggestions for given context."""
    await ensure_seeded()

    # Build candidate filter on context
    query = {"enabled": True, "contexts": context}
    cursor = db.smart_products.find(query, {"_id": 0}).limit(20)
    candidates = await cursor.to_list(length=20)

    # Score by overlap with profile symptoms / deficits if given
    if profile_id:
        profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
        plan = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
        symptoms = []
        deficits = []
        if profile:
            symptoms.extend([str(s).lower() for s in (profile.get("primary_symptoms") or [])])
            symptoms.extend([str(s).lower() for s in (profile.get("conditions") or [])])
        if plan:
            for item in (plan.get("supplements") or []):
                name = str(item.get("name", "")).lower()
                if "magnes" in name:
                    deficits.append("magnesium")
                if "vitamin d" in name or "d3" in name:
                    deficits.append("vitamin_d")
                if "omega" in name:
                    deficits.append("omega3")
                if "b12" in name:
                    deficits.append("b12")
        for c in candidates:
            score = 0
            for s in c.get("symptoms", []):
                if any(s in sym for sym in symptoms):
                    score += 2
            for d in c.get("deficits", []):
                if d in deficits:
                    score += 3
            c["_score"] = score
        candidates.sort(key=lambda x: (-x.get("_score", 0), x.get("id", "")))
    # Strip score field before returning
    out = []
    for c in candidates[:limit]:
        c.pop("_score", None)
        out.append(c)
    return {"context": context, "items": out}


@router.post("/click")
async def track_click(req: ClickRequest):
    entry = {
        "id": str(uuid.uuid4()),
        "product_id": req.product_id,
        "profile_id": req.profile_id,
        "context": req.context,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await db.smart_product_clicks.insert_one(entry)
    return {"ok": True}


@router.get("/catalog")
async def catalog():
    await ensure_seeded()
    cursor = db.smart_products.find({}, {"_id": 0}).sort("id", 1)
    items = await cursor.to_list(length=200)
    return {"items": items, "count": len(items)}


@router.put("/catalog/{product_id}")
async def update_product(product_id: str, req: ProductUpsertRequest):
    """Admin: upsert/edit a product (e.g. to add affiliate_url later)."""
    update = {k: v for k, v in req.dict().items() if v is not None}
    update["id"] = product_id
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.smart_products.update_one(
        {"id": product_id},
        {"$set": update},
        upsert=True,
    )
    doc = await db.smart_products.find_one({"id": product_id}, {"_id": 0})
    return doc


@router.delete("/catalog/{product_id}")
async def delete_product(product_id: str):
    res = await db.smart_products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"deleted": True}


@router.get("/stats")
async def stats():
    """Aggregate clicks per product (admin)."""
    pipeline = [
        {"$group": {"_id": "$product_id", "clicks": {"$sum": 1}, "last_click": {"$max": "$ts"}}},
        {"$sort": {"clicks": -1}},
    ]
    rows = await db.smart_product_clicks.aggregate(pipeline).to_list(length=200)
    out = [{"product_id": r["_id"], "clicks": r["clicks"], "last_click": r.get("last_click")} for r in rows]
    return {"items": out}
