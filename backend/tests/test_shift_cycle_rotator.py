"""
Test cases for Shift Cycle Rotator feature.
Tests: PUT /api/supplement-plan/{profile_id}/reminders with shift_cycle field
       GET /api/supplement-plan/{profile_id}/today-shift endpoint
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_PROFILE_ID = "6bf7a26c-0620-4e8f-b2ec-091ea4da789a"


class TestShiftCycleReminders:
    """Test PUT /api/supplement-plan/{profile_id}/reminders with shift_cycle field"""

    def test_put_reminders_with_shift_cycle(self):
        """PUT reminders should accept shift_cycle field with pattern and start_date"""
        payload = {
            "enabled": True,
            "morning_time": "05:00",
            "noon_time": "11:30",
            "evening_time": "20:00",
            "shift_cycle": {
                "pattern": ["early", "late", "night", "off"],
                "start_date": "2026-01-10"
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("success") is True
        assert data["reminders"]["shift_cycle"]["pattern"] == ["early", "late", "night", "off"]
        assert data["reminders"]["shift_cycle"]["start_date"] == "2026-01-10"
        print("PASS: PUT reminders accepts shift_cycle field with pattern and start_date")

    def test_put_reminders_ffssnn_pattern(self):
        """PUT reminders should accept FFSSNN-- pattern (early, early, late, late, night, night, off, off)"""
        payload = {
            "enabled": True,
            "morning_time": "14:30",
            "noon_time": "20:00",
            "evening_time": "03:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "night", "night", "off", "off"],
                "start_date": "2026-03-01"
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reminders"]["shift_cycle"]["pattern"] == ["early", "early", "late", "late", "night", "night", "off", "off"]
        print("PASS: PUT reminders accepts FFSSNN-- pattern")

    def test_put_reminders_without_shift_cycle(self):
        """PUT reminders without shift_cycle should set it to null"""
        payload = {
            "enabled": True,
            "morning_time": "08:00",
            "noon_time": "12:00",
            "evening_time": "20:00"
        }
        response = requests.put(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reminders"]["shift_cycle"] is None
        print("PASS: PUT reminders without shift_cycle sets it to null")
        
        # Restore shift_cycle for other tests
        restore_payload = {
            "enabled": True,
            "morning_time": "14:30",
            "noon_time": "20:00",
            "evening_time": "03:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "night", "night", "off", "off"],
                "start_date": "2026-03-01"
            }
        }
        requests.put(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders", json=restore_payload)


class TestTodayShiftEndpoint:
    """Test GET /api/supplement-plan/{profile_id}/today-shift endpoint"""

    @pytest.fixture(autouse=True)
    def setup_shift_cycle(self):
        """Ensure test profile has shift_cycle configured"""
        payload = {
            "enabled": True,
            "morning_time": "14:30",
            "noon_time": "20:00",
            "evening_time": "03:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "night", "night", "off", "off"],
                "start_date": "2026-03-01"
            }
        }
        requests.put(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders", json=payload)
        yield

    def test_today_shift_returns_correct_shift(self):
        """GET today-shift should return current shift based on pattern and start_date"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/today-shift?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # Should have shift field (not null when configured)
        assert "shift" in data
        assert data["shift"] in ["early", "late", "night", "off"]
        assert "day_index" in data
        assert "cycle_day" in data
        assert "times" in data
        print(f"PASS: today-shift returns correct shift: {data['shift']}, day_index: {data['day_index']}")

    def test_today_shift_returns_german_label(self):
        """GET today-shift should return correct German label"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/today-shift?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # Verify German labels
        expected_labels = {
            "early": "Fruehschicht",
            "late": "Spaetschicht",
            "night": "Nachtschicht",
            "off": "Frei"
        }
        if data["shift"]:
            assert data["label"] == expected_labels[data["shift"]]
            print(f"PASS: German label correct: {data['label']}")

    def test_today_shift_returns_italian_label(self):
        """GET today-shift should return correct Italian label"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/today-shift?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        # Verify Italian labels
        expected_labels = {
            "early": "Turno mattutino",
            "late": "Turno pomeridiano",
            "night": "Turno notturno",
            "off": "Libero"
        }
        if data["shift"]:
            assert data["label"] == expected_labels[data["shift"]]
            print(f"PASS: Italian label correct: {data['label']}")

    def test_today_shift_returns_correct_times(self):
        """GET today-shift should return correct reminder times for each shift type"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/today-shift?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # Verify times structure
        times = data.get("times", {})
        assert "morning_time" in times
        assert "noon_time" in times
        assert "evening_time" in times
        
        # Verify times are in correct format (HH:MM)
        for key in ["morning_time", "noon_time", "evening_time"]:
            assert len(times[key]) == 5 and ":" in times[key]
        
        # Verify specific times per shift type
        expected_times = {
            "early": {"morning_time": "05:00", "noon_time": "11:30", "evening_time": "20:00"},
            "late": {"morning_time": "09:30", "noon_time": "15:30", "evening_time": "23:00"},
            "night": {"morning_time": "14:30", "noon_time": "20:00", "evening_time": "03:00"},
            "off": {"morning_time": "09:00", "noon_time": "12:30", "evening_time": "20:00"},
        }
        if data["shift"]:
            expected = expected_times[data["shift"]]
            assert times == expected, f"Times mismatch: got {times}, expected {expected}"
            print(f"PASS: Times correct for {data['shift']}: {times}")

    def test_today_shift_null_when_no_cycle(self):
        """GET today-shift should return null shift when no cycle is configured"""
        # First remove shift_cycle
        payload = {
            "enabled": True,
            "morning_time": "08:00",
            "noon_time": "12:00",
            "evening_time": "20:00"
        }
        requests.put(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders", json=payload)
        
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/today-shift?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert data["shift"] is None
        assert "message" in data
        print(f"PASS: today-shift returns null when no cycle configured: {data}")
        
        # Restore shift_cycle
        restore_payload = {
            "enabled": True,
            "morning_time": "14:30",
            "noon_time": "20:00",
            "evening_time": "03:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "night", "night", "off", "off"],
                "start_date": "2026-03-01"
            }
        }
        requests.put(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders", json=restore_payload)

    def test_today_shift_404_for_nonexistent_profile(self):
        """GET today-shift should return 404 for non-existent profile"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/nonexistent-profile-id/today-shift?lang=de")
        assert response.status_code == 404
        print("PASS: today-shift returns 404 for non-existent profile")


