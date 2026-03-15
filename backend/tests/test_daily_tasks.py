"""
Daily Tasks API Tests - Tests for the 'Heute fuer dich wichtig' feature
Tests the GET /api/daily-tasks/{profile_id} endpoint with priority ordering and multi-language support
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://medication-tracker-10.preview.emergentagent.com')

# Test profile IDs from review_request
TEST_PROFILE_WITH_PLAN = "2416f8aa-09aa-47f1-b600-2c9ada87124d"
TEST_PROFILE_WITH_TRACKING = "c659365e-dcce-4f11-8eae-6813e468ec54"


class TestDailyTasksAPI:
    """Tests for daily tasks endpoint - returns prioritized tasks for home screen"""

    def test_get_daily_tasks_german_with_plan(self):
        """GET /api/daily-tasks/{profile_id}?lang=de - returns tasks in German for profile with supplement plan"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tasks" in data, "Response should contain 'tasks' field"
        assert "total_available" in data, "Response should contain 'total_available' field"
        
        tasks = data["tasks"]
        assert len(tasks) <= 3, "Should return max 3 tasks"
        assert len(tasks) > 0, "Profile with plan should have tasks"
        
        # Validate task structure
        for task in tasks:
            assert "id" in task, "Task should have 'id'"
            assert "type" in task, "Task should have 'type'"
            assert "priority" in task, "Task should have 'priority'"
            assert "icon" in task, "Task should have 'icon'"
            assert "title" in task, "Task should have 'title'"
            assert "reason" in task, "Task should have 'reason'"
            assert "cta_label" in task, "Task should have 'cta_label'"
            assert "cta_route" in task, "Task should have 'cta_route'"
        
        print(f"✓ German tasks returned: {len(tasks)} tasks, total available: {data['total_available']}")

    def test_get_daily_tasks_italian_with_plan(self):
        """GET /api/daily-tasks/{profile_id}?lang=it - returns tasks in Italian"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=it")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        tasks = data["tasks"]
        
        # Verify Italian labels
        found_italian = False
        for task in tasks:
            if task["type"] == "supplement":
                # Italian labels should contain Italian words
                assert "Mattina" in task["title"] or "Mezzogiorno" in task["title"] or "Sera" in task["title"] or "supplement" in task["title"], \
                    f"Italian task title should have Italian timing: {task['title']}"
                found_italian = True
            if task["type"] == "tracking":
                assert "sintomi" in task["title"].lower() or "controllo" in task["title"].lower(), \
                    f"Italian tracking task should have Italian text: {task['title']}"
                found_italian = True
            if task["type"] == "goal":
                assert "Settimana" in task["title"] or "piano" in task["reason"].lower(), \
                    f"Italian goal task should have Italian text: {task['title']}"
                found_italian = True
        
        assert found_italian or len(tasks) == 0, "Should have Italian text in tasks"
        print(f"✓ Italian tasks returned: {len(tasks)} tasks")

    def test_get_daily_tasks_nonexistent_profile(self):
        """GET /api/daily-tasks/nonexistent-id - returns empty tasks array, not 404"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/nonexistent-id?lang=de")
        
        # Should return 200 with empty tasks, not 404
        assert response.status_code == 200, f"Expected 200 for nonexistent profile, got {response.status_code}"
        
        data = response.json()
        assert "tasks" in data, "Response should contain 'tasks' field"
        # Nonexistent profile may still return symptom_check task since it requires no data
        # but won't have supplement tasks
        tasks = data["tasks"]
        supplement_tasks = [t for t in tasks if t["type"] == "supplement"]
        assert len(supplement_tasks) == 0, "Nonexistent profile should have no supplement tasks"
        
        print(f"✓ Nonexistent profile returns {len(tasks)} tasks (no supplements)")

    def test_task_priority_ordering(self):
        """Verify tasks are sorted by priority: supplement > risk > tracking > goal"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200
        
        data = response.json()
        tasks = data["tasks"]
        
        if len(tasks) > 1:
            priorities = [t["priority"] for t in tasks]
            assert priorities == sorted(priorities), f"Tasks should be sorted by priority (ascending), got: {priorities}"
        
        # Check that priority values follow expected pattern
        type_to_priority = {}
        for task in tasks:
            type_to_priority[task["type"]] = task["priority"]
        
        # supplement should have lower priority number (higher priority) than tracking
        if "supplement" in type_to_priority and "tracking" in type_to_priority:
            assert type_to_priority["supplement"] < type_to_priority["tracking"], \
                "Supplement should have higher priority (lower number) than tracking"
        
        # tracking should have lower priority number than goal
        if "tracking" in type_to_priority and "goal" in type_to_priority:
            assert type_to_priority["tracking"] < type_to_priority["goal"], \
                "Tracking should have higher priority (lower number) than goal"
        
        print(f"✓ Task priority ordering verified: {[t['type'] + ':' + str(t['priority']) for t in tasks]}")

    def test_supplement_task_structure(self):
        """Verify supplement task contains all required fields for UI"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        supplement_tasks = [t for t in data["tasks"] if t["type"] == "supplement"]
        
        if supplement_tasks:
            task = supplement_tasks[0]
            
            # Check required fields for UI rendering
            assert task["icon"] == "pill", f"Supplement icon should be 'pill', got {task['icon']}"
            assert task["progress"] is not None, "Supplement task should have progress"
            assert task["progress_label"] is not None, "Supplement task should have progress_label"
            assert "/" in task["progress_label"], f"Progress label should be X/Y format: {task['progress_label']}"
            assert task["cta_route"] == "/tracking", f"Supplement CTA should route to /tracking: {task['cta_route']}"
            assert task["status"] in ["urgent", "pending"], f"Supplement status should be urgent/pending: {task['status']}"
            
            # Check timing in title
            assert any(timing in task["title"] for timing in ["Morgens", "Mittags", "Abends"]), \
                f"Supplement title should contain German timing: {task['title']}"
            
            print(f"✓ Supplement task structure verified: {task['title']}")
        else:
            print("⚠ No supplement tasks to verify (may depend on time of day)")

    def test_tracking_task_structure(self):
        """Verify tracking/symptom-check task contains required fields"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        tracking_tasks = [t for t in data["tasks"] if t["type"] == "tracking"]
        
        if tracking_tasks:
            task = tracking_tasks[0]
            
            assert task["id"] == "symptom_check", f"Tracking task id should be 'symptom_check': {task['id']}"
            assert task["icon"] == "clipboard-pulse", f"Tracking icon should be 'clipboard-pulse': {task['icon']}"
            assert task["cta_route"] == "/tracking", f"Tracking CTA should route to /tracking: {task['cta_route']}"
            assert "Symptom" in task["title"] or "Check" in task["title"], \
                f"Tracking title should mention symptom/check: {task['title']}"
            
            print(f"✓ Tracking task structure verified: {task['title']}")
        else:
            print("⚠ No tracking tasks to verify (symptom tracking may be recent)")

    def test_goal_task_structure(self):
        """Verify goal/plan progress task contains required fields"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        goal_tasks = [t for t in data["tasks"] if t["type"] == "goal"]
        
        if goal_tasks:
            task = goal_tasks[0]
            
            assert task["id"] == "plan_progress", f"Goal task id should be 'plan_progress': {task['id']}"
            assert task["icon"] == "flag-checkered", f"Goal icon should be 'flag-checkered': {task['icon']}"
            assert task["progress"] is not None, "Goal task should have progress percentage"
            assert 0 <= task["progress"] <= 100, f"Progress should be 0-100: {task['progress']}"
            assert task["cta_route"] == "/supplement-plan", f"Goal CTA should route to /supplement-plan: {task['cta_route']}"
            assert "Woche" in task["title"], f"German goal title should mention 'Woche': {task['title']}"
            
            print(f"✓ Goal task structure verified: {task['title']} ({task['progress']}%)")
        else:
            print("⚠ No goal tasks to verify (plan may be complete or missing)")

    def test_max_three_tasks_limit(self):
        """Verify endpoint returns maximum 3 tasks even if more available"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        tasks = data["tasks"]
        total_available = data["total_available"]
        
        assert len(tasks) <= 3, f"Should return max 3 tasks, got {len(tasks)}"
        assert total_available >= len(tasks), f"total_available should be >= returned tasks"
        
        print(f"✓ Max 3 tasks limit verified: {len(tasks)}/{total_available} tasks returned")

    def test_cta_routes_valid(self):
        """Verify all CTA routes are valid app routes"""
        response = requests.get(f"{BASE_URL}/api/daily-tasks/{TEST_PROFILE_WITH_PLAN}?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        valid_routes = ["/tracking", "/supplement-plan", "/product-comparison"]
        
        for task in data["tasks"]:
            route = task["cta_route"]
            # Route may have query params
            base_route = route.split("?")[0]
            assert base_route in valid_routes, f"CTA route {base_route} not in valid routes: {valid_routes}"
        
        print(f"✓ All CTA routes are valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
