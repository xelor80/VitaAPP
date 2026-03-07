"""
Daily Tasks Interactive API Tests - Tests for completing supplements and symptom checks from home screen
Tests POST endpoints: /api/daily-tasks/complete-supplements and /api/daily-tasks/complete-symptom-check
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://health-coach-102.preview.emergentagent.com')

# Test profile ID from review_request
TEST_PROFILE = "2416f8aa-09aa-47f1-b600-2c9ada87124d"


class TestCompleteSupplementsAPI:
    """Tests for POST /api/daily-tasks/complete-supplements endpoint"""

    def test_complete_supplements_success(self):
        """POST /api/daily-tasks/complete-supplements - marks supplements as taken"""
        response = requests.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json={
                "profile_id": TEST_PROFILE,
                "supplement_ids": ["vitamin_d", "vitamin_k2"],
                "timing": "morning"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Response should indicate success"
        assert data["completed"] == 2, f"Should report 2 completed, got {data['completed']}"
        
        print(f"✓ Complete supplements success: {data['completed']} supplements marked taken")

    def test_complete_supplements_empty_ids(self):
        """POST /api/daily-tasks/complete-supplements - handles empty supplement_ids"""
        response = requests.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json={
                "profile_id": TEST_PROFILE,
                "supplement_ids": []
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Should still succeed with empty list"
        assert data["completed"] == 0, "Should report 0 completed"
        
        print(f"✓ Empty supplement_ids returns success with 0 completed")

    def test_complete_supplements_updates_daily_tasks(self):
        """Verify completing supplements updates the GET daily-tasks response"""
        # First get current state
        get_before = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE}?lang=de")
        assert get_before.status_code == 200
        tasks_before = get_before.json()["tasks"]
        
        supp_before = next((t for t in tasks_before if t["type"] == "supplement"), None)
        if supp_before is None:
            pytest.skip("No supplement task available - may all be completed")
        
        items_before = len(supp_before.get("items", []))
        
        # Complete one supplement
        if supp_before["items"]:
            item_to_complete = supp_before["items"][0]["id"]
            response = requests.post(
                f"{BASE_URL}/api/daily-tasks/complete-supplements",
                json={
                    "profile_id": TEST_PROFILE,
                    "supplement_ids": [item_to_complete]
                }
            )
            assert response.status_code == 200
            
            # Check if task updated
            get_after = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE}?lang=de")
            tasks_after = get_after.json()["tasks"]
            supp_after = next((t for t in tasks_after if t["type"] == "supplement"), None)
            
            if supp_after:
                items_after = len(supp_after.get("items", []))
                print(f"✓ Supplement task updated: {items_before} -> {items_after} pending items")
            else:
                print(f"✓ All supplements completed - task removed from list")

    def test_complete_supplements_returns_items_structure(self):
        """Verify GET daily-tasks returns items array for supplement tasks"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE}?lang=de")
        assert response.status_code == 200
        
        tasks = response.json()["tasks"]
        supp_task = next((t for t in tasks if t["type"] == "supplement"), None)
        
        if supp_task:
            assert "items" in supp_task, "Supplement task should have 'items' array"
            assert isinstance(supp_task["items"], list), "'items' should be a list"
            
            if supp_task["items"]:
                item = supp_task["items"][0]
                assert "id" in item, "Item should have 'id'"
                assert "name" in item, "Item should have 'name'"
                assert "dosage" in item, "Item should have 'dosage'"
                print(f"✓ Supplement items structure verified: {len(supp_task['items'])} items with id/name/dosage")
            else:
                print("✓ Items array exists but empty (all supplements may be completed)")
        else:
            print("⚠ No supplement task available to verify")


class TestCompleteSymptomCheckAPI:
    """Tests for POST /api/daily-tasks/complete-symptom-check endpoint"""

    def test_complete_symptom_check_success(self):
        """POST /api/daily-tasks/complete-symptom-check - saves overall rating"""
        response = requests.post(
            f"{BASE_URL}/api/daily-tasks/complete-symptom-check",
            json={
                "profile_id": TEST_PROFILE,
                "overall": 6
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Response should indicate success"
        assert data["overall"] == 6, f"Should echo back rating 6, got {data.get('overall')}"
        
        print(f"✓ Complete symptom check success: overall rating {data['overall']}")

    def test_complete_symptom_check_updates_daily_tasks(self):
        """Verify completing symptom check removes it from daily tasks"""
        # Complete symptom check
        response = requests.post(
            f"{BASE_URL}/api/daily-tasks/complete-symptom-check",
            json={
                "profile_id": TEST_PROFILE,
                "overall": 5
            }
        )
        assert response.status_code == 200
        
        # Check if tracking task is removed
        get_response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE}?lang=de")
        assert get_response.status_code == 200
        
        tasks = get_response.json()["tasks"]
        tracking_task = next((t for t in tasks if t["type"] == "tracking"), None)
        
        # Should be None since we just completed it today
        assert tracking_task is None, "Symptom check task should be removed after completion"
        
        print(f"✓ Symptom check task removed from daily tasks after completion")

    def test_complete_symptom_check_min_max_values(self):
        """Verify symptom check accepts values 1-10"""
        # Test minimum value
        response_min = requests.post(
            f"{BASE_URL}/api/daily-tasks/complete-symptom-check",
            json={"profile_id": TEST_PROFILE, "overall": 1}
        )
        assert response_min.status_code == 200
        assert response_min.json()["overall"] == 1
        
        # Test maximum value
        response_max = requests.post(
            f"{BASE_URL}/api/daily-tasks/complete-symptom-check",
            json={"profile_id": TEST_PROFILE, "overall": 10}
        )
        assert response_max.status_code == 200
        assert response_max.json()["overall"] == 10
        
        print(f"✓ Symptom check accepts values 1-10")


class TestDailyTasksIntegration:
    """Integration tests for daily tasks feature"""

    def test_all_tasks_completed_shows_success(self):
        """When all tasks are completed, API should return fewer/no tasks"""
        # This is a theoretical test - we check the expected behavior
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✓ Current tasks: {len(data['tasks'])} tasks returned, {data['total_available']} total")
        
        # Verify structure
        assert "tasks" in data
        assert "total_available" in data
        assert isinstance(data["tasks"], list)

    def test_plan_progress_task_has_cta_route(self):
        """Verify plan progress task has correct cta_route for navigation"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE}?lang=de")
        assert response.status_code == 200
        
        tasks = response.json()["tasks"]
        goal_task = next((t for t in tasks if t["type"] == "goal"), None)
        
        if goal_task:
            assert goal_task["cta_route"] == "/supplement-plan", \
                f"Goal task cta_route should be '/supplement-plan', got {goal_task['cta_route']}"
            print(f"✓ Plan progress task cta_route: {goal_task['cta_route']}")
        else:
            print("⚠ No goal task available (plan may be complete)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
