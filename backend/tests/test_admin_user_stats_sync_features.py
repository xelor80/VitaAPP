"""
Test Admin Panel New Features:
1. User Statistics Dashboard (/api/admin/user-stats)
2. Shopify Sync History (/api/admin/sync-history)
3. Daily sync interval option in sync-config
4. Profile stat in header stats (/api/admin/stats)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
ADMIN_PASSWORD = "Wk220480xel!"

if not BASE_URL:
    BASE_URL = "https://stress-relief-app-11.preview.emergentagent.com"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_auth_success(self):
        """Admin login with correct password returns token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Auth failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert isinstance(data["token"], str), "Token should be a string"
        print(f"✓ Admin auth successful, token received: {data['token'][:20]}...")
    
    def test_admin_auth_wrong_password(self):
        """Admin login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": "wrong_password"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 401, f"Expected 401 for wrong password, got {response.status_code}"
        print("✓ Wrong password correctly rejected")


class TestAdminStats:
    """Test /api/admin/stats endpoint - verify profiles count is included"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_stats_returns_profiles(self, auth_token):
        """GET /api/admin/stats should return profiles count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Stats endpoint failed: {response.text}"
        data = response.json()
        
        # Verify profiles field is present
        assert "profiles" in data, f"'profiles' field missing from stats. Got: {list(data.keys())}"
        assert isinstance(data["profiles"], int), "profiles should be an integer"
        
        # Verify other expected fields
        expected_fields = ["products_de", "products_it", "recipes", "analyses", "affiliate_clicks"]
        for field in expected_fields:
            assert field in data, f"Field '{field}' missing from stats"
        
        print(f"✓ Stats endpoint includes profiles: {data['profiles']}")
        print(f"  Other stats: DE={data['products_de']}, IT={data['products_it']}, recipes={data['recipes']}, analyses={data['analyses']}")


class TestUserStats:
    """Test /api/admin/user-stats endpoint - detailed user statistics"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_user_stats_endpoint_returns_200(self, auth_token):
        """GET /api/admin/user-stats returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/user-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"user-stats endpoint failed: {response.text}"
        print("✓ /api/admin/user-stats returns 200 OK")
    
    def test_user_stats_returns_required_fields(self, auth_token):
        """GET /api/admin/user-stats returns all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/user-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields from the spec
        required_fields = [
            "total_profiles",
            "new_profiles_7d", 
            "new_profiles_30d",
            "active_users_7d",
            "active_users_30d",
            "compliance_rate_7d",
            "total_analyses",
            "registration_timeline",
            "work_types",
            "languages",
            "top_symptoms"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from user-stats. Got: {list(data.keys())}"
        
        print(f"✓ All required fields present in user-stats response")
        print(f"  total_profiles={data['total_profiles']}, active_7d={data['active_users_7d']}, compliance={data['compliance_rate_7d']}%")
    
    def test_user_stats_data_types(self, auth_token):
        """Verify data types in user-stats response"""
        response = requests.get(
            f"{BASE_URL}/api/admin/user-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # Integer fields
        assert isinstance(data["total_profiles"], int), "total_profiles should be int"
        assert isinstance(data["new_profiles_7d"], int), "new_profiles_7d should be int"
        assert isinstance(data["new_profiles_30d"], int), "new_profiles_30d should be int"
        assert isinstance(data["active_users_7d"], int), "active_users_7d should be int"
        assert isinstance(data["active_users_30d"], int), "active_users_30d should be int"
        assert isinstance(data["total_analyses"], int), "total_analyses should be int"
        
        # Float/int for compliance rate
        assert isinstance(data["compliance_rate_7d"], (int, float)), "compliance_rate_7d should be numeric"
        
        # Lists
        assert isinstance(data["registration_timeline"], list), "registration_timeline should be a list"
        assert isinstance(data["work_types"], list), "work_types should be a list"
        assert isinstance(data["languages"], list), "languages should be a list"
        assert isinstance(data["top_symptoms"], list), "top_symptoms should be a list"
        
        print("✓ All data types are correct in user-stats response")
    
    def test_user_stats_arrays_structure(self, auth_token):
        """Verify structure of arrays in user-stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/user-stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # Registration timeline structure
        if data["registration_timeline"]:
            item = data["registration_timeline"][0]
            assert "month" in item, "registration_timeline items should have 'month'"
            assert "count" in item, "registration_timeline items should have 'count'"
        
        # Work types structure
        if data["work_types"]:
            item = data["work_types"][0]
            assert "label" in item, "work_types items should have 'label'"
            assert "count" in item, "work_types items should have 'count'"
        
        # Languages structure
        if data["languages"]:
            item = data["languages"][0]
            assert "label" in item, "languages items should have 'label'"
            assert "count" in item, "languages items should have 'count'"
        
        # Top symptoms structure
        if data["top_symptoms"]:
            item = data["top_symptoms"][0]
            assert "label" in item, "top_symptoms items should have 'label'"
            assert "count" in item, "top_symptoms items should have 'count'"
            assert "avg_intensity" in item, "top_symptoms items should have 'avg_intensity'"
        
        print("✓ Array structures are correct in user-stats")


class TestSyncHistory:
    """Test /api/admin/sync-history endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_sync_history_endpoint_returns_200(self, auth_token):
        """GET /api/admin/sync-history returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sync-history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"sync-history endpoint failed: {response.text}"
        print("✓ /api/admin/sync-history returns 200 OK")
    
    def test_sync_history_returns_valid_structure(self, auth_token):
        """GET /api/admin/sync-history returns valid structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sync-history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # Should have history array and total count
        assert "history" in data, f"'history' field missing from response. Got: {list(data.keys())}"
        assert "total" in data, f"'total' field missing from response"
        assert isinstance(data["history"], list), "history should be a list"
        assert isinstance(data["total"], int), "total should be an integer"
        
        print(f"✓ sync-history structure valid, total entries: {data['total']}")
    
    def test_sync_history_with_lang_filter(self, auth_token):
        """GET /api/admin/sync-history?lang=de filters by language"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sync-history?lang=de",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All entries should be for 'de' if there are any
        for entry in data["history"]:
            if "lang" in entry:
                assert entry["lang"] == "de", f"Expected lang 'de', got '{entry.get('lang')}'"
        
        print(f"✓ sync-history lang filter works (de entries: {len(data['history'])})")
    
    def test_sync_history_entry_structure(self, auth_token):
        """If sync history has entries, verify entry structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sync-history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # History might be empty (new feature, no syncs run yet)
        if data["history"]:
            entry = data["history"][0]
            expected_fields = ["lang", "timestamp", "status"]
            for field in expected_fields:
                assert field in entry, f"Expected field '{field}' in history entry"
            print(f"✓ sync-history entry has required fields: {list(entry.keys())}")
        else:
            print("✓ sync-history is empty (no syncs run yet, expected for new feature)")


class TestSyncConfigDaily:
    """Test daily interval option in /api/admin/sync-config"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        return response.json()["token"]
    
    def test_sync_config_accepts_daily_interval(self, auth_token):
        """POST /api/admin/sync-config accepts 'daily' interval"""
        test_config = {
            "lang": "de",
            "shop_url": "https://test-shop.example.com",
            "interval": "daily",
            "enabled": False  # Don't actually enable to avoid triggering sync
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/sync-config",
            json=test_config,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 200, f"Failed to save config with daily interval: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("status") == "saved", f"Expected status 'saved', got: {data.get('status')}"
        assert data.get("config", {}).get("interval") == "daily", f"Interval not saved as 'daily'"
        
        print("✓ sync-config accepts 'daily' interval")
    
    def test_sync_config_validates_invalid_interval(self, auth_token):
        """POST /api/admin/sync-config rejects invalid interval"""
        test_config = {
            "lang": "de",
            "shop_url": "https://test-shop.example.com",
            "interval": "hourly",  # Invalid value
            "enabled": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/sync-config",
            json=test_config,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid interval, got: {response.status_code}"
        print("✓ sync-config rejects invalid interval values")
    
    def test_sync_config_accepts_weekly_interval(self, auth_token):
        """POST /api/admin/sync-config accepts 'weekly' interval"""
        test_config = {
            "lang": "it",
            "shop_url": "https://test-shop-it.example.com",
            "interval": "weekly",
            "enabled": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/sync-config",
            json=test_config,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 200, f"Failed to save config with weekly interval: {response.text}"
        print("✓ sync-config accepts 'weekly' interval")
    
    def test_sync_config_accepts_monthly_interval(self, auth_token):
        """POST /api/admin/sync-config accepts 'monthly' interval"""
        test_config = {
            "lang": "de",
            "shop_url": "https://test-shop.example.com",
            "interval": "monthly",
            "enabled": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/sync-config",
            json=test_config,
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            }
        )
        assert response.status_code == 200, f"Failed to save config with monthly interval: {response.text}"
        print("✓ sync-config accepts 'monthly' interval")
    
    def test_get_sync_config_returns_saved_values(self, auth_token):
        """GET /api/admin/sync-config returns previously saved config"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sync-config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return configs for both languages
        assert "de" in data or "it" in data, "sync-config should return language configs"
        
        print(f"✓ sync-config GET returns saved configs: {list(data.keys())}")


class TestAdminHealthCheck:
    """Test admin health endpoint"""
    
    def test_admin_health_endpoint(self):
        """GET /api/admin/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got: {data.get('status')}"
        print("✓ Admin health check OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
