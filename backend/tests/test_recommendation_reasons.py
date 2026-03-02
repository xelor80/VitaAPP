"""
Test Supplement Recommendation Reasons Feature
Tests the personalized recommendation_reasons array for each supplement
based on user health data (complaints, stress level, sleep quality, deficiencies)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROFILE_ID = "b35d2eb1-c651-497c-b270-321a74f1a328"


class TestRecommendationReasons:
    """Tests for supplement recommendation_reasons feature"""

    def test_get_plan_returns_recommendation_reasons(self):
        """GET /api/supplement-plan/{profile_id} returns recommendation_reasons for each supplement"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plan" in data
        plan = data["plan"]
        assert "stack" in plan
        stack = plan["stack"]
        
        # Every supplement should have recommendation_reasons field
        for supplement in stack:
            assert "recommendation_reasons" in supplement, f"Missing recommendation_reasons for {supplement['name']}"
            assert isinstance(supplement["recommendation_reasons"], list), f"recommendation_reasons should be list for {supplement['name']}"

    def test_recommendation_reasons_max_four_items(self):
        """Each supplement has max 4 recommendation_reasons"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data["plan"]["stack"]
        
        for supplement in stack:
            reasons_count = len(supplement.get("recommendation_reasons", []))
            assert reasons_count <= 4, f"{supplement['name']} has {reasons_count} reasons (max 4 allowed)"

    def test_magnesium_has_stress_and_fatigue_reasons(self):
        """Magnesium reasons include stress and fatigue-related triggers"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data["plan"]["stack"]
        
        # Find magnesium
        magnesium = next((s for s in stack if s["id"] == "magnesium"), None)
        assert magnesium is not None, "Magnesium not found in stack"
        
        reasons = magnesium.get("recommendation_reasons", [])
        reasons_text = " ".join(reasons).lower()
        
        # Should contain stress-related reason
        assert "stress" in reasons_text or "8/10" in reasons_text, f"Magnesium should have stress reason. Got: {reasons}"
        
        # Should contain fatigue-related reason
        assert "muedigkeit" in reasons_text or "müdigkeit" in reasons_text or "fatigue" in reasons_text, \
            f"Magnesium should have fatigue reason. Got: {reasons}"

    def test_post_regenerates_plan_with_reasons(self):
        """POST /api/supplement-plan/{profile_id}?lang=de regenerates plan with recommendation_reasons"""
        response = requests.post(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plan" in data
        plan = data["plan"]
        stack = plan.get("stack", [])
        
        assert len(stack) > 0, "Stack should not be empty after regeneration"
        
        # Verify all supplements have recommendation_reasons
        for supplement in stack:
            assert "recommendation_reasons" in supplement
            assert isinstance(supplement["recommendation_reasons"], list)

    def test_reasons_are_german_with_lang_de(self):
        """Recommendation reasons are in German when lang=de"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data["plan"]["stack"]
        
        # Check if reasons contain German text indicators
        all_reasons = []
        for supplement in stack:
            all_reasons.extend(supplement.get("recommendation_reasons", []))
        
        if all_reasons:
            all_text = " ".join(all_reasons)
            # German indicators: umlauts or German words
            has_german = ("Muedigkeit" in all_text or "Stresswert" in all_text or 
                         "Mangelrisiko" in all_text or "Schlafqualitaet" in all_text or
                         "Kopfschmerzen" in all_text or "Verdauungsbeschwerden" in all_text)
            assert has_german, f"Reasons should be in German. Got: {all_reasons[:5]}"

    def test_evidence_fields_still_present(self):
        """Evidence level and label fields are still present (regression test)"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data["plan"]["stack"]
        
        for supplement in stack:
            assert "evidence_level" in supplement, f"Missing evidence_level for {supplement['name']}"
            assert "evidence_label" in supplement, f"Missing evidence_label for {supplement['name']}"
            assert supplement["evidence_level"] in ["high", "medium", "exploratory"]

    def test_all_seven_supplements_have_reasons(self):
        """All 7 supplements in stack should have recommendation_reasons"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data["plan"]["stack"]
        
        assert len(stack) == 7, f"Expected 7 supplements, got {len(stack)}"
        
        for supplement in stack:
            reasons = supplement.get("recommendation_reasons", [])
            assert len(reasons) > 0, f"{supplement['name']} should have at least one reason"
            print(f"{supplement['name']}: {len(reasons)} reasons - {reasons}")
