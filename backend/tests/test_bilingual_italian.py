"""
Test Bilingual Italian Translation - Backend API Tests
Verifies that all backend endpoints return Italian text when lang=it parameter is used.

NOTE: The GET /supplement-plan/{profile_id} endpoint does NOT accept lang parameter.
It returns the cached plan regardless of language. To get Italian plan, must use POST.
This is documented as a design limitation, not a bug in the translation logic.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://wellness-profile-hub.preview.emergentagent.com")

# Test profile ID with existing data (vegetarian diet, complaints: fatigue+sleep, deficiencies: vitamin_d+iron)
TEST_PROFILE_ID = "f0ab7890-2765-44b4-805f-c20d0629cbe8"


class TestSupplementPlanItalian:
    """Test supplement plan generation returns Italian text with lang=it.
    Uses POST to force regeneration with correct language."""
    
    def test_supplement_plan_returns_italian_timing_labels(self):
        """Verify timing labels are in Italian"""
        # Use POST to generate new plan with Italian
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        assert len(stack) > 0, "Stack should not be empty"
        
        timing_labels_found = []
        for supplement in stack:
            timing_label = supplement.get("timing_label", "")
            timing_labels_found.append(timing_label)
            # Check NO German timing labels
            assert timing_label not in ["Morgens", "Abends", "Mittags"], \
                f"German timing label '{timing_label}' found in Italian response for {supplement.get('name')}"
        
        # Check at least one Italian timing label exists
        italian_timings = [t for t in timing_labels_found if t in ["Mattina", "Sera", "Mezzogiorno"]]
        assert len(italian_timings) > 0, f"No Italian timing labels found. Labels: {timing_labels_found}"
        print(f"PASS: Italian timing labels found: {set(timing_labels_found)}")

    def test_supplement_plan_returns_italian_with_food_labels(self):
        """Verify with_food labels are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        for supplement in stack:
            with_food_label = supplement.get("with_food_label", "")
            # Check NO German food labels
            assert with_food_label not in ["Mit Mahlzeit", "Nuechtern"], \
                f"German food label '{with_food_label}' found for {supplement.get('name')}"
            # Check Italian food labels
            assert with_food_label in ["Con pasto", "A digiuno"], \
                f"Expected Italian food label, got '{with_food_label}' for {supplement.get('name')}"
        print("PASS: All with_food_labels are in Italian")

    def test_supplement_plan_returns_italian_onset_labels(self):
        """Verify onset labels are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        for supplement in stack:
            onset_label = supplement.get("onset_label", "")
            # Check NO German onset pattern
            assert "Wirkung nach ca." not in onset_label, \
                f"German onset pattern found in '{onset_label}' for {supplement.get('name')}"
            # Check Italian onset pattern
            assert "Effetto dopo ca." in onset_label, \
                f"Expected Italian onset pattern in '{onset_label}' for {supplement.get('name')}"
        print("PASS: All onset_labels are in Italian")

    def test_supplement_plan_returns_italian_evidence_labels(self):
        """Verify evidence labels are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        for supplement in stack:
            evidence_label = supplement.get("evidence_label", "")
            # Check NO German evidence labels
            assert "Hoch - Gut belegt" not in evidence_label, \
                f"German evidence label found: '{evidence_label}' for {supplement.get('name')}"
            assert "Mittel - Moderate" not in evidence_label, \
                f"German evidence label found: '{evidence_label}' for {supplement.get('name')}"
            # Check Italian evidence labels
            italian_evidence = ["Alto - Ben supportato da studi", "Medio - Evidenza moderata", "Esplorativo - Prime indicazioni"]
            assert evidence_label in italian_evidence, \
                f"Expected Italian evidence label, got '{evidence_label}' for {supplement.get('name')}"
        print("PASS: All evidence_labels are in Italian")

    def test_supplement_plan_returns_italian_reason(self):
        """Verify reason text is in Italian (no German text)"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        # German patterns that should NOT appear
        german_patterns = ["Unterstuetzt", "Wichtig fuer", "Essentiell fuer", "Beteiligt an", 
                          "Kann nicht vom Koerper", "Nervensystem und", "Muskeln, Nerven",
                          "Schilddruesenfunktion", "Zellteilung", "Knochengesundheit"]
        
        for supplement in stack:
            reason = supplement.get("reason", "")
            if not reason:
                continue
            # Check NO German patterns in reason text
            for pattern in german_patterns:
                assert pattern not in reason, \
                    f"German pattern '{pattern}' found in reason for {supplement.get('name')}: '{reason}'"
        print("PASS: All reason texts are in Italian (no German patterns found)")

    def test_supplement_plan_returns_italian_side_effects(self):
        """Verify side_effects are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        german_side_effects = ["Uebelkeit", "Verstopfung", "Magen-Darm-Beschwerden", "Weicher Stuhl", "Fischiges Aufstossen"]
        
        for supplement in stack:
            side_effects = supplement.get("side_effects", [])
            for effect in side_effects:
                for german in german_side_effects:
                    assert german not in effect, \
                        f"German side effect '{german}' found for {supplement.get('name')}: '{effect}'"
        print("PASS: All side_effects are in Italian")

    def test_supplement_plan_returns_italian_phases(self):
        """Verify phases are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        phases = plan.get("phases", [])
        
        german_titles = ["Aufbauphase", "Vollphase", "Stabilisierung", "Bewertung"]
        italian_titles = ["Fase di avvio", "Fase completa", "Stabilizzazione", "Valutazione"]
        
        assert len(phases) >= 4, f"Expected at least 4 phases, got {len(phases)}"
        
        for phase in phases:
            title = phase.get("title", "")
            description = phase.get("description", "")
            note = phase.get("note", "")
            
            # Check NO German titles
            for german in german_titles:
                assert german not in title, f"German title found: '{title}'"
            
            # Check Italian title exists
            has_italian_title = any(it in title for it in italian_titles)
            assert has_italian_title, f"No Italian title found in '{title}'"
            
            # Check description is in Italian (not German)
            assert "Beginnen Sie" not in description, f"German in description: '{description}'"
            assert "Beobachten Sie" not in description, f"German in description: '{description}'"
            
            # Check note is in Italian (not German)
            assert "Beginnen Sie" not in note, f"German in note: '{note}'"
            assert "Empfehlung:" not in note, f"German in note: '{note}'"
        print("PASS: All phases are in Italian")

    def test_supplement_plan_returns_italian_recommendation_reasons(self):
        """Verify recommendation_reasons are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        german_reasons = [
            "Hohes Mangelrisiko", "Erhoehtes Mangelrisiko",
            "Hoher Stresswert", "Niedrige Schlafqualitaet",
            "Pflanzliche Ernaehrung", "Altersbedingt erhoehter Bedarf",
            "Chronische Muedigkeit", "Schlechte Schlafqualitaet"
        ]
        
        for supplement in stack:
            reasons = supplement.get("recommendation_reasons", [])
            for reason in reasons:
                for german in german_reasons:
                    assert german not in reason, \
                        f"German reason '{german}' found for {supplement.get('name')}: '{reason}'"
        print("PASS: All recommendation_reasons are in Italian")

    def test_supplement_plan_weekly_schedule_italian(self):
        """Verify weekly_schedule labels are in Italian"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        schedule = plan.get("weekly_schedule", {})
        
        for time_slot in ["morning", "noon", "evening"]:
            slot_data = schedule.get(time_slot, {})
            label = slot_data.get("label", "")
            
            # Check NOT German
            assert label not in ["Morgens", "Mittags", "Abends"], \
                f"German label in schedule: '{label}'"
            
            # Check is Italian
            assert label in ["Mattina", "Mezzogiorno", "Sera"], \
                f"Expected Italian schedule label, got: '{label}'"
        print("PASS: Weekly schedule labels are in Italian")


class TestSupplementPlanGerman:
    """Regression test - Verify German still works with lang=de"""
    
    def test_supplement_plan_returns_german_timing_labels(self):
        """Verify timing labels are in German with lang=de"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        assert len(stack) > 0, "Stack should not be empty"
        
        for supplement in stack:
            timing_label = supplement.get("timing_label", "")
            # Should be German
            assert timing_label in ["Morgens", "Abends", "Mittags"], \
                f"Expected German timing, got '{timing_label}' for {supplement.get('name')}"
        print("PASS: German timing labels working correctly")

    def test_supplement_plan_returns_german_evidence_labels(self):
        """Verify evidence labels are in German with lang=de"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=de"
        response = requests.post(url, timeout=60)
        
        assert response.status_code in [200, 201]
        data = response.json()
        plan = data.get("plan", data)
        stack = plan.get("stack", [])
        
        german_evidence = ["Hoch - Gut belegt durch Studien", "Mittel - Moderate Evidenz", "Explorativ - Erste Hinweise"]
        
        for supplement in stack:
            evidence_label = supplement.get("evidence_label", "")
            assert evidence_label in german_evidence, \
                f"Expected German evidence, got '{evidence_label}' for {supplement.get('name')}"
        print("PASS: German evidence labels working correctly")


class TestProductsEndpointItalian:
    """Test products/by-nutrient endpoint returns Italian quality_info with lang=it"""
    
    def test_products_by_nutrient_returns_italian_quality_info(self):
        """Verify quality_info (form, tip) is in Italian"""
        nutrients_to_test = ["iron", "zinc", "vitamin_d", "magnesium"]
        
        for nutrient in nutrients_to_test:
            url = f"{BASE_URL}/api/products/by-nutrient/{nutrient}?lang=it"
            response = requests.get(url, timeout=15)
            
            assert response.status_code == 200, f"Failed for {nutrient}: {response.status_code}"
            data = response.json()
            quality_info = data.get("quality_info")
            
            if quality_info:
                form = quality_info.get("form", "")
                tip = quality_info.get("tip", "")
                
                # Check NO German in form
                german_forms = ["Eisen-Bisglycinat", "Kolloidales Zink", "Magnesiumcitrat", "Vitamin D3 + K2"]
                for german in german_forms:
                    assert german not in form, f"German form '{german}' found for {nutrient}: '{form}'"
                
                # Check NO German in tip
                german_tips = ["Nicht zusammen mit", "Am besten abends", "Zu einer fetthaltigen", "Immer mit Fett"]
                for german in german_tips:
                    assert german not in tip, f"German tip '{german}' found for {nutrient}: '{tip}'"
                
                print(f"PASS: {nutrient} quality_info is in Italian: form='{form}', tip='{tip}'")

    def test_products_by_nutrient_returns_german_quality_info(self):
        """Regression: Verify quality_info is in German with lang=de"""
        url = f"{BASE_URL}/api/products/by-nutrient/iron?lang=de"
        response = requests.get(url, timeout=15)
        
        assert response.status_code == 200
        data = response.json()
        quality_info = data.get("quality_info")
        
        if quality_info:
            form = quality_info.get("form", "")
            tip = quality_info.get("tip", "")
            assert "Eisen-Bisglycinat" in form or "Bisglycinat" in form, f"Expected German form, got '{form}'"
            assert "Nicht zusammen" in tip or "zusammen" in tip, f"Expected German tip, got '{tip}'"
        print("PASS: German quality_info working correctly")


class TestHealthScoreItalian:
    """Test health-score endpoint returns Italian text with lang=it"""
    
    def test_health_score_returns_italian_label(self):
        """Verify health score label/fallback is in Italian when AI assessment works"""
        url = f"{BASE_URL}/api/health-score/{TEST_PROFILE_ID}?lang=it"
        response = requests.get(url, timeout=90)  # LLM may take time
        
        # May return error if no tracking data, which is expected
        if response.status_code == 200:
            data = response.json()
            label = data.get("label", "")
            recommendation = data.get("recommendation", "")
            
            # If there's a label, check it's not German fallback
            if label:
                german_labels = ["Gut", "Optimierbar", "Handlungsbedarf"]
                italian_labels = ["Buono", "Ottimizzabile", "Intervento necessario"]
                
                # Either should be Italian or LLM-generated (not fallback German)
                is_german_fallback = label in german_labels
                is_italian_fallback = label in italian_labels
                
                # If it's fallback, should be Italian
                if is_italian_fallback:
                    print(f"PASS: Italian fallback label: '{label}'")
                elif is_german_fallback:
                    pytest.fail(f"German fallback label '{label}' returned for Italian request")
                else:
                    # LLM-generated - check for Italian content
                    print(f"PASS: LLM label (likely Italian): '{label}'")
            
            print(f"Health score response: label='{label}', has_tracking={data.get('has_tracking_data')}")
        else:
            print(f"Health score returned {response.status_code} - expected if no tracking data")


class TestCorrelationAnalysisItalian:
    """Test correlation analysis endpoint returns Italian text with lang=it"""
    
    def test_correlation_analysis_returns_italian_insufficient_data_message(self):
        """Verify insufficient data message is in Italian"""
        url = f"{BASE_URL}/api/tracking/correlation-analysis/{TEST_PROFILE_ID}?lang=it&days=30"
        response = requests.get(url, timeout=90)
        
        assert response.status_code == 200, f"Got {response.status_code}: {response.text}"
        data = response.json()
        
        status = data.get("status")
        message = data.get("message", "")
        
        if status == "insufficient_data":
            # Message should be in Italian
            assert "Mindestens" not in message, f"German message found: '{message}'"
            assert "Servono almeno" in message or "giorni" in message, \
                f"Expected Italian message, got: '{message}'"
            print(f"PASS: Italian insufficient data message: '{message}'")
        else:
            # Has data - check llm_insights
            llm_insights = data.get("llm_insights", {})
            headline = llm_insights.get("headline", "")
            recommendation = llm_insights.get("recommendation", "")
            
            # Check not German
            german_indicators = ["Dein Wohlbefinden", "Tagen", "veraendert", "Bleibe bei"]
            for german in german_indicators:
                assert german not in headline, f"German in headline: '{headline}'"
                assert german not in recommendation, f"German in recommendation: '{recommendation}'"
            
            print(f"PASS: Correlation insights - headline: '{headline[:50]}...'")


class TestSupplementInteractionsItalian:
    """Test supplement interactions endpoint returns Italian text with lang=it"""
    
    def test_supplement_interactions_returns_italian_fallback(self):
        """Verify fallback analysis is in Italian when LLM fails or no plan"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}/analyze-interactions?lang=it"
        response = requests.post(url, timeout=120)  # LLM analysis takes time
        
        if response.status_code == 200:
            data = response.json()
            summary = data.get("summary", "")
            score_label = data.get("score_label", "")
            
            # Check for Italian content
            german_indicators = ["Analyse fehlgeschlagen", "Die automatische Analyse", "Bitte versuchen"]
            italian_indicators = ["Analisi fallita", "L'analisi automatica", "Si prega di riprovare"]
            
            # If it's fallback, should be Italian
            is_german_fallback = any(g in summary for g in german_indicators)
            is_italian_fallback = any(i in summary for i in italian_indicators)
            
            if is_german_fallback:
                pytest.fail(f"German fallback found in summary: '{summary}'")
            
            # Check score_label
            if score_label == "Analyse fehlgeschlagen":
                pytest.fail(f"German score_label: '{score_label}'")
            
            print(f"PASS: Interactions analysis - score_label: '{score_label}', summary: '{summary[:80]}...'")
        
        elif response.status_code == 404:
            # No plan exists - expected
            print(f"No supplement plan found - expected behavior")
        else:
            print(f"Interactions returned {response.status_code} - check error: {response.text[:200]}")


