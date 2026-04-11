"""
Test Daily Plan Feature - Iteration 79
Tests the new 'Mein Tag' (Daily Plan) feature including:
- GET /api/daily-plan/{profile_id} - Main daily plan endpoint
- GET /api/daily-plan/{profile_id}/weekly - Weekly summary endpoint
- Level system calculation
- VERO coaching messages
- Task aggregation from supplements, medications, water, stress, diary
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestDailyPlanEndpoint:
    """Tests for GET /api/daily-plan/{profile_id}"""
    
    def test_daily_plan_returns_200(self):
        """Daily plan endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Daily plan endpoint returns 200")
    
    def test_daily_plan_has_required_fields(self):
        """Daily plan response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        required_fields = ['date', 'sections', 'total_tasks', 'completed_tasks', 'completion_pct', 'level', 'vero']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✓ Daily plan has all required fields: {required_fields}")
    
    def test_daily_plan_sections_structure(self):
        """Daily plan sections have correct structure"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data['sections'], list), "Sections should be a list"
        assert len(data['sections']) > 0, "Should have at least one section"
        
        for section in data['sections']:
            assert 'timing' in section, "Section missing timing"
            assert 'label' in section, "Section missing label"
            assert 'tasks' in section, "Section missing tasks"
            assert isinstance(section['tasks'], list), "Tasks should be a list"
        print(f"✓ Daily plan has {len(data['sections'])} sections with correct structure")
    
    def test_daily_plan_task_structure(self):
        """Each task has required fields"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        task_fields = ['id', 'type', 'timing', 'name', 'detail', 'done', 'priority', 'icon']
        
        for section in data['sections']:
            for task in section['tasks']:
                for field in task_fields:
                    assert field in task, f"Task missing field: {field}"
        print("✓ All tasks have required fields")
    
    def test_daily_plan_includes_supplements(self):
        """Daily plan includes supplement tasks"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        supplement_tasks = []
        for section in data['sections']:
            for task in section['tasks']:
                if task['type'] == 'supplement':
                    supplement_tasks.append(task)
        
        assert len(supplement_tasks) > 0, "Should have supplement tasks"
        print(f"✓ Daily plan includes {len(supplement_tasks)} supplement tasks")
    
    def test_daily_plan_includes_medications(self):
        """Daily plan includes medication tasks"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        medication_tasks = []
        for section in data['sections']:
            for task in section['tasks']:
                if task['type'] == 'medication':
                    medication_tasks.append(task)
        
        # May or may not have medications depending on profile
        print(f"✓ Daily plan includes {len(medication_tasks)} medication tasks")
    
    def test_daily_plan_includes_water_task(self):
        """Daily plan includes water tracking task"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        water_task = None
        for section in data['sections']:
            for task in section['tasks']:
                if task['type'] == 'water':
                    water_task = task
                    break
        
        assert water_task is not None, "Should have water task"
        assert 'progress' in water_task, "Water task should have progress"
        assert 'water_ml' in water_task, "Water task should have water_ml"
        assert 'water_goal' in water_task, "Water task should have water_goal"
        print(f"✓ Water task found: {water_task['detail']}")
    
    def test_daily_plan_includes_stress_task(self):
        """Daily plan includes stress exercise task"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        stress_task = None
        for section in data['sections']:
            for task in section['tasks']:
                if task['type'] == 'stress':
                    stress_task = task
                    break
        
        assert stress_task is not None, "Should have stress task"
        assert stress_task['name'] == "Entspannungsuebung", "Stress task should have German name"
        print(f"✓ Stress task found: {stress_task['name']}")
    
    def test_daily_plan_includes_diary_task(self):
        """Daily plan includes diary/check-in task"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        diary_task = None
        for section in data['sections']:
            for task in section['tasks']:
                if task['type'] == 'diary':
                    diary_task = task
                    break
        
        assert diary_task is not None, "Should have diary task"
        assert diary_task['name'] == "Tages-Check-in", "Diary task should have German name"
        print(f"✓ Diary task found: {diary_task['name']}")
    
    def test_daily_plan_level_info(self):
        """Daily plan includes level information"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        level = data['level']
        assert 'level' in level, "Level info missing level number"
        assert 'title' in level, "Level info missing title"
        assert 'icon' in level, "Level info missing icon"
        assert 'total_points' in level, "Level info missing total_points"
        assert 'next_level_at' in level, "Level info missing next_level_at"
        assert 'progress_pct' in level, "Level info missing progress_pct"
        
        assert isinstance(level['level'], int), "Level should be integer"
        assert level['level'] >= 1, "Level should be at least 1"
        print(f"✓ Level info: Lv.{level['level']} {level['title']} ({level['total_points']} pts)")
    
    def test_daily_plan_vero_message(self):
        """Daily plan includes VERO coaching message"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        vero = data['vero']
        assert 'text' in vero, "VERO message missing text"
        assert 'mood' in vero, "VERO message missing mood"
        assert len(vero['text']) > 0, "VERO text should not be empty"
        print(f"✓ VERO message: '{vero['text']}' (mood: {vero['mood']})")
    
    def test_daily_plan_completion_stats(self):
        """Daily plan has correct completion statistics"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data['total_tasks'], int), "total_tasks should be int"
        assert isinstance(data['completed_tasks'], int), "completed_tasks should be int"
        assert isinstance(data['completion_pct'], int), "completion_pct should be int"
        
        assert data['total_tasks'] >= data['completed_tasks'], "completed cannot exceed total"
        assert 0 <= data['completion_pct'] <= 100, "completion_pct should be 0-100"
        print(f"✓ Completion: {data['completed_tasks']}/{data['total_tasks']} ({data['completion_pct']}%)")
    
    def test_daily_plan_italian_language(self):
        """Daily plan supports Italian language"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=it")
        data = response.json()
        
        # Check Italian labels
        water_task = None
        for section in data['sections']:
            for task in section['tasks']:
                if task['type'] == 'water':
                    water_task = task
                    break
        
        assert water_task is not None, "Should have water task"
        assert water_task['name'] == "Bere acqua", "Water task should have Italian name"
        print(f"✓ Italian language support working: {water_task['name']}")


