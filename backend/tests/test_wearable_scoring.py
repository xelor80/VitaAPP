"""Backend tests for VitaGuide-Scores engine: baselines, scores, timeseries."""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or frontend_env.get("EXPO_PUBLIC_BACKEND_URL")
    or frontend_env.get("REACT_APP_BACKEND_URL")
)
if not base_url:
    raise RuntimeError("Backend URL missing from env")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api/wearable"

BASELINE_METRICS = [
    "hrv", "resting_heart_rate", "heart_rate", "spo2",
    "skin_temperature", "steps", "active_minutes", "respiration_rate",
]


# ---------------------- Fixtures ----------------------
@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _make_user():
    return f"e2e-scoring-{uuid.uuid4().hex[:8]}"


def _pair_device(http, user_id):
    payload = {
        "user_id": user_id,
        "provider": "demo",
        "model": "ScoringTest",
        "name": "TEST Scoring Band",
        "ble_address": f"CC:DD:EE:{uuid.uuid4().hex[:2].upper()}:00:01",
        "battery_level": 90,
    }
    r = http.post(f"{API}/devices", json=payload)
    assert r.status_code == 200, r.text
    return r.json()["device"]["device_id"]


def _seed(http, user_id, device_id, days):
    """Seed `days` days of data ending yesterday.

    Realistic distribution across hours: HRV h=4, RHR h=7, SpO2 h=8,
    HR h=10 & 15, temp h=3, steps/active/kcal h=20, respiration h=6.
    """
    now = datetime.now(timezone.utc)
    measurements = []
    # Seed up to and including today, so today's date will have some data
    for i in range(days):
        day_start = (now - timedelta(days=(days - 1 - i))).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        # slightly varying values so median stable
        offset = (i % 3) - 1
        def ts(h, m=0):
            return (day_start + timedelta(hours=h, minutes=m)).isoformat()
        measurements.extend([
            {"metric_type": "hrv", "value": 55 + offset, "unit": "ms", "measured_at": ts(4)},
            {"metric_type": "resting_heart_rate", "value": 60 + offset, "unit": "bpm", "measured_at": ts(7)},
            {"metric_type": "spo2", "value": 97, "unit": "%", "measured_at": ts(8)},
            {"metric_type": "heart_rate", "value": 72 + offset, "unit": "bpm", "measured_at": ts(10)},
            {"metric_type": "heart_rate", "value": 78 + offset, "unit": "bpm", "measured_at": ts(15)},
            {"metric_type": "skin_temperature", "value": 33.5, "unit": "C", "measured_at": ts(3)},
            {"metric_type": "steps", "value": 3000 + i * 500, "unit": "count", "measured_at": ts(20)},
            {"metric_type": "active_minutes", "value": 20 + i, "unit": "min", "measured_at": ts(20, 5)},
            {"metric_type": "calories_kcal", "value": 300 + i * 10, "unit": "kcal", "measured_at": ts(20, 10)},
            {"metric_type": "respiration_rate", "value": 14, "unit": "bpm", "measured_at": ts(6)},
        ])
    r = http.post(f"{API}/measurements/batch", json={
        "user_id": user_id, "device_id": device_id, "measurements": measurements,
    })
    assert r.status_code == 200, r.text


def _seed_sleep(http, user_id, device_id, days):
    """Seed sleep sessions ending each morning."""
    now = datetime.now(timezone.utc)
    sessions = []
    for i in range(days):
        # night before day i: start ~22:00 previous evening
        end = (now - timedelta(days=(days - 1 - i))).replace(hour=7, minute=0, second=0, microsecond=0)
        start = end - timedelta(hours=8)
        sessions.append({
            "user_id": user_id,
            "device_id": device_id,
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "total_minutes": 480,
            "deep_sleep_minutes": 100,
            "rem_sleep_minutes": 110,
            "light_sleep_minutes": 250,
            "awake_minutes": 20,
            "interruptions": 1,
            "source_score": 80,
        })
    r = http.post(f"{API}/sleep-sessions/batch", json=sessions)
    assert r.status_code == 200, r.text


@pytest.fixture(scope="module")
def user_low():
    """User with only 3 days of data (insufficient)."""
    return _make_user()


@pytest.fixture(scope="module")
def user_high():
    """User with 8 days of data (sufficient)."""
    return _make_user()


