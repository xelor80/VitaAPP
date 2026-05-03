"""
Tests for VitaGuide+ Weight & Metabolism — VERO coach-comment & profile timezone.
New endpoints:
  - POST /api/weight-metabolism/{pid}/coach-comment
  - PUT  /api/weight-metabolism/{pid}/timezone
  - GET  /api/weight-metabolism/{pid}/timezone
LLM: real gpt-4o-mini via EMERGENT_LLM_KEY (kept to ~3 calls).
"""
import os
import re
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stress-relief-app-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/weight-metabolism"

# Single profile for entire run (created on the fly)
PID = f"TEST_coach_{uuid.uuid4().hex[:8]}"

# Emoji regex (covers most pictographs/emoji blocks)
EMOJI_RE = re.compile(
    "["                  # noqa
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U0001F000-\U0001F9FF"
    "]+",
    flags=re.UNICODE,
)


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─────────── Coach Comment ───────────

class TestCoachComment:
    """VERO post-meal coach comment endpoint."""

    def test_tiny_snack_no_llm_neutral(self, session):
        """cal<150 -> comment null, tone neutral, no LLM call (fast)."""
        t0 = time.time()
        r = session.post(f"{API}/{PID}/coach-comment", json={
            "name": f"TEST_apple_{uuid.uuid4().hex[:6]}",
            "calories": 80, "protein_g": 0.3, "meal_type": "snack",
        })
        elapsed = time.time() - t0
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["comment"] is None
        assert body["tone"] == "neutral"
        assert body["cached"] is False
        assert "_id" not in body
        # No LLM call -> should be very fast (<3s allowing for mongo)
        assert elapsed < 3.0, f"Tiny-snack path took {elapsed:.2f}s — LLM may be wasted"

    def test_protein_rich_positive_then_cached(self, session):
        """cal>=150 & protein/cal>=6g/100kcal => positive + cached on 2nd call."""
        meal_name = f"TEST_huettenkaese_{uuid.uuid4().hex[:6]}"
        payload = {"name": meal_name, "calories": 200, "protein_g": 20.0, "meal_type": "snack"}

        # 1st call -> LLM
        t0 = time.time()
        r1 = session.post(f"{API}/{PID}/coach-comment", json=payload, timeout=60)
        first_elapsed = time.time() - t0
        assert r1.status_code == 200, r1.text
        b1 = r1.json()
        assert b1["tone"] == "positive", f"Expected positive, got {b1}"
        assert b1["cached"] is False
        assert b1["comment"] and isinstance(b1["comment"], str)
        assert len(b1["comment"]) <= 180, f"comment too long ({len(b1['comment'])})"
        # No emoji
        assert not EMOJI_RE.search(b1["comment"]), f"emoji found: {b1['comment']}"
        # No markdown / code-fencing
        assert "```" not in b1["comment"]
        assert not b1["comment"].startswith(("#", "*", "-", ">"))
        assert "**" not in b1["comment"]
        assert "_id" not in b1

        # 2nd call (same hash) -> cached
        t1 = time.time()
        r2 = session.post(f"{API}/{PID}/coach-comment", json=payload, timeout=10)
        second_elapsed = time.time() - t1
        assert r2.status_code == 200
        b2 = r2.json()
        assert b2["cached"] is True
        assert b2["comment"] == b1["comment"]
        assert b2["tone"] == "positive"
        assert "_id" not in b2
        # Cached should be much faster
        assert second_elapsed < max(2.0, first_elapsed * 0.5), (
            f"cached call ({second_elapsed:.2f}s) not faster than first ({first_elapsed:.2f}s)"
        )

    def test_protein_poor_highcal_suggestive(self, session):
        """cal>=300 & protein/cal<2g/100kcal => suggestive."""
        r = session.post(f"{API}/{PID}/coach-comment", json={
            "name": f"TEST_pommes_{uuid.uuid4().hex[:6]}",
            "calories": 450, "protein_g": 4.0,  # ratio 0.89
            "meal_type": "lunch",
        }, timeout=60)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["tone"] == "suggestive", b
        assert b["cached"] is False
        assert b["comment"] and isinstance(b["comment"], str)
        assert len(b["comment"]) <= 180
        assert not EMOJI_RE.search(b["comment"])
        assert "```" not in b["comment"]
        assert "_id" not in b

    def test_very_highcal_caution(self, session):
        """cal>=600 (and not matching positive/suggestive) => caution."""
        r = session.post(f"{API}/{PID}/coach-comment", json={
            "name": f"TEST_doener_{uuid.uuid4().hex[:6]}",
            "calories": 750, "protein_g": 22.0,  # ratio 2.93 → caution
            "meal_type": "dinner",
        }, timeout=60)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["tone"] == "caution", b
        assert b["cached"] is False
        assert b["comment"] and isinstance(b["comment"], str)
        assert len(b["comment"]) <= 180
        assert not EMOJI_RE.search(b["comment"])
        assert "```" not in b["comment"]
        assert "_id" not in b


# ─────────── Timezone ───────────

class TestTimezone:
    """Profile timezone PUT/GET."""

    def test_get_unset_returns_null(self, session):
        pid = f"TEST_tz_unset_{uuid.uuid4().hex[:6]}"
        r = session.get(f"{API}/{pid}/timezone")
        assert r.status_code == 200
        body = r.json()
        assert body.get("timezone") is None
        assert "_id" not in body

    def test_put_then_get(self, session):
        pid = f"TEST_tz_{uuid.uuid4().hex[:6]}"
        r = session.put(f"{API}/{pid}/timezone", json={
            "timezone": "Europe/Berlin", "offset_minutes": 60,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["timezone"] == "Europe/Berlin"
        assert body["offset_minutes"] == 60
        assert body["profile_id"] == pid
        assert "_id" not in body

        # GET it back
        g = session.get(f"{API}/{pid}/timezone")
        assert g.status_code == 200
        gb = g.json()
        assert gb["timezone"] == "Europe/Berlin"
        assert gb["offset_minutes"] == 60
        assert "_id" not in gb

    def test_put_empty_timezone_returns_400(self, session):
        pid = f"TEST_tz_bad_{uuid.uuid4().hex[:6]}"
        r = session.put(f"{API}/{pid}/timezone", json={
            "timezone": "", "offset_minutes": 0,
        })
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_put_whitespace_timezone_returns_400(self, session):
        pid = f"TEST_tz_ws_{uuid.uuid4().hex[:6]}"
        r = session.put(f"{API}/{pid}/timezone", json={
            "timezone": "   ", "offset_minutes": 0,
        })
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_put_overwrites_previous(self, session):
        pid = f"TEST_tz_upd_{uuid.uuid4().hex[:6]}"
        session.put(f"{API}/{pid}/timezone", json={"timezone": "Europe/Berlin", "offset_minutes": 60})
        r = session.put(f"{API}/{pid}/timezone", json={"timezone": "America/New_York", "offset_minutes": -300})
        assert r.status_code == 200
        g = session.get(f"{API}/{pid}/timezone").json()
        assert g["timezone"] == "America/New_York"
        assert g["offset_minutes"] == -300
