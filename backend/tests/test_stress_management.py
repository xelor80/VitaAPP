"""
Stress Management Module Tests - Iteration 77
Tests for the new stress management feature including:
- GET /api/stress/exercises - List all exercises with language support
- GET /api/stress/recommend/{profile_id} - Personalized recommendations
- POST /api/stress/sessions/start - Start a stress session
- POST /api/stress/sessions/{session_id}/complete - Complete session with rewards
- GET /api/stress/sessions/{profile_id}/stats - User stats
- GET /api/stress/sessions/{profile_id}/history - Session history
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stress-relief-app-11.preview.emergentagent.com').rstrip('/')
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"


class TestStressExercises:
    """Tests for GET /api/stress/exercises endpoint"""
    
    def test_get_exercises_german(self):
        """Test getting exercises in German (primary language)"""
        response = requests.get(f"{BASE_URL}/api/stress/exercises?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "exercises" in data
        assert "categories" in data
        
        exercises = data["exercises"]
        assert len(exercises) == 15, f"Expected 15 exercises, got {len(exercises)}"
        
        # Verify exercise structure
        first_exercise = exercises[0]
        assert "id" in first_exercise
        assert "name" in first_exercise
        assert "description" in first_exercise
        assert "category" in first_exercise
        assert "duration_seconds" in first_exercise
        assert "difficulty" in first_exercise
        assert "content_json" in first_exercise
        
        # Verify German content is returned
        assert first_exercise["name"] == first_exercise.get("name_de", "")
        
    def test_get_exercises_italian(self):
        """Test getting exercises in Italian"""
        response = requests.get(f"{BASE_URL}/api/stress/exercises?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        exercises = data["exercises"]
        assert len(exercises) == 15
        
        # Verify Italian content is returned
        first_exercise = exercises[0]
        assert first_exercise["name"] == first_exercise.get("name_it", "")
        
    def test_get_exercises_by_category(self):
        """Test filtering exercises by category"""
        response = requests.get(f"{BASE_URL}/api/stress/exercises?category=breathing&lang=de")
        assert response.status_code == 200
        
        data = response.json()
        exercises = data["exercises"]
        
        # All returned exercises should be breathing category
        for ex in exercises:
            assert ex["category"] == "breathing"
            
    def test_categories_metadata(self):
        """Test that category metadata is returned correctly"""
        response = requests.get(f"{BASE_URL}/api/stress/exercises?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        categories = data["categories"]
        
        # Verify all 5 categories exist
        expected_categories = ["breathing", "mini", "sleep", "focus", "movement"]
        for cat in expected_categories:
            assert cat in categories
            assert "icon" in categories[cat]
            assert "color" in categories[cat]
            assert "label_de" in categories[cat]
            assert "label_it" in categories[cat]


class TestStressRecommendation:
    """Tests for GET /api/stress/recommend/{profile_id} endpoint"""
    
    def test_get_recommendation_german(self):
        """Test getting personalized recommendation in German"""
        response = requests.get(f"{BASE_URL}/api/stress/recommend/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendation" in data
        assert "reason" in data
        assert "stress_level" in data
        assert "categories" in data
        
        # Verify recommendation structure
        rec = data["recommendation"]
        assert rec is not None
        assert "id" in rec
        assert "name" in rec
        assert "description" in rec
        assert "category" in rec
        assert "duration_seconds" in rec
        
        # Verify reason is in German
        reason = data["reason"]
        assert len(reason) > 0
        
    def test_get_recommendation_italian(self):
        """Test getting personalized recommendation in Italian"""
        response = requests.get(f"{BASE_URL}/api/stress/recommend/{TEST_PROFILE_ID}?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendation" in data
        assert "reason" in data
        
    def test_recommendation_with_nonexistent_profile(self):
        """Test recommendation with a profile that doesn't exist (should still work with defaults)"""
        fake_profile_id = f"TEST_fake_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/stress/recommend/{fake_profile_id}?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert "recommendation" in data
        # Should return a default recommendation


