"""
Tests for Weight & Metabolism + Smart Products modules.
Covers: goals, meals, today, history, weight log, fasting (start/state/stop/settings),
        summary, and smart-products recommendations/click/catalog/stats.
"""
import os
import time
import uuid
import pytest
import requests


class RetrySession(requests.Session):
    """Session that retries on HTTP 429 Too Many Requests."""
    def request(self, method, url, **kwargs):
        for attempt in range(8):
            resp = super().request(method, url, **kwargs)
            if resp.status_code != 429:
                return resp
            time.sleep(3.5)
        return resp


@pytest.fixture(autouse=True)
def _rate_limit_guard():
    """Small delay between tests to reduce 429 rate-limiting."""
    time.sleep(0.4)
    yield

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://stress-relief-app-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def pid():
    return f"test-pid-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def s():
    sess = RetrySession()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _assert_no_mongo_id(obj):
    """Recursively assert _id not present."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked in response: {list(obj.keys())}"
        for v in obj.values():
            _assert_no_mongo_id(v)
    elif isinstance(obj, list):
        for item in obj:
            _assert_no_mongo_id(item)


# ───── Weight & Metabolism: Goals ─────
class TestGoals:
    def test_get_goals_default(self, s, pid):
        r = s.get(f"{API}/weight-metabolism/{pid}/goals")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["profile_id"] == pid
        assert d["daily_calories"] == 2000
        assert d["daily_protein"] == 90
        assert d.get("auto_calculated") is True

    def test_put_goals_valid(self, s, pid):
        r = s.put(f"{API}/weight-metabolism/{pid}/goals",
                  json={"daily_calories": 2200, "daily_protein": 120, "target_weight_kg": 75.0})
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["daily_calories"] == 2200
        assert d["daily_protein"] == 120
        assert d["target_weight_kg"] == 75.0
        # Verify persistence
        r2 = s.get(f"{API}/weight-metabolism/{pid}/goals")
        assert r2.json()["daily_calories"] == 2200

    @pytest.mark.parametrize("payload,field", [
        ({"daily_calories": 500}, "calories"),
        ({"daily_calories": 7000}, "calories"),
        ({"daily_protein": 10}, "protein"),
        ({"daily_protein": 500}, "protein"),
        ({"target_weight_kg": 20}, "weight"),
        ({"target_weight_kg": 400}, "weight"),
    ])
    def test_put_goals_validation(self, s, pid, payload, field):
        r = s.put(f"{API}/weight-metabolism/{pid}/goals", json=payload)
        assert r.status_code == 400, f"Expected 400 for {payload}, got {r.status_code}"

    def test_recalculate_goals_no_profile(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/recalculate-goals")
        assert r.status_code == 404

    def test_recalculate_goals_with_profile(self, s):
        # Create a health profile directly
        new_pid = f"test-pid-{uuid.uuid4().hex[:8]}"
        # Try common endpoints to create profile. Use direct mongo-like? We'll try health_profiles API
        create = s.post(f"{API}/health-profile", json={
            "id": new_pid,
            "age": 30,
            "gender": "male",
            "weight": 80,
            "height": 180,
            "activity_level": "moderate",
        })
        if create.status_code not in (200, 201):
            pytest.skip(f"Health profile creation not available ({create.status_code})")
        r = s.post(f"{API}/weight-metabolism/{new_pid}/recalculate-goals")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["daily_calories"] > 2000  # ~2750 for this profile
        assert d["daily_protein"] > 80
        assert d["auto_calculated"] is True


# ───── Meals ─────
class TestMeals:
    def test_add_meal(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/meal",
                   json={"name": "TEST_Porridge", "calories": 350, "protein_g": 15, "meal_type": "breakfast"})
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["calories"] == 350
        assert d["protein_g"] == 15.0
        assert "id" in d
        pytest.meal_id = d["id"]

    def test_today_has_meal(self, s, pid):
        r = s.get(f"{API}/weight-metabolism/{pid}/today")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["totals"]["calories"] >= 350
        assert any(m["name"] == "TEST_Porridge" for m in d["meals"])
        assert "progress" in d and "remaining" in d
        assert d["goals"]["daily_calories"] == 2200  # from earlier test

    def test_history(self, s, pid):
        r = s.get(f"{API}/weight-metabolism/{pid}/history?days=7")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert "days" in d and "count" in d
        assert d["count"] >= 1

    def test_delete_meal(self, s, pid):
        mid = getattr(pytest, "meal_id", None)
        assert mid, "No meal id from previous test"
        r = s.delete(f"{API}/weight-metabolism/{pid}/meal/{mid}")
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        # 404 on repeat
        r2 = s.delete(f"{API}/weight-metabolism/{pid}/meal/{mid}")
        assert r2.status_code == 404


# ───── Weight log ─────
class TestWeight:
    def test_add_weight_valid(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/weight", json={"weight_kg": 78.4, "note": "morning"})
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["weight_kg"] == 78.4

    def test_add_weight_replaces_same_day(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/weight", json={"weight_kg": 78.0})
        assert r.status_code == 200
        hist = s.get(f"{API}/weight-metabolism/{pid}/weight/history?days=1").json()
        assert hist["current_kg"] == 78.0
        assert len(hist["entries"]) == 1  # replaced, not appended

    @pytest.mark.parametrize("w", [20, 400, 29.9, 300.1])
    def test_add_weight_validation(self, s, pid, w):
        r = s.post(f"{API}/weight-metabolism/{pid}/weight", json={"weight_kg": w})
        assert r.status_code == 400

    def test_weight_history(self, s, pid):
        r = s.get(f"{API}/weight-metabolism/{pid}/weight/history?days=30")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert "entries" in d and "current_kg" in d and "delta_kg" in d


# ───── Fasting ─────
class TestFasting:
    def test_fasting_settings(self, s, pid):
        r = s.put(f"{API}/weight-metabolism/{pid}/fasting/settings",
                  json={"default_target_hours": 18, "eating_window_hours": 6, "reminders_enabled": True})
        assert r.status_code == 200
        assert r.json()["default_target_hours"] == 18

    @pytest.mark.parametrize("h", [3, 49, 3.9, 48.1])
    def test_fasting_settings_validation(self, s, pid, h):
        r = s.put(f"{API}/weight-metabolism/{pid}/fasting/settings", json={"default_target_hours": h})
        assert r.status_code == 400

    def test_fasting_start(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/fasting/start", json={"target_hours": 16})
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["target_hours"] == 16.0
        assert d["ended_at"] is None

    @pytest.mark.parametrize("h", [3, 49])
    def test_fasting_start_validation(self, s, pid, h):
        r = s.post(f"{API}/weight-metabolism/{pid}/fasting/start", json={"target_hours": h})
        assert r.status_code == 400

    def test_fasting_state_active(self, s, pid):
        r = s.get(f"{API}/weight-metabolism/{pid}/fasting/state")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["active_session"] is not None
        assert d["progress"] is not None
        p = d["progress"]
        for k in ("elapsed_seconds", "remaining_seconds", "progress_pct", "target_end_iso", "target_hours"):
            assert k in p

    def test_fasting_start_auto_stops_prev(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/fasting/start", json={"target_hours": 20})
        assert r.status_code == 200
        # only one active
        state = s.get(f"{API}/weight-metabolism/{pid}/fasting/state").json()
        assert state["active_session"]["target_hours"] == 20.0

    def test_fasting_stop(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/fasting/stop")
        assert r.status_code == 200
        d = r.json()
        assert d["stopped"] is True
        assert "actual_hours" in d and "goal_reached" in d

    def test_fasting_stop_when_none(self, s, pid):
        r = s.post(f"{API}/weight-metabolism/{pid}/fasting/stop")
        assert r.status_code == 404


# ───── Summary ─────
class TestSummary:
    def test_summary(self, s, pid):
        r = s.get(f"{API}/weight-metabolism/{pid}/summary")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        for k in ("calories", "calories_goal", "protein_g", "protein_goal",
                  "fasting_active", "current_weight_kg"):
            assert k in d
        assert d["fasting_active"] is False  # stopped above


# ───── Smart Products ─────
class TestSmartProducts:
    def test_catalog_seeds(self, s):
        r = s.get(f"{API}/smart-products/catalog")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["count"] >= 7
        ids = [p["id"] for p in d["items"]]
        assert "smart-mag-001" in ids

    def test_reco_stress(self, s):
        r = s.get(f"{API}/smart-products/recommendations?context=stress&limit=2")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["context"] == "stress"
        assert len(d["items"]) <= 2
        assert len(d["items"]) >= 1
        for p in d["items"]:
            assert "stress" in p["contexts"]

    def test_reco_fasting(self, s):
        r = s.get(f"{API}/smart-products/recommendations?context=fasting&limit=3")
        assert r.status_code == 200
        assert all("fasting" in p["contexts"] for p in r.json()["items"])

    def test_reco_limit_enforced(self, s):
        r = s.get(f"{API}/smart-products/recommendations?context=dashboard&limit=5")
        assert r.status_code == 200
        assert len(r.json()["items"]) <= 5

    def test_reco_limit_invalid(self, s):
        # limit >5 violates ge/le
        r = s.get(f"{API}/smart-products/recommendations?context=dashboard&limit=10")
        assert r.status_code == 422

    def test_reco_with_profile_id(self, s, pid):
        r = s.get(f"{API}/smart-products/recommendations?context=dashboard&profile_id={pid}&limit=2")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        # should not include _score field
        for p in d["items"]:
            assert "_score" not in p

    def test_click_logging(self, s, pid):
        r = s.post(f"{API}/smart-products/click",
                   json={"product_id": "smart-mag-001", "profile_id": pid, "context": "stress"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_stats(self, s):
        # Click another to ensure multiple
        s.post(f"{API}/smart-products/click", json={"product_id": "smart-mag-001", "context": "stress"})
        r = s.get(f"{API}/smart-products/stats")
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert "items" in d
        found = [i for i in d["items"] if i["product_id"] == "smart-mag-001"]
        assert found and found[0]["clicks"] >= 1

    def test_upsert_catalog(self, s):
        pid_prod = f"test-prod-{uuid.uuid4().hex[:6]}"
        r = s.put(f"{API}/smart-products/catalog/{pid_prod}", json={
            "title_de": "TEST Produkt",
            "contexts": ["dashboard"],
            "symptoms": [],
            "deficits": [],
            "affiliate_url": "https://example.com/aff"
        })
        assert r.status_code == 200
        d = r.json()
        _assert_no_mongo_id(d)
        assert d["id"] == pid_prod
        assert d["affiliate_url"] == "https://example.com/aff"
        # cleanup
        s.delete(f"{API}/smart-products/catalog/{pid_prod}")
