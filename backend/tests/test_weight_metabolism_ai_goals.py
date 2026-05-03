"""Tests for POST /api/weight-metabolism/{pid}/ai-calculate-goals (AI calorie + protein)."""
import os
import uuid
import pytest
import requests

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or "https://stress-relief-app-11.preview.emergentagent.com"
).rstrip("/")

API = f"{BASE_URL}/api/weight-metabolism"


@pytest.fixture
def pid():
    return f"TEST_{uuid.uuid4()}"


def _validate_shape(data: dict):
    # Required keys
    for k in ("daily_calories", "daily_protein", "note", "inputs", "anchor"):
        assert k in data, f"missing key {k}: {data}"
    # Types & bounds
    assert isinstance(data["daily_calories"], int), data["daily_calories"]
    assert 1200 <= data["daily_calories"] <= 5000
    assert data["daily_calories"] % 50 == 0, "calories not multiple of 50"
    assert isinstance(data["daily_protein"], int)
    assert 40 <= data["daily_protein"] <= 300
    assert data["daily_protein"] % 5 == 0, "protein not multiple of 5"
    assert isinstance(data["note"], str)
    # No _id leak anywhere in response
    assert "_id" not in data
    for v in data.values():
        if isinstance(v, dict):
            assert "_id" not in v
    # anchor structure
    assert "tdee" in data["anchor"] and "protein" in data["anchor"]


class TestAIGoals:
    # Case 1 — male 85kg active build_muscle — main shape + sanity
    def test_male_active_build_muscle(self, pid):
        payload = {
            "gender": "male",
            "current_weight_kg": 85,
            "height_cm": 180,
            "age": 32,
            "activity_level": "active",
            "goal": "build_muscle",
        }
        r = requests.post(f"{API}/{pid}/ai-calculate-goals", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        _validate_shape(data)

        # inputs echo
        inp = data["inputs"]
        assert inp["gender"] == "male"
        assert inp["current_weight_kg"] == 85
        assert inp["height_cm"] == 180
        assert inp["age"] == 32
        assert inp["activity_level"] == "active"
        assert inp["goal"] == "build_muscle"

        # Calories within ±15% of anchor.tdee sanity check
        anchor = data["anchor"]["tdee"]
        assert abs(data["daily_calories"] - anchor) / anchor <= 0.15, (
            f"cal {data['daily_calories']} not within 15% of anchor {anchor}"
        )
        # Save for cross-case comparison
        pytest.male_cal = data["daily_calories"]

    # Case 2 — female 65kg moderate lose — should return LOWER calories
    def test_female_moderate_lose(self, pid):
        payload = {
            "gender": "female",
            "current_weight_kg": 65,
            "height_cm": 168,
            "age": 30,
            "activity_level": "moderate",
            "goal": "lose",
        }
        r = requests.post(f"{API}/{pid}/ai-calculate-goals", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        _validate_shape(data)
        assert data["inputs"]["gender"] == "female"
        # within 15% of anchor
        anchor = data["anchor"]["tdee"]
        assert abs(data["daily_calories"] - anchor) / anchor <= 0.15

        # Must be lower than male active build (case 1 ran first due to name order)
        male_cal = getattr(pytest, "male_cal", None)
        if male_cal is not None:
            assert data["daily_calories"] < male_cal, (
                f"female-lose {data['daily_calories']} not < male-build {male_cal}"
            )

    # Case 3 — missing gender and no stored weight/profile → 400 with German msg
    def test_missing_gender_and_weight_returns_400(self, pid):
        r = requests.post(
            f"{API}/{pid}/ai-calculate-goals", json={}, timeout=30
        )
        assert r.status_code == 400, r.text
        body = r.json()
        detail = body.get("detail", "") if isinstance(body, dict) else ""
        # German keywords
        assert ("Geschlecht" in detail or "Gewicht" in detail), detail

    # Case 4 — uses latest weight from weight_log when current_weight_kg omitted
    def test_uses_latest_weight_log(self, pid):
        # Seed a weight
        w = requests.post(
            f"{API}/{pid}/weight",
            json={"weight_kg": 72.5, "note": "TEST seed"},
            timeout=30,
        )
        assert w.status_code == 200, w.text
        # Call without current_weight_kg, only gender
        r = requests.post(
            f"{API}/{pid}/ai-calculate-goals",
            json={"gender": "female"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _validate_shape(data)
        assert data["inputs"]["current_weight_kg"] == 72.5
        assert data["inputs"]["gender"] == "female"

    # Case 5 — No _id leak (explicit) + fallback note sanity is string
    def test_no_id_leak_and_note_string(self, pid):
        r = requests.post(
            f"{API}/{pid}/ai-calculate-goals",
            json={
                "gender": "male",
                "current_weight_kg": 80,
                "activity_level": "sedentary",
                "goal": "maintain",
            },
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _validate_shape(data)
        # Serialized body should not contain any MongoDB _id
        assert "_id" not in r.text


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
