import pytest
import requests
import os

@pytest.fixture(scope="session")
def base_url():
    """Get base URL from environment variable"""
    url = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
    if not url:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL environment variable not set")
    return url.rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def test_user_credentials():
    """Test user credentials"""
    return {
        "email": "test@example.com",
        "password": "test123456",
        "name": "Test User"
    }

@pytest.fixture(scope="session")
def auth_token(base_url, api_client, test_user_credentials):
    """Get auth token for test user (login or register)"""
    # Try to login first
    login_response = api_client.post(
        f"{base_url}/api/auth/login",
        json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"]
        }
    )
    
    if login_response.status_code == 200:
        return login_response.json()["token"]
    
    # If login fails, user might not exist, skip
    pytest.skip("Test user does not exist, skipping auth-required tests")

@pytest.fixture(scope="session")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}
