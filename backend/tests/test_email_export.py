"""
Test Email Export API - POST /api/export/email
Tests the email export endpoint that sends health reports via SMTP with PDF attachment.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://vita-guide-redesign.preview.emergentagent.com')

# Test profile with supplement plan (provided in test requirements)
TEST_PROFILE_ID = "2416f8aa-09aa-47f1-b600-2c9ada87124d"
# Use a test email address (this should be a valid email for real testing)
TEST_EMAIL = "test@emergentagent.com"


class TestEmailExportEndpoint:
    """Tests for POST /api/export/email endpoint"""

    def test_email_export_success(self):
        """Test successful email export with valid profile_id and email"""
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "profile_id": TEST_PROFILE_ID,
                "email": TEST_EMAIL,
                "lang": "de"
            },
            headers={"Content-Type": "application/json"},
            timeout=60  # Email sending can take time
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions - validate response structure
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] == "sent", f"Expected status 'sent', got '{data.get('status')}'"
        assert "message" in data, "Response should contain 'message' field"
        assert TEST_EMAIL in data["message"], f"Message should contain email address: {data['message']}"
        
        print(f"Email export success: {data}")

    def test_email_export_italian(self):
        """Test email export with Italian language"""
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "profile_id": TEST_PROFILE_ID,
                "email": TEST_EMAIL,
                "lang": "it"
            },
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert data["status"] == "sent"
        # Italian message should contain "inviato" or email address
        assert TEST_EMAIL in data["message"]
        
        print(f"Italian email export success: {data}")

    def test_email_export_nonexistent_profile(self):
        """Test email export returns 404 for non-existent profile_id"""
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "profile_id": "nonexistent-profile-id-12345",
                "email": TEST_EMAIL,
                "lang": "de"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Status assertion - should return 404 for non-existent profile
        assert response.status_code == 404, f"Expected 404 for non-existent profile, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "detail" in data, "404 response should contain 'detail' field"
        # German message should say "Profil nicht gefunden" or Italian equivalent
        print(f"Non-existent profile 404 response: {data}")

    def test_email_export_invalid_request_body_missing_fields(self):
        """Test email export returns error for missing required fields"""
        # Test missing profile_id
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "email": TEST_EMAIL
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing profile_id, got {response.status_code}: {response.text}"
        print(f"Missing profile_id validation error: {response.status_code}")

    def test_email_export_invalid_request_body_missing_email(self):
        """Test email export returns error when email is missing"""
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "profile_id": TEST_PROFILE_ID
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing email, got {response.status_code}: {response.text}"
        print(f"Missing email validation error: {response.status_code}")

    def test_email_export_empty_request_body(self):
        """Test email export returns error for empty request body"""
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for empty body, got {response.status_code}: {response.text}"
        print(f"Empty body validation error: {response.status_code}")

    def test_email_export_default_language(self):
        """Test email export uses default language (de) when lang not specified"""
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "profile_id": TEST_PROFILE_ID,
                "email": TEST_EMAIL
                # lang not specified - should default to 'de'
            },
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions - German message indicates default language
        data = response.json()
        assert data["status"] == "sent"
        # German message format: "Bericht an {email} gesendet"
        assert "gesendet" in data["message"].lower() or TEST_EMAIL in data["message"]
        
        print(f"Default language (de) email export success: {data}")


class TestEmailExportValidation:
    """Additional validation tests for email export"""
    
    def test_email_export_verifies_profile_exists(self):
        """Verify endpoint checks profile existence before attempting to send email"""
        # Use a clearly fake profile ID
        response = requests.post(
            f"{BASE_URL}/api/export/email",
            json={
                "profile_id": "00000000-0000-0000-0000-000000000000",
                "email": TEST_EMAIL,
                "lang": "de"
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Should return 404 - profile not found
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        # Should contain German or Italian error message
        print(f"Profile verification response: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
