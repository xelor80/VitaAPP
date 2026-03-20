"""
MongoDB Atlas Migration Verification Tests - Iteration 74

This test file verifies that all API endpoints work correctly after
migration from local MongoDB to MongoDB Atlas.

Test Categories:
1. Health Profile endpoints
2. Products endpoints (DE and IT)
3. Recipes endpoints
4. Admin auth
5. Water tracking
6. Medications
7. Settings/translations
8. Supplement plan
9. Daily tasks
"""

import pytest
import requests
import os

# Use the external API URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vero-rewards.preview.emergentagent.com').rstrip('/')

# Test credentials from the testing request
TEST_PROFILE_ID = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"
ADMIN_PASSWORD = "Wk220480xel!"


@pytest.fixture
def api_client():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthProfile:
    """Health profile endpoint tests - Verify MongoDB Atlas connectivity."""
    
    def test_get_health_profile(self, api_client):
        """GET /api/health-profile/{profile_id} - should return profile and assessment."""
        response = api_client.get(f"{BASE_URL}/api/health-profile/{TEST_PROFILE_ID}")
        print(f"Health profile response status: {response.status_code}")
        
        # Accept both 200 (found) and 404 (not found - profile may not exist)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}, body: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Health profile data keys: {data.keys()}")
            assert "profile" in data or "assessment" in data
            print(f"✓ Health profile endpoint working with Atlas")
        else:
            print(f"⚠ Profile not found (404) - this may be expected if test profile doesn't exist")
    
    def test_get_health_assessment(self, api_client):
        """GET /api/health-profile/{profile_id}/assessment - should return assessment."""
        response = api_client.get(f"{BASE_URL}/api/health-profile/{TEST_PROFILE_ID}/assessment?lang=de")
        print(f"Health assessment response status: {response.status_code}")
        
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "profile_id" in data
            assert "assessment" in data
            print(f"✓ Health assessment endpoint working with Atlas")
        else:
            print(f"⚠ Profile not found for assessment")


