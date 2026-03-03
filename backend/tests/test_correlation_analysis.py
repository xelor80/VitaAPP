"""
Test Correlation Analysis API - Supplement intake vs symptom progression
Tests the new /api/tracking/correlation-analysis/{profile_id} endpoint
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vitality-mail.preview.emergentagent.com')

# Test profile with 60 days of seed data
TEST_PROFILE_ID = "b35d2eb1-c651-497c-b270-321a74f1a328"
# Profile with no tracking data (non-existent profile for insufficient data test)
EMPTY_PROFILE_ID = "empty-test-profile-no-data-99999"


class TestCorrelationAnalysisEndpoint:
    """Tests for GET /api/tracking/correlation-analysis/{profile_id}"""

    def test_correlation_analysis_30_days_german(self):
        """Test correlation analysis with 30 day period in German"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert data.get("period_days") == 30, f"Expected period_days=30, got {data.get('period_days')}"
        
        # Verify required fields exist
        assert "supplement_compliance" in data, "Missing supplement_compliance"
        assert "symptom_trends" in data, "Missing symptom_trends"
        assert "overall_trend" in data, "Missing overall_trend"
        assert "correlations" in data, "Missing correlations"
        assert "llm_insights" in data, "Missing llm_insights"
        
        print(f"PASS: 30-day German analysis returned {data.get('data_points')} data points")
        print(f"  - Supplement compliance: {len(data['supplement_compliance'])} supplements tracked")
        print(f"  - Symptom trends: {len(data['symptom_trends'])} symptoms tracked")
        print(f"  - Correlations found: {len(data['correlations'])}")

    def test_correlation_analysis_14_days(self):
        """Test correlation analysis with 14 day period"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=14&lang=de"
        response = requests.get(url, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert data.get("period_days") == 14, f"Expected period_days=14, got {data.get('period_days')}"
        
        print(f"PASS: 14-day analysis returned {data.get('data_points')} data points")

    def test_correlation_analysis_60_days(self):
        """Test correlation analysis with 60 day period"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=60&lang=de"
        response = requests.get(url, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        assert data.get("period_days") == 60, f"Expected period_days=60, got {data.get('period_days')}"
        
        print(f"PASS: 60-day analysis returned {data.get('data_points')} data points")

    def test_correlation_analysis_italian(self):
        """Test correlation analysis in Italian"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=it"
        response = requests.get(url, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # LLM insights should be in Italian
        assert data.get("status") == "ok"
        llm = data.get("llm_insights", {})
        # Headline or recommendation should exist (in Italian)
        assert "headline" in llm or "recommendation" in llm, "Missing LLM insights"
        
        print(f"PASS: Italian analysis returned successfully")

    def test_correlation_analysis_invalid_days_defaults_to_30(self):
        """Test that invalid days parameter defaults to 30"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=45&lang=de"
        response = requests.get(url, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should default to 30 days when invalid value provided
        assert data.get("period_days") == 30, f"Expected default of 30 days, got {data.get('period_days')}"
        
        print(f"PASS: Invalid days parameter defaults to 30")

    def test_correlation_analysis_insufficient_data(self):
        """Test that insufficient data returns appropriate status"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{EMPTY_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return insufficient_data status for profiles with no/minimal data
        assert data.get("status") == "insufficient_data", f"Expected status 'insufficient_data', got {data.get('status')}"
        assert "message" in data, "Missing message in insufficient data response"
        
        print(f"PASS: Insufficient data scenario handled correctly: {data.get('message')}")


class TestCorrelationAnalysisResponseStructure:
    """Tests for validating response data structure"""

    def test_supplement_compliance_structure(self):
        """Verify supplement compliance has correct structure"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        data = response.json()
        
        if data.get("status") != "ok":
            pytest.skip("Insufficient data for structure test")
        
        compliance = data.get("supplement_compliance", {})
        assert len(compliance) > 0, "Expected at least one supplement in compliance"
        
        # Check structure of compliance entries
        for sid, comp in compliance.items():
            assert "rate" in comp, f"Missing 'rate' in compliance for {sid}"
            assert "taken" in comp, f"Missing 'taken' in compliance for {sid}"
            assert "total" in comp, f"Missing 'total' in compliance for {sid}"
            assert 0 <= comp["rate"] <= 100, f"Rate should be 0-100, got {comp['rate']}"
        
        print(f"PASS: Supplement compliance structure validated for {len(compliance)} supplements")

    def test_symptom_trends_structure(self):
        """Verify symptom trends have correct structure"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        data = response.json()
        
        if data.get("status") != "ok":
            pytest.skip("Insufficient data for structure test")
        
        trends = data.get("symptom_trends", {})
        assert len(trends) > 0, "Expected at least one symptom in trends"
        
        for sym, trend in trends.items():
            assert "avg_start" in trend, f"Missing 'avg_start' in trend for {sym}"
            assert "avg_end" in trend, f"Missing 'avg_end' in trend for {sym}"
            assert "change_pct" in trend, f"Missing 'change_pct' in trend for {sym}"
            assert "direction" in trend, f"Missing 'direction' in trend for {sym}"
            assert trend["direction"] in ["improving", "worsening", "stable"], f"Invalid direction: {trend['direction']}"
        
        print(f"PASS: Symptom trends structure validated for {len(trends)} symptoms")

    def test_overall_trend_structure(self):
        """Verify overall trend has correct structure"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        data = response.json()
        
        if data.get("status") != "ok":
            pytest.skip("Insufficient data for structure test")
        
        overall = data.get("overall_trend", {})
        assert "direction" in overall, "Missing 'direction' in overall_trend"
        assert "change_pct" in overall, "Missing 'change_pct' in overall_trend"
        assert "avg_start" in overall, "Missing 'avg_start' in overall_trend"
        assert "avg_end" in overall, "Missing 'avg_end' in overall_trend"
        assert overall["direction"] in ["improving", "worsening", "stable"], f"Invalid direction: {overall['direction']}"
        
        print(f"PASS: Overall trend structure validated - direction: {overall['direction']}, change: {overall['change_pct']}%")

    def test_correlations_structure(self):
        """Verify correlations array has correct structure"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        data = response.json()
        
        if data.get("status") != "ok":
            pytest.skip("Insufficient data for structure test")
        
        correlations = data.get("correlations", [])
        assert isinstance(correlations, list), "correlations should be a list"
        
        if len(correlations) > 0:
            for corr in correlations:
                assert "supplement" in corr, "Missing 'supplement' in correlation"
                assert "symptom" in corr, "Missing 'symptom' in correlation"
                assert "compliance_rate" in corr, "Missing 'compliance_rate' in correlation"
                assert "symptom_change_pct" in corr, "Missing 'symptom_change_pct' in correlation"
                assert "strength" in corr, "Missing 'strength' in correlation"
                assert corr["strength"] in ["strong_positive", "moderate_positive", "neutral", "negative_indicator"], f"Invalid strength: {corr['strength']}"
        
        print(f"PASS: Correlations structure validated - found {len(correlations)} correlations")

    def test_llm_insights_structure(self):
        """Verify LLM insights have correct structure"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?days=30&lang=de"
        response = requests.get(url, timeout=60)
        data = response.json()
        
        if data.get("status") != "ok":
            pytest.skip("Insufficient data for structure test")
        
        llm = data.get("llm_insights", {})
        
        # Check for headline or fallback structure
        assert "headline" in llm or "insights" in llm, "Missing headline or insights in llm_insights"
        
        if "insights" in llm and len(llm["insights"]) > 0:
            for insight in llm["insights"]:
                assert "type" in insight, "Missing 'type' in insight"
                assert "text" in insight, "Missing 'text' in insight"
                assert "severity" in insight, "Missing 'severity' in insight"
        
        if "recommendation" in llm:
            assert isinstance(llm["recommendation"], str), "recommendation should be a string"
        
        print(f"PASS: LLM insights structure validated - headline: {llm.get('headline', 'N/A')[:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
