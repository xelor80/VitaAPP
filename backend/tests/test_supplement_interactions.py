"""Test Supplement Interaction Analysis API - LLM-powered stack analyzer."""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROFILE_ID = "b35d2eb1-c651-497c-b270-321a74f1a328"


class TestSupplementInteractionsAPI:
    """Tests for /api/supplement-plan/{profile_id}/analyze-interactions and /api/supplement-plan/{profile_id}/interactions endpoints."""

    # --- POST /analyze-interactions Tests ---

    def test_analyze_interactions_german_success(self):
        """POST /analyze-interactions?lang=de should return structured analysis in German."""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/analyze-interactions?lang=de",
            headers={"Content-Type": "application/json"},
            timeout=60  # LLM takes time
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required top-level fields
        assert "overall_score" in data, "Missing overall_score"
        assert "score_label" in data, "Missing score_label"
        assert "summary" in data, "Missing summary"
        assert "interactions" in data, "Missing interactions array"
        assert "optimizations" in data, "Missing optimizations array"
        
        # Verify overall_score is valid
        assert isinstance(data["overall_score"], (int, float)), "overall_score should be numeric"
        assert 0 <= data["overall_score"] <= 100, "overall_score should be 0-100"
        
        # Verify interactions is a list
        assert isinstance(data["interactions"], list), "interactions should be a list"
        
        # Verify optimizations is a list
        assert isinstance(data["optimizations"], list), "optimizations should be a list"
        print(f"Analysis returned: score={data['overall_score']}, interactions={len(data['interactions'])}, optimizations={len(data['optimizations'])}")

    def test_analyze_interactions_structure(self):
        """POST /analyze-interactions should return interactions with correct structure."""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/analyze-interactions?lang=de",
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check interaction structure if any exist
        if len(data["interactions"]) > 0:
            interaction = data["interactions"][0]
            assert "severity" in interaction, "Interaction missing severity"
            assert interaction["severity"] in ["red", "yellow", "green"], f"Invalid severity: {interaction['severity']}"
            assert "title" in interaction, "Interaction missing title"
            assert "description" in interaction, "Interaction missing description"
            print(f"First interaction: severity={interaction['severity']}, title={interaction['title'][:50]}...")
        
        # Check optimization structure if any exist
        if len(data["optimizations"]) > 0:
            optimization = data["optimizations"][0]
            assert "type" in optimization, "Optimization missing type"
            assert optimization["type"] in ["timing", "dosage", "replace"], f"Invalid optimization type: {optimization['type']}"
            assert "supplement" in optimization, "Optimization missing supplement"
            print(f"First optimization: type={optimization['type']}, supplement={optimization['supplement']}")

    def test_analyze_interactions_italian(self):
        """POST /analyze-interactions?lang=it should return analysis in Italian."""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/analyze-interactions?lang=it",
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "overall_score" in data
        assert "summary" in data
        # Italian response should contain Italian text (though we can't guarantee exact words)
        print(f"Italian analysis: score={data['overall_score']}, summary_preview={data.get('summary', '')[:100]}...")

    def test_analyze_interactions_invalid_profile(self):
        """POST /analyze-interactions with invalid profile should return 404."""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/invalid-profile-id/analyze-interactions?lang=de",
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        assert response.status_code == 404, f"Expected 404 for invalid profile, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Should have error detail"
        print(f"Correctly returned 404 for invalid profile: {data['detail']}")

    # --- GET /interactions Tests (Cached Analysis) ---

    def test_get_cached_interactions_success(self):
        """GET /interactions should return previously cached analysis."""
        # First ensure there's a cached analysis by running POST
        post_response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/analyze-interactions?lang=de",
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert post_response.status_code == 200
        
        # Now GET the cached version
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/interactions",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "overall_score" in data, "Cached analysis missing overall_score"
        assert "interactions" in data, "Cached analysis missing interactions"
        assert "optimizations" in data, "Cached analysis missing optimizations"
        print(f"Cached analysis retrieved: score={data['overall_score']}")

    def test_get_cached_interactions_invalid_profile(self):
        """GET /interactions with invalid profile should return 404."""
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/nonexistent-profile/interactions",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"Correctly returned 404 for nonexistent profile: {data['detail']}")

    # --- Integration Tests ---

    def test_analysis_has_traffic_light_data(self):
        """Analysis should have interactions with traffic light severity levels."""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/analyze-interactions?lang=de",
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        
        interactions = data.get("interactions", [])
        if len(interactions) > 0:
            severities = [i["severity"] for i in interactions]
            print(f"Traffic light distribution: red={severities.count('red')}, yellow={severities.count('yellow')}, green={severities.count('green')}")
            # Verify all severities are valid
            for sev in severities:
                assert sev in ["red", "yellow", "green"], f"Invalid severity: {sev}"

    def test_supplement_plan_exists(self):
        """Verify the supplement plan exists for the test profile."""
        response = requests.get(
            f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Supplement plan not found: {response.status_code}"
        data = response.json()
        assert "plan" in data, "Missing plan in response"
        plan = data.get("plan", {})
        stack = plan.get("stack", [])
        assert len(stack) > 0, "Supplement stack should not be empty"
        print(f"Supplement plan has {len(stack)} supplements in stack")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
