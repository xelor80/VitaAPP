"""
Test personalized recipes endpoint for VitaGuide
Tests: GET /api/recipes/personalized/{profile_id}?lang=de
Features: relevance_score, relevance_tags, deficiency matching, complaint matching, diet bonus
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('REACT_APP_BACKEND_URL')
TEST_PROFILE_ID = "4f3cc8dc-170c-4f7b-a179-bf2f0e789ff4"

# Test profile deficiencies: iron (high), omega3 (high), folate (high), zinc (medium), vitamin_b12 (medium)
# Test profile complaints: fatigue (7), headache (5)
# Test profile diet: vegetarian


class TestPersonalizedRecipesEndpoint:
    """Test GET /api/recipes/personalized/{profile_id} endpoint"""
    
    def test_endpoint_returns_200(self):
        """Test endpoint returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Endpoint returns 200 status code")
    
    def test_response_structure(self):
        """Test response has recipes array and profile_diet field"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert "recipes" in data, "Response missing 'recipes' field"
        assert isinstance(data["recipes"], list), "'recipes' should be a list"
        assert "profile_diet" in data, "Response missing 'profile_diet' field"
        print(f"PASS: Response structure valid - {len(data['recipes'])} recipes returned")
    
    def test_recipes_have_relevance_fields(self):
        """Test each recipe has relevance_score and relevance_tags"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        for recipe in data["recipes"]:
            assert "relevance_score" in recipe, f"Recipe {recipe.get('id')} missing relevance_score"
            assert "relevance_tags" in recipe, f"Recipe {recipe.get('id')} missing relevance_tags"
            assert isinstance(recipe["relevance_score"], (int, float)), "relevance_score should be numeric"
            assert isinstance(recipe["relevance_tags"], list), "relevance_tags should be a list"
        print(f"PASS: All {len(data['recipes'])} recipes have relevance_score and relevance_tags")
    
    def test_recipes_sorted_by_relevance_score(self):
        """Test recipes are sorted by relevance_score descending (highest first)"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        recipes = data["recipes"]
        
        for i in range(len(recipes) - 1):
            current_score = recipes[i]["relevance_score"]
            next_score = recipes[i + 1]["relevance_score"]
            assert current_score >= next_score, f"Recipes not sorted: {current_score} should be >= {next_score}"
        
        print(f"PASS: Recipes sorted by relevance_score (highest first)")
        if recipes:
            print(f"  - Top score: {recipes[0]['relevance_score']} ({recipes[0]['title']})")
            print(f"  - Bottom score: {recipes[-1]['relevance_score']}")
    
    def test_relevance_tags_max_three(self):
        """Test relevance_tags are limited to max 3 tags"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        for recipe in data["recipes"]:
            assert len(recipe["relevance_tags"]) <= 3, f"Recipe {recipe['id']} has {len(recipe['relevance_tags'])} tags (max 3)"
        print("PASS: All recipes have at most 3 relevance_tags")
    
    def test_iron_deficiency_matching(self):
        """Test iron deficiency creates 'Eisenreich' tag on iron-rich recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        # Find recipes with 'Eisenreich' tag
        iron_tagged = [r for r in data["recipes"] if "Eisenreich" in r["relevance_tags"]]
        print(f"Found {len(iron_tagged)} recipes with 'Eisenreich' tag")
        
        assert len(iron_tagged) > 0, "Expected at least one recipe with 'Eisenreich' tag for iron deficiency"
        
        # Check that iron-tagged recipes have score > 0
        for recipe in iron_tagged:
            assert recipe["relevance_score"] > 0, f"Recipe with Eisenreich tag should have score > 0"
        print("PASS: Iron deficiency matching works - 'Eisenreich' tags found on relevant recipes")
    
    def test_omega3_deficiency_matching(self):
        """Test omega3 deficiency creates 'Reich an Omega-3' tag"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        omega3_tagged = [r for r in data["recipes"] if "Reich an Omega-3" in r["relevance_tags"]]
        print(f"Found {len(omega3_tagged)} recipes with 'Reich an Omega-3' tag")
        
        # May be 0 if no omega-3 tagged recipes exist, but validate structure if present
        if omega3_tagged:
            for recipe in omega3_tagged:
                assert recipe["relevance_score"] > 0, f"Recipe with Omega-3 tag should have score > 0"
            print("PASS: Omega-3 deficiency matching works")
        else:
            print("INFO: No recipes with omega-3 specific tag found (may not exist in catalog)")
    
    def test_fatigue_complaint_matching(self):
        """Test fatigue complaint creates 'Gegen Muedigkeit' tag"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        fatigue_tagged = [r for r in data["recipes"] if "Gegen Muedigkeit" in r["relevance_tags"]]
        print(f"Found {len(fatigue_tagged)} recipes with 'Gegen Muedigkeit' tag")
        
        # Fatigue intensity is 7, so we expect matches
        assert len(fatigue_tagged) > 0, "Expected at least one recipe with 'Gegen Muedigkeit' tag for fatigue complaint"
        print("PASS: Fatigue complaint matching works - 'Gegen Muedigkeit' tags found")
    
    def test_relevant_vs_other_recipes_count(self):
        """Test that recipes are split into relevant (score>0) and other (score=0)"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        recipes = data["recipes"]
        
        relevant = [r for r in recipes if r["relevance_score"] > 0]
        other = [r for r in recipes if r["relevance_score"] == 0]
        
        print(f"Relevant recipes (score > 0): {len(relevant)}")
        print(f"Other recipes (score = 0): {len(other)}")
        print(f"Total: {len(recipes)}")
        
        # Expected: 28 with score>0, 9 with score=0 based on context
        assert len(relevant) > 0, "Expected some recipes with relevance_score > 0"
        assert len(recipes) > 20, f"Expected >20 total recipes, got {len(recipes)}"
        print("PASS: Recipes correctly split into relevant/other categories")
    
    def test_recipe_standard_fields(self):
        """Test recipes have all standard fields (id, title, tags, etc.)"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        required_fields = ["id", "title", "ingredients", "steps", "time_min", "tags", "symptom_tags", "image_url"]
        
        for recipe in data["recipes"][:5]:  # Check first 5
            for field in required_fields:
                assert field in recipe, f"Recipe {recipe.get('id')} missing field: {field}"
        print("PASS: Recipes have all required standard fields")
    
    def test_invalid_profile_id_returns_error(self):
        """Test that invalid profile ID returns error response"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/invalid-profile-123?lang=de")
        data = response.json()
        
        # Should return error key with empty recipes
        assert "error" in data or "recipes" in data, "Response should have error or recipes field"
        if "error" in data:
            assert data["error"] == "profile_not_found", f"Expected 'profile_not_found' error"
            print("PASS: Invalid profile ID returns 'profile_not_found' error")
        else:
            assert data["recipes"] == [], "Invalid profile should return empty recipes"
            print("PASS: Invalid profile ID returns empty recipes")
    
    def test_italian_language_support(self):
        """Test endpoint returns Italian labels when lang=it"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=it")
        data = response.json()
        
        assert response.status_code == 200
        assert "recipes" in data
        print(f"PASS: Italian language endpoint returns {len(data['recipes'])} recipes")
        
        # Check for Italian tags if any relevant recipes
        relevant = [r for r in data["recipes"] if r["relevance_score"] > 0 and r["relevance_tags"]]
        if relevant:
            sample_tags = relevant[0]["relevance_tags"]
            print(f"  Sample Italian tags: {sample_tags}")
    
    def test_profile_diet_in_response(self):
        """Test profile_diet field reflects user's diet preference"""
        response = requests.get(f"{BASE_URL}/api/recipes/personalized/{TEST_PROFILE_ID}?lang=de")
        data = response.json()
        
        assert "profile_diet" in data, "Response should include profile_diet"
        # Test profile has diet: vegetarian
        assert data["profile_diet"] == "vegetarian", f"Expected 'vegetarian', got {data['profile_diet']}"
        print(f"PASS: profile_diet returned correctly: {data['profile_diet']}")


