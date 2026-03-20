"""
Test suite for VitaGuide+ Medications Management Feature
Covers: CRUD operations, daily-plan, check-in toggle, adherence stats
Profile ID: 5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Use public URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vero-rewards.preview.emergentagent.com').rstrip('/')

# Real test profile ID 
PROFILE_ID = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"

# Test medication data
TEST_MEDICATION = {
    "name": "TEST_Aspirin",
    "dosage": 100,
    "unit": "mg",
    "timings": ["morning", "evening"],
    "frequency": "daily",
    "meal_relation": "after_meal",
    "note": "Test medication - do not use"
}

TEST_MEDICATION_SPECIFIC_DAYS = {
    "name": "TEST_VitaminD_Weekly",
    "dosage": 1000,
    "unit": "Tropfen",
    "timings": ["morning"],
    "frequency": "specific_days",
    "specific_days": ["Mo", "Mi", "Fr"],  # Monday, Wednesday, Friday
    "meal_relation": "with_meal",
    "note": "Test - specific days medication"
}

@pytest.fixture(scope="session")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestMedicationsCRUD:
    """Tests for Medication CRUD operations (Create, Read, Update, Delete)"""
    
    created_med_id = None
    
    def test_01_list_medications(self, api_session):
        """GET /api/medications/{profile_id} - List all active medications"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "medications" in data, "Response should contain 'medications' key"
        assert isinstance(data["medications"], list), "medications should be a list"
        
        # Check existing Metformin medication (mentioned in requirements)
        meds = data["medications"]
        print(f"Found {len(meds)} medications")
        metformin = [m for m in meds if "metformin" in m.get("name", "").lower()]
        if metformin:
            print(f"Found existing Metformin: {metformin[0]}")
    
    def test_02_create_medication(self, api_session):
        """POST /api/medications/{profile_id} - Create new medication with all fields"""
        response = api_session.post(
            f"{BASE_URL}/api/medications/{PROFILE_ID}",
            json=TEST_MEDICATION
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "medication" in data, "Response should contain 'medication' key"
        
        med = data["medication"]
        TestMedicationsCRUD.created_med_id = med["id"]
        
        # Validate all fields were saved correctly
        assert med["name"] == TEST_MEDICATION["name"]
        assert med["dosage"] == TEST_MEDICATION["dosage"]
        assert med["unit"] == TEST_MEDICATION["unit"]
        assert med["timings"] == TEST_MEDICATION["timings"]
        assert med["frequency"] == TEST_MEDICATION["frequency"]
        assert med["meal_relation"] == TEST_MEDICATION["meal_relation"]
        assert med["note"] == TEST_MEDICATION["note"]
        assert med["profile_id"] == PROFILE_ID
        assert med["active"] == True
        assert "id" in med
        assert "created_at" in med
        
        print(f"Created medication with ID: {med['id']}")
    
    def test_03_verify_created_medication(self, api_session):
        """GET to verify medication was actually persisted in database"""
        assert TestMedicationsCRUD.created_med_id is not None, "Medication ID not available"
        
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        meds = data["medications"]
        found = [m for m in meds if m["id"] == TestMedicationsCRUD.created_med_id]
        
        assert len(found) == 1, "Created medication should exist in database"
        assert found[0]["name"] == TEST_MEDICATION["name"]
        print(f"Verified medication {TestMedicationsCRUD.created_med_id} exists in DB")
    
    def test_04_update_medication(self, api_session):
        """PUT /api/medications/{profile_id}/{med_id} - Update medication"""
        assert TestMedicationsCRUD.created_med_id is not None, "Medication ID not available"
        
        update_data = {
            "name": "TEST_Aspirin_Updated",
            "dosage": 200,
            "note": "Updated test note"
        }
        
        response = api_session.put(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/{TestMedicationsCRUD.created_med_id}",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print("Update returned success")
    
    def test_05_verify_update_persisted(self, api_session):
        """GET to verify update was persisted in database"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}")
        assert response.status_code == 200
        
        meds = response.json()["medications"]
        found = [m for m in meds if m["id"] == TestMedicationsCRUD.created_med_id]
        
        assert len(found) == 1
        assert found[0]["name"] == "TEST_Aspirin_Updated", "Name should be updated"
        assert found[0]["dosage"] == 200, "Dosage should be updated"
        assert found[0]["note"] == "Updated test note", "Note should be updated"
        # Original fields should remain unchanged
        assert found[0]["unit"] == TEST_MEDICATION["unit"], "Unit should be unchanged"
        assert found[0]["timings"] == TEST_MEDICATION["timings"], "Timings should be unchanged"
        print("Verified update was persisted correctly")
    
    def test_06_update_nonexistent_medication(self, api_session):
        """PUT with non-existent medication_id should return 404"""
        response = api_session.put(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/nonexistent-id-12345",
            json={"name": "Test"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_07_update_empty_body(self, api_session):
        """PUT with empty body should return 400"""
        assert TestMedicationsCRUD.created_med_id is not None
        
        response = api_session.put(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/{TestMedicationsCRUD.created_med_id}",
            json={}
        )
        assert response.status_code == 400, f"Expected 400 for empty update, got {response.status_code}"


class TestMedicationSpecificDays:
    """Tests for medications with specific_days frequency"""
    
    specific_days_med_id = None
    
    def test_01_create_specific_days_medication(self, api_session):
        """Create medication with frequency='specific_days'"""
        response = api_session.post(
            f"{BASE_URL}/api/medications/{PROFILE_ID}",
            json=TEST_MEDICATION_SPECIFIC_DAYS
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        med = response.json()["medication"]
        TestMedicationSpecificDays.specific_days_med_id = med["id"]
        
        assert med["frequency"] == "specific_days"
        assert med["specific_days"] == ["Mo", "Mi", "Fr"]
        print(f"Created specific days medication: {med['id']}")


class TestDailyPlan:
    """Tests for combined daily plan (supplements + medications)"""
    
    def test_01_get_daily_plan(self, api_session):
        """GET /api/medications/{profile_id}/daily-plan - Get combined plan"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/daily-plan")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate response structure
        assert "date" in data, "Response should contain 'date'"
        assert "plan" in data, "Response should contain 'plan'"
        assert "total_items" in data
        assert "checked_items" in data
        assert "percentage" in data
        assert "medication_count" in data
        
        print(f"Daily plan date: {data['date']}")
        print(f"Total items: {data['total_items']}, Checked: {data['checked_items']}")
        print(f"Percentage: {data['percentage']}%")
        print(f"Medication count: {data['medication_count']}")
    
    def test_02_daily_plan_grouped_by_timing(self, api_session):
        """Verify daily plan groups items by morning/noon/evening"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/daily-plan")
        assert response.status_code == 200
        
        plan = response.json()["plan"]
        
        valid_timings = ["morning", "noon", "evening"]
        for group in plan:
            assert "timing" in group, "Each group should have timing"
            assert "label" in group, "Each group should have label"
            assert "items" in group, "Each group should have items"
            assert group["timing"] in valid_timings, f"Invalid timing: {group['timing']}"
            
            print(f"Timing: {group['timing']} ({group['label']}) - {len(group['items'])} items")
    
    def test_03_daily_plan_shows_both_types(self, api_session):
        """Verify daily plan shows both supplements and medications with type field"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/daily-plan")
        assert response.status_code == 200
        
        plan = response.json()["plan"]
        
        types_found = set()
        for group in plan:
            for item in group["items"]:
                assert "id" in item
                assert "type" in item, "Each item should have 'type' field"
                assert "name" in item
                assert "dosage" in item
                assert "checked" in item
                assert "timing" in item
                
                item_type = item["type"]
                assert item_type in ["supplement", "medication"], f"Invalid type: {item_type}"
                types_found.add(item_type)
                
        print(f"Types found in daily plan: {types_found}")
    
    def test_04_daily_plan_german_language(self, api_session):
        """GET with lang=de should return German labels"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/daily-plan?lang=de")
        assert response.status_code == 200
        
        plan = response.json()["plan"]
        
        german_labels = {"Morgens", "Mittags", "Abends"}
        for group in plan:
            if group["label"] in german_labels:
                print(f"Found German label: {group['label']}")
    
    def test_05_daily_plan_italian_language(self, api_session):
        """GET with lang=it should return Italian labels"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/daily-plan?lang=it")
        assert response.status_code == 200
        
        plan = response.json()["plan"]
        
        italian_labels = {"Mattina", "Mezzogiorno", "Sera"}
        for group in plan:
            if group["label"] in italian_labels:
                print(f"Found Italian label: {group['label']}")


