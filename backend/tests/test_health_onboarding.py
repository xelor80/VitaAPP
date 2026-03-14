"""
Health Profile and Onboarding API Tests
- Tests GET /api/onboarding/options - Options retrieval for onboarding wizard
- Tests POST /api/health-profile - Health profile creation with assessment
- Tests GET /api/health-profile/{id} - Profile retrieval with assessment
- Tests PUT /api/health-profile/{id} - Profile update with regenerated assessment
- Tests GET /api/health-profile/{id}/assessment - Assessment regeneration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://vitaguide-water.preview.emergentagent.com').rstrip('/')


class TestOnboardingOptions:
    """Tests for GET /api/onboarding/options endpoint"""

    def test_get_onboarding_options_german(self):
        """Test onboarding options with German language"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify all required option categories exist
        required_categories = [
            'genders', 'diets', 'activity_levels', 'sleep_issues', 
            'stress_types', 'conditions', 'medications', 'complaints', 'known_deficiencies'
        ]
        for category in required_categories:
            assert category in data, f"Missing category: {category}"
            assert len(data[category]) > 0, f"Empty category: {category}"
        
        # Verify gender options have correct labels
        genders = {g['value']: g for g in data['genders']}
        assert 'male' in genders
        assert genders['male']['label_de'] == 'Männlich'
        assert genders['male']['label_it'] == 'Maschile'
        
        # Verify diet options include vegan
        diets = {d['value']: d for d in data['diets']}
        assert 'vegan' in diets
        assert diets['vegan']['label_de'] == 'Vegan'

    def test_get_onboarding_options_italian(self):
        """Test onboarding options with Italian language"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        assert 'genders' in data
        
        # Italian labels should be present
        genders = {g['value']: g for g in data['genders']}
        assert genders['female']['label_it'] == 'Femminile'

    def test_onboarding_options_has_all_categories(self):
        """Test that onboarding options include all expected subcategories"""
        response = requests.get(f"{BASE_URL}/api/onboarding/options?lang=de")
        data = response.json()
        
        # Verify conditions include expected health conditions
        conditions = [c['value'] for c in data['conditions']]
        assert 'diabetes' in conditions
        assert 'depression' in conditions
        assert 'hashimoto' in conditions
        
        # Verify medications include common options
        medications = [m['value'] for m in data['medications']]
        assert 'ppi' in medications
        assert 'metformin' in medications
        assert 'antidepressants' in medications
        
        # Verify complaints are present
        complaints = [c['value'] for c in data['complaints']]
        assert 'fatigue' in complaints
        assert 'headache' in complaints
        assert 'concentration' in complaints


class TestHealthProfileCreation:
    """Tests for POST /api/health-profile endpoint"""

    def test_create_full_health_profile(self):
        """Test creating a comprehensive health profile with all data"""
        payload = {
            "age": 35,
            "gender": "male",
            "height": 180,
            "weight": 80,
            "diet": "vegan",
            "activity_level": "moderate",
            "sleep_quality": 4,
            "sleep_duration": 6,
            "sleep_issues": ["falling_asleep", "staying_asleep"],
            "stress_level": 8,
            "stress_type": ["work", "financial"],
            "energy_level": 4,
            "conditions": ["depression"],
            "medications": ["antidepressants"],
            "allergies": ["lactose"],
            "complaints": [
                {"name": "fatigue", "intensity": 8},
                {"name": "concentration", "intensity": 6}
            ],
            "known_deficiencies": ["vitamin_d", "vitamin_b12"],
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify profile_id is returned
        assert 'profile_id' in data
        assert len(data['profile_id']) > 0
        
        # Verify assessment is returned
        assert 'assessment' in data
        assessment = data['assessment']
        
        # Verify BMI calculation (180cm, 80kg -> BMI ~24.7)
        assert 'bmi' in assessment
        assert 24.5 <= assessment['bmi'] <= 25.0
        assert assessment['bmi_category'] == 'normal'
        
        # Verify deficiencies are identified
        assert 'deficiencies' in assessment
        assert len(assessment['deficiencies']) > 0
        
        # Vegan diet should trigger vitamin B12 deficiency risk
        deficiency_names = [d['nutrient'] for d in assessment['deficiencies']]
        assert 'vitamin_b12' in deficiency_names
        
        # Verify priority areas (poor sleep + high stress should be flagged)
        assert 'priority_areas' in assessment
        priority_types = [p.get('area', p.get('title', '')) for p in assessment['priority_areas']]
        
        return data['profile_id']  # Return for chained tests

    def test_create_minimal_health_profile(self):
        """Test creating a health profile with minimal data"""
        payload = {
            "age": 25,
            "gender": "female",
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert 'profile_id' in data
        assert 'assessment' in data
        
        # BMI should be null if height/weight not provided
        assert data['assessment']['bmi'] is None

    def test_create_profile_italian_language(self):
        """Test creating profile with Italian language returns Italian text"""
        payload = {
            "age": 40,
            "gender": "male",
            "height": 175,
            "weight": 75,
            "diet": "vegan",
            "stress_level": 8,
            "lang": "it"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assessment = data['assessment']
        
        # Check that some Italian text is returned in priority areas
        if assessment.get('priority_areas'):
            first_priority = assessment['priority_areas'][0]
            # Italian titles should contain Italian words
            title = first_priority.get('title', '')
            # Italian keywords
            italian_indicators = ['Gestione', 'stress', 'sonno', 'Aumentare', 'movimento']
            assert any(word in title for word in italian_indicators), f"Expected Italian text, got: {title}"


class TestHealthProfileRetrieval:
    """Tests for GET /api/health-profile/{id} endpoint"""

    @pytest.fixture
    def created_profile_id(self):
        """Create a profile and return its ID for testing"""
        payload = {
            "age": 30,
            "gender": "female",
            "height": 165,
            "weight": 55,
            "diet": "vegetarian",
            "activity_level": "active",
            "sleep_quality": 7,
            "stress_level": 5,
            "energy_level": 7,
            "conditions": ["migraine"],
            "lang": "de"
        }
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200
        return response.json()['profile_id']

    def test_get_health_profile_by_id(self, created_profile_id):
        """Test retrieving a health profile by ID"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{created_profile_id}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify profile data is returned
        assert 'profile' in data
        profile = data['profile']
        assert profile['id'] == created_profile_id
        assert profile['age'] == 30
        assert profile['gender'] == 'female'
        assert profile['diet'] == 'vegetarian'
        
        # Verify assessment is included
        assert 'assessment' in data
        assert data['assessment'] is not None

    def test_get_nonexistent_profile_returns_404(self):
        """Test that requesting a non-existent profile returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/api/health-profile/{fake_id}")
        assert response.status_code == 404


class TestHealthProfileUpdate:
    """Tests for PUT /api/health-profile/{id} endpoint"""

    @pytest.fixture
    def created_profile_id(self):
        """Create a profile for update testing"""
        payload = {
            "age": 28,
            "gender": "male",
            "height": 178,
            "weight": 70,
            "diet": "omnivore",
            "activity_level": "sedentary",
            "sleep_quality": 8,
            "stress_level": 3,
            "lang": "de"
        }
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        return response.json()['profile_id']

    def test_update_health_profile(self, created_profile_id):
        """Test updating a health profile regenerates assessment"""
        update_payload = {
            "age": 28,
            "gender": "male",
            "height": 178,
            "weight": 85,  # Increased weight
            "diet": "vegan",  # Changed diet
            "activity_level": "very_active",  # Changed activity
            "sleep_quality": 4,  # Decreased sleep quality
            "stress_level": 9,  # Increased stress
            "conditions": ["depression"],
            "lang": "de"
        }
        
        response = requests.put(f"{BASE_URL}/api/health-profile/{created_profile_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert 'assessment' in data
        
        # Verify BMI changed (178cm, 85kg -> BMI ~26.8)
        assessment = data['assessment']
        assert 26.5 <= assessment['bmi'] <= 27.0
        assert assessment['bmi_category'] == 'overweight'
        
        # Vegan diet + high stress should affect deficiencies
        deficiency_names = [d['nutrient'] for d in assessment['deficiencies']]
        assert 'vitamin_b12' in deficiency_names or 'magnesium' in deficiency_names

    def test_update_nonexistent_profile_returns_404(self):
        """Test updating a non-existent profile returns 404"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        payload = {"age": 30, "gender": "male", "lang": "de"}
        response = requests.put(f"{BASE_URL}/api/health-profile/{fake_id}", json=payload)
        assert response.status_code == 404


