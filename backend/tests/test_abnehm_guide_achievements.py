"""
Iteration 88 - Abnehm-Guide Phase 1 Achievements & Streak tests.

Covers:
- GET /api/weight-metabolism/{pid}/achievements (existing + fresh profile)
- Regression on /today, /goals, /schedule, /day-plan, /summary
- current_streak across consecutive day_plan_checkins
- today_protein_done + 'protein_goal' badge when protein_g >= daily_protein
"""
import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
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
    # teardown
    for coll in [
        "day_plan_checkins",
        "water_intake_logs",
        "meal_log",
        "weight_goals",
        "fasting_schedule",
        "health_profiles",
        "weight_log",
    ]:
        try:
            db[coll].delete_many({"profile_id": pid})
        except Exception:
            pass


@pytest.fixture()
def seeded_pid(db, fresh_pid):
    """Profile with goals + schedule so /today returns sane numbers."""
    pid = fresh_pid
    db.weight_goals.update_one(
        {"profile_id": pid},
        {"$set": {"profile_id": pid, "daily_calories": 2100, "daily_protein": 120}},
        upsert=True,
    )
    db.fasting_schedule.update_one(
        {"profile_id": pid},
        {"$set": {
            "profile_id": pid,
            "fast_start_time": "20:00",
            "fast_duration_hours": 16,
            "eating_window_start": "12:00",
            "eating_window_end": "20:00",
        }},
        upsert=True,
    )
    return pid


# ── Achievements endpoint ──

class TestAchievementsEndpoint:
    def test_fresh_profile_returns_200_with_default_shape(self, fresh_pid):
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/achievements")
        assert r.status_code == 200, r.text
        data = r.json()
        # required keys
        for k in [
            "current_streak", "longest_streak",
            "today_protein_done", "today_calories_done",
            "today_water_done", "today_full_plan_done", "badges",
        ]:
            assert k in data, f"missing key {k}"
        # fresh profile -> nothing achieved
        assert data["current_streak"] == 0
        assert data["longest_streak"] == 0
        assert data["today_protein_done"] is False
        assert data["today_calories_done"] is False
        assert data["today_water_done"] is False
        assert data["today_full_plan_done"] is False
        # 4 badges with expected ids
        assert isinstance(data["badges"], list)
        assert len(data["badges"]) == 4
        ids = [b["id"] for b in data["badges"]]
        assert ids == ["streak_3", "protein_goal", "full_plan", "water_goal"]
        for b in data["badges"]:
            assert b["achieved"] is False
            assert "label_de" in b and "label_it" in b and "label_en" in b
            assert "icon" in b and "value" in b

    def test_consecutive_streak_counts_correctly(self, db, seeded_pid):
        """3 consecutive days incl. today -> current_streak >= 3, badge streak_3 achieved."""
        pid = seeded_pid
        today = datetime.now(timezone.utc).date()
        for delta in range(3):
            d = (today - timedelta(days=delta)).strftime("%Y-%m-%d")
            db.day_plan_checkins.insert_one({
                "profile_id": pid, "date": d, "step_id": f"shake_{delta}",
            })
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{pid}/achievements")
        assert r.status_code == 200
        data = r.json()
        assert data["current_streak"] >= 3, data
        assert data["longest_streak"] >= 3
        streak_badge = next(b for b in data["badges"] if b["id"] == "streak_3")
        assert streak_badge["achieved"] is True
        assert streak_badge["value"] >= 3

    def test_protein_goal_done_when_meal_protein_meets_target(self, db, seeded_pid):
        """Add a meal w/ protein >= 120g, expect today_protein_done + badge."""
        pid = seeded_pid
        today = datetime.now(timezone.utc).date().strftime("%Y-%m-%d")
        db.meal_log.insert_one({
            "id": f"TEST_meal_{uuid.uuid4().hex[:8]}",
            "profile_id": pid,
            "date": today,
            "name": "TEST_high_protein",
            "calories": 700,
            "protein_g": 150,  # >= 120 daily target
            "ts": datetime.now(timezone.utc).isoformat(),
        })
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{pid}/achievements")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["today_protein_done"] is True, data
        protein_badge = next(b for b in data["badges"] if b["id"] == "protein_goal")
        assert protein_badge["achieved"] is True
        assert protein_badge["value"] >= 120

    def test_full_plan_and_water_badges(self, db, seeded_pid):
        pid = seeded_pid
        today = datetime.now(timezone.utc).date().strftime("%Y-%m-%d")
        # 4 day-plan checkins
        for sid in ["shake_1", "shake_2", "small_meal", "large_meal"]:
            db.day_plan_checkins.insert_one({"profile_id": pid, "date": today, "step_id": sid})
        # 1500ml water
        db.water_intake_logs.insert_one({"profile_id": pid, "date": today, "amount_ml": 1500})

        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{pid}/achievements")
        data = r.json()
        assert data["today_full_plan_done"] is True
        assert data["today_water_done"] is True
        full = next(b for b in data["badges"] if b["id"] == "full_plan")
        water = next(b for b in data["badges"] if b["id"] == "water_goal")
        assert full["achieved"] is True
        assert water["achieved"] is True
        assert water["value"] >= 1500


# ── Regression on existing endpoints ──

class TestRegression:
    @pytest.mark.parametrize("path", ["today", "goals", "schedule", "day-plan", "summary"])
    def test_existing_endpoints_still_200(self, fresh_pid, path):
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{fresh_pid}/{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"
        # Each must return JSON object
        assert isinstance(r.json(), dict)

    def test_today_contains_expected_keys(self, seeded_pid):
        r = requests.get(f"{BASE_URL}/api/weight-metabolism/{seeded_pid}/today")
        assert r.status_code == 200
        d = r.json()
        assert "goals" in d and "totals" in d
        assert d["goals"]["daily_calories"] == 2100
        assert d["goals"]["daily_protein"] == 120
