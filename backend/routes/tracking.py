from fastapi import APIRouter
import uuid
from datetime import datetime, timezone

from core.config import db
from models.schemas import ClickEventInput

router = APIRouter()


@router.post("/track/click")
async def track_click(event: ClickEventInput):
    click_doc = {
        "id": str(uuid.uuid4()),
        "product_id": event.product_id,
        "affiliate_url": event.affiliate_url,
        "source": event.source,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.clicks.insert_one({**click_doc})
    return click_doc