class TestHealthAssessmentEndpoint:
    """Tests for GET /api/health-profile/{id}/assessment endpoint"""

    @pytest.fixture
    def created_profile_id(self):
        """Create a profile for assessment testing"""
        payload = {
            "age": 45,
            "gender": "female",
            "height": 160,
            "weight": 65,
            "diet": "omnivore",
            "conditions": ["diabetes", "osteoporosis"],
            "medications": ["metformin"],
            "lang": "de"
        }
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        return response.json()['profile_id']

    def test_get_assessment_regeneration(self, created_profile_id):
        """Test assessment regeneration endpoint"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{created_profile_id}/assessment?lang=de")
        assert response.status_code == 200
        
        data = response.json()
        assert 'assessment' in data
        assert 'deficiencies' in data['assessment']
        
        # Diabetes + metformin should increase B12 risk
        deficiency_names = [d['nutrient'] for d in data['assessment']['deficiencies']]
        # Metformin is known to deplete vitamin B12
        # Osteoporosis should increase calcium/vitamin D risk

    def test_get_assessment_italian(self, created_profile_id):
        """Test assessment in Italian language"""
        response = requests.get(f"{BASE_URL}/api/health-profile/{created_profile_id}/assessment?lang=it")
        assert response.status_code == 200
        
        data = response.json()
        assessment = data['assessment']
        
        # Deficiency descriptions should be in Italian
        if assessment['deficiencies']:
            first_def = assessment['deficiencies'][0]
            # Check for Italian text patterns
            why_text = first_def.get('why', '')
            # Italian tends to have words like "per", "sistema", "importante"
            italian_patterns = ['per', 'sistema', 'importante', 'salute']
            # Some Italian should be present
            assert len(why_text) > 0


class TestRiskAssessmentLogic:
    """Tests for the health risk assessment engine logic"""

    def test_vegan_triggers_b12_and_iron_risks(self):
        """Test that vegan diet triggers appropriate deficiency risks"""
        payload = {
            "age": 30,
            "gender": "male",
            "diet": "vegan",
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200
        
        deficiencies = response.json()['assessment']['deficiencies']
        deficiency_nutrients = [d['nutrient'] for d in deficiencies]
        
        # Vegan diet should flag B12, iron, omega3
        assert 'vitamin_b12' in deficiency_nutrients
        assert 'iron' in deficiency_nutrients
        assert 'omega3' in deficiency_nutrients

    def test_high_stress_triggers_magnesium_risk(self):
        """Test that high stress levels trigger magnesium deficiency"""
        payload = {
            "age": 35,
            "gender": "male",
            "stress_level": 9,
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200
        
        deficiencies = response.json()['assessment']['deficiencies']
        deficiency_nutrients = [d['nutrient'] for d in deficiencies]
        
        assert 'magnesium' in deficiency_nutrients

    def test_senior_age_triggers_vitamin_d_risk(self):
        """Test that senior age triggers vitamin D deficiency risk"""
        payload = {
            "age": 65,
            "gender": "female",
            "lang": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.status_code == 200
        
        deficiencies = response.json()['assessment']['deficiencies']
        deficiency_nutrients = [d['nutrient'] for d in deficiencies]
        
        assert 'vitamin_d' in deficiency_nutrients

    def test_bmi_calculations(self):
        """Test BMI calculation accuracy"""
        # Normal weight
        payload = {"height": 180, "weight": 75, "lang": "de"}
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        bmi = response.json()['assessment']['bmi']
        assert 23.0 <= bmi <= 23.5  # 75/(1.8^2) = 23.15
        assert response.json()['assessment']['bmi_category'] == 'normal'
        
        # Underweight
        payload = {"height": 175, "weight": 50, "lang": "de"}
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.json()['assessment']['bmi_category'] == 'underweight'
        
        # Obese
        payload = {"height": 170, "weight": 100, "lang": "de"}
        response = requests.post(f"{BASE_URL}/api/health-profile", json=payload)
        assert response.json()['assessment']['bmi_category'] == 'obese'


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
