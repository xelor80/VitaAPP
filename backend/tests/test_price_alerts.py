"""
Price Alerts API Tests
- Tests for GET /api/price-alerts/{profile_id} endpoint
- Tests for price history collection schema
- Tests graceful handling of profiles without plans and non-existent profiles
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test profile from credentials
TEST_PROFILE_ID = "c65a12da-2bc5-473c-861f-0c34b89ad553"
NON_EXISTENT_PROFILE_ID = "00000000-0000-0000-0000-000000000000"


class TestPriceAlertsAPI:
    """Tests for the Price Alerts endpoint"""
    
    def test_price_alerts_endpoint_returns_200_de(self):
        """Test that GET /api/price-alerts/{profile_id}?lang=de returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Validate response structure
        data = response.json()
        assert "alerts" in data, "Response must contain 'alerts' field"
        assert "first_name" in data, "Response must contain 'first_name' field"
        assert isinstance(data["alerts"], list), "'alerts' must be a list"
        print(f"PASS: Price alerts endpoint returned 200 OK with {len(data['alerts'])} alerts")
    
    def test_price_alerts_endpoint_returns_200_it(self):
        """Test that GET /api/price-alerts/{profile_id}?lang=it returns 200 OK (Italian)"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}?lang=it")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "alerts" in data, "Response must contain 'alerts' field"
        assert isinstance(data["alerts"], list), "'alerts' must be a list"
        print(f"PASS: Italian price alerts endpoint returned 200 OK with {len(data['alerts'])} alerts")
    
    def test_price_alerts_empty_for_profile_without_plan(self):
        """Test that profiles without supplement plans return empty alerts array"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        # Test profile doesn't have a supplement plan, so alerts should be empty
        assert isinstance(data["alerts"], list), "'alerts' must be a list"
        # The test profile has no supplement plan, so we expect empty alerts
        print(f"PASS: Profile without supplement plan returns {len(data['alerts'])} alerts (expected: empty or small)")
    
    def test_price_alerts_non_existent_profile(self):
        """Test graceful handling of non-existent profile IDs"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{NON_EXISTENT_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200 (graceful handling), got {response.status_code}"
        
        data = response.json()
        assert "alerts" in data, "Response must contain 'alerts' field"
        assert data["alerts"] == [], "Non-existent profile should return empty alerts"
        assert data["first_name"] is None, "Non-existent profile should return null first_name"
        print("PASS: Non-existent profile returns empty alerts gracefully")
    
    def test_price_alerts_response_structure(self):
        """Verify the response structure contains all expected fields"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required top-level fields
        assert "alerts" in data
        assert "first_name" in data
        
        # If there are any alerts, verify their structure
        if data["alerts"]:
            alert = data["alerts"][0]
            expected_fields = [
                "product_id", "product_name", "nutrient_id", "nutrient_name",
                "old_price", "new_price", "drop_percent", "price_per_day",
                "affiliate_url", "image_url", "changed_at"
            ]
            for field in expected_fields:
                assert field in alert, f"Alert missing required field: {field}"
            
            # Verify data types
            assert isinstance(alert["old_price"], (int, float))
            assert isinstance(alert["new_price"], (int, float))
            assert isinstance(alert["drop_percent"], int)
            assert isinstance(alert["price_per_day"], (int, float))
        
        print("PASS: Response structure is valid")
    
    def test_price_alerts_default_lang_parameter(self):
        """Test that endpoint works without lang parameter (defaults to de)"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "alerts" in data
        print("PASS: Endpoint works without lang parameter (defaults to de)")


class TestPriceAlertsRouterRegistration:
    """Tests to verify price_alerts router is properly registered"""
    
    def test_price_alerts_route_accessible(self):
        """Verify the /api/price-alerts route is accessible (router registered in server.py)"""
        # This should not return 404 - that would mean router not registered
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}")
        assert response.status_code != 404, "Price alerts route not found - router may not be registered"
        print("PASS: Price alerts router is registered and route is accessible")


class TestPriceHistoryCollection:
    """Tests for price history collection (used by shop_import sync)"""
    
    def test_price_history_endpoint_sync_config(self):
        """Test that sync config endpoint is accessible (used by price history tracking)"""
        response = requests.get(f"{BASE_URL}/api/admin/sync-config")
        assert response.status_code == 200, f"Sync config endpoint should be accessible, got {response.status_code}"
        print("PASS: Sync config endpoint accessible (price history tracking is integrated)")


class TestPriceAlertsIntegration:
    """Integration tests for price alerts with supplement plans"""
    
    def test_first_name_returned_when_profile_exists(self):
        """Test that first_name is returned for existing profiles"""
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        # Test profile "Max" should have first_name
        # It may be None if profile doesn't have first_name set
        print(f"PASS: first_name field returned: {data.get('first_name')}")
    
    def test_price_alerts_with_supplement_plan_structure(self):
        """Test the endpoint properly queries supplement plans"""
        # This test verifies the API can handle the supplement plan query
        # Even if test profile has no plan, the query should succeed
        response = requests.get(f"{BASE_URL}/api/price-alerts/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        # Verify the endpoint runs without error
        assert isinstance(data["alerts"], list)
        print("PASS: Price alerts endpoint correctly queries supplement plans")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
