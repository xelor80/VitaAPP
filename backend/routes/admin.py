from fastapi import APIRouter
from datetime import datetime, timezone

from core.config import db

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/llm-logs")
async def get_llm_logs(limit: int = 20, endpoint: str = None):
    query = {}
    if endpoint:
        query["endpoint"] = endpoint
    logs = await db.llm_responses.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).limit(min(limit, 100)).to_list(min(limit, 100))

    total = await db.llm_responses.count_documents({})
    success_count = await db.llm_responses.count_documents({"success": True})
    avg_pipeline = [{"$match": {"success": True}}, {"$group": {"_id": None, "avg_latency": {"$avg": "$latency_ms"}}}]
    avg_result = await db.llm_responses.aggregate(avg_pipeline).to_list(1)
    avg_latency = int(avg_result[0]["avg_latency"]) if avg_result else 0

    return {
        "stats": {
            "total_calls": total,
            "success_rate": f"{(success_count/total*100):.1f}%" if total > 0 else "0%",
            "avg_latency_ms": avg_latency,
        },
        "logs": logs
    }
