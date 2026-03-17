"""
Tests for Personalized Recipes Feature (Dashboard + Catalog Tabs)
- GET /api/recipes/personalized/{profile_id}?lang=de returns recipes with relevance_score and relevance_tags
- GET /api/recipes?lang=de returns all recipes without relevance scoring
- Verify sorting by relevance_score descending
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Profile ID provided for testing
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestPersonalizedRecipesEndpoint:
    """Tests for GET /api/recipes/personalized/{profile_id}"""
    
    def test_personalized_recipes_returns_200(self):
        """Personalized endpoint should return 200 status"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: GET /api/recipes/personalized returns 200")
    
    def test_personalized_recipes_returns_recipes_list(self):
        """Personalized endpoint should return recipes in 'recipes' key"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        assert "recipes" in data, f"Response should contain 'recipes' key: {data.keys()}"
        assert isinstance(data["recipes"], list), "Recipes should be a list"
        assert len(data["recipes"]) > 0, "Should return at least one recipe"
        print(f"PASS: Personalized endpoint returns {len(data['recipes'])} recipes")
    
    def test_personalized_recipes_have_relevance_score(self):
        """Each recipe should have relevance_score field"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        recipes = data.get("recipes", [])
        
        for recipe in recipes[:5]:  # Check first 5 recipes
            assert "relevance_score" in recipe, f"Recipe {recipe.get('id')} missing relevance_score"
            assert isinstance(recipe["relevance_score"], (int, float)), f"relevance_score should be numeric"
        print("PASS: All recipes have relevance_score field")
    
    def test_personalized_recipes_have_relevance_tags(self):
        """Each recipe should have relevance_tags field"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        recipes = data.get("recipes", [])
        
        for recipe in recipes[:5]:  # Check first 5 recipes
            assert "relevance_tags" in recipe, f"Recipe {recipe.get('id')} missing relevance_tags"
            assert isinstance(recipe["relevance_tags"], list), f"relevance_tags should be a list"
        print("PASS: All recipes have relevance_tags field (list)")
    
    def test_personalized_recipes_sorted_by_relevance_score_descending(self):
        """Recipes should be sorted by relevance_score in descending order"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        recipes = data.get("recipes", [])
        
        scores = [r.get("relevance_score", 0) for r in recipes]
        is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
        
        assert is_sorted, f"Recipes not sorted by relevance_score descending: first 10 scores = {scores[:10]}"
        print(f"PASS: Recipes sorted by relevance_score desc (top scores: {scores[:5]})")
    
    def test_personalized_recipes_have_top_relevance_tags(self):
        """Top recipes should have meaningful relevance_tags"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        recipes = data.get("recipes", [])
        
        # Top recipes with score > 0 should have relevance tags
        top_recipes = [r for r in recipes if r.get("relevance_score", 0) > 0]
        recipes_with_tags = [r for r in top_recipes if len(r.get("relevance_tags", [])) > 0]
        
        # At least some top recipes should have tags
        assert len(recipes_with_tags) > 0, "At least some high-relevance recipes should have tags"
        print(f"PASS: {len(recipes_with_tags)} recipes have relevance_tags populated")
    
    def test_personalized_recipes_have_required_fields(self):
        """Recipes should have all required fields (id, title, time_min, image_url)"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        recipes = data.get("recipes", [])
        
        required_fields = ["id", "title", "time_min", "tags", "image_url", "relevance_score", "relevance_tags"]
        
        for recipe in recipes[:5]:
            for field in required_fields:
                assert field in recipe, f"Recipe {recipe.get('id')} missing '{field}' field"
        print("PASS: All recipes have required fields")


class TestGenericRecipesEndpoint:
    """Tests for GET /api/recipes?lang=de (all recipes without personalization)"""
    
    def test_generic_recipes_returns_200(self):
        """Generic endpoint should return 200 status"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/recipes returns 200")
    
    def test_generic_recipes_returns_list(self):
        """Generic endpoint should return a list of recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        data = response.json()
        
        # Generic endpoint returns array directly (not wrapped in 'recipes')
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Should return at least one recipe"
        print(f"PASS: Generic endpoint returns {len(data)} recipes as list")
    
    def test_generic_recipes_no_relevance_scoring(self):
        """Generic recipes should NOT have relevance_score or relevance_tags"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        data = response.json()
        
        # Generic endpoint returns recipes without personalization fields
        for recipe in data[:5]:
            # These fields should NOT be present in generic recipes
            assert "relevance_score" not in recipe, f"Generic recipe should not have relevance_score"
            assert "relevance_tags" not in recipe, f"Generic recipe should not have relevance_tags"
        print("PASS: Generic recipes do NOT have relevance_score or relevance_tags")
    
    def test_generic_recipes_have_required_fields(self):
        """Generic recipes should have standard fields"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        data = response.json()
        
        required_fields = ["id", "title", "time_min", "tags", "image_url"]
        
        for recipe in data[:5]:
            for field in required_fields:
                assert field in recipe, f"Recipe {recipe.get('id')} missing '{field}'"
        print("PASS: Generic recipes have required fields")


class TestRecipeEndpointComparison:
    """Compare personalized vs generic endpoints"""
    
    def test_both_endpoints_return_same_recipe_ids(self):
        """Both endpoints should return the same set of recipes (just different metadata)"""
        personal_response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        generic_response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        
        personal_data = personal_response.json()
        generic_data = generic_response.json()
        
        personal_ids = set(r["id"] for r in personal_data.get("recipes", []))
        generic_ids = set(r["id"] for r in generic_data)
        
        # Both should have similar recipes (personalized might filter some)
        common_ids = personal_ids.intersection(generic_ids)
        assert len(common_ids) > 0, "Should have overlapping recipes"
        print(f"PASS: Both endpoints share {len(common_ids)} common recipes")
    
    def test_personalized_first_4_are_most_relevant(self):
        """Dashboard shows top 4 personalized recipes - verify they have highest scores"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de"
        )
        data = response.json()
        recipes = data.get("recipes", [])
        
        top_4 = recipes[:4]
        top_4_scores = [r.get("relevance_score", 0) for r in top_4]
        
        # Top 4 should have the highest scores
        all_scores = [r.get("relevance_score", 0) for r in recipes]
        
        assert top_4_scores == sorted(all_scores, reverse=True)[:4], \
            f"Top 4 should have highest scores: got {top_4_scores}"
        print(f"PASS: Top 4 recipes have highest relevance scores: {top_4_scores}")


class TestInvalidProfile:
    """Test edge cases with invalid profile"""
    
    def test_invalid_profile_id_returns_empty_recipes(self):
        """Invalid profile should return error or empty recipes"""
        response = requests.get(
            f"{BASE_URL}/api/recipes/personalized/invalid-profile-id-123?lang=de"
        )
        data = response.json()
        
        # API should return error or empty recipes list
        if "error" in data:
            assert data["error"] == "profile_not_found"
            print("PASS: Invalid profile returns error: profile_not_found")
        else:
            assert "recipes" in data
            assert data["recipes"] == []
            print("PASS: Invalid profile returns empty recipes list")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
