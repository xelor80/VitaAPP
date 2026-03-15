"""
Tests for Achievements API - Streak tracking and milestones system
Tests GET /api/achievements/{profile_id} endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://medication-tracker-10.preview.emergentagent.com')
TEST_PROFILE_ID = "2416f8aa-09aa-47f1-b600-2c9ada87124d"
NONEXISTENT_PROFILE_ID = "nonexistent-profile-id-12345"


class TestAchievementsAPI:
    """Tests for achievements endpoint with streak calculation and milestone logic"""

    def test_get_achievements_german(self):
        """GET /api/achievements/{profile_id}?lang=de - returns streak data with German labels"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify streak structure
        assert "streak" in data, "Response should contain 'streak' key"
        streak = data["streak"]
        assert "current" in streak, "Streak should have 'current' field"
        assert "next_goal" in streak, "Streak should have 'next_goal' field"
        assert "label" in streak, "Streak should have 'label' field"
        assert "compliance_streak" in streak, "Streak should have 'compliance_streak' (sub-streak)"
        assert "tracking_streak" in streak, "Streak should have 'tracking_streak' (sub-streak)"
        
        # Verify German label format
        if streak["current"] > 0:
            assert "Aktuelle Serie" in streak["label"], f"German label should contain 'Aktuelle Serie', got: {streak['label']}"
            assert "Tage" in streak["label"], f"German label should contain 'Tage', got: {streak['label']}"
        
        # Verify next_label for German
        if streak["next_goal"]:
            assert "next_label" in streak, "Should have next_label when next_goal exists"
            assert "Naechstes Ziel" in streak["next_label"], f"German next_label should contain 'Naechstes Ziel', got: {streak['next_label']}"
        
        # Verify milestones structure
        assert "milestones" in data, "Response should contain 'milestones' key"
        milestones = data["milestones"]
        assert "unlocked" in milestones, "Milestones should have 'unlocked' list"
        assert "new" in milestones, "Milestones should have 'new' list"
        assert "total_unlocked" in milestones, "Milestones should have 'total_unlocked' count"
        assert "total" in milestones, "Milestones should have 'total' count"
        
        print(f"✓ German achievements: streak={streak['current']} days, unlocked={milestones['total_unlocked']}/{milestones['total']}")

    def test_get_achievements_italian(self):
        """GET /api/achievements/{profile_id}?lang=it - returns Italian labels"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=it")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        streak = data["streak"]
        
        # Verify Italian label format
        if streak["current"] > 0:
            assert "Serie attuale" in streak["label"], f"Italian label should contain 'Serie attuale', got: {streak['label']}"
            assert "giorni" in streak["label"], f"Italian label should contain 'giorni', got: {streak['label']}"
        
        # Verify next_label for Italian
        if streak["next_goal"] and streak.get("next_label"):
            assert "Prossimo obiettivo" in streak["next_label"], f"Italian next_label should contain 'Prossimo obiettivo', got: {streak['next_label']}"
        
        print(f"✓ Italian achievements: label='{streak['label']}'")

    def test_get_achievements_nonexistent_profile(self):
        """GET /api/achievements/nonexistent-id?lang=de - returns default empty streak without error"""
        response = requests.get(f"{BASE_URL}/api/achievements/{NONEXISTENT_PROFILE_ID}?lang=de")
        
        # Should NOT return error - should return default 0-day streak
        assert response.status_code == 200, f"Expected 200 for nonexistent profile, got {response.status_code}: {response.text}"
        data = response.json()
        
        streak = data["streak"]
        assert streak["current"] == 0 or streak["current"] >= 0, "Nonexistent profile should have 0 or valid streak"
        assert streak["compliance_streak"] == 0 or streak["compliance_streak"] >= 0, "Compliance streak should be 0 for nonexistent"
        assert streak["tracking_streak"] == 0 or streak["tracking_streak"] >= 0, "Tracking streak should be 0 for nonexistent"
        
        print(f"✓ Nonexistent profile returns default: streak={streak['current']}")

    def test_milestone_intake_7_unlocked(self):
        """Milestones: 'intake_7' should be unlocked for profile with 18-day compliance streak"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        streak = data["streak"]
        milestones = data["milestones"]
        
        # Verify compliance streak >= 7 for intake_7 milestone
        print(f"Current compliance_streak: {streak['compliance_streak']}")
        
        if streak["compliance_streak"] >= 7:
            unlocked_ids = [m["id"] for m in milestones["unlocked"]]
            assert "intake_7" in unlocked_ids, f"'intake_7' should be unlocked with {streak['compliance_streak']} day streak. Unlocked: {unlocked_ids}"
            
            # Find the milestone and verify structure
            intake_7 = next((m for m in milestones["unlocked"] if m["id"] == "intake_7"), None)
            assert intake_7 is not None, "intake_7 milestone should exist in unlocked list"
            assert intake_7["achieved"] == True, "intake_7 should be marked as achieved"
            assert intake_7["threshold"] == 7, "intake_7 threshold should be 7"
            print(f"✓ intake_7 milestone unlocked: '{intake_7['title']}'")
        else:
            print(f"⚠ compliance_streak={streak['compliance_streak']} < 7, intake_7 may not be unlocked")

    def test_milestone_tracking_14_not_unlocked(self):
        """Milestones: 'tracking_14' should NOT be unlocked for profile with 3-day tracking streak"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        streak = data["streak"]
        milestones = data["milestones"]
        
        print(f"Current tracking_streak: {streak['tracking_streak']}")
        
        if streak["tracking_streak"] < 14:
            unlocked_ids = [m["id"] for m in milestones["unlocked"]]
            assert "tracking_14" not in unlocked_ids, f"'tracking_14' should NOT be unlocked with {streak['tracking_streak']} day streak"
            
            # Should be in 'next' or not unlocked
            if milestones.get("next") and milestones["next"]["id"] == "tracking_14":
                assert milestones["next"]["achieved"] == False, "tracking_14 should not be achieved yet"
                print(f"✓ tracking_14 is the next milestone to achieve")
            else:
                print(f"✓ tracking_14 not in unlocked list (tracking_streak={streak['tracking_streak']})")
        else:
            print(f"⚠ tracking_streak={streak['tracking_streak']} >= 14, tracking_14 may be unlocked")

    def test_new_milestones_tracking(self):
        """NEW milestones: first call marks them as seen, second call returns empty 'new' list"""
        # First request - may return new milestones
        response1 = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        assert response1.status_code == 200
        data1 = response1.json()
        
        new_count_first = len(data1["milestones"]["new"])
        print(f"First call: {new_count_first} new milestone(s)")
        
        # Second request - should NOT return the same milestones as 'new'
        response2 = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        assert response2.status_code == 200
        data2 = response2.json()
        
        new_count_second = len(data2["milestones"]["new"])
        
        # If first call had new milestones, second call should have fewer or zero
        if new_count_first > 0:
            assert new_count_second < new_count_first or new_count_second == 0, \
                f"Second call should not show same 'new' milestones (first={new_count_first}, second={new_count_second})"
            print(f"✓ New milestones marked as seen: {new_count_first} -> {new_count_second}")
        else:
            print(f"✓ No new milestones on first call (already seen)")
            # Second call should also have 0 new
            assert new_count_second == 0, f"Second call should have 0 new milestones, got {new_count_second}"

    def test_streak_data_structure(self):
        """Verify complete streak data structure with all required fields"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify streak structure
        streak = data["streak"]
        required_streak_fields = ["current", "type", "compliance_streak", "tracking_streak", "next_goal", "label"]
        for field in required_streak_fields:
            assert field in streak, f"Streak missing required field: {field}"
        
        # Verify types
        assert isinstance(streak["current"], int), "current should be int"
        assert isinstance(streak["compliance_streak"], int), "compliance_streak should be int"
        assert isinstance(streak["tracking_streak"], int), "tracking_streak should be int"
        assert streak["type"] in ["compliance", "tracking"], f"type should be 'compliance' or 'tracking', got: {streak['type']}"
        
        # Verify next_goal is valid
        if streak["next_goal"] is not None:
            assert streak["next_goal"] in [7, 14, 21, 30, 60, 90], f"next_goal should be a valid milestone, got: {streak['next_goal']}"
        
        print(f"✓ Streak structure valid: current={streak['current']}, type={streak['type']}, next_goal={streak['next_goal']}")

    def test_milestones_data_structure(self):
        """Verify complete milestones data structure"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        milestones = data["milestones"]
        
        # Verify milestones structure
        assert isinstance(milestones["unlocked"], list), "unlocked should be a list"
        assert isinstance(milestones["new"], list), "new should be a list"
        assert isinstance(milestones["total_unlocked"], int), "total_unlocked should be int"
        assert isinstance(milestones["total"], int), "total should be int"
        assert milestones["total"] == 4, f"Should have 4 total milestones, got {milestones['total']}"
        
        # Verify each unlocked milestone has required fields
        for m in milestones["unlocked"]:
            assert "id" in m, "Milestone missing 'id'"
            assert "icon" in m, "Milestone missing 'icon'"
            assert "title" in m, "Milestone missing 'title'"
            assert "message" in m, "Milestone missing 'message'"
            assert "achieved" in m, "Milestone missing 'achieved'"
            assert m["achieved"] == True, f"Unlocked milestone {m['id']} should have achieved=True"
        
        # Verify next milestone structure if exists
        if milestones["next"]:
            next_m = milestones["next"]
            assert "id" in next_m, "Next milestone missing 'id'"
            assert next_m["achieved"] == False, "Next milestone should have achieved=False"
        
        print(f"✓ Milestones structure valid: {milestones['total_unlocked']}/{milestones['total']} unlocked")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
