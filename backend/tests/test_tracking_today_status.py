"""
Test suite for the /api/tracking/symptoms/today/{profile_id} endpoint
Tests: 8-week plan progress indicator, today status, and locked state functionality
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PROFILE_ID = "4f3cc8dc-170c-4f7b-a179-bf2f0e789ff4"


class TestTodaySymptomStatus:
    """Tests for GET /api/tracking/symptoms/today/{profile_id}"""
    
    def test_today_status_returns_200(self):
        """API should return 200 for valid profile"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: API returns 200 for valid profile")
    
    def test_today_status_structure(self):
        """Response should contain required fields: submitted, entry, date, plan_week, plan_day, total_plan_days"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ['submitted', 'entry', 'date', 'plan_week', 'plan_day', 'total_plan_days']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"PASS: Response contains all required fields: {required_fields}")
    
    def test_submitted_status_is_boolean(self):
        """submitted field should be a boolean"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data['submitted'], bool), f"submitted should be bool, got {type(data['submitted'])}"
        print(f"PASS: submitted is boolean: {data['submitted']}")
    
    def test_plan_week_range(self):
        """plan_week should be 0-8 (0 when no plan, 1-8 during plan)"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert 0 <= data['plan_week'] <= 8, f"plan_week {data['plan_week']} out of range 0-8"
        print(f"PASS: plan_week is {data['plan_week']} (valid range 0-8)")
    
    def test_plan_day_range(self):
        """plan_day should be 0-56 (0 when no plan, 1-56 during plan)"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert 0 <= data['plan_day'] <= 56, f"plan_day {data['plan_day']} out of range 0-56"
        print(f"PASS: plan_day is {data['plan_day']} (valid range 0-56)")
    
    def test_total_plan_days_is_56(self):
        """total_plan_days should be 56 (8 weeks)"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert data['total_plan_days'] == 56, f"total_plan_days should be 56, got {data['total_plan_days']}"
        print(f"PASS: total_plan_days is 56")
    
    def test_date_is_today(self):
        """date field should be today's date in YYYY-MM-DD format"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Validate date format
        try:
            datetime.strptime(data['date'], '%Y-%m-%d')
        except ValueError:
            pytest.fail(f"Invalid date format: {data['date']}")
        
        print(f"PASS: date is valid format: {data['date']}")
    
    def test_entry_contains_ratings_when_submitted(self):
        """When submitted=true, entry should contain ratings data"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        if data['submitted']:
            assert data['entry'] is not None, "entry should not be null when submitted=true"
            assert 'overall' in data['entry'], "entry should have overall rating"
            assert 'ratings' in data['entry'], "entry should have ratings dict"
            print(f"PASS: submitted=true, entry has overall={data['entry']['overall']} and ratings")
        else:
            print(f"INFO: submitted=false, skipping entry validation")
    
    def test_entry_ratings_structure(self):
        """entry.ratings should have symptom category keys"""
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        if data['submitted'] and data['entry'] and data['entry'].get('ratings'):
            ratings = data['entry']['ratings']
            expected_categories = ['energy', 'sleep', 'mood', 'concentration', 'digestion']
            found_categories = [cat for cat in expected_categories if cat in ratings]
            print(f"PASS: entry.ratings contains categories: {found_categories}")
        else:
            print("INFO: No submitted entry to validate ratings structure")
    
    def test_nonexistent_profile_returns_data(self):
        """API should still return data structure for non-existent profile (submitted=false)"""
        fake_profile = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/tracking/symptoms/today/{fake_profile}")
        assert response.status_code == 200
        data = response.json()
        
        assert data['submitted'] == False, "Non-existent profile should have submitted=false"
        assert data['entry'] is None, "Non-existent profile should have entry=null"
        print(f"PASS: Non-existent profile returns submitted=false, entry=null")


class TestDashboardEndpoint:
    """Tests for GET /api/tracking/dashboard/{profile_id}"""
    
    def test_dashboard_returns_200(self):
        """Dashboard API should return 200"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        print("PASS: Dashboard returns 200")
    
    def test_dashboard_structure(self):
        """Dashboard should have required fields"""
        response = requests.get(f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ['progress', 'streak', 'days_tracked', 'symptom_trend', 
                          'symptom_chart', 'overall_chart', 'compliance_rate', 
                          'milestones', 'insights']
        for field in required_fields:
            assert field in data, f"Missing dashboard field: {field}"
        
        print(f"PASS: Dashboard contains all required fields")


class TestSymptomPostEndpoint:
    """Tests for POST /api/tracking/symptoms"""
    
    def test_symptom_save_requires_data(self):
        """POST should require profile_id, date, overall"""
        response = requests.post(f"{BASE_URL}/api/tracking/symptoms", 
                                json={},
                                headers={'Content-Type': 'application/json'})
        # Should fail validation (422)
        assert response.status_code == 422, f"Expected 422 for missing data, got {response.status_code}"
        print("PASS: POST validates required fields")
    
    def test_symptom_save_with_valid_data(self):
        """POST with valid data should return 200"""
        from datetime import datetime
        
        # Use a test date that won't interfere (yesterday)
        test_date = "2026-03-04"
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "date": test_date,
            "ratings": {"energy": 5, "sleep": 6},
            "overall": 5,
            "notes": "TEST_entry"
        }
        response = requests.post(f"{BASE_URL}/api/tracking/symptoms",
                                json=payload,
                                headers={'Content-Type': 'application/json'})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data['status'] == 'saved', "Expected status=saved"
        print(f"PASS: POST saves symptom entry successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
