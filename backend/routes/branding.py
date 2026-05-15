"""
Branding module — White-Label Brand Templates for VitaGuide+.

Allows the operator (admin) to create multiple brand templates (app name,
logo, accent color, tagline) and switch the *globally active* brand at
runtime for demo/sales presentations to clients.

The mobile app fetches `GET /api/branding/active` on startup and re-applies
the brand to the in-app header, splash and titles. App-icon and native
splash remain VitaGuide+ (would require per-client EAS build).

Logo is stored as a data-URL (base64 PNG/SVG) directly in the brand
document — small footprint (<200 KB typical) and avoids file-server infra.
"""
import uuid
import re
import base64
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from core.config import db

router = APIRouter(prefix="/branding", tags=["branding"])


# Default brand — used when no brand row is marked is_active=True
DEFAULT_BRAND = {
    "id": "default",
    "name": "VitaGuide+ (Default)",
    "app_name_de": "VitaGuide+",
    "app_name_it": "VitaGuide+",
    "app_name_en": "VitaGuide+",
    "tagline_de": "Dein KI-Gesundheitscoach",
    "tagline_it": "Il tuo coach IA della salute",
    "tagline_en": "Your AI health coach",
    "logo_url": "",  # empty → frontend uses bundled default
    "primary_color": "#2E7D52",
    "is_active": True,
    "is_default": True,
}


class BrandBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=80, description="Admin label")
    app_name_de: str = Field(..., min_length=1, max_length=40)
    app_name_it: str = Field(..., min_length=1, max_length=40)
    app_name_en: str = Field(..., min_length=1, max_length=40)
    tagline_de: str = Field("", max_length=120)
    tagline_it: str = Field("", max_length=120)
    tagline_en: str = Field("", max_length=120)
    logo_url: str = Field(
        "",
        max_length=400_000,
        description="Data URL (data:image/png;base64,...) or https URL",
    )
    primary_color: str = Field("#2E7D52", description="#RRGGBB hex")


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    app_name_de: Optional[str] = Field(None, min_length=1, max_length=40)
    app_name_it: Optional[str] = Field(None, min_length=1, max_length=40)
    app_name_en: Optional[str] = Field(None, min_length=1, max_length=40)
    tagline_de: Optional[str] = Field(None, max_length=120)
    tagline_it: Optional[str] = Field(None, max_length=120)
    tagline_en: Optional[str] = Field(None, max_length=120)
    logo_url: Optional[str] = Field(None, max_length=400_000)
    primary_color: Optional[str] = None


def _validate_color(color: str) -> str:
    if not re.match(r"^#[0-9A-Fa-f]{6}$", color):
        raise HTTPException(400, "primary_color must be in #RRGGBB format")
    return color.upper()


def _validate_logo(logo_url: str) -> str:
    """Accepts: empty string, https URL, or data:image/* base64 URL.

    Data URL size limit ~300 KB raw (≈ 400 KB base64).
    """
    if not logo_url:
        return ""
    if logo_url.startswith("https://"):
        return logo_url
    if logo_url.startswith("data:image/"):
        # Validate base64 chunk
        try:
            header, b64 = logo_url.split(",", 1)
            if len(b64) > 400_000:
                raise HTTPException(400, "Logo data URL too large (max ≈ 300 KB)")
            base64.b64decode(b64[:64], validate=True)  # quick sanity
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(400, "Invalid data URL")
        return logo_url
    raise HTTPException(
        400,
        "logo_url must be empty, an https URL, or a data:image/* base64 URL",
    )


def _clean(doc: dict) -> dict:
    """Strip _id and ensure proper types for response."""
    doc.pop("_id", None)
    return doc


# ──────────── PUBLIC ────────────


@router.get("/active")
async def get_active_brand():
    """Public endpoint — mobile app fetches this on startup.

    Returns the currently active brand or the DEFAULT_BRAND fallback.
    Cached client-side ~30 s for live demo switching.
    """
    doc = await db.brands.find_one({"is_active": True}, {"_id": 0})
    if not doc:
        return DEFAULT_BRAND
    return doc


# ──────────── ADMIN CRUD ────────────


@router.get("/admin/brands")
async def list_brands():
    """List all brand templates (admin)."""
    cursor = db.brands.find({}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=200)
    return {"items": items, "total": len(items)}


@router.post("/admin/brands")
async def create_brand(payload: BrandCreate):
    _validate_color(payload.primary_color)
    _validate_logo(payload.logo_url)

    now = datetime.now(timezone.utc).isoformat()
    brand = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "app_name_de": payload.app_name_de.strip(),
        "app_name_it": payload.app_name_it.strip(),
        "app_name_en": payload.app_name_en.strip(),
        "tagline_de": payload.tagline_de.strip(),
        "tagline_it": payload.tagline_it.strip(),
        "tagline_en": payload.tagline_en.strip(),
        "logo_url": payload.logo_url,
        "primary_color": payload.primary_color.upper(),
        "is_active": False,
        "is_default": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.brands.insert_one(dict(brand))
    return _clean(brand)


@router.put("/admin/brands/reset-to-default")
async def reset_to_default():
    """Deactivate all brands → frontend falls back to DEFAULT_BRAND (VitaGuide+)."""
    await db.brands.update_many({}, {"$set": {"is_active": False}})
    return {"reset": True, "active": DEFAULT_BRAND}


@router.put("/admin/brands/{brand_id}")
async def update_brand(brand_id: str, payload: BrandUpdate):
    existing = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Brand not found")

    update_doc: dict = {}
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is None:
            continue
        if k == "primary_color":
            update_doc[k] = _validate_color(v)
        elif k == "logo_url":
            update_doc[k] = _validate_logo(v)
        elif isinstance(v, str):
            update_doc[k] = v.strip()
        else:
            update_doc[k] = v
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.brands.update_one({"id": brand_id}, {"$set": update_doc})
    doc = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    return doc


@router.delete("/admin/brands/{brand_id}")
async def delete_brand(brand_id: str):
    existing = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Brand not found")
    if existing.get("is_active"):
        raise HTTPException(400, "Cannot delete the active brand. Activate another brand first.")
    await db.brands.delete_one({"id": brand_id})
    return {"deleted": True, "id": brand_id}


@router.put("/admin/brands/{brand_id}/activate")
async def activate_brand(brand_id: str):
    """Set this brand as the globally active brand. Deactivates all others."""
    existing = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Brand not found")
    # Deactivate all
    await db.brands.update_many({}, {"$set": {"is_active": False}})
    # Activate target
    await db.brands.update_one(
        {"id": brand_id},
        {"$set": {"is_active": True, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    doc = await db.brands.find_one({"id": brand_id}, {"_id": 0})
    return {"activated": True, "brand": doc}
