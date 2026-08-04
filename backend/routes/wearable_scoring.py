"""
Baseline computation + VitaGuide Score engine for wearable data.

All formulas are transparent and driven by `backend/scoring_config.json` so
they can be tuned without code changes. Scores are marked as **BETA** and
carry a data-completeness value; below the minimum data days the score is
returned as `null` with an explanation.
"""
from __future__ import annotations

import json
import os
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from core.config import db

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "scoring_config.json")

with open(CONFIG_PATH, "r", encoding="utf-8") as _f:
    CONFIG: Dict[str, Any] = json.load(_f)

BASELINE_WINDOW_DAYS = CONFIG["notes"]["baseline_window_days"]
BASELINE_MIN_DAYS = CONFIG["notes"]["baseline_min_days"]
MIN_DATA_DAYS_FOR_SCORES = CONFIG["notes"]["min_data_days_for_scores"]

# ---------------------------------------------------------------------------
# Baselines
# ---------------------------------------------------------------------------
BASELINE_METRICS = [
    "hrv",
    "resting_heart_rate",
    "heart_rate",           # will be interpreted as "average HR"
    "spo2",
    "skin_temperature",
    "steps",
    "active_minutes",
    "respiration_rate",
]


async def compute_user_baselines(user_id: str) -> Dict[str, Any]:
    """Compute rolling-median baselines over the last BASELINE_WINDOW_DAYS.

    Returns per metric:
      { median, days_used, sufficient (bool), latest_value, delta_pct }
    """
    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=BASELINE_WINDOW_DAYS)).isoformat()

    # Pull all measurements once for efficiency
    cursor = db.health_measurements.find(
        {"user_id": user_id, "measured_at": {"$gte": since}},
        {"_id": 0, "metric_type": 1, "value": 1, "measured_at": 1},
    )
    docs = await cursor.to_list(20000)

    by_metric: Dict[str, List[Tuple[str, float]]] = {}
    for d in docs:
        m = d["metric_type"]
        if m in BASELINE_METRICS:
            by_metric.setdefault(m, []).append((d["measured_at"], float(d["value"])))

    out: Dict[str, Any] = {}
    for metric in BASELINE_METRICS:
        samples = by_metric.get(metric, [])
        if not samples:
            out[metric] = {
                "median": None, "days_used": 0, "sufficient": False,
                "latest_value": None, "delta_pct": None,
            }
            continue
        # collapse to daily median first (so heavy-sampled metrics like HR
        # don't dominate the multi-day baseline)
        by_day: Dict[str, List[float]] = {}
        for ts, val in samples:
            day = ts[:10]
            by_day.setdefault(day, []).append(val)
        daily_medians = [statistics.median(v) for v in by_day.values()]
        median_val = statistics.median(daily_medians)
        latest_day = max(by_day.keys())
        latest_value = statistics.median(by_day[latest_day])
        delta_pct = None
        if median_val:
            delta_pct = round(((latest_value - median_val) / median_val) * 100, 1)
        out[metric] = {
            "median": round(median_val, 2),
            "days_used": len(by_day),
            "sufficient": len(by_day) >= BASELINE_MIN_DAYS,
            "latest_value": round(latest_value, 2),
            "delta_pct": delta_pct,
        }
    return out


# ---------------------------------------------------------------------------
# Score building blocks
# ---------------------------------------------------------------------------
def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


