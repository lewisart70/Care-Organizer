#!/usr/bin/env python3
"""
Backend Testing Script for FamilyCare Organizer App
Tests the new Appointments API with Edit, Categories, and Vitals features
"""

import asyncio
import httpx
import json
import uuid
from typing import Dict, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://family-health-hub-22.preview.emergentagent.com/api"

class AppointmentsAPITest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_user = {
            "email": f"test_appointments_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "name": "Appointments Test User"
        }
        self.care_recipient_id = None
        self.appointment_id = None
        self.headers = {"Content-Type": "application/json"}

    def log(self, message: str):
        print(f"[TEST] {message}")

    async def register_user(self) -> bool:
        """Register a test user"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/auth/register",
                    json=self.test_user,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.auth_token = data["token"]
                    self.headers["Authorization"] = f"Bearer {self.auth_token}"
                    self.log(f"✅ User registered successfully with token: {self.auth_token[:20]}...")
                    return True
                else:
                    self.log(f"❌ User registration failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ User registration error: {str(e)}")
            return False

    async def create_care_recipient(self) -> bool:
        """Create a test care recipient"""
        try:
            recipient_data = {
                "name": "Margaret Thompson",
                "date_of_birth": "1938-03-22",
                "gender": "female",
                "address": "789 Oak Street, Vancouver, BC",
                "phone": "604-555-0987",
                "medical_conditions": ["Arthritis", "High Blood Pressure", "Diabetes"],
                "allergies": ["Sulfa drugs", "Peanuts"],
                "blood_type": "A+",
                "weight": "72 kg",
                "blood_pressure": "135/80",
                "health_card_number": "9876-543-210",
                "notes": "Regular appointments needed for blood pressure monitoring and diabetes management."
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients",
                    json=recipient_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.care_recipient_id = data["recipient_id"]
                    self.log(f"✅ Care recipient created: {self.care_recipient_id}")
                    self.log(f"   Name: {data['name']}")
                    return True
                else:
                    self.log(f"❌ Care recipient creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Care recipient creation error: {str(e)}")
            return False

    async def test_create_appointment_with_new_fields(self) -> bool:
        """Test POST /api/care-recipients/{recipient_id}/appointments - Create appointment with new fields"""
        try:
            appointment_data = {
                "title": "Annual Physical Checkup",
                "date": "2025-06-15",
                "time": "10:00 AM",
                "doctor_name": "Dr. Sarah Johnson",
                "location": "Vancouver General Hospital - Medical Center",
                "category": "doctor",
                "blood_pressure": "130/85",
                "weight": "72.5 kg",
                "notes": "Routine annual physical - check blood pressure, diabetes management, and arthritis status"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments",
                    json=appointment_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.appointment_id = data["appointment_id"]
                    
                    # Verify all new fields are present and correct
                    category_correct = data.get("category") == "doctor"
                    bp_correct = data.get("blood_pressure") == "130/85"
                    weight_correct = data.get("weight") == "72.5 kg"
                    
                    if category_correct and bp_correct and weight_correct:
                        self.log("✅ Create appointment with new fields PASSED")
                        self.log(f"   Appointment ID: {self.appointment_id}")
                        self.log(f"   Category: {data.get('category')}")
                        self.log(f"   Blood Pressure: {data.get('blood_pressure')}")
                        self.log(f"   Weight: {data.get('weight')}")
                        return True
                    else:
                        self.log("❌ Create appointment FAILED - New fields not properly saved")
                        self.log(f"   Category correct: {'✓' if category_correct else '✗'}")
                        self.log(f"   Blood pressure correct: {'✓' if bp_correct else '✗'}")
                        self.log(f"   Weight correct: {'✓' if weight_correct else '✗'}")
                        return False
                else:
                    self.log(f"❌ Create appointment FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Create appointment error: {str(e)}")
            return False

    async def test_create_appointment_different_categories(self) -> bool:
        """Test creating appointments with different category types"""
        categories_to_test = [
            ("psw", "Personal Support Worker Visit"),
            ("grooming", "Hair Appointment"),
            ("footcare", "Podiatrist - Nail Trim"),
            ("respite", "Respite Care Day Program"),
            ("therapy", "Physiotherapy Session"),
            ("other", "Dental Cleaning")
        ]
        
        try:
            all_passed = True
            created_appointments = []
            
            for category, title in categories_to_test:
                appointment_data = {
                    "title": title,
                    "date": "2025-07-01", 
                    "time": "2:00 PM",
                    "category": category,
                    "notes": f"Testing {category} category appointment"
                }

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments",
                        json=appointment_data,
                        headers=self.headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("category") == category:
                            self.log(f"✅ Category '{category}' appointment created successfully")
                            created_appointments.append(data["appointment_id"])
                        else:
                            self.log(f"❌ Category '{category}' not saved correctly")
                            all_passed = False
                    else:
                        self.log(f"❌ Failed to create '{category}' appointment: {response.status_code}")
                        all_passed = False

            if all_passed:
                self.log("✅ All category types test PASSED")
                return True
            else:
                self.log("❌ Category types test FAILED")
                return False
                
        except Exception as e:
            self.log(f"❌ Category types test error: {str(e)}")
            return False

    async def test_update_appointment(self) -> bool:
        """Test PUT /api/care-recipients/{recipient_id}/appointments/{appointment_id} - Update appointment"""
        try:
            if not self.appointment_id:
                self.log("❌ Update test FAILED - No appointment ID available")
                return False
                
            updated_data = {
                "title": "UPDATED: Annual Physical + Blood Work",
                "date": "2025-06-16", 
                "time": "11:30 AM",
                "doctor_name": "Dr. Sarah Johnson, MD",
                "location": "Vancouver General Hospital - Lab & Medical Center",
                "category": "doctor",
                "blood_pressure": "128/82",
                "weight": "71.8 kg",
                "notes": "Updated appointment - added blood work and updated vitals from pre-visit"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments/{self.appointment_id}",
                    json=updated_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Verify all fields were updated correctly
                    title_updated = data.get("title") == "UPDATED: Annual Physical + Blood Work"
                    date_updated = data.get("date") == "2025-06-16"
                    bp_updated = data.get("blood_pressure") == "128/82"
                    weight_updated = data.get("weight") == "71.8 kg"
                    
                    if title_updated and date_updated and bp_updated and weight_updated:
                        self.log("✅ Update appointment PASSED")
                        self.log(f"   Updated title: {data.get('title')}")
                        self.log(f"   Updated date: {data.get('date')}")
                        self.log(f"   Updated blood pressure: {data.get('blood_pressure')}")
                        self.log(f"   Updated weight: {data.get('weight')}")
                        return True
                    else:
                        self.log("❌ Update appointment FAILED - Fields not properly updated")
                        self.log(f"   Title updated: {'✓' if title_updated else '✗'}")
                        self.log(f"   Date updated: {'✓' if date_updated else '✗'}")
                        self.log(f"   BP updated: {'✓' if bp_updated else '✗'}")
                        self.log(f"   Weight updated: {'✓' if weight_updated else '✗'}")
                        return False
                else:
                    self.log(f"❌ Update appointment FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Update appointment error: {str(e)}")
            return False

    async def test_list_appointments(self) -> bool:
        """Test GET /api/care-recipients/{recipient_id}/appointments - List appointments"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list) and len(data) > 0:
                        # Find our test appointment
                        test_appointment = None
                        for appt in data:
                            if appt.get("appointment_id") == self.appointment_id:
                                test_appointment = appt
                                break
                        
                        if test_appointment:
                            # Verify new fields appear in the response
                            has_category = "category" in test_appointment
                            has_bp = "blood_pressure" in test_appointment
                            has_weight = "weight" in test_appointment
                            
                            if has_category and has_bp and has_weight:
                                self.log("✅ List appointments PASSED")
                                self.log(f"   Found {len(data)} appointment(s)")
                                self.log(f"   New fields present: category='{test_appointment.get('category')}', bp='{test_appointment.get('blood_pressure')}', weight='{test_appointment.get('weight')}'")
                                return True
                            else:
                                self.log("❌ List appointments FAILED - New fields missing from response")
                                self.log(f"   Has category: {'✓' if has_category else '✗'}")
                                self.log(f"   Has blood_pressure: {'✓' if has_bp else '✗'}")
                                self.log(f"   Has weight: {'✓' if has_weight else '✗'}")
                                return False
                        else:
                            self.log("❌ List appointments FAILED - Test appointment not found in list")
                            return False
                    else:
                        self.log("❌ List appointments FAILED - No appointments returned")
                        return False
                else:
                    self.log(f"❌ List appointments FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ List appointments error: {str(e)}")
            return False

    async def test_delete_appointment(self) -> bool:
        """Test DELETE /api/care-recipients/{recipient_id}/appointments/{appointment_id} - Delete appointment"""
        try:
            if not self.appointment_id:
                self.log("❌ Delete test FAILED - No appointment ID available")
                return False

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments/{self.appointment_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "message" in data and "deleted" in data["message"].lower():
                        self.log("✅ Delete appointment PASSED")
                        self.log(f"   Success message: {data['message']}")
                        return True
                    else:
                        self.log("❌ Delete appointment FAILED - No proper success message")
                        return False
                else:
                    self.log(f"❌ Delete appointment FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Delete appointment error: {str(e)}")
            return False

    async def test_authentication_required(self) -> bool:
        """Test that authentication is required (401 without token)"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments",
                    json={"title": "Test", "date": "2025-01-01"},
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Authentication test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Authentication test FAILED - Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Authentication test error: {str(e)}")
            return False

    async def test_access_control(self) -> bool:
        """Test access control with non-existent recipient (404 if not a caregiver)"""
        try:
            fake_recipient_id = f"cr_{uuid.uuid4().hex[:12]}"
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{fake_recipient_id}/appointments",
                    headers=self.headers
                )
                
                if response.status_code == 404:
                    self.log("✅ Access control test PASSED - 404 returned for non-existent recipient")
                    return True
                else:
                    self.log(f"❌ Access control test FAILED - Expected 404, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Access control test error: {str(e)}")
            return False

    async def test_existing_functionality_still_works(self) -> bool:
        """Test that existing appointment functionality still works without new fields"""
        try:
            # Create appointment with only legacy fields (no category, blood_pressure, weight)
            legacy_appointment = {
                "title": "Legacy Appointment Test",
                "date": "2025-08-01",
                "time": "3:00 PM",
                "doctor_name": "Dr. Legacy Test",
                "location": "Old Clinic",
                "notes": "Testing backwards compatibility"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments",
                    json=legacy_appointment,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # Should work even without new fields
                    title_correct = data.get("title") == "Legacy Appointment Test"
                    has_id = "appointment_id" in data
                    
                    if title_correct and has_id:
                        self.log("✅ Existing functionality test PASSED")
                        self.log("   Legacy appointment created successfully without new fields")
                        return True
                    else:
                        self.log("❌ Existing functionality test FAILED - Legacy appointment creation broken")
                        return False
                else:
                    self.log(f"❌ Existing functionality test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Existing functionality test error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all Appointments API tests"""
        self.log("=" * 80)
        self.log("STARTING APPOINTMENTS API TESTS (Edit, Categories, Vitals)")
        self.log("=" * 80)
        
        test_results = []
        
        # 1. Setup - Register user and create care recipient
        self.log("\n1. SETUP - Registering user and creating care recipient...")
        if not await self.register_user():
            self.log("❌ CRITICAL FAILURE: Could not register user")
            return False
            
        if not await self.create_care_recipient():
            self.log("❌ CRITICAL FAILURE: Could not create care recipient")
            return False

        # 2. Test creating appointment with new fields
        self.log("\n2. TESTING POST /api/care-recipients/{id}/appointments with new fields...")
        test_results.append(("Create Appointment (New Fields)", await self.test_create_appointment_with_new_fields()))

        # 3. Test different categories
        self.log("\n3. TESTING all category types...")
        test_results.append(("Category Types", await self.test_create_appointment_different_categories()))

        # 4. Test updating appointment
        self.log("\n4. TESTING PUT /api/care-recipients/{id}/appointments/{id} update...")
        test_results.append(("Update Appointment", await self.test_update_appointment()))

        # 5. Test listing appointments
        self.log("\n5. TESTING GET /api/care-recipients/{id}/appointments list...")
        test_results.append(("List Appointments", await self.test_list_appointments()))

        # 6. Test authentication required
        self.log("\n6. TESTING authentication requirement...")
        test_results.append(("Authentication Required", await self.test_authentication_required()))

        # 7. Test access control
        self.log("\n7. TESTING access control...")
        test_results.append(("Access Control", await self.test_access_control()))

        # 8. Test existing functionality still works
        self.log("\n8. TESTING backwards compatibility (existing functionality)...")
        test_results.append(("Existing Functionality", await self.test_existing_functionality_still_works()))

        # 9. Test delete appointment (do this last)
        self.log("\n9. TESTING DELETE /api/care-recipients/{id}/appointments/{id}...")
        test_results.append(("Delete Appointment", await self.test_delete_appointment()))

        # Summary
        self.log("\n" + "=" * 80)
        self.log("APPOINTMENTS API TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name:35} | {status}")
            if result:
                passed += 1
            else:
                failed += 1
        
        self.log(f"\nTotal Tests: {len(test_results)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        overall_success = failed == 0
        status = "✅ ALL TESTS PASSED" if overall_success else f"❌ {failed} TEST(S) FAILED"
        self.log(f"\nOVERALL RESULT: {status}")
        self.log("=" * 80)
        
        return overall_success

async def main():
    """Main test execution"""
    tester = AppointmentsAPITest()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)