"""
VERO Water Reminders API Tests - VitaGuide Health Coach App
Tests the new water reminder feature with interval-based settings.

Endpoints tested:
- GET /api/water-tracking/{profile_id}/water-reminders - Get water reminder settings
- PUT /api/water-tracking/{profile_id}/water-reminders - Update water reminder settings

Test scenarios:
1. GET returns default settings when no settings exist
2. PUT saves settings correctly with various configurations
3. GET returns saved settings after PUT
4. Data validation for interval_hours, start_time, end_time
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test profile ID for water reminders testing
TEST_PROFILE_ID = "test-water-123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestWaterRemindersGetDefault:
    """Tests for GET /api/water-tracking/{profile_id}/water-reminders - Default behavior"""
    
    def test_get_default_settings_new_profile(self, api_client):
        """GET returns default settings when no settings exist for a new profile"""
        # Use a unique profile ID that won't have existing settings
        unique_profile = f"test-new-profile-{uuid.uuid4().hex[:8]}"
        
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{unique_profile}/water-reminders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate default values
        assert data.get("enabled") == False, "Default 'enabled' should be False"
        assert data.get("interval_hours") == 2, f"Default 'interval_hours' should be 2, got {data.get('interval_hours')}"
        assert data.get("start_time") == "08:00", f"Default 'start_time' should be '08:00', got {data.get('start_time')}"
        assert data.get("end_time") == "22:00", f"Default 'end_time' should be '22:00', got {data.get('end_time')}"
        
        print(f"Default settings for new profile: {data}")
    
    def test_get_settings_returns_correct_structure(self, api_client):
        """GET returns all required fields in response"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders")
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate structure - all fields must exist
        assert "enabled" in data, "Missing 'enabled' field"
        assert "interval_hours" in data, "Missing 'interval_hours' field"
        assert "start_time" in data, "Missing 'start_time' field"
        assert "end_time" in data, "Missing 'end_time' field"
        
        # Validate data types
        assert isinstance(data["enabled"], bool), f"'enabled' should be bool, got {type(data['enabled'])}"
        assert isinstance(data["interval_hours"], int), f"'interval_hours' should be int, got {type(data['interval_hours'])}"
        assert isinstance(data["start_time"], str), f"'start_time' should be str, got {type(data['start_time'])}"
        assert isinstance(data["end_time"], str), f"'end_time' should be str, got {type(data['end_time'])}"
        
        print(f"Settings structure validated: {data}")


