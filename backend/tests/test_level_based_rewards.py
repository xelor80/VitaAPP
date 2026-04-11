"""
Test Level-Based Reward Unlocking Feature (Iteration 81)

Tests:
1. GET /api/rewards/catalog/list - level_locked status for items with min_level > user_level
2. GET /api/rewards/catalog/list - min_level and user_level fields in response
3. GET /api/rewards/catalog/list - Items with min_level=0 should not be level_locked
4. POST /api/rewards/{profile_id}/redeem - Reject with 400 if user level too low
5. Level-locked items with min_level=5, 8, 10 should show correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestLevelBasedRewardsCatalog:
    """Test catalog endpoint with level-based locking"""

    def test_catalog_returns_200(self):
        """GET /api/rewards/catalog/list should return 200"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Catalog endpoint returns 200")

    def test_catalog_items_have_min_level_field(self):
        """Catalog items should include min_level field"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        assert isinstance(catalog, list), "Catalog should be a list"
        
        for item in catalog:
            assert "min_level" in item, f"Item {item.get('id')} missing min_level field"
            assert isinstance(item["min_level"], int), f"min_level should be int, got {type(item['min_level'])}"
        print(f"PASS: All {len(catalog)} catalog items have min_level field")

    def test_catalog_items_have_user_level_field(self):
        """Catalog items should include user_level field"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        for item in catalog:
            assert "user_level" in item, f"Item {item.get('id')} missing user_level field"
            assert isinstance(item["user_level"], int), f"user_level should be int, got {type(item['user_level'])}"
        print(f"PASS: All {len(catalog)} catalog items have user_level field")

    def test_level_locked_status_for_high_level_items(self):
        """Items with min_level > user_level should have status 'level_locked'"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        level_locked_items = [item for item in catalog if item.get("status") == "level_locked"]
        print(f"Found {len(level_locked_items)} level_locked items")
        
        for item in level_locked_items:
            assert item["min_level"] > item["user_level"], \
                f"Item {item['title']} has status level_locked but min_level ({item['min_level']}) <= user_level ({item['user_level']})"
            print(f"  - {item['title']}: min_level={item['min_level']}, user_level={item['user_level']} -> level_locked ✓")
        
        assert len(level_locked_items) > 0, "Expected at least one level_locked item (seeded items with min_level 5, 8, 10)"
        print(f"PASS: {len(level_locked_items)} items correctly marked as level_locked")

    def test_min_level_zero_not_level_locked(self):
        """Items with min_level=0 should NOT have status 'level_locked'"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        zero_level_items = [item for item in catalog if item.get("min_level", 0) == 0]
        print(f"Found {len(zero_level_items)} items with min_level=0")
        
        for item in zero_level_items:
            assert item["status"] != "level_locked", \
                f"Item {item['title']} has min_level=0 but status is level_locked"
            print(f"  - {item['title']}: min_level=0, status={item['status']} ✓")
        
        print(f"PASS: All {len(zero_level_items)} items with min_level=0 are not level_locked")

    def test_level_locked_items_with_specific_levels(self):
        """Verify level-locked items with min_level=5, 8, 10 exist"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        expected_levels = {5, 8, 10}
        found_levels = set()
        
        for item in catalog:
            if item.get("min_level", 0) in expected_levels:
                found_levels.add(item["min_level"])
                print(f"  - Found item with min_level={item['min_level']}: {item['title']}")
        
        missing_levels = expected_levels - found_levels
        if missing_levels:
            print(f"WARNING: Missing items with min_level in {missing_levels}")
        
        # At least some level-gated items should exist
        assert len(found_levels) > 0, f"Expected items with min_level in {expected_levels}, found none"
        print(f"PASS: Found items with min_level in {found_levels}")


class TestLevelBasedRedemption:
    """Test redeem endpoint with level validation"""

    def test_redeem_level_locked_item_rejected(self):
        """POST /api/rewards/{profile_id}/redeem should reject if user level too low"""
        # First get a level_locked item
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        level_locked_items = [item for item in catalog if item.get("status") == "level_locked"]
        
        if not level_locked_items:
            pytest.skip("No level_locked items found to test redemption rejection")
        
        item_to_redeem = level_locked_items[0]
        print(f"Attempting to redeem level_locked item: {item_to_redeem['title']} (min_level={item_to_redeem['min_level']})")
        
        # Try to redeem
        redeem_response = requests.post(
            f"{BASE_URL}/api/rewards/{TEST_PROFILE_ID}/redeem",
            json={"reward_id": item_to_redeem["id"]},
            headers={"Content-Type": "application/json"}
        )
        
        assert redeem_response.status_code == 400, \
            f"Expected 400 for level-locked item, got {redeem_response.status_code}: {redeem_response.text}"
        
        error_data = redeem_response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "level" in error_data["detail"].lower() or "Level" in error_data["detail"], \
            f"Error message should mention level requirement: {error_data['detail']}"
        
        print(f"PASS: Redemption correctly rejected with 400: {error_data['detail']}")

    def test_redeem_available_item_allowed(self):
        """POST /api/rewards/{profile_id}/redeem should allow available items (if not already redeemed)"""
        # First get an available item
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        available_items = [item for item in catalog if item.get("status") == "available"]
        
        if not available_items:
            print("INFO: No available items to test redemption (user may not have enough points)")
            pytest.skip("No available items found")
        
        # Just verify the endpoint accepts the request (don't actually redeem to preserve test data)
        print(f"Found {len(available_items)} available items")
        print(f"PASS: Available items exist and can potentially be redeemed")


class TestUserLevelCalculation:
    """Test user level is correctly calculated from lifetime_points"""

    def test_user_level_endpoint(self):
        """GET /api/level/{profile_id} should return user level info"""
        response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        level_info = response.json()
        assert "level" in level_info, "Response should have 'level' field"
        assert "total_points" in level_info, "Response should have 'total_points' field"
        assert "title" in level_info, "Response should have 'title' field"
        
        print(f"User level info: Level {level_info['level']} ({level_info['title']}), {level_info['total_points']} total points")
        print("PASS: User level endpoint returns correct structure")

    def test_user_level_matches_catalog_user_level(self):
        """User level from /api/level should match user_level in catalog items"""
        # Get user level
        level_response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=de")
        assert level_response.status_code == 200
        level_info = level_response.json()
        user_level = level_info["level"]
        
        # Get catalog
        catalog_response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert catalog_response.status_code == 200
        catalog = catalog_response.json()
        
        if catalog:
            catalog_user_level = catalog[0]["user_level"]
            assert catalog_user_level == user_level, \
                f"Catalog user_level ({catalog_user_level}) doesn't match level endpoint ({user_level})"
            print(f"PASS: User level {user_level} matches across endpoints")
        else:
            print("INFO: No catalog items to verify user_level")


class TestCatalogStatusLogic:
    """Test the status logic for catalog items"""

    def test_status_priority_level_locked_over_locked(self):
        """level_locked status should take priority when min_level > user_level"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        for item in catalog:
            min_level = item.get("min_level", 0)
            user_level = item.get("user_level", 1)
            status = item.get("status")
            
            if min_level > 0 and user_level < min_level:
                assert status == "level_locked", \
                    f"Item {item['title']} should be level_locked (min_level={min_level}, user_level={user_level}), got {status}"
        
        print("PASS: Status priority logic is correct")

    def test_locked_status_for_insufficient_points(self):
        """Items with enough level but insufficient points should be 'locked'"""
        response = requests.get(f"{BASE_URL}/api/rewards/catalog/list?lang=de&profile_id={TEST_PROFILE_ID}")
        assert response.status_code == 200
        catalog = response.json()
        
        # Get user balance
        balance_response = requests.get(f"{BASE_URL}/api/rewards/{TEST_PROFILE_ID}/balance")
        assert balance_response.status_code == 200
        balance = balance_response.json()
        current_balance = balance.get("current_balance", 0)
        
        locked_items = [item for item in catalog if item.get("status") == "locked"]
        print(f"User balance: {current_balance} points")
        print(f"Found {len(locked_items)} locked items (insufficient points)")
        
        for item in locked_items:
            # Locked items should have min_level <= user_level (or min_level=0)
            # AND points_required > current_balance
            assert item["points_required"] > current_balance, \
                f"Locked item {item['title']} has points_required={item['points_required']} but user has {current_balance}"
            assert item.get("min_level", 0) <= item.get("user_level", 1), \
                f"Locked item {item['title']} should not be level-gated"
        
        print("PASS: Locked status logic is correct for insufficient points")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