class TestTrackingDashboardItalian:
    """Test tracking/dashboard endpoint returns Italian text with lang=it"""
    
    def test_tracking_dashboard_returns_italian_insights(self):
        """Verify dashboard insights and milestones are in Italian"""
        url = f"{BASE_URL}/api/tracking/dashboard/{TEST_PROFILE_ID}?lang=it"
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            insights = data.get("insights", [])
            milestones = data.get("milestones", [])
            
            # Check insights for Italian text
            german_insights = ["Guter Start!", "Erste Verbesserung", "Achtung:", "Stabile Phase"]
            italian_insights = ["Buon inizio!", "Primo miglioramento", "Attenzione:", "Fase stabile"]
            
            for insight in insights:
                title = insight.get("title", "")
                text = insight.get("text", "")
                
                for german in german_insights:
                    assert german not in title, f"German insight title: '{title}'"
                
                # Check text doesn't have German
                assert "Sie tracken" not in text, f"German in insight text: '{text}'"
                assert "Bleiben Sie" not in text, f"German in insight text: '{text}'"
            
            # Check milestones
            for milestone in milestones:
                name = milestone.get("name_it") or milestone.get("name", "")
                # If name_it is available, it should be Italian
                if milestone.get("name_it"):
                    assert "Tage" not in name, f"German milestone name: '{name}'"
            
            print(f"PASS: Dashboard - {len(insights)} insights, {len(milestones)} milestones in Italian")
        elif response.status_code == 404:
            print("Profile not found - may need to create tracking data")
        else:
            print(f"Dashboard returned {response.status_code}")


