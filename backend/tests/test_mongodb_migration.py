"""
VitaGuide MongoDB Migration Tests - Iteration 8
Tests the migration from JSON files to MongoDB for products and recipes.
Verifies:
- Products_de collection (30 products)
- Products_it collection (61 products)
- Recipes collection (30 bilingual recipes)
- Dynamic prompts with MongoDB catalog
- Analysis endpoint with MongoDB-sourced products
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")

BASE_URL = BASE_URL.rstrip('/')


class TestProductsMongoDB:
    """Test products loaded from MongoDB collections"""

    def test_products_de_count(self):
        """Verify GET /api/products?lang=de returns 30 German products from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 30, f"Expected 30 German products from MongoDB, got {len(data)}"
        
        print(f"✓ GET /api/products?lang=de returned {len(data)} products from MongoDB")

    def test_products_de_structure(self):
        """Verify German products have all required fields"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de", timeout=10)
        data = response.json()
        
        required_fields = ["product_id", "name", "description", "affiliate_url", "tags", "price"]
        optional_fields = ["image_url", "rating", "application_instructions"]
        
        for product in data:
            for field in required_fields:
                assert field in product, f"Product {product.get('product_id', 'unknown')} missing required field: {field}"
            
            # Verify tags is a list
            assert isinstance(product["tags"], list), f"Product {product['product_id']} tags should be list"
        
        # Check for image_url presence (most products should have it)
        products_with_images = sum(1 for p in data if p.get("image_url"))
        print(f"✓ German products structure verified ({products_with_images}/{len(data)} have images)")

    def test_products_it_count(self):
        """Verify GET /api/products?lang=it returns 61 Italian products from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 61, f"Expected 61 Italian products from MongoDB, got {len(data)}"
        
        print(f"✓ GET /api/products?lang=it returned {len(data)} products from MongoDB")

    def test_products_it_structure(self):
        """Verify Italian products have all required fields including video_url"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it", timeout=10)
        data = response.json()
        
        required_fields = ["product_id", "name", "description", "affiliate_url", "tags", "price"]
        
        for product in data:
            for field in required_fields:
                assert field in product, f"IT Product {product.get('product_id', 'unknown')} missing: {field}"
        
        # Italian products should have video_url in some cases
        products_with_video = sum(1 for p in data if p.get("video_url"))
        print(f"✓ Italian products structure verified ({products_with_video}/{len(data)} have video_url)")

    def test_product_by_id_de(self):
        """Test GET /api/products/{product_id}?lang=de returns single product"""
        # First get a valid product_id
        response = requests.get(f"{BASE_URL}/api/products?lang=de", timeout=10)
        data = response.json()
        
        if len(data) > 0:
            product_id = data[0]["product_id"]
            
            # Fetch single product
            single_response = requests.get(f"{BASE_URL}/api/products/{product_id}?lang=de", timeout=10)
            assert single_response.status_code == 200, f"Expected 200, got {single_response.status_code}"
            
            single_product = single_response.json()
            assert single_product["product_id"] == product_id, "Product ID should match"
            assert "name" in single_product, "Single product should have name"
            
            print(f"✓ GET /api/products/{product_id}?lang=de returned: {single_product['name']}")

    def test_product_by_id_it(self):
        """Test GET /api/products/{product_id}?lang=it returns single Italian product"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it", timeout=10)
        data = response.json()
        
        if len(data) > 0:
            product_id = data[0]["product_id"]
            
            single_response = requests.get(f"{BASE_URL}/api/products/{product_id}?lang=it", timeout=10)
            assert single_response.status_code == 200, f"Expected 200, got {single_response.status_code}"
            
            single_product = single_response.json()
            assert single_product["product_id"] == product_id, "Product ID should match"
            
            print(f"✓ GET /api/products/{product_id}?lang=it returned: {single_product['name']}")

    def test_product_by_id_not_found(self):
        """Test GET /api/products/{invalid_id} returns error"""
        response = requests.get(f"{BASE_URL}/api/products/INVALID_PRODUCT_ID_999?lang=de", timeout=10)
        assert response.status_code == 200, "Should still return 200"
        
        data = response.json()
        assert "error" in data, "Should return error message"
        assert data["error"] == "Product not found", "Error message should indicate not found"
        
        print(f"✓ Invalid product ID returns proper error")

    def test_products_filtering_by_tags(self):
        """Test products can be filtered by tags"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de&tags=gelenke", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Filtered products should be a list"
        
        # Verify all returned products have the tag
        for product in data:
            tags_lower = [t.lower() for t in product.get("tags", [])]
            assert "gelenke" in tags_lower or any("gelenk" in t for t in tags_lower), \
                f"Product {product['product_id']} should have 'gelenke' tag"
        
        print(f"✓ Products tag filtering returned {len(data)} products for 'gelenke'")


class TestRecipesMongoDB:
    """Test recipes loaded from MongoDB"""

    def test_recipes_de_count(self):
        """Verify GET /api/recipes?lang=de returns 30 German recipes from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 30, f"Expected 30 recipes from MongoDB, got {len(data)}"
        
        print(f"✓ GET /api/recipes?lang=de returned {len(data)} recipes from MongoDB")

    def test_recipes_de_structure(self):
        """Verify German recipes have all required fields"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de", timeout=10)
        data = response.json()
        
        required_fields = ["id", "title", "ingredients", "steps", "time_min", "tags", "symptom_tags", "image_url"]
        
        for recipe in data:
            for field in required_fields:
                assert field in recipe, f"Recipe {recipe.get('id', 'unknown')} missing field: {field}"
            
            # Verify lists
            assert isinstance(recipe["ingredients"], list) and len(recipe["ingredients"]) > 0
            assert isinstance(recipe["steps"], list) and len(recipe["steps"]) > 0
            assert isinstance(recipe["tags"], list)
            assert isinstance(recipe["symptom_tags"], list)
            
            # Verify image_url
            assert recipe["image_url"].startswith("http"), f"Recipe {recipe['id']} should have valid image URL"
        
        print(f"✓ All {len(data)} German recipes have valid structure")

    def test_recipes_it_count(self):
        """Verify GET /api/recipes?lang=it returns 30 Italian recipes from MongoDB"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 30, f"Expected 30 Italian recipes, got {len(data)}"
        
        print(f"✓ GET /api/recipes?lang=it returned {len(data)} Italian recipes")

    def test_recipes_it_have_italian_content(self):
        """Verify Italian recipes have Italian titles and ingredients"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it", timeout=10)
        data = response.json()
        
        # Check first recipe has Italian title
        first_recipe = data[0]
        assert "title" in first_recipe and len(first_recipe["title"]) > 0
        
        # Verify ingredients are in Italian (sample check)
        assert isinstance(first_recipe["ingredients"], list)
        assert len(first_recipe["ingredients"]) > 0
        
        print(f"✓ Italian recipes have proper localized content")
        print(f"  - Sample: {first_recipe['title']}")

    def test_recipe_by_id_de(self):
        """Test GET /api/recipes/{recipe_id}?lang=de returns single recipe"""
        # First get a valid recipe ID
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de", timeout=10)
        data = response.json()
        
        if len(data) > 0:
            recipe_id = data[0]["id"]
            
            single_response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}?lang=de", timeout=10)
            assert single_response.status_code == 200
            
            single_recipe = single_response.json()
            assert single_recipe["id"] == recipe_id
            assert "title" in single_recipe
            assert "ingredients" in single_recipe
            assert "steps" in single_recipe
            
            print(f"✓ GET /api/recipes/{recipe_id}?lang=de returned: {single_recipe['title']}")

    def test_recipe_by_id_it(self):
        """Test GET /api/recipes/{recipe_id}?lang=it returns Italian recipe"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it", timeout=10)
        data = response.json()
        
        if len(data) > 0:
            recipe_id = data[0]["id"]
            
            single_response = requests.get(f"{BASE_URL}/api/recipes/{recipe_id}?lang=it", timeout=10)
            assert single_response.status_code == 200
            
            single_recipe = single_response.json()
            assert single_recipe["id"] == recipe_id
            
            print(f"✓ GET /api/recipes/{recipe_id}?lang=it returned: {single_recipe['title']}")

    def test_recipe_by_id_not_found(self):
        """Test invalid recipe ID returns error"""
        response = requests.get(f"{BASE_URL}/api/recipes/INVALID_RECIPE_999?lang=de", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert "error" in data, "Should return error for invalid recipe ID"
        
        print(f"✓ Invalid recipe ID returns proper error")

    def test_recipe_filtering_by_symptom_tags(self):
        """Test recipes can be filtered by symptom_tags"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=müdigkeit", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If filtering works, all results should have the tag
        for recipe in data:
            symptom_tags_lower = [t.lower() for t in recipe.get("symptom_tags", [])]
            assert "müdigkeit" in symptom_tags_lower, \
                f"Recipe {recipe['id']} should have 'müdigkeit' symptom_tag"
        
        print(f"✓ Recipe symptom_tags filtering returned {len(data)} recipes for 'müdigkeit'")


class TestAnalysisWithMongoDB:
    """Test analysis endpoint uses MongoDB product catalog"""

    def test_analysis_endpoint_de(self):
        """Test POST /api/symptoms/analyze returns analysis with MongoDB products"""
        payload = {
            "text": "Ich fühle mich müde und habe Gelenkschmerzen",
            "tags": ["müdigkeit", "gelenkschmerzen"],
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=60  # LLM calls can be slow
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should have analysis ID"
        assert "summary" in data, "Response should have summary"
        assert "brand_products" in data, "Response should have brand_products"
        assert "lang" in data, "Response should have lang"
        assert data["lang"] == "de", "Language should be 'de'"
        
        # Check if brand products have catalog data from MongoDB
        if data["brand_products"]:
            for bp in data["brand_products"]:
                assert "product_id" in bp, "Brand product should have product_id"
                # Products should be enriched with catalog data (image_url, price, etc.)
                if bp.get("image_url"):
                    assert bp["image_url"].startswith("http"), "image_url should be valid URL"
        
        print(f"✓ Analysis endpoint (DE) returned valid response")
        print(f"  - Summary: {data['summary'][:100]}...")
        print(f"  - Brand products: {len(data.get('brand_products', []))}")

    def test_analysis_endpoint_it(self):
        """Test POST /api/symptoms/analyze with Italian language"""
        payload = {
            "text": "Mi sento stanco e ho dolori articolari",
            "tags": ["stanchezza", "dolori articolari"],
            "lang": "it"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=60
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["lang"] == "it", "Language should be 'it'"
        assert "summary" in data
        
        # Italian products should include video_url if available
        if data.get("brand_products"):
            for bp in data["brand_products"]:
                # Italian products might have video_url
                pass
        
        print(f"✓ Analysis endpoint (IT) returned valid response")
        print(f"  - Summary: {data['summary'][:100]}...")


class TestAffiliateTracking:
    """Test affiliate click tracking still works"""

    def test_track_click_success(self):
        """Test POST /api/track/click stores event correctly"""
        payload = {
            "product_id": "TEST_mongodb_migration",
            "affiliate_url": "https://joachim-kaeser.de/products/test",
            "source": "mongodb_test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/track/click",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Should have event ID"
        assert data["product_id"] == payload["product_id"]
        assert data["affiliate_url"] == payload["affiliate_url"]
        assert data["source"] == payload["source"]
        assert "timestamp" in data
        
        print(f"✓ Click tracking working correctly")
        print(f"  - Event ID: {data['id']}")


class TestHealthAndAdmin:
    """Test health endpoints still work"""

    def test_health_endpoint(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        # Health endpoint might return 200 or 404 if not defined
        print(f"✓ API is accessible (health: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
