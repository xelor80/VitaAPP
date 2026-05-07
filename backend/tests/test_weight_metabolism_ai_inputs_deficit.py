"""Tests for new Weight & Metabolism features (iteration 87):
1. POST /api/weight-metabolism/{pid}/ai-calculate-goals accepts age/height_cm/current_weight_kg
   and persists them to health_profiles + creates weight_log entry.
2. GET /api/weight-metabolism/{pid}/today returns profile snapshot with age/height/weight/gender.
3. DELETE /api/weight-metabolism/{pid}/weight resets all weight entries.
4. DELETE /api/weight-metabolism/{pid}/weight/{entry_id} deletes single entry.
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://stress-relief-app-11.preview.emergentagent.com"
API = BASE_URL.rstrip("/") + "/api"

MONGO_URL = os.environ.get("MONGO_URL") or "mongodb+srv://xelor80:Wk220480xel%21@vitaguide.f2cj30h.mongodb.net/?appName=VitaGuide"
DB_NAME = os.environ.get("DB_NAME") or "test_database"


@pytest.fixture(scope="module")
def db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture
def profile_id(db):
    """Create a TEST profile in health_profiles, return its id, cleanup after."""
    pid = f"TEST_pid_{uuid.uuid4().hex[:8]}"
    db.health_profiles.insert_one({
        "id": pid,
        "name": "TEST_user",
        "gender": "male",
        "age": 30,
        "height": 170.0,
        "weight": 75.0,
        "activity_level": "moderate",
        "goal": "lose",
    })
    yield pid
    # Cleanup
    db.health_profiles.delete_many({"id": pid})
    db.weight_log.delete_many({"profile_id": pid})
    db.weight_goals.delete_many({"profile_id": pid})
    db.meal_log.delete_many({"profile_id": pid})


# ── Feature 1: AI calculate goals accepts age/height/weight ──

class TestAiCalculateGoalsInputs:
    def test_ai_goals_accepts_three_inputs_and_persists(self, profile_id, db):
        payload = {
            "gender": "male",
            "current_weight_kg": 80.0,
            "height_cm": 178.0,
            "age": 42,
            "activity_level": "moderate",
            "goal": "lose",
        }
        r = requests.post(f"{API}/weight-metabolism/{profile_id}/ai-calculate-goals", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "daily_calories" in data and "daily_protein" in data
        assert isinstance(data["daily_calories"], int)
        assert isinstance(data["daily_protein"], int)
        assert 1200 <= data["daily_calories"] <= 5000
        assert 40 <= data["daily_protein"] <= 300
        # Inputs echoed
        assert data["inputs"]["age"] == 42
        assert data["inputs"]["height_cm"] == 178.0
        assert abs(data["inputs"]["current_weight_kg"] - 80.0) < 0.01

        # Verify health_profiles updated
        prof = db.health_profiles.find_one({"id": profile_id})
        assert prof is not None
        assert prof.get("age") == 42
        assert abs(prof.get("height") - 178.0) < 0.01
        assert abs(prof.get("weight") - 80.0) < 0.01

        # Verify a weight_log entry was created
        log = db.weight_log.find_one({"profile_id": profile_id})
        assert log is not None
        assert abs(log.get("weight_kg") - 80.0) < 0.01
        assert log.get("note") == "ai-goals"

    def test_ai_goals_missing_weight_or_gender_returns_400(self, profile_id):
        # Use a non-existing pid so profile fallback doesn't supply gender/weight
        empty_pid = f"TEST_pid_empty_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{API}/weight-metabolism/{empty_pid}/ai-calculate-goals",
                          json={"age": 30}, timeout=20)
        assert r.status_code == 400


# ── Feature 2: GET /today returns profile snapshot ──

class TestTodayProfileSnapshot:
    def test_today_includes_profile_snapshot(self, profile_id, db):
        r = requests.get(f"{API}/weight-metabolism/{profile_id}/today", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "profile" in data
        prof = data["profile"]
        # Required fields present
        assert prof.get("age") == 30
        assert prof.get("gender") == "male"
        assert prof.get("height") == 170.0
        assert prof.get("weight") == 75.0
        assert prof.get("activity_level") == "moderate"
        assert prof.get("goal") == "lose"
        # No mongo _id leak
        assert "_id" not in prof
        # Other expected top-level
        assert "totals" in data and "goals" in data and "progress" in data

    def test_today_profile_empty_when_no_health_profile(self, db):
        pid = f"TEST_pid_nopro_{uuid.uuid4().hex[:8]}"
        try:
            r = requests.get(f"{API}/weight-metabolism/{pid}/today", timeout=15)
            assert r.status_code == 200
            data = r.json()
            assert data.get("profile") == {}
        finally:
            db.weight_goals.delete_many({"profile_id": pid})


# ── Feature 3 + 4: Weight delete (single + all) ──

class TestWeightDelete:
    def _add_weight(self, pid, kg, date_offset_days=0):
        from datetime import datetime, timezone, timedelta
        measured = (datetime.now(timezone.utc) - timedelta(days=date_offset_days)).isoformat()
        return requests.post(f"{API}/weight-metabolism/{pid}/weight",
                             json={"weight_kg": kg, "measured_at": measured}, timeout=15)

    def test_delete_single_weight_entry(self, profile_id, db):
        r1 = self._add_weight(profile_id, 80.5)
        assert r1.status_code == 200
        eid = r1.json()["id"]

        # Delete it
        r2 = requests.delete(f"{API}/weight-metabolism/{profile_id}/weight/{eid}", timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("deleted") is True

        # Verify removed
        h = requests.get(f"{API}/weight-metabolism/{profile_id}/weight/history", timeout=15)
        assert h.status_code == 200
        ids = [e["id"] for e in h.json().get("entries", [])]
        assert eid not in ids

    def test_delete_nonexistent_entry_returns_404(self, profile_id):
        r = requests.delete(f"{API}/weight-metabolism/{profile_id}/weight/{uuid.uuid4()}", timeout=15)
        assert r.status_code == 404

    def test_reset_all_weight_history(self, profile_id, db):
        # Add a few entries on different dates
        self._add_weight(profile_id, 80.0, 0)
        self._add_weight(profile_id, 81.0, 1)
        self._add_weight(profile_id, 82.0, 2)

        # Confirm we have entries
        h1 = requests.get(f"{API}/weight-metabolism/{profile_id}/weight/history", timeout=15)
        assert len(h1.json().get("entries", [])) >= 1

        # Reset all
        r = requests.delete(f"{API}/weight-metabolism/{profile_id}/weight", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "deleted" in body
        assert body["deleted"] >= 1

        # Verify empty
        h2 = requests.get(f"{API}/weight-metabolism/{profile_id}/weight/history", timeout=15)
        assert h2.status_code == 200
        assert h2.json().get("entries", []) == []
        assert h2.json().get("current_kg") is None

    def test_reset_idempotent_when_empty(self, profile_id):
        r = requests.delete(f"{API}/weight-metabolism/{profile_id}/weight", timeout=15)
        assert r.status_code == 200
        # second call also OK
        r2 = requests.delete(f"{API}/weight-metabolism/{profile_id}/weight", timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("deleted") == 0
