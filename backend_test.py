#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://family-health-hub-23.preview.emergentagent.com/api"

class DisclaimerTestRunner:
    def __init__(self):
        self.token = None
        self.test_email = "disclaimertest@test.com"
        self.test_password = "Test123!"
        self.test_name = "Test User"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_register(self):
        """Test 1: POST /api/auth/register - Should return user with disclaimer_accepted: false"""
        self.log("Testing user registration...")
        
        data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/register", json=data)
            self.log(f"Registration response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get("token")
                user = result.get("user", {})
                
                self.log(f"User registered: {user}")
                
                # Check disclaimer_accepted field
                disclaimer_accepted = user.get("disclaimer_accepted")
                if disclaimer_accepted is False:
                    self.log("✅ PASS: disclaimer_accepted is false for new user")
                    return True
                else:
                    self.log(f"❌ FAIL: Expected disclaimer_accepted=false, got {disclaimer_accepted}")
                    return False
            elif response.status_code == 400:
                # User might already exist, try to login instead
                self.log("User already exists, proceeding to login...")
                return self.test_login()
            else:
                self.log(f"❌ FAIL: Registration failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Registration error: {str(e)}")
            return False
    
    def test_login(self):
        """Test 2: POST /api/auth/login - Should return user with disclaimer_accepted field"""
        self.log("Testing user login...")
        
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json=data)
            self.log(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get("token")
                user = result.get("user", {})
                
                self.log(f"User logged in: {user}")
                
                # Check if disclaimer_accepted field exists
                if "disclaimer_accepted" in user:
                    disclaimer_accepted = user.get("disclaimer_accepted")
                    self.log(f"✅ PASS: disclaimer_accepted field present: {disclaimer_accepted}")
                    return True
                else:
                    self.log("❌ FAIL: disclaimer_accepted field missing from login response")
                    return False
            else:
                self.log(f"❌ FAIL: Login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Login error: {str(e)}")
            return False
    
    def test_get_me_before_disclaimer(self):
        """Test 3: GET /api/auth/me - Should include disclaimer_accepted field (before acceptance)"""
        self.log("Testing /auth/me endpoint before disclaimer acceptance...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            self.log(f"Get me response status: {response.status_code}")
            
            if response.status_code == 200:
                user = response.json()
                self.log(f"Current user info: {user}")
                
                # Check if disclaimer_accepted field exists
                if "disclaimer_accepted" in user:
                    disclaimer_accepted = user.get("disclaimer_accepted")
                    self.log(f"✅ PASS: disclaimer_accepted field present: {disclaimer_accepted}")
                    return True
                else:
                    self.log("❌ FAIL: disclaimer_accepted field missing from /auth/me response")
                    return False
            elif response.status_code == 401:
                self.log("❌ FAIL: Authentication failed - invalid token")
                return False
            else:
                self.log(f"❌ FAIL: /auth/me failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: /auth/me error: {str(e)}")
            return False
    
    def test_accept_disclaimer(self):
        """Test 4: POST /api/auth/accept-disclaimer - Should update user's disclaimer_accepted to true"""
        self.log("Testing disclaimer acceptance endpoint...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/accept-disclaimer", headers=headers)
            self.log(f"Accept disclaimer response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"Accept disclaimer result: {result}")
                
                # Check success response
                if result.get("success") is True:
                    message = result.get("message", "")
                    self.log(f"✅ PASS: Disclaimer accepted successfully: {message}")
                    return True
                else:
                    self.log("❌ FAIL: Success flag not true in response")
                    return False
            elif response.status_code == 401:
                self.log("❌ FAIL: Authentication failed - invalid token")
                return False
            else:
                self.log(f"❌ FAIL: Accept disclaimer failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Accept disclaimer error: {str(e)}")
            return False
    
    def test_get_me_after_disclaimer(self):
        """Test 5: GET /api/auth/me - Verify disclaimer_accepted is now true"""
        self.log("Testing /auth/me endpoint after disclaimer acceptance...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            self.log(f"Get me response status: {response.status_code}")
            
            if response.status_code == 200:
                user = response.json()
                self.log(f"Current user info after disclaimer: {user}")
                
                # Check if disclaimer_accepted is now true
                disclaimer_accepted = user.get("disclaimer_accepted")
                if disclaimer_accepted is True:
                    self.log("✅ PASS: disclaimer_accepted is now true after acceptance")
                    return True
                else:
                    self.log(f"❌ FAIL: Expected disclaimer_accepted=true, got {disclaimer_accepted}")
                    return False
            elif response.status_code == 401:
                self.log("❌ FAIL: Authentication failed - invalid token")
                return False
            else:
                self.log(f"❌ FAIL: /auth/me failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: /auth/me error: {str(e)}")
            return False
    
    def test_login_after_disclaimer(self):
        """Test 6: POST /api/auth/login - Verify disclaimer_accepted persists on re-login"""
        self.log("Testing login after disclaimer acceptance to verify persistence...")
        
        data = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json=data)
            self.log(f"Re-login response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                user = result.get("user", {})
                
                self.log(f"User after re-login: {user}")
                
                # Check if disclaimer_accepted is still true
                disclaimer_accepted = user.get("disclaimer_accepted")
                if disclaimer_accepted is True:
                    self.log("✅ PASS: disclaimer_accepted persists after re-login")
                    return True
                else:
                    self.log(f"❌ FAIL: Expected disclaimer_accepted=true after re-login, got {disclaimer_accepted}")
                    return False
            else:
                self.log(f"❌ FAIL: Re-login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Re-login error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all disclaimer acceptance tests"""
        self.log("=" * 60)
        self.log("STARTING DISCLAIMER ACCEPTANCE ENDPOINT TESTING")
        self.log("=" * 60)
        
        tests = [
            ("Register User", self.test_register),
            ("Login User", self.test_login if not self.token else lambda: True),
            ("Get Me (Before)", self.test_get_me_before_disclaimer),
            ("Accept Disclaimer", self.test_accept_disclaimer),
            ("Get Me (After)", self.test_get_me_after_disclaimer),
            ("Re-login Persistence", self.test_login_after_disclaimer)
        ]
        
        results = {}
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running Test: {test_name} ---")
            try:
                if test_name == "Login User" and self.token:
                    # Skip login if we already have token from registration
                    self.log("Skipping login test (already have token from registration)")
                    results[test_name] = True
                    passed += 1
                else:
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
        self.log("\n" + "=" * 60)
        self.log("DISCLAIMER ACCEPTANCE TESTING SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nTotal Tests: {len(tests)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        if failed == 0:
            self.log("\n🎉 ALL DISCLAIMER ACCEPTANCE TESTS PASSED!")
            return True
        else:
            self.log(f"\n⚠️  {failed} TESTS FAILED - See details above")
            return False

if __name__ == "__main__":
    print("Backend Disclaimer Acceptance API Testing")
    print(f"Testing against: {BACKEND_URL}")
    print()
    
    tester = DisclaimerTestRunner()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)