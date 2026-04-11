"""
Water Tracking AI Feature Tests - VitaGuide+ Health App
Tests the new AI-based water tracking features:
- POST /api/water-tracking/{profile_id}/recalculate-goal - Recalculate goal using AI from health profile
- GET /api/water-tracking/{profile_id}/hydration-tip - Get AI-generated hydration tips from VERO
Plus all existing water tracking endpoints to ensure full coverage.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stress-relief-app-11.preview.emergentagent.com')
BASE_URL = BASE_URL.rstrip('/')

# Real profile ID for testing (from request)
TEST_PROFILE_ID = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ====== Today's Water Data Tests ======

class TestWaterTrackingToday:
    """Tests for GET /api/water-tracking/{profile_id}/today endpoint"""
    
    def test_get_today_returns_water_data_with_vero_message(self, api_client):
        """Test GET today returns water data with vero_message field"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Required fields
        assert "date" in data, "Missing 'date' field"
        assert "total_ml" in data, "Missing 'total_ml' field"
        assert "daily_goal_ml" in data, "Missing 'daily_goal_ml' field"
        assert "percentage" in data, "Missing 'percentage' field"
        assert "remaining_ml" in data, "Missing 'remaining_ml' field"
        assert "entries" in data, "Missing 'entries' field"
        assert "vero_message" in data, "Missing 'vero_message' field (new feature)"
        
        # Type validations
        assert isinstance(data["total_ml"], int)
        assert isinstance(data["daily_goal_ml"], int)
        assert isinstance(data["percentage"], int)
        
        # VERO message structure if present
        if data["vero_message"]:
            assert "text" in data["vero_message"], "vero_message missing 'text'"
            assert "mood" in data["vero_message"], "vero_message missing 'mood'"
            print(f"VERO message: '{data['vero_message']['text']}' (mood: {data['vero_message']['mood']})")
        
        print(f"Today's water: {data['total_ml']}/{data['daily_goal_ml']}ml ({data['percentage']}%)")
    
    def test_get_today_italian_language(self, api_client):
        """Test GET today with Italian language returns proper VERO messages"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=it")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("vero_message"):
            print(f"Italian VERO message: {data['vero_message']['text']}")


# ====== Add Water Tests ======

class TestWaterTrackingAdd:
    """Tests for POST /api/water-tracking/{profile_id}/add endpoint"""
    
    def test_add_water_returns_feedback_and_vero_message(self, api_client):
        """Test adding water returns updated data with feedback and vero_message"""
        # Get initial state
        initial = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de").json()
        initial_total = initial["total_ml"]
        
        # Add 150ml
        response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 150}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Required response fields
        assert "total_ml" in data, "Missing 'total_ml'"
        assert "daily_goal_ml" in data, "Missing 'daily_goal_ml'"
        assert "percentage" in data, "Missing 'percentage'"
        assert "remaining_ml" in data, "Missing 'remaining_ml'"
        assert "added_ml" in data, "Missing 'added_ml'"
        assert "feedback" in data, "Missing 'feedback'"
        assert "goal_reached" in data, "Missing 'goal_reached'"
        assert "vero_message" in data, "Missing 'vero_message' (new feature)"
        
        # Verify cumulative total
        assert data["added_ml"] == 150
        assert data["total_ml"] == initial_total + 150
        
        # Feedback should exist
        assert isinstance(data["feedback"], str) and len(data["feedback"]) > 0
        
        print(f"Added 150ml - Total: {data['total_ml']}ml, Feedback: {data['feedback']}")
    
    def test_add_water_validation_rejects_invalid_amounts(self, api_client):
        """Test validation: amounts must be between 1 and 5000ml"""
        # Test negative amount
        resp_neg = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": -100}
        )
        assert resp_neg.status_code == 400, "Should reject negative amounts"
        
        # Test zero amount
        resp_zero = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 0}
        )
        assert resp_zero.status_code == 400, "Should reject zero"
        
        # Test > 5000ml
        resp_large = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 5001}
        )
        assert resp_large.status_code == 400, "Should reject > 5000ml"
        
        print("Validation tests passed: -100, 0, 5001 all rejected with 400")


# ====== AI Hydration Tip Tests ======

class TestHydrationTip:
    """Tests for GET /api/water-tracking/{profile_id}/hydration-tip endpoint (NEW AI feature)"""
    
    def test_get_hydration_tip_returns_ai_tip(self, api_client):
        """Test GET hydration-tip returns AI-generated tip from VERO"""
        response = api_client.get(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/hydration-tip?lang=de",
            timeout=30  # AI calls may take longer
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response structure
        assert "tip" in data, "Missing 'tip' field"
        assert "source" in data, "Missing 'source' field"
        
        # Tip should be non-empty string
        assert isinstance(data["tip"], str), "tip should be string"
        assert len(data["tip"]) > 10, f"Tip seems too short: '{data['tip']}'"
        
        # Source should be 'ai' or 'fallback'
        assert data["source"] in ["ai", "fallback"], f"Invalid source: {data['source']}"
        
        print(f"Hydration tip (source: {data['source']}): {data['tip']}")
    
    def test_get_hydration_tip_italian(self, api_client):
        """Test GET hydration-tip with Italian language"""
        response = api_client.get(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/hydration-tip?lang=it",
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "tip" in data
        assert len(data["tip"]) > 10
        
        print(f"Italian hydration tip: {data['tip']}")


# ====== AI Recalculate Goal Tests ======

class TestRecalculateGoal:
    """Tests for POST /api/water-tracking/{profile_id}/recalculate-goal endpoint (NEW AI feature)"""
    
    def test_recalculate_goal_uses_ai(self, api_client):
        """Test POST recalculate-goal recalculates using AI from health profile"""
        response = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/recalculate-goal",
            timeout=30  # AI calls may take longer
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Response structure
        assert "daily_goal_ml" in data, "Missing 'daily_goal_ml'"
        assert "auto_calculated" in data, "Missing 'auto_calculated'"
        
        # Goal should be reasonable (1000-6000ml per code validation)
        assert isinstance(data["daily_goal_ml"], int)
        assert 1000 <= data["daily_goal_ml"] <= 6000, f"Goal {data['daily_goal_ml']} outside valid range"
        
        # Should be auto-calculated
        assert data["auto_calculated"] == True
        
        print(f"AI recalculated goal: {data['daily_goal_ml']}ml (auto_calculated: {data['auto_calculated']})")
    
    def test_recalculate_goal_nonexistent_profile_returns_404(self, api_client):
        """Test POST recalculate-goal with non-existent profile returns 404"""
        # Add timeout to avoid connection issues
        try:
            response = api_client.post(
                f"{BASE_URL}/api/water-tracking/nonexistent-profile-id-12345/recalculate-goal",
                timeout=15
            )
            assert response.status_code == 404, f"Expected 404 for non-existent profile, got {response.status_code}"
            print("Correctly returns 404 for non-existent profile")
        except requests.exceptions.ConnectionError:
            # Retry once on connection error
            time.sleep(1)
            response = api_client.post(
                f"{BASE_URL}/api/water-tracking/nonexistent-profile-id-12345/recalculate-goal",
                timeout=15
            )
            assert response.status_code == 404, f"Expected 404 for non-existent profile, got {response.status_code}"
            print("Correctly returns 404 for non-existent profile (after retry)")


# ====== History Tests ======

class TestWaterTrackingHistory:
    """Tests for GET /api/water-tracking/{profile_id}/history endpoint"""
    
    def test_get_history_week(self, api_client):
        """Test getting weekly history"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=week")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "period" in data and data["period"] == "week"
        assert "daily_goal_ml" in data
        assert "days" in data and isinstance(data["days"], list)
        assert "days_with_data" in data
        assert "days_goal_reached" in data
        assert "average_ml" in data
        
        print(f"Weekly: {data['days_with_data']} days, {data['days_goal_reached']} goals met, avg: {data['average_ml']}ml")
    
    def test_get_history_month(self, api_client):
        """Test getting monthly history"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=month")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["period"] == "month"
        print(f"Monthly: {data['days_with_data']} days with data")


# ====== Goal Management Tests ======

class TestWaterGoal:
    """Tests for GET/PUT /api/water-tracking/{profile_id}/goal endpoints"""
    
    def test_get_goal(self, api_client):
        """Test GET goal returns goal info"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "daily_goal_ml" in data
        assert "auto_calculated" in data
        
        print(f"Current goal: {data['daily_goal_ml']}ml, auto: {data['auto_calculated']}")
    
    def test_update_goal_manually(self, api_client):
        """Test PUT goal updates manually"""
        # Save original
        original = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal").json()
        original_goal = original["daily_goal_ml"]
        
        # Update to 2800ml
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": 2800}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["daily_goal_ml"] == 2800
        assert data["auto_calculated"] == False
        
        # Restore original
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": original_goal}
        )
        
        print(f"Goal update test passed: {original_goal} -> 2800 -> {original_goal}")
    
    def test_update_goal_validation(self, api_client):
        """Test goal validation: 500-8000ml"""
        # Too low
        resp_low = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": 400}
        )
        assert resp_low.status_code == 400, "Should reject < 500ml"
        
        # Too high
        resp_high = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/goal",
            json={"daily_goal_ml": 8500}
        )
        assert resp_high.status_code == 400, "Should reject > 8000ml"
        
        print("Goal validation passed: 400 and 8500 rejected")


