"""
Tests for enhanced nutrient risk cards product comparison API
Tests GET /api/products/by-nutrient/{nutrient} endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductByNutrientAPI:
    """Tests for the /products/by-nutrient/{nutrient} endpoint"""
    
    def test_magnesium_returns_products_and_quality_info(self):
        """Test magnesium endpoint returns products with quality_info"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/magnesium?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "quality_info" in data
        assert len(data["products"]) > 0
        
        # Validate quality_info structure
        quality = data["quality_info"]
        assert quality is not None
        assert "daily_dose_hint" in quality
        assert "form" in quality
        assert "tip" in quality
        assert quality["daily_dose_hint"] == "300-400 mg"
        
        # Validate product structure
        product = data["products"][0]
        assert "product_id" in product
        assert "name" in product
        assert "description" in product
        assert "price" in product
        assert "affiliate_url" in product
        
    def test_zinc_returns_products_and_quality_info(self):
        """Test zinc endpoint returns products with quality_info"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/zinc?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "quality_info" in data
        assert len(data["products"]) > 0
        assert data["quality_info"]["daily_dose_hint"] == "10-15 mg"
        
    def test_omega3_returns_products_and_quality_info(self):
        """Test omega3 endpoint returns products with quality_info"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/omega3?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "quality_info" in data
        assert len(data["products"]) > 0
        assert data["quality_info"]["form"] == "Triglycerid-Form"
        
    def test_iron_returns_products_and_quality_info(self):
        """Test iron endpoint returns products with quality_info"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/iron?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "quality_info" in data
        assert len(data["products"]) > 0
        assert data["quality_info"]["tip"] == "Nicht zusammen mit Kaffee/Tee einnehmen"
        
    def test_vitamin_d_returns_products_and_quality_info(self):
        """Test vitamin_d endpoint returns products with quality_info"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/vitamin_d?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "quality_info" in data
        assert data["quality_info"] is not None
        assert data["quality_info"]["form"] == "Vitamin D3 + K2"
        
    def test_b_vitamins_returns_products_and_quality_info(self):
        """Test b_vitamins endpoint returns products with quality_info"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/b_vitamins?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "quality_info" in data
        assert data["quality_info"] is not None
        
    def test_iodine_returns_products_but_no_quality_info(self):
        """Test iodine endpoint returns products - iodine has no custom quality info defined"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/iodine?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        # iodine is mapped to mineralstoffe tags but has no quality_info in NUTRIENT_QUALITY_INFO
        assert "quality_info" in data
        # quality_info may be None for iodine as it's not defined
        
    def test_unknown_nutrient_returns_empty(self):
        """Test unknown nutrient returns empty products array"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/unknown_nutrient?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert data["products"] == []
        assert data["quality_info"] is None
        
    def test_product_has_all_required_fields(self):
        """Verify product response has all required fields for UI display"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/magnesium?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        product = data["products"][0]
        
        # Required fields for product comparison page
        required_fields = ["product_id", "name", "description", "price", "affiliate_url", "tags"]
        for field in required_fields:
            assert field in product, f"Missing required field: {field}"
            
        # Optional but expected fields
        optional_fields = ["image_url", "rating", "application_instructions"]
        for field in optional_fields:
            # These may or may not be present, just check they're strings if present
            if field in product:
                assert isinstance(product[field], str) or product[field] is None


class TestHealthProfileAPI:
    """Tests for health profile API to verify deficiencies data"""
    
    def test_health_profile_returns_deficiencies(self):
        """Test health profile returns deficiencies array with risk levels"""
        profile_id = "2c0ba8c7-729e-49b2-a144-1068e03c8301"
        response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "profile" in data
        assert "assessment" in data
        
        # Verify deficiencies
        deficiencies = data["assessment"]["deficiencies"]
        assert len(deficiencies) > 0
        
        # Count risk levels
        high_count = len([d for d in deficiencies if d["risk_level"] == "high"])
        medium_count = len([d for d in deficiencies if d["risk_level"] == "medium"])
        
        assert high_count == 7, f"Expected 7 high risk, got {high_count}"
        assert medium_count == 1, f"Expected 1 medium risk, got {medium_count}"
        
    def test_deficiency_has_required_fields(self):
        """Verify each deficiency has fields needed for CTA navigation"""
        profile_id = "2c0ba8c7-729e-49b2-a144-1068e03c8301"
        response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert response.status_code == 200
        
        deficiencies = response.json()["assessment"]["deficiencies"]
        
        for d in deficiencies:
            assert "nutrient" in d, f"Missing nutrient key"
            assert "risk_level" in d, f"Missing risk_level"
            assert d["risk_level"] in ["high", "medium", "low"]
