"""
Test suite for Product Selection feature - Iteration 70
Tests the ability to select a product for a nutrient, and verify it appears in daily plan

Endpoints tested:
- POST /api/products/select - save product selection (upsert)
- GET /api/products/selections/{profile_id} - get all product selections
- DELETE /api/products/selections/{profile_id}/{nutrient_id} - remove selection
- GET /api/medications/{profile_id}/daily-plan?lang=de - verify selected product names appear
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"  # Profile with supplements

# Test-specific identifiers to avoid collisions
TEST_PREFIX = f"TEST_ProductSel70_{uuid.uuid4().hex[:6]}"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestProductSelectionCRUD:
    """Test product selection CRUD operations"""
    
    def test_01_create_product_selection_for_vitamin_d(self, api_client):
        """POST /api/products/select - create product selection for vitamin_d"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "nutrient_id": "vitamin_d",
            "product_name": "Factor D Premium",
            "product_id": "product_factor_d_123"
        }
        response = api_client.post(f"{BASE_URL}/api/products/select", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        assert data.get("product_name") == "Factor D Premium"
        print(f"✓ Created product selection for vitamin_d: Factor D Premium")
    
    def test_02_get_product_selections(self, api_client):
        """GET /api/products/selections/{profile_id} - verify selection was saved"""
        response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "selections" in data
        
        selections = data["selections"]
        assert "vitamin_d" in selections, f"vitamin_d not found in selections: {selections}"
        assert selections["vitamin_d"]["product_name"] == "Factor D Premium"
        assert selections["vitamin_d"]["product_id"] == "product_factor_d_123"
        print(f"✓ Get selections returns vitamin_d selection: {selections['vitamin_d']}")
    
    def test_03_upsert_product_selection(self, api_client):
        """POST /api/products/select - upsert (update existing selection)"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "nutrient_id": "vitamin_d",
            "product_name": "Factor D3 Gold",
            "product_id": "product_factor_d3_gold_456"
        }
        response = api_client.post(f"{BASE_URL}/api/products/select", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert data.get("product_name") == "Factor D3 Gold"
        
        # Verify the update persisted
        get_response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        assert get_response.status_code == 200
        selections = get_response.json()["selections"]
        assert selections["vitamin_d"]["product_name"] == "Factor D3 Gold"
        assert selections["vitamin_d"]["product_id"] == "product_factor_d3_gold_456"
        print(f"✓ Upsert worked: vitamin_d now has 'Factor D3 Gold'")
    
    def test_04_create_selection_for_magnesium(self, api_client):
        """POST /api/products/select - create another selection for magnesium"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "nutrient_id": "magnesium",
            "product_name": "MagnePower 400",
            "product_id": "product_magnepower_789"
        }
        response = api_client.post(f"{BASE_URL}/api/products/select", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Created product selection for magnesium: MagnePower 400")
    
    def test_05_multiple_selections_preserved(self, api_client):
        """Verify multiple selections are preserved independently"""
        response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        
        assert response.status_code == 200
        selections = response.json()["selections"]
        
        # Both should exist
        assert "vitamin_d" in selections
        assert "magnesium" in selections
        assert selections["vitamin_d"]["product_name"] == "Factor D3 Gold"
        assert selections["magnesium"]["product_name"] == "MagnePower 400"
        print(f"✓ Multiple selections preserved: vitamin_d and magnesium")


class TestDailyPlanWithProductSelections:
    """Test that daily plan reflects product selections"""
    
    def test_06_daily_plan_shows_selected_product_name_for_vitamin_d(self, api_client):
        """GET daily-plan should show 'Factor D3 Gold' instead of generic 'Vitamin D3'"""
        response = api_client.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan?lang=de")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "plan" in data
        
        # Find vitamin_d in plan
        found_vitamin_d = None
        for timing_group in data["plan"]:
            for item in timing_group.get("items", []):
                if item.get("id") == "vitamin_d":
                    found_vitamin_d = item
                    break
            if found_vitamin_d:
                break
        
        assert found_vitamin_d is not None, "vitamin_d not found in daily plan"
        
        # Verify selected product name appears
        assert found_vitamin_d["name"] == "Factor D3 Gold", f"Expected 'Factor D3 Gold', got '{found_vitamin_d['name']}'"
        assert found_vitamin_d["original_name"] == "Vitamin D3", f"Expected original_name 'Vitamin D3', got '{found_vitamin_d.get('original_name')}'"
        assert found_vitamin_d["product_selected"] == True, f"Expected product_selected=True, got {found_vitamin_d.get('product_selected')}"
        print(f"✓ Daily plan shows selected product: {found_vitamin_d['name']} (original: {found_vitamin_d['original_name']})")
    
    def test_07_daily_plan_shows_selected_product_name_for_magnesium(self, api_client):
        """GET daily-plan should show 'MagnePower 400' for magnesium"""
        response = api_client.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find magnesium in plan
        found_magnesium = None
        for timing_group in data["plan"]:
            for item in timing_group.get("items", []):
                if item.get("id") == "magnesium":
                    found_magnesium = item
                    break
            if found_magnesium:
                break
        
        assert found_magnesium is not None, "magnesium not found in daily plan"
        
        assert found_magnesium["name"] == "MagnePower 400", f"Expected 'MagnePower 400', got '{found_magnesium['name']}'"
        assert found_magnesium["product_selected"] == True
        print(f"✓ Daily plan shows selected product for magnesium: {found_magnesium['name']}")
    
    def test_08_daily_plan_unselected_supplements_show_generic_name(self, api_client):
        """GET daily-plan should show generic name for supplements without product selection"""
        response = api_client.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find b_vitamins (not selected)
        found_b_vitamins = None
        for timing_group in data["plan"]:
            for item in timing_group.get("items", []):
                if item.get("id") == "b_vitamins":
                    found_b_vitamins = item
                    break
            if found_b_vitamins:
                break
        
        assert found_b_vitamins is not None, "b_vitamins not found in daily plan"
        
        # Should show generic name
        assert found_b_vitamins["product_selected"] == False, f"Expected product_selected=False, got {found_b_vitamins.get('product_selected')}"
        assert found_b_vitamins["name"] == found_b_vitamins.get("original_name", found_b_vitamins["name"]), "name should equal original_name when no product selected"
        print(f"✓ Unselected supplement b_vitamins shows generic name: {found_b_vitamins['name']}")


class TestDeleteProductSelection:
    """Test removing product selections"""
    
    def test_09_delete_product_selection(self, api_client):
        """DELETE /api/products/selections/{profile_id}/{nutrient_id}"""
        response = api_client.delete(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}/vitamin_d")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Deleted product selection for vitamin_d")
    
    def test_10_verify_deletion_persisted(self, api_client):
        """GET selections should not include deleted nutrient"""
        response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        
        assert response.status_code == 200
        selections = response.json()["selections"]
        
        assert "vitamin_d" not in selections, f"vitamin_d should be deleted but found: {selections}"
        # magnesium should still exist
        assert "magnesium" in selections
        print(f"✓ vitamin_d deleted, magnesium still exists")
    
    def test_11_daily_plan_reverts_to_generic_after_deletion(self, api_client):
        """Daily plan should revert to generic name after product selection deleted"""
        response = api_client.get(f"{BASE_URL}/api/medications/{TEST_PROFILE_ID}/daily-plan?lang=de")
        
        assert response.status_code == 200
        data = response.json()
        
        # Find vitamin_d
        found_vitamin_d = None
        for timing_group in data["plan"]:
            for item in timing_group.get("items", []):
                if item.get("id") == "vitamin_d":
                    found_vitamin_d = item
                    break
            if found_vitamin_d:
                break
        
        assert found_vitamin_d is not None
        
        # Should now show generic name since selection was deleted
        assert found_vitamin_d["product_selected"] == False
        assert found_vitamin_d["name"] == found_vitamin_d["original_name"], f"Name should be generic after deletion"
        print(f"✓ After deletion, vitamin_d reverts to generic name: {found_vitamin_d['name']}")


