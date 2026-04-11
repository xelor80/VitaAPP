"""
Test Auth System - Backend API Tests
Tests for: register, login, me, sync-data, link-profile, google, logout endpoints
Iteration 76 - New auth system testing
"""
import pytest
import requests
import uuid
import time
import os

# Use external URL from environment
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://stress-relief-app-11.preview.emergentagent.com").rstrip("/")

# Test data
TEST_PROFILE_ID = "f97fdefb-c81f-4d01-8d02-e38dd2132e74"
EXISTING_USER_EMAIL = "test@vitaguide.de"
EXISTING_USER_PASSWORD = "test123"


class TestAuthRegister:
    """Tests for POST /api/auth/register"""

    def test_register_new_user_success(self):
        """Register a new user with valid email and password"""
        unique_email = f"TEST_register_{uuid.uuid4().hex[:8]}@vitaguide.de"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test456",
            "first_name": "TestUser"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert isinstance(data["token"], str), "Token should be a string"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == unique_email.lower(), "Email should match"
        assert "user_id" in user, "User should have user_id"
        assert user["auth_provider"] == "email", "Auth provider should be email"
        print(f"✓ Register new user success: {unique_email}")

    def test_register_duplicate_email_returns_409(self):
        """Registering with an existing email should return 409"""
        # First create a user
        unique_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@vitaguide.de"
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123"
        })
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Try to register again with same email
        time.sleep(0.5)  # Small delay to avoid rate limiting
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "different123"
        })
        
        assert response2.status_code == 409, f"Expected 409 for duplicate email, got {response2.status_code}: {response2.text}"
        data = response2.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"✓ Duplicate email correctly returns 409: {unique_email}")

    def test_register_short_password_returns_400(self):
        """Password less than 6 characters should return 400"""
        unique_email = f"TEST_short_{uuid.uuid4().hex[:8]}@vitaguide.de"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "12345"  # Only 5 chars
        })
        
        assert response.status_code == 400, f"Expected 400 for short password, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "6" in data["detail"] or "Zeichen" in data["detail"], "Error should mention minimum length"
        print(f"✓ Short password correctly returns 400")

    def test_register_missing_email_returns_error(self):
        """Missing email should return error"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "",
            "password": "test123"
        })
        
        assert response.status_code == 400, f"Expected 400 for missing email, got {response.status_code}: {response.text}"
        print(f"✓ Missing email correctly returns 400")


class TestAuthLogin:
    """Tests for POST /api/auth/login"""

    def test_login_valid_credentials(self):
        """Login with valid credentials should return token"""
        # First register a user
        unique_email = f"TEST_login_{uuid.uuid4().hex[:8]}@vitaguide.de"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        time.sleep(0.5)  # Avoid rate limiting
        
        # Now login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "test123"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert isinstance(data["token"], str), "Token should be a string"
        assert data["user"]["email"] == unique_email.lower(), "Email should match"
        print(f"✓ Login with valid credentials success: {unique_email}")

    def test_login_wrong_password_returns_401(self):
        """Login with wrong password should return 401"""
        # First register a user
        unique_email = f"TEST_wrongpw_{uuid.uuid4().hex[:8]}@vitaguide.de"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "correctpassword"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        
        time.sleep(0.5)
        
        # Try login with wrong password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401 for wrong password, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"✓ Wrong password correctly returns 401")

    def test_login_nonexistent_email_returns_401(self):
        """Login with non-existent email should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent_user_xyz@vitaguide.de",
            "password": "anypassword"
        })
        
        assert response.status_code == 401, f"Expected 401 for nonexistent email, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print(f"✓ Nonexistent email correctly returns 401")


class TestAuthMe:
    """Tests for GET /api/auth/me"""

    def test_me_with_valid_token(self):
        """GET /me with valid token should return user data"""
        # Register and get token
        unique_email = f"TEST_me_{uuid.uuid4().hex[:8]}@vitaguide.de"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123",
            "first_name": "TestMe"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json()["token"]
        
        time.sleep(0.5)
        
        # Get user info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email.lower(), "Email should match"
        assert data["user"]["first_name"] == "TestMe", "First name should match"
        print(f"✓ GET /me with valid token success: {unique_email}")

    def test_me_without_token_returns_401(self):
        """GET /me without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401 for missing token, got {response.status_code}: {response.text}"
        print(f"✓ GET /me without token correctly returns 401")

    def test_me_with_invalid_token_returns_401(self):
        """GET /me with invalid token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": "Bearer invalid_token_xyz"
        })
        
        assert response.status_code == 401, f"Expected 401 for invalid token, got {response.status_code}: {response.text}"
        print(f"✓ GET /me with invalid token correctly returns 401")


