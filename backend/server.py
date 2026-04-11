from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
import hashlib
import secrets
import asyncio
import os
from pathlib import Path

from core.config import client, db, logger
from core.middleware import (
    RateLimitMiddleware, create_admin_token, verify_admin_token,
    cleanup_expired_tokens
)
from routes import analysis, products, tracking, diary, admin, settings, health_profile, supplement_plan, progress, videos, label_analysis, health_score, admin_health_stats, supplement_interactions, correlation_analysis, shop_import, email_export, tts, daily_tasks, achievements, trust_stats, price_alerts, water_tracking, medications, rewards, auth, stress

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Admin webapp directory
ADMIN_WEBAPP_DIR = Path(__file__).parent / "admin_webapp"
UPLOADS_DIR = Path(__file__).parent / "uploads"

# Admin password from environment
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')

class AuthRequest(BaseModel):
    password: str

# Admin auth endpoint
@api_router.post("/admin/auth")
async def admin_auth(auth: AuthRequest):
    if auth.password == ADMIN_PASSWORD:
        token = secrets.token_urlsafe(32)
        create_admin_token(token)
        return {"success": True, "token": token}
    raise HTTPException(status_code=401, detail="Invalid password")

# Serve admin webapp static files
@api_router.get("/admin-app/{filename}")
async def serve_admin_static(filename: str):
    # Strip cache-busting query params from filename
    clean_name = filename.split("?")[0]
    file_path = ADMIN_WEBAPP_DIR / clean_name
    if file_path.exists() and file_path.is_file():
        content_type = "text/html"
        if clean_name.endswith(".css"):
            content_type = "text/css"
        elif clean_name.endswith(".js"):
            content_type = "application/javascript"
        from starlette.responses import Response
        content = file_path.read_bytes()
        return Response(content=content, media_type=content_type, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    raise HTTPException(status_code=404, detail="File not found")

# Serve admin webapp main page
@api_router.get("/admin-app")
async def serve_admin_webapp():
    index_path = ADMIN_WEBAPP_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Admin webapp not found")

# Include all route modules
api_router.include_router(admin.router)
api_router.include_router(settings.router)
api_router.include_router(health_profile.router)
api_router.include_router(supplement_plan.router)
api_router.include_router(progress.router)
api_router.include_router(analysis.router)
api_router.include_router(products.router)
api_router.include_router(tracking.router)
api_router.include_router(diary.router)
api_router.include_router(videos.router)
api_router.include_router(label_analysis.router)
api_router.include_router(health_score.router)
api_router.include_router(admin_health_stats.router)
api_router.include_router(supplement_interactions.router)
api_router.include_router(correlation_analysis.router)
api_router.include_router(shop_import.router)
api_router.include_router(email_export.router)
api_router.include_router(tts.router)
api_router.include_router(daily_tasks.router)
api_router.include_router(achievements.router)
api_router.include_router(trust_stats.router)
api_router.include_router(price_alerts.router)
api_router.include_router(water_tracking.router)
api_router.include_router(medications.router)
api_router.include_router(rewards.router)
api_router.include_router(auth.router)
api_router.include_router(stress.router)

# Serve uploaded files (labels)
@api_router.get("/uploads/labels/{filename}")
async def serve_uploaded_label(filename: str):
    file_path = UPLOADS_DIR / "labels" / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

app.include_router(api_router)

# ── Middlewares (order matters: last added = first executed) ──

# 1. CORS - restrict to own domains
ALLOWED_ORIGINS = [
    os.environ.get("EXPO_PUBLIC_BACKEND_URL", ""),
    os.environ.get("CORS_ORIGINS", ""),
    "http://localhost:3000",
    "http://localhost:8001",
    "exp://localhost:8081",
]
# Filter out empty strings
ALLOWED_ORIGINS = [o for o in ALLOWED_ORIGINS if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. GZip compression for responses > 500 bytes
app.add_middleware(GZipMiddleware, minimum_size=500)

# 3. Rate limiting per IP
app.add_middleware(RateLimitMiddleware)


@app.on_event("startup")
async def seed_data():
    logger.info("VitaGuide API started (modular)")
    # Start background sync scheduler
    from routes.shop_import import start_sync_scheduler
    asyncio.create_task(start_sync_scheduler())
    
    # Seed recipes from JSON if collection is empty
    try:
        recipe_count = await db.recipes.count_documents({})
        if recipe_count == 0:
            import json
            recipes_path = os.path.join(os.path.dirname(__file__), "recipes.json")
            if os.path.exists(recipes_path):
                with open(recipes_path, "r", encoding="utf-8") as f:
                    recipes = json.load(f)
                if recipes:
                    await db.recipes.insert_many(recipes)
                    logger.info(f"Seeded {len(recipes)} recipes into MongoDB")
    except Exception as e:
        logger.warning(f"Recipe seeding note: {e}")
    
    # Create MongoDB indexes for performance
    try:
        await db.health_profiles.create_index("profile_id", unique=True, sparse=True)
        await db.supplement_plans.create_index("profile_id", unique=True, sparse=True)
        await db.symptom_tracking.create_index([("profile_id", 1), ("date", -1)])
        await db.symptom_tracking.create_index("profile_id")
        await db.compliance_tracking.create_index("profile_id")
        await db.recipes.create_index("active")
        await db.products_de.create_index("nutrients")
        await db.products_it.create_index("nutrients")
        await db.diary_entries.create_index([("profile_id", 1), ("created_at", -1)])
        await db.achievements.create_index("profile_id")
        await db.price_alerts.create_index("profile_id")
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("user_id", unique=True)
        logger.info("MongoDB indexes ensured")
    except Exception as e:
        logger.warning(f"Index creation note: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
