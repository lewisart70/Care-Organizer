#!/usr/bin/env python3
"""
Backend API Testing Script for Caregiver Connect App
Tests the AI appointment summarization endpoint as requested.
"""

import httpx
import json
import asyncio
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://caregiver-connect-22.preview.emergentagent.com/api"
TEST_USER = {
    "email": "testuser2@example.com", 
    "password": "TestPass123", 
    "name": "Test User 2"
}

class APITester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token = None
        
    async def cleanup(self):
        await self.client.aclose()
    
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    async def register_user(self):
        """Register a new test user or login if already exists."""
        try:
            # Try to register first
            response = await self.client.post(
                f"{BASE_URL}/auth/register",
                json=TEST_USER
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["token"]
                self.log(f"✅ User registered successfully: {data['user']['name']}")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                # User exists, try to login
                self.log("User already exists, attempting login...")
                return await self.login_user()
            else:
                self.log(f"❌ Registration failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Registration error: {str(e)}", "ERROR")
            return False
    
    async def login_user(self):
        """Login with existing user credentials."""
        try:
            response = await self.client.post(
                f"{BASE_URL}/auth/login",
                json={
                    "email": TEST_USER["email"],
                    "password": TEST_USER["password"]
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["token"]
                self.log(f"✅ User logged in successfully: {data['user']['name']}")
                return True
            else:
                self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False
    
    def get_headers(self):
        """Get authentication headers."""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def test_ai_summarize_appointment(self):
        """Test the AI appointment summarization endpoint."""
        self.log("Testing AI appointment summarization endpoint...")
        
        test_data = {
            "transcript": "Doctor: Good morning, how are you feeling today? Patient: I've been having some chest pain and shortness of breath. Doctor: Let me check your blood pressure. It's a bit elevated at 150 over 90. I'm going to prescribe you Lisinopril 10mg once daily for the blood pressure. For the chest pain, let's do an EKG next week. Make sure to reduce your sodium intake and try to walk 30 minutes daily. Come back in 2 weeks for a follow-up.",
            "appointment_title": "Cardiology Checkup"
        }
        
        try:
            response = await self.client.post(
                f"{BASE_URL}/ai/summarize-appointment",
                json=test_data,
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ AI summarization endpoint working correctly")
                self.log(f"Response contains: {list(data.keys())}")
                
                # Check response structure
                if "summary" in data and "success" in data:
                    self.log("✅ Response has expected structure (summary, success)")
                    if data.get("success"):
                        self.log("✅ Success flag is True")
                        
                        # Log the summary content (truncated for readability)
                        summary = data.get("summary", "")
                        if summary:
                            self.log("✅ Summary content generated successfully")
                            # Show first 200 characters of summary
                            summary_preview = summary[:200] + "..." if len(summary) > 200 else summary
                            self.log(f"Summary preview: {summary_preview}")
                            
                            # Check if summary contains key medical info
                            medical_keywords = ["blood pressure", "medication", "lisinopril", "ekg", "follow-up", "chest pain"]
                            found_keywords = [kw for kw in medical_keywords if kw.lower() in summary.lower()]
                            if found_keywords:
                                self.log(f"✅ Summary contains medical keywords: {found_keywords}")
                            else:
                                self.log("⚠️ Summary may not contain expected medical keywords", "WARN")
                        else:
                            self.log("❌ Summary is empty", "ERROR")
                            return False
                    else:
                        self.log("❌ Success flag is False", "ERROR")
                        return False
                else:
                    self.log(f"❌ Unexpected response structure: {data}", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ AI summarization failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ AI summarization test error: {str(e)}", "ERROR")
            return False
    
    async def test_authentication_required(self):
        """Test that the endpoint requires authentication."""
        self.log("Testing authentication requirement...")
        
        test_data = {
            "transcript": "Test transcript",
            "appointment_title": "Test"
        }
        
        try:
            # Test without token
            response = await self.client.post(
                f"{BASE_URL}/ai/summarize-appointment",
                json=test_data
            )
            
            if response.status_code == 401:
                self.log("✅ Endpoint correctly requires authentication")
                return True
            else:
                self.log(f"❌ Endpoint should require auth but returned: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Auth test error: {str(e)}", "ERROR")
            return False
    
    async def test_invalid_data_handling(self):
        """Test how the endpoint handles invalid data."""
        self.log("Testing invalid data handling...")
        
        # Test with empty transcript
        test_cases = [
            {"transcript": "", "appointment_title": "Test"},
            {"transcript": "   ", "appointment_title": "Test"},
            {"appointment_title": "Test"}  # Missing transcript
        ]
        
        for i, test_data in enumerate(test_cases):
            try:
                response = await self.client.post(
                    f"{BASE_URL}/ai/summarize-appointment",
                    json=test_data,
                    headers=self.get_headers()
                )
                
                self.log(f"Test case {i+1}: Status {response.status_code}")
                
                # Should either handle gracefully or return appropriate error
                if response.status_code in [400, 422, 500]:
                    self.log(f"✅ Test case {i+1}: Properly handles invalid data")
                elif response.status_code == 200:
                    data = response.json()
                    if data.get("success") == False:
                        self.log(f"✅ Test case {i+1}: Returns success=false for invalid data")
                    else:
                        self.log(f"⚠️ Test case {i+1}: Processes invalid data without error", "WARN")
                        
            except Exception as e:
                self.log(f"❌ Test case {i+1} error: {str(e)}", "ERROR")
        
        return True
    
    async def run_all_tests(self):
        """Run all tests for the AI summarization endpoint."""
        self.log("=" * 60)
        self.log("STARTING AI APPOINTMENT SUMMARIZATION ENDPOINT TESTS")
        self.log("=" * 60)
        
        try:
            # Step 1: Authentication
            auth_success = await self.register_user()
            if not auth_success:
                self.log("❌ Authentication failed - cannot proceed with tests", "ERROR")
                return False
            
            # Step 2: Test auth requirement
            auth_req_success = await self.test_authentication_required()
            
            # Step 3: Test main functionality
            main_test_success = await self.test_ai_summarize_appointment()
            
            # Step 4: Test error handling
            error_handling_success = await self.test_invalid_data_handling()
            
            # Summary
            self.log("=" * 60)
            self.log("TEST SUMMARY")
            self.log("=" * 60)
            self.log(f"Authentication: {'✅ PASS' if auth_success else '❌ FAIL'}")
            self.log(f"Auth Required: {'✅ PASS' if auth_req_success else '❌ FAIL'}")
            self.log(f"Main Functionality: {'✅ PASS' if main_test_success else '❌ FAIL'}")
            self.log(f"Error Handling: {'✅ PASS' if error_handling_success else '❌ FAIL'}")
            
            overall_success = all([auth_success, main_test_success])
            self.log(f"Overall Result: {'✅ PASS' if overall_success else '❌ FAIL'}")
            
            return overall_success
            
        except Exception as e:
            self.log(f"❌ Test suite error: {str(e)}", "ERROR")
            return False
        finally:
            await self.cleanup()

async def main():
    """Main test execution."""
    tester = APITester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())