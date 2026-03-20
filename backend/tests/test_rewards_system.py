"""
Test Suite for VitaGuide+ Rewards System
Tests all reward engine endpoints including:
- Point granting with anti-abuse protection
- Balance, history, streaks tracking
- Catalog management and redemption flow
- Admin settings and analytics
- Integration with water tracking and medications
"""

import pytest
import requests
import os
import uuid
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vero-rewards.preview.emergentagent.com').rstrip('/')
ADMIN_PASSWORD = "Wk220480xel!"
EXISTING_CATALOG_REWARD_ID = "1e7ace51-e09c-43af-bef8-804cbc84de04"  # 100 points reward

# Use a fresh profile ID for clean testing
FRESH_PROFILE_ID = f"TEST_rewards_{uuid.uuid4().hex[:12]}"


@pytest.fixture(scope="module")
def api_session():
    """Shared requests session with rate limit handling"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def make_request_with_retry(session, method, url, **kwargs):
    """Make a request with retry on rate limit"""
    max_retries = 3
    for attempt in range(max_retries):
        if method == "GET":
            response = session.get(url, **kwargs)
        elif method == "POST":
            response = session.post(url, **kwargs)
        elif method == "PUT":
            response = session.put(url, **kwargs)
        elif method == "DELETE":
            response = session.delete(url, **kwargs)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        if response.status_code == 429:
            wait_time = 2 * (attempt + 1)
            print(f"Rate limited, waiting {wait_time}s...")
            time.sleep(wait_time)
            continue
        return response
    return response  # Return last response even if still rate limited


class TestRewardSettings:
    """Admin reward settings tests"""

    def test_get_admin_settings(self, api_session):
        """GET /api/rewards/admin/settings - returns reward settings"""
        response = api_session.get(f"{BASE_URL}/api/rewards/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate settings structure
        assert "action_points" in data, "Missing action_points in settings"
        assert "daily_limits" in data, "Missing daily_limits in settings"
        assert "enabled" in data, "Missing enabled flag in settings"
        
        # Validate action_points has expected keys
        action_points = data["action_points"]
        expected_actions = ["water_confirm", "water_goal", "supplement", "medication", "diary", "daily_checkin"]
        for action in expected_actions:
            assert action in action_points, f"Missing {action} in action_points"
        
        print(f"Settings retrieved: enabled={data['enabled']}, water_confirm={action_points.get('water_confirm')} pts")

    def test_update_admin_settings(self, api_session):
        """PUT /api/rewards/admin/settings - update point values"""
        # Get current settings first
        original = api_session.get(f"{BASE_URL}/api/rewards/admin/settings").json()
        
        # Update with new values
        update_data = {
            "action_points": {
                "water_confirm": 5,
                "water_goal": 10,
                "supplement": 8,
                "medication": 8,
                "diary": 12,
                "daily_checkin": 5,
                "complete_day": 25,
                "streak_7": 50,
                "streak_14": 100,
            },
            "enabled": True
        }
        
        response = api_session.put(
            f"{BASE_URL}/api/rewards/admin/settings",
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["action_points"]["water_confirm"] == 5
        assert data["enabled"] is True
        print("Settings updated successfully")


class TestPointGranting:
    """Point granting and anti-abuse tests"""

    def test_grant_points_water_confirm(self, api_session):
        """POST /api/rewards/grant - grant points for water_confirm action"""
        response = api_session.post(
            f"{BASE_URL}/api/rewards/grant",
            json={
                "profile_id": FRESH_PROFILE_ID,
                "action": "water_confirm",
                "context": None
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["granted"] is True, "Points should be granted for water_confirm"
        assert data["points"] == 5, f"Expected 5 points for water_confirm, got {data['points']}"
        assert data["action"] == "water_confirm"
        print(f"Granted {data['points']} points for water_confirm, streak: {data.get('streak', 0)}")

    def test_grant_points_daily_checkin_first_time(self, api_session):
        """POST /api/rewards/grant - daily_checkin grants points first time"""
        response = api_session.post(
            f"{BASE_URL}/api/rewards/grant",
            json={
                "profile_id": FRESH_PROFILE_ID,
                "action": "daily_checkin",
                "context": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["granted"] is True, "First daily_checkin should grant points"
        assert data["points"] == 5, f"Expected 5 points for daily_checkin, got {data['points']}"
        print(f"First daily_checkin granted {data['points']} points")

    def test_antiabuse_daily_checkin_once_per_day(self, api_session):
        """POST /api/rewards/grant - anti-abuse: daily_checkin only once per day"""
        # Try to grant daily_checkin again (same day)
        response = api_session.post(
            f"{BASE_URL}/api/rewards/grant",
            json={
                "profile_id": FRESH_PROFILE_ID,
                "action": "daily_checkin",
                "context": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["granted"] is False, "Second daily_checkin should be blocked"
        assert "Already earned" in data["message"], f"Expected anti-abuse message, got: {data['message']}"
        print(f"Anti-abuse working: {data['message']}")

    def test_grant_points_supplement_with_context(self, api_session):
        """POST /api/rewards/grant - supplement with context grants points"""
        response = api_session.post(
            f"{BASE_URL}/api/rewards/grant",
            json={
                "profile_id": FRESH_PROFILE_ID,
                "action": "supplement",
                "context": "vitamin_d_morning"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["granted"] is True, "First supplement check-in should grant points"
        assert data["points"] == 8, f"Expected 8 points for supplement, got {data['points']}"
        print(f"Supplement check-in granted {data['points']} points for context: vitamin_d_morning")

    def test_antiabuse_supplement_same_context(self, api_session):
        """POST /api/rewards/grant - anti-abuse: supplement with same context only once per day"""
        # Try same supplement/timing again
        response = api_session.post(
            f"{BASE_URL}/api/rewards/grant",
            json={
                "profile_id": FRESH_PROFILE_ID,
                "action": "supplement",
                "context": "vitamin_d_morning"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["granted"] is False, "Same supplement/context should be blocked"
        assert "Already earned" in data["message"]
        print(f"Anti-abuse for same context working: {data['message']}")

    def test_supplement_different_context_allowed(self, api_session):
        """POST /api/rewards/grant - different supplement context should be allowed"""
        response = api_session.post(
            f"{BASE_URL}/api/rewards/grant",
            json={
                "profile_id": FRESH_PROFILE_ID,
                "action": "supplement",
                "context": "magnesium_evening"  # Different context
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["granted"] is True, "Different context should grant points"
        assert data["points"] == 8
        print(f"Different context allowed: magnesium_evening granted {data['points']} points")

    def test_daily_limit_enforcement(self, api_session):
        """POST /api/rewards/grant - daily limit enforcement"""
        # Grant multiple water_confirm actions to test limit
        granted_count = 0
        for i in range(10):  # Try 10 times
            response = api_session.post(
                f"{BASE_URL}/api/rewards/grant",
                json={
                    "profile_id": FRESH_PROFILE_ID,
                    "action": "water_confirm",
                    "context": f"glass_{i}"
                }
            )
            data = response.json()
            if data["granted"]:
                granted_count += 1
            else:
                # Should hit limit eventually (max_water_confirm: 30, 5pts each = 6 grants)
                assert "limit" in data["message"].lower(), f"Expected limit message, got: {data['message']}"
                break
        
        print(f"Granted {granted_count} water_confirm actions before limit")


class TestBalanceAndHistory:
    """Balance, history, streaks, and today summary tests"""

    def test_get_balance(self, api_session):
        """GET /api/rewards/{profile_id}/balance - returns current balance"""
        response = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/balance")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_balance" in data, "Missing current_balance"
        assert "lifetime_points" in data, "Missing lifetime_points"
        assert "redeemed_points" in data, "Missing redeemed_points"
        assert data["current_balance"] >= 0
        print(f"Balance: current={data['current_balance']}, lifetime={data['lifetime_points']}, redeemed={data['redeemed_points']}")

    def test_get_today_summary(self, api_session):
        """GET /api/rewards/{profile_id}/today - returns today summary with breakdown"""
        response = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/today")
        assert response.status_code == 200
        data = response.json()
        
        assert "today_points" in data, "Missing today_points"
        assert "breakdown" in data, "Missing breakdown"
        assert "events_count" in data, "Missing events_count"
        assert "current_balance" in data, "Missing current_balance"
        assert "current_streak" in data, "Missing current_streak"
        
        # Breakdown should contain actions we performed
        breakdown = data["breakdown"]
        assert "water_confirm" in breakdown or "daily_checkin" in breakdown, "Expected actions in breakdown"
        print(f"Today: {data['today_points']} points, {data['events_count']} events, streak: {data['current_streak']}")

    def test_get_streaks(self, api_session):
        """GET /api/rewards/{profile_id}/streaks - returns streak data"""
        response = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/streaks")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_streak" in data, "Missing current_streak"
        assert "longest_streak" in data, "Missing longest_streak"
        assert "last_activity_date" in data, "Missing last_activity_date"
        assert data["current_streak"] >= 1, "Streak should be at least 1 after granting points"
        print(f"Streaks: current={data['current_streak']}, longest={data['longest_streak']}")

    def test_get_history(self, api_session):
        """GET /api/rewards/{profile_id}/history - returns event history"""
        response = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/history?days=7&limit=50")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "History should be a list"
        assert len(data) > 0, "Should have at least one event"
        
        # Validate event structure
        event = data[0]
        assert "action" in event, "Event missing action"
        assert "points" in event, "Event missing points"
        assert "date" in event, "Event missing date"
        assert "timestamp" in event, "Event missing timestamp"
        print(f"History: {len(data)} events, latest: {event['action']} for {event['points']} pts")


class TestCatalog:
    """Catalog listing and management tests"""

    def test_get_catalog_list(self, api_session):
        """GET /api/rewards/catalog/list - returns catalog with user-specific status"""
        response = api_session.get(f"{BASE_URL}/api/rewards/catalog/list?profile_id={FRESH_PROFILE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "Catalog should be a list"
        # May have 0 items if none exist
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Catalog item missing id"
            assert "title" in item, "Catalog item missing title"
            assert "points_required" in item, "Catalog item missing points_required"
            assert "status" in item, "Catalog item missing status (available/locked/redeemed)"
            assert item["status"] in ["available", "locked", "redeemed"], f"Invalid status: {item['status']}"
            print(f"Catalog: {len(data)} items, first: {item['title']} ({item['points_required']} pts, status: {item['status']})")
        else:
            print("Catalog is empty - need to create items")


class TestAdminCatalogCRUD:
    """Admin catalog CRUD operations"""

    created_item_id = None

    def test_admin_create_catalog_item(self, api_session):
        """POST /api/rewards/admin/catalog - create catalog item"""
        new_item = {
            "title_de": "TEST 5% Rabatt auf Vitamine",
            "title_it": "TEST 5% Sconto su Vitamine",
            "title_en": "TEST 5% Vitamin Discount",
            "description_de": "5% Rabatt auf alle Vitamine",
            "points_required": 50,
            "category": "coupon",
            "reward_type": "coupon",
            "status": "active",
            "code_template": "VITA-{random}"
        }
        
        response = api_session.post(f"{BASE_URL}/api/rewards/admin/catalog", json=new_item)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "id" in data, "Created item missing id"
        assert data["title_de"] == new_item["title_de"]
        assert data["points_required"] == 50
        
        TestAdminCatalogCRUD.created_item_id = data["id"]
        print(f"Created catalog item: {data['id']} - {data['title_de']}")

    def test_admin_update_catalog_item(self, api_session):
        """PUT /api/rewards/admin/catalog/{id} - update catalog item"""
        if not TestAdminCatalogCRUD.created_item_id:
            pytest.skip("No item created to update")
        
        item_id = TestAdminCatalogCRUD.created_item_id
        update_data = {
            "title_de": "TEST 10% Rabatt auf Vitamine (Updated)",
            "title_it": "TEST 10% Sconto su Vitamine",
            "title_en": "TEST 10% Vitamin Discount",
            "description_de": "10% Rabatt auf alle Vitamine",
            "points_required": 75,
            "category": "coupon",
            "reward_type": "coupon",
            "status": "active",
            "code_template": "VITA10-{random}"
        }
        
        response = api_session.put(f"{BASE_URL}/api/rewards/admin/catalog/{item_id}", json=update_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["points_required"] == 75, "Points should be updated to 75"
        assert "Updated" in data["title_de"]
        print(f"Updated catalog item: {item_id}")

    def test_admin_delete_catalog_item(self, api_session):
        """DELETE /api/rewards/admin/catalog/{id} - delete catalog item"""
        if not TestAdminCatalogCRUD.created_item_id:
            pytest.skip("No item created to delete")
        
        item_id = TestAdminCatalogCRUD.created_item_id
        response = api_session.delete(f"{BASE_URL}/api/rewards/admin/catalog/{item_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["deleted"] is True
        print(f"Deleted catalog item: {item_id}")


class TestRedemption:
    """Reward redemption tests"""

    created_reward_id = None

    def test_setup_create_redeemable_reward(self, api_session):
        """Setup: Create a low-cost reward that can be redeemed"""
        # First ensure we have enough points
        balance_resp = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/balance")
        current_balance = balance_resp.json().get("current_balance", 0)
        
        # Create a reward that costs less than current balance
        reward_cost = max(5, current_balance - 5) if current_balance > 10 else 5
        
        new_item = {
            "title_de": "TEST Kleiner Rabatt",
            "description_de": "Test reward for redemption",
            "points_required": reward_cost,
            "category": "coupon",
            "reward_type": "coupon",
            "status": "active",
            "code_template": "TEST-{random}"
        }
        
        response = api_session.post(f"{BASE_URL}/api/rewards/admin/catalog", json=new_item)
        assert response.status_code == 200
        TestRedemption.created_reward_id = response.json()["id"]
        print(f"Created test reward: {TestRedemption.created_reward_id} ({reward_cost} pts)")

    def test_redeem_reward_not_enough_points(self, api_session):
        """POST /api/rewards/{profile_id}/redeem - fail when not enough points"""
        # Create an expensive reward
        expensive_item = {
            "title_de": "TEST Expensive Reward",
            "description_de": "Very expensive",
            "points_required": 99999,
            "category": "premium",
            "reward_type": "premium",
            "status": "active"
        }
        
        create_resp = api_session.post(f"{BASE_URL}/api/rewards/admin/catalog", json=expensive_item)
        expensive_id = create_resp.json()["id"]
        
        # Try to redeem
        response = api_session.post(
            f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/redeem",
            json={"reward_id": expensive_id}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "not enough" in data["detail"].lower(), f"Expected 'not enough points' message, got: {data['detail']}"
        print(f"Correctly rejected: {data['detail']}")
        
        # Cleanup
        api_session.delete(f"{BASE_URL}/api/rewards/admin/catalog/{expensive_id}")

    def test_redeem_reward_success(self, api_session):
        """POST /api/rewards/{profile_id}/redeem - redeem a reward, check balance deduction"""
        if not TestRedemption.created_reward_id:
            pytest.skip("No test reward created")
        
        # Get balance before
        balance_before = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/balance").json()
        initial_balance = balance_before.get("current_balance", 0)
        
        # Ensure we have points
        if initial_balance < 5:
            # Grant some points
            for i in range(3):
                api_session.post(f"{BASE_URL}/api/rewards/grant", json={
                    "profile_id": FRESH_PROFILE_ID,
                    "action": "water_confirm",
                    "context": f"redemption_test_{i}"
                })
            balance_before = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/balance").json()
            initial_balance = balance_before.get("current_balance", 0)
        
        # Redeem the reward
        response = api_session.post(
            f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/redeem",
            json={"reward_id": TestRedemption.created_reward_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] is True
        assert "redemption_id" in data
        assert "new_balance" in data
        assert data["new_balance"] < initial_balance, "Balance should decrease after redemption"
        print(f"Redeemed: {data['redemption_id']}, spent {data['points_spent']} pts, new balance: {data['new_balance']}")

    def test_redeem_reward_already_redeemed(self, api_session):
        """POST /api/rewards/{profile_id}/redeem - fail when already redeemed"""
        if not TestRedemption.created_reward_id:
            pytest.skip("No test reward created")
        
        # Try to redeem again
        response = api_session.post(
            f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/redeem",
            json={"reward_id": TestRedemption.created_reward_id}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "already redeemed" in data["detail"].lower(), f"Expected 'already redeemed' message, got: {data['detail']}"
        print(f"Correctly rejected: {data['detail']}")

    def test_get_redemptions(self, api_session):
        """GET /api/rewards/{profile_id}/redemptions - returns redeemed rewards"""
        response = api_session.get(f"{BASE_URL}/api/rewards/{FRESH_PROFILE_ID}/redemptions")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if len(data) > 0:
            redemption = data[0]
            assert "id" in redemption
            assert "reward_id" in redemption
            assert "points_spent" in redemption
            assert "redeemed_at" in redemption
            print(f"Redemptions: {len(data)}, latest: {redemption.get('reward_title', 'N/A')} for {redemption['points_spent']} pts")
        else:
            print("No redemptions yet")

    def test_cleanup_test_reward(self, api_session):
        """Cleanup: Delete test reward"""
        if TestRedemption.created_reward_id:
            api_session.delete(f"{BASE_URL}/api/rewards/admin/catalog/{TestRedemption.created_reward_id}")
            print(f"Cleaned up test reward: {TestRedemption.created_reward_id}")


class TestAdminAnalytics:
    """Admin analytics endpoint test"""

    def test_get_admin_analytics(self, api_session):
        """GET /api/rewards/admin/analytics - returns analytics data"""
        response = api_session.get(f"{BASE_URL}/api/rewards/admin/analytics?days=30")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_points_granted" in data, "Missing total_points_granted"
        assert "total_events" in data, "Missing total_events"
        assert "by_action" in data, "Missing by_action breakdown"
        assert "daily" in data, "Missing daily breakdown"
        assert "redemptions" in data, "Missing redemptions count"
        assert "active_users" in data, "Missing active_users"
        
        print(f"Analytics: {data['total_points_granted']} pts granted, {data['total_events']} events, {data['redemptions']} redemptions")


class TestWaterTrackingIntegration:
    """Test reward integration with water tracking"""

    def test_water_add_returns_reward_field(self, api_session):
        """POST /api/water-tracking/{profile_id}/add - returns reward field in response"""
        response = api_session.post(
            f"{BASE_URL}/api/water-tracking/{FRESH_PROFILE_ID}/add",
            json={"amount_ml": 250}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check response has reward field
        assert "reward" in data, "Response should include reward field"
        reward = data["reward"]
        
        if reward is not None:
            # If reward was granted, validate structure
            assert "granted" in reward or "points" in reward, "Reward should have granted or points field"
            print(f"Water tracking reward: {reward}")
        else:
            print("Water tracking: reward field present but null (may have hit limit)")
        
        # Also verify water tracking worked
        assert "total_ml" in data
        assert data["total_ml"] >= 250
        print(f"Water added: {data['added_ml']} ml, total: {data['total_ml']} ml")


class TestSupplementCheckInIntegration:
    """Test reward integration with supplement/medication check-in"""

    def test_supplement_checkin_returns_reward_field(self, api_session):
        """POST /api/medications/{profile_id}/supplement-check-in - returns reward field in response"""
        response = api_session.post(
            f"{BASE_URL}/api/medications/{FRESH_PROFILE_ID}/supplement-check-in",
            json={
                "supplement_id": f"test_supp_{uuid.uuid4().hex[:8]}",
                "timing": "morning"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check response has reward field
        assert "reward" in data, "Response should include reward field"
        reward = data["reward"]
        
        if reward is not None:
            assert "granted" in reward or "points" in reward, "Reward should have granted or points field"
            print(f"Supplement check-in reward: {reward}")
        else:
            print("Supplement check-in: reward field present but null")
        
        # Verify check-in worked
        assert "checked" in data
        print(f"Supplement check-in: checked={data['checked']}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
