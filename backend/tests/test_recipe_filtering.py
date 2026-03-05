"""
Test Recipe Filtering Bug Fix
- Bug 1: When user selects symptom chips, only matching catalog recipes should show (not all 30)
- Bug 1: When no chips selected, only LLM-generated recipes show (no catalog recipes)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or "https://personalize-meals.preview.emergentagent.com"

class TestRecipeFilteringBugFix:
    """Tests for recipe filtering based on symptom tags"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✅ Health check passed")
    
    def test_all_recipes_without_tags_returns_30(self):
        """GET /api/recipes?lang=de without tags returns all 30 recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 30, f"Expected 30 recipes, got {len(data)}"
        print(f"✅ All recipes endpoint returns {len(data)} recipes")
    
    def test_muedigkeit_filter_german(self):
        """GET /api/recipes?lang=de&tags=Müdigkeit returns filtered recipes (not all 30)"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Müdigkeit")
        assert response.status_code == 200
        data = response.json()
        # Should return only recipes with müdigkeit in symptom_tags
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        assert len(data) == 3, f"Expected 3 Müdigkeit recipes, got {len(data)}"
        
        # Verify each recipe has müdigkeit tag
        for recipe in data:
            symptom_tags_lower = [t.lower() for t in recipe.get("symptom_tags", [])]
            assert "müdigkeit" in symptom_tags_lower, f"Recipe {recipe.get('title')} missing müdigkeit tag"
        
        print(f"✅ Müdigkeit filter returns {len(data)} recipes (not all 30)")
    
    def test_stanchezza_filter_italian(self):
        """GET /api/recipes?lang=it&tags=stanchezza returns Italian filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it&tags=stanchezza")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        assert len(data) == 3, f"Expected 3 stanchezza recipes, got {len(data)}"
        
        # Verify Italian titles
        for recipe in data:
            assert recipe.get("title"), f"Recipe missing title"
            # Italian titles should not be German
            assert "Grüner" not in recipe.get("title", ""), "Recipe should be in Italian, not German"
        
        print(f"✅ Italian stanchezza filter returns {len(data)} recipes")
    
    def test_kopfschmerzen_filter(self):
        """GET /api/recipes?lang=de&tags=Kopfschmerzen returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Kopfschmerzen")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        
        # Verify each recipe has kopfschmerzen tag
        for recipe in data:
            symptom_tags_lower = [t.lower() for t in recipe.get("symptom_tags", [])]
            assert "kopfschmerzen" in symptom_tags_lower or "mal di testa" in symptom_tags_lower, \
                f"Recipe {recipe.get('title')} missing kopfschmerzen tag"
        
        print(f"✅ Kopfschmerzen filter returns {len(data)} recipes")
    
    def test_verdauung_filter(self):
        """GET /api/recipes?lang=de&tags=Verdauung returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Verdauung")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Verdauung filter returns {len(data)} recipes")
    
    def test_gelenkschmerzen_filter(self):
        """GET /api/recipes?lang=de&tags=Gelenkschmerzen returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Gelenkschmerzen")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Gelenkschmerzen filter returns {len(data)} recipes")
    
    def test_schlafprobleme_filter(self):
        """GET /api/recipes?lang=de&tags=Schlafprobleme returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Schlafprobleme")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Schlafprobleme filter returns {len(data)} recipes")
    
    def test_stress_filter(self):
        """GET /api/recipes?lang=de&tags=Stress returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Stress")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Stress filter returns {len(data)} recipes")
    
    def test_erkaeltung_filter(self):
        """GET /api/recipes?lang=de&tags=Erkältung returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Erkältung")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Erkältung filter returns {len(data)} recipes")
    
    def test_hautprobleme_filter(self):
        """GET /api/recipes?lang=de&tags=Hautprobleme returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Hautprobleme")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Hautprobleme filter returns {len(data)} recipes")
    
    def test_rueckenschmerzen_filter(self):
        """GET /api/recipes?lang=de&tags=Rückenschmerzen returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Rückenschmerzen")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Rückenschmerzen filter returns {len(data)} recipes")
    
    def test_konzentration_filter(self):
        """GET /api/recipes?lang=de&tags=Konzentration returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Konzentration")
        assert response.status_code == 200
        data = response.json()
        assert len(data) < 30, f"Expected fewer than 30 recipes, got {len(data)}"
        print(f"✅ Konzentration filter returns {len(data)} recipes")
    
    def test_recipe_structure_has_required_fields(self):
        """Verify recipe structure has all required fields for display"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        for recipe in data[:5]:  # Check first 5 recipes
            assert "id" in recipe, "Recipe missing id"
            assert "title" in recipe, "Recipe missing title"
            assert "image_url" in recipe, "Recipe missing image_url"
            assert "time_min" in recipe, "Recipe missing time_min"
            assert "ingredients" in recipe, "Recipe missing ingredients"
            assert "steps" in recipe, "Recipe missing steps"
            assert "symptom_tags" in recipe, "Recipe missing symptom_tags"
            
            # Image URL should be valid
            assert recipe["image_url"].startswith("http"), f"Invalid image_url: {recipe['image_url']}"
        
        print("✅ Recipe structure validation passed")
    
    def test_nonexistent_tag_returns_empty(self):
        """GET /api/recipes with non-matching tag returns empty list"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=nonexistenttag123")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0, f"Expected 0 recipes for non-existent tag, got {len(data)}"
        print("✅ Non-existent tag returns empty list")


class TestOtherEndpointsRegression:
    """Regression tests to ensure other endpoints still work"""
    
    def test_products_endpoint(self):
        """GET /api/products still works"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Products should not be empty"
        print(f"✅ Products endpoint returns {len(data)} products")
    
    def test_products_italian(self):
        """GET /api/products?lang=it still works"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Italian products should not be empty"
        print(f"✅ Italian products endpoint returns {len(data)} products")
    
    def test_diary_endpoint(self):
        """GET /api/diary still works"""
        response = requests.get(f"{BASE_URL}/api/diary")
        assert response.status_code == 200
        print("✅ Diary endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
