#!/usr/bin/env python3

import requests
import json
import sys
import uuid
from datetime import datetime

# Use the Railway preview URL as specified in the review request
BACKEND_URL = "https://railway-recovery.preview.emergentagent.com/api"

class AuthBackendTester:
    def __init__(self):
        self.token = None
        # Demo credentials from .env file
        self.demo_email = "demo@familycareorganizer.com"
        self.demo_password = "Demo2026!"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_health_endpoint(self):
        """Test GET /api/health - should return healthy status with DB connection"""
        self.log("Testing health endpoint...")
        
        try:
            response = requests.get(f"{BACKEND_URL}/health")
            self.log(f"Health response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "healthy" and "database" in result:
                    db_status = result.get("database")
                    if db_status == "connected":
                        self.log("✅ PASS: Health endpoint working, DB connected")
                        return True
                    else:
                        self.log(f"❌ FAIL: Database not connected: {db_status}")
                        return False
                else:
                    self.log("❌ FAIL: Invalid health response format")
                    return False
            else:
                self.log(f"❌ FAIL: Health endpoint failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Health endpoint error: {str(e)}")
            return False
    
    def test_login_with_demo_credentials(self):
        """Test POST /api/auth/login with demo credentials - should return token and user"""
        self.log(f"Testing login with demo credentials: {self.demo_email}")
        
        data = {
            "email": self.demo_email,
            "password": self.demo_password
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json=data)
            self.log(f"Demo login response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get("token")
                user = result.get("user", {})
                
                if self.token and user and user.get("email") == self.demo_email:
                    self.log(f"✅ PASS: Demo login successful, user: {user.get('name', 'Demo User')}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid demo login response format")
                    return False
            else:
                self.log(f"❌ FAIL: Demo login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Demo login error: {str(e)}")
            return False
    
    def test_login_with_invalid_credentials(self):
        """Test POST /api/auth/login with invalid credentials - should return 401"""
        self.log("Testing login with invalid credentials...")
        
        data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json=data)
            self.log(f"Invalid login response status: {response.status_code}")
            
            if response.status_code == 401:
                result = response.json()
                if "detail" in result:
                    self.log(f"✅ PASS: Invalid credentials correctly rejected: {result['detail']}")
                    return True
                else:
                    self.log("❌ FAIL: 401 response missing error detail")
                    return False
            else:
                self.log(f"❌ FAIL: Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Invalid login test error: {str(e)}")
            return False
    
    def test_login_with_empty_body(self):
        """Test POST /api/auth/login with empty body - should return 422 with clear error message"""
        self.log("Testing login with empty body...")
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json={})
            self.log(f"Empty body login response status: {response.status_code}")
            
            if response.status_code == 422:
                result = response.json()
                detail = result.get("detail", "")
                if "Missing required fields" in detail or "email" in detail.lower():
                    self.log(f"✅ PASS: Empty body correctly rejected with clear message: {detail}")
                    return True
                else:
                    self.log(f"❌ FAIL: 422 response but unclear error message: {detail}")
                    return False
            else:
                self.log(f"❌ FAIL: Expected 422, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Empty body login test error: {str(e)}")
            return False
    
    def test_login_with_missing_password(self):
        """Test POST /api/auth/login with missing password - should return 422 with clear error message"""
        self.log("Testing login with missing password...")
        
        data = {
            "email": "test@example.com"
            # password field intentionally missing
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json=data)
            self.log(f"Missing password login response status: {response.status_code}")
            
            if response.status_code == 422:
                result = response.json()
                detail = result.get("detail", "")
                if "password" in detail.lower() or "Missing required fields" in detail:
                    self.log(f"✅ PASS: Missing password correctly rejected: {detail}")
                    return True
                else:
                    self.log(f"❌ FAIL: 422 response but unclear error message: {detail}")
                    return False
            else:
                self.log(f"❌ FAIL: Expected 422, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Missing password test error: {str(e)}")
            return False
    
    def test_apple_auth_new_user(self):
        """Test POST /api/auth/apple with new user - should create user and return token"""
        self.log("Testing Apple auth with new user...")
        
        # Generate unique Apple user ID
        apple_user_id = f"apple_test_{uuid.uuid4().hex[:12]}"
        test_email = f"apple_test_{uuid.uuid4().hex[:8]}@privaterelay.appleid.com"
        
        data = {
            "user_id": apple_user_id,
            "email": test_email,
            "full_name": "Apple Test User"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/apple", json=data)
            self.log(f"Apple auth new user response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                user = result.get("user", {})
                
                if token and user and user.get("email") == test_email:
                    self.log(f"✅ PASS: Apple auth new user successful, user: {user.get('name')}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid Apple auth new user response format")
                    return False
            else:
                self.log(f"❌ FAIL: Apple auth new user failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Apple auth new user error: {str(e)}")
            return False
    
    def test_apple_auth_returning_user(self):
        """Test POST /api/auth/apple with returning user (same user_id, no email) - should return existing user"""
        self.log("Testing Apple auth with returning user...")
        
        # First create a user
        apple_user_id = f"apple_returning_{uuid.uuid4().hex[:12]}"
        test_email = f"apple_returning_{uuid.uuid4().hex[:8]}@privaterelay.appleid.com"
        
        # Create user first
        create_data = {
            "user_id": apple_user_id,
            "email": test_email,
            "full_name": "Apple Returning User"
        }
        
        try:
            # Create the user
            response = requests.post(f"{BACKEND_URL}/auth/apple", json=create_data)
            if response.status_code != 200:
                self.log("❌ FAIL: Could not create user for returning user test")
                return False
            
            # Now test returning user (Apple only sends user_id on subsequent logins)
            returning_data = {
                "user_id": apple_user_id
                # No email or full_name - Apple doesn't send these on subsequent logins
            }
            
            response = requests.post(f"{BACKEND_URL}/auth/apple", json=returning_data)
            self.log(f"Apple auth returning user response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                user = result.get("user", {})
                
                if token and user and user.get("email") == test_email:
                    self.log(f"✅ PASS: Apple auth returning user successful, user: {user.get('name')}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid Apple auth returning user response format")
                    return False
            else:
                self.log(f"❌ FAIL: Apple auth returning user failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Apple auth returning user error: {str(e)}")
            return False
    
    def test_apple_auth_empty_user_id(self):
        """Test POST /api/auth/apple with empty user_id - should return 400 error"""
        self.log("Testing Apple auth with empty user_id...")
        
        data = {
            "user_id": "",  # Empty user_id
            "email": "test@privaterelay.appleid.com",
            "full_name": "Test User"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/apple", json=data)
            self.log(f"Apple auth empty user_id response status: {response.status_code}")
            
            if response.status_code == 400:
                result = response.json()
                detail = result.get("detail", "")
                if "user ID" in detail or "required" in detail.lower():
                    self.log(f"✅ PASS: Empty user_id correctly rejected: {detail}")
                    return True
                else:
                    self.log(f"❌ FAIL: 400 response but unclear error message: {detail}")
                    return False
            else:
                self.log(f"❌ FAIL: Expected 400, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Apple auth empty user_id test error: {str(e)}")
            return False
    
    def test_register_new_user(self):
        """Test POST /api/auth/register - should create new user and return token"""
        self.log("Testing user registration...")
        
        # Generate unique email
        unique_email = f"test_register_{uuid.uuid4().hex[:8]}@familycare.com"
        
        data = {
            "email": unique_email,
            "password": "TestPassword123!",
            "name": "Test Registration User"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/register", json=data)
            self.log(f"Registration response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                user = result.get("user", {})
                
                if token and user and user.get("email") == unique_email:
                    self.log(f"✅ PASS: Registration successful, user: {user.get('name')}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid registration response format")
                    return False
            else:
                self.log(f"❌ FAIL: Registration failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Registration error: {str(e)}")
            return False
    
    def test_auth_me_with_token(self):
        """Test GET /api/auth/me with valid token - should return user data"""
        if not self.token:
            self.log("❌ FAIL: No valid token available for /me test")
            return False
        
        self.log("Testing /auth/me with valid token...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            self.log(f"/auth/me response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("user_id") and result.get("email"):
                    self.log(f"✅ PASS: /auth/me successful, user: {result.get('name', result.get('email'))}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid /auth/me response format")
                    return False
            else:
                self.log(f"❌ FAIL: /auth/me failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: /auth/me error: {str(e)}")
            return False
    
    def test_auth_me_without_token(self):
        """Test GET /api/auth/me without token - should return 401"""
        self.log("Testing /auth/me without token...")
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me")
            self.log(f"/auth/me without token response status: {response.status_code}")
            
            if response.status_code == 401:
                result = response.json()
                if "detail" in result:
                    self.log(f"✅ PASS: /auth/me correctly rejected without token: {result['detail']}")
                    return True
                else:
                    self.log("❌ FAIL: 401 response missing error detail")
                    return False
            else:
                self.log(f"❌ FAIL: Expected 401, got {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: /auth/me without token test error: {str(e)}")
            return False
    
    def test_google_auth(self):
        """Test POST /api/auth/google with google_user_id and email - should create/return user"""
        self.log("Testing Google auth...")
        
        # Generate unique Google user data
        google_user_id = f"google_test_{uuid.uuid4().hex[:12]}"
        test_email = f"google_test_{uuid.uuid4().hex[:8]}@gmail.com"
        
        data = {
            "google_user_id": google_user_id,
            "email": test_email,
            "name": "Google Test User",
            "picture": "https://example.com/avatar.jpg"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/google", json=data)
            self.log(f"Google auth response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                user = result.get("user", {})
                
                if token and user and user.get("email") == test_email:
                    self.log(f"✅ PASS: Google auth successful, user: {user.get('name')}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid Google auth response format")
                    return False
            else:
                self.log(f"❌ FAIL: Google auth failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Google auth error: {str(e)}")
            return False
    
    def run_all_auth_tests(self):
        """Run all authentication tests as specified in the review request"""
        self.log("=" * 80)
        self.log("FAMILY CARE ORGANIZER AUTH BACKEND TESTING")
        self.log("=" * 80)
        
        tests = [
            ("Health Check", self.test_health_endpoint),
            ("Login with Demo Credentials", self.test_login_with_demo_credentials),
            ("Login with Invalid Credentials", self.test_login_with_invalid_credentials),
            ("Login with Empty Body", self.test_login_with_empty_body),
            ("Login with Missing Password", self.test_login_with_missing_password),
            ("Apple Auth - New User", self.test_apple_auth_new_user),
            ("Apple Auth - Returning User", self.test_apple_auth_returning_user),
            ("Apple Auth - Empty User ID", self.test_apple_auth_empty_user_id),
            ("Register New User", self.test_register_new_user),
            ("Auth Me - With Token", self.test_auth_me_with_token),
            ("Auth Me - Without Token", self.test_auth_me_without_token),
            ("Google Auth", self.test_google_auth),
        ]
        
        results = {}
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running Test: {test_name} ---")
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log(f"❌ FAIL: {test_name} threw exception: {str(e)}")
                results[test_name] = False
                failed += 1
        
        # Final summary
        self.log("\n" + "=" * 80)
        self.log("AUTH BACKEND TESTING SUMMARY")
        self.log("=" * 80)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nTotal Tests: {len(tests)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        if failed == 0:
            self.log("\n🎉 ALL AUTH BACKEND TESTS PASSED!")
            return True, results
        else:
            self.log(f"\n⚠️  {failed} TESTS FAILED - See details above")
            
            # List failed tests
            failed_tests = [k for k, v in results.items() if not v]
            self.log("\nFailed Tests:")
            for test in failed_tests:
                self.log(f"  ❌ {test}")
            
            return False, results

if __name__ == "__main__":
    print("Family Care Organizer Auth Backend Testing")
    print(f"Testing against: {BACKEND_URL}")
    print(f"Using demo credentials: demo@familycareorganizer.com / Demo2026!")
    print()
    
    tester = AuthBackendTester()
    success, results = tester.run_all_auth_tests()
    
    sys.exit(0 if success else 1)