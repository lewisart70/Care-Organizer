"""Authentication endpoint tests - register, login, /me, token persistence"""
import pytest
import requests
import uuid

class TestAuth:
    """Authentication flows"""

    def test_register_new_user(self, base_url, api_client):
        """Test user registration with new email"""
        unique_email = f"TEST_user_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "password123",
            "name": "Test Registration User"
        }
        
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        print(f"Register response status: {response.status_code}")
        print(f"Register response body: {response.text}")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == unique_email
        assert data["user"]["name"] == payload["name"]
        assert "user_id" in data["user"]
        print("✓ User registration successful")

    def test_register_duplicate_email(self, base_url, api_client):
        """Test registration with existing email returns 400"""
        # First registration
        unique_email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "password123",
            "name": "Test Duplicate"
        }
        api_client.post(f"{base_url}/api/auth/register", json=payload)
        
        # Second registration with same email
        response = api_client.post(f"{base_url}/api/auth/register", json=payload)
        print(f"Duplicate register status: {response.status_code}")
        
        assert response.status_code == 400, "Duplicate email should return 400"
        print("✓ Duplicate email properly rejected")

    def test_login_success(self, base_url, api_client, test_user_credentials):
        """Test login with correct credentials"""
        response = api_client.post(
            f"{base_url}/api/auth/login",
            json={
                "email": test_user_credentials["email"],
                "password": test_user_credentials["password"]
            }
        )
        print(f"Login response status: {response.status_code}")
        print(f"Login response body: {response.text}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["email"] == test_user_credentials["email"]
        print("✓ Login successful")

    def test_login_invalid_credentials(self, base_url, api_client, test_user_credentials):
        """Test login with wrong password returns 401"""
        response = api_client.post(
            f"{base_url}/api/auth/login",
            json={
                "email": test_user_credentials["email"],
                "password": "wrongpassword"
            }
        )
        print(f"Invalid login status: {response.status_code}")
        
        assert response.status_code == 401, "Invalid credentials should return 401"
        print("✓ Invalid credentials properly rejected")

    def test_auth_me_endpoint(self, base_url, api_client, auth_headers, test_user_credentials):
        """Test /api/auth/me endpoint with valid token"""
        response = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        print(f"/me response status: {response.status_code}")
        print(f"/me response body: {response.text}")
        
        assert response.status_code == 200, f"/me failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "name" in data
        assert data["email"] == test_user_credentials["email"]
        print("✓ /me endpoint working correctly")

    def test_auth_me_without_token(self, base_url, api_client):
        """Test /api/auth/me without token returns 401"""
        response = api_client.get(f"{base_url}/api/auth/me")
        print(f"/me without token status: {response.status_code}")
        
        assert response.status_code == 401, "Unauthenticated request should return 401"
        print("✓ Unauthenticated access properly rejected")
