"""
TTS (Text-to-Speech) API Tests
Tests for POST /api/tts/generate endpoint using OpenAI TTS
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://personalize-meals.preview.emergentagent.com')

class TestTTSEndpoint:
    """TTS endpoint tests"""
    
    def test_tts_generate_success_german(self):
        """Test TTS generation with valid text in German"""
        payload = {
            "text": "Dies ist ein Testtext für die Sprachausgabe.",
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30  # TTS may take time
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "audio_base64" in data, "Response should contain audio_base64"
        assert "format" in data, "Response should contain format"
        
        # Validate response values
        assert data["format"] == "mp3", f"Expected format 'mp3', got {data['format']}"
        assert isinstance(data["audio_base64"], str), "audio_base64 should be a string"
        assert len(data["audio_base64"]) > 100, "audio_base64 should have substantial content"
        
        print(f"✅ TTS generated successfully - audio length: {len(data['audio_base64'])} chars")
    
    def test_tts_generate_success_italian(self):
        """Test TTS generation with valid text in Italian"""
        payload = {
            "text": "Questo è un testo di prova per la sintesi vocale.",
            "lang": "it"
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "audio_base64" in data
        assert "format" in data
        assert data["format"] == "mp3"
        assert len(data["audio_base64"]) > 100
        
        print(f"✅ TTS Italian generated successfully - audio length: {len(data['audio_base64'])} chars")
    
    def test_tts_generate_empty_text_returns_400(self):
        """Test TTS with empty text returns 400 error"""
        payload = {
            "text": "",
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "required" in data["detail"].lower() or "text" in data["detail"].lower()
        
        print(f"✅ Empty text correctly returns 400: {data['detail']}")
    
    def test_tts_generate_whitespace_only_returns_400(self):
        """Test TTS with whitespace-only text returns 400 error"""
        payload = {
            "text": "   \n\t   ",
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        print("✅ Whitespace-only text correctly returns 400")
    
    def test_tts_generate_missing_text_returns_422(self):
        """Test TTS with missing text field returns validation error"""
        payload = {
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        
        print("✅ Missing text field correctly returns 422 validation error")
    
    def test_tts_generate_default_lang(self):
        """Test TTS uses default German language when lang not specified"""
        payload = {
            "text": "Test ohne Sprache angegeben."
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "audio_base64" in data
        assert data["format"] == "mp3"
        
        print(f"✅ TTS with default lang generated successfully")
    
    def test_tts_generate_long_text_truncation(self):
        """Test TTS with long text (should truncate to 4096 chars)"""
        long_text = "Test " * 1000  # ~5000 chars
        payload = {
            "text": long_text,
            "lang": "de"
        }
        response = requests.post(
            f"{BASE_URL}/api/tts/generate",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60  # Longer timeout for longer text
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "audio_base64" in data
        assert data["format"] == "mp3"
        
        print(f"✅ TTS with long text handled correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
