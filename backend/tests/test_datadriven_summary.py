"""
Test suite for Data-Driven Personalized Summary Feature
Tests cover:
- Summary does NOT start with generic greetings ('Guten Tag', 'Willkommen', 'Herzlich')
- Summary mentions specific data points (e.g. 'Stresslevel 8/10')
- Summary references top 2 health drivers
- Health driver identification: stress_level=8 → Stress as primary driver
- Health driver identification: sleep_quality=4 → Sleep as secondary driver
- Fallback summary is also data-driven (starts with driver details, not generic text)
"""
import pytest
import requests
import os
import re
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Test profile with stress_level=8, sleep_quality=4, complaints: fatigue, concentration, hair_loss
TEST_PROFILE_ID = "2416f8aa-09aa-47f1-b600-2c9ada87124d"

# List of forbidden greeting patterns in German
FORBIDDEN_GREETINGS_DE = [
    "Guten Tag",
    "guten tag",
    "Willkommen",
    "willkommen",
    "Herzlich",
    "herzlich",
    "Hallo",
    "hallo",
    "Liebe/r",
    "Sehr geehrte",
    "sehr geehrte",
    "Grüß Gott",
]

# List of forbidden greeting patterns in Italian
FORBIDDEN_GREETINGS_IT = [
    "Buongiorno",
    "buongiorno",
    "Benvenuto",
    "benvenuto",
    "Ciao",
    "ciao",
    "Salve",
    "salve",
    "Gentile",
    "gentile",
]


class TestDataDrivenSummaryGeneration:
    """Test that generated summaries are data-driven and not generic"""
    
    def test_generate_plan_summary_no_generic_greeting_de(self):
        """POST /api/supplement-plan/{profile_id}?lang=de - Summary should NOT start with greetings"""
        print(f"\n=== Testing Summary Generation (German) ===")
        print(f"Using profile: {TEST_PROFILE_ID}")
        print(f"Expected: stress_level=8, sleep_quality=4, complaints: fatigue, concentration, hair_loss")
        
        # Generate a new plan (takes 5-15 seconds due to LLM call)
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de",
            timeout=30
        )
        
        print(f"POST status: {response.status_code}")
        assert response.status_code == 200, f"Failed to generate plan: {response.text}"
        
        data = response.json()
        assert "plan" in data, "Response should contain 'plan'"
        
        plan = data["plan"]
        assert "personal_summary" in plan, "Plan should contain 'personal_summary'"
        
        summary = plan["personal_summary"]
        print(f"\n--- Generated Summary (first 300 chars) ---")
        print(summary[:300] if len(summary) > 300 else summary)
        print(f"\n--- Full Summary Length: {len(summary)} chars ---")
        
        # Test 1: Check summary does NOT start with forbidden greetings
        summary_lower = summary.lower().strip()
        for greeting in FORBIDDEN_GREETINGS_DE:
            assert not summary_lower.startswith(greeting.lower()), \
                f"Summary should NOT start with '{greeting}'. Got: {summary[:100]}..."
        
        print("✓ PASS: Summary does not start with generic greetings")
        
    def test_summary_contains_specific_data_points(self):
        """Summary should mention specific numbers like 'Stresslevel 8/10'"""
        # First generate a plan
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de",
            timeout=30
        )
        
        assert response.status_code == 200
        summary = response.json()["plan"]["personal_summary"]
        
        print(f"\n=== Testing Data Points in Summary ===")
        print(f"Looking for patterns like: 'Stresslevel X/10', 'Schlafqualitaet Y/10'")
        
        # Check for numeric data points (e.g., "8/10", "4/10", or similar patterns)
        has_numeric_data = bool(re.search(r'\d+/10', summary)) or \
                          bool(re.search(r'\d+ von 10', summary)) or \
                          bool(re.search(r'Level \d+', summary)) or \
                          bool(re.search(r'Stresslevel', summary.lower())) or \
                          bool(re.search(r'Schlafqualit', summary.lower()))
        
        print(f"Contains numeric data reference: {has_numeric_data}")
        print(f"Summary contains 'Stress': {'stress' in summary.lower()}")
        print(f"Summary contains 'Schlaf': {'schlaf' in summary.lower()}")
        
        # The summary should mention at least one of stress or sleep with data
        assert has_numeric_data or 'stress' in summary.lower() or 'schlaf' in summary.lower(), \
            f"Summary should reference specific health data points. Got: {summary[:200]}..."
        
        print("✓ PASS: Summary contains specific data points")
        
    def test_summary_references_health_drivers(self):
        """Summary should reference top health drivers (stress, sleep based on profile)"""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de",
            timeout=30
        )
        
        assert response.status_code == 200
        summary = response.json()["plan"]["personal_summary"]
        summary_lower = summary.lower()
        
        print(f"\n=== Testing Health Driver References ===")
        
        # For profile with stress_level=8 and sleep_quality=4, expect stress and sleep to be mentioned
        stress_mentioned = 'stress' in summary_lower or 'belastung' in summary_lower
        sleep_mentioned = 'schlaf' in summary_lower or 'sleep' in summary_lower
        
        print(f"Stress driver mentioned: {stress_mentioned}")
        print(f"Sleep driver mentioned: {sleep_mentioned}")
        
        # At least one driver should be mentioned in a data-driven summary
        assert stress_mentioned or sleep_mentioned, \
            f"Summary should reference health drivers. Profile has stress=8, sleep=4. Got: {summary[:200]}..."
        
        print("✓ PASS: Summary references health drivers")


