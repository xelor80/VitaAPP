"""
Test Suite: Supplement Compliance Tracking Synchronization
Tests the bug fix for synchronization between home screen (DailyTasks) 
and supplement plan page. Both pages now read/write from the same 
compliance_tracking collection.

Endpoints tested:
- GET /api/tracking/compliance/today/{profile_id} - returns today's taken supplement IDs
- POST /api/daily-tasks/complete-supplements - saves to compliance_tracking
- GET /api/products/by-nutrient/{nutrient} - Cache-Control header verification
"""

import pytest
import requests
import os
from datetime import datetime, timezone
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://stress-relief-app-11.preview.emergentagent.com').rstrip('/')
TEST_PROFILE_ID = "c454e95d-7033-4207-ba7e-553fe477a234"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestComplianceTodayEndpoint:
    """Test GET /api/tracking/compliance/today/{profile_id}"""
    
    def test_get_today_compliance_returns_200(self, api_client):
        """Test that today's compliance endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/tracking/compliance/today/{TEST_PROFILE_ID} returned 200")
    
    def test_get_today_compliance_returns_correct_structure(self, api_client):
        """Test that response has required fields: date, supplements, taken_ids"""
        response = api_client.get(f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data, "Response missing 'date' field"
        assert "supplements" in data, "Response missing 'supplements' field"
        assert "taken_ids" in data, "Response missing 'taken_ids' field"
        
        # Verify date format YYYY-MM-DD
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert data["date"] == today, f"Expected date {today}, got {data['date']}"
        
        # Verify types
        assert isinstance(data["supplements"], list), "supplements should be a list"
        assert isinstance(data["taken_ids"], list), "taken_ids should be a list"
        
        print(f"✓ Response structure correct: date={data['date']}, supplements count={len(data['supplements'])}, taken_ids count={len(data['taken_ids'])}")
    
    def test_get_today_compliance_taken_ids_match_supplements(self, api_client):
        """Test that taken_ids only contains IDs of supplements where taken=true"""
        response = api_client.get(f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        supplements = data.get("supplements", [])
        taken_ids = data.get("taken_ids", [])
        
        # Calculate expected taken_ids from supplements
        expected_taken_ids = [s["id"] for s in supplements if s.get("taken")]
        
        assert set(taken_ids) == set(expected_taken_ids), (
            f"taken_ids mismatch: got {taken_ids}, expected {expected_taken_ids}"
        )
        print(f"✓ taken_ids correctly matches supplements with taken=true")
    
    def test_get_today_compliance_nonexistent_profile(self, api_client):
        """Test that nonexistent profile returns empty compliance"""
        fake_profile_id = f"TEST_nonexistent_{uuid.uuid4()}"
        response = api_client.get(f"{BASE_URL}/api/tracking/compliance/today/{fake_profile_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Should return empty arrays for nonexistent profile
        assert data.get("supplements") == [], "supplements should be empty for nonexistent profile"
        assert data.get("taken_ids") == [], "taken_ids should be empty for nonexistent profile"
        print(f"✓ Nonexistent profile returns empty compliance correctly")


class TestCompleteSupplementsEndpoint:
    """Test POST /api/daily-tasks/complete-supplements"""
    
    def test_complete_supplements_returns_200(self, api_client):
        """Test that completing supplements returns success"""
        unique_id = f"TEST_supplement_{uuid.uuid4().hex[:8]}"
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "supplement_ids": [unique_id],
            "timing": "morning"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=true, got {data}"
        assert data.get("completed") == 1, f"Expected completed=1, got {data.get('completed')}"
        
        print(f"✓ POST /api/daily-tasks/complete-supplements returned success for {unique_id}")
    
    def test_complete_supplements_creates_compliance_entry(self, api_client):
        """Test that completing supplements creates entry in compliance_tracking"""
        unique_id = f"TEST_verify_{uuid.uuid4().hex[:8]}"
        
        # Complete a supplement
        complete_payload = {
            "profile_id": TEST_PROFILE_ID,
            "supplement_ids": [unique_id],
            "timing": "morning"
        }
        complete_response = api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json=complete_payload
        )
        assert complete_response.status_code == 200, f"Complete failed: {complete_response.text}"
        
        # Verify it appears in today's compliance
        compliance_response = api_client.get(
            f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}"
        )
        assert compliance_response.status_code == 200
        
        data = compliance_response.json()
        taken_ids = data.get("taken_ids", [])
        
        assert unique_id in taken_ids, f"Supplement {unique_id} not found in taken_ids: {taken_ids}"
        print(f"✓ Supplement {unique_id} correctly appears in compliance tracking")
    
    def test_complete_supplements_no_duplicates(self, api_client):
        """Test that completing the same supplement twice doesn't create duplicates"""
        unique_id = f"TEST_nodupe_{uuid.uuid4().hex[:8]}"
        
        # Complete the supplement twice
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "supplement_ids": [unique_id],
            "timing": "morning"
        }
        
        # First completion
        response1 = api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json=payload
        )
        assert response1.status_code == 200
        
        # Second completion (same supplement)
        response2 = api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json=payload
        )
        assert response2.status_code == 200
        
        # Check compliance tracking - should only have one entry for this supplement
        compliance_response = api_client.get(
            f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}"
        )
        assert compliance_response.status_code == 200
        
        data = compliance_response.json()
        supplements = data.get("supplements", [])
        
        # Count occurrences of the unique_id
        matching = [s for s in supplements if s.get("id") == unique_id]
        assert len(matching) == 1, f"Expected 1 occurrence of {unique_id}, found {len(matching)}: {matching}"
        
        print(f"✓ No duplicates created - supplement {unique_id} appears exactly once")
    
    def test_complete_multiple_supplements_at_once(self, api_client):
        """Test completing multiple supplements in a single request"""
        ids = [
            f"TEST_multi1_{uuid.uuid4().hex[:8]}",
            f"TEST_multi2_{uuid.uuid4().hex[:8]}",
            f"TEST_multi3_{uuid.uuid4().hex[:8]}"
        ]
        
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "supplement_ids": ids,
            "timing": "morning"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("completed") == 3, f"Expected completed=3, got {data.get('completed')}"
        
        # Verify all appear in compliance
        compliance_response = api_client.get(
            f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}"
        )
        assert compliance_response.status_code == 200
        
        taken_ids = compliance_response.json().get("taken_ids", [])
        for supplement_id in ids:
            assert supplement_id in taken_ids, f"Supplement {supplement_id} not in taken_ids"
        
        print(f"✓ Multiple supplements ({len(ids)}) completed and tracked correctly")


