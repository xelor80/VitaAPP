"""
Health Profile API Tests
Tests for GET /api/health-profile/{id} and related endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://health-coach-102.preview.emergentagent.com')
EXISTING_PROFILE_ID = "2416f8aa-09aa-47f1-b600-2c9ada87124d"


class TestHealthProfileAPI:
    """Tests for health profile endpoints"""
    
    def test_get_health_profile_success(self):
        """GET /api/health-profile/{id} returns profile + assessment data"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{EXISTING_PROFILE_ID}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Profile assertions
        assert "profile" in data, "Response should contain 'profile' key"
        profile = data["profile"]
        assert profile["id"] == EXISTING_PROFILE_ID
        assert "age" in profile
        assert "gender" in profile
        assert "diet" in profile
        assert "height" in profile
        assert "weight" in profile
        assert "stress_level" in profile
        assert "sleep_quality" in profile
        
        # Assessment assertions
        assert "assessment" in data, "Response should contain 'assessment' key"
        assessment = data["assessment"]
        assert assessment is not None, "Assessment should not be None"
        assert "deficiencies" in assessment
        assert "bmi" in assessment
        assert "priority_areas" in assessment
    
    def test_get_health_profile_deficiencies_structure(self):
        """Verify deficiencies have correct structure with risk levels"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{EXISTING_PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        deficiencies = data["assessment"]["deficiencies"]
        
        assert len(deficiencies) > 0, "Should have at least one deficiency"
        
        for d in deficiencies:
            assert "nutrient" in d, "Deficiency should have nutrient key"
            assert "risk_level" in d, "Deficiency should have risk_level"
            assert d["risk_level"] in ["high", "medium", "low"], f"Invalid risk_level: {d['risk_level']}"
            assert "score" in d or "name" in d
    
    def test_get_health_profile_bmi_calculation(self):
        """Verify BMI is calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{EXISTING_PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        profile = data["profile"]
        assessment = data["assessment"]
        
        # BMI = weight / (height_m)^2
        expected_bmi = round(profile["weight"] / ((profile["height"] / 100) ** 2), 1)
        actual_bmi = assessment["bmi"]
        
        assert abs(actual_bmi - expected_bmi) < 0.5, f"BMI mismatch: expected ~{expected_bmi}, got {actual_bmi}"
    
    def test_get_health_profile_priority_areas(self):
        """Verify priority_areas is present and structured correctly"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{EXISTING_PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        priority_areas = data["assessment"]["priority_areas"]
        
        assert isinstance(priority_areas, list), "priority_areas should be a list"
        
        if len(priority_areas) > 0:
            for area in priority_areas:
                assert "area" in area or "title" in area
    
    def test_get_health_profile_not_found(self):
        """GET /api/health-profile/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/health-profile/invalid-uuid-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_get_health_assessment_endpoint(self):
        """GET /api/health-profile/{id}/assessment returns assessment"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{EXISTING_PROFILE_ID}/assessment")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "profile_id" in data
        assert "assessment" in data
        assert data["profile_id"] == EXISTING_PROFILE_ID
    
    def test_create_health_profile(self):
        """POST /api/health-profile creates new profile with assessment"""
        payload = {
            "age": 30,
            "gender": "male",
            "height": 175,
            "weight": 75,
            "diet": "omnivore",
            "activity_level": "moderate",
            "sleep_quality": 7,
            "sleep_duration": 7.5,
            "sleep_issues": [],
            "stress_level": 5,
            "stress_type": ["work"],
            "energy_level": 6,
            "conditions": [],
            "medications": [],
            "allergies": [],
            "complaints": [],
            "known_deficiencies": [],
            "lab_values": {},
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "profile_id" in data, "Response should contain profile_id"
        assert "assessment" in data, "Response should contain assessment"
        
        # Verify assessment structure
        assessment = data["assessment"]
        assert "deficiencies" in assessment
        assert "bmi" in assessment
        
        # Verify BMI calculation
        expected_bmi = round(75 / ((175 / 100) ** 2), 1)
        assert abs(assessment["bmi"] - expected_bmi) < 0.5
        
        # Cleanup: verify the created profile can be fetched
        profile_id = data["profile_id"]
        get_response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert get_response.status_code == 200


class TestSupplementPlanIntegration:
    """Test supplement plan integration with health profile"""
    
    def test_get_supplement_plan_for_profile(self):
        """GET /api/supplement-plan/{profile_id} returns plan or 404"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{EXISTING_PROFILE_ID}")
        
        # Can be 200 if plan exists, or 404 if not created yet
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"


class TestOnboardingOptions:
    """Test onboarding options endpoint"""
    
    def test_get_onboarding_options(self):
        """GET /api/onboarding/options returns all form options"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify all option categories are present
        expected_categories = [
            "genders", "diets", "activity_levels", "sleep_issues",
            "stress_types", "conditions", "medications", "complaints", "known_deficiencies"
        ]
        
        for cat in expected_categories:
            assert cat in data, f"Missing option category: {cat}"
            assert isinstance(data[cat], list), f"{cat} should be a list"
            assert len(data[cat]) > 0, f"{cat} should not be empty"
    
    def test_onboarding_options_structure(self):
        """Verify each option has value, label_de, and label_it"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options")
        assert response.status_code == 200
        
        data = response.json()
        
        for option in data["genders"]:
            assert "value" in option
            assert "label_de" in option
            assert "label_it" in option


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