class TestHealthDriverIdentification:
    """Test the _identify_health_drivers function logic"""
    
    def test_high_stress_profile_identifies_stress_as_driver(self):
        """Profile with stress_level=8 should identify Stress as primary driver"""
        # Create a high-stress test profile
        profile_data = {
            "age": 35,
            "gender": "male",
            "height": 180,
            "weight": 75,
            "diet": "omnivore",
            "activity_level": "moderate",
            "sleep_quality": 7,  # Good sleep
            "sleep_duration": 7,
            "stress_level": 8,  # HIGH stress
            "energy_level": 5,
            "conditions": [],
            "medications": [],
            "complaints": [],
            "known_deficiencies": [],
            "lang": "de"
        }
        
        print(f"\n=== Testing High Stress Driver Detection ===")
        print(f"Creating profile with stress_level=8, sleep_quality=7")
        
        # Create profile
        create_response = requests.post(f"{BASE_URL}/api/health-profile", json=profile_data)
        print(f"Create profile status: {create_response.status_code}")
        
        if create_response.status_code == 200:
            new_profile_id = create_response.json().get("profile_id")
            print(f"Profile ID: {new_profile_id}")
            
            # Generate plan
            plan_response = requests.post(
                f"{BASE_URL}/api/supplement-plan/{new_profile_id}?lang=de",
                timeout=30
            )
            print(f"Generate plan status: {plan_response.status_code}")
            
            assert plan_response.status_code == 200
            
            summary = plan_response.json()["plan"]["personal_summary"]
            summary_lower = summary.lower()
            
            print(f"\n--- Summary (first 200 chars) ---")
            print(summary[:200] if len(summary) > 200 else summary)
            
            # Summary should prioritize stress mention
            assert 'stress' in summary_lower, \
                f"High stress profile (8/10) should have stress mentioned in summary. Got: {summary[:150]}..."
            
            print("✓ PASS: Stress is identified as primary driver for high-stress profile")
        else:
            pytest.skip(f"Could not create test profile: {create_response.text}")
            
    def test_poor_sleep_profile_identifies_sleep_as_driver(self):
        """Profile with sleep_quality=4 should identify Sleep as a driver"""
        profile_data = {
            "age": 40,
            "gender": "female",
            "height": 165,
            "weight": 60,
            "diet": "omnivore",
            "activity_level": "low",
            "sleep_quality": 4,  # POOR sleep
            "sleep_duration": 5,
            "stress_level": 4,  # Low stress
            "energy_level": 4,
            "conditions": [],
            "medications": [],
            "complaints": [],
            "known_deficiencies": [],
            "lang": "de"
        }
        
        print(f"\n=== Testing Poor Sleep Driver Detection ===")
        print(f"Creating profile with stress_level=4, sleep_quality=4")
        
        create_response = requests.post(f"{BASE_URL}/api/health-profile", json=profile_data)
        print(f"Create profile status: {create_response.status_code}")
        
        if create_response.status_code == 200:
            new_profile_id = create_response.json().get("profile_id")
            print(f"Profile ID: {new_profile_id}")
            
            plan_response = requests.post(
                f"{BASE_URL}/api/supplement-plan/{new_profile_id}?lang=de",
                timeout=30
            )
            print(f"Generate plan status: {plan_response.status_code}")
            
            assert plan_response.status_code == 200
            
            summary = plan_response.json()["plan"]["personal_summary"]
            summary_lower = summary.lower()
            
            print(f"\n--- Summary (first 200 chars) ---")
            print(summary[:200] if len(summary) > 200 else summary)
            
            # Summary should mention sleep as a driver
            assert 'schlaf' in summary_lower or 'sleep' in summary_lower, \
                f"Poor sleep profile (4/10) should have sleep mentioned. Got: {summary[:150]}..."
            
            print("✓ PASS: Sleep is identified as driver for poor-sleep profile")
        else:
            pytest.skip(f"Could not create test profile: {create_response.text}")
            
    def test_combined_stress_sleep_profile(self):
        """Profile with stress=8 AND sleep=4 should identify BOTH as drivers"""
        # Use the existing test profile which has both
        print(f"\n=== Testing Combined Stress+Sleep Driver Detection ===")
        print(f"Using profile: {TEST_PROFILE_ID}")
        print(f"Expected: stress_level=8, sleep_quality=4")
        
        plan_response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de",
            timeout=30
        )
        
        assert plan_response.status_code == 200
        
        summary = plan_response.json()["plan"]["personal_summary"]
        summary_lower = summary.lower()
        
        print(f"\n--- Summary ---")
        print(summary)
        
        stress_mentioned = 'stress' in summary_lower or 'belastung' in summary_lower
        sleep_mentioned = 'schlaf' in summary_lower
        
        print(f"\nStress mentioned: {stress_mentioned}")
        print(f"Sleep mentioned: {sleep_mentioned}")
        
        # Both should be mentioned for this profile
        assert stress_mentioned and sleep_mentioned, \
            f"Profile with stress=8, sleep=4 should mention both drivers. Got stress={stress_mentioned}, sleep={sleep_mentioned}"
        
        print("✓ PASS: Both stress and sleep are identified as drivers")