class TestStressSessions:
    """Tests for stress session start/complete endpoints"""
    
    def test_start_session(self):
        """Test starting a stress session"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "exercise_id": "breath_calm",
            "stress_before": 6
        }
        response = requests.post(
            f"{BASE_URL}/api/stress/sessions/start",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "session_id" in data
        assert data["session_id"].startswith("stress_")
        
        # Store for next test
        TestStressSessions.session_id = data["session_id"]
        
    def test_complete_session(self):
        """Test completing a stress session and receiving rewards"""
        # Use a unique profile ID to ensure reward is granted (not duplicate)
        unique_profile_id = f"TEST_stress_complete_{uuid.uuid4().hex[:8]}"
        
        # First start a new session
        start_payload = {
            "profile_id": unique_profile_id,
            "exercise_id": "mini_2min_pause",
            "stress_before": 8
        }
        start_response = requests.post(
            f"{BASE_URL}/api/stress/sessions/start",
            json=start_payload
        )
        assert start_response.status_code == 200
        session_id = start_response.json()["session_id"]
        
        # Wait a moment to simulate exercise duration
        time.sleep(1)
        
        # Complete the session
        complete_payload = {
            "stress_after": 4,
            "mood_after": "relaxed",
            "completed": True
        }
        response = requests.post(
            f"{BASE_URL}/api/stress/sessions/{session_id}/complete",
            json=complete_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "completed"
        assert "duration_completed" in data
        assert "improvement" in data
        assert data["improvement"] == 4  # 8 - 4 = 4
        
        # Verify reward was granted (first time for this profile)
        assert "reward" in data
        reward = data["reward"]
        assert reward["granted"] == True
        assert reward["points"] == 10
        assert reward["action"] == "stress_exercise"
        
    def test_complete_nonexistent_session(self):
        """Test completing a session that doesn't exist"""
        response = requests.post(
            f"{BASE_URL}/api/stress/sessions/nonexistent_session_123/complete",
            json={"stress_after": 3, "completed": True}
        )
        assert response.status_code == 404
        
    def test_abandon_session(self):
        """Test abandoning a session (completed=false)"""
        # Start a session
        start_payload = {
            "profile_id": TEST_PROFILE_ID,
            "exercise_id": "breath_box",
            "stress_before": 5
        }
        start_response = requests.post(
            f"{BASE_URL}/api/stress/sessions/start",
            json=start_payload
        )
        session_id = start_response.json()["session_id"]
        
        # Abandon the session
        complete_payload = {
            "stress_after": None,
            "completed": False
        }
        response = requests.post(
            f"{BASE_URL}/api/stress/sessions/{session_id}/complete",
            json=complete_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "abandoned"


class TestStressStats:
    """Tests for GET /api/stress/sessions/{profile_id}/stats endpoint"""
    
    def test_get_stats(self):
        """Test getting user stress stats"""
        response = requests.get(f"{BASE_URL}/api/stress/sessions/{TEST_PROFILE_ID}/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_sessions" in data
        assert "avg_stress_before" in data
        assert "avg_stress_after" in data
        assert "avg_improvement" in data
        assert "total_minutes" in data
        assert "active_days_30d" in data
        
        # Verify data types
        assert isinstance(data["total_sessions"], int)
        assert isinstance(data["avg_stress_before"], (int, float))
        assert isinstance(data["avg_stress_after"], (int, float))
        
    def test_stats_for_new_profile(self):
        """Test stats for a profile with no sessions"""
        fake_profile_id = f"TEST_nostats_{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/api/stress/sessions/{fake_profile_id}/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_sessions"] == 0


class TestStressHistory:
    """Tests for GET /api/stress/sessions/{profile_id}/history endpoint"""
    
    def test_get_history(self):
        """Test getting session history"""
        response = requests.get(f"{BASE_URL}/api/stress/sessions/{TEST_PROFILE_ID}/history")
        assert response.status_code == 200
        
        data = response.json()
        assert "sessions" in data
        
        # If there are sessions, verify structure
        if len(data["sessions"]) > 0:
            session = data["sessions"][0]
            assert "id" in session
            assert "profile_id" in session
            assert "exercise_id" in session
            assert "completion_status" in session
            assert "exercise_name_de" in session
            assert "exercise_category" in session
            
    def test_history_with_limit(self):
        """Test history with limit parameter"""
        response = requests.get(f"{BASE_URL}/api/stress/sessions/{TEST_PROFILE_ID}/history?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["sessions"]) <= 5


class TestExerciseContent:
    """Tests for exercise content structure"""
    
    def test_breathing_exercise_content(self):
        """Test breathing exercise has correct animation content"""
        response = requests.get(f"{BASE_URL}/api/stress/exercises?category=breathing&lang=de")
        assert response.status_code == 200
        
        exercises = response.json()["exercises"]
        breathing_ex = exercises[0]
        
        content = breathing_ex["content_json"]
        assert content["type"] == "breathing"
        assert "pattern" in content
        assert "cycles" in content
        
        # Verify pattern structure
        pattern = content["pattern"]
        assert len(pattern) > 0
        for phase in pattern:
            assert "phase" in phase
            assert "label_de" in phase
            assert "label_it" in phase
            assert "seconds" in phase
            
    def test_guided_steps_exercise_content(self):
        """Test guided steps exercise has correct content"""
        response = requests.get(f"{BASE_URL}/api/stress/exercises?category=mini&lang=de")
        assert response.status_code == 200
        
        exercises = response.json()["exercises"]
        # Find a guided_steps exercise
        guided_ex = next((e for e in exercises if e["instruction_type"] == "text"), None)
        assert guided_ex is not None
        
        content = guided_ex["content_json"]
        assert content["type"] == "guided_steps"
        assert "steps" in content
        
        # Verify steps structure
        steps = content["steps"]
        assert len(steps) > 0
        for step in steps:
            assert "duration" in step
            assert "text_de" in step
            assert "text_it" in step