class TestComplianceSynchronization:
    """Test synchronization between home screen and supplement plan page"""
    
    def test_supplements_marked_on_home_appear_on_plan(self, api_client):
        """
        Simulate home screen marking supplements as taken,
        verify they appear as taken when supplement plan page loads compliance
        """
        unique_id = f"TEST_sync_home_{uuid.uuid4().hex[:8]}"
        
        # Simulate home screen completing supplement
        home_payload = {
            "profile_id": TEST_PROFILE_ID,
            "supplement_ids": [unique_id],
            "timing": "morning"
        }
        home_response = api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json=home_payload
        )
        assert home_response.status_code == 200, f"Home screen completion failed: {home_response.text}"
        
        # Simulate supplement plan page loading today's compliance
        plan_response = api_client.get(
            f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}"
        )
        assert plan_response.status_code == 200
        
        taken_ids = plan_response.json().get("taken_ids", [])
        assert unique_id in taken_ids, (
            f"Supplement {unique_id} marked on home screen not visible on plan page. "
            f"taken_ids: {taken_ids}"
        )
        
        print(f"✓ Sync verified: supplement marked on home screen visible on supplement plan page")
    
    def test_existing_compliance_preserved_when_adding_new(self, api_client):
        """Test that adding new supplements doesn't remove existing ones"""
        id1 = f"TEST_preserve1_{uuid.uuid4().hex[:8]}"
        id2 = f"TEST_preserve2_{uuid.uuid4().hex[:8]}"
        
        # Complete first supplement
        api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json={"profile_id": TEST_PROFILE_ID, "supplement_ids": [id1], "timing": "morning"}
        )
        
        # Complete second supplement
        api_client.post(
            f"{BASE_URL}/api/daily-tasks/complete-supplements",
            json={"profile_id": TEST_PROFILE_ID, "supplement_ids": [id2], "timing": "noon"}
        )
        
        # Both should be in compliance
        compliance_response = api_client.get(
            f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}"
        )
        assert compliance_response.status_code == 200
        
        taken_ids = compliance_response.json().get("taken_ids", [])
        assert id1 in taken_ids, f"First supplement {id1} was lost after adding second"
        assert id2 in taken_ids, f"Second supplement {id2} not added"
        
        print(f"✓ Existing compliance preserved when adding new supplements")


class TestProductsCacheControl:
    """Test Cache-Control header on products/by-nutrient endpoint"""
    
    def test_products_by_nutrient_has_cache_control_no_store(self, api_client):
        """Verify Cache-Control: no-store header is present"""
        response = api_client.get(f"{BASE_URL}/api/products/by-nutrient/magnesium?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        cache_control = response.headers.get("Cache-Control", "")
        assert "no-store" in cache_control.lower(), (
            f"Expected 'no-store' in Cache-Control header, got: '{cache_control}'"
        )
        
        print(f"✓ /api/products/by-nutrient has Cache-Control: {cache_control}")
    
    def test_products_by_nutrient_multiple_nutrients(self, api_client):
        """Test Cache-Control for different nutrients"""
        nutrients = ["vitamin_d", "iron", "omega3", "vitamin_b12"]
        
        for nutrient in nutrients:
            response = api_client.get(f"{BASE_URL}/api/products/by-nutrient/{nutrient}?lang=de")
            assert response.status_code == 200, f"{nutrient}: Expected 200, got {response.status_code}"
            
            cache_control = response.headers.get("Cache-Control", "")
            assert "no-store" in cache_control.lower(), (
                f"{nutrient}: Missing 'no-store' in Cache-Control: '{cache_control}'"
            )
        
        print(f"✓ All {len(nutrients)} nutrient endpoints have correct Cache-Control header")


class TestExistingComplianceData:
    """Test with existing compliance data for test profile"""
    
    def test_existing_compliance_data_accessible(self, api_client):
        """Verify test profile's existing compliance data is accessible"""
        response = api_client.get(f"{BASE_URL}/api/tracking/compliance/today/{TEST_PROFILE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✓ Test profile compliance data: {len(data.get('supplements', []))} supplements, "
              f"{len(data.get('taken_ids', []))} taken")
        
        # Just verify the structure is correct for existing data
        for supplement in data.get("supplements", []):
            assert "id" in supplement, f"Supplement missing 'id': {supplement}"
            assert "taken" in supplement, f"Supplement missing 'taken': {supplement}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
