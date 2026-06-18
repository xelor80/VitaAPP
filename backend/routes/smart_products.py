"""
Smart Product Integration (Affiliate Monetization)
Context-aware, non-intrusive product recommendations.
Placeholder products are seeded; admin can later replace affiliate_url.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from core.config import db, logger

router = APIRouter(prefix="/smart-products", tags=["smart-products"])


# ── Models ──

class ClickRequest(BaseModel):
    product_id: str
    profile_id: Optional[str] = None
    context: Optional[str] = None  # dashboard | stress | fasting | weight | analysis


class ImpressionRequest(BaseModel):
    """Logged when a product card is rendered in the UI (passive view)."""
    product_id: str
    profile_id: Optional[str] = None
    context: Optional[str] = None


class ImpressionBatch(BaseModel):
    """Batch endpoint to log multiple impressions in one HTTP call."""
    items: List[ImpressionRequest]


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
    is_featured: bool = False  # Show in home-screen "Neu" slider
    featured_order: int = 0    # Lower = first in slider
    badge: Optional[str] = None  # e.g. "NEU", "TOP", "-30%" – tiny ribbon overlay


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
    {
        "id": "smart-slim-beauty-001",
        "title_de": "Slim & Beauty",
        "title_it": "Slim & Beauty",
        "title_en": "Slim & Beauty",
        "description_de": "Premium-Komplex fuer Stoffwechsel, Haut und gesunde Gewichtsreduktion.",
        "description_it": "Complesso premium per metabolismo, pelle e perdita di peso sana.",
        "description_en": "Premium complex for metabolism, skin and healthy weight loss.",
        "image_url": None,
        "affiliate_url": None,
        "vendor": "Platzhalter",
        "price_eur": None,
        "contexts": ["weight", "weight_metabolism", "abnehm_guide"],
        "symptoms": ["abnehmen", "stoffwechsel", "haut"],
        "deficits": [],
        "enabled": True,
        "is_featured": True,
        "featured_order": 1,
        "badge": "NEU",
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
        candidates.sort(key=lambda x: (-x.get("_score", 0), 0 if x.get("is_featured") else 1, x.get("featured_order", 999), x.get("id", "")))
    else:
        # No profile_id: featured first, then by featured_order
        candidates.sort(key=lambda x: (0 if x.get("is_featured") else 1, x.get("featured_order", 999), x.get("id", "")))
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


@router.get("/featured")
async def featured(limit: int = Query(8, ge=1, le=20)):
    """Featured product slider for the home screen.
    Returns products with is_featured=true, sorted by featured_order (asc) then created_at desc.
    """
    await ensure_seeded()
    cursor = db.smart_products.find(
        {"enabled": True, "is_featured": True},
        {"_id": 0},
    ).sort([("featured_order", 1), ("created_at", -1)]).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"items": items, "count": len(items)}


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


@router.post("/impression")
async def track_impression(req: ImpressionRequest):
    """Log a passive view (product card rendered, not necessarily tapped)."""
    entry = {
        "id": str(uuid.uuid4()),
        "product_id": req.product_id,
        "profile_id": req.profile_id,
        "context": req.context,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await db.smart_product_impressions.insert_one(entry)
    return {"ok": True}


@router.post("/impression/batch")
async def track_impressions_batch(batch: ImpressionBatch):
    """Batch endpoint to avoid HTTP overhead when several cards render at once."""
    if not batch.items:
        return {"ok": True, "inserted": 0}
    now = datetime.now(timezone.utc).isoformat()
    docs = [
        {
            "id": str(uuid.uuid4()),
            "product_id": it.product_id,
            "profile_id": it.profile_id,
            "context": it.context,
            "ts": now,
        }
        for it in batch.items[:50]  # safety cap
    ]
    await db.smart_product_impressions.insert_many(docs)
    return {"ok": True, "inserted": len(docs)}


@router.get("/stats")
async def stats(days: int = Query(30, ge=1, le=365)):
    """Aggregate impressions, clicks, CTR per product (admin).

    Returns:
      - per_product: [{product_id, title_de, impressions, clicks, ctr, last_click}]
      - totals: {impressions, clicks, ctr, products_with_clicks}
      - window_days
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Impressions per product
    imp_pipe = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$product_id", "impressions": {"$sum": 1}}},
    ]
    imps = await db.smart_product_impressions.aggregate(imp_pipe).to_list(length=500)
    imp_map = {r["_id"]: r["impressions"] for r in imps}

    # Clicks per product
    click_pipe = [
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$product_id", "clicks": {"$sum": 1}, "last_click": {"$max": "$ts"}}},
    ]
    clicks = await db.smart_product_clicks.aggregate(click_pipe).to_list(length=500)
    click_map = {r["_id"]: r for r in clicks}

    # Join with product titles
    all_product_ids = set(imp_map.keys()) | set(click_map.keys())
    products = await db.smart_products.find(
        {"id": {"$in": list(all_product_ids)}},
        {"_id": 0, "id": 1, "title_de": 1, "is_featured": 1},
    ).to_list(length=200) if all_product_ids else []
    title_map = {p["id"]: p for p in products}

    rows = []
    total_imp = 0
    total_clicks = 0
    for pid in all_product_ids:
        imp = imp_map.get(pid, 0)
        clk = click_map.get(pid, {}).get("clicks", 0)
        ctr = round((clk / imp) * 100, 2) if imp > 0 else 0.0
        title = title_map.get(pid, {}).get("title_de", pid)
        is_featured = title_map.get(pid, {}).get("is_featured", False)
        rows.append({
            "product_id": pid,
            "title_de": title,
            "is_featured": is_featured,
            "impressions": imp,
            "clicks": clk,
            "ctr_pct": ctr,
            "last_click": click_map.get(pid, {}).get("last_click"),
        })
        total_imp += imp
        total_clicks += clk
    rows.sort(key=lambda r: (-r["clicks"], -r["impressions"]))

    overall_ctr = round((total_clicks / total_imp) * 100, 2) if total_imp > 0 else 0.0
    return {
        "window_days": days,
        "totals": {
            "impressions": total_imp,
            "clicks": total_clicks,
            "ctr_pct": overall_ctr,
            "products_with_clicks": sum(1 for r in rows if r["clicks"] > 0),
        },
        "per_product": rows,
    }


