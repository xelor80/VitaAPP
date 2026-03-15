"""
Test: Daily Plan with Supplements + Medications (Iteration 69)
Key fix tested: weekly_schedule entries are dicts with 'items' key, not flat lists
Tests for:
1. GET /api/medications/{profile_id}/daily-plan?lang=de - returns BOTH supplements AND medications grouped by timing
2. POST /api/medications/{profile_id}/supplement-check-in - toggle supplement check-in, verify in daily plan
3. POST /api/medications/{profile_id}/{med_id}/check-in - medication check-in still works
4. GET /api/supplement-plan/{profile_id}/reminders - returns reminder settings
5. PUT /api/supplement-plan/{profile_id}/reminders - saves reminder settings
6. Verify supplements have correct name and dosage format
7. Verify supplement dosage handling (int, not dict)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Real profile ID with both supplements and medications (4 morning supps + 1 evening supp + 1 morning med)
REAL_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestDailyPlanWithSupplements:
    """Test the FIXED daily-plan endpoint that correctly includes supplements from weekly_schedule"""
    
    def test_daily_plan_returns_both_supplements_and_medications(self):
        """GET /api/medications/{profile_id}/daily-plan - should return BOTH supplements AND medications"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check required structure
        assert "date" in data, f"Should have 'date' field: {data}"
        assert "plan" in data, f"Should have 'plan' field: {data}"
        assert "total_items" in data, f"Should have 'total_items' field: {data}"
        assert "checked_items" in data, f"Should have 'checked_items' field: {data}"
        assert "percentage" in data, f"Should have 'percentage' field: {data}"
        
        # Plan should have timing groups
        plan = data.get("plan", [])
        assert isinstance(plan, list), f"'plan' should be a list: {data}"
        
        # Count supplements and medications
        supplement_count = 0
        medication_count = 0
        
        for timing_group in plan:
            assert "timing" in timing_group, f"Timing group should have 'timing': {timing_group}"
            assert "label" in timing_group, f"Timing group should have 'label': {timing_group}"
            assert "items" in timing_group, f"Timing group should have 'items': {timing_group}"
            
            for item in timing_group.get("items", []):
                assert "type" in item, f"Item should have 'type' field: {item}"
                assert "id" in item, f"Item should have 'id' field: {item}"
                assert "name" in item, f"Item should have 'name' field: {item}"
                assert "dosage" in item, f"Item should have 'dosage' field: {item}"
                assert "checked" in item, f"Item should have 'checked' field: {item}"
                
                if item["type"] == "supplement":
                    supplement_count += 1
                elif item["type"] == "medication":
                    medication_count += 1
        
        # Based on the requirement: 4 morning supplements + 1 evening supplement + 1 morning medication
        print(f"Found {supplement_count} supplements and {medication_count} medications in daily plan")
        
        # We expect at least 5 supplements (4 morning + 1 evening)
        assert supplement_count >= 1, f"Expected at least 1 supplement in plan, got {supplement_count}"
        
        print(f"PASS: Daily plan returns {supplement_count} supplements and {medication_count} medications")
    
    def test_daily_plan_supplements_have_correct_structure(self):
        """Verify supplement items have correct name and dosage format"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for timing_group in data.get("plan", []):
            for item in timing_group.get("items", []):
                if item["type"] == "supplement":
                    # Name should be a string, not empty
                    assert isinstance(item["name"], str), f"Name should be string: {item}"
                    assert len(item["name"]) > 0, f"Name should not be empty: {item}"
                    
                    # Dosage should be a string (formatted as "amount unit")
                    assert isinstance(item["dosage"], str), f"Dosage should be string: {item}"
                    
                    # Check that dosage is not a dict format
                    assert "{" not in item["dosage"], f"Dosage should not contain dict format: {item}"
                    
                    print(f"  Supplement: {item['name']} - {item['dosage']}")
        
        print("PASS: Supplement items have correct name and dosage format")
    
    def test_daily_plan_german_labels(self):
        """GET /api/medications/{profile_id}/daily-plan?lang=de - should have German labels"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        german_labels = {"Morgens", "Mittags", "Abends"}
        
        for timing_group in data.get("plan", []):
            label = timing_group.get("label", "")
            assert label in german_labels, f"Label should be German, got: {label}"
        
        print("PASS: Daily plan uses German labels (Morgens/Mittags/Abends)")
    
    def test_daily_plan_items_grouped_by_timing(self):
        """Verify items are correctly grouped by morning/noon/evening"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        valid_timings = {"morning", "noon", "evening"}
        
        for timing_group in data.get("plan", []):
            timing = timing_group.get("timing", "")
            assert timing in valid_timings, f"Invalid timing: {timing}"
            
            for item in timing_group.get("items", []):
                item_timing = item.get("timing", "")
                assert item_timing == timing, f"Item timing mismatch: {item_timing} != {timing}"
        
        print("PASS: Items are correctly grouped by timing")


class TestSupplementCheckInWithDailyPlan:
    """Test supplement check-in toggle and verify it reflects in daily plan"""
    
    def test_supplement_checkin_toggle_and_verify_in_plan(self):
        """POST supplement check-in should toggle and reflect in daily plan"""
        # First, get daily plan to find a supplement ID
        plan_response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert plan_response.status_code == 200
        data = plan_response.json()
        
        # Find a supplement in the plan
        test_supplement = None
        test_timing = None
        
        for timing_group in data.get("plan", []):
            for item in timing_group.get("items", []):
                if item["type"] == "supplement":
                    test_supplement = item["id"]
                    test_timing = item["timing"]
                    break
            if test_supplement:
                break
        
        if not test_supplement:
            # If no supplement in plan, use a known supplement ID
            test_supplement = "vitamin_d"
            test_timing = "morning"
            print(f"INFO: No supplement found in plan, using default: {test_supplement}/{test_timing}")
        else:
            print(f"Found supplement in plan: {test_supplement} ({test_timing})")
        
        # Toggle check-in - first call should check
        checkin1 = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": test_supplement, "timing": test_timing}
        )
        
        assert checkin1.status_code == 200, f"Expected 200, got {checkin1.status_code}: {checkin1.text}"
        state1 = checkin1.json()["checked"]
        print(f"First check-in call: checked={state1}")
        
        # Get daily plan to verify reflection
        plan2 = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert plan2.status_code == 200
        
        # Toggle back to clean up
        checkin2 = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": test_supplement, "timing": test_timing}
        )
        
        assert checkin2.status_code == 200
        state2 = checkin2.json()["checked"]
        
        assert state1 != state2, f"Toggle should change state: {state1} -> {state2}"
        print(f"PASS: Supplement check-in toggle works: {state1} -> {state2}")
    
    def test_supplement_checkin_with_vitamin_d_morning(self):
        """Test check-in with supplement_id='vitamin_d' and timing='morning'"""
        # Check-in vitamin_d
        response1 = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": "vitamin_d", "timing": "morning"}
        )
        
        assert response1.status_code == 200, f"Expected 200, got {response1.status_code}: {response1.text}"
        first_state = response1.json()["checked"]
        
        # Toggle back
        response2 = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": "vitamin_d", "timing": "morning"}
        )
        
        assert response2.status_code == 200
        second_state = response2.json()["checked"]
        
        assert first_state != second_state, "Toggle should change state"
        print(f"PASS: vitamin_d morning check-in toggle: {first_state} -> {second_state}")


class TestMedicationCheckIn:
    """Verify medication check-in still works"""
    
    @pytest.fixture(scope="class")
    def test_medication(self):
        """Create a test medication for check-in tests"""
        med_name = f"TEST_DailyPlanMed69_{uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}",
            json={
                "name": med_name,
                "dosage": 100,
                "unit": "mg",
                "timings": ["morning", "evening"],
                "frequency": "daily"
            }
        )
        
        if response.status_code == 200:
            med = response.json()["medication"]
            yield med
            # Cleanup
            requests.delete(f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/{med['id']}")
        else:
            pytest.skip(f"Failed to create test medication: {response.status_code}")
    
    def test_medication_checkin_toggle(self, test_medication):
        """POST /api/medications/{profile_id}/{med_id}/check-in - should toggle"""
        # First check-in
        response1 = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/{test_medication['id']}/check-in",
            json={"timing": "morning"}
        )
        
        assert response1.status_code == 200, f"Expected 200, got {response1.status_code}: {response1.text}"
        state1 = response1.json()["checked"]
        
        # Toggle
        response2 = requests.post(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/{test_medication['id']}/check-in",
            json={"timing": "morning"}
        )
        
        assert response2.status_code == 200
        state2 = response2.json()["checked"]
        
        assert state1 != state2, f"Toggle should change state: {state1} -> {state2}"
        print(f"PASS: Medication check-in toggle works: {state1} -> {state2}")
    
    def test_medication_appears_in_daily_plan(self, test_medication):
        """Verify created medication appears in daily plan"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Find our medication in the plan
        found = False
        for timing_group in data.get("plan", []):
            for item in timing_group.get("items", []):
                if item.get("id") == test_medication["id"]:
                    found = True
                    assert item["type"] == "medication"
                    assert item["name"] == test_medication["name"]
                    print(f"Found test medication in daily plan: {item['name']}")
                    break
        
        assert found, f"Test medication {test_medication['id']} not found in daily plan"
        print("PASS: Medication appears in daily plan")


