from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from core.config import client, logger
from routes import analysis, products, tracking, diary, admin

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(admin.router)
api_router.include_router(analysis.router)
api_router.include_router(products.router)
api_router.include_router(tracking.router)
api_router.include_router(diary.router)

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
