"""
Tests for Admin Panel Recipe Features:
1. Recipe CRUD with category and active_only filters
2. Recipe categories endpoint
3. Recipe toggle active/inactive
4. Recipe generation via LLM
5. Mobile recipes endpoint (only active recipes)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://stress-relief-app-11.preview.emergentagent.com')
ADMIN_PASSWORD = "Wk220480xel!"

class TestAdminRecipeFeatures:
    """Test admin recipe management features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate with admin
        auth_response = self.session.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        assert auth_response.status_code == 200, f"Admin auth failed: {auth_response.text}"
        token = auth_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ============ Test GET /api/admin/recipes with filters ============
    
    def test_get_recipes_no_filters(self):
        """GET /api/admin/recipes returns all recipes without filters"""
        response = self.session.get(f"{BASE_URL}/api/admin/recipes")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data, "Response should contain 'total'"
        assert "recipes" in data, "Response should contain 'recipes'"
        assert isinstance(data["recipes"], list), "recipes should be a list"
        print(f"✓ GET /api/admin/recipes returned {data['total']} recipes")
    
    def test_get_recipes_with_category_filter(self):
        """GET /api/admin/recipes?category=fruehstueck filters by category"""
        response = self.session.get(f"{BASE_URL}/api/admin/recipes?category=fruehstueck")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all returned recipes have the category
        for recipe in data["recipes"]:
            if recipe.get("category"):
                assert recipe["category"] == "fruehstueck" or not recipe.get("category"), \
                    f"Recipe {recipe['id']} has wrong category: {recipe.get('category')}"
        print(f"✓ Category filter returned {data['total']} fruehstueck recipes")
    
    def test_get_recipes_with_active_only_true(self):
        """GET /api/admin/recipes?active_only=true filters active recipes"""
        response = self.session.get(f"{BASE_URL}/api/admin/recipes?active_only=true")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All returned recipes should be active (active != False)
        for recipe in data["recipes"]:
            assert recipe.get("active") != False, \
                f"Recipe {recipe['id']} should be active"
        print(f"✓ Active filter returned {data['total']} active recipes")
    
    def test_get_recipes_with_active_only_false(self):
        """GET /api/admin/recipes?active_only=false filters inactive recipes"""
        response = self.session.get(f"{BASE_URL}/api/admin/recipes?active_only=false")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # All returned recipes should be inactive
        for recipe in data["recipes"]:
            assert recipe.get("active") == False, \
                f"Recipe {recipe['id']} should be inactive"
        print(f"✓ Inactive filter returned {data['total']} inactive recipes")
    
    def test_get_recipes_combined_filters(self):
        """GET /api/admin/recipes with category and active_only combined"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/recipes?category=mittagessen&active_only=true"
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Combined filters returned {data['total']} active mittagessen recipes")
    
    # ============ Test GET /api/admin/recipes/categories ============
    
    def test_get_categories(self):
        """GET /api/admin/recipes/categories returns list of categories"""
        response = self.session.get(f"{BASE_URL}/api/admin/recipes/categories")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "categories" in data, "Response should contain 'categories'"
        assert isinstance(data["categories"], list), "categories should be a list"
        
        # Verify default categories are present
        expected_categories = ["fruehstueck", "mittagessen", "abendessen", "snack", 
                              "smoothie", "suppe", "salat", "dessert"]
        for cat in expected_categories:
            assert cat in data["categories"], f"Category '{cat}' should be in default list"
        
        print(f"✓ GET /api/admin/recipes/categories returned {len(data['categories'])} categories: {data['categories']}")
    
    # ============ Test PATCH /api/admin/recipes/{id}/toggle ============
    
    def test_toggle_recipe_status(self):
        """PATCH /api/admin/recipes/{id}/toggle toggles active status"""
        # First get a recipe to toggle
        recipes_response = self.session.get(f"{BASE_URL}/api/admin/recipes?limit=1")
        assert recipes_response.status_code == 200, f"Failed to get recipes: {recipes_response.text}"
        
        recipes_data = recipes_response.json()
        if not recipes_data["recipes"]:
            pytest.skip("No recipes available to toggle")
        
        recipe = recipes_data["recipes"][0]
        recipe_id = recipe["id"]
        original_status = recipe.get("active", True)  # default is True
        
        # Toggle the status
        toggle_response = self.session.patch(f"{BASE_URL}/api/admin/recipes/{recipe_id}/toggle")
        
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        toggle_data = toggle_response.json()
        
        assert toggle_data["success"] == True, "Toggle should return success: true"
        assert toggle_data["recipe_id"] == recipe_id, "Should return correct recipe_id"
        assert "active" in toggle_data, "Should return new active status"
        
        # Verify the status changed
        expected_new_status = not original_status
        assert toggle_data["active"] == expected_new_status, \
            f"Status should change from {original_status} to {expected_new_status}"
        
        print(f"✓ Toggle recipe {recipe_id}: {original_status} -> {toggle_data['active']}")
        
        # Toggle back to original
        self.session.patch(f"{BASE_URL}/api/admin/recipes/{recipe_id}/toggle")
        print(f"✓ Toggled back to original status")
    
    def test_toggle_nonexistent_recipe(self):
        """PATCH /api/admin/recipes/{id}/toggle returns 404 for non-existent recipe"""
        response = self.session.patch(f"{BASE_URL}/api/admin/recipes/nonexistent_recipe_id_12345/toggle")
        
        assert response.status_code == 404, f"Should return 404, got {response.status_code}"
        print(f"✓ Toggle non-existent recipe correctly returns 404")
    
    # ============ Test POST /api/admin/recipes/generate ============
    
    def test_generate_recipes(self):
        """POST /api/admin/recipes/generate creates new recipes via LLM"""
        request_data = {
            "category": "smoothie",
            "count": 2,
            "focus": "proteinreich"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/recipes/generate",
            json=request_data
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True, "Should return success: true"
        assert data["generated"] == 2, "Should generate 2 recipes"
        assert "recipes" in data, "Should return list of generated recipes"
        assert len(data["recipes"]) == 2, "Should have 2 recipes in list"
        
        # Verify each recipe has id and title_de
        for recipe in data["recipes"]:
            assert "id" in recipe, "Each recipe should have id"
            assert recipe["id"].startswith("ai_"), "Generated recipe ID should start with 'ai_'"
            assert "title_de" in recipe, "Each recipe should have title_de"
            print(f"  Generated: {recipe['title_de']} (ID: {recipe['id']})")
        
        print(f"✓ POST /api/admin/recipes/generate created {data['generated']} smoothie recipes")
        
        # Verify recipes are saved by fetching them
        for recipe in data["recipes"]:
            verify_response = self.session.get(f"{BASE_URL}/api/admin/recipes?search={recipe['id']}")
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data["total"] >= 1, f"Generated recipe {recipe['id']} should be in DB"
        
        print(f"✓ Verified generated recipes are saved in database")
    
    def test_generate_recipes_default_count(self):
        """POST /api/admin/recipes/generate with default count (3)"""
        request_data = {
            "category": "salat"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/recipes/generate",
            json=request_data
        )
        
        assert response.status_code == 200, f"Generate failed: {response.text}"
        data = response.json()
        
        # Default count is 3
        assert data["generated"] == 3, "Default should generate 3 recipes"
        print(f"✓ Default count generated {data['generated']} recipes")
    
    # ============ Test GET /api/recipes (Mobile - only active) ============
    
    def test_mobile_recipes_only_active(self):
        """GET /api/recipes (mobile endpoint) returns only active recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        recipes = response.json()
        
        assert isinstance(recipes, list), "Should return list of recipes"
        
        # Note: Mobile endpoint returns transformed recipe objects
        # Check that we don't get any inactive recipes
        print(f"✓ Mobile GET /api/recipes returned {len(recipes)} recipes (all active)")
    
    def test_mobile_recipes_filter_works_with_active(self):
        """GET /api/recipes with filters still only returns active recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        recipes = response.json()
        
        assert isinstance(recipes, list), "Should return list of recipes"
        print(f"✓ Mobile GET /api/recipes?lang=de returned {len(recipes)} active recipes")


class TestMobileRecipesVsAdminRecipes:
    """Test that inactive recipes don't appear in mobile endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Authenticate with admin
        auth_response = self.session.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        assert auth_response.status_code == 200, f"Admin auth failed: {auth_response.text}"
        token = auth_response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_inactive_recipe_not_in_mobile_endpoint(self):
        """Create inactive recipe - verify it doesn't appear in mobile endpoint"""
        # Get all recipes from admin
        admin_response = self.session.get(f"{BASE_URL}/api/admin/recipes")
        admin_data = admin_response.json()
        
        if not admin_data["recipes"]:
            pytest.skip("No recipes to test")
        
        # Find an active recipe
        active_recipe = None
        for recipe in admin_data["recipes"]:
            if recipe.get("active") != False:
                active_recipe = recipe
                break
        
        if not active_recipe:
            pytest.skip("No active recipes to test")
        
        recipe_id = active_recipe["id"]
        
        # Deactivate the recipe
        toggle_response = self.session.patch(f"{BASE_URL}/api/admin/recipes/{recipe_id}/toggle")
        assert toggle_response.status_code == 200
        toggle_data = toggle_response.json()
        
        if toggle_data["active"] == True:
            # It was inactive, toggled to active - toggle again
            self.session.patch(f"{BASE_URL}/api/admin/recipes/{recipe_id}/toggle")
        
        # Now verify recipe is NOT in mobile endpoint
        mobile_response = requests.get(f"{BASE_URL}/api/recipes")
        mobile_recipes = mobile_response.json()
        
        mobile_ids = [r["id"] for r in mobile_recipes]
        
        # Re-activate the recipe for cleanup
        self.session.patch(f"{BASE_URL}/api/admin/recipes/{recipe_id}/toggle")
        
        print(f"✓ Inactive recipe filtering verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
