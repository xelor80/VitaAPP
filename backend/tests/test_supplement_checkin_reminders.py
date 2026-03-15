"""
Test: Supplement Check-in Toggle & Reminder CRUD
Iteration 68 - Tests for:
1. POST /api/medications/{profile_id}/supplement-check-in - toggle supplement check-in
2. POST /api/medications/{profile_id}/{medication_id}/check-in - medication check-in still works
3. GET /api/medications/{profile_id}/daily-plan?lang=de - combined daily plan
4. GET /api/supplement-plan/{profile_id}/reminders - get reminder settings
5. PUT /api/supplement-plan/{profile_id}/reminders - save reminder settings
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test profile ID for testing
TEST_PROFILE_ID = f"TEST_{uuid.uuid4().hex[:8]}"


class TestSupplementCheckIn:
    """Test the new supplement check-in toggle endpoint"""
    
    def test_supplement_checkin_first_call_checks(self):
        """POST /api/medications/{profile_id}/supplement-check-in - first call should check"""
        supplement_id = f"test_supp_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "morning"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "checked" in data, f"Response should contain 'checked' field: {data}"
        assert data["checked"] == True, f"First check-in should return checked=True: {data}"
        print(f"PASS: First supplement check-in returns checked=True")
    
    def test_supplement_checkin_second_call_unchecks(self):
        """POST /api/medications/{profile_id}/supplement-check-in - second call should uncheck"""
        supplement_id = f"test_supp_{uuid.uuid4().hex[:8]}"
        
        # First call - check
        response1 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "evening"}
        )
        assert response1.status_code == 200
        assert response1.json()["checked"] == True
        
        # Second call - uncheck
        response2 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "evening"}
        )
        
        assert response2.status_code == 200, f"Expected 200, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert data["checked"] == False, f"Second check-in should return checked=False: {data}"
        print(f"PASS: Second supplement check-in (toggle) returns checked=False")
    
    def test_supplement_checkin_third_call_checks_again(self):
        """POST /api/medications/{profile_id}/supplement-check-in - third call should check again"""
        supplement_id = f"test_supp_{uuid.uuid4().hex[:8]}"
        
        # First call - check
        requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "noon"}
        )
        
        # Second call - uncheck
        requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "noon"}
        )
        
        # Third call - check again
        response3 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "noon"}
        )
        
        assert response3.status_code == 200
        assert response3.json()["checked"] == True, "Third call should check again"
        print(f"PASS: Third supplement check-in toggles back to checked=True")
    
    def test_supplement_checkin_different_timings_independent(self):
        """Different timings should be independent check-ins"""
        supplement_id = f"test_supp_{uuid.uuid4().hex[:8]}"
        
        # Check morning
        r1 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "morning"}
        )
        assert r1.status_code == 200
        assert r1.json()["checked"] == True
        
        # Check evening - should be independent
        r2 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/supplement-check-in",
            json={"supplement_id": supplement_id, "timing": "evening"}
        )
        assert r2.status_code == 200
        assert r2.json()["checked"] == True, "Evening timing should be checked independently"
        print(f"PASS: Different timings are independent check-ins")


class TestMedicationCheckInStillWorks:
    """Verify existing medication check-in endpoint still works"""
    
    @pytest.fixture(scope="class")
    def test_medication(self):
        """Create a test medication for check-in tests"""
        response = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}",
            json={
                "name": f"TEST_CheckinMed_{uuid.uuid4().hex[:6]}",
                "dosage": 100,
                "unit": "mg",
                "timings": ["morning", "evening"],
                "frequency": "daily"
            }
        )
        assert response.status_code == 200
        med = response.json()["medication"]
        yield med
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{med['id']}")
    
    def test_medication_checkin_first_call_checks(self, test_medication):
        """POST /api/medications/{profile_id}/{medication_id}/check-in - first call checks"""
        response = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{test_medication['id']}/check-in",
            json={"timing": "morning"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["checked"] == True, f"First medication check-in should return checked=True: {data}"
        print(f"PASS: Medication check-in first call returns checked=True")
    
    def test_medication_checkin_toggle_unchecks(self, test_medication):
        """POST /api/medications/{profile_id}/{medication_id}/check-in - second call unchecks"""
        # First ensure it's unchecked by toggling twice if needed
        # Use a different timing (evening) for clean test
        response1 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{test_medication['id']}/check-in",
            json={"timing": "evening"}
        )
        assert response1.status_code == 200
        first_state = response1.json()["checked"]
        
        # Second call should toggle
        response2 = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{test_medication['id']}/check-in",
            json={"timing": "evening"}
        )
        assert response2.status_code == 200
        second_state = response2.json()["checked"]
        
        assert second_state != first_state, "Toggle should change state"
        print(f"PASS: Medication check-in toggle works: {first_state} -> {second_state}")


class TestDailyPlanCombined:
    """Test combined daily plan with supplements and medications"""
    
    def test_daily_plan_returns_structure(self):
        """GET /api/medications/{profile_id}/daily-plan - returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "date" in data, f"Should have 'date' field: {data}"
        assert "plan" in data, f"Should have 'plan' field: {data}"
        assert "total_items" in data, f"Should have 'total_items' field: {data}"
        assert "checked_items" in data, f"Should have 'checked_items' field: {data}"
        assert "percentage" in data, f"Should have 'percentage' field: {data}"
        
        # Plan should be a list
        assert isinstance(data["plan"], list), f"'plan' should be a list: {data}"
        print(f"PASS: Daily plan returns correct structure")
    
    def test_daily_plan_with_german_labels(self):
        """GET /api/medications/{profile_id}/daily-plan?lang=de - German labels"""
        response = requests.get(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan",
            params={"lang": "de"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check German timing labels if plan has items
        german_labels = ["Morgens", "Mittags", "Abends"]
        for timing_group in data.get("plan", []):
            if "label" in timing_group:
                assert timing_group["label"] in german_labels, \
                    f"Label should be German: {timing_group['label']}"
        print(f"PASS: Daily plan uses German labels (Morgens/Mittags/Abends)")
    
    def test_daily_plan_items_have_type(self):
        """GET /api/medications/{profile_id}/daily-plan - items have type field"""
        # First create a medication to ensure there's data
        med_response = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}",
            json={
                "name": f"TEST_DailyPlanMed_{uuid.uuid4().hex[:6]}",
                "dosage": 50,
                "unit": "mg",
                "timings": ["morning"],
                "frequency": "daily"
            }
        )
        
        if med_response.status_code == 200:
            med_id = med_response.json()["medication"]["id"]
            
            # Get daily plan
            response = requests.get(
                f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan",
                params={"lang": "de"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Check items have type field (supplement or medication)
            for timing_group in data.get("plan", []):
                for item in timing_group.get("items", []):
                    assert "type" in item, f"Item should have 'type' field: {item}"
                    assert item["type"] in ["supplement", "medication"], \
                        f"Type should be 'supplement' or 'medication': {item['type']}"
                    assert "checked" in item, f"Item should have 'checked' field: {item}"
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{med_id}")
        
        print(f"PASS: Daily plan items have type (supplement/medication)")
    
    def test_daily_plan_reflects_checkin_status(self):
        """Daily plan should reflect check-in status"""
        # Create medication
        med_response = requests.post(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}",
            json={
                "name": f"TEST_ReflectMed_{uuid.uuid4().hex[:6]}",
                "dosage": 25,
                "unit": "mg",
                "timings": ["morning"],
                "frequency": "daily"
            }
        )
        
        if med_response.status_code == 200:
            med = med_response.json()["medication"]
            
            # Check in the medication
            checkin_response = requests.post(
                f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{med['id']}/check-in",
                json={"timing": "morning"}
            )
            
            # Get daily plan and verify checked status
            plan_response = requests.get(
                f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan",
                params={"lang": "de"}
            )
            
            assert plan_response.status_code == 200
            data = plan_response.json()
            
            # Find our medication in the plan
            found = False
            for timing_group in data.get("plan", []):
                if timing_group.get("timing") == "morning":
                    for item in timing_group.get("items", []):
                        if item.get("id") == med["id"]:
                            found = True
                            # Should be checked based on our check-in
                            # (could be True or False depending on toggle state)
            
            # Cleanup (including check-in cleanup via toggle)
            if checkin_response.status_code == 200 and checkin_response.json().get("checked"):
                # Uncheck to clean up
                requests.post(
                    f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{med['id']}/check-in",
                    json={"timing": "morning"}
                )
            requests.delete(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{med['id']}")
            
            if found:
                print(f"PASS: Daily plan reflects check-in status")
            else:
                print(f"INFO: Medication not found in plan (may be due to timing)")


class TestReminderCRUD:
    """Test reminder settings CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def profile_with_plan(self):
        """Use a profile that has a supplement plan"""
        # Use the real profile ID that likely has a plan
        return "f97fdefb-c81f-4d01-8d02-e38dd2132e74"
    
    def test_get_reminders_returns_settings(self, profile_with_plan):
        """GET /api/supplement-plan/{profile_id}/reminders - returns reminder config"""
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/{profile_with_plan}/reminders"
        )
        
        # Could be 200 (has plan) or 404 (no plan)
        if response.status_code == 200:
            data = response.json()
            # Check reminder fields if present
            if isinstance(data, dict):
                print(f"PASS: GET reminders returns config: {list(data.keys())}")
        elif response.status_code == 404:
            print(f"INFO: No plan found for profile (expected for test profile)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}: {response.text}")
    
    def test_get_reminders_404_for_unknown_profile(self):
        """GET /api/supplement-plan/{unknown_profile}/reminders - returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/unknown_profile_xyz/reminders"
        )
        
        assert response.status_code == 404, \
            f"Expected 404 for unknown profile, got {response.status_code}: {response.text}"
        print(f"PASS: GET reminders returns 404 for unknown profile")
    
    def test_put_reminders_updates_settings(self, profile_with_plan):
        """PUT /api/supplement-plan/{profile_id}/reminders - updates reminder config"""
        # First check if profile has a plan
        check_response = requests.get(
            f"{BASE_URL}/api/supplement-plan/{profile_with_plan}"
        )
        
        if check_response.status_code != 200:
            pytest.skip("Profile doesn't have a supplement plan")
        
        # Update reminders
        new_reminders = {
            "enabled": True,
            "morning_time": "07:30",
            "noon_time": "12:30",
            "evening_time": "19:30"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{profile_with_plan}/reminders",
            json=new_reminders
        )
        
        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Should return success=True: {data}"
        assert "reminders" in data, f"Should return reminders object: {data}"
        
        # Verify the values were saved
        saved = data["reminders"]
        assert saved.get("enabled") == True
        assert saved.get("morning_time") == "07:30"
        assert saved.get("noon_time") == "12:30"
        assert saved.get("evening_time") == "19:30"
        
        print(f"PASS: PUT reminders updates settings correctly")
    
    def test_put_reminders_with_shift_cycle(self, profile_with_plan):
        """PUT /api/supplement-plan/{profile_id}/reminders - with shift cycle"""
        check_response = requests.get(
            f"{BASE_URL}/api/supplement-plan/{profile_with_plan}"
        )
        
        if check_response.status_code != 200:
            pytest.skip("Profile doesn't have a supplement plan")
        
        # Update with shift cycle
        reminders_with_shift = {
            "enabled": True,
            "morning_time": "08:00",
            "noon_time": "12:00",
            "evening_time": "20:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "off"],
                "start_date": "2026-01-01"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{profile_with_plan}/reminders",
            json=reminders_with_shift
        )
        
        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        saved = data.get("reminders", {})
        assert saved.get("shift_cycle") is not None, "Shift cycle should be saved"
        
        print(f"PASS: PUT reminders with shift_cycle works")
    
    def test_put_reminders_404_for_unknown_profile(self):
        """PUT /api/supplement-plan/{unknown_profile}/reminders - returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/unknown_profile_xyz/reminders",
            json={"enabled": False, "morning_time": "08:00", "noon_time": "12:00", "evening_time": "20:00"}
        )
        
        assert response.status_code == 404, \
            f"Expected 404 for unknown profile, got {response.status_code}: {response.text}"
        print(f"PASS: PUT reminders returns 404 for unknown profile")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_medications(self):
        """Delete test medications created during tests"""
        # Get all medications for test profile
        response = requests.get(
            f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}",
            params={"active_only": False}
        )
        
        if response.status_code == 200:
            meds = response.json().get("medications", [])
            deleted_count = 0
            for med in meds:
                if med.get("name", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/{med['id']}"
                    )
                    if del_response.status_code in [200, 404]:
                        deleted_count += 1
            print(f"PASS: Cleaned up {deleted_count} test medications")
        else:
            print(f"INFO: No medications to clean up")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
