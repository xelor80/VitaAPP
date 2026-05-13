"""
Iteration 89 - Abnehm-Guide Phase 2 tests (VitaGuide+).

Covers:
- GET /api/weight-metabolism/{pid}/weight/history weekly insights extension:
    week_avg_kg, prev_week_avg_kg, week_delta_kg, trend, hint_key, entries_last_week
    + trend logic across all 4 cases (down/up/stable/unknown)
- POST /api/weight-metabolism/{pid}/analyze-meal-photo response shape contains coach_line
    (no LLM call asserted — we only validate contract via short image rejection path
     OR mocked happy path via direct DB inspection; we additionally inspect source for the
     coach_line key as fallback).
- Regression on existing Phase 1 endpoints still 200.
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or ""
).rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "test_database")

assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
assert MONGO_URL, "MONGO_URL not set"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture()
def fresh_pid(db):
    pid = f"TEST_pid_{uuid.uuid4().hex[:10]}"
    yield pid
    for coll in [
        "day_plan_checkins", "water_intake_logs", "meal_log",
        "weight_goals", "fasting_schedule", "health_profiles", "weight_log",
    ]:
        try:
            db[coll].delete_many({"profile_id": pid})
        except Exception:
            pass


def _seed_week_entries(db, pid, last_week_weights, prev_week_weights):
    """Insert weight_log entries for last 7 days and the 7 days prior."""
    today = datetime.now(timezone.utc).date()
    # last week: days 0..6 ago
    for i, w in enumerate(last_week_weights):
        d = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        db.weight_log.insert_one({
            "id": f"TEST_w_{uuid.uuid4().hex[:8]}",
            "profile_id": pid, "weight_kg": float(w), "date": d,
            "measured_at": d + "T08:00:00+00:00",
        })
    # prev week: days 7..13 ago
    for i, w in enumerate(prev_week_weights):
        d = (today - timedelta(days=7 + i)).strftime("%Y-%m-%d")
        db.weight_log.insert_one({
            "id": f"TEST_w_{uuid.uuid4().hex[:8]}",
            "profile_id": pid, "weight_kg": float(w), "date": d,
            "measured_at": d + "T08:00:00+00:00",
        })


# ── Weight history weekly insights ──

class TestWeightHistoryWeeklyInsights:

    def test_shape_includes_new_fields_on_empty(self, fresh_pid):
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/weight/history")
        assert r.status_code == 200, r.text
        d = r.json()
        # existing fields
        for k in ["entries", "current_kg", "delta_kg", "target_kg", "days"]:
            assert k in d, f"missing existing key {k}"
        # phase 2 new fields
        for k in ["week_avg_kg", "prev_week_avg_kg", "week_delta_kg",
                  "trend", "hint_key", "entries_last_week"]:
            assert k in d, f"missing new field {k}"
        # empty -> trend unknown, hint more_data_needed
        assert d["trend"] == "unknown"
        assert d["hint_key"] == "more_data_needed"
        assert d["week_avg_kg"] is None
        assert d["prev_week_avg_kg"] is None
        assert d["entries_last_week"] == 0

    def test_trend_down_good_progress(self, db, fresh_pid):
        # last-7-day avg LOWER than prior by >= 0.2
        _seed_week_entries(db, fresh_pid,
                           last_week_weights=[80.0] * 7,
                           prev_week_weights=[81.0] * 7)
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/weight/history")
        assert r.status_code == 200
        d = r.json()
        assert d["week_avg_kg"] == 80.0
        assert d["prev_week_avg_kg"] == 81.0
        assert d["week_delta_kg"] == -1.0
        assert d["trend"] == "down"
        assert d["hint_key"] == "good_progress"
        assert d["entries_last_week"] == 7

    def test_trend_up_stay_consistent(self, db, fresh_pid):
        _seed_week_entries(db, fresh_pid,
                           last_week_weights=[82.0] * 7,
                           prev_week_weights=[80.0] * 7)
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/weight/history")
        d = r.json()
        assert d["trend"] == "up"
        assert d["hint_key"] == "stay_consistent"
        assert d["week_delta_kg"] == 2.0

    def test_trend_stable(self, db, fresh_pid):
        _seed_week_entries(db, fresh_pid,
                           last_week_weights=[80.0] * 7,
                           prev_week_weights=[80.1] * 7)
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/weight/history")
        d = r.json()
        # |delta| < 0.2 -> stable
        assert d["trend"] == "stable", d
        assert d["hint_key"] == "stable_is_normal"

    def test_trend_unknown_when_only_last_week(self, db, fresh_pid):
        _seed_week_entries(db, fresh_pid,
                           last_week_weights=[80.0] * 3,
                           prev_week_weights=[])
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/weight/history")
        d = r.json()
        assert d["prev_week_avg_kg"] is None
        assert d["trend"] == "unknown"
        assert d["hint_key"] == "more_data_needed"


# ── Photo analysis coach_line contract ──

class TestAnalyzeMealPhotoCoachLine:
    """Verify endpoint contract: response shape must include 'coach_line'.

    We do NOT exercise the LLM call (cost + non-determinism). Instead we
    confirm the contract via:
      1) Source-level inspection of the route handler (coach_line key present)
      2) Invalid-image short-circuit returns 400 (existing behaviour preserved)
    """

    def test_short_image_returns_400(self, fresh_pid):
        r = requests.post(
            f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/analyze-meal-photo",
            json={"image_base64": "abc", "hint": ""},
        )
        assert r.status_code == 400, r.text

    def test_route_source_contains_coach_line_field(self):
        path = "/app/backend/routes/weight_metabolism.py"
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        # response dict must contain 'coach_line'
        assert '"coach_line": coach_line' in src, \
            "analyze-meal-photo response must include coach_line"
        # coach_line strings present
        for needle in [
            "Mit dieser Mahlzeit erreichst du dein Tages-Protein-Ziel",
            "Passt gut zu deinem Protein-Ziel",
        ]:
            assert needle in src, f"expected coach_line phrase missing: {needle}"


# ── Phase 1 regression ──

class TestPhase1Regression:
    @pytest.mark.parametrize(
        "path", ["today", "goals", "schedule", "day-plan", "summary", "achievements"]
    )
    def test_existing_endpoints_still_200(self, fresh_pid, path):
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"
        assert isinstance(r.json(), dict)


# ── Seeded production-like profile from iter88 ──

class TestSeededProfile:
    SEEDED_PID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"

    def test_seeded_weight_history_has_new_fields(self):
        r = requests.get(
            f"{BASE_URL}/api/weight-metabolism/{self.SEEDED_PID}/weight/history"
        )
        assert r.status_code == 200
        d = r.json()
        for k in ["week_avg_kg", "prev_week_avg_kg", "week_delta_kg",
                  "trend", "hint_key", "entries_last_week"]:
            assert k in d
        assert d["trend"] in ("down", "up", "stable", "unknown")
        assert d["hint_key"] in (
            "good_progress", "stay_consistent", "stable_is_normal", "more_data_needed"
        )
