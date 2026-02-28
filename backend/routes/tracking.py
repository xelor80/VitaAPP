from fastapi import APIRouter, Request
import uuid
import httpx
from datetime import datetime, timezone
from user_agents import parse as parse_user_agent

from core.config import db
from models.schemas import ClickEventInput

router = APIRouter()


async def get_geo_info(ip: str) -> dict:
    """Get geolocation info from IP address using free API."""
    if ip in ("127.0.0.1", "localhost", "unknown") or ip.startswith("10.") or ip.startswith("192.168."):
        return {"country": "Local", "region": "Development", "city": "Local"}
    
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            # Using ip-api.com (free, no API key needed, 45 requests/minute)
            res = await client.get(f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city")
            data = res.json()
            if data.get("status") == "success":
                return {
                    "country": data.get("country", "Unknown"),
                    "region": data.get("regionName", "Unknown"),
                    "city": data.get("city", "Unknown")
                }
    except Exception:
        pass
    
    return {"country": "Unknown", "region": "Unknown", "city": "Unknown"}


def parse_device_info(user_agent_string: str) -> dict:
    """Parse user agent to get device info."""
    try:
        ua = parse_user_agent(user_agent_string)
        return {
            "device_type": "Mobile" if ua.is_mobile else ("Tablet" if ua.is_tablet else "Desktop"),
            "browser": f"{ua.browser.family} {ua.browser.version_string}",
            "os": f"{ua.os.family} {ua.os.version_string}",
            "is_bot": ua.is_bot
        }
    except Exception:
        return {
            "device_type": "Unknown",
            "browser": "Unknown",
            "os": "Unknown",
            "is_bot": False
        }


@router.post("/track/click")
async def track_click(event: ClickEventInput, request: Request):
    """Track affiliate link click with extended analytics."""
    
    # Get IP address (handle proxies)
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    # Get user agent
    user_agent = request.headers.get("User-Agent", "")
    
    # Get referrer
    referrer = request.headers.get("Referer", "")
    
    # Parse device info
    device_info = parse_device_info(user_agent)
    
    # Get geolocation
    geo_info = await get_geo_info(ip)
    
    # Get product name from database
    product_name = "Unknown"
    if event.product_id:
        # Try German products first, then Italian
        product = await db.products_de.find_one({"product_id": event.product_id})
        if not product:
            product = await db.products_it.find_one({"product_id": event.product_id})
        if product:
            product_name = product.get("name", "Unknown")
    
    now = datetime.now(timezone.utc)
    
    click_doc = {
        "id": str(uuid.uuid4()),
        "product_id": event.product_id,
        "product_name": product_name,
        "affiliate_url": event.affiliate_url,
        "source": event.source,
        
        # Time info
        "timestamp": now.isoformat(),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "hour": now.hour,
        "weekday": now.strftime("%A"),
        
        # Location info
        "ip": ip,
        "country": geo_info["country"],
        "region": geo_info["region"],
        "city": geo_info["city"],
        
        # Device info
        "device_type": device_info["device_type"],
        "browser": device_info["browser"],
        "os": device_info["os"],
        "is_bot": device_info["is_bot"],
        "user_agent": user_agent[:500],  # Truncate long user agents
        
        # Referrer
        "referrer": referrer[:500] if referrer else ""
    }
    
    await db.clicks.insert_one({**click_doc})
    
    # Return minimal response
    return {
        "id": click_doc["id"],
        "product_id": click_doc["product_id"],
        "timestamp": click_doc["timestamp"]
    }
