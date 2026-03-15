"""
Extended First Name Personalization Tests
Tests first_name field in daily-tasks and achievements API responses
Test profile: c65a12da-2bc5-473c-861f-0c34b89ad553 (first_name='Max')
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://performance-boost-86.preview.emergentagent.com')

# Test profile with first_name='Max'
TEST_PROFILE_ID = "c65a12da-2bc5-473c-861f-0c34b89ad553"
TEST_FIRST_NAME = "Max"


class TestDailyTasksPersonalization:
    """Tests for first_name personalization in daily-tasks endpoint"""

    def test_daily_tasks_returns_first_name_german(self):
        """GET /api/daily-tasks/{profile_id}?lang=de returns first_name field"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "first_name" in data, "Response should contain 'first_name' field"
        assert data["first_name"] == TEST_FIRST_NAME, f"Expected first_name='{TEST_FIRST_NAME}', got '{data['first_name']}'"
        
        print(f"✓ Daily tasks returns first_name: '{data['first_name']}'")

    def test_daily_tasks_symptom_check_personalized_title_german(self):
        """Symptom-Check task title includes first_name when available (German)"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find symptom_check task
        tracking_tasks = [t for t in data["tasks"] if t["id"] == "symptom_check"]
        
        if tracking_tasks:
            task = tracking_tasks[0]
            # Should be "Max, Symptom-Check faellig"
            assert TEST_FIRST_NAME in task["title"], f"Symptom-Check title should contain '{TEST_FIRST_NAME}', got: '{task['title']}'"
            assert "Symptom-Check faellig" in task["title"], f"Title should contain 'Symptom-Check faellig', got: '{task['title']}'"
            print(f"✓ Symptom-Check personalized title: '{task['title']}'")
        else:
            print("⚠ No symptom_check task found (may already be tracked today)")

    def test_daily_tasks_symptom_check_personalized_title_italian(self):
        """Symptom-Check task title includes first_name (Italian)"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_ID}?lang=it")
        
        assert response.status_code == 200
        data = response.json()
        
        tracking_tasks = [t for t in data["tasks"] if t["id"] == "symptom_check"]
        
        if tracking_tasks:
            task = tracking_tasks[0]
            # Should be "Max, Controllo sintomi dovuto"
            assert TEST_FIRST_NAME in task["title"], f"Italian title should contain '{TEST_FIRST_NAME}', got: '{task['title']}'"
            assert "Controllo sintomi dovuto" in task["title"], f"Title should contain 'Controllo sintomi dovuto', got: '{task['title']}'"
            print(f"✓ Italian symptom-check personalized title: '{task['title']}'")
        else:
            print("⚠ No symptom_check task found (may already be tracked today)")

    def test_daily_tasks_supplement_reason_personalized_german(self):
        """Supplement task reason includes first_name when available (German)"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        supplement_tasks = [t for t in data["tasks"] if t["type"] == "supplement"]
        
        if supplement_tasks:
            task = supplement_tasks[0]
            # Reason should be "Max, dein [supplement] wartet" or "Max, [supplement] + X weitere warten"
            assert TEST_FIRST_NAME in task["reason"], f"Supplement reason should contain '{TEST_FIRST_NAME}', got: '{task['reason']}'"
            print(f"✓ Supplement personalized reason: '{task['reason']}'")
        else:
            print("⚠ No supplement tasks found (may need supplement plan)")

    def test_daily_tasks_without_first_name(self):
        """Profile without first_name returns first_name: null"""
        # Use a profile ID that doesn't have first_name
        response = requests.get(f"{BASE_URL}/api/daily-tasks/nonexistent-profile?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # first_name should be null for non-existent profile
        assert data.get("first_name") is None, f"Expected first_name=None for nonexistent profile, got: {data.get('first_name')}"
        print("✓ Profile without first_name returns first_name: None")


class TestAchievementsPersonalization:
    """Tests for first_name personalization in achievements endpoint"""

    def test_achievements_returns_first_name(self):
        """GET /api/achievements/{profile_id}?lang=de returns first_name field"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "first_name" in data, "Response should contain 'first_name' field at top level"
        assert data["first_name"] == TEST_FIRST_NAME, f"Expected first_name='{TEST_FIRST_NAME}', got '{data['first_name']}'"
        
        print(f"✓ Achievements returns first_name: '{data['first_name']}'")

    def test_achievements_streak_label_personalized_german(self):
        """Streak label includes first_name when available (German)"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        streak = data["streak"]
        
        if streak["current"] > 0:
            # Label should be "Super, Max! Aktuelle Serie: X Tage"
            assert TEST_FIRST_NAME in streak["label"], f"Streak label should contain '{TEST_FIRST_NAME}', got: '{streak['label']}'"
            assert "Super" in streak["label"], f"Positive streak label should contain 'Super', got: '{streak['label']}'"
            print(f"✓ Streak label personalized: '{streak['label']}'")
        else:
            # Label should be "Max, starten Sie Ihre Serie!"
            assert TEST_FIRST_NAME in streak["label"], f"Zero streak label should contain '{TEST_FIRST_NAME}', got: '{streak['label']}'"
            assert "starten Sie Ihre Serie" in streak["label"], f"Zero streak label should contain 'starten Sie Ihre Serie', got: '{streak['label']}'"
            print(f"✓ Zero streak label personalized: '{streak['label']}'")

    def test_achievements_streak_label_personalized_italian(self):
        """Streak label includes first_name (Italian)"""
        response = requests.get(f"{BASE_URL}/api/achievements/{TEST_PROFILE_ID}?lang=it")
        
        assert response.status_code == 200
        data = response.json()
        
        streak = data["streak"]
        
        if streak["current"] > 0:
            # Label should be "Fantastico, Max! Serie attuale: X giorni"
            assert TEST_FIRST_NAME in streak["label"], f"Italian streak label should contain '{TEST_FIRST_NAME}', got: '{streak['label']}'"
            assert "Fantastico" in streak["label"], f"Italian positive streak label should contain 'Fantastico', got: '{streak['label']}'"
            print(f"✓ Italian streak label personalized: '{streak['label']}'")
        else:
            # Label should be "Max, inizia la tua serie!"
            assert TEST_FIRST_NAME in streak["label"], f"Italian zero streak label should contain '{TEST_FIRST_NAME}', got: '{streak['label']}'"
            assert "inizia la tua serie" in streak["label"], f"Italian zero streak should contain 'inizia la tua serie', got: '{streak['label']}'"
            print(f"✓ Italian zero streak label personalized: '{streak['label']}'")

    def test_achievements_without_first_name(self):
        """Profile without first_name returns first_name: null and generic label"""
        response = requests.get(f"{BASE_URL}/api/achievements/nonexistent-profile?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # first_name should be null for non-existent profile
        assert data.get("first_name") is None, f"Expected first_name=None, got: {data.get('first_name')}"
        
        # Label should not contain personalization placeholder
        streak = data["streak"]
        # Should just say "Starten Sie Ihre Serie!" without name prefix
        assert "Starten Sie Ihre Serie" in streak["label"] or "Aktuelle Serie" in streak["label"], \
            f"Generic label expected, got: '{streak['label']}'"
        
        print(f"✓ Achievements without first_name returns generic label: '{streak['label']}'")


class TestHealthProfileFirstName:
    """Regression: Verify health profile still returns first_name correctly"""

    def test_health_profile_returns_first_name(self):
        """GET /api/health-profile/{profile_id} returns first_name"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{TEST_PROFILE_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "profile" in data, "Response should contain 'profile' field"
        profile = data["profile"]
        
        assert "first_name" in profile, "Profile should contain 'first_name' field"
        assert profile["first_name"] == TEST_FIRST_NAME, f"Expected first_name='{TEST_FIRST_NAME}', got '{profile['first_name']}'"
        
        print(f"✓ Health profile returns first_name: '{profile['first_name']}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
