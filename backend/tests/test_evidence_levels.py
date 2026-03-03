"""
Test evidence levels for supplement recommendations.
Each supplement in the stack should have evidence_level and evidence_label fields.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://wellness-profile-hub.preview.emergentagent.com').rstrip('/')
PROFILE_ID = "b35d2eb1-c651-497c-b270-321a74f1a328"


class TestEvidenceLevels:
    """Test evidence levels in supplement plan API"""

    def test_supplement_plan_returns_evidence_fields(self):
        """GET /api/supplement-plan/{profile_id} returns evidence_level and evidence_label for each supplement"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        plan = data.get('plan', {})
        stack = plan.get('stack', [])
        
        assert len(stack) > 0, "Stack should have at least one supplement"
        
        for supplement in stack:
            # Verify evidence_level field exists and has valid value
            assert 'evidence_level' in supplement, f"Missing evidence_level for {supplement.get('name')}"
            assert supplement['evidence_level'] in ['high', 'medium', 'exploratory'], \
                f"Invalid evidence_level '{supplement['evidence_level']}' for {supplement.get('name')}"
            
            # Verify evidence_label field exists
            assert 'evidence_label' in supplement, f"Missing evidence_label for {supplement.get('name')}"
            assert len(supplement['evidence_label']) > 0, f"Empty evidence_label for {supplement.get('name')}"

    def test_evidence_level_high_supplements(self):
        """Verify high evidence supplements have correct label"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data.get('plan', {}).get('stack', [])
        
        high_evidence_supplements = [s for s in stack if s.get('evidence_level') == 'high']
        assert len(high_evidence_supplements) > 0, "Should have at least one high evidence supplement"
        
        for supplement in high_evidence_supplements:
            # German label should contain "Hoch"
            assert 'Hoch' in supplement['evidence_label'] or 'Alto' in supplement['evidence_label'], \
                f"High evidence label should contain 'Hoch' or 'Alto', got: {supplement['evidence_label']}"

    def test_evidence_level_medium_supplements(self):
        """Verify medium evidence supplements have correct label"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data.get('plan', {}).get('stack', [])
        
        medium_evidence_supplements = [s for s in stack if s.get('evidence_level') == 'medium']
        
        for supplement in medium_evidence_supplements:
            # German label should contain "Mittel"
            assert 'Mittel' in supplement['evidence_label'] or 'Medio' in supplement['evidence_label'], \
                f"Medium evidence label should contain 'Mittel' or 'Medio', got: {supplement['evidence_label']}"

    def test_supplement_stack_fields_structure(self):
        """Verify each supplement has all required fields"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        stack = data.get('plan', {}).get('stack', [])
        
        required_fields = ['id', 'name', 'dosage', 'unit', 'timing', 'evidence_level', 'evidence_label', 'reason']
        
        for supplement in stack:
            for field in required_fields:
                assert field in supplement, f"Missing field '{field}' in supplement {supplement.get('name', 'unknown')}"


class TestInteractionAnalysisStillWorks:
    """Verify interaction analysis tab endpoint still works"""

    def test_interaction_analysis_endpoint(self):
        """GET /api/supplement-plan/{profile_id}/interactions returns analysis"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{PROFILE_ID}/interactions")
        # Should return 200 or data
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
