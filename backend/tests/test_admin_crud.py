"""
Admin Panel API Tests - Testing CRUD operations for Products and Recipes
Tests: Admin stats, Products CRUD (DE/IT), Recipes CRUD, Affiliate clicks
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://vero-rewards.preview.emergentagent.com')

class TestAdminHealth:
    """Admin health and stats endpoints"""
    
    def test_admin_health(self):
        """Test /api/admin/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        print("✓ Admin health check passed")
    
    def test_admin_stats(self):
        """Test /api/admin/stats returns correct statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields present
        assert "products_de" in data
        assert "products_it" in data
        assert "recipes" in data
        assert "analyses" in data
        assert "affiliate_clicks" in data
        assert "diary_entries" in data
        assert "timestamp" in data
        
        # Verify counts are integers and reasonable
        assert isinstance(data["products_de"], int)
        assert isinstance(data["products_it"], int)
        assert isinstance(data["recipes"], int)
        assert data["products_de"] >= 0
        assert data["products_it"] >= 0
        assert data["recipes"] >= 0
        
        print(f"✓ Admin stats: DE={data['products_de']}, IT={data['products_it']}, Recipes={data['recipes']}")


class TestProductsAPI:
    """Products CRUD operations for both DE and IT languages"""
    
    def test_list_products_de(self):
        """Test listing German products"""
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        assert "lang" in data
        assert data["lang"] == "de"
        assert isinstance(data["products"], list)
        assert data["total"] >= 0
        
        if data["products"]:
            product = data["products"][0]
            assert "product_id" in product
            assert "name" in product
        
        print(f"✓ Listed {data['total']} German products")
    
    def test_list_products_it(self):
        """Test listing Italian products"""
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        assert data["lang"] == "it"
        assert isinstance(data["products"], list)
        
        print(f"✓ Listed {data['total']} Italian products")
    
    def test_product_search(self):
        """Test product search functionality"""
        # Search for a common term
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search=vitamin")
        assert response.status_code == 200
        data = response.json()
        
        assert "products" in data
        # Search might return 0 or more results
        print(f"✓ Search returned {len(data['products'])} results for 'vitamin'")
    
    def test_create_update_delete_product_de(self):
        """Test full CRUD cycle for German product"""
        test_product_id = "TEST_admin_product_de"
        
        # CREATE
        create_payload = {
            "product_id": test_product_id,
            "name": "Test Admin Product DE",
            "description": "Test product created by admin API test",
            "tags": ["test", "admin"],
            "affiliate_url": "https://example.com/test",
            "image_url": "https://example.com/test.jpg",
            "price": "CHF 19.99",
            "rating": "4.5",
            "application_instructions": "Take once daily"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/products?lang=de",
            json=create_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["product_id"] == test_product_id
        print(f"✓ Created product: {test_product_id}")
        
        # VERIFY CREATE - GET the product list and check
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search={test_product_id}")
        assert response.status_code == 200
        products = response.json()["products"]
        created_product = next((p for p in products if p["product_id"] == test_product_id), None)
        assert created_product is not None
        assert created_product["name"] == "Test Admin Product DE"
        print(f"✓ Verified product creation via GET")
        
        # UPDATE
        update_payload = {
            "product_id": test_product_id,
            "name": "Updated Test Product DE",
            "description": "Updated description",
            "tags": ["test", "admin", "updated"],
            "affiliate_url": "https://example.com/updated",
            "image_url": "https://example.com/updated.jpg",
            "price": "CHF 24.99",
            "rating": "4.8",
            "application_instructions": "Take twice daily"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{test_product_id}?lang=de",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Updated product: {test_product_id}")
        
        # VERIFY UPDATE
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search={test_product_id}")
        assert response.status_code == 200
        products = response.json()["products"]
        updated_product = next((p for p in products if p["product_id"] == test_product_id), None)
        assert updated_product["name"] == "Updated Test Product DE"
        assert updated_product["price"] == "CHF 24.99"
        print(f"✓ Verified product update via GET")
        
        # DELETE
        response = requests.delete(f"{BASE_URL}/api/admin/products/{test_product_id}?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["deleted"] == test_product_id
        print(f"✓ Deleted product: {test_product_id}")
        
        # VERIFY DELETE
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search={test_product_id}")
        assert response.status_code == 200
        products = response.json()["products"]
        deleted_product = next((p for p in products if p["product_id"] == test_product_id), None)
        assert deleted_product is None
        print(f"✓ Verified product deletion")
    
    def test_create_duplicate_product_error(self):
        """Test that creating duplicate product returns error"""
        # First get an existing product
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&limit=1")
        assert response.status_code == 200
        products = response.json()["products"]
        
        if products:
            existing_id = products[0]["product_id"]
            
            # Try to create with same ID
            create_payload = {
                "product_id": existing_id,
                "name": "Duplicate Test",
                "description": "Should fail"
            }
            response = requests.post(
                f"{BASE_URL}/api/admin/products?lang=de",
                json=create_payload
            )
            assert response.status_code == 400
            assert "already exists" in response.json()["detail"]
            print(f"✓ Duplicate product creation correctly rejected")
    
    def test_update_nonexistent_product_error(self):
        """Test that updating non-existent product returns 404"""
        update_payload = {
            "product_id": "nonexistent_product_xyz",
            "name": "Should not work"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/products/nonexistent_product_xyz?lang=de",
            json=update_payload
        )
        assert response.status_code == 404
        print(f"✓ Update non-existent product correctly returns 404")
    
    def test_delete_nonexistent_product_error(self):
        """Test that deleting non-existent product returns 404"""
        response = requests.delete(f"{BASE_URL}/api/admin/products/nonexistent_product_xyz?lang=de")
        assert response.status_code == 404
        print(f"✓ Delete non-existent product correctly returns 404")


class TestRecipesAPI:
    """Recipes CRUD operations"""
    
    def test_list_recipes(self):
        """Test listing recipes"""
        response = requests.get(f"{BASE_URL}/api/admin/recipes")
        assert response.status_code == 200
        data = response.json()
        
        assert "recipes" in data
        assert "total" in data
        assert isinstance(data["recipes"], list)
        
        if data["recipes"]:
            recipe = data["recipes"][0]
            assert "id" in recipe
            assert "de" in recipe
            assert "it" in recipe
        
        print(f"✓ Listed {data['total']} recipes")
    
    def test_recipe_search(self):
        """Test recipe search functionality"""
        response = requests.get(f"{BASE_URL}/api/admin/recipes?search=smoothie")
        assert response.status_code == 200
        data = response.json()
        
        assert "recipes" in data
        print(f"✓ Recipe search returned {len(data['recipes'])} results for 'smoothie'")
    
    def test_create_update_delete_recipe(self):
        """Test full CRUD cycle for recipe"""
        test_recipe_id = "TEST_admin_recipe"
        
        # CREATE
        create_payload = {
            "id": test_recipe_id,
            "de": {
                "title": "Test Admin Recipe DE",
                "ingredients": ["Ingredient 1 DE", "Ingredient 2 DE"],
                "steps": ["Step 1 DE", "Step 2 DE"],
                "tags": ["test"]
            },
            "it": {
                "title": "Test Admin Recipe IT",
                "ingredients": ["Ingredient 1 IT", "Ingredient 2 IT"],
                "steps": ["Step 1 IT", "Step 2 IT"],
                "tags": ["test"]
            },
            "time_min": 15,
            "symptom_tags": ["test", "admin"],
            "image_url": "https://example.com/recipe.jpg"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/recipes",
            json=create_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["recipe_id"] == test_recipe_id
        print(f"✓ Created recipe: {test_recipe_id}")
        
        # VERIFY CREATE
        response = requests.get(f"{BASE_URL}/api/admin/recipes?search={test_recipe_id}")
        assert response.status_code == 200
        recipes = response.json()["recipes"]
        created_recipe = next((r for r in recipes if r["id"] == test_recipe_id), None)
        assert created_recipe is not None
        assert created_recipe["de"]["title"] == "Test Admin Recipe DE"
        assert created_recipe["it"]["title"] == "Test Admin Recipe IT"
        print(f"✓ Verified recipe creation via GET")
        
        # UPDATE
        update_payload = {
            "id": test_recipe_id,
            "de": {
                "title": "Updated Test Recipe DE",
                "ingredients": ["Updated Ingredient 1", "Updated Ingredient 2"],
                "steps": ["Updated Step 1", "Updated Step 2"],
                "tags": ["test", "updated"]
            },
            "it": {
                "title": "Updated Test Recipe IT",
                "ingredients": ["Ingrediente Aggiornato 1", "Ingrediente Aggiornato 2"],
                "steps": ["Passo Aggiornato 1", "Passo Aggiornato 2"],
                "tags": ["test", "updated"]
            },
            "time_min": 20,
            "symptom_tags": ["test", "admin", "updated"],
            "image_url": "https://example.com/recipe_updated.jpg"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/recipes/{test_recipe_id}",
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Updated recipe: {test_recipe_id}")
        
        # VERIFY UPDATE
        response = requests.get(f"{BASE_URL}/api/admin/recipes?search={test_recipe_id}")
        assert response.status_code == 200
        recipes = response.json()["recipes"]
        updated_recipe = next((r for r in recipes if r["id"] == test_recipe_id), None)
        assert updated_recipe["de"]["title"] == "Updated Test Recipe DE"
        assert updated_recipe["time_min"] == 20
        print(f"✓ Verified recipe update via GET")
        
        # DELETE
        response = requests.delete(f"{BASE_URL}/api/admin/recipes/{test_recipe_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["deleted"] == test_recipe_id
        print(f"✓ Deleted recipe: {test_recipe_id}")
        
        # VERIFY DELETE
        response = requests.get(f"{BASE_URL}/api/admin/recipes?search={test_recipe_id}")
        assert response.status_code == 200
        recipes = response.json()["recipes"]
        deleted_recipe = next((r for r in recipes if r["id"] == test_recipe_id), None)
        assert deleted_recipe is None
        print(f"✓ Verified recipe deletion")
    
    def test_create_duplicate_recipe_error(self):
        """Test that creating duplicate recipe returns error"""
        response = requests.get(f"{BASE_URL}/api/admin/recipes?limit=1")
        assert response.status_code == 200
        recipes = response.json()["recipes"]
        
        if recipes:
            existing_id = recipes[0]["id"]
            
            create_payload = {
                "id": existing_id,
                "de": {"title": "Dup", "ingredients": [], "steps": [], "tags": []},
                "it": {"title": "Dup", "ingredients": [], "steps": [], "tags": []},
                "time_min": 10,
                "symptom_tags": [],
                "image_url": ""
            }
            response = requests.post(
                f"{BASE_URL}/api/admin/recipes",
                json=create_payload
            )
            assert response.status_code == 400
            assert "already exists" in response.json()["detail"]
            print(f"✓ Duplicate recipe creation correctly rejected")
    
    def test_update_nonexistent_recipe_error(self):
        """Test that updating non-existent recipe returns 404"""
        update_payload = {
            "id": "nonexistent_recipe_xyz",
            "de": {"title": "X", "ingredients": [], "steps": [], "tags": []},
            "it": {"title": "X", "ingredients": [], "steps": [], "tags": []},
            "time_min": 10,
            "symptom_tags": [],
            "image_url": ""
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/recipes/nonexistent_recipe_xyz",
            json=update_payload
        )
        assert response.status_code == 404
        print(f"✓ Update non-existent recipe correctly returns 404")
    
    def test_delete_nonexistent_recipe_error(self):
        """Test that deleting non-existent recipe returns 404"""
        response = requests.delete(f"{BASE_URL}/api/admin/recipes/nonexistent_recipe_xyz")
        assert response.status_code == 404
        print(f"✓ Delete non-existent recipe correctly returns 404")


class TestAffiliateClicksAPI:
    """Affiliate clicks tracking endpoint tests"""
    
    def test_get_clicks(self):
        """Test getting affiliate click statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/clicks?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "period_days" in data
        assert "total_clicks" in data
        assert "by_product" in data
        assert "recent_clicks" in data
        
        assert data["period_days"] == 30
        assert isinstance(data["by_product"], list)
        assert isinstance(data["recent_clicks"], list)
        
        print(f"✓ Clicks stats: {data['total_clicks']} total clicks in last {data['period_days']} days")
        if data["by_product"]:
            print(f"✓ Top product: {data['by_product'][0]}")


class TestLLMLogsAPI:
    """LLM logs endpoint tests"""
    
    def test_get_llm_logs(self):
        """Test getting LLM logs"""
        response = requests.get(f"{BASE_URL}/api/admin/llm-logs?limit=10")
        assert response.status_code == 200
        data = response.json()
        
        assert "stats" in data
        assert "logs" in data
        assert "total_calls" in data["stats"]
        assert "success_rate" in data["stats"]
        
        print(f"✓ LLM Logs: {data['stats']['total_calls']} total calls, {data['stats']['success_rate']} success rate")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
