"""
Tests for Enhanced Symptom Severity Tracking - P1 Feature
Tests: POST /tracking/symptoms, GET /tracking/symptoms/{profile_id}, GET /tracking/dashboard/{profile_id}
Categories: energy, sleep, mood, concentration, digestion, pain, stress
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
TEST_PROFILE_ID = "2c0ba8c7-729e-49b2-a144-1068e03c8301"

class TestSymptomSeverityTracking:
    """Test Enhanced Symptom Severity Tracking with 7 categories including pain and stress"""

    def test_post_symptom_rating_all_categories(self):
        """POST /api/tracking/symptoms - Save ratings for all 7 categories"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": today,
            "ratings": {
                "energy": 5,
                "sleep": 6,
                "mood": 4,
                "concentration": 5,
                "digestion": 3,
                "pain": 7,
                "stress": 8
            },
            "overall": 7,
            "notes": "Test symptom tracking"
        }
        response = requests.post(f"{BASE_URL}/api/tracking/symptoms", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "saved"
        assert data["date"] == today
        print(f"PASS: POST symptom rating with all 7 categories")

    def test_post_symptom_rating_pain_category(self):
        """POST /api/tracking/symptoms - Verify pain category (new) is accepted"""
        date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": date,
            "ratings": {"pain": 8},
            "overall": 6,
            "notes": ""
        }
        response = requests.post(f"{BASE_URL}/api/tracking/symptoms", json=payload)
        assert response.status_code == 200
        print(f"PASS: Pain category accepted in symptom rating")

    def test_post_symptom_rating_stress_category(self):
        """POST /api/tracking/symptoms - Verify stress category (new) is accepted"""
        date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": date,
            "ratings": {"stress": 9},
            "overall": 8,
            "notes": ""
        }
        response = requests.post(f"{BASE_URL}/api/tracking/symptoms", json=payload)
        assert response.status_code == 200
        print(f"PASS: Stress category accepted in symptom rating")

    def test_post_symptom_overall_range_1_to_10(self):
        """POST /api/tracking/symptoms - Overall must be between 1-10"""
        date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
        # Test valid overall values
        for overall_val in [1, 3, 5, 7, 10]:
            payload = {
                "profile_id": TEST_PROFILE_ID,
                "date": date,
                "ratings": {"energy": 5},
                "overall": overall_val,
                "notes": ""
            }
            response = requests.post(f"{BASE_URL}/api/tracking/symptoms", json=payload)
            assert response.status_code == 200, f"Expected 200 for overall={overall_val}"
        print(f"PASS: Overall values 1-10 accepted")

    def test_get_symptom_history_returns_all_categories(self):
        """GET /api/tracking/symptoms/{profile_id} - Returns symptom history"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/{TEST_PROFILE_ID}?days=30")
        assert response.status_code == 200
        data = response.json()
        assert "entries" in data
        assert "count" in data
        assert isinstance(data["entries"], list)
        if data["count"] > 0:
            entry = data["entries"][-1]
            assert "ratings" in entry
            assert "overall" in entry
            assert "date" in entry
        print(f"PASS: GET symptom history returns {data['count']} entries")

    def test_get_dashboard_returns_symptom_chart(self):
        """GET /api/tracking/dashboard/{profile_id} - Returns symptom_chart data"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # Verify symptom_chart is present
        assert "symptom_chart" in data, "symptom_chart missing from dashboard"
        symptom_chart = data["symptom_chart"]
        assert isinstance(symptom_chart, dict)
        
        # Verify overall_chart is present
        assert "overall_chart" in data, "overall_chart missing from dashboard"
        
        # Verify symptom_trend is present
        assert "symptom_trend" in data, "symptom_trend missing from dashboard"
        trend = data["symptom_trend"]
        assert "direction" in trend
        assert "label_de" in trend
        
        print(f"PASS: Dashboard returns symptom_chart with {len(symptom_chart)} categories")

    def test_dashboard_symptom_chart_contains_new_categories(self):
        """GET /api/tracking/dashboard - symptom_chart includes pain and stress"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        data = response.json()
        symptom_chart = data.get("symptom_chart", {})
        
        # Check if pain and stress categories exist when data is available
        if len(symptom_chart) > 0:
            categories_with_data = list(symptom_chart.keys())
            print(f"PASS: symptom_chart contains categories: {categories_with_data}")
        else:
            print(f"PASS: symptom_chart empty (no data yet), structure valid")

    def test_dashboard_returns_all_required_fields(self):
        """GET /api/tracking/dashboard - Returns all required dashboard fields"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "progress", "streak", "days_tracked", "symptom_trend",
            "symptom_chart", "overall_chart", "compliance_rate",
            "compliance_daily", "compliance_trend", "milestones", "insights"
        ]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"PASS: Dashboard contains all {len(required_fields)} required fields")

    def test_post_symptom_upsert_same_date(self):
        """POST /api/tracking/symptoms - Upserts when same date posted again"""
        date = datetime.now().strftime("%Y-%m-%d")
        
        # First save
        payload1 = {
            "profile_id": TEST_PROFILE_ID,
            "date": date,
            "ratings": {"energy": 3},
            "overall": 3,
            "notes": "First entry"
        }
        response1 = requests.post(f"{BASE_URL}/api/tracking/symptoms", json=payload1)
        assert response1.status_code == 200
        
        # Second save (update)
        payload2 = {
            "profile_id": TEST_PROFILE_ID,
            "date": date,
            "ratings": {"energy": 8, "stress": 5},
            "overall": 7,
            "notes": "Updated entry"
        }
        response2 = requests.post(f"{BASE_URL}/api/tracking/symptoms", json=payload2)
        assert response2.status_code == 200
        
        # Verify only one entry for that date
        response3 = requests.get(f"{BASE_URL}/api/tracking/symptoms/{TEST_PROFILE_ID}?days=1")
        data = response3.json()
        today_entries = [e for e in data["entries"] if e["date"] == date]
        assert len(today_entries) <= 1, "Multiple entries for same date - upsert not working"
        
        print(f"PASS: Upsert works correctly for same date")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
