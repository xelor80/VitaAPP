"""
VitaGuide Admin Webapp Tests
Tests for admin webapp authentication and CRUD operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestAdminWebappAuth:
    """Tests for admin webapp authentication"""
    
    def test_admin_auth_correct_password(self):
        """Test successful authentication with correct password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": "Wk220480xel!"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "token" in data
        assert len(data["token"]) > 0
        print(f"✓ Auth success, token length: {len(data['token'])}")
    
    def test_admin_auth_wrong_password(self):
        """Test authentication failure with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Invalid password" in data["detail"]
        print("✓ Wrong password correctly rejected with 401")
    
    def test_admin_auth_empty_password(self):
        """Test authentication with empty password"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ""},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401
        print("✓ Empty password correctly rejected")


class TestAdminWebappStatic:
    """Tests for admin webapp static file serving"""
    
    def test_admin_webapp_main_page(self):
        """Test that admin webapp main page is served"""
        response = requests.get(f"{BASE_URL}/api/admin-app")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "VitaGuide Admin" in response.text
        assert "login-form" in response.text
        print("✓ Admin webapp main page served correctly")
    
    def test_admin_webapp_css(self):
        """Test that admin webapp CSS is served"""
        response = requests.get(f"{BASE_URL}/api/admin-app/styles.css")
        assert response.status_code == 200
        assert "text/css" in response.headers.get("content-type", "")
        assert ".login-container" in response.text
        print("✓ Admin webapp CSS served correctly")
    
    def test_admin_webapp_js(self):
        """Test that admin webapp JavaScript is served"""
        response = requests.get(f"{BASE_URL}/api/admin-app/app.js")
        assert response.status_code == 200
        assert "application/javascript" in response.headers.get("content-type", "")
        assert "showDashboard" in response.text
        print("✓ Admin webapp JS served correctly")
    
    def test_admin_webapp_nonexistent_file(self):
        """Test 404 for non-existent files"""
        response = requests.get(f"{BASE_URL}/api/admin-app/nonexistent.file")
        assert response.status_code == 404
        print("✓ Non-existent file returns 404")


