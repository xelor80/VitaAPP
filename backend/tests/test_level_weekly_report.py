"""
Test Level System and Weekly Report APIs - Iteration 80
Tests for:
- GET /api/level/{profile_id}?lang=de - Level info with level-up detection
- GET /api/level/config - All 12 level configurations
- POST /api/level/{profile_id}/acknowledge-levelup - Acknowledge level-up
- GET /api/weekly-report/{profile_id}?lang=de - Comprehensive weekly report
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestLevelSystemAPI:
    """Tests for Level System endpoints"""

    def test_get_user_level_returns_200(self):
        """GET /api/level/{profile_id}?lang=de returns 200"""
        response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/level/{profile_id}?lang=de returns 200")

    def test_get_user_level_has_required_fields(self):
        """Level response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        required_fields = ['level', 'title', 'icon', 'total_points', 'progress_pct', 'points_to_next', 'leveled_up']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        print(f"PASS: Level response has all required fields: {required_fields}")

    def test_get_user_level_data_types(self):
        """Level response has correct data types"""
        response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert isinstance(data['level'], int), "level should be int"
        assert isinstance(data['title'], str), "title should be str"
        assert isinstance(data['icon'], str), "icon should be str"
        assert isinstance(data['total_points'], int), "total_points should be int"
        assert isinstance(data['progress_pct'], (int, float)), "progress_pct should be numeric"
        assert isinstance(data['points_to_next'], int), "points_to_next should be int"
        assert isinstance(data['leveled_up'], bool), "leveled_up should be bool"
        print("PASS: Level response has correct data types")

    def test_get_user_level_valid_ranges(self):
        """Level values are within valid ranges"""
        response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 1 <= data['level'] <= 12, f"Level {data['level']} should be between 1 and 12"
        assert 0 <= data['progress_pct'] <= 100, f"Progress {data['progress_pct']} should be 0-100"
        assert data['total_points'] >= 0, "total_points should be non-negative"
        assert data['points_to_next'] >= 0, "points_to_next should be non-negative"
        print(f"PASS: Level {data['level']}, progress {data['progress_pct']}%, points_to_next {data['points_to_next']}")

    def test_get_user_level_italian_language(self):
        """GET /api/level/{profile_id}?lang=it returns Italian title"""
        response = requests.get(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}?lang=it")
        assert response.status_code == 200
        data = response.json()
        # Level 1 Italian title should be "Inizio"
        if data['level'] == 1:
            assert data['title'] == "Inizio", f"Expected 'Inizio', got '{data['title']}'"
        print(f"PASS: Italian language support - title: {data['title']}")

    def test_get_level_config_returns_200(self):
        """GET /api/level/config returns 200"""
        response = requests.get(f"{BASE_URL}/api/level/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/level/config returns 200")

    def test_get_level_config_has_12_levels(self):
        """Level config contains exactly 12 levels"""
        response = requests.get(f"{BASE_URL}/api/level/config")
        data = response.json()
        
        assert 'levels' in data, "Response should have 'levels' key"
        assert len(data['levels']) == 12, f"Expected 12 levels, got {len(data['levels'])}"
        print("PASS: Level config contains 12 levels")

    def test_get_level_config_structure(self):
        """Each level config has required fields"""
        response = requests.get(f"{BASE_URL}/api/level/config")
        data = response.json()
        
        required_fields = ['level', 'required_points', 'title_de', 'title_it', 'icon']
        for level_cfg in data['levels']:
            for field in required_fields:
                assert field in level_cfg, f"Level {level_cfg.get('level', '?')} missing field: {field}"
        print(f"PASS: All 12 levels have required fields: {required_fields}")

    def test_get_level_config_ascending_points(self):
        """Level thresholds are in ascending order"""
        response = requests.get(f"{BASE_URL}/api/level/config")
        data = response.json()
        
        prev_points = -1
        for level_cfg in data['levels']:
            assert level_cfg['required_points'] > prev_points, \
                f"Level {level_cfg['level']} points {level_cfg['required_points']} not > {prev_points}"
            prev_points = level_cfg['required_points']
        print("PASS: Level thresholds are in ascending order")

    def test_acknowledge_levelup_returns_success(self):
        """POST /api/level/{profile_id}/acknowledge-levelup returns success"""
        response = requests.post(f"{BASE_URL}/api/level/{TEST_PROFILE_ID}/acknowledge-levelup")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get('success') == True, "Expected success: true"
        print("PASS: POST /api/level/{profile_id}/acknowledge-levelup returns success")


