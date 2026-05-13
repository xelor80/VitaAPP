"""
Phase 3 Abnehm-Guide backend regression tests.
Covers:
- POST /meal with the 4 Routine-Mahlzeit-Templates (std_shake, protein_bowl, chicken_rice, skyr_snack)
- Verifies create -> persist via GET /today, then DELETE cleanup
- Regression on all Phase 1+2 endpoints: /today, /goals, /schedule, /day-plan,
  /summary, /achievements, /weight/history (all must still 200)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fall back to frontend/.env value used by the live app
    BASE_URL = "https://stress-relief-app-11.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")

PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"

TEMPLATES = [
    {"id": "std_shake",    "name": "Standard Shake", "calories": 320, "protein_g": 35, "meal_type": "shake"},
    {"id": "protein_bowl", "name": "Protein Bowl",   "calories": 480, "protein_g": 38, "meal_type": "lunch"},
    {"id": "chicken_rice", "name": "Hähnchen Reis",  "calories": 620, "protein_g": 45, "meal_type": "dinner"},
    {"id": "skyr_snack",   "name": "Skyr Snack",     "calories": 180, "protein_g": 22, "meal_type": "snack"},
]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── Regression: Phase 1 + Phase 2 endpoints still 200 ──
@pytest.mark.parametrize("endpoint", [
    "today", "goals", "schedule", "day-plan", "summary", "achievements", "weight/history",
])
def test_regression_endpoints_200(session, endpoint):
    r = session.get(f"{BASE_URL}/api/weight-metabolism/{PROFILE_ID}/{endpoint}", timeout=20)
    assert r.status_code == 200, f"/{endpoint} returned {r.status_code}: {r.text[:200]}"
    # Validate response is JSON
    data = r.json()
    assert isinstance(data, dict)


# ── Phase 3: POST /meal works for each template payload + persistence verified ──
@pytest.mark.parametrize("tpl", TEMPLATES, ids=[t["id"] for t in TEMPLATES])
def test_quick_add_template_persists(session, tpl):
    payload = {
        "name": tpl["name"],
        "calories": tpl["calories"],
        "protein_g": tpl["protein_g"],
        "meal_type": tpl["meal_type"],
    }
    r = session.post(f"{BASE_URL}/api/weight-metabolism/{PROFILE_ID}/meal", json=payload, timeout=20)
    assert r.status_code == 200, f"POST /meal failed: {r.status_code} {r.text[:200]}"
    created = r.json()
    assert created["name"] == tpl["name"]
    assert created["calories"] == tpl["calories"]
    assert float(created["protein_g"]) == float(tpl["protein_g"])
    assert created["meal_type"] == tpl["meal_type"]
    assert "id" in created and isinstance(created["id"], str) and len(created["id"]) > 0
    meal_id = created["id"]

    # Verify it appears in /today
    today = session.get(f"{BASE_URL}/api/weight-metabolism/{PROFILE_ID}/today", timeout=20).json()
    meals = today.get("meals", [])
    match = [m for m in meals if m.get("id") == meal_id]
    assert match, f"Created meal {meal_id} not found in /today.meals"
    m = match[0]
    assert m["name"] == tpl["name"]
    assert m["calories"] == tpl["calories"]
    assert float(m["protein_g"]) == float(tpl["protein_g"])

    # Cleanup
    d = session.delete(f"{BASE_URL}/api/weight-metabolism/{PROFILE_ID}/meal/{meal_id}", timeout=20)
    assert d.status_code in (200, 204), f"DELETE failed: {d.status_code} {d.text[:200]}"


# ── Sanity: /today shape required for Phase 3 frontend (meals array exists) ──
def test_today_has_meals_array(session):
    r = session.get(f"{BASE_URL}/api/weight-metabolism/{PROFILE_ID}/today", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "meals" in data and isinstance(data["meals"], list)