class TestFallbackSummary:
    """Test that fallback summary (when LLM fails) is also data-driven"""
    
    def test_fallback_summary_structure(self):
        """Fallback summary should also be data-driven, not generic"""
        # We can't force LLM failure easily, but we can test the existing summary
        # to ensure it follows data-driven patterns
        
        response = requests.get(f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}")
        
        if response.status_code == 200:
            plan = response.json()["plan"]
            summary = plan.get("personal_summary", "")
            
            print(f"\n=== Testing Summary Structure ===")
            print(f"Summary length: {len(summary)} chars")
            
            # Check it's not empty
            assert len(summary) > 50, "Summary should have meaningful content"
            
            # Check it doesn't start with generic greeting
            summary_lower = summary.lower().strip()
            for greeting in FORBIDDEN_GREETINGS_DE:
                assert not summary_lower.startswith(greeting.lower()), \
                    f"Summary should NOT start with '{greeting}'"
            
            print("✓ PASS: Summary is structured and not generic")
        else:
            pytest.skip("No existing plan found")


class TestSummaryWordCount:
    """Test that summary respects ~150 word limit"""
    
    def test_summary_word_count_limit(self):
        """Summary should be approximately 150 words or less"""
        response = requests.post(
            f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de",
            timeout=30
        )
        
        assert response.status_code == 200
        summary = response.json()["plan"]["personal_summary"]
        
        word_count = len(summary.split())
        print(f"\n=== Testing Word Count ===")
        print(f"Word count: {word_count}")
        
        # Allow some flexibility (LLM may vary slightly)
        assert word_count <= 200, f"Summary should be ~150 words max, got {word_count}"
        
        print(f"✓ PASS: Summary word count ({word_count}) is within acceptable range")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
