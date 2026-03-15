"""
Water Tracking API Tests - VitaGuide+ Health App
Tests the new water tracking feature with the following endpoints:
- GET /api/water-tracking/{profile_id}/today - Get today's water data
- POST /api/water-tracking/{profile_id}/add - Add water intake
- GET /api/water-tracking/{profile_id}/history - Get history (week/month)
- GET /api/water-tracking/{profile_id}/goal - Get water goal
- PUT /api/water-tracking/{profile_id}/goal - Update water goal
- GET /api/water-tracking/{profile_id}/reminder - Get reminder settings
- PUT /api/water-tracking/{profile_id}/reminder - Update reminder settings
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://medication-tracker-10.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Test profile ID from health profiles
TEST_PROFILE_ID = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestWaterTrackingToday:
    """Tests for GET /api/water-tracking/{profile_id}/today endpoint"""
    
    def test_get_today_water_data_german(self, api_client):
        """Test getting today's water data with German language"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "date" in data, "Missing 'date' field"
        assert "total_ml" in data, "Missing 'total_ml' field"
        assert "daily_goal_ml" in data, "Missing 'daily_goal_ml' field"
        assert "percentage" in data, "Missing 'percentage' field"
        assert "remaining_ml" in data, "Missing 'remaining_ml' field"
        assert "entries" in data, "Missing 'entries' field"
        
        # Validate data types
        assert isinstance(data["total_ml"], int), "total_ml should be int"
        assert isinstance(data["daily_goal_ml"], int), "daily_goal_ml should be int"
        assert isinstance(data["percentage"], int), "percentage should be int"
        assert isinstance(data["remaining_ml"], int), "remaining_ml should be int"
        assert isinstance(data["entries"], list), "entries should be list"
        
        # Goal should be auto-calculated from profile (33ml * weight + adjustments)
        # Should be >= 2000ml for any reasonable weight
        assert data["daily_goal_ml"] >= 2000, f"Goal seems too low: {data['daily_goal_ml']}"
        
        print(f"Today's water data: {data['total_ml']}/{data['daily_goal_ml']} ml ({data['percentage']}%)")
        print(f"VERO message: {data.get('vero_message')}")
    
    def test_get_today_water_data_italian(self, api_client):
        """Test getting today's water data with Italian language"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=it")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have VERO message in Italian if applicable
        if data.get("vero_message"):
            vero = data["vero_message"]
            assert "text" in vero
            assert "mood" in vero
            print(f"Italian VERO message: {vero['text']}")


class TestWaterTrackingAdd:
    """Tests for POST /api/water-tracking/{profile_id}/add endpoint"""
    
    def test_add_200ml_water(self, api_client):
        """Test adding 200ml of water"""
        # Get initial state
        initial_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        initial_data = initial_response.json()
        initial_total = initial_data["total_ml"]
        
        # Add 200ml
        add_response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 200}
        )
        
        assert add_response.status_code == 200, f"Expected 200, got {add_response.status_code}: {add_response.text}"
        
        add_data = add_response.json()
        
        # Validate response structure
        assert "total_ml" in add_data
        assert "daily_goal_ml" in add_data
        assert "percentage" in add_data
        assert "remaining_ml" in add_data
        assert "added_ml" in add_data
        assert "feedback" in add_data
        assert "goal_reached" in add_data
        
        # Validate cumulative total
        assert add_data["added_ml"] == 200
        assert add_data["total_ml"] == initial_total + 200, f"Expected cumulative total {initial_total + 200}, got {add_data['total_ml']}"
        
        # Feedback should be in German
        assert isinstance(add_data["feedback"], str)
        assert len(add_data["feedback"]) > 0
        
        print(f"Added 200ml - New total: {add_data['total_ml']}ml, Feedback: {add_data['feedback']}")
    
    def test_add_500ml_water(self, api_client):
        """Test adding 500ml of water to verify cumulative total"""
        # Get current state
        before_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        before_total = before_response.json()["total_ml"]
        
        # Add 500ml
        add_response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 500}
        )
        
        assert add_response.status_code == 200
        add_data = add_response.json()
        
        # Verify cumulative
        assert add_data["total_ml"] == before_total + 500
        assert add_data["added_ml"] == 500
        
        print(f"Added 500ml - New total: {add_data['total_ml']}ml, Percentage: {add_data['percentage']}%")
    
    def test_add_water_negative_amount_validation(self, api_client):
        """Test that negative amounts are rejected with 400 error"""
        response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": -1}
        )
        
        assert response.status_code == 400, f"Expected 400 for negative amount, got {response.status_code}"
        print("Negative amount validation passed - returned 400")
    
    def test_add_water_zero_amount_validation(self, api_client):
        """Test that zero amounts are rejected with 400 error"""
        response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 0}
        )
        
        assert response.status_code == 400, f"Expected 400 for zero amount, got {response.status_code}"
        print("Zero amount validation passed - returned 400")
    
    def test_add_water_too_large_amount_validation(self, api_client):
        """Test that amounts > 5000ml are rejected with 400 error"""
        response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 5001}
        )
        
        assert response.status_code == 400, f"Expected 400 for amount > 5000, got {response.status_code}"
        print("Large amount validation passed - returned 400")


class TestWaterTrackingHistory:
    """Tests for GET /api/water-tracking/{profile_id}/history endpoint"""
    
    def test_get_weekly_history(self, api_client):
        """Test getting weekly water history"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=week")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate structure
        assert "period" in data
        assert "daily_goal_ml" in data
        assert "days" in data
        assert "days_with_data" in data
        assert "days_goal_reached" in data
        assert "average_ml" in data
        
        assert data["period"] == "week"
        assert isinstance(data["days"], list)
        assert isinstance(data["average_ml"], int)
        
        print(f"Weekly history: {data['days_with_data']} days with data, {data['days_goal_reached']} goals reached, avg: {data['average_ml']}ml")
    
    def test_get_monthly_history(self, api_client):
        """Test getting monthly water history"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=month")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "month"
        assert isinstance(data["days"], list)
        
        print(f"Monthly history: {data['days_with_data']} days with data, {data['days_goal_reached']} goals reached")


class TestWaterGoal:
    """Tests for GET/PUT /api/water-tracking/{profile_id}/goal endpoints"""
    
    def test_get_goal_auto_calculated(self, api_client):
        """Test getting the auto-calculated water goal"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "daily_goal_ml" in data
        assert "auto_calculated" in data
        
        # Goal should be reasonable (2000-5000ml for most adults)
        assert 1500 <= data["daily_goal_ml"] <= 6000, f"Goal {data['daily_goal_ml']} seems unreasonable"
        
        print(f"Goal: {data['daily_goal_ml']}ml, Auto-calculated: {data['auto_calculated']}")
    
    def test_update_goal_manually(self, api_client):
        """Test updating the water goal manually"""
        # Get original goal
        original_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal")
        original_goal = original_response.json()["daily_goal_ml"]
        
        # Update to 3000ml
        update_response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": 3000}
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        update_data = update_response.json()
        assert update_data["daily_goal_ml"] == 3000
        assert update_data["auto_calculated"] == False
        
        # Verify by GET
        verify_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal")
        verify_data = verify_response.json()
        assert verify_data["daily_goal_ml"] == 3000
        assert verify_data["auto_calculated"] == False
        
        # Restore original goal
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": original_goal}
        )
        
        print(f"Goal updated: {original_goal} -> 3000 -> restored to {original_goal}")
    
    def test_update_goal_too_low_validation(self, api_client):
        """Test that goal < 500ml is rejected"""
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": 400}
        )
        
        assert response.status_code == 400, f"Expected 400 for goal < 500, got {response.status_code}"
    
    def test_update_goal_too_high_validation(self, api_client):
        """Test that goal > 8000ml is rejected"""
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": 8500}
        )
        
        assert response.status_code == 400, f"Expected 400 for goal > 8000, got {response.status_code}"


