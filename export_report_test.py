#!/usr/bin/env python3

import requests
import json
import sys
import base64
from datetime import datetime

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://profile-nav-fix-3.preview.emergentagent.com/api"

class ExportReportTestRunner:
    def __init__(self):
        self.token = None
        self.recipient_id = None
        self.test_email = "exporttest@test.com"
        self.test_password = "Test123!"
        self.test_name = "Export Test User"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def register_user(self):
        """Register or login a test user"""
        self.log("Registering/logging in test user...")
        
        # Try registration first
        data = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/register", json=data)
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get("token")
                self.log(f"✅ User registered successfully")
                return True
            elif response.status_code == 400:
                # User exists, try login
                login_data = {
                    "email": self.test_email,
                    "password": self.test_password
                }
                response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
                if response.status_code == 200:
                    result = response.json()
                    self.token = result.get("token")
                    self.log("✅ User logged in successfully")
                    return True
                else:
                    self.log(f"❌ Login failed: {response.status_code} - {response.text}")
                    return False
            else:
                self.log(f"❌ Registration failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Auth error: {str(e)}")
            return False
    
    def create_care_recipient(self):
        """Create a test care recipient"""
        self.log("Creating test care recipient...")
        
        if not self.token:
            self.log("❌ No auth token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "name": "John Doe Test",
            "date_of_birth": "1950-01-01",
            "gender": "male",
            "address": "123 Test Street, Toronto, ON",
            "phone": "416-555-0123",
            "medical_conditions": ["diabetes", "hypertension"],
            "allergies": ["penicillin"],
            "blood_type": "A+"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients", json=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.recipient_id = result.get("recipient_id")
                self.log(f"✅ Care recipient created: {self.recipient_id}")
                return True
            else:
                self.log(f"❌ Failed to create care recipient: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Care recipient creation error: {str(e)}")
            return False
    
    def add_test_data(self):
        """Add test data (medications, doctors, appointments, etc.)"""
        self.log("Adding test data for reporting...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ Missing auth token or recipient ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Add a doctor
            doctor_data = {
                "name": "Dr. Smith",
                "specialty": "Cardiologist",
                "phone": "416-555-0100",
                "address": "456 Medical Center, Toronto, ON"
            }
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/doctors", 
                                   json=doctor_data, headers=headers)
            if response.status_code == 200:
                self.log("✅ Test doctor added")
            else:
                self.log(f"⚠️ Doctor creation failed: {response.status_code}")
            
            # Add a medication
            med_data = {
                "name": "Lisinopril",
                "dosage": "10mg",
                "frequency": "Once daily",
                "time_of_day": "Morning",
                "prescribing_doctor": "Dr. Smith"
            }
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/medications", 
                                   json=med_data, headers=headers)
            if response.status_code == 200:
                self.log("✅ Test medication added")
            else:
                self.log(f"⚠️ Medication creation failed: {response.status_code}")
            
            # Add an appointment
            appt_data = {
                "title": "Cardiology Checkup",
                "date": "2024-02-15",
                "time": "10:00 AM",
                "doctor_name": "Dr. Smith",
                "category": "doctor"
            }
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/appointments", 
                                   json=appt_data, headers=headers)
            if response.status_code == 200:
                self.log("✅ Test appointment added")
            else:
                self.log(f"⚠️ Appointment creation failed: {response.status_code}")
            
            # Add a note
            note_data = {
                "content": "Patient showed good compliance with medication regimen",
                "category": "medical"
            }
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/notes", 
                                   json=note_data, headers=headers)
            if response.status_code == 200:
                self.log("✅ Test note added")
            else:
                self.log(f"⚠️ Note creation failed: {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log(f"❌ Error adding test data: {str(e)}")
            return False
    
    def test_export_sections_endpoint(self):
        """Test GET /api/care-recipients/{recipient_id}/export-sections"""
        self.log("Testing export sections endpoint...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ Missing auth token or recipient ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-sections", 
                                  headers=headers)
            
            self.log(f"Export sections response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sections = result.get("sections", [])
                
                self.log(f"Available sections: {len(sections)}")
                
                # Check expected sections
                expected_sections = ["medications", "appointments", "doctors", "routines", 
                                   "incidents", "notes", "bathing", "emergency_contacts"]
                
                found_sections = [s.get("id") for s in sections]
                
                missing_sections = [s for s in expected_sections if s not in found_sections]
                
                if not missing_sections:
                    self.log("✅ All expected sections found")
                    return True
                else:
                    self.log(f"❌ Missing sections: {missing_sections}")
                    return False
            elif response.status_code == 401:
                self.log("❌ Authentication failed")
                return False
            elif response.status_code == 404:
                self.log("❌ Care recipient not found - access control issue")
                return False
            else:
                self.log(f"❌ Export sections failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Export sections error: {str(e)}")
            return False
    
    def test_pdf_download_endpoint(self):
        """Test POST /api/care-recipients/{recipient_id}/export-report with download delivery"""
        self.log("Testing PDF download endpoint...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ Missing auth token or recipient ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test data matching the review request
        export_data = {
            "sections": ["medications", "doctors", "appointments"],
            "time_period": "7_days",
            "delivery_method": "download"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-report", 
                                   json=export_data, headers=headers)
            
            self.log(f"PDF download response status: {response.status_code}")
            self.log(f"Content-Type: {response.headers.get('content-type')}")
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '').lower()
                if 'application/pdf' in content_type:
                    self.log("✅ Correct content-type: application/pdf")
                else:
                    self.log(f"❌ Incorrect content-type: {content_type}")
                    return False
                
                # Check content disposition header
                content_disposition = response.headers.get('content-disposition', '')
                if 'attachment' in content_disposition.lower():
                    self.log("✅ Correct content-disposition header for download")
                else:
                    self.log(f"⚠️ Content-disposition: {content_disposition}")
                
                # Check PDF content
                pdf_content = response.content
                
                if len(pdf_content) > 0:
                    self.log(f"✅ PDF content received: {len(pdf_content)} bytes")
                else:
                    self.log("❌ Empty PDF content")
                    return False
                
                # Check if it's a valid PDF (starts with %PDF-)
                if pdf_content.startswith(b'%PDF-'):
                    self.log("✅ Valid PDF format detected")
                else:
                    self.log(f"❌ Invalid PDF format. Content starts with: {pdf_content[:20]}")
                    return False
                
                return True
                
            elif response.status_code == 401:
                self.log("❌ Authentication failed")
                return False
            elif response.status_code == 404:
                self.log("❌ Care recipient not found - access control issue")
                return False
            else:
                self.log(f"❌ PDF download failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ PDF download error: {str(e)}")
            return False
    
    def test_email_delivery_endpoint(self):
        """Test POST /api/care-recipients/{recipient_id}/export-report with email delivery"""
        self.log("Testing email delivery endpoint...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ Missing auth token or recipient ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test email delivery to self
        export_data = {
            "sections": ["medications", "notes"],
            "time_period": "30_days",
            "delivery_method": "email_self"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-report", 
                                   json=export_data, headers=headers)
            
            self.log(f"Email delivery response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                success = result.get("success")
                message = result.get("message", "")
                email_id = result.get("email_id")
                
                if success is True:
                    self.log(f"✅ Email delivery successful: {message}")
                    if email_id:
                        self.log(f"✅ Email ID received: {email_id}")
                    return True
                else:
                    self.log(f"❌ Email delivery failed - success=false: {message}")
                    return False
                
            elif response.status_code == 401:
                self.log("❌ Authentication failed")
                return False
            elif response.status_code == 404:
                self.log("❌ Care recipient not found - access control issue")  
                return False
            else:
                self.log(f"❌ Email delivery failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Email delivery error: {str(e)}")
            return False
    
    def test_authentication_required(self):
        """Test that endpoints require authentication"""
        self.log("Testing authentication requirements...")
        
        if not self.recipient_id:
            self.log("❌ No recipient ID available")
            return False
        
        # Test without token
        try:
            # Test export sections without auth
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-sections")
            
            if response.status_code == 401:
                self.log("✅ Export sections correctly requires authentication")
            else:
                self.log(f"❌ Export sections should return 401, got {response.status_code}")
                return False
            
            # Test export report without auth
            export_data = {
                "sections": ["medications"],
                "time_period": "7_days", 
                "delivery_method": "download"
            }
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-report", 
                                   json=export_data)
            
            if response.status_code == 401:
                self.log("✅ Export report correctly requires authentication")
                return True
            else:
                self.log(f"❌ Export report should return 401, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication test error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all export report tests"""
        self.log("=" * 60)
        self.log("STARTING EXPORT REPORT PDF GENERATION TESTING")
        self.log("=" * 60)
        
        setup_tests = [
            ("Register/Login User", self.register_user),
            ("Create Care Recipient", self.create_care_recipient),
            ("Add Test Data", self.add_test_data)
        ]
        
        main_tests = [
            ("Export Sections Endpoint", self.test_export_sections_endpoint),
            ("PDF Download Endpoint", self.test_pdf_download_endpoint),
            ("Email Delivery Endpoint", self.test_email_delivery_endpoint),
            ("Authentication Required", self.test_authentication_required)
        ]
        
        # Run setup tests first
        for test_name, test_func in setup_tests:
            self.log(f"\n--- Setup: {test_name} ---")
            if not test_func():
                self.log(f"❌ Setup failed at {test_name}")
                return False
        
        # Run main tests
        results = {}
        passed = 0
        failed = 0
        
        for test_name, test_func in main_tests:
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
        self.log("\n" + "=" * 60)
        self.log("EXPORT REPORT TESTING SUMMARY")
        self.log("=" * 60)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nTotal Tests: {len(main_tests)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        if failed == 0:
            self.log("\n🎉 ALL EXPORT REPORT TESTS PASSED!")
            self.log("✅ Export Report PDF generation is working correctly!")
            return True
        else:
            self.log(f"\n⚠️  {failed} TESTS FAILED - See details above")
            return False

if __name__ == "__main__":
    print("Backend Export Report PDF Generation Testing")
    print(f"Testing against: {BACKEND_URL}")
    print()
    
    tester = ExportReportTestRunner()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)