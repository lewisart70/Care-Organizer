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
BASE_URL = "https://family-health-hub-22.preview.emergentagent.com/api"
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

    async def create_test_care_recipient(self):
        """Create a care recipient for testing invites."""
        if not self.auth_token:
            self.log("❌ No auth token available", "ERROR")
            return None

        care_recipient_data = {
            "name": "John Doe",
            "date_of_birth": "1950-05-15",
            "gender": "Male",
            "address": "123 Main St, Anytown, USA",
            "phone": "555-123-4567",
            "medical_conditions": ["Diabetes", "Hypertension"],
            "allergies": ["Penicillin", "Nuts"],
            "blood_type": "A+"
        }

        try:
            response = await self.client.post(
                f"{BASE_URL}/care-recipients",
                json=care_recipient_data,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                recipient_id = data.get("recipient_id")
                self.log(f"✅ Care recipient created: {recipient_id}")
                return recipient_id
            else:
                self.log(f"❌ Care recipient creation failed: {response.status_code} - {response.text}", "ERROR")
                return None
                
        except Exception as e:
            self.log(f"❌ Care recipient creation error: {str(e)}", "ERROR")
            return None

    async def test_caregiver_invite(self):
        """Test the caregiver email invite endpoint."""
        self.log("\n--- Testing Caregiver Email Invite Endpoint ---")
        
        # Create a care recipient first
        recipient_id = await self.create_test_care_recipient()
        if not recipient_id:
            return False

        invite_data = {
            "email": "invite_test@example.com",
            "caregiver_name": "Test Caregiver",
            "message": "Please help with care"
        }

        try:
            # Test successful invite
            response = await self.client.post(
                f"{BASE_URL}/care-recipients/{recipient_id}/invite-caregiver",
                json=invite_data,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )

            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["message", "invite_id", "user_exists", "email_sent"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log(f"❌ Missing response fields: {missing_fields}", "ERROR")
                    return False
                
                # Verify invite_id format
                invite_id = data.get("invite_id", "")
                if not invite_id.startswith("inv_"):
                    self.log(f"❌ Invalid invite_id format: {invite_id}", "ERROR")
                    return False
                
                # Check email sent status
                email_sent = data.get("email_sent", False)
                if not email_sent and "email_note" in data:
                    # Free tier limitation - expected behavior
                    self.log("✅ Invite recorded with free tier limitation (email_sent=false)")
                    self.log(f"   Email note: {data.get('email_note', '')}")
                elif email_sent:
                    self.log("✅ Invite sent successfully (email_sent=true)")
                else:
                    self.log(f"⚠️ Unexpected response: email_sent={email_sent}, no email_note", "WARN")
                
                self.log(f"   Full response: {json.dumps(data, indent=2)}")
                
                # Test validation errors
                await self.test_invite_validation_errors(recipient_id)
                
                # Test access control
                await self.test_invite_access_control()
                
                return True
            else:
                self.log(f"❌ Invite failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Invite test error: {str(e)}", "ERROR")
            return False

    async def test_invite_validation_errors(self, recipient_id):
        """Test invite validation error scenarios."""
        self.log("\n   Testing validation errors...")
        
        # Test invalid email format
        invalid_email_data = {
            "email": "invalid-email",
            "caregiver_name": "Test",
            "message": "Test message"
        }
        
        try:
            response = await self.client.post(
                f"{BASE_URL}/care-recipients/{recipient_id}/invite-caregiver",
                json=invalid_email_data,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 422:
                self.log("   ✅ Invalid email format correctly rejected")
            else:
                self.log(f"   ⚠️ Invalid email not rejected: {response.status_code}", "WARN")
        except Exception as e:
            self.log(f"   ❌ Invalid email test error: {str(e)}", "ERROR")

        # Test missing email
        no_email_data = {
            "caregiver_name": "Test",
            "message": "Test message"
        }
        
        try:
            response = await self.client.post(
                f"{BASE_URL}/care-recipients/{recipient_id}/invite-caregiver",
                json=no_email_data,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 422:
                self.log("   ✅ Missing email correctly rejected")
            else:
                self.log(f"   ⚠️ Missing email not rejected: {response.status_code}", "WARN")
        except Exception as e:
            self.log(f"   ❌ Missing email test error: {str(e)}", "ERROR")

    async def test_invite_access_control(self):
        """Test invite access control."""
        self.log("\n   Testing access control...")
        
        invite_data = {
            "email": "test@example.com",
            "caregiver_name": "Test",
            "message": "Test"
        }
        
        # Test with non-existent recipient
        fake_recipient_id = "cr_nonexistent123"
        
        try:
            response = await self.client.post(
                f"{BASE_URL}/care-recipients/{fake_recipient_id}/invite-caregiver",
                json=invite_data,
                headers={"Authorization": f"Bearer {self.auth_token}"}
            )
            
            if response.status_code == 404:
                self.log("   ✅ Access control working - non-existent recipient rejected")
            else:
                self.log(f"   ❌ Access control issue: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"   ❌ Access control test error: {str(e)}", "ERROR")

        # Test without authentication
        try:
            response = await self.client.post(
                f"{BASE_URL}/care-recipients/fake_id/invite-caregiver",
                json=invite_data
            )
            
            if response.status_code == 401:
                self.log("   ✅ Authentication required - unauthenticated request rejected")
            else:
                self.log(f"   ❌ Authentication not required: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"   ❌ Auth test error: {str(e)}", "ERROR")
    
    async def run_all_tests(self):
        """Run all tests for backend endpoints."""
        self.log("=" * 60)
        self.log("STARTING BACKEND ENDPOINT TESTS")
        self.log("=" * 60)
        
        try:
            # Step 1: Authentication
            auth_success = await self.register_user()
            if not auth_success:
                self.log("❌ Authentication failed - cannot proceed with tests", "ERROR")
                return False
            
            # Step 2: Test caregiver invite endpoint (main focus)
            invite_test_success = await self.test_caregiver_invite()
            
            # Step 3: Test AI summarization (existing test)
            # auth_req_success = await self.test_authentication_required()
            # main_test_success = await self.test_ai_summarize_appointment()
            # error_handling_success = await self.test_invalid_data_handling()
            
            # Summary
            self.log("=" * 60)
            self.log("TEST SUMMARY")
            self.log("=" * 60)
            self.log(f"Authentication: {'✅ PASS' if auth_success else '❌ FAIL'}")
            self.log(f"Caregiver Invite: {'✅ PASS' if invite_test_success else '❌ FAIL'}")
            # self.log(f"AI Summarization: {'✅ PASS' if main_test_success else '❌ FAIL'}")
            
            overall_success = all([auth_success, invite_test_success])
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