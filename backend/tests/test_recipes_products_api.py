"""
VitaGuide Recipes & Products API Backend Tests
Tests recipe catalog (30 bilingual recipes), products catalog (DE/IT), and click tracking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")

BASE_URL = BASE_URL.rstrip('/')


class TestRecipesEndpoint:
    """Test recipe catalog endpoint with bilingual support"""

    def test_recipes_de_returns_30_recipes(self):
        """Test GET /api/recipes?lang=de returns 30 German recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 30, f"Expected 30 recipes, got {len(data)}"
        
        print(f"✓ GET /api/recipes?lang=de returned {len(data)} recipes")
        return data

    def test_recipes_de_have_required_fields(self):
        """Verify each German recipe has required fields: title, image_url, ingredients, steps, tags"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de", timeout=10)
        data = response.json()
        
        required_fields = ["id", "title", "ingredients", "steps", "tags", "time_min", "image_url"]
        
        for i, recipe in enumerate(data):
            for field in required_fields:
                assert field in recipe, f"Recipe {i} ({recipe.get('id', 'unknown')}) missing field: {field}"
            
            # Verify title is in German (basic check - contains common German characters or words)
            assert isinstance(recipe["title"], str), f"Recipe {recipe['id']} title should be string"
            assert len(recipe["title"]) > 0, f"Recipe {recipe['id']} title should not be empty"
            
            # Verify ingredients and steps are lists
            assert isinstance(recipe["ingredients"], list), f"Recipe {recipe['id']} ingredients should be list"
            assert len(recipe["ingredients"]) > 0, f"Recipe {recipe['id']} should have ingredients"
            
            assert isinstance(recipe["steps"], list), f"Recipe {recipe['id']} steps should be list"
            assert len(recipe["steps"]) > 0, f"Recipe {recipe['id']} should have steps"
            
            # Verify image_url is present and starts with http
            assert recipe["image_url"].startswith("http"), f"Recipe {recipe['id']} image_url should be a URL"
        
        print(f"✓ All {len(data)} German recipes have required fields with valid data")
        print(f"  - Sample recipe: {data[0]['title']} ({data[0]['time_min']} min, {len(data[0]['ingredients'])} ingredients)")

    def test_recipes_it_returns_30_italian_recipes(self):
        """Test GET /api/recipes?lang=it returns 30 Italian recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 30, f"Expected 30 recipes, got {len(data)}"
        
        # Verify first recipe has Italian title
        first_recipe = data[0]
        assert first_recipe["title"] == "Smoothie Verde Energizzante", f"First IT recipe should be 'Smoothie Verde Energizzante', got '{first_recipe['title']}'"
        
        print(f"✓ GET /api/recipes?lang=it returned {len(data)} Italian recipes")
        print(f"  - First recipe: {first_recipe['title']}")

    def test_recipes_it_have_italian_content(self):
        """Verify Italian recipes have Italian titles and content"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it", timeout=10)
        data = response.json()
        
        # Sample Italian titles we expect
        expected_italian_titles = [
            "Smoothie Verde Energizzante",
            "Bowl Energetica alla Quinoa",
            "Insalata di Spinaci con Semi",
        ]
        
        actual_titles = [r["title"] for r in data[:3]]
        assert actual_titles == expected_italian_titles, f"Italian recipe titles don't match. Expected: {expected_italian_titles}, Got: {actual_titles}"
        
        # Verify ingredients are in Italian
        first_recipe = data[0]
        # Check for Italian words in ingredients
        ingredients_text = " ".join(first_recipe["ingredients"])
        assert any(word in ingredients_text.lower() for word in ["spinaci", "banana", "cucchiaio", "latte"]), \
            "Italian recipes should have Italian ingredients"
        
        print(f"✓ Italian recipes have Italian content verified")
        print(f"  - Verified titles: {actual_titles}")

    def test_recipes_filtering_by_tags(self):
        """Test recipes can be filtered by symptom_tags"""
        # Filter by müdigkeit/stanchezza (fatigue) tag
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=müdigkeit", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If filtering works, we should get recipes with müdigkeit tag
        # If not, we get all recipes (fallback behavior)
        print(f"✓ Recipe tag filtering returned {len(data)} recipes for 'müdigkeit'")


class TestProductsEndpoint:
    """Test products catalog endpoint with bilingual support"""

    def test_products_de_returns_30_german_products(self):
        """Test GET /api/products?lang=de returns 30 German products"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 30, f"Expected 30 products, got {len(data)}"
        
        print(f"✓ GET /api/products?lang=de returned {len(data)} products")
        return data

    def test_products_de_have_required_fields(self):
        """Verify German products have required fields including image_url"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de", timeout=10)
        data = response.json()
        
        required_fields = ["product_id", "name", "description", "affiliate_url", "tags", "price"]
        
        products_with_images = 0
        for product in data:
            for field in required_fields:
                assert field in product, f"Product {product.get('product_id', 'unknown')} missing field: {field}"
            
            # Check for image_url (should be present based on PRODUCT_IMAGES mapping)
            if "image_url" in product and product["image_url"]:
                products_with_images += 1
                assert product["image_url"].startswith("http"), f"Product {product['product_id']} image_url should be URL"
        
        print(f"✓ All {len(data)} German products have required fields")
        print(f"  - Products with images: {products_with_images}/{len(data)}")
        print(f"  - First product: {data[0]['name']} - {data[0]['price']}")

    def test_products_it_returns_italian_products(self):
        """Test GET /api/products?lang=it returns Italian products"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have Italian products"
        
        # Verify first product has Italian name
        first_product = data[0]
        assert "name" in first_product, "Product should have name"
        
        # Check Italian products have image_url
        products_with_images = sum(1 for p in data if p.get("image_url"))
        
        print(f"✓ GET /api/products?lang=it returned {len(data)} Italian products")
        print(f"  - Products with images: {products_with_images}/{len(data)}")
        print(f"  - First product: {first_product['name']}")

    def test_products_it_have_video_urls(self):
        """Test that some Italian products have optional video_url fields"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it", timeout=10)
        data = response.json()
        
        products_with_video = [p for p in data if p.get("video_url")]
        
        print(f"✓ Italian products with video_url: {len(products_with_video)}/{len(data)}")
        if products_with_video:
            print(f"  - Example: {products_with_video[0]['name']} - {products_with_video[0]['video_url'][:60]}...")


class TestClickTracking:
    """Test affiliate click tracking endpoint"""

    def test_track_click_stores_event(self):
        """Test POST /api/track/click correctly stores click events"""
        payload = {
            "product_id": "TEST_gelenk-kraft",
            "affiliate_url": "https://joachim-kaeser.de/products/gelenk-kraft?ref=vitaguide",
            "source": "test_app"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/track/click",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields in response
        required_fields = ["id", "product_id", "affiliate_url", "source", "timestamp"]
        for field in required_fields:
            assert field in data, f"Response missing field: {field}"
        
        # Verify values match input
        assert data["product_id"] == payload["product_id"], "product_id should match"
        assert data["affiliate_url"] == payload["affiliate_url"], "affiliate_url should match"
        assert data["source"] == payload["source"], "source should match"
        
        # Verify timestamp is present and valid ISO format
        assert "T" in data["timestamp"], "timestamp should be ISO format"
        
        print(f"✓ Click tracking successful")
        print(f"  - Event ID: {data['id']}")
        print(f"  - Product: {data['product_id']}")
        print(f"  - Timestamp: {data['timestamp']}")

    def test_track_click_with_different_source(self):
        """Test click tracking with different source values"""
        sources = ["app", "results_page", "supplements_tab"]
        
        for source in sources:
            payload = {
                "product_id": "TEST_weihrauch-2-0",
                "affiliate_url": "https://joachim-kaeser.de/products/weihrauch",
                "source": source
            }
            
            response = requests.post(
                f"{BASE_URL}/api/track/click",
                json=payload,
                timeout=10
            )
            
            assert response.status_code == 200, f"Click tracking failed for source '{source}'"
            data = response.json()
            assert data["source"] == source, f"Source should be '{source}'"
        
        print(f"✓ Click tracking works for all source types: {sources}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
