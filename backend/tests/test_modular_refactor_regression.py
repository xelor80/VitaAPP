"""
VitaGuide Backend Regression Tests - Post-Modular Refactoring
Tests all endpoints after server.py was split into modular structure:
- core/config.py, core/helpers.py
- models/schemas.py
- data/catalogs.py, data/prompts.py
- routes/analysis.py, routes/products.py, routes/tracking.py, routes/diary.py, routes/admin.py
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")

BASE_URL = BASE_URL.rstrip('/')


class TestHealthEndpoint:
    """Test /api/health endpoint from routes/admin.py"""
    
    def test_health_returns_ok(self):
        """GET /api/health returns status ok"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        print(f"✓ Health check passed: {data}")


class TestProductsEndpoint:
    """Test /api/products endpoint from routes/products.py"""
    
    def test_products_de_returns_30(self):
        """GET /api/products?lang=de returns 30 German products"""
        response = requests.get(f"{BASE_URL}/api/products?lang=de", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 30, f"Expected 30 products, got {len(data)}"
        
        # Verify product structure
        first = data[0]
        assert "product_id" in first
        assert "name" in first
        assert "affiliate_url" in first
        assert "image_url" in first
        print(f"✓ GET /api/products?lang=de returned {len(data)} German products")
    
    def test_products_it_returns_61(self):
        """GET /api/products?lang=it returns 61 Italian products"""
        response = requests.get(f"{BASE_URL}/api/products?lang=it", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 61, f"Expected 61 products, got {len(data)}"
        print(f"✓ GET /api/products?lang=it returned {len(data)} Italian products")


class TestRecipesEndpoint:
    """Test /api/recipes endpoint from routes/products.py"""
    
    def test_recipes_de_returns_30(self):
        """GET /api/recipes?lang=de returns 30 German recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 30, f"Expected 30 recipes, got {len(data)}"
        
        # Verify recipe structure
        first = data[0]
        assert first["title"] == "Grüner Energie-Smoothie"
        assert "ingredients" in first
        assert "steps" in first
        assert "image_url" in first
        print(f"✓ GET /api/recipes?lang=de returned {len(data)} German recipes")
        print(f"  First recipe: {first['title']}")
    
    def test_recipes_it_returns_30(self):
        """GET /api/recipes?lang=it returns 30 Italian recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 30, f"Expected 30 recipes, got {len(data)}"
        
        # Verify Italian titles
        first = data[0]
        assert first["title"] == "Smoothie Verde Energizzante"
        print(f"✓ GET /api/recipes?lang=it returned {len(data)} Italian recipes")
        print(f"  First recipe: {first['title']}")
    
    def test_recipes_filter_muedigkeit(self):
        """GET /api/recipes?lang=de&tags=Müdigkeit returns filtered recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Müdigkeit", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) < 30, f"Filtered recipes should be less than 30, got {len(data)}"
        assert len(data) >= 1, "Should have at least 1 recipe for Müdigkeit"
        print(f"✓ GET /api/recipes?lang=de&tags=Müdigkeit returned {len(data)} filtered recipes")
    
    def test_recipes_filter_stress(self):
        """GET /api/recipes?lang=de&tags=Stress returns exactly 4 recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&tags=Stress", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 4, f"Expected exactly 4 recipes for Stress, got {len(data)}"
        print(f"✓ GET /api/recipes?lang=de&tags=Stress returned {len(data)} recipes")


class TestClickTracking:
    """Test /api/track/click endpoint from routes/tracking.py"""
    
    def test_track_click_stores_event(self):
        """POST /api/track/click stores event and returns id"""
        payload = {
            "product_id": "TEST_regression_product",
            "affiliate_url": "https://test.example.com/product",
            "source": "regression_test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/track/click",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["product_id"] == payload["product_id"]
        assert data["affiliate_url"] == payload["affiliate_url"]
        assert data["source"] == payload["source"]
        assert "timestamp" in data
        
        print(f"✓ Click tracking successful, event ID: {data['id']}")


class TestDiaryEndpoints:
    """Test /api/diary endpoints from routes/diary.py"""
    
    def test_diary_save_entry(self):
        """POST /api/diary saves diary entry (upsert)"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "date": today,
            "feeling": 4,
            "sleep_hours": 7.5,
            "stress_level": 3,
            "water_glasses": 8,
            "exercise_minutes": 30,
            "notes": "TEST_Regression test entry"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diary",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "saved"
        assert data["date"] == today
        
        print(f"✓ Diary entry saved for {today}")
    
    def test_diary_get_entries(self):
        """GET /api/diary returns entries sorted by date"""
        response = requests.get(f"{BASE_URL}/api/diary?days=7", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 1:
            # Verify descending order
            dates = [e["date"] for e in data]
            assert dates == sorted(dates, reverse=True), "Entries should be sorted by date descending"
        
        print(f"✓ GET /api/diary returned {len(data)} entries")


class TestLLMLogsEndpoint:
    """Test /api/llm-logs endpoint from routes/admin.py"""
    
    def test_llm_logs_returns_stats(self):
        """GET /api/llm-logs returns stats and logs array"""
        response = requests.get(f"{BASE_URL}/api/llm-logs?limit=5", timeout=10)
        assert response.status_code == 200
        
        data = response.json()
        assert "stats" in data
        assert "logs" in data
        assert "total_calls" in data["stats"]
        assert "success_rate" in data["stats"]
        assert "avg_latency_ms" in data["stats"]
        
        print(f"✓ LLM logs stats: {data['stats']}")
    
    def test_llm_logs_filter_by_endpoint(self):
        """GET /api/llm-logs?endpoint=symptoms/analyze filters by endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/llm-logs?endpoint=symptoms/analyze", 
            timeout=10
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        
        # All logs should be for the specified endpoint
        for log in data["logs"]:
            assert log["endpoint"] == "symptoms/analyze"
        
        print(f"✓ LLM logs filtered by endpoint, {len(data['logs'])} logs returned")


class TestSymptomAnalysis:
    """Test /api/symptoms/analyze endpoint from routes/analysis.py"""
    
    def test_symptom_analysis_schema(self):
        """POST /api/symptoms/analyze returns correct schema"""
        payload = {
            "text": "Ich fühle mich müde",
            "tags": ["Müdigkeit"],
            "duration": "",
            "intensity": "",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=60  # LLM takes 10-20s
        )
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields in response
        required_fields = [
            "id", "summary", "red_flags", "supplements_general_info",
            "brand_products", "supplement_schedule", "nutrition_tips",
            "recipes", "disclaimer_short", "input_text", "input_tags",
            "lang", "created_at"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data["lang"] == "de"
        assert data["input_text"] == payload["text"]
        assert data["input_tags"] == payload["tags"]
        
        print(f"✓ Symptom analysis completed with correct schema")
        print(f"  - Analysis ID: {data['id']}")
        print(f"  - Summary length: {len(data['summary'])} chars")
        print(f"  - Products: {len(data.get('brand_products', []))}")
        print(f"  - Recipes: {len(data.get('recipes', []))}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
