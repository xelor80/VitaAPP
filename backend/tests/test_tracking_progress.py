"""
Tracking & Progress API Tests
Tests for: GET/POST /api/tracking/symptoms, GET/POST /api/tracking/compliance, GET /api/tracking/dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test Profile ID with existing data
TEST_PROFILE_ID = "8a8c38eb-b6a7-455f-b9c5-da5891dab9d9"
# Unique test profile for create tests
TEST_UNIQUE_PREFIX = f"TEST_tracking_{uuid.uuid4().hex[:8]}"


class TestTrackingDashboard:
    """Tests for GET /api/tracking/dashboard/{profile_id}"""
    
    def test_dashboard_returns_200(self):
        """Dashboard endpoint should return 200 for valid profile"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        print(f"✓ Dashboard returns 200")
    
    def test_dashboard_structure(self):
        """Dashboard should return expected fields"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields exist
        required_fields = [
            "progress", "streak", "days_tracked", "symptom_trend",
            "symptom_chart", "overall_chart", "compliance_rate",
            "compliance_daily", "compliance_trend", "milestones", "insights"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Dashboard has all required fields")
    
    def test_dashboard_progress_is_numeric(self):
        """Progress field should be a number 0-100"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data["progress"], (int, float))
        assert 0 <= data["progress"] <= 100
        print(f"✓ Progress is valid number: {data['progress']}")
    
    def test_dashboard_streak_is_integer(self):
        """Streak should be an integer >= 0"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data["streak"], int)
        assert data["streak"] >= 0
        print(f"✓ Streak is valid integer: {data['streak']}")
    
    def test_dashboard_milestones_structure(self):
        """Milestones should be list with expected fields"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data["milestones"], list)
        if len(data["milestones"]) > 0:
            milestone = data["milestones"][0]
            assert "id" in milestone
            assert "name_de" in milestone
            assert "name_it" in milestone
            assert "icon" in milestone
            assert "achieved" in milestone
        print(f"✓ Milestones have correct structure ({len(data['milestones'])} milestones)")
    
    def test_dashboard_insights_structure(self):
        """Insights should be list with type, icon, title, text"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data["insights"], list)
        if len(data["insights"]) > 0:
            insight = data["insights"][0]
            assert "type" in insight
            assert "icon" in insight
            assert "title" in insight
            assert "text" in insight
        print(f"✓ Insights have correct structure ({len(data['insights'])} insights)")
    
    def test_dashboard_lang_italian(self):
        """Dashboard should return Italian labels when lang=it"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        # Check symptom_trend has Italian label
        if data["symptom_trend"]:
            assert "label_it" in data["symptom_trend"]
        print(f"✓ Dashboard supports Italian language")


class TestSymptomTracking:
    """Tests for POST/GET /api/tracking/symptoms"""
    
    def test_save_symptom_rating(self):
        """POST /api/tracking/symptoms should save and return status"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": "2026-01-16",
            "ratings": {
                "energy": 6,
                "sleep": 7,
                "mood": 5,
                "concentration": 6,
                "digestion": 8
            },
            "overall": 6,
            "notes": "Test entry from pytest"
        }
        response = requests.post(
            f"{BASE_URL}/api/tracking/symptoms",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "saved"
        assert data["date"] == "2026-01-16"
        print(f"✓ Symptom rating saved successfully")
    
    def test_save_symptom_overall_only(self):
        """Should accept minimal data with just overall rating"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": "2026-01-17",
            "ratings": {},
            "overall": 7,
            "notes": ""
        }
        response = requests.post(
            f"{BASE_URL}/api/tracking/symptoms",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        print(f"✓ Minimal symptom rating (overall only) saved")
    
    def test_save_symptom_invalid_overall(self):
        """Should reject overall rating outside 1-10 range"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": "2026-01-18",
            "ratings": {},
            "overall": 15,  # Invalid: >10
            "notes": ""
        }
        response = requests.post(
            f"{BASE_URL}/api/tracking/symptoms",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422  # Validation error
        print(f"✓ Invalid overall rating rejected with 422")
    
    def test_get_symptom_history(self):
        """GET /api/tracking/symptoms/{profile_id} should return history"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/{TEST_PROFILE_ID}?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert "count" in data
        assert isinstance(data["entries"], list)
        print(f"✓ Symptom history returned ({data['count']} entries)")
    
    def test_get_symptom_entry_structure(self):
        """Symptom history entries should have expected fields"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/{TEST_PROFILE_ID}?days=30")
        data = response.json()
        
        if len(data["entries"]) > 0:
            entry = data["entries"][0]
            assert "profile_id" in entry
            assert "date" in entry
            assert "overall" in entry
            assert "ratings" in entry
        print(f"✓ Symptom entry has correct structure")


class TestComplianceTracking:
    """Tests for POST/GET /api/tracking/compliance"""
    
    def test_save_compliance(self):
        """POST /api/tracking/compliance should save and return status"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": "2026-01-16",
            "supplements": [
                {"id": "vitamin_d", "name": "Vitamin D", "taken": True},
                {"id": "zinc", "name": "Zink", "taken": False},
                {"id": "omega3", "name": "Omega-3", "taken": True}
            ]
        }
        response = requests.post(
            f"{BASE_URL}/api/tracking/compliance",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "saved"
        assert data["date"] == "2026-01-16"
        print(f"✓ Compliance entry saved successfully")
    
    def test_save_compliance_empty_supplements(self):
        """Should accept empty supplements list"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": "2026-01-19",
            "supplements": []
        }
        response = requests.post(
            f"{BASE_URL}/api/tracking/compliance",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        print(f"✓ Empty supplements list accepted")
    
    def test_get_compliance_history(self):
        """GET /api/tracking/compliance/{profile_id} should return history with rate"""
        response = requests.get(f"{BASE_URL}/api/tracking/compliance/{TEST_PROFILE_ID}?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        assert "count" in data
        assert "rate" in data
        print(f"✓ Compliance history returned (rate: {data['rate']}%)")
    
    def test_compliance_rate_calculation(self):
        """Compliance rate should be calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/tracking/compliance/{TEST_PROFILE_ID}?days=30")
        data = response.json()
        
        # Rate should be between 0 and 100
        assert 0 <= data["rate"] <= 100
        print(f"✓ Compliance rate is valid: {data['rate']}%")


class TestNewProfile:
    """Tests for new profile with no tracking data"""
    
    def test_dashboard_empty_profile(self):
        """Dashboard should handle profile with no data gracefully"""
        new_profile_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{new_profile_id}?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # Should return zeros/empty for new profile
        assert data["streak"] == 0
        assert data["days_tracked"] == 0
        assert data["compliance_rate"] == 0
        assert isinstance(data["milestones"], list)
        assert isinstance(data["insights"], list)
        print(f"✓ Dashboard handles empty profile correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
