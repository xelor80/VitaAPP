"""Tests for VitaGuide+ Weight & Metabolism upgrade:
   Schedule (time-of-day fasting), Favorites CRUD/use, Photo AI Analysis,
   Updated Summary fields and VERO hint logic.
"""
import os
import io
import base64
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://stress-relief-app-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/weight-metabolism"


@pytest.fixture(scope="module")
def pid():
    return f"TEST_{uuid.uuid4().hex[:10]}"


class _RetrySession(requests.Session):
    """Session that auto-retries on HTTP 429 with backoff (rate limiter on backend)."""
    def request(self, method, url, **kw):
        for attempt in range(10):
            r = super().request(method, url, **kw)
            if r.status_code != 429:
                return r
            time.sleep(5 + attempt * 3)
        return r


@pytest.fixture(scope="module")
def session():
    s = _RetrySession()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── Schedule ──
class TestSchedule:
    def test_get_empty(self, session, pid):
        r = session.get(f"{API}/{pid}/schedule")
        assert r.status_code == 200
        assert r.json() == {"active": False}

    def test_put_creates_schedule(self, session, pid):
        body = {
            "eating_window_start": "12:00",
            "eating_window_hours": 8,
            "daily_recurring": True,
            "reminders_enabled": True,
        }
        r = session.put(f"{API}/{pid}/schedule", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["active"] is True
        assert d["eating_window_start"] == "12:00"
        assert d["eating_window_end"] == "20:00"
        assert d["eating_window_hours"] == 8
        assert d["fasting_hours"] == 16
        assert d["phase"] in ("eating", "fasting")
        assert "remaining_seconds" in d and isinstance(d["remaining_seconds"], int)
        assert 0 <= d["progress_pct"] <= 100
        assert d["daily_recurring"] is True
        assert d["reminders_enabled"] is True
        # No _id leak
        assert "_id" not in d

    def test_get_returns_active(self, session, pid):
        r = session.get(f"{API}/{pid}/schedule")
        assert r.status_code == 200
        d = r.json()
        assert d["active"] is True
        assert d["phase"] in ("eating", "fasting")
        # in_window check vs current UTC clock
        from datetime import datetime, timezone
        now_m = datetime.now(timezone.utc).hour * 60 + datetime.now(timezone.utc).minute
        start_m = 12 * 60
        end_m = 20 * 60
        in_eating = start_m <= now_m < end_m
        assert d["is_eating"] == in_eating

    def test_validation_window_hours(self, session, pid):
        for bad in [0, 0.5, 15, 24]:
            r = session.put(f"{API}/{pid}/schedule", json={
                "eating_window_start": "10:00",
                "eating_window_hours": bad,
            })
            assert r.status_code == 400, f"hours={bad} should fail, got {r.status_code}"

    def test_validation_invalid_time(self, session, pid):
        for bad in ["25:00", "12:60", "abc", "1200", "12", ""]:
            r = session.put(f"{API}/{pid}/schedule", json={
                "eating_window_start": bad,
                "eating_window_hours": 8,
            })
            assert r.status_code in (400, 422), f"time={bad!r} got {r.status_code}"

    def test_midnight_wrap(self, session):
        """Eating window 22:00 + 8h = wraps past midnight to 06:00."""
        wpid = f"TEST_{uuid.uuid4().hex[:10]}"
        r = session.put(f"{API}/{wpid}/schedule", json={
            "eating_window_start": "22:00",
            "eating_window_hours": 8,
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["eating_window_end"] == "06:00"
        assert d["fasting_hours"] == 16

    def test_delete_schedule(self, session, pid):
        r = session.delete(f"{API}/{pid}/schedule")
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        # GET should now be inactive
        r2 = session.get(f"{API}/{pid}/schedule")
        assert r2.json() == {"active": False}


# ── Favorites ──
class TestFavorites:
    def test_initial_empty(self, session, pid):
        r = session.get(f"{API}/{pid}/favorites")
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 0
        assert d["items"] == []

    def test_create_favorite(self, session, pid):
        body = {"name": "TEST_Protein Shake", "calories": 250, "protein_g": 30,
                "carbs_g": 10, "fat_g": 5, "category": "shake"}
        r = session.post(f"{API}/{pid}/favorites", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        assert d["used_count"] == 0
        assert d["name"] == "TEST_Protein Shake"
        assert d["calories"] == 250
        assert d["category"] == "shake"
        assert "_id" not in d
        pytest.fav_id = d["id"]

    def test_list_after_create(self, session, pid):
        r = session.get(f"{API}/{pid}/favorites")
        d = r.json()
        assert d["count"] == 1
        assert d["items"][0]["id"] == pytest.fav_id

    def test_use_favorite_logs_meal(self, session, pid):
        r = session.post(f"{API}/{pid}/favorites/{pytest.fav_id}/use")
        assert r.status_code == 200, r.text
        meal = r.json()
        assert meal["calories"] == 250
        assert meal["protein_g"] == 30
        assert meal.get("from_favorite_id") == pytest.fav_id
        assert "_id" not in meal
        # used_count incremented
        favs = session.get(f"{API}/{pid}/favorites").json()
        assert favs["items"][0]["used_count"] == 1
        # Today should reflect the meal
        today = session.get(f"{API}/{pid}/today").json()
        assert today["totals"]["calories"] >= 250

    def test_delete_favorite(self, session, pid):
        r = session.delete(f"{API}/{pid}/favorites/{pytest.fav_id}")
        assert r.status_code == 200
        assert r.json().get("deleted") is True
        r2 = session.get(f"{API}/{pid}/favorites").json()
        assert r2["count"] == 0

    def test_delete_nonexistent_returns_404(self, session, pid):
        r = session.delete(f"{API}/{pid}/favorites/does-not-exist")
        assert r.status_code == 404


# ── Photo Analysis ──
def _fetch_food_image_b64() -> str:
    """Fetch a small real food JPEG and return base64 (uncompressed JPEG bytes)."""
    url = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=60"
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    data = r.content
    # Sanity: first bytes should be JPEG magic
    assert data[:3] == b"\xff\xd8\xff", "not a JPEG"
    return base64.b64encode(data).decode()


class TestPhotoAnalysis:
    def test_empty_image_returns_400(self, session, pid):
        r = session.post(f"{API}/{pid}/analyze-meal-photo", json={"image_base64": ""})
        assert r.status_code == 400
        r2 = session.post(f"{API}/{pid}/analyze-meal-photo", json={"image_base64": "abc"})
        assert r2.status_code == 400

    def test_real_food_photo(self, session, pid):
        try:
            img_b64 = _fetch_food_image_b64()
        except Exception as e:
            pytest.skip(f"could not fetch food image: {e}")
        size_kb = len(img_b64) * 3 / 4 / 1024
        assert size_kb < 250, f"image too big: {size_kb}KB"
        r = session.post(f"{API}/{pid}/analyze-meal-photo",
                         json={"image_base64": img_b64}, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        # Must include all fields per contract
        for key in ("success", "name", "items", "calories", "protein_g",
                    "carbs_g", "fat_g", "confidence", "note"):
            assert key in d, f"missing key {key} in response"
        assert isinstance(d["items"], list)
        assert isinstance(d["calories"], int)
        assert d["calories"] >= 0
        assert "_id" not in d
        # If success=True, must have plausible values
        if d["success"]:
            assert d["name"]
            assert d["confidence"] in ("high", "medium", "low")


# ── Summary with schedule + vero_hint ──
class TestSummary:
    def test_summary_includes_schedule_fields(self, session):
        spid = f"TEST_{uuid.uuid4().hex[:10]}"
        # No schedule yet
        r = session.get(f"{API}/{spid}/summary")
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ("schedule_active", "schedule_phase", "schedule_progress_pct",
                    "schedule_remaining_seconds", "schedule_eating_window_start",
                    "schedule_eating_window_end", "vero_hint"):
            assert key in d, f"missing summary key {key}"
        assert d["schedule_active"] is False
        assert "_id" not in d

    def test_summary_with_active_schedule(self, session):
        spid = f"TEST_{uuid.uuid4().hex[:10]}"
        time.sleep(15)  # let API rate-limit window cool down
        r = session.put(f"{API}/{spid}/schedule", json={
            "eating_window_start": "08:00",
            "eating_window_hours": 10,
        })
        if r.status_code == 429:
            pytest.skip("rate-limited; retried but still 429")
        assert r.status_code == 200, r.text
        d = session.get(f"{API}/{spid}/summary").json()
        assert d["schedule_active"] is True
        assert d["schedule_phase"] in ("eating", "fasting")
        assert d["schedule_eating_window_start"] == "08:00"
        assert d["schedule_eating_window_end"] == "18:00"

    def test_vero_hint_protein(self, session):
        """Eat a meal with calories>0 and protein gap>20g → vero_hint mentions protein."""
        spid = f"TEST_{uuid.uuid4().hex[:10]}"
        # Set high protein goal
        session.put(f"{API}/{spid}/goals",
                    json={"daily_calories": 2000, "daily_protein": 150})
        # Log a meal with little protein
        session.post(f"{API}/{spid}/meal", json={
            "name": "TEST_low_protein", "calories": 500, "protein_g": 5,
            "meal_type": "snack",
        })
        d = session.get(f"{API}/{spid}/summary").json()
        # Either schedule hint OR protein hint; with no schedule -> protein hint
        assert d["schedule_active"] is False
        assert d["vero_hint"] is not None
        assert "Protein" in d["vero_hint"]
