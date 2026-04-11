"""
Test suite for Iteration 78 - Three new features:
1. Medication Reminders with Push Notifications (VERO-branded)
2. Medication Progress Tracking in Progress Screen
3. Water History Visualization in Progress Screen
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stress-relief-app-11.preview.emergentagent.com').rstrip('/')
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestMedicationReminders:
    """Test medication reminder endpoints (GET/PUT /{profile_id}/reminders)"""
    
    def test_get_medication_reminders_default(self):
        """GET /api/medications/{profile_id}/reminders - Returns default settings for new profile"""
        response = requests.get(f"{BASE_URL}/api/medications/TEST_new_profile_reminders/reminders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Response should have 'enabled' field"
        assert "morning_time" in data, "Response should have 'morning_time' field"
        assert "noon_time" in data, "Response should have 'noon_time' field"
        assert "evening_time" in data, "Response should have 'evening_time' field"
        
        # Default values
        assert data["enabled"] == False, "Default enabled should be False"
        assert data["morning_time"] == "08:00", "Default morning_time should be 08:00"
        assert data["noon_time"] == "12:00", "Default noon_time should be 12:00"
        assert data["evening_time"] == "20:00", "Default evening_time should be 20:00"
        print("PASS: GET reminders returns correct default values")
    
    def test_get_medication_reminders_existing_profile(self):
        """GET /api/medications/{profile_id}/reminders - Returns settings for existing profile"""
        response = requests.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/reminders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data
        assert "morning_time" in data
        assert "noon_time" in data
        assert "evening_time" in data
        print(f"PASS: GET reminders for existing profile - enabled={data['enabled']}")
    
    def test_update_medication_reminders_enable(self):
        """PUT /api/medications/{profile_id}/reminders - Enable reminders with custom times"""
        payload = {
            "enabled": True,
            "morning_time": "07:30",
            "noon_time": "12:30",
            "evening_time": "21:00"
        }
        response = requests.put(
            f"{BASE_URL}/api/medications/TEST_reminder_update/reminders",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["enabled"] == True, "Enabled should be True"
        assert data["morning_time"] == "07:30", "Morning time should be updated"
        assert data["noon_time"] == "12:30", "Noon time should be updated"
        assert data["evening_time"] == "21:00", "Evening time should be updated"
        print("PASS: PUT reminders enables and updates times correctly")
    
    def test_update_medication_reminders_disable(self):
        """PUT /api/medications/{profile_id}/reminders - Disable reminders"""
        payload = {
            "enabled": False,
            "morning_time": "08:00",
            "noon_time": "12:00",
            "evening_time": "20:00"
        }
        response = requests.put(
            f"{BASE_URL}/api/medications/TEST_reminder_update/reminders",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["enabled"] == False, "Enabled should be False"
        print("PASS: PUT reminders disables correctly")
    
    def test_update_reminders_persistence(self):
        """Verify reminder settings persist after update"""
        # First update
        payload = {
            "enabled": True,
            "morning_time": "06:00",
            "noon_time": "13:00",
            "evening_time": "22:00"
        }
        put_response = requests.put(
            f"{BASE_URL}/api/medications/TEST_reminder_persist/reminders",
            json=payload
        )
        assert put_response.status_code == 200
        
        # Then GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/medications/TEST_reminder_persist/reminders")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data["enabled"] == True, "Enabled should persist"
        assert data["morning_time"] == "06:00", "Morning time should persist"
        assert data["noon_time"] == "13:00", "Noon time should persist"
        assert data["evening_time"] == "22:00", "Evening time should persist"
        print("PASS: Reminder settings persist correctly after update")


class TestMedicationStats:
    """Test medication statistics endpoint (GET /{profile_id}/stats)"""
    
    def test_get_medication_stats_default_days(self):
        """GET /api/medications/{profile_id}/stats - Returns 7-day stats by default"""
        response = requests.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "period_days" in data, "Response should have 'period_days'"
        assert "daily" in data, "Response should have 'daily' array"
        assert "total_expected" in data, "Response should have 'total_expected'"
        assert "total_taken" in data, "Response should have 'total_taken'"
        assert "adherence_pct" in data, "Response should have 'adherence_pct'"
        
        assert data["period_days"] == 7, "Default period should be 7 days"
        assert isinstance(data["daily"], list), "daily should be a list"
        assert len(data["daily"]) == 7, "Should have 7 daily entries"
        print(f"PASS: GET stats returns 7-day data - adherence={data['adherence_pct']}%")
    
    def test_get_medication_stats_custom_days(self):
        """GET /api/medications/{profile_id}/stats?days=14 - Returns custom period stats"""
        response = requests.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/stats?days=14")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period_days"] == 14, "Period should be 14 days"
        assert len(data["daily"]) == 14, "Should have 14 daily entries"
        print("PASS: GET stats with custom days parameter works")
    
    def test_medication_stats_daily_structure(self):
        """Verify daily stats structure has required fields"""
        response = requests.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/stats?days=7")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["daily"]) > 0:
            day = data["daily"][0]
            assert "date" in day, "Daily entry should have 'date'"
            assert "expected" in day, "Daily entry should have 'expected'"
            assert "taken" in day, "Daily entry should have 'taken'"
            assert "percentage" in day, "Daily entry should have 'percentage'"
            print(f"PASS: Daily stats structure correct - sample: {day}")
        else:
            print("PASS: Daily stats structure verified (empty array)")
    
    def test_medication_stats_new_profile(self):
        """GET /api/medications/{new_profile}/stats - Returns zeros for profile without medications"""
        response = requests.get(f"{BASE_URL}/api/medications/TEST_no_meds_profile/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["total_expected"] == 0, "New profile should have 0 expected"
        assert data["total_taken"] == 0, "New profile should have 0 taken"
        assert data["adherence_pct"] == 0, "New profile should have 0% adherence"
        print("PASS: Stats for profile without medications returns zeros")


class TestWaterHistory:
    """Test water history endpoint (GET /{profile_id}/history)"""
    
    def test_get_water_history_week(self):
        """GET /api/water-tracking/{profile_id}/history?period=week - Returns weekly history"""
        response = requests.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=week")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "period" in data, "Response should have 'period'"
        assert "daily_goal_ml" in data, "Response should have 'daily_goal_ml'"
        assert "days" in data, "Response should have 'days' array"
        assert "days_with_data" in data, "Response should have 'days_with_data'"
        assert "days_goal_reached" in data, "Response should have 'days_goal_reached'"
        assert "average_ml" in data, "Response should have 'average_ml'"
        
        assert data["period"] == "week", "Period should be 'week'"
        assert isinstance(data["days"], list), "days should be a list"
        print(f"PASS: GET water history week - days_with_data={data['days_with_data']}, avg={data['average_ml']}ml")
    
    def test_get_water_history_month(self):
        """GET /api/water-tracking/{profile_id}/history?period=month - Returns monthly history"""
        response = requests.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=month")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["period"] == "month", "Period should be 'month'"
        print(f"PASS: GET water history month - days_with_data={data['days_with_data']}")
    
    def test_water_history_days_structure(self):
        """Verify days array structure has required fields"""
        response = requests.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=week")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["days"]) > 0:
            day = data["days"][0]
            assert "date" in day, "Day entry should have 'date'"
            assert "total_ml" in day, "Day entry should have 'total_ml'"
            print(f"PASS: Water history days structure correct - sample: {day}")
        else:
            print("PASS: Water history days structure verified (empty array)")
    
    def test_water_history_new_profile(self):
        """GET /api/water-tracking/{new_profile}/history - Returns empty for new profile"""
        response = requests.get(f"{BASE_URL}/api/water-tracking/TEST_no_water_profile/history?period=week")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["days_with_data"] == 0, "New profile should have 0 days with data"
        assert data["average_ml"] == 0, "New profile should have 0 average"
        print("PASS: Water history for new profile returns zeros")


class TestMedicationCRUDForReminders:
    """Test medication CRUD to ensure reminders work with medications"""
    
    def test_create_medication_for_reminder_test(self):
        """POST /api/medications/{profile_id} - Create test medication"""
        payload = {
            "name": "TEST_ReminderMed",
            "dosage": 100,
            "unit": "mg",
            "timings": ["morning", "evening"],
            "frequency": "daily"
        }
        response = requests.post(
            f"{BASE_URL}/api/medications/TEST_reminder_med_profile",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "medication" in data, "Response should have 'medication'"
        assert data["medication"]["name"] == "TEST_ReminderMed"
        assert data["medication"]["timings"] == ["morning", "evening"]
        print("PASS: Created test medication for reminder testing")
    
    def test_list_medications_for_reminder_profile(self):
        """GET /api/medications/{profile_id} - List medications"""
        response = requests.get(f"{BASE_URL}/api/medications/TEST_reminder_med_profile")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "medications" in data, "Response should have 'medications'"
        assert isinstance(data["medications"], list)
        print(f"PASS: Listed medications - count={len(data['medications'])}")


class TestRouteOrdering:
    """Test that reminder routes work correctly (not conflicting with /{medication_id} routes)"""
    
    def test_reminders_route_not_confused_with_medication_id(self):
        """Ensure /reminders is not interpreted as a medication_id"""
        # This should return reminder settings, not 404 for medication
        response = requests.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/reminders")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have reminder fields, not medication fields
        assert "enabled" in data, "Should return reminder settings, not medication"
        assert "morning_time" in data, "Should return reminder settings"
        print("PASS: /reminders route correctly handled (not confused with medication_id)")
    
    def test_stats_route_not_confused_with_medication_id(self):
        """Ensure /stats is not interpreted as a medication_id"""
        response = requests.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have stats fields, not medication fields
        assert "period_days" in data, "Should return stats, not medication"
        assert "daily" in data, "Should return stats"
        print("PASS: /stats route correctly handled (not confused with medication_id)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