@pytest.fixture(scope="module")
def created_devices():
    return []


@pytest.fixture(scope="module")
def low_setup(http, user_low, created_devices):
    dev = _pair_device(http, user_low)
    created_devices.append(dev)
    _seed(http, user_low, dev, 3)
    return dev


@pytest.fixture(scope="module")
def high_setup(http, user_high, created_devices):
    dev = _pair_device(http, user_high)
    created_devices.append(dev)
    _seed(http, user_high, dev, 8)
    _seed_sleep(http, user_high, dev, 8)
    return dev


@pytest.fixture(scope="module", autouse=True)
def cleanup(http, created_devices):
    yield
    for dev in created_devices:
        try:
            http.delete(f"{API}/devices/{dev}", params={"purge_data": "true"})
        except Exception:
            pass


# ---------------------- Baselines ----------------------
class TestBaselines:
    def test_baselines_structure_all_metrics(self, http, user_high, high_setup):
        r = http.get(f"{API}/baselines/{user_high}")
        assert r.status_code == 200, r.text
        data = r.json()
        for m in BASELINE_METRICS:
            assert m in data, f"missing metric {m}"
            for f in ("median", "days_used", "sufficient", "latest_value", "delta_pct"):
                assert f in data[m], f"metric {m} missing {f}"

    def test_baselines_insufficient_when_low_days(self, http, user_low, low_setup):
        r = http.get(f"{API}/baselines/{user_low}")
        assert r.status_code == 200
        data = r.json()
        # 3 days of data → sufficient=False for all seeded metrics
        assert data["hrv"]["sufficient"] is False
        assert data["hrv"]["days_used"] == 3
        assert data["resting_heart_rate"]["sufficient"] is False

    def test_baselines_sufficient_when_high_days(self, http, user_high, high_setup):
        r = http.get(f"{API}/baselines/{user_high}")
        assert r.status_code == 200
        data = r.json()
        assert data["hrv"]["sufficient"] is True
        assert data["hrv"]["days_used"] >= 7
        assert data["resting_heart_rate"]["sufficient"] is True
        assert isinstance(data["hrv"]["median"], (int, float))
        assert isinstance(data["hrv"]["latest_value"], (int, float))

    def test_baselines_empty_user_returns_zero_days(self, http):
        empty_user = _make_user()
        r = http.get(f"{API}/baselines/{empty_user}")
        assert r.status_code == 200
        data = r.json()
        assert data["hrv"]["days_used"] == 0
        assert data["hrv"]["sufficient"] is False
        assert data["hrv"]["median"] is None


# ---------------------- Scores ----------------------
class TestScores:
    def test_scores_learning_phase_when_low_data(self, http, user_low, low_setup):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = http.get(f"{API}/scores/{user_low}", params={"date": today})
        assert r.status_code == 200
        data = r.json()
        assert data["in_learning_phase"] is True
        assert data["days_of_data"] < 7
        assert "lernt" in data["note"].lower() or "3/7" in data["note"]
        for k in ("recovery", "sleep", "activity", "readiness"):
            assert data["scores"][k]["value"] is None
            assert data["scores"][k]["beta"] is True

    def test_scores_valid_when_sufficient_data(self, http, user_high, high_setup):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = http.get(f"{API}/scores/{user_high}", params={"date": today})
        assert r.status_code == 200
        data = r.json()
        assert data["in_learning_phase"] is False
        assert data["days_of_data"] >= 7
        scores = data["scores"]
        for k in ("recovery", "sleep", "activity", "readiness"):
            v = scores[k]["value"]
            assert v is None or (isinstance(v, (int, float)) and 0 <= v <= 100), f"{k} out of range: {v}"
            assert scores[k]["beta"] is True
        # In this seed we have HRV/RHR baselines, activity data, and sleep → all non-null expected
        assert scores["activity"]["value"] is not None
        assert scores["sleep"]["value"] is not None
        assert scores["recovery"]["value"] is not None
        assert scores["readiness"]["value"] is not None

    def test_scores_includes_baselines_block(self, http, user_high, high_setup):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        rs = http.get(f"{API}/scores/{user_high}", params={"date": today})
        rb = http.get(f"{API}/baselines/{user_high}")
        assert rs.status_code == 200 and rb.status_code == 200
        assert rs.json()["baselines"] == rb.json()

    def test_scores_invalid_date_returns_400(self, http, user_high):
        r = http.get(f"{API}/scores/{user_high}", params={"date": "INVALID"})
        assert r.status_code == 400

    def test_scores_deterministic(self, http, user_high, high_setup):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r1 = http.get(f"{API}/scores/{user_high}", params={"date": today}).json()
        r2 = http.get(f"{API}/scores/{user_high}", params={"date": today}).json()
        for k in ("recovery", "sleep", "activity", "readiness"):
            assert r1["scores"][k]["value"] == r2["scores"][k]["value"], f"{k} non-deterministic"