class TestRecipes:
    """Recipes endpoint tests - Critical for migration verification."""
    
    def test_get_all_recipes_de(self, api_client):
        """GET /api/recipes?lang=de - should return all 37 recipes."""
        response = api_client.get(f"{BASE_URL}/api/recipes?lang=de")
        print(f"Recipes (DE) response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}, {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of recipes"
        recipe_count = len(data)
        print(f"✓ Recipes (DE) returned: {recipe_count} recipes")
        
        # Verify expected count (around 37)
        assert recipe_count > 30, f"Expected 30+ recipes, got {recipe_count}"
        
        # Verify recipe structure
        if data:
            first_recipe = data[0]
            assert "id" in first_recipe
            assert "title" in first_recipe
            print(f"✓ Recipe structure valid: {first_recipe.get('title', 'unknown')[:50]}")
    
    def test_get_personalized_recipes(self, api_client):
        """GET /api/recipes/personalized/{profile_id}?lang=de - should return personalized recipes."""
        response = api_client.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        print(f"Personalized recipes response status: {response.status_code}")
        
        # Should return 200 even if profile not found (returns empty or error object)
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        print(f"✓ Personalized recipes endpoint responding")
        
        # If recipes returned, verify structure
        if "recipes" in data and data["recipes"]:
            first_recipe = data["recipes"][0]
            assert "id" in first_recipe
            assert "relevance_score" in first_recipe
            print(f"✓ Personalized recipe structure valid with relevance_score")


class TestProducts:
    """Products endpoint tests - Verify product collections migrated."""
    
    def test_get_all_products_de(self, api_client):
        """GET /api/products?lang=de - should return 111 products."""
        response = api_client.get(f"{BASE_URL}/api/products?lang=de")
        print(f"Products (DE) response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}, {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of products"
        product_count = len(data)
        print(f"✓ Products (DE) returned: {product_count} products")
        
        # Verify expected count (around 111)
        assert product_count > 100, f"Expected 100+ products, got {product_count}"
        
        # Verify product structure
        if data:
            first_product = data[0]
            assert "name" in first_product or "product_id" in first_product
            print(f"✓ Product structure valid")
    
    def test_get_all_products_it(self, api_client):
        """GET /api/products?lang=it - should return Italian products."""
        response = api_client.get(f"{BASE_URL}/api/products?lang=it")
        print(f"Products (IT) response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of products"
        product_count = len(data)
        print(f"✓ Products (IT) returned: {product_count} products")


class TestAdminAuth:
    """Admin authentication tests."""
    
    def test_admin_auth_success(self, api_client):
        """POST /api/admin/auth with correct password - should return success and token."""
        response = api_client.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        print(f"Admin auth response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}, {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        print(f"✓ Admin auth successful, token received")
    
    def test_admin_auth_failure(self, api_client):
        """POST /api/admin/auth with wrong password - should return 401."""
        response = api_client.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": "wrong_password"}
        )
        print(f"Admin auth (wrong password) response status: {response.status_code}")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Admin auth correctly rejects wrong password")


class TestWaterTracking:
    """Water tracking endpoint tests."""
    
    def test_get_water_tracking_data(self, api_client):
        """GET /api/water-tracking/{profile_id} - verify endpoint works."""
        # The endpoint expects /today or /history suffix
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/today")
        print(f"Water tracking response status: {response.status_code}")
        
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "date" in data or "total_ml" in data
            print(f"✓ Water tracking endpoint working")
        else:
            print(f"⚠ No water tracking data found")
    
    def test_get_water_reminders(self, api_client):
        """GET /api/water-tracking/{profile_id}/water-reminders - water reminder settings."""
        response = api_client.get(f"{BASE_URL}/api/water-tracking/{TEST_PROFILE_ID}/water-reminders")
        print(f"Water reminders response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        # Should return default settings or user settings
        assert "enabled" in data or "interval_hours" in data
        print(f"✓ Water reminders endpoint working")


class TestMedications:
    """Medications endpoint tests."""
    
    def test_get_medications(self, api_client):
        """GET /api/medications/{profile_id} - medication data."""
        response = api_client.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}")
        print(f"Medications response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert "medications" in data
        print(f"✓ Medications endpoint working, count: {len(data['medications'])}")


class TestSettings:
    """Settings/translations endpoint tests."""
    
    def test_get_translations_de(self, api_client):
        """GET /api/settings/translations/de - translation data."""
        # First try the specific translation endpoint
        response = api_client.get(f"{BASE_URL}/api/settings/translations")
        print(f"Translations response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert "translations" in data
        print(f"✓ Translations endpoint working, count: {len(data['translations'])}")
    
    def test_get_symptom_chips(self, api_client):
        """GET /api/settings/symptom-chips - symptom chips data."""
        response = api_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        print(f"Symptom chips response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert "chips" in data
        print(f"✓ Symptom chips endpoint working, count: {len(data['chips'])}")


class TestSupplementPlan:
    """Supplement plan endpoint tests."""
    
    def test_get_supplement_plan(self, api_client):
        """GET /api/supplement-plan/{profile_id} - supplement plan."""
        response = api_client.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}")
        print(f"Supplement plan response status: {response.status_code}")
        
        # 404 is acceptable if no plan exists for this profile
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "plan" in data or "profile_id" in data
            print(f"✓ Supplement plan endpoint working")
        else:
            print(f"⚠ No supplement plan found for profile")


class TestDailyTasks:
    """Daily tasks endpoint tests."""
    
    def test_get_daily_tasks(self, api_client):
        """GET /api/daily-tasks/{profile_id} - daily tasks."""
        response = api_client.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_ID}?lang=de")
        print(f"Daily tasks response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert "tasks" in data
        print(f"✓ Daily tasks endpoint working, tasks count: {len(data['tasks'])}")


class TestOnboardingOptions:
    """Onboarding options endpoint tests."""
    
    def test_get_onboarding_options(self, api_client):
        """GET /api/onboarding/options - onboarding form options."""
        response = api_client.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        print(f"Onboarding options response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        # Verify expected option categories exist
        assert "genders" in data
        assert "diets" in data
        assert "activity_levels" in data
        print(f"✓ Onboarding options endpoint working")


class TestRecipeFilters:
    """Recipe filters endpoint tests."""
    
    def test_get_recipe_filters(self, api_client):
        """GET /api/recipes/filters - recipe filter options."""
        response = api_client.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        print(f"Recipe filters response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert "categories" in data or "tags" in data
        print(f"✓ Recipe filters endpoint working")


class TestProductsByNutrient:
    """Products by nutrient endpoint tests."""
    
    def test_get_products_by_nutrient(self, api_client):
        """GET /api/products/by-nutrient/vitamin_d - products for specific nutrient."""
        response = api_client.get(f"{BASE_URL}/api/products/by-nutrient/vitamin_d?lang=de")
        print(f"Products by nutrient response status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        data = response.json()
        assert "products" in data
        print(f"✓ Products by nutrient endpoint working, count: {len(data['products'])}")


# Summary test to verify overall database connectivity
class TestDatabaseConnectivity:
    """Overall database connectivity verification."""
    
    def test_database_connection_verified(self, api_client):
        """Verify multiple collections are accessible."""
        results = {}
        
        # Test recipes collection
        r1 = api_client.get(f"{BASE_URL}/api/recipes?lang=de")
        results["recipes"] = r1.status_code == 200 and len(r1.json()) > 0
        
        # Test products collection
        r2 = api_client.get(f"{BASE_URL}/api/products?lang=de")
        results["products_de"] = r2.status_code == 200 and len(r2.json()) > 0
        
        # Test translations
        r3 = api_client.get(f"{BASE_URL}/api/settings/translations")
        results["translations"] = r3.status_code == 200
        
        # Test symptom chips
        r4 = api_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        results["symptom_chips"] = r4.status_code == 200
        
        print(f"\n=== MongoDB Atlas Migration Verification ===")
        for collection, success in results.items():
            status = "✓" if success else "✗"
            print(f"  {status} {collection}: {'OK' if success else 'FAILED'}")
        
        # All critical collections should be accessible
        assert all(results.values()), f"Some collections failed: {results}"
        print(f"\n✓ All tested collections accessible via MongoDB Atlas")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
