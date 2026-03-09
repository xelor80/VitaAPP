"""
Test Shopify Sync System Improvements (Full Re-Import & Enhanced Sync History)

Tests for:
1. POST /api/admin/full-reimport/{lang} - Full re-import endpoint (DE/IT/invalid lang)
2. GET /api/admin/sync-history - Enhanced sync history with 'type' field
3. Daily sync interval support in sync config
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "Wk220480xel!"


class TestFullReimportEndpoint:
    """Full Re-Import API Endpoint Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test configuration before running tests"""
        # Set up DE and IT configs with test URLs so full-reimport has valid config
        for lang in ['de', 'it']:
            requests.post(f"{BASE_URL}/api/admin/sync-config", json={
                "lang": lang,
                "shop_url": f"https://test-shop.example.com/{lang}",
                "interval": "weekly",
                "enabled": False
            })
    
    def test_full_reimport_de_returns_job_id(self):
        """POST /api/admin/full-reimport/de returns job_id and started status"""
        response = requests.post(f"{BASE_URL}/api/admin/full-reimport/de")
        
        # Should return 200 with job_id
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "job_id" in data, f"Response missing job_id: {data}"
        assert "status" in data, f"Response missing status: {data}"
        assert data["status"] == "started", f"Expected status 'started', got: {data['status']}"
        assert len(data["job_id"]) > 0, "job_id should not be empty"
        
        # Should also have info field
        assert "info" in data, "Response should contain info field"
        print(f"TEST PASS: Full reimport DE started with job_id: {data['job_id']}")
    
    def test_full_reimport_it_returns_job_id(self):
        """POST /api/admin/full-reimport/it returns job_id and started status"""
        response = requests.post(f"{BASE_URL}/api/admin/full-reimport/it")
        
        # Should return 200 with job_id
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "job_id" in data, f"Response missing job_id: {data}"
        assert "status" in data, f"Response missing status: {data}"
        assert data["status"] == "started", f"Expected status 'started', got: {data['status']}"
        print(f"TEST PASS: Full reimport IT started with job_id: {data['job_id']}")
    
    def test_full_reimport_invalid_lang_returns_400(self):
        """POST /api/admin/full-reimport/xx returns 400 error for invalid language"""
        response = requests.post(f"{BASE_URL}/api/admin/full-reimport/xx")
        
        # Should return 400 for invalid language
        assert response.status_code == 400, f"Expected 400 for invalid lang, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, f"Error response should have detail: {data}"
        print(f"TEST PASS: Invalid language properly rejected with 400")
    
    def test_full_reimport_en_returns_400(self):
        """POST /api/admin/full-reimport/en returns 400 error for unsupported language"""
        response = requests.post(f"{BASE_URL}/api/admin/full-reimport/en")
        assert response.status_code == 400, f"Expected 400 for 'en' lang, got {response.status_code}"
        print(f"TEST PASS: 'en' language properly rejected with 400")


class TestSyncHistoryEndpoint:
    """Sync History API Endpoint Tests"""
    
    def test_sync_history_returns_200(self):
        """GET /api/admin/sync-history returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/sync-history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "history" in data, "Response should contain 'history' field"
        assert "total" in data, "Response should contain 'total' field"
        assert isinstance(data["history"], list), "history should be a list"
        print(f"TEST PASS: Sync history returns {len(data['history'])} entries, total: {data['total']}")
    
    def test_sync_history_filter_by_lang_de(self):
        """GET /api/admin/sync-history?lang=de filters by language"""
        response = requests.get(f"{BASE_URL}/api/admin/sync-history?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "history" in data, "Response should contain 'history' field"
        
        # All entries should be for 'de' if any exist
        for entry in data["history"]:
            assert entry.get("lang") == "de", f"Expected lang='de', got: {entry.get('lang')}"
        
        print(f"TEST PASS: Sync history DE filter works, {len(data['history'])} entries")
    
    def test_sync_history_filter_by_lang_it(self):
        """GET /api/admin/sync-history?lang=it filters by language"""
        response = requests.get(f"{BASE_URL}/api/admin/sync-history?lang=it")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "history" in data, "Response should contain 'history' field"
        
        # All entries should be for 'it' if any exist
        for entry in data["history"]:
            assert entry.get("lang") == "it", f"Expected lang='it', got: {entry.get('lang')}"
        
        print(f"TEST PASS: Sync history IT filter works, {len(data['history'])} entries")
    
    def test_sync_history_entries_have_type_field(self):
        """Sync history entries include type field (sync or force_reimport)"""
        # First, trigger a reimport to ensure we have entries with type
        requests.post(f"{BASE_URL}/api/admin/sync-config", json={
            "lang": "de",
            "shop_url": "https://test-shop.example.com/de",
            "interval": "weekly",
            "enabled": False
        })
        requests.post(f"{BASE_URL}/api/admin/full-reimport/de")
        
        # Give it a moment then check history
        import time
        time.sleep(2)
        
        response = requests.get(f"{BASE_URL}/api/admin/sync-history")
        assert response.status_code == 200
        
        data = response.json()
        
        # If we have entries, verify they have the expected fields
        if len(data["history"]) > 0:
            first_entry = data["history"][0]
            
            # Verify type field exists
            assert "type" in first_entry, f"Entry should have 'type' field: {first_entry}"
            assert first_entry["type"] in ["sync", "force_reimport"], f"Type should be 'sync' or 'force_reimport': {first_entry['type']}"
            
            # Verify other expected fields
            expected_fields = ["timestamp", "lang", "status", "type"]
            for field in expected_fields:
                assert field in first_entry, f"Entry missing field '{field}': {first_entry}"
            
            # Verify sync result fields (if present, they should be numeric)
            result_fields = ["imported", "updated", "removed", "errors"]
            for field in result_fields:
                if field in first_entry:
                    assert isinstance(first_entry[field], (int, type(None))), f"Field {field} should be int or None"
            
            print(f"TEST PASS: Sync history entry has all required fields including type='{first_entry['type']}'")
        else:
            print(f"TEST PASS: Sync history endpoint works (no entries yet)")


class TestSyncConfigDailyInterval:
    """Daily Sync Interval Support Tests"""
    
    def test_sync_config_accepts_daily_interval(self):
        """POST /api/admin/sync-config accepts 'daily' interval"""
        response = requests.post(f"{BASE_URL}/api/admin/sync-config", json={
            "lang": "de",
            "shop_url": "https://test-shop.example.com",
            "interval": "daily",
            "enabled": True
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "saved", f"Expected status 'saved': {data}"
        assert data.get("config", {}).get("interval") == "daily", f"Interval should be 'daily': {data}"
        
        print(f"TEST PASS: Daily interval accepted for sync config")
    
    def test_sync_config_weekly_interval_still_works(self):
        """POST /api/admin/sync-config still accepts 'weekly' interval"""
        response = requests.post(f"{BASE_URL}/api/admin/sync-config", json={
            "lang": "it",
            "shop_url": "https://test-shop.example.com",
            "interval": "weekly",
            "enabled": False
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"TEST PASS: Weekly interval still works")
    
    def test_sync_config_monthly_interval_still_works(self):
        """POST /api/admin/sync-config still accepts 'monthly' interval"""
        response = requests.post(f"{BASE_URL}/api/admin/sync-config", json={
            "lang": "de",
            "shop_url": "https://test-shop.example.com",
            "interval": "monthly",
            "enabled": False
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"TEST PASS: Monthly interval still works")
    
    def test_sync_config_invalid_interval_rejected(self):
        """POST /api/admin/sync-config rejects invalid intervals"""
        response = requests.post(f"{BASE_URL}/api/admin/sync-config", json={
            "lang": "de",
            "shop_url": "https://test-shop.example.com",
            "interval": "hourly",  # Invalid
            "enabled": True
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid interval, got {response.status_code}"
        print(f"TEST PASS: Invalid interval 'hourly' properly rejected")


class TestUserStatsEndpoint:
    """User Statistics Endpoint Tests"""
    
    def test_user_stats_endpoint_returns_200(self):
        """GET /api/admin/user-stats returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/user-stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = ["total_profiles", "new_profiles_7d", "new_profiles_30d", 
                          "active_users_7d", "active_users_30d", "total_analyses"]
        
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}'"
        
        print(f"TEST PASS: User stats endpoint returns all expected fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
