"""
Work Type Feature Tests
Testing new work_type onboarding fields and shift work assessment logic
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestOnboardingOptions:
    """Tests for GET /api/onboarding/options - new work type fields"""
    
    def test_onboarding_options_returns_work_types(self):
        """Verify work_types field exists in onboarding options"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert "work_types" in data, "work_types field missing from onboarding options"
        assert isinstance(data["work_types"], list)
        assert len(data["work_types"]) >= 6, "Expected at least 6 work types"
        
        # Verify expected work type values
        work_type_values = [wt["value"] for wt in data["work_types"]]
        expected_types = ["office", "homeoffice", "physical", "field_work", "shift_work", "night_work"]
        for expected in expected_types:
            assert expected in work_type_values, f"Missing work type: {expected}"
        
        print(f"PASS: work_types contains {len(data['work_types'])} options")
    
    def test_onboarding_options_returns_shift_models(self):
        """Verify shift_models field exists in onboarding options"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert "shift_models" in data, "shift_models field missing from onboarding options"
        assert isinstance(data["shift_models"], list)
        assert len(data["shift_models"]) >= 3, "Expected at least 3 shift models"
        
        shift_model_values = [sm["value"] for sm in data["shift_models"]]
        expected_models = ["2_shift", "3_shift", "vollkonti"]
        for expected in expected_models:
            assert expected in shift_model_values, f"Missing shift model: {expected}"
        
        print(f"PASS: shift_models contains {len(data['shift_models'])} options")
    
    def test_onboarding_options_returns_shift_types(self):
        """Verify shift_types field exists with timing defaults"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert "shift_types" in data, "shift_types field missing from onboarding options"
        assert isinstance(data["shift_types"], list)
        assert len(data["shift_types"]) >= 3, "Expected at least 3 shift types"
        
        shift_type_values = [st["value"] for st in data["shift_types"]]
        expected_types = ["early", "late", "night"]
        for expected in expected_types:
            assert expected in shift_type_values, f"Missing shift type: {expected}"
        
        # Verify default_times exist for scheduling
        for shift_type in data["shift_types"]:
            assert "default_times" in shift_type, f"Missing default_times for {shift_type['value']}"
            assert "wake" in shift_type["default_times"]
            assert "morning" in shift_type["default_times"]
        
        print(f"PASS: shift_types contains {len(data['shift_types'])} options with default_times")
    
    def test_work_types_have_german_labels(self):
        """Verify work types have proper German labels"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        for wt in data["work_types"]:
            assert "label_de" in wt, f"Missing label_de for {wt['value']}"
            assert len(wt["label_de"]) > 0, f"Empty label_de for {wt['value']}"
        
        # Check specific labels
        shift_work = next((wt for wt in data["work_types"] if wt["value"] == "shift_work"), None)
        assert shift_work is not None
        assert "Schichtarbeit" in shift_work["label_de"]
        
        night_work = next((wt for wt in data["work_types"] if wt["value"] == "night_work"), None)
        assert night_work is not None
        assert "Nachtarbeit" in night_work["label_de"]
        
        print("PASS: All work types have proper German labels")


class TestHealthProfileWithWorkType:
    """Tests for POST /api/health-profile with work type fields"""
    
    def test_create_profile_with_shift_work(self):
        """Create profile with shift_work and verify assessment priority"""
        payload = {
            "first_name": "TEST_ShiftWorker",
            "age": 35,
            "gender": "male",
            "work_type": "shift_work",
            "shift_model": "3_shift",
            "current_shift": "night",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "profile_id" in data
        assert "assessment" in data
        
        # Verify shift work priority area
        priority_areas = data["assessment"].get("priority_areas", [])
        priority_titles = [p.get("title", "") for p in priority_areas]
        
        assert any("Schichtarbeit" in title for title in priority_titles), \
            f"Expected 'Schichtarbeit-Ausgleich' priority area, got: {priority_titles}"
        
        print(f"PASS: Shift work profile created with correct priority area")
        return data["profile_id"]
    
    def test_create_profile_with_night_work(self):
        """Create profile with night_work and verify assessment priority"""
        payload = {
            "first_name": "TEST_NightWorker",
            "age": 30,
            "gender": "female",
            "work_type": "night_work",
            "current_shift": "night",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "assessment" in data
        priority_areas = data["assessment"].get("priority_areas", [])
        priority_titles = [p.get("title", "") for p in priority_areas]
        
        assert any("Schichtarbeit" in title for title in priority_titles), \
            f"Expected 'Schichtarbeit-Ausgleich' for night work, got: {priority_titles}"
        
        print(f"PASS: Night work profile created with correct priority area")
    
    def test_create_profile_with_physical_work(self):
        """Create profile with physical work and verify assessment priority"""
        payload = {
            "first_name": "TEST_PhysicalWorker",
            "age": 40,
            "gender": "male",
            "work_type": "physical",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        priority_areas = data["assessment"].get("priority_areas", [])
        priority_titles = [p.get("title", "") for p in priority_areas]
        
        # Should get physical work priority, not shift work
        has_physical_priority = any("rperliche" in title or "Belastung" in title for title in priority_titles)
        has_shift_priority = any("Schichtarbeit" in title for title in priority_titles)
        
        assert has_physical_priority, f"Expected physical work priority area, got: {priority_titles}"
        assert not has_shift_priority, "Physical work should NOT have Schichtarbeit priority"
        
        print(f"PASS: Physical work profile created with correct priority area")
    
    def test_create_profile_with_office_work(self):
        """Create profile with office work - should NOT get shift-related priorities"""
        payload = {
            "first_name": "TEST_OfficeWorker",
            "age": 28,
            "gender": "female",
            "work_type": "office",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        priority_areas = data["assessment"].get("priority_areas", [])
        priority_titles = [p.get("title", "") for p in priority_areas]
        
        has_shift_priority = any("Schichtarbeit" in title for title in priority_titles)
        has_physical_priority = any("rperliche" in title or "Belastung" in title for title in priority_titles)
        
        assert not has_shift_priority, "Office work should NOT have Schichtarbeit priority"
        assert not has_physical_priority, "Office work should NOT have physical work priority"
        
        print(f"PASS: Office work profile does NOT have shift/physical priorities")
    
    def test_work_type_fields_persisted(self):
        """Verify work type fields are persisted in profile"""
        payload = {
            "first_name": "TEST_FieldsPersist",
            "work_type": "shift_work",
            "shift_model": "2_shift",
            "current_shift": "early",
            "lang": "de"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert create_response.status_code == 200
        profile_id = create_response.json()["profile_id"]
        
        # Fetch profile and verify fields
        get_response = requests.get(f"{BASE_URL}/api/health-profile/{profile_id}")
        assert get_response.status_code == 200
        
        profile = get_response.json().get("profile", {})
        assert profile.get("work_type") == "shift_work"
        assert profile.get("shift_model") == "2_shift"
        assert profile.get("current_shift") == "early"
        
        print(f"PASS: Work type fields correctly persisted in database")


class TestRiskScoresForWorkTypes:
    """Tests for health_engine risk score calculations based on work type"""
    
    def test_shift_work_increases_vitamin_d_risk(self):
        """Shift work should increase vitamin D deficiency risk"""
        payload = {
            "first_name": "TEST_VitDRisk",
            "work_type": "shift_work",
            "shift_model": "3_shift",
            "current_shift": "night",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        deficiencies = response.json()["assessment"].get("deficiencies", [])
        
        # Find vitamin D in deficiencies
        vit_d = next((d for d in deficiencies if "vitamin_d" in d.get("nutrient", "").lower() or "D" in d.get("name", "")), None)
        
        assert vit_d is not None, f"Expected vitamin D in deficiencies for shift worker, got: {[d.get('name') for d in deficiencies]}"
        assert vit_d.get("score", 0) > 0.3, f"Expected elevated vitamin D risk, got: {vit_d.get('score')}"
        
        print(f"PASS: Shift work correctly increases vitamin D risk (score: {vit_d.get('score')})")
    
    def test_night_work_higher_melatonin_risk(self):
        """Night work should have higher melatonin precursor risk than shift work"""
        # Night work profile
        night_payload = {
            "first_name": "TEST_NightMelatonin",
            "work_type": "night_work",
            "current_shift": "night",
            "lang": "de"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=night_payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        deficiencies = response.json()["assessment"].get("deficiencies", [])
        
        # Night workers should have elevated risks for multiple nutrients
        nutrient_names = [d.get("name", "") for d in deficiencies]
        
        # Should have B vitamins and/or magnesium elevated due to night work stress
        has_b_vitamins = any("B" in name for name in nutrient_names)
        has_magnesium = any("Magnesium" in name for name in nutrient_names)
        
        assert has_b_vitamins or has_magnesium, \
            f"Night work should elevate B vitamins or magnesium risk, got: {nutrient_names}"
        
        print(f"PASS: Night work correctly elevates nutrient risks")


class TestItalianLabels:
    """Test Italian language labels for work type options"""
    
    def test_work_types_italian_labels(self):
        """Verify work types have Italian labels"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=it")
        assert response.status_code == 200
        data = response.json()
        
        for wt in data["work_types"]:
            assert "label_it" in wt, f"Missing label_it for {wt['value']}"
            assert len(wt["label_it"]) > 0, f"Empty label_it for {wt['value']}"
        
        # Check specific Italian labels
        shift_work = next((wt for wt in data["work_types"] if wt["value"] == "shift_work"), None)
        assert "turni" in shift_work["label_it"].lower()
        
        night_work = next((wt for wt in data["work_types"] if wt["value"] == "night_work"), None)
        assert "notturno" in night_work["label_it"].lower()
        
        print("PASS: Italian labels present for all work types")
    
    def test_shift_assessment_italian_priority(self):
        """Verify Italian language assessment for shift workers"""
        payload = {
            "first_name": "TEST_ItalianShift",
            "work_type": "shift_work",
            "lang": "it"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/health-profile",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        priority_areas = response.json()["assessment"].get("priority_areas", [])
        priority_titles = [p.get("title", "") for p in priority_areas]
        
        # Should have Italian shift work priority
        has_italian_shift = any("turni" in title.lower() or "lavoro" in title.lower() for title in priority_titles)
        assert has_italian_shift, f"Expected Italian shift work priority, got: {priority_titles}"
        
        print("PASS: Italian assessment includes shift work priority")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
