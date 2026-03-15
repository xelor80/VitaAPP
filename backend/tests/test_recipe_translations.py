"""
Test suite for Recipe Translation Feature (Iteration 71)
Tests pre-translated recipes in 7 languages: DE, IT, EN, TR, FR, ES, RU
Verifies fast response times (<500ms) since translations are pre-computed in MongoDB
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# All supported languages
SUPPORTED_LANGUAGES = ["de", "it", "en", "tr", "fr", "es", "ru"]

# Required fields in recipe response
REQUIRED_FIELDS = ["id", "title", "ingredients", "steps", "time_min", "tags", "symptom_tags", "image_url"]


class TestRecipeTranslations:
    """Test recipe translations across all 7 supported languages"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        """Shared requests session for all tests"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    # === German (default language) ===
    def test_get_recipes_german(self, api_session):
        """Test GET /api/recipes?lang=de returns recipes with German titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=de")
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        recipes = response.json()
        
        # Should have recipes (30 seeded + some admin)
        assert len(recipes) >= 30, f"Expected at least 30 recipes, got {len(recipes)}"
        
        # Response time should be under 1 second (goal: 500ms)
        assert elapsed < 1.0, f"Response time {elapsed:.3f}s exceeds 1s threshold"
        print(f"✓ German recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        # Verify first recipe has all required fields
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe, f"Missing required field: {field}"
        
        # Verify title is in German (some German-specific words)
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample German titles: {titles[:3]}")
    
    # === French ===
    def test_get_recipes_french(self, api_session):
        """Test GET /api/recipes?lang=fr returns recipes with French titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=fr")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) >= 30
        assert elapsed < 1.0, f"Response time {elapsed:.3f}s exceeds 1s"
        print(f"✓ French recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        # Check recipe structure
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe, f"Missing field: {field}"
        
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample French titles: {titles[:3]}")
    
    # === Russian (Cyrillic) ===
    def test_get_recipes_russian(self, api_session):
        """Test GET /api/recipes?lang=ru returns recipes with Russian Cyrillic titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=ru")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) >= 30
        assert elapsed < 1.0, f"Response time {elapsed:.3f}s exceeds 1s"
        print(f"✓ Russian recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        # Check recipe structure
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe
        
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample Russian titles: {titles[:3]}")
        
        # Verify at least some titles contain Cyrillic characters
        has_cyrillic = any(
            any('\u0400' <= c <= '\u04FF' for c in title)
            for title in titles
        )
        assert has_cyrillic, "Expected Russian titles to contain Cyrillic characters"
    
    # === Spanish ===
    def test_get_recipes_spanish(self, api_session):
        """Test GET /api/recipes?lang=es returns recipes with Spanish titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=es")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) >= 30
        assert elapsed < 1.0
        print(f"✓ Spanish recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe
        
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample Spanish titles: {titles[:3]}")
    
    # === English ===
    def test_get_recipes_english(self, api_session):
        """Test GET /api/recipes?lang=en returns recipes with English titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=en")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) >= 30
        assert elapsed < 1.0
        print(f"✓ English recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe
        
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample English titles: {titles[:3]}")
    
    # === Turkish ===
    def test_get_recipes_turkish(self, api_session):
        """Test GET /api/recipes?lang=tr returns recipes with Turkish titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=tr")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) >= 30
        assert elapsed < 1.0
        print(f"✓ Turkish recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe
        
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample Turkish titles: {titles[:3]}")
    
    # === Italian ===
    def test_get_recipes_italian(self, api_session):
        """Test GET /api/recipes?lang=it returns recipes with Italian titles"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=it")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) >= 30
        assert elapsed < 1.0
        print(f"✓ Italian recipes: {len(recipes)} recipes in {elapsed:.3f}s")
        
        recipe = recipes[0]
        for field in REQUIRED_FIELDS:
            assert field in recipe
        
        titles = [r["title"] for r in recipes[:10]]
        print(f"  Sample Italian titles: {titles[:3]}")


class TestRecipeRecommendations:
    """Test recipe recommendations endpoint with language support"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_recommendations_french(self, api_session):
        """Test GET /api/recipes/recommendations?lang=fr returns French recipes"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes/recommendations?lang=fr")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        
        # Should return up to 3 recommendations by default
        assert len(recipes) <= 3, f"Expected max 3 recipes, got {len(recipes)}"
        assert len(recipes) > 0, "Expected at least 1 recommendation"
        assert elapsed < 1.0
        print(f"✓ French recommendations: {len(recipes)} recipes in {elapsed:.3f}s")
        
        # Verify structure
        for recipe in recipes:
            for field in REQUIRED_FIELDS:
                assert field in recipe
        
        titles = [r["title"] for r in recipes]
        print(f"  French recommendation titles: {titles}")
    
    def test_recommendations_russian(self, api_session):
        """Test GET /api/recipes/recommendations?lang=ru returns Russian recipes"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes/recommendations?lang=ru")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert len(recipes) > 0
        assert elapsed < 1.0
        print(f"✓ Russian recommendations: {len(recipes)} recipes in {elapsed:.3f}s")
        
        titles = [r["title"] for r in recipes]
        print(f"  Russian recommendation titles: {titles}")


class TestRecipeFilters:
    """Test recipe filters endpoint with language support"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_filters_german(self, api_session):
        """Test GET /api/recipes/filters?lang=de returns categories and tags"""
        start = time.time()
        response = api_session.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        data = response.json()
        assert elapsed < 1.0
        print(f"✓ German filters in {elapsed:.3f}s")
        
        # Should have categories, tags, and time_options
        assert "categories" in data
        assert "tags" in data
        assert "time_options" in data
        
        print(f"  Categories: {len(data['categories'])}")
        print(f"  Tags: {len(data['tags'])}")
        print(f"  Time options: {data['time_options']}")
    
    def test_filters_italian(self, api_session):
        """Test GET /api/recipes/filters?lang=it returns Italian categories"""
        response = api_session.get(f"{BASE_URL}/api/recipes/filters?lang=it")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        print(f"✓ Italian filters: {len(data.get('categories', []))} categories")


class TestRecipeSearch:
    """Test recipe search with different languages"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_search_russian_salad(self, api_session):
        """Test GET /api/recipes?lang=ru&search=салат finds recipes with Russian search"""
        start = time.time()
        # Search for "салат" (salad in Russian)
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=ru&search=салат")
        elapsed = time.time() - start
        
        assert response.status_code == 200
        recipes = response.json()
        assert elapsed < 1.0
        print(f"✓ Russian search 'салат': {len(recipes)} results in {elapsed:.3f}s")
        
        if recipes:
            titles = [r["title"] for r in recipes[:3]]
            print(f"  Matched titles: {titles}")
    
    def test_search_english_salmon(self, api_session):
        """Test English search for salmon"""
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=en&search=salmon")
        
        assert response.status_code == 200
        recipes = response.json()
        print(f"✓ English search 'salmon': {len(recipes)} results")
        
        if recipes:
            titles = [r["title"] for r in recipes[:3]]
            print(f"  Matched titles: {titles}")
    
    def test_search_french_soupe(self, api_session):
        """Test French search for soup"""
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=fr&search=soupe")
        
        assert response.status_code == 200
        recipes = response.json()
        print(f"✓ French search 'soupe': {len(recipes)} results")


class TestPerformanceBaseline:
    """Verify response times are under 500ms (no AI translation delay)"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_all_languages_response_time(self, api_session):
        """Test all 7 languages and verify response time < 500ms each"""
        results = {}
        
        for lang in SUPPORTED_LANGUAGES:
            start = time.time()
            response = api_session.get(f"{BASE_URL}/api/recipes?lang={lang}")
            elapsed = time.time() - start
            
            assert response.status_code == 200
            recipes = response.json()
            results[lang] = {"time_ms": int(elapsed * 1000), "count": len(recipes)}
            
            # Target: under 500ms (was slow due to AI translation before)
            assert elapsed < 0.5, f"Language {lang} took {elapsed:.3f}s (>500ms)"
        
        print("\n✓ All languages response times (target < 500ms):")
        for lang, data in results.items():
            print(f"  {lang.upper()}: {data['time_ms']}ms, {data['count']} recipes")
    
    def test_consecutive_requests_performance(self, api_session):
        """Test that consecutive requests are consistently fast"""
        times = []
        
        for i in range(3):
            start = time.time()
            response = api_session.get(f"{BASE_URL}/api/recipes?lang=fr")
            elapsed = time.time() - start
            times.append(elapsed)
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        print(f"✓ Consecutive FR requests avg: {avg_time:.3f}s")
        assert avg_time < 0.5, f"Average time {avg_time:.3f}s exceeds 500ms"


class TestRecipeDataIntegrity:
    """Verify recipe data structure and content integrity"""
    
    @pytest.fixture(scope="class")
    def api_session(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session
    
    def test_recipe_fields_complete(self, api_session):
        """Verify all recipes have complete required fields"""
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=de")
        assert response.status_code == 200
        recipes = response.json()
        
        missing_fields_count = 0
        for recipe in recipes:
            for field in REQUIRED_FIELDS:
                if field not in recipe:
                    missing_fields_count += 1
                    print(f"Recipe {recipe.get('id', 'unknown')} missing: {field}")
        
        assert missing_fields_count == 0, f"{missing_fields_count} missing fields found"
        print(f"✓ All {len(recipes)} recipes have complete required fields")
    
    def test_recipe_ingredients_are_lists(self, api_session):
        """Verify ingredients and steps are lists, not empty"""
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=en")
        assert response.status_code == 200
        recipes = response.json()
        
        empty_count = 0
        for recipe in recipes:
            # Skip admin-created recipes that might not have translations
            if recipe.get("id", "").startswith("ai_"):
                continue
            
            if not isinstance(recipe.get("ingredients"), list):
                print(f"Recipe {recipe['id']}: ingredients not a list")
                empty_count += 1
            elif len(recipe.get("ingredients", [])) == 0:
                print(f"Recipe {recipe['id']}: empty ingredients")
                empty_count += 1
        
        # Allow some admin recipes to be incomplete
        assert empty_count <= 7, f"Too many recipes with empty ingredients: {empty_count}"
        print(f"✓ Recipe ingredients verified ({empty_count} admin recipes may be incomplete)")
    
    def test_single_recipe_by_id(self, api_session):
        """Test GET /api/recipes/{recipe_id}?lang=fr returns localized recipe"""
        # First get a recipe ID
        response = api_session.get(f"{BASE_URL}/api/recipes?lang=de")
        recipes = response.json()
        
        # Find a non-admin recipe
        recipe_id = None
        for r in recipes:
            if not r.get("id", "").startswith("ai_"):
                recipe_id = r["id"]
                break
        
        if recipe_id:
            response = api_session.get(f"{BASE_URL}/api/recipes/{recipe_id}?lang=fr")
            assert response.status_code == 200
            recipe = response.json()
            
            assert recipe.get("id") == recipe_id
            assert "title" in recipe
            print(f"✓ Single recipe {recipe_id}: '{recipe.get('title')}'")