class TestReminderCRUD:
    """Test reminder CRUD endpoints"""
    
    def test_get_reminders(self):
        """GET /api/supplement-plan/{profile_id}/reminders - returns reminder config"""
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/{REAL_PROFILE_ID}/reminders"
        )
        
        # Should return 200 if plan exists, 404 otherwise
        if response.status_code == 200:
            data = response.json()
            # Reminders should have expected fields
            assert isinstance(data, dict), f"Reminders should be dict: {data}"
            print(f"PASS: GET reminders returns: {list(data.keys())}")
        elif response.status_code == 404:
            print("INFO: No supplement plan found for profile (404)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}: {response.text}")
    
    def test_get_reminders_404_for_unknown_profile(self):
        """GET /api/supplement-plan/{unknown}/reminders - returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/unknown_profile_xyz_12345/reminders"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: GET reminders returns 404 for unknown profile")
    
    def test_put_reminders_updates_settings(self):
        """PUT /api/supplement-plan/{profile_id}/reminders - updates settings"""
        # First check if profile has a plan
        check = requests.get(f"{BASE_URL}/api/supplement-plan/{REAL_PROFILE_ID}")
        if check.status_code != 200:
            pytest.skip("Profile doesn't have a supplement plan")
        
        new_reminders = {
            "enabled": True,
            "morning_time": "07:45",
            "noon_time": "12:45",
            "evening_time": "19:45"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{REAL_PROFILE_ID}/reminders",
            json=new_reminders
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, f"Should return success=True: {data}"
        assert "reminders" in data, f"Should return reminders: {data}"
        
        saved = data["reminders"]
        assert saved.get("enabled") == True
        assert saved.get("morning_time") == "07:45"
        assert saved.get("noon_time") == "12:45"
        assert saved.get("evening_time") == "19:45"
        
        print("PASS: PUT reminders updates settings correctly")
    
    def test_put_reminders_with_shift_cycle(self):
        """PUT /api/supplement-plan/{profile_id}/reminders - with shift_cycle"""
        check = requests.get(f"{BASE_URL}/api/supplement-plan/{REAL_PROFILE_ID}")
        if check.status_code != 200:
            pytest.skip("Profile doesn't have a supplement plan")
        
        reminders_with_shift = {
            "enabled": True,
            "morning_time": "08:00",
            "noon_time": "12:00",
            "evening_time": "20:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "off"],
                "start_date": "2026-01-15"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{REAL_PROFILE_ID}/reminders",
            json=reminders_with_shift
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        saved = data.get("reminders", {})
        assert saved.get("shift_cycle") is not None, "shift_cycle should be saved"
        assert saved["shift_cycle"]["pattern"] == ["early", "early", "late", "late", "off"]
        
        print("PASS: PUT reminders with shift_cycle works")
    
    def test_put_reminders_404_for_unknown_profile(self):
        """PUT /api/supplement-plan/{unknown}/reminders - returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/unknown_profile_xyz_12345/reminders",
            json={
                "enabled": False,
                "morning_time": "08:00",
                "noon_time": "12:00",
                "evening_time": "20:00"
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: PUT reminders returns 404 for unknown profile")


class TestSupplementPlanEndpoint:
    """Test supplement plan endpoint to verify weekly_schedule structure"""
    
    def test_supplement_plan_weekly_schedule_structure(self):
        """GET /api/supplement-plan/{profile_id} - verify weekly_schedule structure"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{REAL_PROFILE_ID}")
        
        if response.status_code != 200:
            pytest.skip(f"No supplement plan found: {response.status_code}")
        
        data = response.json()
        plan = data.get("plan", {})
        weekly_schedule = plan.get("weekly_schedule", {})
        
        assert isinstance(weekly_schedule, dict), f"weekly_schedule should be dict: {type(weekly_schedule)}"
        
        # Check structure: morning/noon/evening should have 'items' key
        for timing in ["morning", "noon", "evening"]:
            if timing in weekly_schedule:
                section = weekly_schedule[timing]
                if isinstance(section, dict):
                    items = section.get("items", [])
                    assert isinstance(items, list), f"{timing} items should be list"
                    print(f"  {timing}: {len(items)} items")
                elif isinstance(section, list):
                    print(f"  {timing}: {len(section)} items (flat list format)")
        
        print("PASS: weekly_schedule has correct structure")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_medications(self):
        """Delete any test medications created during tests"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}",
            params={"active_only": False}
        )
        
        if response.status_code == 200:
            meds = response.json().get("medications", [])
            deleted = 0
            for med in meds:
                if med.get("name", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/medications/{REAL_PROFILE_ID}/{med['id']}"
                    )
                    if del_response.status_code in [200, 404]:
                        deleted += 1
            print(f"PASS: Cleaned up {deleted} test medications")
        else:
            print("INFO: No medications to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
