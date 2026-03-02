"""
Test Admin Health Statistics Dashboard (P2) and Recipe Catalog APIs (Regression Test for P1)
Tests the GET /api/admin/health-stats endpoint for anonymized aggregated health data
and regression tests for recipe endpoints.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://health-compact.preview.emergentagent.com').rstrip('/')


class TestAdminHealthStats:
    """Test admin health statistics endpoint with aggregated health data."""

    def test_health_stats_returns_200(self):
        """Test that /api/admin/health-stats returns 200 status."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Health stats endpoint returned 200 OK")

    def test_health_stats_has_total_profiles(self):
        """Test that health stats contains total_profiles count."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "total_profiles" in data, "Missing total_profiles field"
        assert isinstance(data["total_profiles"], int), "total_profiles should be int"
        assert data["total_profiles"] > 0, "Expected positive total_profiles (39 in DB)"
        print(f"✓ Total profiles: {data['total_profiles']}")

    def test_health_stats_gender_distribution(self):
        """Test gender distribution array structure and content."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "gender" in data, "Missing gender distribution"
        assert isinstance(data["gender"], list), "gender should be a list"
        assert len(data["gender"]) > 0, "gender should not be empty"
        for item in data["gender"]:
            assert "label" in item, "gender item missing label"
            assert "count" in item, "gender item missing count"
        print(f"✓ Gender distribution: {len(data['gender'])} categories")

    def test_health_stats_age_distribution(self):
        """Test age distribution (bucket-based) array structure."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "age" in data, "Missing age distribution"
        assert isinstance(data["age"], list), "age should be a list"
        for item in data["age"]:
            assert "label" in item, "age item missing label"
            assert "count" in item, "age item missing count"
        print(f"✓ Age distribution: {len(data['age'])} buckets")

    def test_health_stats_diet_distribution(self):
        """Test diet preferences distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "diet" in data, "Missing diet distribution"
        assert isinstance(data["diet"], list), "diet should be a list"
        print(f"✓ Diet distribution: {len(data['diet'])} types")

    def test_health_stats_activity_distribution(self):
        """Test activity level distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "activity" in data, "Missing activity distribution"
        assert isinstance(data["activity"], list), "activity should be a list"
        print(f"✓ Activity distribution: {len(data['activity'])} levels")

    def test_health_stats_complaints_with_intensity(self):
        """Test complaints array with count and avg_intensity."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "complaints" in data, "Missing complaints distribution"
        assert isinstance(data["complaints"], list), "complaints should be a list"
        if len(data["complaints"]) > 0:
            first = data["complaints"][0]
            assert "label" in first, "complaint missing label"
            assert "count" in first, "complaint missing count"
            # avg_intensity may be None for some complaints
            print(f"✓ Complaints: {len(data['complaints'])} types, top: {first['label']} ({first['count']}x)")

    def test_health_stats_conditions_distribution(self):
        """Test conditions/pre-existing conditions distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "conditions" in data, "Missing conditions distribution"
        assert isinstance(data["conditions"], list), "conditions should be a list"
        print(f"✓ Conditions: {len(data['conditions'])} types")

    def test_health_stats_deficiencies_distribution(self):
        """Test known deficiencies distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "deficiencies" in data, "Missing deficiencies distribution"
        assert isinstance(data["deficiencies"], list), "deficiencies should be a list"
        print(f"✓ Deficiencies: {len(data['deficiencies'])} types")

    def test_health_stats_sleep_averages(self):
        """Test sleep quality and duration averages."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "sleep" in data, "Missing sleep data"
        sleep = data["sleep"]
        if sleep:
            assert "avg_quality" in sleep or sleep == {}, "sleep should have avg_quality"
            assert "avg_duration" in sleep or sleep == {}, "sleep should have avg_duration"
            if "avg_quality" in sleep:
                print(f"✓ Sleep: avg_quality={sleep['avg_quality']:.2f}/10, avg_duration={sleep.get('avg_duration', 0):.2f}h")

    def test_health_stats_stress_averages(self):
        """Test stress and energy level averages."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "stress" in data, "Missing stress data"
        stress = data["stress"]
        if stress:
            assert "avg_stress" in stress or stress == {}, "stress should have avg_stress"
            assert "avg_energy" in stress or stress == {}, "stress should have avg_energy"
            if "avg_stress" in stress:
                print(f"✓ Stress: avg_stress={stress['avg_stress']:.2f}/10, avg_energy={stress.get('avg_energy', 0):.2f}/10")

    def test_health_stats_bmi_distribution(self):
        """Test BMI distribution buckets."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "bmi" in data, "Missing bmi distribution"
        assert isinstance(data["bmi"], list), "bmi should be a list"
        print(f"✓ BMI distribution: {len(data['bmi'])} categories")

    def test_health_stats_medications_distribution(self):
        """Test medications distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "medications" in data, "Missing medications distribution"
        assert isinstance(data["medications"], list), "medications should be a list"
        print(f"✓ Medications: {len(data['medications'])} types")

    def test_health_stats_sleep_issues(self):
        """Test sleep issues distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "sleep_issues" in data, "Missing sleep_issues distribution"
        assert isinstance(data["sleep_issues"], list), "sleep_issues should be a list"
        print(f"✓ Sleep issues: {len(data['sleep_issues'])} types")

    def test_health_stats_stress_types(self):
        """Test stress types distribution."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert "stress_types" in data, "Missing stress_types distribution"
        assert isinstance(data["stress_types"], list), "stress_types should be a list"
        print(f"✓ Stress types: {len(data['stress_types'])} types")

    def test_health_stats_complete_data_39_profiles(self):
        """Verify health stats returns data for 39 profiles in database."""
        response = requests.get(f"{BASE_URL}/api/admin/health-stats")
        data = response.json()
        assert data["total_profiles"] == 39, f"Expected 39 profiles, got {data['total_profiles']}"
        # Verify all expected fields are present when we have profiles
        expected_fields = ["total_profiles", "gender", "age", "diet", "activity", 
                          "complaints", "conditions", "deficiencies", "sleep", "stress",
                          "sleep_issues", "stress_types", "medications", "bmi"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Complete data structure verified with 39 profiles")


class TestRecipeCatalogRegression:
    """Regression tests for recipe catalog (P1) endpoints."""

    def test_recipes_search_smoothie(self):
        """Test GET /api/recipes?search=smoothie returns correct results."""
        response = requests.get(f"{BASE_URL}/api/recipes?search=smoothie")
        assert response.status_code == 200
        recipes = response.json()
        assert isinstance(recipes, list), "recipes should be a list"
        assert len(recipes) > 0, "Should find smoothie recipes"
        # All results should contain 'smoothie' in title (case-insensitive)
        for r in recipes:
            assert "smoothie" in r["title"].lower(), f"Recipe '{r['title']}' doesn't contain smoothie"
        print(f"✓ Search 'smoothie' returned {len(recipes)} recipes")

    def test_recipes_filters_german(self):
        """Test GET /api/recipes/filters?lang=de returns categories and tags."""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=de")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data, "Missing categories"
        assert "tags" in data, "Missing tags"
        assert "time_options" in data, "Missing time_options"
        assert isinstance(data["categories"], list), "categories should be list"
        assert len(data["categories"]) > 0, "Should have categories"
        assert len(data["tags"]) > 0, "Should have tags"
        # Verify German labels
        categories_labels = [c["label"] for c in data["categories"]]
        assert any("Energie" in label for label in categories_labels), "Missing German energy category"
        print(f"✓ Filters DE: {len(data['categories'])} categories, {len(data['tags'])} tags")

    def test_recipes_filters_italian(self):
        """Test GET /api/recipes/filters?lang=it returns Italian labels."""
        response = requests.get(f"{BASE_URL}/api/recipes/filters?lang=it")
        assert response.status_code == 200
        data = response.json()
        categories_labels = [c["label"] for c in data["categories"]]
        assert any("Energia" in label for label in categories_labels), "Missing Italian energy category"
        print(f"✓ Filters IT: {len(data['categories'])} categories with Italian labels")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