class TestWeeklyReportAPI:
    """Tests for Weekly Report endpoint"""

    def test_get_weekly_report_returns_200(self):
        """GET /api/weekly-report/{profile_id}?lang=de returns 200"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: GET /api/weekly-report/{profile_id}?lang=de returns 200")

    def test_weekly_report_has_period(self):
        """Weekly report has period field"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'period' in data, "Missing 'period' field"
        assert ' - ' in data['period'], "Period should contain date range"
        print(f"PASS: Weekly report period: {data['period']}")

    def test_weekly_report_overview_fields(self):
        """Weekly report overview has required fields"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'overview' in data, "Missing 'overview' field"
        ov = data['overview']
        
        required_fields = ['active_days', 'total_days', 'week_completion_pct', 'total_points', 'plan_full_days']
        for field in required_fields:
            assert field in ov, f"Overview missing field: {field}"
        
        assert ov['total_days'] == 7, f"total_days should be 7, got {ov['total_days']}"
        assert 0 <= ov['active_days'] <= 7, f"active_days {ov['active_days']} should be 0-7"
        assert 0 <= ov['week_completion_pct'] <= 100, f"week_completion_pct {ov['week_completion_pct']} should be 0-100"
        print(f"PASS: Overview - active_days: {ov['active_days']}/7, completion: {ov['week_completion_pct']}%")

    def test_weekly_report_level_info(self):
        """Weekly report has level info"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'level' in data, "Missing 'level' field"
        lv = data['level']
        
        required_fields = ['level', 'title', 'icon', 'total_points', 'progress_pct', 'points_to_next']
        for field in required_fields:
            assert field in lv, f"Level missing field: {field}"
        print(f"PASS: Level info - Level {lv['level']} ({lv['title']}), progress: {lv['progress_pct']}%")

    def test_weekly_report_supplements_section(self):
        """Weekly report has supplements section (if applicable)"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        # supplements can be null if no plan exists
        if data.get('supplements') is not None:
            supp = data['supplements']
            required_fields = ['adherence_pct', 'taken', 'expected', 'days_good']
            for field in required_fields:
                assert field in supp, f"Supplements missing field: {field}"
            print(f"PASS: Supplements - {supp['taken']}/{supp['expected']} taken, {supp['adherence_pct']}% adherence")
        else:
            print("PASS: Supplements section is null (no supplement plan)")

    def test_weekly_report_medications_section(self):
        """Weekly report has medications section (if applicable)"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        # medications can be null if no medications exist
        if data.get('medications') is not None:
            med = data['medications']
            required_fields = ['adherence_pct', 'taken', 'expected', 'days_good']
            for field in required_fields:
                assert field in med, f"Medications missing field: {field}"
            print(f"PASS: Medications - {med['taken']}/{med['expected']} taken, {med['adherence_pct']}% adherence")
        else:
            print("PASS: Medications section is null (no medications)")

    def test_weekly_report_water_section(self):
        """Weekly report has water section"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'water' in data, "Missing 'water' field"
        water = data['water']
        
        required_fields = ['days_reached', 'goal_ml', 'avg_ml', 'total_ml']
        for field in required_fields:
            assert field in water, f"Water missing field: {field}"
        print(f"PASS: Water - {water['days_reached']}/7 days reached, avg {water['avg_ml']}ml")

    def test_weekly_report_stress_section(self):
        """Weekly report has stress section"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'stress' in data, "Missing 'stress' field"
        stress = data['stress']
        
        required_fields = ['sessions', 'improvement']
        for field in required_fields:
            assert field in stress, f"Stress missing field: {field}"
        print(f"PASS: Stress - {stress['sessions']} sessions, improvement: {stress['improvement']}")

    def test_weekly_report_diary_section(self):
        """Weekly report has diary section"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'diary' in data, "Missing 'diary' field"
        diary = data['diary']
        
        assert 'entries' in diary, "Diary missing 'entries' field"
        print(f"PASS: Diary - {diary['entries']} entries")

    def test_weekly_report_days_array(self):
        """Weekly report has 7 days in days array"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'days' in data, "Missing 'days' field"
        days = data['days']
        
        assert len(days) == 7, f"Expected 7 days, got {len(days)}"
        
        required_fields = ['date', 'label', 'tasks_done', 'tasks_total']
        for day in days:
            for field in required_fields:
                assert field in day, f"Day missing field: {field}"
        
        # Check one day is marked as today
        today_count = sum(1 for d in days if d.get('is_today', False))
        assert today_count == 1, f"Expected exactly 1 day marked as today, got {today_count}"
        print(f"PASS: Days array has 7 entries with correct structure")

    def test_weekly_report_vero_section(self):
        """Weekly report has VERO recommendation"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert 'vero' in data, "Missing 'vero' field"
        vero = data['vero']
        
        assert 'text' in vero, "VERO missing 'text' field"
        assert 'focus_area' in vero, "VERO missing 'focus_area' field"
        assert len(vero['text']) > 0, "VERO text should not be empty"
        print(f"PASS: VERO recommendation - focus: {vero['focus_area']}, text: {vero['text'][:50]}...")

    def test_weekly_report_italian_language(self):
        """GET /api/weekly-report/{profile_id}?lang=it returns Italian content"""
        response = requests.get(f"{BASE_URL}/api/weekly-report/{TEST_PROFILE_ID}?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        # Check Italian day labels
        days = data.get('days', [])
        if days:
            italian_labels = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']
            for day in days:
                assert day['label'] in italian_labels, f"Day label '{day['label']}' not Italian"
        
        # Check Italian level title
        if data.get('level', {}).get('level') == 1:
            assert data['level']['title'] == 'Inizio', f"Expected Italian title 'Inizio'"
        
        print("PASS: Italian language support working")


class TestLevelCalculation:
    """Tests for level calculation logic"""

    def test_level_1_threshold(self):
        """Level 1 starts at 0 points"""
        response = requests.get(f"{BASE_URL}/api/level/config")
        data = response.json()
        
        level_1 = data['levels'][0]
        assert level_1['level'] == 1
        assert level_1['required_points'] == 0
        print("PASS: Level 1 starts at 0 points")

    def test_level_12_threshold(self):
        """Level 12 requires 7000 points"""
        response = requests.get(f"{BASE_URL}/api/level/config")
        data = response.json()
        
        level_12 = data['levels'][11]
        assert level_12['level'] == 12
        assert level_12['required_points'] == 7000
        print("PASS: Level 12 requires 7000 points")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
