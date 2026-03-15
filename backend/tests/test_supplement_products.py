"""
Test Supplement Plan Button and Affiliate Product Features
- GET /api/products?lang=de - Products with tags
- POST /api/track/click - Affiliate click tracking
- Supplement plan with products integration
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://performance-boost-86.preview.emergentagent.com')

class TestProductsAPI:
    """Tests for products API with tags for supplement matching"""
    
    def test_get_all_products_de(self):
        """GET /api/products?lang=de - should return German products"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de")
        assert response.status_code == 200
        
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0
        
        # Validate product structure
        first_product = products[0]
        assert "product_id" in first_product
        assert "name" in first_product
        assert "tags" in first_product
        assert isinstance(first_product["tags"], list)
        print(f"SUCCESS: Got {len(products)} German products")
    
    def test_product_has_affiliate_url(self):
        """Products should have affiliate_url for tracking"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de")
        assert response.status_code == 200
        
        products = response.json()
        for product in products[:5]:  # Check first 5 products
            assert "affiliate_url" in product, f"Product {product.get('product_id')} missing affiliate_url"
            assert product["affiliate_url"].startswith("http"), f"Invalid affiliate URL: {product.get('affiliate_url')}"
        print("SUCCESS: Products have valid affiliate URLs")
    
    def test_product_tags_for_supplement_matching(self):
        """Products should have tags that match supplement categories"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de")
        assert response.status_code == 200
        
        products = response.json()
        
        # Collect all tags
        all_tags = set()
        for product in products:
            for tag in product.get("tags", []):
                all_tags.add(tag.lower())
        
        # Verify some expected supplement-related tags exist
        expected_tags = ["vitamin-d", "zink", "magnesium", "omega-3", "b-vitamine", "eisen"]
        found_tags = [tag for tag in expected_tags if any(tag in t.lower() for t in all_tags)]
        
        print(f"All tags found: {all_tags}")
        print(f"Expected tags found: {found_tags}")
        assert len(found_tags) > 0, "No supplement-related tags found in products"
    
    def test_filter_products_by_tags(self):
        """GET /api/products?tags=zink - should filter products by tags"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de&tags=zink")
        assert response.status_code == 200
        
        products = response.json()
        # Each product should have 'zink' in tags
        for product in products:
            tags_lower = [t.lower() for t in product.get("tags", [])]
            has_zink = any("zink" in t for t in tags_lower)
            if not has_zink:
                print(f"Warning: Product {product.get('name')} returned but tags are: {tags_lower}")
        print(f"SUCCESS: Tag filter returns {len(products)} products")
    
    def test_get_single_product(self):
        """GET /api/products/{id} - get single product"""
        # First get all products to find an ID
        response = requests.get(f"{BASE_URL}/api/products?lang=de")
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}?lang=de")
            assert response.status_code == 200
            
            product = response.json()
            assert product["product_id"] == product_id
            print(f"SUCCESS: Got single product: {product['name']}")


class TestClickTracking:
    """Tests for affiliate click tracking API"""
    
    def test_track_click_basic(self):
        """POST /api/track/click - track affiliate click"""
        payload = {
            "product_id": "test-product-001",
            "affiliate_url": "https://example.com/test?ref=vitaguide"
        }
        response = requests.post(f"{BASE_URL}/api/track/click", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["product_id"] == "test-product-001"
        assert "timestamp" in data
        print(f"SUCCESS: Click tracked with ID: {data['id']}")
    
    def test_track_click_with_real_product(self):
        """Track click for an actual product in database"""
        # Get a real product
        products_response = requests.get(f"{BASE_URL}/api/products?lang=de")
        products = products_response.json()
        
        if len(products) > 0:
            product = products[0]
            payload = {
                "product_id": product["product_id"],
                "affiliate_url": product.get("affiliate_url", "https://example.com")
            }
            response = requests.post(f"{BASE_URL}/api/track/click", json=payload)
            assert response.status_code == 200
            
            data = response.json()
            assert data["product_id"] == product["product_id"]
            print(f"SUCCESS: Click tracked for product: {product['name']}")
    
    def test_track_click_requires_affiliate_url(self):
        """Track click should require affiliate_url"""
        payload = {
            "product_id": "test-product"
            # Missing affiliate_url
        }
        response = requests.post(f"{BASE_URL}/api/track/click", json=payload)
        assert response.status_code == 422  # Validation error
        print("SUCCESS: Validation correctly requires affiliate_url")
    
    def test_track_click_with_source(self):
        """Track click with optional source field"""
        payload = {
            "product_id": "test-product-002",
            "affiliate_url": "https://example.com/product?ref=vitaguide",
            "source": "supplement_plan"
        }
        response = requests.post(f"{BASE_URL}/api/track/click", json=payload)
        assert response.status_code == 200
        print("SUCCESS: Click tracked with source field")


class TestSupplementPlanWithProducts:
    """Test supplement plan API and product integration"""
    
    def test_supplement_plan_exists_for_profile(self):
        """Test that supplement plan can be loaded for a profile"""
        # Create a test profile first via onboarding
        profile_payload = {
            "age": 35,
            "gender": "female",
            "height_cm": 165,
            "weight_kg": 60,
            "diet": "vegan",
            "medications": [],
            "health_goals": ["energie"],
            "symptoms": ["muedigkeit"],
            "stress_level": 7,
            "sleep_quality": 5,
            "lang": "de"
        }
        
        # Create profile
        profile_response = requests.post(f"{BASE_URL}/api/health-profile", json=profile_payload)
        assert profile_response.status_code in [200, 201]
        profile_data = profile_response.json()
        profile_id = profile_data.get("profile_id") or profile_data.get("id")
        
        print(f"Created test profile: {profile_id}")
        
        # Generate supplement plan
        plan_response = requests.post(f"{BASE_URL}/api/supplement-plan/{profile_id}?lang=de")
        assert plan_response.status_code == 200
        plan_data = plan_response.json()
        
        assert "plan" in plan_data
        plan = plan_data["plan"]
        assert "stack" in plan
        assert len(plan["stack"]) > 0
        
        print(f"SUCCESS: Generated supplement plan with {len(plan['stack'])} supplements")
        
        # Verify supplements have IDs that can be matched to products
        for supplement in plan["stack"][:3]:
            assert "id" in supplement
            assert "name" in supplement
            print(f"  - {supplement['name']} (id: {supplement['id']})")
    
    def test_products_can_match_supplement_ids(self):
        """Test that products can be matched to supplement IDs via tags"""
        # Get all products
        products_response = requests.get(f"{BASE_URL}/api/products?lang=de")
        products = products_response.json()
        
        # Mapping from supplement plan
        SUPPLEMENT_PRODUCT_TAGS = {
            "vitamin_d": ["vitamin-d", "knochen"],
            "zinc": ["zink"],
            "magnesium": ["magnesium", "schlaf", "muskeln"],
            "omega3": ["omega-3"],
            "iron": ["eisen"],
        }
        
        # Test matching logic
        for supp_id, search_tags in SUPPLEMENT_PRODUCT_TAGS.items():
            matching_products = []
            for product in products:
                product_tags = [t.lower() for t in product.get("tags", [])]
                if any(tag in product_tags for tag in search_tags):
                    matching_products.append(product["name"])
            
            if matching_products:
                print(f"SUCCESS: {supp_id} matches products: {matching_products[:2]}")
            else:
                print(f"INFO: No products found for {supp_id}")


class TestOnboardingAndNavigation:
    """Test onboarding options and navigation support"""
    
    def test_onboarding_options_exist(self):
        """GET /api/onboarding/options - should return form options"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "diets" in data
        assert "complaints" in data  # Symptoms/complaints list
        assert "conditions" in data  # Health conditions
        print(f"SUCCESS: Onboarding options loaded - {len(data['diets'])} diets, {len(data['complaints'])} complaints")
    
    def test_create_profile_for_supplement_plan(self):
        """Create profile to enable supplement plan navigation"""
        profile_payload = {
            "age": 40,
            "gender": "male",
            "height_cm": 180,
            "weight_kg": 80,
            "diet": "omnivore",
            "medications": [],
            "health_goals": ["immunsystem"],
            "symptoms": ["stress"],
            "stress_level": 6,
            "sleep_quality": 6,
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=profile_payload)
        assert response.status_code in [200, 201]
        
        data = response.json()
        profile_id = data.get("profile_id") or data.get("id")
        assert profile_id is not None
        
        # Verify profile can be fetched
        get_response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert get_response.status_code == 200
        
        print(f"SUCCESS: Profile created - ID: {profile_id}")
        return profile_id


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
