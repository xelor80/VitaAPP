"""
Settings API Tests - Testing new admin settings features
Tests cover: Translations, Symptom Chips, Disclaimer, AI Config
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://health-tracker-691.preview.emergentagent.com')
ADMIN_PASSWORD = "Wk220480xel!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    res = requests.post(f"{BASE_URL}/api/admin/auth", json={"password": ADMIN_PASSWORD})
    assert res.status_code == 200, f"Admin auth failed: {res.text}"
    return res.json().get("token")


@pytest.fixture
def api_client():
    """Basic API client"""
    return requests.Session()


@pytest.fixture
def authenticated_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    })
    return api_client


# ============== TRANSLATIONS TESTS ==============
class TestTranslationsAPI:
    """Translation endpoint tests"""

    def test_get_translations_returns_default(self, api_client):
        """GET /api/settings/translations returns default translations"""
        res = api_client.get(f"{BASE_URL}/api/settings/translations")
        assert res.status_code == 200
        data = res.json()
        
        assert "translations" in data
        translations = data["translations"]
        assert len(translations) >= 10, f"Expected at least 10 translations, got {len(translations)}"
        
        # Check structure of translation items
        for t in translations:
            assert "key" in t
            assert "de" in t
            assert "it" in t

    def test_get_translations_contains_required_keys(self, api_client):
        """Translations should include required app text keys"""
        res = api_client.get(f"{BASE_URL}/api/settings/translations")
        data = res.json()
        keys = [t["key"] for t in data["translations"]]
        
        required_keys = ["home_subtitle", "symptom_placeholder", "analyze_btn", 
                         "analyzing", "diary_btn", "disclaimer_footer"]
        for key in required_keys:
            assert key in keys, f"Missing required translation key: {key}"

    def test_update_translation(self, authenticated_client):
        """PUT /api/settings/translations/{key} updates translation"""
        test_key = "home_subtitle"
        
        # Update translation
        new_de = "Test German Text"
        new_it = "Test Italian Text"
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/translations/{test_key}",
            json={"key": test_key, "de": new_de, "it": new_it}
        )
        assert res.status_code == 200
        assert res.json().get("success") == True

        # Verify update
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/translations")
        translations = get_res.json()["translations"]
        updated = next((t for t in translations if t["key"] == test_key), None)
        assert updated is not None
        assert updated["de"] == new_de
        assert updated["it"] == new_it

    def test_reset_translations_to_default(self, authenticated_client):
        """POST /api/settings/translations/reset restores defaults"""
        res = authenticated_client.post(f"{BASE_URL}/api/settings/translations/reset")
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") == True
        assert data.get("count") >= 10

        # Verify defaults are restored
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/translations")
        translations = get_res.json()["translations"]
        home_subtitle = next((t for t in translations if t["key"] == "home_subtitle"), None)
        assert home_subtitle["de"] == "Natürliche Gesundheitsinformationen"


# ============== SYMPTOM CHIPS TESTS ==============
class TestSymptomChipsAPI:
    """Symptom chips endpoint tests"""

    def test_get_symptom_chips_returns_10_defaults(self, api_client):
        """GET /api/settings/symptom-chips returns 10 default chips"""
        res = api_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        assert res.status_code == 200
        data = res.json()
        
        assert "chips" in data
        chips = data["chips"]
        assert len(chips) == 10, f"Expected 10 chips, got {len(chips)}"
        
        # Check structure
        for chip in chips:
            assert "id" in chip
            assert "de" in chip
            assert "it" in chip
            assert "icon" in chip
            assert "order" in chip

    def test_get_symptom_chips_ordered(self, api_client):
        """Chips should be returned in order"""
        res = api_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        chips = res.json()["chips"]
        
        orders = [c["order"] for c in chips]
        assert orders == sorted(orders), "Chips should be sorted by order"

    def test_create_symptom_chip(self, authenticated_client):
        """POST /api/settings/symptom-chips creates new chip"""
        test_chip = {
            "id": f"TEST_chip_{uuid.uuid4().hex[:8]}",
            "de": "Test Deutsch",
            "it": "Test Italiano",
            "icon": "test-icon",
            "order": 99
        }
        
        res = authenticated_client.post(
            f"{BASE_URL}/api/settings/symptom-chips",
            json=test_chip
        )
        assert res.status_code == 200
        assert res.json().get("success") == True

        # Verify creation
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        chips = get_res.json()["chips"]
        created = next((c for c in chips if c["id"] == test_chip["id"]), None)
        assert created is not None
        assert created["de"] == test_chip["de"]
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/settings/symptom-chips/{test_chip['id']}")

    def test_update_symptom_chip(self, authenticated_client):
        """PUT /api/settings/symptom-chips/{id} updates chip"""
        # Create a test chip first
        test_id = f"TEST_update_{uuid.uuid4().hex[:8]}"
        authenticated_client.post(
            f"{BASE_URL}/api/settings/symptom-chips",
            json={"id": test_id, "de": "Original DE", "it": "Original IT", "icon": "circle", "order": 99}
        )
        
        # Update it
        update_data = {"id": test_id, "de": "Updated DE", "it": "Updated IT", "icon": "star", "order": 100}
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/symptom-chips/{test_id}",
            json=update_data
        )
        assert res.status_code == 200
        assert res.json().get("success") == True

        # Verify update
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        chips = get_res.json()["chips"]
        updated = next((c for c in chips if c["id"] == test_id), None)
        assert updated["de"] == "Updated DE"
        assert updated["icon"] == "star"
        
        # Cleanup
        authenticated_client.delete(f"{BASE_URL}/api/settings/symptom-chips/{test_id}")

    def test_delete_symptom_chip(self, authenticated_client):
        """DELETE /api/settings/symptom-chips/{id} removes chip"""
        # Create test chip
        test_id = f"TEST_delete_{uuid.uuid4().hex[:8]}"
        authenticated_client.post(
            f"{BASE_URL}/api/settings/symptom-chips",
            json={"id": test_id, "de": "To Delete", "it": "Da Eliminare", "icon": "trash", "order": 99}
        )
        
        # Delete it
        res = authenticated_client.delete(f"{BASE_URL}/api/settings/symptom-chips/{test_id}")
        assert res.status_code == 200
        assert res.json().get("success") == True

        # Verify deletion
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/symptom-chips")
        chips = get_res.json()["chips"]
        deleted = next((c for c in chips if c["id"] == test_id), None)
        assert deleted is None

    def test_reset_symptom_chips_to_default(self, authenticated_client):
        """POST /api/settings/symptom-chips/reset restores defaults"""
        res = authenticated_client.post(f"{BASE_URL}/api/settings/symptom-chips/reset")
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") == True
        assert data.get("count") == 10


# ============== DISCLAIMER TESTS ==============
class TestDisclaimerAPI:
    """Disclaimer endpoint tests"""

    def test_get_disclaimer_both_languages(self, api_client):
        """GET /api/settings/disclaimer returns DE and IT"""
        res = api_client.get(f"{BASE_URL}/api/settings/disclaimer")
        assert res.status_code == 200
        data = res.json()
        
        assert "de" in data
        assert "it" in data
        
        # Check DE structure
        de = data["de"]
        assert de["lang"] == "de"
        assert "title" in de
        assert "items" in de
        assert "accept_button" in de
        assert len(de["items"]) == 3
        
        # Check IT structure
        it = data["it"]
        assert it["lang"] == "it"
        assert len(it["items"]) == 3

    def test_update_disclaimer_de(self, authenticated_client):
        """PUT /api/settings/disclaimer/de updates German disclaimer"""
        update_data = {
            "lang": "de",
            "title": "Test Titel",
            "items": [
                {"title": "Test Item 1", "text": "Test Text 1", "icon": "test-icon-1"},
                {"title": "Test Item 2", "text": "Test Text 2", "icon": "test-icon-2"},
                {"title": "Test Item 3", "text": "Test Text 3", "icon": "test-icon-3"}
            ],
            "accept_button": "Test Akzeptieren"
        }
        
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/disclaimer/de",
            json=update_data
        )
        assert res.status_code == 200
        assert res.json().get("success") == True

        # Verify update
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/disclaimer")
        de = get_res.json()["de"]
        assert de["title"] == "Test Titel"
        assert de["accept_button"] == "Test Akzeptieren"

    def test_update_disclaimer_it(self, authenticated_client):
        """PUT /api/settings/disclaimer/it updates Italian disclaimer"""
        update_data = {
            "lang": "it",
            "title": "Avviso Test",
            "items": [
                {"title": "Test Item IT 1", "text": "Test Text IT 1", "icon": "icon-1"},
                {"title": "Test Item IT 2", "text": "Test Text IT 2", "icon": "icon-2"},
                {"title": "Test Item IT 3", "text": "Test Text IT 3", "icon": "icon-3"}
            ],
            "accept_button": "Accetto Test"
        }
        
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/disclaimer/it",
            json=update_data
        )
        assert res.status_code == 200
        assert res.json().get("success") == True

    def test_update_disclaimer_invalid_lang(self, authenticated_client):
        """PUT /api/settings/disclaimer/{invalid} returns 400"""
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/disclaimer/fr",
            json={"lang": "fr", "title": "French", "items": [], "accept_button": "OK"}
        )
        assert res.status_code == 400

    def test_reset_disclaimer_to_default(self, authenticated_client):
        """POST /api/settings/disclaimer/reset restores defaults"""
        res = authenticated_client.post(f"{BASE_URL}/api/settings/disclaimer/reset")
        assert res.status_code == 200
        assert res.json().get("success") == True

        # Verify defaults restored
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/disclaimer")
        de = get_res.json()["de"]
        assert de["title"] == "Wichtiger Hinweis"
        assert de["accept_button"] == "Verstanden & Zustimmen"


# ============== AI CONFIG TESTS ==============
class TestAIConfigAPI:
    """AI configuration endpoint tests"""

    def test_get_ai_config_default(self, api_client):
        """GET /api/settings/ai-config returns OpenAI gpt-4o as default"""
        res = api_client.get(f"{BASE_URL}/api/settings/ai-config")
        assert res.status_code == 200
        data = res.json()
        
        assert "current" in data
        assert "available" in data
        
        current = data["current"]
        assert current["provider"] == "openai"
        assert current["model"] == "gpt-4o"
        assert current.get("enabled", True) == True

    def test_get_ai_config_available_providers(self, api_client):
        """AI config should list all available providers and models"""
        res = api_client.get(f"{BASE_URL}/api/settings/ai-config")
        available = res.json()["available"]
        
        assert "openai" in available
        assert "anthropic" in available
        assert "google" in available
        
        assert "gpt-4o" in available["openai"]
        assert "claude-sonnet-4" in available["anthropic"]
        assert "gemini-2.0-flash" in available["google"]

    def test_update_ai_config_to_anthropic(self, authenticated_client):
        """PUT /api/settings/ai-config can switch to Anthropic"""
        update_data = {
            "provider": "anthropic",
            "model": "claude-sonnet-4",
            "enabled": True
        }
        
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/ai-config",
            json=update_data
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") == True
        assert data.get("provider") == "anthropic"
        assert data.get("model") == "claude-sonnet-4"

        # Verify change
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/ai-config")
        current = get_res.json()["current"]
        assert current["provider"] == "anthropic"

    def test_update_ai_config_to_google(self, authenticated_client):
        """PUT /api/settings/ai-config can switch to Google"""
        update_data = {
            "provider": "google",
            "model": "gemini-2.0-flash",
            "enabled": True
        }
        
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/ai-config",
            json=update_data
        )
        assert res.status_code == 200
        assert res.json().get("provider") == "google"

    def test_restore_ai_config_to_openai(self, authenticated_client):
        """PUT /api/settings/ai-config can switch back to OpenAI"""
        update_data = {
            "provider": "openai",
            "model": "gpt-4o",
            "enabled": True
        }
        
        res = authenticated_client.put(
            f"{BASE_URL}/api/settings/ai-config",
            json=update_data
        )
        assert res.status_code == 200
        
        # Verify restored
        get_res = authenticated_client.get(f"{BASE_URL}/api/settings/ai-config")
        current = get_res.json()["current"]
        assert current["provider"] == "openai"
        assert current["model"] == "gpt-4o"


# ============== ADMIN WEBAPP AUTH TESTS ==============
class TestAdminAuth:
    """Admin authentication tests"""

    def test_admin_login_correct_password(self, api_client):
        """POST /api/admin/auth with correct password returns token"""
        res = api_client.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": ADMIN_PASSWORD}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") == True
        assert "token" in data
        assert len(data["token"]) > 10

    def test_admin_login_wrong_password(self, api_client):
        """POST /api/admin/auth with wrong password returns 401"""
        res = api_client.post(
            f"{BASE_URL}/api/admin/auth",
            json={"password": "wrongpassword123"}
        )
        assert res.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