class TestWeeklySummaryEndpoint:
    """Tests for GET /api/daily-plan/{profile_id}/weekly"""
    
    def test_weekly_summary_returns_200(self):
        """Weekly summary endpoint returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Weekly summary endpoint returns 200")
    
    def test_weekly_summary_has_required_fields(self):
        """Weekly summary has all required fields"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        data = response.json()
        
        required_fields = ['days', 'active_days', 'total_days', 'week_score', 'week_max', 'week_pct', 'summary']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"✓ Weekly summary has all required fields")
    
    def test_weekly_summary_has_7_days(self):
        """Weekly summary returns exactly 7 days"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        data = response.json()
        
        assert len(data['days']) == 7, f"Expected 7 days, got {len(data['days'])}"
        assert data['total_days'] == 7, "total_days should be 7"
        print("✓ Weekly summary has 7 days")
    
    def test_weekly_summary_day_structure(self):
        """Each day in weekly summary has correct structure"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        data = response.json()
        
        day_fields = ['date', 'day_label', 'score', 'max_score', 'is_today', 'active']
        
        for day in data['days']:
            for field in day_fields:
                assert field in day, f"Day missing field: {field}"
        print("✓ All days have correct structure")
    
    def test_weekly_summary_has_today(self):
        """Weekly summary includes today marked correctly"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        data = response.json()
        
        today_count = sum(1 for day in data['days'] if day['is_today'])
        assert today_count == 1, f"Expected exactly 1 day marked as today, got {today_count}"
        print("✓ Today is correctly marked in weekly summary")
    
    def test_weekly_summary_german_labels(self):
        """Weekly summary has German day labels"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        data = response.json()
        
        german_labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
        for day in data['days']:
            assert day['day_label'] in german_labels, f"Invalid German day label: {day['day_label']}"
        print("✓ German day labels are correct")
    
    def test_weekly_summary_italian_labels(self):
        """Weekly summary has Italian day labels when lang=it"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=it")
        data = response.json()
        
        italian_labels = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']
        for day in data['days']:
            assert day['day_label'] in italian_labels, f"Invalid Italian day label: {day['day_label']}"
        print("✓ Italian day labels are correct")
    
    def test_weekly_summary_score_calculation(self):
        """Weekly summary scores are calculated correctly"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}/weekly?lang=de")
        data = response.json()
        
        total_score = sum(day['score'] for day in data['days'])
        total_max = sum(day['max_score'] for day in data['days'])
        
        assert data['week_score'] == total_score, "week_score should match sum of day scores"
        assert data['week_max'] == total_max, "week_max should match sum of max_scores"
        
        expected_pct = round(total_score / total_max * 100) if total_max > 0 else 0
        assert data['week_pct'] == expected_pct, f"week_pct should be {expected_pct}"
        print(f"✓ Weekly score: {data['week_score']}/{data['week_max']} ({data['week_pct']}%)")


class TestLevelSystem:
    """Tests for level system calculation"""
    
    def test_level_starts_at_1(self):
        """Level should be at least 1 for any user"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert data['level']['level'] >= 1, "Level should be at least 1"
        print(f"✓ Level is at least 1: {data['level']['level']}")
    
    def test_level_progress_percentage(self):
        """Level progress percentage is between 0-100"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        pct = data['level']['progress_pct']
        assert 0 <= pct <= 100, f"Progress percentage should be 0-100, got {pct}"
        print(f"✓ Level progress: {pct}%")


class TestTaskTimingGroups:
    """Tests for task timing/section grouping"""
    
    def test_timing_labels_german(self):
        """Timing labels are in German when lang=de"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        expected_labels = ['Morgens', 'Mittags', 'Abends', 'Heute', 'Flexibel']
        for section in data['sections']:
            assert section['label'] in expected_labels, f"Unexpected label: {section['label']}"
        print("✓ German timing labels are correct")
    
    def test_timing_labels_italian(self):
        """Timing labels are in Italian when lang=it"""
        response = requests.get(f"{BASE_URL}/api/daily-plan/{TEST_PROFILE_ID}?lang=it")
        data = response.json()
        
        expected_labels = ['Mattina', 'Mezzogiorno', 'Sera', 'Oggi', 'Flessibile']
        for section in data['sections']:
            assert section['label'] in expected_labels, f"Unexpected label: {section['label']}"
        print("✓ Italian timing labels are correct")


class TestNewProfileHandling:
    """Tests for handling new/empty profiles"""
    
    def test_new_profile_returns_200(self):
        """New profile without data still returns 200"""
        new_profile_id = "test-new-profile-no-data-12345"
        response = requests.get(f"{BASE_URL}/api/daily-plan/{new_profile_id}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ New profile returns 200")
    
    def test_new_profile_has_base_tasks(self):
        """New profile still has water, stress, diary tasks"""
        new_profile_id = "test-new-profile-no-data-12345"
        response = requests.get(f"{BASE_URL}/api/daily-plan/{new_profile_id}?lang=de")
        data = response.json()
        
        task_types = set()
        for section in data['sections']:
            for task in section['tasks']:
                task_types.add(task['type'])
        
        assert 'water' in task_types, "Should have water task"
        assert 'stress' in task_types, "Should have stress task"
        assert 'diary' in task_types, "Should have diary task"
        print(f"✓ New profile has base tasks: {task_types}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