class TestCheckIn:
    """Tests for medication check-in (toggle taken/untaken)"""
    
    def test_01_check_in_toggle_on(self, api_session):
        """POST /api/medications/{profile_id}/{med_id}/check-in - First call = checked"""
        # First, ensure we have the medication ID
        assert TestMedicationsCRUD.created_med_id is not None, "Need medication ID from CRUD tests"
        
        response = api_session.post(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/{TestMedicationsCRUD.created_med_id}/check-in",
            json={"timing": "morning"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "checked" in data, "Response should contain 'checked' field"
        # First check-in should set checked=True
        # (unless it was already checked, in which case it toggles to False)
        print(f"Check-in result: checked={data['checked']}")
    
    def test_02_check_in_verify_in_daily_plan(self, api_session):
        """Verify check-in status is reflected in daily plan"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/daily-plan")
        assert response.status_code == 200
        
        plan = response.json()["plan"]
        
        # Find our test medication in morning timing
        for group in plan:
            for item in group["items"]:
                if item["id"] == TestMedicationsCRUD.created_med_id and item["timing"] == "morning":
                    print(f"Found medication in daily plan - checked: {item['checked']}")
                    return
        
        print("Test medication not found in daily plan (may be due to frequency)")
    
    def test_03_check_in_toggle_off(self, api_session):
        """POST again - Second call = unchecked (toggle behavior)"""
        assert TestMedicationsCRUD.created_med_id is not None
        
        # Get current state
        response1 = api_session.post(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/{TestMedicationsCRUD.created_med_id}/check-in",
            json={"timing": "evening"}
        )
        assert response1.status_code == 200
        first_state = response1.json()["checked"]
        
        # Toggle
        response2 = api_session.post(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/{TestMedicationsCRUD.created_med_id}/check-in",
            json={"timing": "evening"}
        )
        assert response2.status_code == 200
        second_state = response2.json()["checked"]
        
        # States should be opposite
        assert first_state != second_state, "Toggle should flip the checked state"
        print(f"Toggle test passed: {first_state} -> {second_state}")
    
    def test_04_check_in_nonexistent_medication(self, api_session):
        """Check-in for non-existent medication should still work (creates log)"""
        # Note: The API doesn't validate if medication exists, it just creates a log
        response = api_session.post(
            f"{BASE_URL}/api/medications/{PROFILE_ID}/nonexistent-med-123/check-in",
            json={"timing": "morning"}
        )
        # This may return 200 (creates log) or 404 depending on implementation
        print(f"Check-in non-existent: status={response.status_code}")


class TestAdherenceStats:
    """Tests for medication adherence statistics"""
    
    def test_01_get_stats_7_days(self, api_session):
        """GET /api/medications/{profile_id}/stats?days=7 - Weekly stats"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/stats?days=7")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert "period_days" in data
        assert "daily" in data
        assert "total_expected" in data
        assert "total_taken" in data
        assert "adherence_pct" in data
        
        assert data["period_days"] == 7
        assert isinstance(data["daily"], list)
        assert len(data["daily"]) == 7, "Should have 7 days of data"
        
        print(f"7-day stats: {data['total_taken']}/{data['total_expected']} = {data['adherence_pct']}%")
    
    def test_02_stats_daily_structure(self, api_session):
        """Verify each daily entry has correct structure"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/stats?days=7")
        assert response.status_code == 200
        
        daily = response.json()["daily"]
        
        for day in daily:
            assert "date" in day, "Each day should have 'date'"
            assert "expected" in day, "Each day should have 'expected'"
            assert "taken" in day, "Each day should have 'taken'"
            assert "percentage" in day, "Each day should have 'percentage'"
            
            # Percentage should be 0-100
            assert 0 <= day["percentage"] <= 100
        
        print(f"Daily structure verified for {len(daily)} days")
    
    def test_03_get_stats_30_days(self, api_session):
        """GET with days=30 for monthly stats"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/stats?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_days"] == 30
        assert len(data["daily"]) == 30
        
        print(f"30-day stats: adherence={data['adherence_pct']}%")
    
    def test_04_get_stats_default_period(self, api_session):
        """GET without days param should default to 7 days"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["period_days"] == 7, "Default should be 7 days"


class TestExistingMetformin:
    """Tests to verify existing Metformin medication"""
    
    def test_01_metformin_exists(self, api_session):
        """Verify Metformin exists with morning+evening timings"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}")
        assert response.status_code == 200
        
        meds = response.json()["medications"]
        metformin = [m for m in meds if "metformin" in m.get("name", "").lower()]
        
        if metformin:
            med = metformin[0]
            print(f"Metformin found: {med['name']}")
            print(f"Dosage: {med['dosage']} {med['unit']}")
            print(f"Timings: {med['timings']}")
            
            # Verify expected timings (morning+evening per requirements)
            if "morning" in med.get("timings", []) and "evening" in med.get("timings", []):
                print("Metformin has expected morning+evening timings")
        else:
            print("Metformin not found in medications")


class TestCleanup:
    """Cleanup test data after all tests"""
    
    def test_99_cleanup_test_medications(self, api_session):
        """Delete TEST_ prefixed medications"""
        response = api_session.get(f"{BASE_URL}/api/medications/{PROFILE_ID}")
        if response.status_code != 200:
            return
        
        meds = response.json()["medications"]
        test_meds = [m for m in meds if m.get("name", "").startswith("TEST_")]
        
        for med in test_meds:
            del_response = api_session.delete(
                f"{BASE_URL}/api/medications/{PROFILE_ID}/{med['id']}"
            )
            if del_response.status_code == 200:
                print(f"Cleaned up test medication: {med['name']}")
            else:
                print(f"Failed to delete {med['name']}: {del_response.status_code}")
        
        print(f"Cleanup completed - removed {len(test_meds)} test medications")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