class TestSelectingProductDoesNotAffectOthers:
    """Test that selecting a product for one nutrient doesn't affect others"""
    
    def test_12_select_b_vitamins_does_not_affect_others(self, api_client):
        """Selecting product for b_vitamins should not affect magnesium selection"""
        # Select for b_vitamins
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "nutrient_id": "b_vitamins",
            "product_name": "B-Complex Pro",
            "product_id": "product_b_complex_pro"
        }
        response = api_client.post(f"{BASE_URL}/api/products/select", json=payload)
        assert response.status_code == 200
        
        # Verify magnesium is still intact
        get_response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        selections = get_response.json()["selections"]
        
        assert "magnesium" in selections
        assert selections["magnesium"]["product_name"] == "MagnePower 400"
        assert "b_vitamins" in selections
        assert selections["b_vitamins"]["product_name"] == "B-Complex Pro"
        print(f"✓ Selecting b_vitamins did not affect magnesium selection")


class TestEdgeCases:
    """Test edge cases"""
    
    def test_13_empty_product_id_allowed(self, api_client):
        """POST with empty product_id should still work"""
        payload = {
            "profile_id": TEST_PROFILE_ID,
            "nutrient_id": "probiotics",
            "product_name": "ProBio Max",
            "product_id": ""  # Empty product_id
        }
        response = api_client.post(f"{BASE_URL}/api/products/select", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        
        # Verify
        get_response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        selections = get_response.json()["selections"]
        assert selections["probiotics"]["product_name"] == "ProBio Max"
        assert selections["probiotics"]["product_id"] == ""
        print(f"✓ Empty product_id allowed, selection saved")
    
    def test_14_get_selections_for_nonexistent_profile(self, api_client):
        """GET selections for profile with no selections should return empty"""
        fake_profile = "nonexistent-profile-99999"
        response = api_client.get(f"{BASE_URL}/api/products/selections/{fake_profile}")
        
        assert response.status_code == 200
        data = response.json()
        assert "selections" in data
        assert data["selections"] == {}
        print(f"✓ Empty selections returned for nonexistent profile")
    
    def test_15_delete_nonexistent_selection_is_idempotent(self, api_client):
        """DELETE nonexistent selection should succeed (idempotent)"""
        response = api_client.delete(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}/nonexistent_nutrient")
        
        # Should succeed even if nothing to delete
        assert response.status_code == 200
        print(f"✓ Delete nonexistent selection is idempotent (returns success)")


class TestCleanup:
    """Clean up test data"""
    
    def test_99_cleanup_test_selections(self, api_client):
        """Remove all test product selections created during testing"""
        # Clean up all selections we created
        test_nutrients = ["vitamin_d", "magnesium", "b_vitamins", "probiotics"]
        for nutrient in test_nutrients:
            api_client.delete(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}/{nutrient}")
        
        # Verify cleanup
        response = api_client.get(f"{BASE_URL}/api/products/selections/{TEST_PROFILE_ID}")
        selections = response.json().get("selections", {})
        
        # None of our test nutrients should remain
        remaining_test = [n for n in test_nutrients if n in selections]
        assert len(remaining_test) == 0, f"Failed to clean up: {remaining_test}"
        print(f"✓ Cleaned up all test product selections")