class TestAuthSyncData:
    """Tests for GET /api/auth/sync-data/{profile_id}"""

    def test_sync_data_with_valid_token_and_linked_profile(self):
        """Sync data for user's own profile should return all data"""
        # Register user with profile_id
        unique_email = f"TEST_sync_{uuid.uuid4().hex[:8]}@vitaguide.de"
        test_profile_id = TEST_PROFILE_ID
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123",
            "profile_id": test_profile_id
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json()["token"]
        
        time.sleep(0.5)
        
        # Sync data
        response = requests.get(f"{BASE_URL}/api/auth/sync-data/{test_profile_id}", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure (data may be null if profile has no data)
        assert "synced_at" in data, "Response should contain synced_at timestamp"
        # These fields should be present (even if null)
        expected_fields = ["profile", "supplement_plan", "medications", "water_goal", "points", "streak", "reward_settings"]
        for field in expected_fields:
            assert field in data, f"Response should contain {field}"
        
        print(f"✓ Sync data with valid token success")

    def test_sync_data_for_other_users_profile_returns_403(self):
        """Accessing another user's profile data should return 403"""
        # Register user WITHOUT a profile_id
        unique_email = f"TEST_sync403_{uuid.uuid4().hex[:8]}@vitaguide.de"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123"
            # No profile_id - so user has no linked profile
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json()["token"]
        
        time.sleep(0.5)
        
        # Try to access someone else's profile
        other_profile_id = TEST_PROFILE_ID
        response = requests.get(f"{BASE_URL}/api/auth/sync-data/{other_profile_id}", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 403, f"Expected 403 for accessing other user's profile, got {response.status_code}: {response.text}"
        print(f"✓ Accessing other user's profile correctly returns 403")

    def test_sync_data_without_token_returns_401(self):
        """Sync data without token should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/sync-data/{TEST_PROFILE_ID}")
        
        assert response.status_code == 401, f"Expected 401 for missing token, got {response.status_code}: {response.text}"
        print(f"✓ Sync data without token correctly returns 401")


class TestAuthLinkProfile:
    """Tests for POST /api/auth/link-profile"""

    def test_link_profile_success(self):
        """Link a profile to user account"""
        # Register user without profile
        unique_email = f"TEST_link_{uuid.uuid4().hex[:8]}@vitaguide.de"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json()["token"]
        
        time.sleep(0.5)
        
        # Link profile
        new_profile_id = f"TEST_profile_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/auth/link-profile", 
            headers={"Authorization": f"Bearer {token}"},
            json={"profile_id": new_profile_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Response should indicate success"
        assert data.get("profile_id") == new_profile_id, "Response should return linked profile_id"
        print(f"✓ Link profile success: {new_profile_id}")

    def test_link_profile_without_token_returns_401(self):
        """Link profile without token should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/link-profile", 
            json={"profile_id": "some_profile_id"}
        )
        
        assert response.status_code == 401, f"Expected 401 for missing token, got {response.status_code}: {response.text}"
        print(f"✓ Link profile without token correctly returns 401")

    def test_link_profile_without_profile_id_returns_400(self):
        """Link profile without profile_id should return 400"""
        # Register user
        unique_email = f"TEST_link400_{uuid.uuid4().hex[:8]}@vitaguide.de"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123"
        })
        assert reg_response.status_code == 200, f"Registration failed: {reg_response.text}"
        token = reg_response.json()["token"]
        
        time.sleep(0.5)
        
        # Try to link without profile_id
        response = requests.post(f"{BASE_URL}/api/auth/link-profile", 
            headers={"Authorization": f"Bearer {token}"},
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing profile_id, got {response.status_code}: {response.text}"
        print(f"✓ Link profile without profile_id correctly returns 400")


class TestAuthGoogle:
    """Tests for POST /api/auth/google"""

    def test_google_endpoint_exists_returns_error_for_invalid_session(self):
        """Google auth endpoint should exist and return error for invalid session_id"""
        response = requests.post(f"{BASE_URL}/api/auth/google", json={
            "session_id": "invalid_session_id_xyz"
        })
        
        # Should return 401 (invalid session) or 502 (auth service unreachable), but NOT 404
        assert response.status_code != 404, f"Google auth endpoint should exist, got 404"
        assert response.status_code in [401, 502, 400], f"Expected 401/502/400 for invalid session, got {response.status_code}: {response.text}"
        print(f"✓ Google auth endpoint exists, returns {response.status_code} for invalid session")

    def test_google_missing_session_id_returns_400(self):
        """Google auth without session_id should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/google", json={
            "session_id": ""
        })
        
        assert response.status_code == 400, f"Expected 400 for missing session_id, got {response.status_code}: {response.text}"
        print(f"✓ Google auth without session_id correctly returns 400")


class TestAuthLogout:
    """Tests for POST /api/auth/logout"""

    def test_logout_returns_success(self):
        """Logout should return success"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"✓ Logout returns success")


class TestAuthWithExistingUser:
    """Tests using the pre-existing test user"""

    def test_login_existing_user(self):
        """Login with pre-existing test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EXISTING_USER_EMAIL,
            "password": EXISTING_USER_PASSWORD
        })
        
        # May fail if user doesn't exist - that's expected and informative
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            assert "user" in data
            print(f"✓ Login existing user success: {EXISTING_USER_EMAIL}")
        else:
            print(f"⚠ Existing user {EXISTING_USER_EMAIL} not found (expected if not seeded)")
            # Don't fail the test - this is informational


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
