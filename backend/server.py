from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib
import secrets
from pathlib import Path

from core.config import client, logger
from routes import analysis, products, tracking, diary, admin, settings, health_profile, supplement_plan, progress, videos, label_analysis, health_score

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Admin webapp directory
ADMIN_WEBAPP_DIR = Path(__file__).parent / "admin_webapp"
UPLOADS_DIR = Path(__file__).parent / "uploads"

# Admin password (hashed)
ADMIN_PASSWORD = "Wk220480xel!"
active_tokens = set()

class AuthRequest(BaseModel):
    password: str

# Admin auth endpoint
@api_router.post("/admin/auth")
async def admin_auth(auth: AuthRequest):
    if auth.password == ADMIN_PASSWORD:
        token = secrets.token_urlsafe(32)
        active_tokens.add(token)
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

# Serve uploaded files (labels)
@api_router.get("/uploads/labels/{filename}")
async def serve_uploaded_label(filename: str):
    file_path = UPLOADS_DIR / "labels" / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed_data():
    logger.info("VitaGuide API started (modular)")


@app.on_event("shutdown")
async def shutdown():
    client.close()