class TestWaterRemindersPutSettings:
    """Tests for PUT /api/water-tracking/{profile_id}/water-reminders"""
    
    def test_put_enable_with_1h_interval(self, api_client):
        """PUT with enabled=true, interval_hours=1, start_time=09:00, end_time=21:00 saves correctly"""
        settings = {
            "enabled": True,
            "interval_hours": 1,
            "start_time": "09:00",
            "end_time": "21:00"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json=settings
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate returned data matches input
        assert data.get("enabled") == True, f"Expected enabled=True, got {data.get('enabled')}"
        assert data.get("interval_hours") == 1, f"Expected interval_hours=1, got {data.get('interval_hours')}"
        assert data.get("start_time") == "09:00", f"Expected start_time='09:00', got {data.get('start_time')}"
        assert data.get("end_time") == "21:00", f"Expected end_time='21:00', got {data.get('end_time')}"
        assert data.get("profile_id") == TEST_PROFILE_ID, f"Expected profile_id={TEST_PROFILE_ID}"
        
        # Should have updated_at timestamp
        assert "updated_at" in data, "Response should include 'updated_at' timestamp"
        
        print(f"Saved 1h interval settings: {data}")
    
    def test_put_enable_with_2h_interval(self, api_client):
        """PUT with enabled=true, interval_hours=2 saves correctly"""
        settings = {
            "enabled": True,
            "interval_hours": 2,
            "start_time": "08:00",
            "end_time": "22:00"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json=settings
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("enabled") == True
        assert data.get("interval_hours") == 2
        
        print(f"Saved 2h interval settings: {data}")
    
    def test_put_enable_with_3h_interval(self, api_client):
        """PUT with enabled=true, interval_hours=3 saves correctly"""
        settings = {
            "enabled": True,
            "interval_hours": 3,
            "start_time": "07:00",
            "end_time": "23:00"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json=settings
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("enabled") == True
        assert data.get("interval_hours") == 3
        assert data.get("start_time") == "07:00"
        assert data.get("end_time") == "23:00"
        
        print(f"Saved 3h interval settings: {data}")
    
    def test_put_disable_reminders(self, api_client):
        """PUT with enabled=false cancels/disables reminders"""
        settings = {
            "enabled": False,
            "interval_hours": 2,
            "start_time": "08:00",
            "end_time": "22:00"
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json=settings
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("enabled") == False, f"Expected enabled=False, got {data.get('enabled')}"
        
        print(f"Disabled reminders: enabled={data.get('enabled')}")


class TestWaterRemindersGetAfterPut:
    """Tests for verifying GET returns saved settings after PUT"""
    
    def test_get_returns_saved_settings(self, api_client):
        """GET returns the exact settings that were saved via PUT"""
        # First, save specific settings
        settings_to_save = {
            "enabled": True,
            "interval_hours": 1,
            "start_time": "06:30",
            "end_time": "20:30"
        }
        
        put_response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json=settings_to_save
        )
        assert put_response.status_code == 200
        
        # Now GET and verify
        get_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders")
        
        assert get_response.status_code == 200
        
        data = get_response.json()
        
        # Verify saved settings are returned
        assert data.get("enabled") == True, f"Expected enabled=True, got {data.get('enabled')}"
        assert data.get("interval_hours") == 1, f"Expected interval_hours=1, got {data.get('interval_hours')}"
        assert data.get("start_time") == "06:30", f"Expected start_time='06:30', got {data.get('start_time')}"
        assert data.get("end_time") == "20:30", f"Expected end_time='20:30', got {data.get('end_time')}"
        
        print(f"GET verified saved settings: enabled={data['enabled']}, interval={data['interval_hours']}h, {data['start_time']}-{data['end_time']}")
    
    def test_settings_persist_after_toggle(self, api_client):
        """Settings persist correctly when toggling enabled on/off"""
        # Save with enabled=True
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json={"enabled": True, "interval_hours": 3, "start_time": "10:00", "end_time": "18:00"}
        )
        
        # Toggle to disabled
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json={"enabled": False, "interval_hours": 3, "start_time": "10:00", "end_time": "18:00"}
        )
        
        # GET and verify other settings persisted
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders")
        data = response.json()
        
        assert data.get("enabled") == False
        assert data.get("interval_hours") == 3, "interval_hours should persist after toggle"
        assert data.get("start_time") == "10:00", "start_time should persist after toggle"
        assert data.get("end_time") == "18:00", "end_time should persist after toggle"
        
        print(f"Settings persisted after toggle: {data}")


class TestWaterRemindersEdgeCases:
    """Edge case and validation tests"""
    
    def test_put_minimal_payload(self, api_client):
        """PUT with only required field (enabled) should use defaults for others"""
        # Note: Based on Pydantic model, all fields have defaults
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json={"enabled": True}
        )
        
        # Should not error even with minimal payload
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("enabled") == True
        # Default values should be applied
        assert data.get("interval_hours") == 2, "Should use default interval_hours=2"
        assert data.get("start_time") == "08:00", "Should use default start_time"
        assert data.get("end_time") == "22:00", "Should use default end_time"
        
        print(f"Minimal payload handled correctly: {data}")
    
    def test_put_custom_time_format(self, api_client):
        """PUT with various time formats"""
        settings = {
            "enabled": True,
            "interval_hours": 2,
            "start_time": "05:00",  # Early morning
            "end_time": "23:59"     # Near midnight
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json=settings
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("start_time") == "05:00"
        assert data.get("end_time") == "23:59"
        
        print(f"Custom time format accepted: {data['start_time']} - {data['end_time']}")


class TestWaterRemindersIntegration:
    """Integration tests for complete workflow"""
    
    def test_full_reminder_workflow(self, api_client):
        """Test complete workflow: check defaults -> enable -> verify -> disable -> verify"""
        test_profile = f"integration-test-{uuid.uuid4().hex[:8]}"
        
        # 1. Check defaults for new profile
        default_response = api_client.get(f"{BASE_URL}/api/water-tracking/{test_profile}/water-reminders")
        assert default_response.status_code == 200
        default_data = default_response.json()
        assert default_data.get("enabled") == False, "New profile should have reminders disabled"
        print(f"Step 1 - Defaults: enabled={default_data['enabled']}")
        
        # 2. Enable with custom settings
        enable_response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{test_profile}/water-reminders",
            json={"enabled": True, "interval_hours": 1, "start_time": "09:00", "end_time": "21:00"}
        )
        assert enable_response.status_code == 200
        enable_data = enable_response.json()
        assert enable_data.get("enabled") == True
        print(f"Step 2 - Enabled: {enable_data}")
        
        # 3. Verify settings persisted
        verify_response = api_client.get(f"{BASE_URL}/api/water-tracking/{test_profile}/water-reminders")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("enabled") == True
        assert verify_data.get("interval_hours") == 1
        assert verify_data.get("start_time") == "09:00"
        assert verify_data.get("end_time") == "21:00"
        print(f"Step 3 - Verified: {verify_data}")
        
        # 4. Disable reminders
        disable_response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{test_profile}/water-reminders",
            json={"enabled": False, "interval_hours": 1, "start_time": "09:00", "end_time": "21:00"}
        )
        assert disable_response.status_code == 200
        disable_data = disable_response.json()
        assert disable_data.get("enabled") == False
        print(f"Step 4 - Disabled: enabled={disable_data['enabled']}")
        
        # 5. Final verification
        final_response = api_client.get(f"{BASE_URL}/api/water-tracking/{test_profile}/water-reminders")
        assert final_response.status_code == 200
        final_data = final_response.json()
        assert final_data.get("enabled") == False
        print(f"Step 5 - Final state: enabled={final_data['enabled']}")
        
        print("Full workflow completed successfully!")


# Cleanup after tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data(api_client):
    """Reset test profile settings after all tests"""
    yield
    # Reset to defaults after tests
    try:
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders",
            json={"enabled": False, "interval_hours": 2, "start_time": "08:00", "end_time": "22:00"}
        )
    except:
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