def _sleep_component_score(sleep: Optional[Dict[str, Any]]) -> Tuple[Optional[float], Dict[str, Any]]:
    if not sleep or not sleep.get("total_minutes"):
        return None, {"reason": "no_sleep_data"}
    cfg = CONFIG["sleep"]
    weights = cfg["weights"]
    targets = cfg["targets"]
    tot_h = sleep["total_minutes"] / 60.0
    deep = sleep.get("deep_sleep_minutes") or 0
    rem = sleep.get("rem_sleep_minutes") or 0
    interruptions = sleep.get("interruptions") or 0

    # Sub-scores in 0..1
    total_score = _clamp(tot_h / targets["total_hours"], 0, 1.2) / 1.2
    deep_ratio = deep / sleep["total_minutes"] if sleep["total_minutes"] else 0
    rem_ratio = rem / sleep["total_minutes"] if sleep["total_minutes"] else 0
    deep_score = _clamp(deep_ratio / targets["deep_ratio"], 0, 1.2) / 1.2
    rem_score = _clamp(rem_ratio / targets["rem_ratio"], 0, 1.2) / 1.2
    interruption_score = 1 - _clamp(interruptions / 5.0, 0, 1)
    # consistency placeholder – would need previous nights: use source_score if provided
    consistency = (sleep.get("source_score") or 70) / 100

    raw = (
        weights["total_hours"] * total_score +
        weights["deep_ratio"] * deep_score +
        weights["rem_ratio"] * rem_score +
        weights["interruptions_penalty"] * interruption_score +
        weights["consistency"] * consistency
    )
    return round(_clamp(raw * 100, 0, 100), 1), {
        "total_h": round(tot_h, 1),
        "deep_ratio": round(deep_ratio, 3),
        "rem_ratio": round(rem_ratio, 3),
        "interruptions": interruptions,
    }


def _recovery_score(baselines: Dict[str, Any], sleep_score: Optional[float]) -> Tuple[Optional[float], Dict[str, Any]]:
    cfg = CONFIG["recovery"]
    weights = cfg["weights"]
    hrv = baselines.get("hrv", {})
    rhr = baselines.get("resting_heart_rate", {})
    temp = baselines.get("skin_temperature", {})

    # If we lack HRV or RHR we cannot compute reliably
    if not hrv.get("sufficient") and not rhr.get("sufficient"):
        return None, {"reason": "insufficient_baseline_data"}

    # HRV delta: higher than baseline is *good* (map delta_pct to 0..1)
    hrv_delta = hrv.get("delta_pct") or 0
    hrv_component = _clamp(0.5 + (hrv_delta / 40.0), 0, 1)   # +40% → 1.0, -40% → 0.0

    # Resting HR delta: lower is *good*
    rhr_delta = rhr.get("delta_pct") or 0
    rhr_component = _clamp(0.5 - (rhr_delta / 30.0), 0, 1)   # -30% → 1.0, +30% → 0.0

    # Skin temperature delta: abs deviation from baseline is *bad*
    temp_delta = abs(temp.get("delta_pct") or 0)
    temp_component = _clamp(1 - (temp_delta / 5.0), 0, 1)     # >=5% dev → 0

    # Sleep component 0..1
    sleep_component = (sleep_score / 100.0) if sleep_score is not None else 0.65

    raw = (
        weights["hrv_delta"] * hrv_component +
        weights["resting_hr_delta"] * rhr_component +
        weights["sleep_score"] * sleep_component +
        weights["temperature_delta"] * temp_component
    )
    return round(_clamp(raw * 100, 0, 100), 1), {
        "hrv_delta_pct": hrv_delta,
        "rhr_delta_pct": rhr_delta,
        "temp_delta_pct_abs": round(temp_delta, 2),
        "sleep_input": sleep_score,
    }


def _activity_score(day_metrics: Dict[str, Any]) -> Tuple[Optional[float], Dict[str, Any]]:
    cfg = CONFIG["activity"]
    weights = cfg["weights"]
    targets = cfg["targets"]

    steps = (day_metrics.get("steps") or {}).get("sum") or 0
    active = (day_metrics.get("active_minutes") or {}).get("sum") or 0
    kcal = (day_metrics.get("calories_kcal") or {}).get("sum") or 0

    if steps == 0 and active == 0 and kcal == 0:
        return None, {"reason": "no_activity_data"}

    steps_score = _clamp(steps / targets["steps"], 0, 1.5) / 1.5
    active_score = _clamp(active / targets["active_minutes"], 0, 1.5) / 1.5
    kcal_score = _clamp(kcal / targets["calories"], 0, 1.5) / 1.5

    raw = (
        weights["steps"] * steps_score +
        weights["active_minutes"] * active_score +
        weights["calories"] * kcal_score
    )
    return round(_clamp(raw * 100, 0, 100), 1), {
        "steps": steps, "active_min": active, "kcal": round(kcal, 0),
    }