@router.get("/stats/timeseries")
async def stats_timeseries(
    product_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=180),
):
    """Daily time-series of impressions + clicks. Optional filter by product."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    match_clicks: dict = {"ts": {"$gte": cutoff}}
    match_imps: dict = {"ts": {"$gte": cutoff}}
    if product_id:
        match_clicks["product_id"] = product_id
        match_imps["product_id"] = product_id

    def daily_pipeline(match: dict):
        return [
            {"$match": match},
            {"$project": {"day": {"$substr": ["$ts", 0, 10]}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]

    clicks_daily = await db.smart_product_clicks.aggregate(daily_pipeline(match_clicks)).to_list(length=400)
    imps_daily = await db.smart_product_impressions.aggregate(daily_pipeline(match_imps)).to_list(length=400)
    clk_map = {r["_id"]: r["count"] for r in clicks_daily}
    imp_map = {r["_id"]: r["count"] for r in imps_daily}

    all_days = sorted(set(clk_map.keys()) | set(imp_map.keys()))
    series = [
        {
            "date": d,
            "impressions": imp_map.get(d, 0),
            "clicks": clk_map.get(d, 0),
            "ctr_pct": round((clk_map.get(d, 0) / imp_map.get(d, 1)) * 100, 2) if imp_map.get(d, 0) > 0 else 0.0,
        }
        for d in all_days
    ]
    return {"product_id": product_id, "days": days, "series": series}


@router.get("/stats/by-context")
async def stats_by_context(days: int = Query(30, ge=1, le=365)):
    """Breakdown of clicks + impressions per context (dashboard, weight, etc.)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    imps = await db.smart_product_impressions.aggregate([
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$context", "impressions": {"$sum": 1}}},
    ]).to_list(length=50)
    clicks = await db.smart_product_clicks.aggregate([
        {"$match": {"ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$context", "clicks": {"$sum": 1}}},
    ]).to_list(length=50)
    imp_map = {r["_id"] or "unknown": r["impressions"] for r in imps}
    clk_map = {r["_id"] or "unknown": r["clicks"] for r in clicks}
    all_ctx = sorted(set(imp_map.keys()) | set(clk_map.keys()))
    out = []
    for ctx in all_ctx:
        imp = imp_map.get(ctx, 0)
        clk = clk_map.get(ctx, 0)
        out.append({
            "context": ctx,
            "impressions": imp,
            "clicks": clk,
            "ctr_pct": round((clk / imp) * 100, 2) if imp > 0 else 0.0,
        })
    out.sort(key=lambda r: -r["clicks"])
    return {"window_days": days, "by_context": out}


@router.get("/stats/product/{product_id}")
async def stats_product_detail(product_id: str, days: int = Query(30, ge=1, le=365)):
    """Detailed conversion report for a single product (e.g. Slim & Beauty)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    imp_cnt = await db.smart_product_impressions.count_documents(
        {"product_id": product_id, "ts": {"$gte": cutoff}}
    )
    clk_cnt = await db.smart_product_clicks.count_documents(
        {"product_id": product_id, "ts": {"$gte": cutoff}}
    )
    # Unique profiles (engagement breadth)
    unique_clickers = await db.smart_product_clicks.distinct(
        "profile_id", {"product_id": product_id, "ts": {"$gte": cutoff}, "profile_id": {"$ne": None}}
    )
    unique_viewers = await db.smart_product_impressions.distinct(
        "profile_id", {"product_id": product_id, "ts": {"$gte": cutoff}, "profile_id": {"$ne": None}}
    )
    # Per-context breakdown
    ctx_clicks = await db.smart_product_clicks.aggregate([
        {"$match": {"product_id": product_id, "ts": {"$gte": cutoff}}},
        {"$group": {"_id": "$context", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}},
    ]).to_list(length=50)
    product = await db.smart_products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    return {
        "product": {
            "id": product["id"],
            "title_de": product.get("title_de"),
            "is_featured": product.get("is_featured", False),
            "enabled": product.get("enabled", True),
            "badge": product.get("badge"),
        },
        "window_days": days,
        "impressions": imp_cnt,
        "clicks": clk_cnt,
        "ctr_pct": round((clk_cnt / imp_cnt) * 100, 2) if imp_cnt > 0 else 0.0,
        "unique_viewers": len(unique_viewers),
        "unique_clickers": len(unique_clickers),
        "viewer_to_clicker_conversion_pct": round(
            (len(unique_clickers) / len(unique_viewers)) * 100, 2
        ) if unique_viewers else 0.0,
        "by_context": [{"context": c["_id"] or "unknown", "clicks": c["clicks"]} for c in ctx_clicks],
    }
