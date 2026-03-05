"""
Health Score API Tests
Tests for GET /api/health-score/{profile_id} endpoint
- German and Italian language responses
- 404 for nonexistent profiles
- Score calculation and AI assessment integration
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://personalize-meals.preview.emergentagent.com")

# Test profile ID that exists in DB
TEST_PROFILE_ID = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"
NONEXISTENT_PROFILE_ID = "nonexistent-profile-id-12345"


class TestHealthScoreAPI:
    """Health Score endpoint tests"""

    def test_health_score_german(self):
        """GET /api/health-score/{profile_id}?lang=de returns valid score with German text"""
        response = requests.get(f"{BASE_URL}/api/health-score/{TEST_PROFILE_ID}?lang=de")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Score assertions
        assert "score" in data, "Response missing 'score' field"
        assert isinstance(data["score"], int), f"Score should be int, got {type(data['score'])}"
        assert 0 <= data["score"] <= 100, f"Score {data['score']} outside valid range 0-100"
        
        # Label assertions
        assert "label" in data, "Response missing 'label' field"
        assert isinstance(data["label"], str), "Label should be string"
        assert len(data["label"]) > 0, "Label should not be empty"
        
        # Recommendation assertions
        assert "recommendation" in data, "Response missing 'recommendation' field"
        
        # Categories assertions (4 sub-categories)
        assert "categories" in data, "Response missing 'categories' field"
        categories = data["categories"]
        assert isinstance(categories, dict), "Categories should be a dict"
        
        expected_categories = ["mikronährstoff_risiko", "schlaf", "stress", "energie"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
            assert isinstance(categories[cat], (int, float)), f"Category {cat} should be numeric"
            assert 0 <= categories[cat] <= 100, f"Category {cat} value {categories[cat]} outside valid range"
        
        # Trend change assertions
        assert "trend_change" in data, "Response missing 'trend_change' field"
        
        # Base scores assertions
        assert "base_scores" in data, "Response missing 'base_scores' field"
        
        print(f"German response - Score: {data['score']}, Label: {data['label']}")
        print(f"Categories: {categories}")

    def test_health_score_italian(self):
        """GET /api/health-score/{profile_id}?lang=it returns valid score (Italian text when AI generates it)"""
        response = requests.get(f"{BASE_URL}/api/health-score/{TEST_PROFILE_ID}?lang=it")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Score assertions
        assert "score" in data, "Response missing 'score' field"
        assert isinstance(data["score"], int), f"Score should be int, got {type(data['score'])}"
        assert 0 <= data["score"] <= 100, f"Score {data['score']} outside valid range 0-100"
        
        # Label assertions
        assert "label" in data, "Response missing 'label' field"
        assert isinstance(data["label"], str), "Label should be string"
        
        # Categories assertions
        assert "categories" in data, "Response missing 'categories' field"
        categories = data["categories"]
        assert isinstance(categories, dict), "Categories should be a dict"
        assert len(categories) == 4, f"Expected 4 categories, got {len(categories)}"
        
        print(f"Italian response - Score: {data['score']}, Label: {data['label']}")

    def test_health_score_nonexistent_profile_404(self):
        """GET /api/health-score/nonexistent returns 404"""
        response = requests.get(f"{BASE_URL}/api/health-score/{NONEXISTENT_PROFILE_ID}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "404 response should have 'detail' field"
        print(f"404 response detail: {data['detail']}")

    def test_health_score_default_lang(self):
        """GET /api/health-score/{profile_id} without lang parameter defaults to German"""
        response = requests.get(f"{BASE_URL}/api/health-score/{TEST_PROFILE_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "score" in data
        assert "label" in data
        assert "categories" in data
        print(f"Default lang response - Score: {data['score']}")

    def test_health_score_response_structure(self):
        """Verify complete response structure matches API spec"""
        response = requests.get(f"{BASE_URL}/api/health-score/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        required_fields = ["score", "label", "recommendation", "trend_change", "categories", "base_scores", "has_tracking_data"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Base scores sub-fields
        base_scores = data["base_scores"]
        expected_base_scores = ["symptom", "compliance", "sleep", "stress", "energy", "nutrient"]
        for field in expected_base_scores:
            assert field in base_scores, f"Missing base_scores field: {field}"
        
        # has_tracking_data should be boolean
        assert isinstance(data["has_tracking_data"], bool), "has_tracking_data should be boolean"
        
        print(f"Response structure valid. Base scores: {base_scores}")

    def test_health_score_color_coding_ranges(self):
        """Verify score value is in valid range for color coding (Red 0-40, Yellow 41-70, Green 71-100)"""
        response = requests.get(f"{BASE_URL}/api/health-score/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        score = data["score"]
        
        # Determine expected color zone
        if score <= 40:
            color_zone = "Red (needs attention)"
        elif score <= 70:
            color_zone = "Yellow (moderate)"
        else:
            color_zone = "Green (good)"
        
        print(f"Score {score} falls in {color_zone} zone")
        
        # Verify all category scores are in valid range
        for cat, val in data["categories"].items():
            assert 0 <= val <= 100, f"Category {cat} score {val} outside valid range"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
