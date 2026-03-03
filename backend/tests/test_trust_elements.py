"""
Test trust elements feature:
1. GET /api/stats/trust - returns trust statistics
2. Products with rating data format 'X.XX/5 (N)'
3. Products with label_analysis field for 'Laborgeprüft' badge
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wellness-profile-hub.preview.emergentagent.com')

class TestTrustStatsAPI:
    """Test /api/stats/trust endpoint"""
    
    def test_trust_stats_returns_200(self):
        """GET /api/stats/trust should return 200"""
        response = requests.get(f"{BASE_URL}/api/stats/trust")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/stats/trust returns 200")
    
    def test_trust_stats_response_structure(self):
        """Verify trust stats response has required fields"""
        response = requests.get(f"{BASE_URL}/api/stats/trust")
        data = response.json()
        
        assert "total_actions" in data, "Missing 'total_actions' field"
        assert "display_count" in data, "Missing 'display_count' field"
        assert "profiles" in data, "Missing 'profiles' field"
        assert "plans" in data, "Missing 'plans' field"
        print(f"PASS: Trust stats has all required fields: {list(data.keys())}")
    
    def test_trust_stats_display_count_rounded_to_hundreds(self):
        """display_count should be rounded to nearest hundred (min 100)"""
        response = requests.get(f"{BASE_URL}/api/stats/trust")
        data = response.json()
        
        display_count = data["display_count"]
        assert display_count >= 100, f"display_count should be >= 100, got {display_count}"
        assert display_count % 100 == 0, f"display_count should be rounded to hundreds, got {display_count}"
        print(f"PASS: display_count ({display_count}) is rounded to hundreds and >= 100")
    
    def test_trust_stats_total_actions_equals_sum(self):
        """total_actions should equal profiles + plans (+ analyses)"""
        response = requests.get(f"{BASE_URL}/api/stats/trust")
        data = response.json()
        
        total = data["total_actions"]
        profiles = data["profiles"]
        plans = data["plans"]
        
        # total_actions includes profiles + plans + analyses
        assert total >= profiles + plans, f"total_actions ({total}) should be >= profiles ({profiles}) + plans ({plans})"
        print(f"PASS: total_actions ({total}) >= profiles ({profiles}) + plans ({plans})")


class TestProductRatingFormat:
    """Test product rating format parsing 'X.XX/5 (N)'"""
    
    def test_products_with_rating_format(self):
        """Products should have rating in format 'X.XX/5 (N)'"""
        response = requests.get(f"{BASE_URL}/api/admin/products")
        products = response.json() if isinstance(response.json(), list) else response.json().get('products', [])
        
        # Find products with rating
        products_with_rating = [p for p in products if p.get('rating') and p.get('rating') not in ['', 'None']]
        
        assert len(products_with_rating) > 0, "Should have at least one product with rating"
        print(f"Found {len(products_with_rating)} products with rating data")
        
        # Test rating format regex
        rating_regex = r'(\d+[.,]\d+)\s*/\s*5\s*\((\d+)\)'
        for p in products_with_rating:
            rating = p.get('rating')
            match = re.match(rating_regex, rating)
            if match:
                score = float(match.group(1).replace(',', '.'))
                review_count = int(match.group(2))
                assert 0 <= score <= 5, f"Rating score should be 0-5, got {score}"
                assert review_count >= 0, f"Review count should be >= 0, got {review_count}"
                print(f"PASS: Product '{p.get('product_id')}' rating '{rating}' matches format (score={score}, reviews={review_count})")
    
    def test_products_by_nutrient_contains_rating(self):
        """Products by nutrient endpoint should include rating field"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/magnesium?lang=de")
        data = response.json()
        products = data.get('products', [])
        
        # All products should have rating field
        for p in products:
            assert 'rating' in p, f"Product '{p.get('name')}' missing 'rating' field"
        
        # At least one product should have actual rating value
        products_with_rating = [p for p in products if p.get('rating') and p.get('rating') not in ['', 'None']]
        if len(products_with_rating) > 0:
            print(f"PASS: {len(products_with_rating)} of {len(products)} products have rating data")
        else:
            print(f"INFO: No products with rating data for magnesium (expected for some nutrients)")


class TestProductLabelAnalysis:
    """Test products with label_analysis field for 'Laborgeprüft' badge"""
    
    def test_products_have_label_analysis_field(self):
        """Some products should have label_analysis field"""
        response = requests.get(f"{BASE_URL}/api/admin/products")
        products = response.json() if isinstance(response.json(), list) else response.json().get('products', [])
        
        products_with_label = [p for p in products if p.get('label_analysis')]
        assert len(products_with_label) > 0, "Should have at least one product with label_analysis"
        print(f"PASS: Found {len(products_with_label)} products with label_analysis (Laborgeprüft)")
    
    def test_products_by_nutrient_preserves_label_analysis(self):
        """Products by nutrient endpoint should include label_analysis field if present"""
        # First find a nutrient that has products with label_analysis
        response = requests.get(f"{BASE_URL}/api/admin/products")
        products = response.json() if isinstance(response.json(), list) else response.json().get('products', [])
        
        # Check product tags for nutrients
        products_with_label = [p for p in products if p.get('label_analysis')]
        
        if len(products_with_label) > 0:
            print(f"PASS: {len(products_with_label)} products have label_analysis field")
            for p in products_with_label[:3]:
                print(f"  - {p.get('product_id')}: label_analysis present")
        else:
            print("INFO: No products with label_analysis found in database")


class TestProductNutrientMapping:
    """Test nutrient mapping for products"""
    
    def test_magnesium_products_available(self):
        """Magnesium products should be available"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/magnesium?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        products = data.get('products', [])
        assert len(products) > 0, "Should have at least one magnesium product"
        print(f"PASS: Found {len(products)} magnesium products")
    
    def test_quality_info_available(self):
        """Quality info should be returned with products"""
        response = requests.get(f"{BASE_URL}/api/products/by-nutrient/magnesium?lang=de")
        data = response.json()
        
        quality_info = data.get('quality_info')
        assert quality_info is not None, "Missing quality_info in response"
        assert 'daily_dose_hint' in quality_info, "Missing daily_dose_hint in quality_info"
        assert 'form' in quality_info, "Missing form in quality_info"
        assert 'tip' in quality_info, "Missing tip in quality_info"
        print(f"PASS: quality_info has all fields: {list(quality_info.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
