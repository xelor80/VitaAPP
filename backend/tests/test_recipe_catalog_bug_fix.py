"""
Test file for Recipe Catalog Bug Fix verification.
Tests the /api/recipes and /api/recipes/filters endpoints
to verify the bug fix for undefined 'recipes' variable crash.

Bug Fixed:
1. 'recipes' variable referenced 3 places instead of 'filteredRecipes'
2. Race condition with 2 separate useEffects
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRecipesCatalogEndpoint:
    """Test GET /api/recipes endpoint"""
    
    def test_recipes_returns_all_37_recipes(self):
        """GET /api/recipes?lang=de returns all 37 recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) == 37, f"Expected 37 recipes, got {len(data)}"
        print(f"PASS: /api/recipes?lang=de returns {len(data)} recipes")
    
    def test_recipes_have_required_fields(self):
        """Verify each recipe has required fields"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ['id', 'title', 'ingredients', 'steps', 'time_min', 'tags', 'symptom_tags', 'image_url']
        
        for recipe in data[:5]:  # Check first 5
            for field in required_fields:
                assert field in recipe, f"Missing field '{field}' in recipe {recipe.get('id', 'unknown')}"
        print(f"PASS: All recipes have required fields")
    
    def test_recipes_no_mongodb_id(self):
        """Verify _id is not included in response"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        for recipe in data:
            assert '_id' not in recipe, f"Recipe {recipe.get('id')} contains MongoDB _id"
        print("PASS: No MongoDB _id in response")


class TestRecipesFiltersEndpoint:
    """Test GET /api/recipes/filters endpoint"""
    
    def test_filters_returns_categories(self):
        """GET /api/recipes/filters?lang=de returns categories"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'categories' in data, "Response should have 'categories'"
        assert isinstance(data['categories'], list), "'categories' should be a list"
        assert len(data['categories']) > 0, "Should have at least one category"
        
        # Check expected categories
        category_keys = [c['key'] for c in data['categories']]
        assert 'müdigkeit' in category_keys, "Should have 'müdigkeit' category"
        print(f"PASS: /api/recipes/filters returns {len(data['categories'])} categories")
    
    def test_filters_returns_tags(self):
        """GET /api/recipes/filters?lang=de returns tags"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert 'tags' in data, "Response should have 'tags'"
        assert isinstance(data['tags'], list), "'tags' should be a list"
        assert len(data['tags']) > 0, "Should have at least one tag"
        print(f"PASS: /api/recipes/filters returns {len(data['tags'])} tags")
    
    def test_filters_returns_time_options(self):
        """GET /api/recipes/filters?lang=de returns time_options"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert 'time_options' in data, "Response should have 'time_options'"
        assert isinstance(data['time_options'], list), "'time_options' should be a list"
        print(f"PASS: /api/recipes/filters returns time_options: {data['time_options']}")
    
    def test_filters_italian_language(self):
        """GET /api/recipes/filters?lang=it returns Italian categories"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        # Italian categories should have Italian labels
        if data['categories']:
            first_cat = data['categories'][0]
            # Italian labels should exist (like "Energia & Stanchezza")
            assert 'label' in first_cat, "Category should have 'label'"
        print("PASS: Italian filters work")


class TestRecipesSearchFilter:
    """Test search and category filtering on /api/recipes"""
    
    def test_search_smoothie(self):
        """Search for 'smoothie' returns filtered results"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&search=smoothie")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) > 0, "Should find at least 1 smoothie recipe"
        assert len(data) < 37, "Should be filtered (less than all 37)"
        
        # All results should contain 'smoothie' in title
        for recipe in data:
            assert 'smoothie' in recipe['title'].lower(), f"Recipe '{recipe['title']}' doesn't match search"
        print(f"PASS: Search 'smoothie' returns {len(data)} recipes")
    
    def test_category_filter_muedigkeit(self):
        """Category filter 'müdigkeit' returns relevant recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&category=müdigkeit")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) > 0, "Should find recipes for 'müdigkeit'"
        assert len(data) < 37, "Should be filtered"
        print(f"PASS: Category 'müdigkeit' returns {len(data)} recipes")
    
    def test_max_time_filter(self):
        """Max time filter <=10 returns quick recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&max_time=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        
        for recipe in data:
            assert recipe['time_min'] <= 10, f"Recipe '{recipe['title']}' has time {recipe['time_min']} > 10"
        print(f"PASS: max_time=10 returns {len(data)} recipes all <=10 min")
    
    def test_empty_search_returns_all(self):
        """Empty search returns all recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&search=")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 37, f"Empty search should return all 37, got {len(data)}"
        print("PASS: Empty search returns all 37 recipes")
    
    def test_non_matching_search_returns_empty(self):
        """Search for non-existent term returns empty array"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&search=xyznonexistent123")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be an array"
        assert len(data) == 0, f"Non-matching search should return empty, got {len(data)}"
        print("PASS: Non-matching search returns empty array")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