# ---------------------- Timeseries ----------------------
class TestTimeseries:
    def test_timeseries_week_daily(self, http, user_high, high_setup):
        r = http.get(f"{API}/timeseries/{user_high}/hrv", params={"range": "week"})
        assert r.status_code == 200
        data = r.json()
        assert data["granularity"] == "daily"
        assert data["metric"] == "hrv"
        assert isinstance(data["points"], list)
        assert len(data["points"]) >= 1
        stats = data["stats"]
        for f in ("avg", "min", "max", "days"):
            assert f in stats
        assert stats["days"] == len(data["points"])
        for p in data["points"]:
            for f in ("day", "avg", "min", "max", "count"):
                assert f in p

    def test_timeseries_day_raw(self, http, user_high, high_setup):
        r = http.get(f"{API}/timeseries/{user_high}/hrv", params={"range": "day"})
        assert r.status_code == 200
        data = r.json()
        assert data["granularity"] == "raw"
        assert "points" in data
        # Each point should be raw sample with measured_at + value
        for p in data["points"]:
            assert "measured_at" in p and "value" in p

    def test_timeseries_invalid_range_returns_400(self, http, user_high):
        r = http.get(f"{API}/timeseries/{user_high}/hrv", params={"range": "INVALID"})
        assert r.status_code == 400


# ---------------------- Estimate metadata enforcement ----------------------
class TestEstimateMetadata:
    def test_estimate_metrics_get_disclaimer_injected(self, http, created_devices):
        user_id = _make_user()
        dev = _pair_device(http, user_id)
        created_devices.append(dev)
        now = datetime.now(timezone.utc).isoformat()
        # Post WITHOUT metadata to verify server force-injects it
        payload = {
            "user_id": user_id, "device_id": dev,
            "measurements": [
                {"metric_type": "blood_glucose_estimated", "value": 95, "unit": "mg/dL", "measured_at": now},
                {"metric_type": "blood_pressure_systolic", "value": 120, "unit": "mmHg",
                 "measured_at": (datetime.now(timezone.utc) + timedelta(seconds=1)).isoformat()},
                {"metric_type": "heart_rate", "value": 70, "unit": "bpm",
                 "measured_at": (datetime.now(timezone.utc) + timedelta(seconds=2)).isoformat()},
            ]
        }
        r = http.post(f"{API}/measurements/batch", json=payload)
        assert r.status_code == 200, r.text

        # Query back
        rq = http.get(f"{BASE_URL}/api/wearable/measurements",
                      params={"user_id": user_id, "metric": "blood_glucose_estimated"})
        assert rq.status_code == 200
        docs = rq.json()["measurements"]
        assert len(docs) >= 1
        meta = docs[0]["metadata"]
        assert meta.get("estimate") is True
        assert "disclaimer" in meta and isinstance(meta["disclaimer"], str) and len(meta["disclaimer"]) > 0

        rq2 = http.get(f"{BASE_URL}/api/wearable/measurements",
                       params={"user_id": user_id, "metric": "blood_pressure_systolic"})
        docs2 = rq2.json()["measurements"]
        assert len(docs2) >= 1
        meta2 = docs2[0]["metadata"]
        assert meta2.get("estimate") is True
        assert "disclaimer" in meta2

        # Non-estimate metric should NOT have estimate=True
        rq3 = http.get(f"{BASE_URL}/api/wearable/measurements",
                       params={"user_id": user_id, "metric": "heart_rate"})
        docs3 = rq3.json()["measurements"]
        assert len(docs3) >= 1
        meta3 = docs3[0].get("metadata") or {}
        assert meta3.get("estimate") is not True