def _readiness_score(recovery: Optional[float], sleep: Optional[float],
                     activity: Optional[float], data_completeness: float) -> Tuple[Optional[float], Dict[str, Any]]:
    cfg = CONFIG["readiness"]
    w = cfg["weights"]
    if recovery is None or sleep is None:
        return None, {"reason": "need_recovery_and_sleep"}
    # activity_yesterday_load: high activity yesterday reduces readiness slightly
    load = ((activity or 0) - 60) / 40  # centered around 60 → 0
    raw = (
        w["recovery"] * (recovery / 100) +
        w["sleep"] * (sleep / 100) +
        w["activity_yesterday_load"] * _clamp(load, 0, 1) +
        w["vitals_ok"] * 0.8 +            # placeholder for SpO₂/temp normal check
        w["data_completeness"] * data_completeness
    )
    return round(_clamp(raw * 100, 0, 100), 1), {}


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------
async def _fetch_day_aggregations(user_id: str, date: str) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    day = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    start = day.isoformat()
    end = (day + timedelta(days=1)).isoformat()
    pipeline = [
        {"$match": {"user_id": user_id, "measured_at": {"$gte": start, "$lt": end}}},
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
            "min": row["min"], "max": row["max"], "sum": row["sum"], "count": row["count"],
        }
    sleep = await db.sleep_sessions.find_one(
        {"user_id": user_id,
         "start_time": {"$gte": (day - timedelta(days=1)).isoformat(), "$lt": end}},
        {"_id": 0}, sort=[("start_time", -1)]
    )
    return metrics, sleep


async def compute_scores_for_date(user_id: str, date: str) -> Dict[str, Any]:
    """Recovery / Sleep / Activity / Readiness for a single day."""
    baselines = await compute_user_baselines(user_id)
    day_metrics, sleep = await _fetch_day_aggregations(user_id, date)

    # Count how many distinct days we have data for (to gate learning phase)
    since = (datetime.now(timezone.utc) - timedelta(days=BASELINE_WINDOW_DAYS)).isoformat()
    day_set = await db.health_measurements.distinct(
        "measured_at", {"user_id": user_id, "measured_at": {"$gte": since}}
    )
    days_with_data = len({t[:10] for t in day_set if isinstance(t, str)})
    in_learning_phase = days_with_data < MIN_DATA_DAYS_FOR_SCORES

    # Completeness (rough)
    completeness = 0.0
    if day_metrics.get("heart_rate", {}).get("count", 0) >= 6: completeness += 0.35
    if day_metrics.get("hrv", {}).get("count", 0) >= 1: completeness += 0.20
    if day_metrics.get("spo2", {}).get("count", 0) >= 1: completeness += 0.10
    if day_metrics.get("steps", {}).get("count", 0) >= 1: completeness += 0.15
    if sleep and sleep.get("total_minutes", 0) >= 60: completeness += 0.20
    completeness = round(min(completeness, 1.0), 2)

    sleep_score, sleep_dbg = _sleep_component_score(sleep)
    recovery, rec_dbg = _recovery_score(baselines, sleep_score)
    activity, act_dbg = _activity_score(day_metrics)
    readiness, rd_dbg = _readiness_score(recovery, sleep_score, activity, completeness)

    # Gate scores while user is still in learning phase
    if in_learning_phase:
        note = (
            f"VitaGuide lernt deinen persönlichen Rhythmus kennen. "
            f"Für zuverlässige Auswertungen werden noch weitere Messdaten benötigt "
            f"({days_with_data}/{MIN_DATA_DAYS_FOR_SCORES} Tage)."
        )
    else:
        note = "Werte sind BETA und dienen der Wellness-Orientierung, nicht der medizinischen Diagnose."

    return {
        "date": date,
        "user_id": user_id,
        "days_of_data": days_with_data,
        "in_learning_phase": in_learning_phase,
        "data_completeness": completeness,
        "note": note,
        "scores": {
            "recovery": {"value": None if in_learning_phase else recovery, "beta": True, "debug": rec_dbg},
            "sleep": {"value": None if in_learning_phase else sleep_score, "beta": True, "debug": sleep_dbg},
            "activity": {"value": None if in_learning_phase else activity, "beta": True, "debug": act_dbg},
            "readiness": {"value": None if in_learning_phase else readiness, "beta": True, "debug": rd_dbg},
        },
        "baselines": baselines,
    }
