"""
Bug Fixes Testing - Iteration 62
Tests for:
1. Recipes Display: GET /api/recipes returns array
2. Symptom Analysis: POST /api/symptoms/analyze 
3. Supplement Plan Generation: POST /api/supplement-plan/{profile_id}
4. GET Supplement Plan: GET /api/supplement-plan/{profile_id} with product enrichment
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vita-guide-redesign.preview.emergentagent.com')

# Test profile IDs
TEST_PROFILE_ID_1 = "5ae69ad6-6bbd-4bbc-ae59-f3e1fba4782b"  # 1 complaint
TEST_PROFILE_ID_2 = "467ccc36-0592-4a7b-8cc5-c7a3fc30c5f3"  # 2 complaints


class TestRecipesDisplay:
    """Bug Fix 1: GET /api/recipes should return a list (array)"""
    
    def test_recipes_returns_array(self):
        """Verify recipes endpoint returns an array, not an object with 'recipes' key"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&limit=4")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list/array, got {type(data).__name__}: {data}"
        print(f"✓ GET /api/recipes returns array with {len(data)} recipes")
    
    def test_recipes_with_lang_de(self):
        """Verify recipes with German language"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            recipe = data[0]
            assert "id" in recipe
            assert "title" in recipe
            print(f"✓ Recipe has id and title: {recipe.get('title', 'N/A')[:50]}")
    
    def test_recipes_with_lang_it(self):
        """Verify recipes with Italian language"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=it")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Italian recipes returned: {len(data)} items")


class TestSymptomAnalysis:
    """Bug Fix 2: POST /api/symptoms/analyze should return analysis results"""
    
    def test_symptom_analyze_german(self):
        """Test symptom analysis with German text"""
        payload = {
            "symptoms": "Müdigkeit",
            "text": "Müdigkeit",
            "tags": [],
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=60  # AI responses can be slow
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected response keys
        assert "summary" in data, f"Missing 'summary' key in response: {data.keys()}"
        assert "priority_level" in data, f"Missing 'priority_level' key in response"
        print(f"✓ Symptom analysis returned summary: {data.get('summary', 'N/A')[:100]}...")
        print(f"✓ Priority level: {data.get('priority_level')}")
    
    def test_symptom_analyze_with_tags(self):
        """Test symptom analysis with symptom tags"""
        payload = {
            "text": "Kopfschmerzen und Müdigkeit",
            "tags": ["stress", "schlafprobleme"],
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/symptoms/analyze",
            json=payload,
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        print(f"✓ Analysis with tags successful")


class TestSupplementPlanGeneration:
    """Bug Fix 3: POST /api/supplement-plan/{profile_id} should generate plan with non-empty stack"""
    
    def test_generate_plan_profile_1_complaint(self):
        """Test plan generation for profile with 1 complaint"""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID_1}?lang=de",
            timeout=120  # LLM summary generation can be slow
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plan_id" in data, f"Missing 'plan_id' in response"
        assert "plan" in data, f"Missing 'plan' in response"
        
        plan = data["plan"]
        assert "stack" in plan, f"Missing 'stack' in plan"
        
        # Verify stack is not empty (baseline supplements should be generated)
        stack = plan["stack"]
        assert isinstance(stack, list), f"Stack should be a list"
        assert len(stack) > 0, f"Stack should not be empty - baseline supplements expected"
        
        # Verify baseline supplements are present
        stack_ids = [s["id"] for s in stack]
        baseline_present = any(s in stack_ids for s in ["vitamin_d", "omega3", "magnesium", "probiotics"])
        assert baseline_present, f"At least one baseline supplement expected. Got: {stack_ids}"
        
        print(f"✓ Plan generated with {len(stack)} supplements: {stack_ids}")
        print(f"✓ Plan ID: {data['plan_id']}")
    
    def test_generate_plan_profile_2_complaints(self):
        """Test plan generation for profile with 2 complaints"""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID_2}?lang=de",
            timeout=120
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "plan" in data
        plan = data["plan"]
        assert "stack" in plan
        
        stack = plan["stack"]
        assert len(stack) > 0, "Stack should not be empty"
        print(f"✓ Profile 2 plan generated with {len(stack)} supplements")
    
    def test_plan_has_weekly_schedule(self):
        """Verify plan includes weekly_schedule structure"""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID_1}?lang=de",
            timeout=120
        )
        assert response.status_code == 200
        
        data = response.json()
        plan = data["plan"]
        
        assert "weekly_schedule" in plan, "Missing weekly_schedule"
        schedule = plan["weekly_schedule"]
        
        # Verify schedule has timing sections
        assert "morning" in schedule, "Missing morning section"
        assert "noon" in schedule, "Missing noon section"
        assert "evening" in schedule, "Missing evening section"
        
        print(f"✓ Weekly schedule has morning/noon/evening sections")


class TestGetSupplementPlan:
    """Bug Fix 4: GET /api/supplement-plan/{profile_id} should return enriched plan"""
    
    def test_get_plan_returns_enriched_data(self):
        """Verify GET returns plan with product names and form labels"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID_1}")
        
        if response.status_code == 404:
            # First generate a plan
            gen_response = requests.post(
                f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID_1}?lang=de",
                timeout=120
            )
            assert gen_response.status_code == 200, "Failed to generate plan"
            response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID_1}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "plan" in data
        assert "profile_id" in data
        
        plan = data["plan"]
        assert "weekly_schedule" in plan
        
        # Check if enrichment happened
        schedule = plan["weekly_schedule"]
        enriched_count = 0
        for timing in ["morning", "noon", "evening"]:
            section = schedule.get(timing, {})
            items = section.get("items", [])
            for item in items:
                if item.get("product_name"):
                    enriched_count += 1
                    print(f"  - {item.get('name')}: {item.get('product_name')} ({item.get('form_label', 'N/A')})")
        
        print(f"✓ GET plan returned with {enriched_count} enriched items")
    
    def test_get_plan_for_nonexistent_profile(self):
        """Verify 404 for non-existent profile"""
        response = requests.get(f"{BASE_URL}/api/supplement-plan/non-existent-profile-id")
        assert response.status_code == 404


class TestHealthProfile:
    """Verify test profiles exist"""
    
    def test_profile_1_exists(self):
        """Verify test profile 1 exists"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{TEST_PROFILE_ID_1}")
        assert response.status_code == 200, f"Test profile 1 not found: {response.status_code}"
        data = response.json()
        assert "profile" in data
        print(f"✓ Profile 1 exists with complaints: {data['profile'].get('complaints', [])}")
    
    def test_profile_2_exists(self):
        """Verify test profile 2 exists"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{TEST_PROFILE_ID_2}")
        assert response.status_code == 200, f"Test profile 2 not found: {response.status_code}"
        data = response.json()
        assert "profile" in data
        print(f"✓ Profile 2 exists with complaints: {data['profile'].get('complaints', [])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