class TestAdminStats:
    """Tests for admin stats endpoint"""
    
    def test_admin_stats(self):
        """Test admin stats endpoint returns correct data"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        assert "products_de" in data
        assert "products_it" in data
        assert "recipes" in data
        assert "analyses" in data
        assert "affiliate_clicks" in data
        assert "timestamp" in data
        
        # Verify values are integers
        assert isinstance(data["products_de"], int)
        assert isinstance(data["products_it"], int)
        assert isinstance(data["recipes"], int)
        
        print(f"✓ Stats: DE products={data['products_de']}, IT products={data['products_it']}, recipes={data['recipes']}")


class TestAdminProductsCRUD:
    """Tests for admin products CRUD operations"""
    
    def test_list_products_de(self):
        """Test listing German products"""
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert data["lang"] == "de"
        print(f"✓ Listed {data['total']} German products")
    
    def test_list_products_it(self):
        """Test listing Italian products"""
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=it")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert data["lang"] == "it"
        print(f"✓ Listed {data['total']} Italian products")
    
    def test_search_products(self):
        """Test product search functionality"""
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search=vitamin")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print(f"✓ Search returned {len(data['products'])} products")
    
    def test_product_crud_cycle(self):
        """Test full product CRUD cycle: Create -> Read -> Update -> Delete"""
        test_product = {
            "product_id": "TEST_WEBAPP_PROD_001",
            "name": "Test Product for Webapp",
            "description": "Test description",
            "price": "19,99 €",
            "rating": "4.5",
            "tags": ["test", "vitamin"],
            "affiliate_url": "https://example.com/test",
            "image_url": "https://example.com/test.jpg",
            "application_instructions": "Test instructions",
            "video_url": ""
        }
        
        # CREATE
        response = requests.post(
            f"{BASE_URL}/api/admin/products?lang=de",
            json=test_product,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"✓ Created product: {test_product['product_id']}")
        
        # READ - verify it exists
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search={test_product['product_id']}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) > 0
        assert data["products"][0]["product_id"] == test_product["product_id"]
        print("✓ Product found after creation")
        
        # UPDATE
        test_product["name"] = "Updated Test Product"
        response = requests.put(
            f"{BASE_URL}/api/admin/products/{test_product['product_id']}?lang=de",
            json=test_product,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        print("✓ Product updated")
        
        # DELETE
        response = requests.delete(f"{BASE_URL}/api/admin/products/{test_product['product_id']}?lang=de")
        assert response.status_code == 200
        print("✓ Product deleted")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/admin/products?lang=de&search={test_product['product_id']}")
        data = response.json()
        assert len(data["products"]) == 0
        print("✓ Product deletion verified")


class TestAdminRecipesCRUD:
    """Tests for admin recipes CRUD operations"""
    
    def test_list_recipes(self):
        """Test listing recipes"""
        response = requests.get(f"{BASE_URL}/api/admin/recipes")
        assert response.status_code == 200
        data = response.json()
        assert "recipes" in data
        assert "total" in data
        print(f"✓ Listed {data['total']} recipes")
    
    def test_recipe_crud_cycle(self):
        """Test full recipe CRUD cycle: Create -> Read -> Update -> Delete"""
        test_recipe = {
            "id": "TEST_WEBAPP_RECIPE_001",
            "time_min": 25,
            "de": {
                "title": "Test Rezept",
                "ingredients": ["Zutat 1", "Zutat 2"],
                "steps": ["Schritt 1", "Schritt 2"],
                "tags": []
            },
            "it": {
                "title": "Ricetta di Test",
                "ingredients": ["Ingrediente 1", "Ingrediente 2"],
                "steps": ["Passo 1", "Passo 2"],
                "tags": []
            },
            "symptom_tags": ["test", "energy"],
            "image_url": "https://example.com/recipe.jpg"
        }
        
        # CREATE
        response = requests.post(
            f"{BASE_URL}/api/admin/recipes",
            json=test_recipe,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        print(f"✓ Created recipe: {test_recipe['id']}")
        
        # READ
        response = requests.get(f"{BASE_URL}/api/admin/recipes?search={test_recipe['id']}")
        assert response.status_code == 200
        data = response.json()
        assert len(data["recipes"]) > 0
        print("✓ Recipe found after creation")
        
        # UPDATE
        test_recipe["de"]["title"] = "Updated Test Rezept"
        response = requests.put(
            f"{BASE_URL}/api/admin/recipes/{test_recipe['id']}",
            json=test_recipe,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        print("✓ Recipe updated")
        
        # DELETE
        response = requests.delete(f"{BASE_URL}/api/admin/recipes/{test_recipe['id']}")
        assert response.status_code == 200
        print("✓ Recipe deleted")
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/admin/recipes?search={test_recipe['id']}")
        data = response.json()
        assert len(data["recipes"]) == 0
        print("✓ Recipe deletion verified")


class TestAdminClicks:
    """Tests for admin clicks tracking"""
    
    def test_get_clicks(self):
        """Test clicks tracking endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/clicks?days=30")
        assert response.status_code == 200
        data = response.json()
        assert "period_days" in data
        assert "total_clicks" in data
        assert "by_product" in data
        print(f"✓ Clicks stats: {data['total_clicks']} total clicks in {data['period_days']} days")


class TestAdminLLMLogs:
    """Tests for admin LLM logs"""
    
    def test_get_llm_logs(self):
        """Test LLM logs endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/llm-logs?limit=50")
        assert response.status_code == 200
        data = response.json()
        assert "stats" in data
        assert "logs" in data
        assert "total_calls" in data["stats"]
        assert "success_rate" in data["stats"]
        print(f"✓ LLM logs: {data['stats']['total_calls']} total calls, success rate: {data['stats']['success_rate']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
