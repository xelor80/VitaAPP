"""
Test suite for Recipe Catalog Feature (P1)
Tests the new searchable/filterable recipe catalog API endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRecipeCatalogAPI:
    """Tests for GET /api/recipes and GET /api/recipes/filters"""

    # ==================== GET /api/recipes ====================

    def test_get_all_recipes_returns_30(self):
        """GET /api/recipes returns all 30 recipes when no filters"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 30, f"Expected 30 recipes, got {len(data)}"
        
        # Verify recipe structure
        recipe = data[0]
        assert "id" in recipe
        assert "title" in recipe
        assert "ingredients" in recipe
        assert "steps" in recipe
        assert "time_min" in recipe
        assert "tags" in recipe
        assert "symptom_tags" in recipe

    def test_search_smoothie_returns_correct_results(self):
        """GET /api/recipes?search=smoothie returns only smoothie recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?search=smoothie")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5, f"Expected 5 smoothie recipes, got {len(data)}"
        
        # All should have 'smoothie' in title (case-insensitive)
        for recipe in data:
            assert "smoothie" in recipe["title"].lower(), f"Recipe '{recipe['title']}' doesn't contain 'smoothie'"

    def test_search_case_insensitive(self):
        """Search is case-insensitive"""
        response1 = requests.get(f"{BASE_URL}/api/recipes?search=SMOOTHIE")
        response2 = requests.get(f"{BASE_URL}/api/recipes?search=smoothie")
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert len(response1.json()) == len(response2.json())

    def test_category_filter_muedigkeit(self):
        """GET /api/recipes?category=müdigkeit returns only energy/fatigue recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?category=müdigkeit")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3, f"Expected 3 müdigkeit recipes, got {len(data)}"
        
        # All should have müdigkeit in symptom_tags
        for recipe in data:
            tags_lower = [t.lower() for t in recipe["symptom_tags"]]
            assert any("müdigkeit" in t for t in tags_lower), f"Recipe '{recipe['title']}' doesn't have müdigkeit tag"

    def test_max_time_filter_10_min(self):
        """GET /api/recipes?max_time=10 returns only quick recipes (≤10 min)"""
        response = requests.get(f"{BASE_URL}/api/recipes?max_time=10")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 19, f"Expected 19 quick recipes, got {len(data)}"
        
        # All should be ≤10 min
        for recipe in data:
            assert recipe["time_min"] <= 10, f"Recipe '{recipe['title']}' has time {recipe['time_min']} > 10"

    def test_max_time_filter_5_min(self):
        """GET /api/recipes?max_time=5 returns only 5-min recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?max_time=5")
        assert response.status_code == 200
        data = response.json()
        
        # All should be ≤5 min
        for recipe in data:
            assert recipe["time_min"] <= 5, f"Recipe '{recipe['title']}' has time {recipe['time_min']} > 5"

    def test_combined_filters(self):
        """Test multiple filters combined"""
        response = requests.get(f"{BASE_URL}/api/recipes?search=smoothie&max_time=10")
        assert response.status_code == 200
        data = response.json()
        
        for recipe in data:
            assert "smoothie" in recipe["title"].lower()
            assert recipe["time_min"] <= 10

    def test_italian_language_recipes(self):
        """GET /api/recipes?lang=it returns Italian recipe names"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 30
        
        # First recipe should be in Italian
        first = data[0]
        assert first["title"] == "Smoothie Verde Energizzante", f"Expected Italian title, got '{first['title']}'"

    def test_empty_search_returns_all(self):
        """Empty search returns all recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?search=")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 30

    def test_search_no_results(self):
        """Search with no matches returns empty list"""
        response = requests.get(f"{BASE_URL}/api/recipes?search=xyznonexistent123")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0

    # ==================== GET /api/recipes/filters ====================

    def test_get_filters_german(self):
        """GET /api/recipes/filters?lang=de returns German filter options"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        assert "tags" in data
        assert "time_options" in data
        
        # Check categories structure
        assert len(data["categories"]) == 10, f"Expected 10 categories, got {len(data['categories'])}"
        cat_keys = [c["key"] for c in data["categories"]]
        assert "müdigkeit" in cat_keys
        assert "kopfschmerzen" in cat_keys
        assert "stress" in cat_keys
        
        # Check German labels
        muedigkeit_cat = next(c for c in data["categories"] if c["key"] == "müdigkeit")
        assert muedigkeit_cat["label"] == "Energie & Müdigkeit"
        
        # Check time options
        assert 5 in data["time_options"]
        assert 10 in data["time_options"]
        assert 30 in data["time_options"]

    def test_get_filters_italian(self):
        """GET /api/recipes/filters?lang=it returns Italian filter options"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        # Check Italian categories
        assert len(data["categories"]) == 10
        cat_keys = [c["key"] for c in data["categories"]]
        assert "stanchezza" in cat_keys
        assert "mal di testa" in cat_keys
        
        # Check Italian labels
        stanchezza_cat = next(c for c in data["categories"] if c["key"] == "stanchezza")
        assert stanchezza_cat["label"] == "Energia & Stanchezza"
        
        # Check Italian tags exist
        assert "vegano" in data["tags"]  # "vegan" in Italian

    def test_filters_tags_sorted(self):
        """Tags should be sorted alphabetically"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        data = response.json()
        tags = data["tags"]
        assert tags == sorted(tags), "Tags should be sorted alphabetically"

    def test_filters_time_options_sorted(self):
        """Time options should be sorted numerically"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        data = response.json()
        times = data["time_options"]
        assert times == sorted(times), "Time options should be sorted"


class TestRecipeById:
    """Tests for GET /api/recipes/{recipe_id}"""

    def test_get_recipe_by_id_german(self):
        """GET /api/recipes/{id}?lang=de returns recipe in German"""
        response = requests.get(f"{BASE_URL}/api/recipes/gruener-energie-smoothie?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "gruener-energie-smoothie"
        assert data["title"] == "Grüner Energie-Smoothie"
        assert isinstance(data["ingredients"], list)
        assert len(data["ingredients"]) > 0

    def test_get_recipe_by_id_italian(self):
        """GET /api/recipes/{id}?lang=it returns recipe in Italian"""
        response = requests.get(f"{BASE_URL}/api/recipes/gruener-energie-smoothie?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == "gruener-energie-smoothie"
        assert data["title"] == "Smoothie Verde Energizzante"

    def test_get_recipe_nonexistent(self):
        """GET /api/recipes/{invalid_id} returns error"""
        response = requests.get(f"{BASE_URL}/api/recipes/nonexistent-recipe-xyz")
        assert response.status_code == 200  # Returns 200 with error object
        data = response.json()
        assert "error" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
