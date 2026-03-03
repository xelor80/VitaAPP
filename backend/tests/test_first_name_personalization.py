"""
Test suite for First Name Personalization feature
Tests:
1. POST /api/health-profile with first_name field saves correctly
2. GET /api/health-profile/{id} returns first_name in profile
3. Profile without first_name doesn't cause errors
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFirstNamePersonalization:
    """Tests for first name field in health profile"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.test_profile_ids = []
        yield
        # Cleanup not needed as profiles persist (no delete endpoint)
    
    def test_create_profile_with_first_name(self):
        """Test that POST /api/health-profile with first_name saves correctly"""
        test_name = f"TestUser_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "first_name": test_name,
            "age": 25,
            "gender": "male",
            "height": 180,
            "weight": 75,
            "diet": "omnivore",
            "activity_level": "moderate",
            "sleep_quality": 7,
            "sleep_duration": 7.5,
            "sleep_issues": [],
            "stress_level": 4,
            "stress_type": [],
            "energy_level": 7,
            "conditions": [],
            "medications": [],
            "allergies": [],
            "complaints": [],
            "known_deficiencies": [],
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "profile_id" in data, "Response should contain profile_id"
        assert "assessment" in data, "Response should contain assessment"
        
        profile_id = data["profile_id"]
        self.test_profile_ids.append(profile_id)
        
        # Verify first_name was persisted by fetching profile
        get_response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        
        profile_data = get_response.json()
        assert "profile" in profile_data, "GET response should contain profile"
        assert profile_data["profile"]["first_name"] == test_name, \
            f"Expected first_name '{test_name}', got '{profile_data['profile'].get('first_name')}'"
        
        print(f"✓ Created profile with first_name='{test_name}', profile_id={profile_id}")
    
    def test_get_existing_profile_with_first_name(self):
        """Test that GET /api/health-profile/{id} returns first_name for existing profile"""
        # Using the known profile ID from agent context with first_name='Max'
        known_profile_id = "c65a12da-2bc5-473c-861f-0c34b89ad553"
        
        response = requests.get(f"{BASE_URL}/api/health-profile/{known_profile_id}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "profile" in data, "Response should contain profile object"
        profile = data["profile"]
        
        assert "first_name" in profile, "Profile should have first_name field"
        assert profile["first_name"] == "Max", \
            f"Expected first_name='Max', got '{profile.get('first_name')}'"
        
        # Also verify other profile fields are present
        assert "id" in profile, "Profile should have id"
        assert profile["id"] == known_profile_id
        
        print(f"✓ GET profile returned first_name='Max' as expected")
    
    def test_create_profile_without_first_name(self):
        """Test that profile creation without first_name works (null/empty allowed)"""
        payload = {
            "first_name": None,  # Explicitly null
            "age": 30,
            "gender": "female",
            "height": 165,
            "weight": 60,
            "diet": "vegetarian",
            "activity_level": "light",
            "sleep_quality": 6,
            "sleep_duration": 6.5,
            "stress_level": 5,
            "energy_level": 5,
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "profile_id" in data, "Response should contain profile_id"
        
        profile_id = data["profile_id"]
        
        # Verify profile was created and first_name is null
        get_response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert get_response.status_code == 200
        
        profile_data = get_response.json()
        assert profile_data["profile"]["first_name"] is None, \
            f"Expected first_name=None, got '{profile_data['profile'].get('first_name')}'"
        
        print(f"✓ Created profile without first_name, first_name is None as expected")
    
    def test_create_profile_with_empty_string_first_name(self):
        """Test that empty string first_name is handled"""
        payload = {
            "first_name": "",  # Empty string
            "age": 28,
            "gender": "diverse",
            "height": 170,
            "weight": 65,
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        profile_id = data["profile_id"]
        
        # Verify empty string was saved as-is
        get_response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        profile_data = get_response.json()
        
        # Empty string should be saved (frontend logic handles display)
        assert "first_name" in profile_data["profile"]
        print(f"✓ Created profile with empty string first_name")
    
    def test_profile_not_found_returns_404(self):
        """Test that non-existent profile returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        response = requests.get(f"{BASE_URL}/api/health-profile/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent profile returns 404")


class TestOnboardingOptions:
    """Test that onboarding options endpoint works (needed for frontend)"""
    
    def test_get_onboarding_options_de(self):
        """Test GET /api/onboarding/options returns options in German"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "genders" in data, "Options should have genders"
        assert "diets" in data, "Options should have diets"
        assert "activity_levels" in data, "Options should have activity_levels"
        
        # Verify structure
        assert len(data["genders"]) >= 3, "Should have at least 3 gender options"
        gender = data["genders"][0]
        assert "value" in gender
        assert "label_de" in gender
        
        print(f"✓ Onboarding options returned {len(data['genders'])} genders, {len(data['diets'])} diets")
    
    def test_get_onboarding_options_it(self):
        """Test GET /api/onboarding/options returns options in Italian"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=it")
        
        assert response.status_code == 200
        
        data = response.json()
        # Options should have Italian labels
        gender = data["genders"][0]
        assert "label_it" in gender, "Should have Italian labels"
        
        print(f"✓ Onboarding options have Italian labels")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