# ====== Reminder Settings Tests ======

class TestWaterReminder:
    """Tests for GET/PUT /api/water-tracking/{profile_id}/reminder endpoints"""
    
    def test_get_reminder(self, api_client):
        """Test GET reminder returns settings"""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "enabled" in data
        assert "times" in data and isinstance(data["times"], list)
        
        print(f"Reminder: enabled={data['enabled']}, times={data['times']}")
    
    def test_update_reminder(self, api_client):
        """Test PUT reminder updates settings"""
        response = api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder",
            json={"enabled": True, "times": ["10:00", "14:00", "18:00"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == True
        assert data["times"] == ["10:00", "14:00", "18:00"]
        
        # Verify persistence
        verify = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder").json()
        assert verify["enabled"] == True
        assert verify["times"] == ["10:00", "14:00", "18:00"]
        
        # Reset
        api_client.put(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/reminder",
            json={"enabled": False, "times": ["08:00", "12:00", "16:00", "20:00"]}
        )
        
        print("Reminder update test passed")


# ====== Integration Tests ======

class TestWaterTrackingIntegration:
    """End-to-end integration tests"""
    
    def test_full_flow_add_verify_history(self, api_client):
        """Test: get today -> add water -> verify persistence -> check history"""
        # 1. Get initial state
        today = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de").json()
        initial_total = today["total_ml"]
        
        # 2. Add water
        add_result = api_client.post(
            f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/add?lang=de",
            json={"amount_ml": 100}
        ).json()
        
        assert add_result["total_ml"] == initial_total + 100
        
        # 3. Verify persistence
        verify = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today?lang=de").json()
        assert verify["total_ml"] == initial_total + 100
        
        # 4. History should include today
        history = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/history?period=week").json()
        assert history["days_with_data"] >= 1
        
        print(f"Integration flow passed: {initial_total} -> {initial_total + 100}ml")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