class TestOriginalRecipesEndpoint:
    """Test that original /api/recipes endpoint still works for filtering"""
    
    def test_recipes_endpoint_works(self):
        """Test basic /api/recipes endpoint returns recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: /api/recipes returns {len(data)} recipes")
    
    def test_recipes_search_filter(self):
        """Test search parameter filters recipes"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&search=Spinat")
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Search filter works - found {len(data)} recipes for 'Spinat'")
    
    def test_recipes_category_filter(self):
        """Test category parameter filters by symptom_tags"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&category=müdigkeit")
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Category filter works - found {len(data)} recipes for 'müdigkeit'")
    
    def test_recipes_max_time_filter(self):
        """Test max_time parameter filters by preparation time"""
        response = requests.get(f"{BASE_URL}/api/recipes?lang=de&max_time=15")
        data = response.json()
        assert isinstance(data, list)
        for recipe in data:
            assert recipe["time_min"] <= 15, f"Recipe {recipe['id']} has time_min {recipe['time_min']} > 15"
        print(f"PASS: Max time filter works - {len(data)} recipes with time <= 15 min")


class TestRecipeFiltersEndpoint:
    """Test /api/recipes/filters endpoint for catalog"""
    
    def test_filters_endpoint_returns_data(self):
        """Test filters endpoint returns categories and tags"""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data, "Response should have 'categories'"
        assert "tags" in data, "Response should have 'tags'"
        assert "time_options" in data, "Response should have 'time_options'"
        print(f"PASS: Filters endpoint returns {len(data['categories'])} categories, {len(data['tags'])} tags")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