class TestWaterReminder:
    """Tests for GET/PUT /api/water-tracking/{profile_id}/reminder endpoints"""
    
    def test_get_reminder_defaults(self, api_client):
        """Test getting default reminder settings"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data
        assert "times" in data
        assert isinstance(data["times"], list)
        
        print(f"Reminder settings: enabled={data['enabled']}, times={data['times']}")
    
    def test_update_reminder(self, api_client):
        """Test updating reminder settings"""
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder",
            json={"enabled": True, "times": ["09:00", "13:00"]}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["enabled"] == True
        assert data["times"] == ["09:00", "13:00"]
        
        # Verify by GET
        verify_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder")
        verify_data = verify_response.json()
        assert verify_data["enabled"] == True
        assert verify_data["times"] == ["09:00", "13:00"]
        
        # Reset to defaults
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder",
            json={"enabled": False, "times": ["08:00", "12:00", "16:00", "20:00"]}
        )
        
        print("Reminder update and verification passed")


class TestVeroMessages:
    """Tests for VERO mascot messages based on progress"""
    
    def test_vero_message_structure(self, api_client):
        """Test VERO message structure in response"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        data = response.json()
        
        if data.get("vero_message"):
            vero = data["vero_message"]
            assert "text" in vero, "VERO message should have 'text' field"
            assert "mood" in vero, "VERO message should have 'mood' field"
            assert vero["mood"] in ["greeting", "remind", "happy", "excited", "celebrate"], f"Unknown mood: {vero['mood']}"
            print(f"VERO message: '{vero['text']}' (mood: {vero['mood']})")
        else:
            print("No VERO message for current progress (may be normal mid-day with moderate progress)")


class TestWaterTrackingIntegration:
    """Integration tests for water tracking flow"""
    
    def test_full_water_tracking_flow(self, api_client):
        """Test complete flow: check today -> add water -> verify history updated"""
        # 1. Get today's data
        today_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        assert today_response.status_code == 200
        initial_total = today_response.json()["total_ml"]
        
        # 2. Add small amount
        add_response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 100}
        )
        assert add_response.status_code == 200
        assert add_response.json()["total_ml"] == initial_total + 100
        
        # 3. Get today again - verify persistence
        verify_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        assert verify_response.status_code == 200
        assert verify_response.json()["total_ml"] == initial_total + 100
        
        # 4. History should include today
        history_response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=week")
        assert history_response.status_code == 200
        assert history_response.json()["days_with_data"] >= 1
        
        print(f"Full flow passed: {initial_total}ml -> {initial_total + 100}ml")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
