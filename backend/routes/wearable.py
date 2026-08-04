"""
Wearable / HBand integration – vendor-agnostic REST layer.

All device- and measurement-related data is stored in these collections:
  - `wearable_devices`     – paired devices (one user can have many)
  - `health_measurements`  – single value samples (HR, HRV, SpO₂, temp, …)
  - `sleep_sessions`       – nightly sleep windows
  - `wearable_sync_logs`   – audit trail of sync attempts

The API layer intentionally has **no** HBand-specific fields. Adapters on the
mobile client map SDK payloads to the neutral models below.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo import ASCENDING

from core.config import db, logger

router = APIRouter(prefix="/wearable", tags=["wearable"])

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------
MetricType = Literal[
    "heart_rate",
    "resting_heart_rate",
    "hrv",
    "spo2",
    "skin_temperature",
    "respiration_rate",
    "stress",
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
    "blood_glucose_estimated",   # ⚠️ Wellness-estimate only
    "ecg",                        # waveform in metadata.samples
    "steps",
    "distance_m",
    "active_minutes",
    "calories_kcal",
    "battery",
]

# Metrics that are non-medical estimates. Frontend MUST show a disclaimer.
ESTIMATE_METRICS = {
    "blood_glucose_estimated",
    "blood_pressure_systolic",
    "blood_pressure_diastolic",
}

CONNECTION_STATES = {"paired", "connected", "disconnected", "unreachable"}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class WearableDeviceIn(BaseModel):
    user_id: str
    provider: str = "hband"           # 'hband' | 'demo' | 'polar' …
    model: Optional[str] = None
    name: Optional[str] = None
    firmware_version: Optional[str] = None
    hardware_version: Optional[str] = None
    serial_number: Optional[str] = None
    ble_address: Optional[str] = None
    battery_level: Optional[int] = None


class WearableDeviceUpdate(BaseModel):
    name: Optional[str] = None
    firmware_version: Optional[str] = None
    battery_level: Optional[int] = None
    connection_status: Optional[str] = None
    last_connected_at: Optional[str] = None
    last_sync_at: Optional[str] = None


class MeasurementIn(BaseModel):
    metric_type: MetricType
    value: float
    unit: str
    measured_at: str                  # ISO-8601
    source: Optional[str] = None       # e.g. "hband:auto", "hband:manual"
    quality: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MeasurementBatchIn(BaseModel):
    user_id: str
    device_id: str
    measurements: List[MeasurementIn] = Field(..., min_length=1, max_length=2000)


class SleepSessionIn(BaseModel):
    user_id: str
    device_id: str
    start_time: str
    end_time: str
    total_minutes: int
    awake_minutes: Optional[int] = 0
    light_sleep_minutes: Optional[int] = 0
    deep_sleep_minutes: Optional[int] = 0
    rem_sleep_minutes: Optional[int] = 0
    interruptions: Optional[int] = 0
    source_score: Optional[int] = None
    raw_metadata: Optional[Dict[str, Any]] = None


class SyncLogIn(BaseModel):
    user_id: str
    device_id: str
    started_at: str
    finished_at: Optional[str] = None
    status: str                       # 'success' | 'partial' | 'failed'
    records_received: int = 0
    error_code: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Index helper (idempotent, cheap on startup)
# ---------------------------------------------------------------------------
_indexes_ensured = False


async def _ensure_indexes():
    global _indexes_ensured
    if _indexes_ensured:
        return
    try:
        await db.wearable_devices.create_index(
            [("user_id", ASCENDING), ("device_id", ASCENDING)],
            unique=True, name="ux_user_device"
        )
        await db.health_measurements.create_index(
            [("user_id", ASCENDING), ("device_id", ASCENDING),
             ("metric_type", ASCENDING), ("measured_at", ASCENDING)],
            unique=True, name="ux_measurement_dedupe"
        )
        await db.health_measurements.create_index(
            [("user_id", ASCENDING), ("measured_at", ASCENDING)],
            name="ix_user_time"
        )
        await db.sleep_sessions.create_index(
            [("user_id", ASCENDING), ("device_id", ASCENDING), ("start_time", ASCENDING)],
            unique=True, name="ux_sleep_dedupe"
        )
        _indexes_ensured = True
        logger.info("Wearable indexes ensured")
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Wearable index note: {e}")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Devices
# ---------------------------------------------------------------------------
@router.post("/devices")
async def create_or_pair_device(payload: WearableDeviceIn):
    """Create or re-pair a device (idempotent per user + ble_address)."""
    await _ensure_indexes()
    doc = payload.model_dump()
    doc["device_id"] = str(uuid.uuid4())
    doc["connection_status"] = "paired"
    doc["paired_at"] = _now_iso()
    doc["last_connected_at"] = _now_iso()
    doc["last_sync_at"] = None
    doc["created_at"] = _now_iso()
    doc["updated_at"] = _now_iso()

    # If a device with same ble_address exists for this user, upsert
    if payload.ble_address:
        existing = await db.wearable_devices.find_one({
            "user_id": payload.user_id, "ble_address": payload.ble_address
        })
        if existing:
            update = {k: v for k, v in doc.items() if k not in ("created_at", "device_id", "paired_at")}
            await db.wearable_devices.update_one(
                {"_id": existing["_id"]}, {"$set": update}
            )
            existing.update(update)
            existing.pop("_id", None)
            return {"success": True, "device": existing, "was_paired_before": True}

    await db.wearable_devices.insert_one({**doc})
    doc.pop("_id", None)
    return {"success": True, "device": doc, "was_paired_before": False}


@router.get("/devices")
async def list_devices(user_id: str = Query(...)):
    await _ensure_indexes()
    devices = await db.wearable_devices.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("paired_at", -1).to_list(50)
    return {"devices": devices}


@router.get("/devices/{device_id}")
async def get_device(device_id: str):
    doc = await db.wearable_devices.find_one({"device_id": device_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return doc


@router.put("/devices/{device_id}")
async def update_device(device_id: str, payload: WearableDeviceUpdate):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    update["updated_at"] = _now_iso()
    res = await db.wearable_devices.update_one(
        {"device_id": device_id}, {"$set": update}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Device not found")
    return {"success": True, "updated": list(update.keys())}


@router.delete("/devices/{device_id}")
async def delete_device(device_id: str, purge_data: bool = Query(False)):
    """Remove pairing. `purge_data=true` additionally deletes health data."""
    device = await db.wearable_devices.find_one({"device_id": device_id})
    if not device:
        raise HTTPException(404, "Device not found")

    await db.wearable_devices.delete_one({"device_id": device_id})

    purged = {"measurements": 0, "sleep_sessions": 0, "sync_logs": 0}
    if purge_data:
        r1 = await db.health_measurements.delete_many({"device_id": device_id})
        r2 = await db.sleep_sessions.delete_many({"device_id": device_id})
        r3 = await db.wearable_sync_logs.delete_many({"device_id": device_id})
        purged = {
            "measurements": r1.deleted_count,
            "sleep_sessions": r2.deleted_count,
            "sync_logs": r3.deleted_count,
        }
    return {"success": True, "purged": purged}


# ---------------------------------------------------------------------------
# Measurements
# ---------------------------------------------------------------------------
@router.post("/measurements/batch")
async def upload_measurements(payload: MeasurementBatchIn):
    """Upsert-based bulk insert (dedupe on user+device+metric+measured_at).

    For metrics in ESTIMATE_METRICS a disclaimer is force-injected into metadata
    to guarantee the app can never accidentally strip it.
    """
    await _ensure_indexes()
    now = _now_iso()
    inserted = 0
    duplicates = 0
    for m in payload.measurements:
        meta = dict(m.metadata or {})
        if m.metric_type in ESTIMATE_METRICS:
            meta["estimate"] = True
            meta.setdefault("not_medical", True)
            meta.setdefault(
                "disclaimer",
                "Wellness-Schätzung. Kein medizinischer Messwert.",
            )
        key = {
            "user_id": payload.user_id,
            "device_id": payload.device_id,
            "metric_type": m.metric_type,
            "measured_at": m.measured_at,
        }
        doc = {
            **key,
            "value": m.value,
            "unit": m.unit,
            "source": m.source or "wearable",
            "quality": m.quality,
            "metadata": meta,
            "created_at": now,
        }
        res = await db.health_measurements.update_one(
            key, {"$setOnInsert": doc}, upsert=True
        )
        if res.upserted_id is not None:
            inserted += 1
        else:
            duplicates += 1

    # Update device last_sync_at
    await db.wearable_devices.update_one(
        {"device_id": payload.device_id},
        {"$set": {"last_sync_at": now}}
    )
    return {
        "success": True,
        "inserted": inserted,
        "duplicates": duplicates,
        "total": len(payload.measurements),
    }


@router.get("/measurements")
async def query_measurements(
    user_id: str = Query(...),
    metric: Optional[str] = Query(None),
    device_id: Optional[str] = Query(None),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    limit: int = Query(1000, le=5000),
):
    q: Dict[str, Any] = {"user_id": user_id}
    if metric:
        q["metric_type"] = metric
    if device_id:
        q["device_id"] = device_id
    if from_ or to:
        rng: Dict[str, str] = {}
        if from_:
            rng["$gte"] = from_
        if to:
            rng["$lte"] = to
        q["measured_at"] = rng

    docs = await db.health_measurements.find(q, {"_id": 0}) \
        .sort("measured_at", -1).limit(limit).to_list(limit)
    return {"count": len(docs), "measurements": docs}


# ---------------------------------------------------------------------------
# Sleep sessions
# ---------------------------------------------------------------------------
@router.post("/sleep-sessions/batch")
async def upload_sleep_sessions(items: List[SleepSessionIn]):
    if not items:
        return {"success": True, "inserted": 0, "duplicates": 0}
    await _ensure_indexes()
    now = _now_iso()
    inserted = 0
    duplicates = 0
    for s in items:
        key = {
            "user_id": s.user_id,
            "device_id": s.device_id,
            "start_time": s.start_time,
        }
        doc = {
            **s.model_dump(),
            "session_id": str(uuid.uuid4()),
            "created_at": now,
        }
        res = await db.sleep_sessions.update_one(
            key, {"$setOnInsert": doc}, upsert=True
        )
        if res.upserted_id is not None:
            inserted += 1
        else:
            duplicates += 1
    return {"success": True, "inserted": inserted, "duplicates": duplicates, "total": len(items)}


@router.get("/sleep-sessions")
async def query_sleep_sessions(
    user_id: str = Query(...),
    from_: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = Query(None),
    limit: int = Query(60, le=365),
):
    q: Dict[str, Any] = {"user_id": user_id}
    if from_ or to:
        rng: Dict[str, str] = {}
        if from_:
            rng["$gte"] = from_
        if to:
            rng["$lte"] = to
        q["start_time"] = rng
    docs = await db.sleep_sessions.find(q, {"_id": 0}) \
        .sort("start_time", -1).limit(limit).to_list(limit)
    return {"count": len(docs), "sessions": docs}


# ---------------------------------------------------------------------------
# Sync log (audit)
# ---------------------------------------------------------------------------
@router.post("/sync-status")
async def append_sync_log(payload: SyncLogIn):
    doc = payload.model_dump()
    doc["log_id"] = str(uuid.uuid4())
    doc["created_at"] = _now_iso()
    await db.wearable_sync_logs.insert_one({**doc})
    doc.pop("_id", None)
    return {"success": True, "log": doc}


@router.get("/sync-status")
async def get_sync_status(user_id: str = Query(...), limit: int = Query(20, le=100)):
    docs = await db.wearable_sync_logs.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    return {"count": len(docs), "logs": docs}


# ---------------------------------------------------------------------------
# Daily aggregation (basic; scoring engine will build on top)
# ---------------------------------------------------------------------------
@router.get("/daily-summary/{user_id}")
async def daily_summary(user_id: str, date: str = Query(..., description="YYYY-MM-DD")):
    """Aggregate simple daily numbers for the given day (UTC-based)."""
    try:
        day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    start = day.isoformat()
    end = (day + timedelta(days=1)).isoformat()

    pipeline = [
        {"$match": {
            "user_id": user_id,
            "measured_at": {"$gte": start, "$lt": end},
        }},
        {"$group": {
            "_id": "$metric_type",
            "avg": {"$avg": "$value"},
            "min": {"$min": "$value"},
            "max": {"$max": "$value"},
            "sum": {"$sum": "$value"},
            "count": {"$sum": 1},
        }},
    ]
    metrics: Dict[str, Any] = {}
    async for row in db.health_measurements.aggregate(pipeline):
        metrics[row["_id"]] = {
            "avg": round(row["avg"], 2) if row["avg"] is not None else None,
            "min": row["min"],
            "max": row["max"],
            "sum": row["sum"],
            "count": row["count"],
        }

    # Sleep for that night (session ending in that day)
    sleep = None
    sess = await db.sleep_sessions.find_one(
        {"user_id": user_id, "start_time": {"$gte": (day - timedelta(days=1)).isoformat(), "$lt": end}},
        {"_id": 0}, sort=[("start_time", -1)]
    )
    if sess:
        sleep = {
            "total_minutes": sess.get("total_minutes"),
            "deep_sleep_minutes": sess.get("deep_sleep_minutes"),
            "rem_sleep_minutes": sess.get("rem_sleep_minutes"),
            "light_sleep_minutes": sess.get("light_sleep_minutes"),
            "awake_minutes": sess.get("awake_minutes"),
            "source_score": sess.get("source_score"),
        }

    data_completeness = _estimate_completeness(metrics, sleep)
    return {
        "date": date,
        "user_id": user_id,
        "metrics": metrics,
        "sleep": sleep,
        "data_completeness": data_completeness,
        "note": "VitaGuide-Scores werden separat berechnet, sobald Basislinien (≥7 Tage) vorliegen.",
    }


def _estimate_completeness(metrics: Dict[str, Any], sleep: Optional[Dict[str, Any]]) -> float:
    """Rough completeness heuristic: 0.0 – 1.0."""
    score = 0.0
    if metrics.get("heart_rate", {}).get("count", 0) >= 6:
        score += 0.35
    if metrics.get("hrv", {}).get("count", 0) >= 1:
        score += 0.20
    if metrics.get("spo2", {}).get("count", 0) >= 1:
        score += 0.10
    if metrics.get("steps", {}).get("count", 0) >= 1:
        score += 0.15
    if sleep and sleep.get("total_minutes", 0) >= 60:
        score += 0.20
    return round(min(score, 1.0), 2)


# ---------------------------------------------------------------------------
# Baselines & scoring
# ---------------------------------------------------------------------------
from routes.wearable_scoring import compute_user_baselines, compute_scores_for_date  # noqa: E402


@router.get("/baselines/{user_id}")
async def get_baselines(user_id: str):
    """Return 28-day rolling baselines per metric."""
    return await compute_user_baselines(user_id)


@router.get("/scores/{user_id}")
async def get_scores(user_id: str, date: str = Query(..., description="YYYY-MM-DD")):
    """Return VitaGuide Recovery/Sleep/Activity/Readiness scores for a day."""
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    return await compute_scores_for_date(user_id, date)


@router.get("/timeseries/{user_id}/{metric}")
async def timeseries(
    user_id: str,
    metric: str,
    range_: str = Query("week", alias="range", description="day | week | month | 3month | year"),
):
    """Return aggregated daily buckets for charting."""
    now = datetime.now(timezone.utc)
    if range_ == "day":
        days = 1
    elif range_ == "week":
        days = 7
    elif range_ == "month":
        days = 30
    elif range_ == "3month":
        days = 90
    elif range_ == "year":
        days = 365
    else:
        raise HTTPException(400, "range invalid")

    since_dt = now - timedelta(days=days)
    since = since_dt.isoformat()

    if range_ == "day":
        # Return raw samples for the last 24h (no bucketing)
        docs = await db.health_measurements.find(
            {"user_id": user_id, "metric_type": metric, "measured_at": {"$gte": since}},
            {"_id": 0, "measured_at": 1, "value": 1},
        ).sort("measured_at", 1).to_list(500)
        return {"range": range_, "metric": metric, "granularity": "raw", "points": docs}

    pipeline = [
        {"$match": {
            "user_id": user_id, "metric_type": metric,
            "measured_at": {"$gte": since},
        }},
        {"$addFields": {"day": {"$substr": ["$measured_at", 0, 10]}}},
        {"$group": {
            "_id": "$day",
            "avg": {"$avg": "$value"},
            "min": {"$min": "$value"},
            "max": {"$max": "$value"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    points = []
    async for row in db.health_measurements.aggregate(pipeline):
        points.append({
            "day": row["_id"],
            "avg": round(row["avg"], 2) if row["avg"] is not None else None,
            "min": row["min"], "max": row["max"], "count": row["count"],
        })
    # Compute stats for entire range
    if points:
        avg_all = round(sum(p["avg"] for p in points if p["avg"] is not None) / max(1, len(points)), 2)
        min_all = min((p["min"] for p in points), default=None)
        max_all = max((p["max"] for p in points), default=None)
    else:
        avg_all = min_all = max_all = None
    return {
        "range": range_, "metric": metric, "granularity": "daily",
        "points": points,
        "stats": {"avg": avg_all, "min": min_all, "max": max_all, "days": len(points)},
    }