class TestShiftCycleCalculation:
    """Test the shift cycle day calculation logic"""

    def test_cycle_day_calculation_pattern_rotation(self):
        """Verify cycle rotates correctly through all days of pattern"""
        # Set a known start_date and pattern
        today = datetime.now()
        start_date = (today - timedelta(days=3)).strftime("%Y-%m-%d")  # 3 days ago
        
        payload = {
            "enabled": True,
            "morning_time": "14:30",
            "noon_time": "20:00",
            "evening_time": "03:00",
            "shift_cycle": {
                "pattern": ["early", "late", "night", "off"],  # 4-day cycle
                "start_date": start_date
            }
        }
        requests.put(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders", json=payload)
        
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/today-shift?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        # After 3 days from start, should be at day_index 3 (0-indexed)
        # pattern[3] = "off"
        assert data["day_index"] == 3
        assert data["shift"] == "off"
        assert data["cycle_day"] == 4  # 1-indexed day count
        print(f"PASS: Cycle calculation correct - day_index: {data['day_index']}, shift: {data['shift']}")
        
        # Restore original pattern
        restore_payload = {
            "enabled": True,
            "morning_time": "14:30",
            "noon_time": "20:00",
            "evening_time": "03:00",
            "shift_cycle": {
                "pattern": ["early", "early", "late", "late", "night", "night", "off", "off"],
                "start_date": "2026-03-01"
            }
        }
        requests.put(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/reminders", json=restore_payload)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
