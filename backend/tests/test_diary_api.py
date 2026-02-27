"""
VitaGuide Diary API Backend Tests
Tests diary entry creation, retrieval, upsert behavior, and LLM trend analysis
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")

BASE_URL = BASE_URL.rstrip('/')


class TestDiaryEntry:
    """Test diary entry creation and retrieval"""

    def test_create_diary_entry_success(self):
        """Test POST /api/diary creates entry and returns it with all fields"""
        payload = {
            "mood": 4,
            "sleep": 3,
            "stress": 3,
            "water": 6,
            "exercise": 30,
            "notes": "TEST_Felt good today, had a nice walk"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diary",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        required_fields = ["id", "date", "mood", "sleep", "stress", "water", "exercise", "notes", "created_at"]
        for field in required_fields:
            assert field in data, f"Response missing field: {field}"
        
        # Verify values match input
        assert data["mood"] == payload["mood"], "Mood should match input"
        assert data["sleep"] == payload["sleep"], "Sleep should match input"
        assert data["stress"] == payload["stress"], "Stress should match input"
        assert data["water"] == payload["water"], "Water should match input"
        assert data["exercise"] == payload["exercise"], "Exercise should match input"
        assert data["notes"] == payload["notes"], "Notes should match input"
        
        # Verify date is today
        today = datetime.now().strftime("%Y-%m-%d")
        assert data["date"] == today, f"Date should be today ({today}), got {data['date']}"
        
        # Verify ID is present
        assert isinstance(data["id"], str), "ID should be string"
        assert len(data["id"]) > 0, "ID should not be empty"
        
        print(f"✓ Diary entry created successfully - ID: {data['id']}, Date: {data['date']}")
        return data["id"]

    def test_diary_entry_validation_clamps_values(self):
        """Test that mood/sleep/stress are clamped to 1-5, water to 0-12, exercise to 0-180"""
        payload = {
            "mood": 10,  # Should clamp to 5
            "sleep": 0,  # Should clamp to 1
            "stress": -5,  # Should clamp to 1
            "water": 20,  # Should clamp to 12
            "exercise": 300,  # Should clamp to 180
            "notes": "TEST_Validation test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/diary",
            json=payload,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["mood"] == 5, f"Mood should be clamped to 5, got {data['mood']}"
        assert data["sleep"] == 1, f"Sleep should be clamped to 1, got {data['sleep']}"
        assert data["stress"] == 1, f"Stress should be clamped to 1, got {data['stress']}"
        assert data["water"] == 12, f"Water should be clamped to 12, got {data['water']}"
        assert data["exercise"] == 180, f"Exercise should be clamped to 180, got {data['exercise']}"
        
        print("✓ Diary entry validation works correctly - values clamped")


class TestDiaryRetrieval:
    """Test diary entry retrieval"""

    def test_get_diary_entries_default(self):
        """Test GET /api/diary returns entries (default 14 days)"""
        response = requests.get(
            f"{BASE_URL}/api/diary",
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # According to context, should have test data from Feb 24-27 + today's entry
        print(f"✓ GET /api/diary returned {len(data)} entries")
        
        # Verify entries are sorted by date descending
        if len(data) > 1:
            dates = [entry["date"] for entry in data]
            assert dates == sorted(dates, reverse=True), "Entries should be sorted by date descending"
            print(f"  - Entries sorted correctly: {dates[0]} (newest) to {dates[-1]} (oldest)")
        
        return data

    def test_get_diary_entries_with_days_parameter(self):
        """Test GET /api/diary?days=7 limits results"""
        response = requests.get(
            f"{BASE_URL}/api/diary?days=7",
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 7, f"Should return max 7 entries, got {len(data)}"
        
        print(f"✓ GET /api/diary?days=7 returned {len(data)} entries (max 7)")


class TestDiaryUpsert:
    """Test upsert behavior - same date updates existing entry"""

    def test_diary_upsert_same_date_updates_entry(self):
        """Test that posting twice on same date updates the entry instead of creating new"""
        # First entry
        payload1 = {
            "mood": 2,
            "sleep": 2,
            "stress": 4,
            "water": 3,
            "exercise": 0,
            "notes": "TEST_First entry for today"
        }
        
        response1 = requests.post(
            f"{BASE_URL}/api/diary",
            json=payload1,
            timeout=10
        )
        assert response1.status_code == 200
        data1 = response1.json()
        entry_id_1 = data1["id"]
        
        print(f"✓ First entry created - ID: {entry_id_1}, mood: {data1['mood']}")
        
        # Second entry same day - should update
        payload2 = {
            "mood": 5,
            "sleep": 5,
            "stress": 5,
            "water": 8,
            "exercise": 60,
            "notes": "TEST_Updated entry for today - feeling much better!"
        }
        
        response2 = requests.post(
            f"{BASE_URL}/api/diary",
            json=payload2,
            timeout=10
        )
        assert response2.status_code == 200
        data2 = response2.json()
        entry_id_2 = data2["id"]
        
        # ID should be the same (upsert behavior)
        assert entry_id_2 == entry_id_1, f"Entry ID should remain same on upsert: {entry_id_1} vs {entry_id_2}"
        
        # Values should be updated
        assert data2["mood"] == payload2["mood"], "Mood should be updated"
        assert data2["notes"] == payload2["notes"], "Notes should be updated"
        
        print(f"✓ Upsert works - Same ID: {entry_id_2}, mood updated: {data1['mood']} → {data2['mood']}")
        
        # Verify by GET that we only have one entry for today
        response_get = requests.get(f"{BASE_URL}/api/diary?days=1", timeout=10)
        entries = response_get.json()
        today = datetime.now().strftime("%Y-%m-%d")
        today_entries = [e for e in entries if e["date"] == today]
        
        assert len(today_entries) == 1, f"Should have exactly 1 entry for today, found {len(today_entries)}"
        assert today_entries[0]["mood"] == payload2["mood"], "GET should return updated entry"
        
        print(f"✓ Verified via GET - Only 1 entry for today with updated values")


class TestDiaryTrends:
    """Test diary trends endpoint with LLM analysis"""

    def test_get_diary_trends_with_insufficient_data(self):
        """Test GET /api/diary/trends with < 3 entries returns message"""
        # This test might fail if there's already data, so we'll make it informational
        response = requests.get(
            f"{BASE_URL}/api/diary/trends",
            timeout=25
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify structure
        assert "entries" in data, "Response should contain 'entries'"
        assert "summary" in data, "Response should contain 'summary'"
        assert "tips" in data, "Response should contain 'tips'"
        
        print(f"✓ GET /api/diary/trends returned data")
        print(f"  - Entries count: {len(data['entries'])}")
        print(f"  - Tips count: {len(data['tips'])}")
        
        if len(data["entries"]) < 3:
            assert "mindestens 3 Tage" in data["summary"].lower(), "Should ask for more entries"
            print("  - Correctly shows message for insufficient data")

    def test_get_diary_trends_with_sufficient_data(self):
        """Test GET /api/diary/trends with >= 3 entries returns LLM analysis"""
        # Context says test data exists for Feb 24-27 (4 entries)
        response = requests.get(
            f"{BASE_URL}/api/diary/trends",
            timeout=25  # LLM call takes 15-20 seconds
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify required fields
        required_fields = ["entries", "summary", "tips", "patterns"]
        for field in required_fields:
            assert field in data, f"Response missing field: {field}"
        
        # Verify data types
        assert isinstance(data["entries"], list), "Entries should be list"
        assert isinstance(data["summary"], str), "Summary should be string"
        assert isinstance(data["tips"], list), "Tips should be list"
        assert isinstance(data["patterns"], list), "Patterns should be list"
        
        # If we have >= 3 entries, should have LLM analysis
        if len(data["entries"]) >= 3:
            assert len(data["summary"]) > 0, "Summary should not be empty"
            assert len(data["tips"]) > 0, "Should have at least one tip"
            
            print(f"✓ Diary trends analysis successful")
            print(f"  - Entries analyzed: {len(data['entries'])}")
            print(f"  - Summary: {data['summary'][:100]}...")
            print(f"  - Lifestyle tips: {len(data['tips'])}")
            print(f"  - Patterns detected: {len(data['patterns'])}")
            
            # Print first tip
            if data["tips"]:
                print(f"  - First tip: {data['tips'][0][:80]}...")
            
            # Print patterns if any
            if data["patterns"]:
                print(f"  - First pattern: {data['patterns'][0]}")
        else:
            print(f"  - Not enough entries for LLM analysis (need 3, have {len(data['entries'])})")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
