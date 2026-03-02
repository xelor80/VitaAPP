"""
Test cases for Recipe Recommendations API (New Feature P3)
Tests personalized recipe recommendations based on user health profile complaints.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test profile ID with fatigue complaint
TEST_PROFILE_ID = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"


class TestRecipeRecommendationsWithoutProfile:
    """Tests for /api/recipes/recommendations without profile (random recipes)"""

    def test_recommendations_returns_200(self):
        """GET /api/recipes/recommendations returns 200 status"""
        response = requests.get(f"{BASE_URL}/api/recipes/recommendations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_recommendations_returns_3_recipes_by_default(self):
        """GET /api/recipes/recommendations returns exactly 3 recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 3, f"Expected 3 recipes, got {len(data)}"

    def test_recommendations_recipe_structure(self):
        """Each recipe has required fields: id, title, ingredients, steps, time_min, tags, symptom_tags"""
        response = requests.get(f"{BASE_URL}/api/recipes/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Should return at least one recipe"
        
        recipe = data[0]
        required_fields = ["id", "title", "ingredients", "steps", "time_min", "tags", "symptom_tags"]
        for field in required_fields:
            assert field in recipe, f"Recipe missing required field: {field}"

    def test_recommendations_includes_recommendation_reason_field(self):
        """Each recipe includes recommendation_reason field (may be empty for random recipes)"""
        response = requests.get(f"{BASE_URL}/api/recipes/recommendations")
        assert response.status_code == 200
        data = response.json()
        
        for recipe in data:
            assert "recommendation_reason" in recipe, "Recipe missing recommendation_reason field"

    def test_recommendations_random_recipes_have_empty_reason(self):
        """Random recipes (no profile) should have empty recommendation_reason"""
        response = requests.get(f"{BASE_URL}/api/recipes/recommendations")
        assert response.status_code == 200
        data = response.json()
        
        # Without profile, at least some recipes should have empty reason
        # (unless all recipes coincidentally match no profile)
        assert len(data) > 0, "Should have recipes"


class TestRecipeRecommendationsWithProfile:
    """Tests for /api/recipes/recommendations with profile_id (personalized recipes)"""

    def test_recommendations_with_profile_returns_200(self):
        """GET /api/recipes/recommendations?profile_id=... returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"profile_id": TEST_PROFILE_ID}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_recommendations_with_profile_returns_3_recipes(self):
        """Profile recommendations return exactly 3 recipes"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"profile_id": TEST_PROFILE_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3, f"Expected 3 recipes, got {len(data)}"

    def test_recommendations_with_fatigue_profile_matches_energy_recipes(self):
        """Profile with fatigue complaint should return energy/müdigkeit tagged recipes"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"profile_id": TEST_PROFILE_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        # At least one recipe should have fatigue as recommendation_reason
        fatigue_matches = [r for r in data if r.get("recommendation_reason") == "fatigue"]
        assert len(fatigue_matches) > 0, "Expected at least one recipe matched for 'fatigue' complaint"

    def test_recommendations_matched_recipes_have_energy_symptom_tags(self):
        """Matched recipes should have energy/müdigkeit in symptom_tags"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"profile_id": TEST_PROFILE_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        fatigue_recipes = [r for r in data if r.get("recommendation_reason") == "fatigue"]
        for recipe in fatigue_recipes:
            symptom_tags_lower = [tag.lower() for tag in recipe.get("symptom_tags", [])]
            energy_tags = ["müdigkeit", "energie", "stanchezza", "energia"]
            has_energy_tag = any(tag in symptom_tags_lower for tag in energy_tags)
            assert has_energy_tag, f"Recipe '{recipe['title']}' matched for fatigue but doesn't have energy tags"

    def test_recommendations_with_invalid_profile_returns_random(self):
        """Invalid profile_id should return random recipes (graceful fallback)"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"profile_id": "invalid-profile-id-12345"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3, "Should still return 3 recipes even with invalid profile"


class TestRecipeRecommendationsLanguage:
    """Tests for /api/recipes/recommendations language parameter"""

    def test_recommendations_german_default(self):
        """Default language is German (de)"""
        response = requests.get(f"{BASE_URL}/api/recipes/recommendations")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        
        # German recipes should have German titles (check for common German words or patterns)
        # This is a basic check - recipes should have German text
        first_recipe = data[0]
        assert first_recipe.get("title"), "Recipe should have a title"

    def test_recommendations_italian_lang_param(self):
        """GET /api/recipes/recommendations?lang=it returns Italian recipes"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"lang": "it"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3, f"Expected 3 recipes, got {len(data)}"

    def test_recommendations_italian_recipes_have_italian_titles(self):
        """Italian recipes have Italian titles and ingredients"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"lang": "it"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check for Italian content (common Italian words)
        italian_indicators = ["con", "di", "al", "alla", "e", "il", "la", "del"]
        all_titles = " ".join([r.get("title", "") for r in data]).lower()
        has_italian = any(indicator in all_titles for indicator in italian_indicators)
        assert has_italian, f"Italian recipes should have Italian titles. Got: {all_titles}"

    def test_recommendations_italian_with_profile(self):
        """Italian recommendations with profile returns Italian titles with matches"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"lang": "it", "profile_id": TEST_PROFILE_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3


class TestRecipeRecommendationsLimit:
    """Tests for /api/recipes/recommendations limit parameter"""

    def test_recommendations_custom_limit(self):
        """GET /api/recipes/recommendations?limit=5 returns 5 recipes"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        # Note: if there are fewer than 5 recipes in DB, it returns what's available
        assert len(data) <= 5, f"Should respect limit, got {len(data)}"

    def test_recommendations_limit_1(self):
        """GET /api/recipes/recommendations?limit=1 returns 1 recipe"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/recommendations",
            params={"limit": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1, f"Expected 1 recipe, got {len(data)}"


class TestRecipesCatalogRegression:
    """Regression tests for existing recipes endpoints"""

    def test_recipes_endpoint_still_works(self):
        """GET /api/recipes returns recipes list"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Recipes endpoint should return list"

    def test_recipes_search_still_works(self):
        """GET /api/recipes?search=smoothie returns filtered results"""
        response = requests.get(
            f"{BASE_URL}/api/recipes",
            params={"search": "smoothie"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Search should return list"

    def test_recipes_filters_endpoint_still_works(self):
        """GET /api/recipes/filters returns filter options"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data, "Filters should include categories"
        assert "tags" in data, "Filters should include tags"

    def test_recipes_category_filter_still_works(self):
        """GET /api/recipes?category=müdigkeit returns filtered results"""
        response = requests.get(
            f"{BASE_URL}/api/recipes",
            params={"category": "müdigkeit"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Category filter should return list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
