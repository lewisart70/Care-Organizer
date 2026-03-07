#!/usr/bin/env python3
"""
Export Report Feature Testing Script for FamilyCare Organizer App
Tests Export Report endpoints
"""

import asyncio
import httpx
import json
import uuid
from typing import Dict, Optional, List

# Backend URL from frontend/.env
BACKEND_URL = "https://care-recipient-app.preview.emergentagent.com/api"

class ExportReportTest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_user = {
            "email": f"exporttest_{uuid.uuid4().hex[:8]}@test.com",
            "password": "Test123!",
            "name": "Export Test User"
        }
        self.care_recipient_id = None
        self.medication_id = None
        self.appointment_id = None
        self.note_id = None
        self.headers = {"Content-Type": "application/json"}

    def log(self, message: str):
        print(f"[EXPORT TEST] {message}")

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
                    self.log(f"✅ User registered successfully")
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
                "name": "Export Test Recipient",
                "date_of_birth": "1940-01-15",
                "gender": "female",
                "address": "123 Test Street, Test City, ON M1M 1M1",
                "phone": "416-555-0123"
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
                    self.log(f"✅ Care recipient created with ID: {self.care_recipient_id}")
                    return True
                else:
                    self.log(f"❌ Care recipient creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Care recipient creation error: {str(e)}")
            return False

    async def add_test_medication(self) -> bool:
        """Add a test medication"""
        try:
            medication_data = {
                "name": "Aspirin",
                "dosage": "81mg",
                "frequency": "Once daily",
                "instructions": "Take with food in the morning",
                "prescribing_doctor": "Dr. Smith",
                "start_date": "2024-01-01",
                "is_active": True
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/medications",
                    json=medication_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.medication_id = data.get("medication_id")
                    self.log(f"✅ Test medication added")
                    return True
                else:
                    self.log(f"❌ Medication creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Medication creation error: {str(e)}")
            return False

    async def add_test_appointment(self) -> bool:
        """Add a test appointment"""
        try:
            appointment_data = {
                "title": "Regular Checkup",
                "date": "2024-12-30",
                "time": "10:00",
                "doctor": "Dr. Johnson",
                "location": "Medical Center",
                "notes": "Annual checkup appointment",
                "category": "doctor"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/appointments",
                    json=appointment_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.appointment_id = data.get("appointment_id")
                    self.log(f"✅ Test appointment added")
                    return True
                else:
                    self.log(f"❌ Appointment creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Appointment creation error: {str(e)}")
            return False

    async def add_test_note(self) -> bool:
        """Add a test note"""
        try:
            note_data = {
                "content": "Patient is doing well. Good appetite and mobility.",
                "category": "general"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/notes",
                    json=note_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.note_id = data.get("note_id")
                    self.log(f"✅ Test note added")
                    return True
                else:
                    self.log(f"❌ Note creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Note creation error: {str(e)}")
            return False

    async def test_get_export_sections(self) -> bool:
        """Test GET /api/care-recipients/{recipient_id}/export-sections"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/export-sections",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check if response has sections key
                    if "sections" not in data:
                        self.log(f"❌ Export sections test FAILED - Expected 'sections' key in response")
                        return False
                    
                    sections = data["sections"]
                    
                    # Check if sections is a list
                    if not isinstance(sections, list):
                        self.log(f"❌ Export sections test FAILED - Expected sections to be list, got {type(sections)}")
                        return False
                    
                    # Check if sections have required fields
                    required_keys = {"id", "name", "icon"}
                    for section in sections:
                        if not all(key in section for key in required_keys):
                            self.log(f"❌ Export sections test FAILED - Section missing required keys: {section}")
                            return False
                    
                    # Check for expected sections
                    section_ids = {sec["id"] for sec in sections}
                    expected_sections = {"medications", "appointments", "doctors", "notes"}
                    
                    if not expected_sections.issubset(section_ids):
                        missing = expected_sections - section_ids
                        self.log(f"❌ Export sections test FAILED - Missing expected sections: {missing}")
                        return False
                    
                    self.log("✅ GET export-sections test PASSED")
                    self.log(f"   Found {len(sections)} sections: {', '.join(section_ids)}")
                    return True
                else:
                    self.log(f"❌ Export sections test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Export sections test error: {str(e)}")
            return False

    async def test_export_sections_auth(self) -> bool:
        """Test that GET /api/care-recipients/{recipient_id}/export-sections requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/export-sections",
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Export sections auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Export sections auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Export sections auth test error: {str(e)}")
            return False

    async def test_export_report_download(self) -> bool:
        """Test POST /api/care-recipients/{recipient_id}/export-report with download method"""
        try:
            export_data = {
                "sections": ["medications", "appointments", "notes"],
                "time_period": "7_days",
                "delivery_method": "download"
            }

            async with httpx.AsyncClient(timeout=60.0) as client:  # Extended timeout for PDF generation
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/export-report",
                    json=export_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    # Check if response is PDF
                    content_type = response.headers.get("content-type", "")
                    if "application/pdf" not in content_type:
                        self.log(f"❌ Export download test FAILED - Expected PDF content type, got: {content_type}")
                        return False
                    
                    # Check if PDF content exists
                    pdf_content = response.content
                    if len(pdf_content) == 0:
                        self.log(f"❌ Export download test FAILED - Empty PDF content")
                        return False
                    
                    # Check PDF magic bytes
                    if not pdf_content.startswith(b'%PDF-'):
                        self.log(f"❌ Export download test FAILED - Invalid PDF format")
                        return False
                    
                    # Check content disposition header
                    disposition = response.headers.get("content-disposition", "")
                    if "attachment" not in disposition or "filename" not in disposition:
                        self.log(f"❌ Export download test FAILED - Missing or invalid content-disposition header")
                        return False
                    
                    self.log("✅ Export report download test PASSED")
                    self.log(f"   PDF size: {len(pdf_content)} bytes")
                    self.log(f"   Content-Type: {content_type}")
                    self.log(f"   Content-Disposition: {disposition}")
                    return True
                else:
                    self.log(f"❌ Export download test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Export download test error: {str(e)}")
            return False

    async def test_export_report_email_self(self) -> bool:
        """Test POST /api/care-recipients/{recipient_id}/export-report with email_self method"""
        try:
            export_data = {
                "sections": ["medications", "notes"],
                "time_period": "30_days",
                "delivery_method": "email_self"
            }

            async with httpx.AsyncClient(timeout=60.0) as client:  # Extended timeout for email processing
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/export-report",
                    json=export_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check required response fields
                    required_fields = {"success", "message"}
                    if not all(field in data for field in required_fields):
                        self.log(f"❌ Export email test FAILED - Missing required response fields")
                        self.log(f"   Expected: {required_fields}")
                        self.log(f"   Found: {set(data.keys())}")
                        return False
                    
                    # Check success flag
                    if not data.get("success"):
                        self.log(f"❌ Export email test FAILED - Success flag is False")
                        return False
                    
                    # Check message content
                    message = data.get("message", "")
                    if "sent successfully" not in message.lower():
                        self.log(f"❌ Export email test FAILED - Unexpected success message: {message}")
                        return False
                    
                    self.log("✅ Export report email_self test PASSED")
                    self.log(f"   Message: {message}")
                    if "email_id" in data:
                        self.log(f"   Email ID: {data['email_id']}")
                    return True
                else:
                    self.log(f"❌ Export email test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Export email test error: {str(e)}")
            return False

    async def test_export_report_auth(self) -> bool:
        """Test that POST /api/care-recipients/{recipient_id}/export-report requires authentication"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            export_data = {
                "sections": ["medications"],
                "time_period": "7_days",
                "delivery_method": "download"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/export-report",
                    json=export_data,
                    headers=headers_no_auth
                )
                
                if response.status_code == 401:
                    self.log("✅ Export report auth test PASSED - 401 returned without token")
                    return True
                else:
                    self.log(f"❌ Export report auth test FAILED: Expected 401, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Export report auth test error: {str(e)}")
            return False

    async def test_export_report_invalid_recipient(self) -> bool:
        """Test export report with non-existent recipient ID"""
        try:
            fake_recipient_id = f"rec_{uuid.uuid4().hex[:12]}"
            export_data = {
                "sections": ["medications"],
                "time_period": "7_days",
                "delivery_method": "download"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{fake_recipient_id}/export-report",
                    json=export_data,
                    headers=self.headers
                )
                
                if response.status_code == 404:
                    self.log("✅ Export invalid recipient test PASSED - 404 returned for non-existent recipient")
                    return True
                else:
                    self.log(f"❌ Export invalid recipient test FAILED: Expected 404, got {response.status_code}")
                    return False
        except Exception as e:
            self.log(f"❌ Export invalid recipient test error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all Export Report tests"""
        self.log("=" * 80)
        self.log("STARTING EXPORT REPORT FEATURE TESTS")
        self.log("=" * 80)
        
        test_results = []
        
        # 1. Setup - Register user
        self.log("\n1. SETUP - Registering user...")
        if not await self.register_user():
            self.log("❌ CRITICAL FAILURE: Could not register user")
            return False

        # 2. Create care recipient
        self.log("\n2. SETUP - Creating care recipient...")
        if not await self.create_care_recipient():
            self.log("❌ CRITICAL FAILURE: Could not create care recipient")
            return False

        # 3. Add test data
        self.log("\n3. SETUP - Adding test data...")
        await self.add_test_medication()
        await self.add_test_appointment()  
        await self.add_test_note()

        # 4. Test GET /api/care-recipients/{id}/export-sections
        self.log("\n4. TESTING GET /api/care-recipients/{id}/export-sections...")
        test_results.append(("Get Export Sections", await self.test_get_export_sections()))

        # 5. Test export sections authentication
        self.log("\n5. TESTING export sections authentication requirement...")
        test_results.append(("Export Sections Auth", await self.test_export_sections_auth()))

        # 6. Test POST /api/care-recipients/{id}/export-report (download)
        self.log("\n6. TESTING POST /api/care-recipients/{id}/export-report (download)...")
        test_results.append(("Export Report Download", await self.test_export_report_download()))

        # 7. Test POST /api/care-recipients/{id}/export-report (email_self)
        self.log("\n7. TESTING POST /api/care-recipients/{id}/export-report (email_self)...")
        test_results.append(("Export Report Email", await self.test_export_report_email_self()))

        # 8. Test export report authentication
        self.log("\n8. TESTING export report authentication requirement...")
        test_results.append(("Export Report Auth", await self.test_export_report_auth()))

        # 9. Test export report with invalid recipient
        self.log("\n9. TESTING export report with invalid recipient...")
        test_results.append(("Export Invalid Recipient", await self.test_export_report_invalid_recipient()))

        # Summary
        self.log("\n" + "=" * 80)
        self.log("EXPORT REPORT TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name:30} | {status}")
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
    tester = ExportReportTest()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)