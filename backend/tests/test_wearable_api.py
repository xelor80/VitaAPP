"""Backend tests for wearable/HBand integration endpoints."""
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


@pytest.fixture(scope="module")
def user_id():
    return f"e2e-wearable-{uuid.uuid4().hex[:8]}"


@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def device(http, user_id):
    """Create device once; cleanup at end."""
    payload = {
        "user_id": user_id,
        "provider": "demo",
        "model": "HBand-Test",
        "name": "TEST Demo Band",
        "firmware_version": "1.0.0",
        "ble_address": f"AA:BB:CC:{uuid.uuid4().hex[:2].upper()}:00:01",
        "battery_level": 88,
    }
    r = http.post(f"{API}/devices", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert "device_id" in data["device"]
    dev = data["device"]
    yield dev
    # Cleanup
    http.delete(f"{API}/devices/{dev['device_id']}", params={"purge_data": "true"})


# --- Device tests ---
class TestDevices:
    def test_create_device_returns_device_id(self, device):
        assert device["device_id"]
        assert device["provider"] == "demo"
        assert device["connection_status"] == "paired"

    def test_list_devices(self, http, user_id, device):
        r = http.get(f"{API}/devices", params={"user_id": user_id})
        assert r.status_code == 200
        data = r.json()
        ids = [d["device_id"] for d in data["devices"]]
        assert device["device_id"] in ids

    def test_repair_same_ble_upserts(self, http, user_id, device):
        payload = {
            "user_id": user_id,
            "provider": "demo",
            "ble_address": device["ble_address"],
            "battery_level": 55,
            "name": "TEST Renamed",
        }
        r = http.post(f"{API}/devices", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["was_paired_before"] is True
        assert d["device"]["battery_level"] == 55

    def test_update_device(self, http, device):
        r = http.put(
            f"{API}/devices/{device['device_id']}",
            json={"battery_level": 42, "connection_status": "connected"},
        )
        assert r.status_code == 200
        get_r = http.get(f"{API}/devices/{device['device_id']}")
        assert get_r.json()["battery_level"] == 42
        assert get_r.json()["connection_status"] == "connected"


# --- Measurements ---
class TestMeasurements:
    @pytest.fixture(scope="class")
    def batch_payload(self, user_id, device):
        now = datetime.now(timezone.utc).replace(microsecond=0)
        measurements = []
        for i in range(5):
            measurements.append({
                "metric_type": "heart_rate",
                "value": 60 + i,
                "unit": "bpm",
                "measured_at": (now + timedelta(minutes=i)).isoformat(),
                "source": "demo",
            })
        measurements.append({
            "metric_type": "hrv",
            "value": 45.5,
            "unit": "ms",
            "measured_at": now.isoformat(),
        })
        return {
            "user_id": user_id,
            "device_id": device["device_id"],
            "measurements": measurements,
        }

    def test_batch_insert(self, http, batch_payload):
        r = http.post(f"{API}/measurements/batch", json=batch_payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["inserted"] == 6
        assert data["duplicates"] == 0
        assert data["total"] == 6

    def test_batch_dedupe_same_batch(self, http, batch_payload):
        r = http.post(f"{API}/measurements/batch", json=batch_payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["inserted"] == 0
        assert data["duplicates"] == 6

    def test_query_measurements_metric_filter(self, http, user_id):
        r = http.get(f"{API}/measurements", params={"user_id": user_id, "metric": "heart_rate"})
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 5
        for m in data["measurements"]:
            assert m["metric_type"] == "heart_rate"

    def test_query_measurements_time_range(self, http, user_id, batch_payload):
        first_at = batch_payload["measurements"][0]["measured_at"]
        r = http.get(
            f"{API}/measurements",
            params={"user_id": user_id, "metric": "heart_rate", "from": first_at, "to": first_at},
        )
        assert r.status_code == 200
        assert r.json()["count"] == 1


# --- Sleep sessions ---
class TestSleep:
    @pytest.fixture(scope="class")
    def sleep_items(self, user_id, device):
        start = datetime.now(timezone.utc).replace(hour=23, minute=0, second=0, microsecond=0) - timedelta(days=1)
        end = start + timedelta(hours=7)
        return [{
            "user_id": user_id,
            "device_id": device["device_id"],
            "start_time": start.isoformat(),
            "end_time": end.isoformat(),
            "total_minutes": 420,
            "deep_sleep_minutes": 90,
            "rem_sleep_minutes": 100,
            "light_sleep_minutes": 210,
            "awake_minutes": 20,
            "source_score": 82,
        }]

    def test_insert_sleep(self, http, sleep_items):
        r = http.post(f"{API}/sleep-sessions/batch", json=sleep_items)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 1
        assert d["duplicates"] == 0

    def test_dedupe_sleep(self, http, sleep_items):
        r = http.post(f"{API}/sleep-sessions/batch", json=sleep_items)
        assert r.status_code == 200
        d = r.json()
        assert d["inserted"] == 0
        assert d["duplicates"] == 1


# --- Sync log ---
class TestSyncStatus:
    def test_append_and_get(self, http, user_id, device):
        payload = {
            "user_id": user_id,
            "device_id": device["device_id"],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": datetime.now(timezone.utc).isoformat(),
            "status": "success",
            "records_received": 6,
        }
        r = http.post(f"{API}/sync-status", json=payload)
        assert r.status_code == 200
        assert r.json()["success"] is True

        r2 = http.get(f"{API}/sync-status", params={"user_id": user_id})
        assert r2.status_code == 200
        data = r2.json()
        assert data["count"] >= 1
        assert any(l["device_id"] == device["device_id"] for l in data["logs"])


# --- Daily summary ---
class TestDailySummary:
    def test_daily_aggregation(self, http, user_id):
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        r = http.get(f"{API}/daily-summary/{user_id}", params={"date": today})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["date"] == today
        assert "metrics" in data
        assert isinstance(data["data_completeness"], float)
        hr = data["metrics"].get("heart_rate")
        assert hr is not None
        assert hr["count"] == 5
        assert hr["min"] == 60
        assert hr["max"] == 64
        assert hr["avg"] == 62.0

    def test_daily_summary_bad_date(self, http, user_id):
        r = http.get(f"{API}/daily-summary/{user_id}", params={"date": "not-a-date"})
        assert r.status_code == 400


# --- Deletion / purge ---
class TestDeletion:
    def test_delete_without_purge_keeps_measurements(self, http):
        uid = f"e2e-wearable-{uuid.uuid4().hex[:8]}"
        # create device
        r = http.post(f"{API}/devices", json={
            "user_id": uid, "provider": "demo",
            "ble_address": f"11:22:33:{uuid.uuid4().hex[:2].upper()}:44:55",
        })
        dev_id = r.json()["device"]["device_id"]
        # add measurement
        now = datetime.now(timezone.utc).isoformat()
        http.post(f"{API}/measurements/batch", json={
            "user_id": uid, "device_id": dev_id,
            "measurements": [{
                "metric_type": "steps", "value": 1000, "unit": "count",
                "measured_at": now,
            }],
        })
        # delete without purge
        r_del = http.delete(f"{API}/devices/{dev_id}", params={"purge_data": "false"})
        assert r_del.status_code == 200
        assert r_del.json()["purged"]["measurements"] == 0
        # measurement should still exist
        r_q = http.get(f"{API}/measurements", params={"user_id": uid})
        assert r_q.json()["count"] == 1
        # cleanup
        # no device to delete; purge manually via a re-created device? Just leave since unique user
        # Use direct DB not available; leave as user_id is unique

    def test_delete_with_purge(self, http):
        uid = f"e2e-wearable-{uuid.uuid4().hex[:8]}"
        r = http.post(f"{API}/devices", json={
            "user_id": uid, "provider": "demo",
            "ble_address": f"99:88:77:{uuid.uuid4().hex[:2].upper()}:66:55",
        })
        dev_id = r.json()["device"]["device_id"]
        now = datetime.now(timezone.utc).isoformat()
        http.post(f"{API}/measurements/batch", json={
            "user_id": uid, "device_id": dev_id,
            "measurements": [
                {"metric_type": "steps", "value": 500, "unit": "count", "measured_at": now},
                {"metric_type": "heart_rate", "value": 70, "unit": "bpm", "measured_at": now},
            ],
        })
        http.post(f"{API}/sync-status", json={
            "user_id": uid, "device_id": dev_id,
            "started_at": now, "status": "success", "records_received": 2,
        })
        r_del = http.delete(f"{API}/devices/{dev_id}", params={"purge_data": "true"})
        assert r_del.status_code == 200
        purged = r_del.json()["purged"]
        assert purged["measurements"] == 2
        assert purged["sync_logs"] == 1
        # verify gone
        assert http.get(f"{API}/measurements", params={"user_id": uid}).json()["count"] == 0
        assert http.get(f"{API}/sync-status", params={"user_id": uid}).json()["count"] == 0

    def test_delete_nonexistent(self, http):
        r = http.delete(f"{API}/devices/does-not-exist-{uuid.uuid4().hex}")
        assert r.status_code == 404