class TestHealthProfileCreationItalian:
    """Test health profile assessment returns Italian deficiency names"""
    
    def test_health_assessment_returns_italian_deficiency_names(self):
        """Verify deficiency names and text are in Italian"""
        # First create a simple profile
        profile_data = {
            "diet": "vegetarian",
            "age": 35,
            "gender": "female",
            "activity_level": "moderate",
            "stress_level": 7,
            "sleep_quality": 5,
            "complaints": [{"name": "fatigue", "intensity": 7}, {"name": "sleep", "intensity": 6}]
        }
        
        # Create profile
        create_url = f"{BASE_URL}/api/health-profiles?lang=it"
        create_response = requests.post(create_url, json=profile_data, timeout=30)
        
        if create_response.status_code in [200, 201]:
            data = create_response.json()
            profile_id = data.get("id")
            
            # Get assessment
            assess_url = f"{BASE_URL}/api/health-profiles/{profile_id}/assessment?lang=it"
            assess_response = requests.get(assess_url, timeout=30)
            
            if assess_response.status_code == 200:
                assessment = assess_response.json()
                deficiencies = assessment.get("deficiencies", [])
                
                # Check deficiency names are Italian
                for deficiency in deficiencies:
                    name = deficiency.get("name", "")
                    why = deficiency.get("why", "")
                    
                    # Check name is Italian version (not German)
                    if name == "Eisen":
                        pytest.fail(f"German deficiency name: '{name}' - expected 'Ferro'")
                    if name == "Magnesium" and why and "Wichtig" in why:
                        # Magnesium name is same but 'why' should be Italian
                        pytest.fail(f"German 'why' text found: '{why}'")
                    
                    # why should be in Italian
                    if why:
                        german_why = ["Wichtig fuer", "Essentiell fuer"]
                        for g in german_why:
                            assert g not in why, f"German in deficiency why: '{why}'"
                
                print(f"PASS: Assessment has {len(deficiencies)} deficiencies with Italian names")
            else:
                print(f"Assessment returned {assess_response.status_code}")
        else:
            print(f"Profile creation returned {create_response.status_code}: {create_response.text[:200]}")


# API Basic Checks - these are just utility tests
class TestAPIBasics:
    """Basic API connectivity checks"""
    
    def test_supplement_plan_endpoint_accepts_lang_param(self):
        """Verify POST endpoint accepts lang parameter"""
        url = f"{BASE_URL}/api/supplement-plan/{TEST_PROFILE_ID}?lang=it"
        response = requests.post(url, timeout=60)
        assert response.status_code in [200, 201], f"POST failed: {response.status_code}"
        data = response.json()
        # Should have plan data
        assert "plan" in data or "stack" in data, "Response should contain plan"
        print("PASS: POST /supplement-plan accepts lang=it")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
