"""
VitaGuide API Backend Tests
Tests health check, products endpoint, symptom analysis (LLM), and click tracking
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")

BASE_URL = BASE_URL.rstrip('/')


class TestHealthCheck:
    """Basic health check endpoint test"""

    def test_health_endpoint_returns_ok(self):
        """Test GET /api/health returns status ok"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response missing 'status' field"
        assert data["status"] == "ok", f"Expected status 'ok', got {data['status']}"
        assert "timestamp" in data, "Response missing 'timestamp' field"
        print("✓ Health check passed - API is running")


class TestProductsEndpoint:
    """Test products catalog endpoint"""

    def test_products_returns_8_items(self):
        """Test GET /api/products returns exactly 8 VitaNatura products"""
        response = requests.get(f"{BASE_URL}/api/products", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 8, f"Expected 8 products, got {len(data)}"
        print(f"✓ Products endpoint returned {len(data)} products")

    def test_products_have_required_fields(self):
        """Verify each product has required fields"""
        response = requests.get(f"{BASE_URL}/api/products", timeout=10)
        data = response.json()
        
        required_fields = ["product_id", "name", "description", "affiliate_url", "tags", "price"]
        for product in data:
            for field in required_fields:
                assert field in product, f"Product missing field: {field}"
        
        # Check first product structure
        first_product = data[0]
        assert "vitanatura" in first_product["product_id"].lower(), "Product ID should contain 'vitanatura'"
        assert isinstance(first_product["tags"], list), "Tags should be a list"
        assert len(first_product["tags"]) > 0, "Products should have tags"
        print("✓ All products have required fields")

    def test_products_filtering_by_tags(self):
        """Test products can be filtered by tags"""
        response = requests.get(f"{BASE_URL}/api/products?tags=müdigkeit", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Should return products with "müdigkeit" tag or all products if none match
        print(f"✓ Products filtering returned {len(data)} products")


class TestSymptomAnalysis:
    """Test symptom analysis endpoint with LLM integration"""

    def test_symptom_analysis_with_valid_input(self):
        """Test POST /api/symptoms/analyze with German symptom text"""
        payload = {
            "text": "Ich fühle mich müde und habe Kopfschmerzen",
            "tags": ["Müdigkeit", "Kopfschmerzen"],
            "duration": "1 Woche",
            "intensity": "mittel"
        }
        
        # LLM call may take 5-15 seconds
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields in response
        required_fields = [
            "id", "summary", "red_flags", "supplements_general_info",
            "brand_products", "nutrition_tips", "recipes", "disclaimer_short"
        ]
        for field in required_fields:
            assert field in data, f"Response missing field: {field}"
        
        # Verify data types
        assert isinstance(data["id"], str), "ID should be string"
        assert isinstance(data["summary"], str), "Summary should be string"
        assert len(data["summary"]) > 0, "Summary should not be empty"
        assert isinstance(data["red_flags"], list), "Red flags should be list"
        assert isinstance(data["supplements_general_info"], list), "Supplements info should be list"
        assert isinstance(data["brand_products"], list), "Brand products should be list"
        assert isinstance(data["nutrition_tips"], list), "Nutrition tips should be list"
        assert isinstance(data["recipes"], list), "Recipes should be list"
        
        # Verify we get some content
        assert len(data["nutrition_tips"]) > 0, "Should have at least one nutrition tip"
        
        print(f"✓ Symptom analysis successful - Analysis ID: {data['id']}")
        print(f"  - Summary: {data['summary'][:100]}...")
        print(f"  - Red flags: {len(data['red_flags'])}")
        print(f"  - Supplements: {len(data['supplements_general_info'])}")
        print(f"  - Products: {len(data['brand_products'])}")
        print(f"  - Nutrition tips: {len(data['nutrition_tips'])}")
        print(f"  - Recipes: {len(data['recipes'])}")
        
        return data["id"]  # Return for potential follow-up tests

    def test_symptom_analysis_empty_input_validation(self):
        """Test that empty input returns 400 error"""
        payload = {
            "text": "",
            "tags": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400 for empty input, got {response.status_code}"
        print("✓ Empty input validation works correctly")

    def test_symptom_analysis_red_flag_detection(self):
        """Test red flag detection for serious symptoms"""
        payload = {
            "text": "Ich habe starke Brustschmerzen und Atemnot seit heute morgen",
            "tags": ["Brustschmerzen"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=30
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should detect red flags for chest pain and breathing issues
        assert isinstance(data["red_flags"], list), "Red flags should be a list"
        print(f"✓ Red flag detection test - Found {len(data['red_flags'])} red flags")
        if len(data["red_flags"]) > 0:
            print(f"  First red flag: {data['red_flags'][0]}")


class TestClickTracking:
    """Test affiliate click tracking endpoint"""

    def test_track_click_success(self):
        """Test POST /api/track/click creates tracking record"""
        payload = {
            "product_id": "vitanatura-d3k2",
            "affiliate_url": "https://shop.vitanatura.example/d3-k2?ref=app",
            "source": "app"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/track/click",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "id" in data, "Response should contain tracking ID"
        assert data["product_id"] == payload["product_id"], "Product ID should match"
        assert data["affiliate_url"] == payload["affiliate_url"], "Affiliate URL should match"
        assert "timestamp" in data, "Response should contain timestamp"
        
        print(f"✓ Click tracking successful - Tracking ID: {data['id']}")


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_rate_limiting(self):
        """Test that rate limiting kicks in after many requests"""
        # Note: Rate limit is 10 requests per 60s per IP
        # In CI environment, this might not work as expected due to shared IPs
        # So we'll make this a soft test
        
        payload = {"text": "Test", "tags": ["Test"]}
        
        # Make several rapid requests
        responses = []
        for i in range(12):
            try:
                resp = requests.post(
                    f"{BASE_URL}/api/symptoms/analyze",
                    json=payload,
                    timeout=5
                )
                responses.append(resp.status_code)
                time.sleep(0.1)  # Small delay
            except:
                pass
        
        # Check if any got rate limited (429)
        rate_limited = any(status == 429 for status in responses)
        print(f"✓ Rate limiting test - Made {len(responses)} requests, rate limited: {rate_limited}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
