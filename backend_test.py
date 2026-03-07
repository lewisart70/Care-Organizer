#!/usr/bin/env python3
"""
Backend Testing Script for FamilyCare Organizer App
Tests the DNR/POA partial update endpoint (PATCH /api/care-recipients/{recipient_id})
"""

import asyncio
import httpx
import json
import uuid
from typing import Dict, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://family-health-hub-22.preview.emergentagent.com/api"

class FamilyCareAPITest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_user = {
            "email": f"test_dnr_poa_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "name": "DNR POA Test User"
        }
        self.care_recipient_id = None
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
                "name": "Eleanor Williams",
                "date_of_birth": "1935-06-15",
                "gender": "female",
                "address": "123 Maple Street, Toronto, ON",
                "phone": "416-555-0123",
                "medical_conditions": ["Diabetes Type 2", "Hypertension"],
                "allergies": ["Penicillin", "Shellfish"],
                "blood_type": "O+",
                "weight": "68 kg",
                "blood_pressure": "140/85",
                "blood_pressure_date": "2024-01-15",
                "health_card_number": "1234-567-890",
                "insurance_info": "Blue Cross Extended Health",
                "interests": ["Gardening", "Reading", "Knitting"],
                "favorite_foods": ["Tea and biscuits", "Roast chicken"],
                "notes": "Prefers morning appointments. Uses a walker for mobility."
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

    async def test_patch_dnr_info(self) -> bool:
        """Test PATCH endpoint with DNR info only"""
        try:
            dnr_data = {
                "dnr_info": {
                    "has_dnr": True,
                    "dnr_document_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
                    "dnr_date": "2024-01-10",
                    "doctor_signature": "Dr. Sarah Johnson",
                    "witness_signature": "Mary Williams",
                    "notes": "DNR wishes discussed with family and documented per patient's request."
                }
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}",
                    json=dnr_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "dnr_info" in data and data["dnr_info"]["has_dnr"] == True:
                        self.log("✅ DNR info PATCH test PASSED")
                        self.log(f"   DNR status: {data['dnr_info']['has_dnr']}")
                        self.log(f"   DNR document photo: {'✓ Present' if data['dnr_info']['dnr_document_photo'] else '✗ Missing'}")
                        return True
                    else:
                        self.log("❌ DNR info PATCH test FAILED - DNR info not properly updated")
                        return False
                else:
                    self.log(f"❌ DNR info PATCH test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ DNR info PATCH test error: {str(e)}")
            return False

    async def test_patch_poa_info(self) -> bool:
        """Test PATCH endpoint with POA info only"""
        try:
            poa_data = {
                "poa_info": {
                    "name": "Jane Williams Smith",
                    "relationship": "Daughter",
                    "phone": "555-123-4567",
                    "email": "jane.williams.smith@example.com",
                    "address": "456 Oak Avenue, Toronto, ON M4K 1B2",
                    "type": "Power of Attorney for Health Care",
                    "document_date": "2023-11-20",
                    "notarized": True,
                    "notes": "Primary contact for medical decisions. Lives close by and visits weekly."
                }
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}",
                    json=poa_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "poa_info" in data and data["poa_info"]["name"] == "Jane Williams Smith":
                        self.log("✅ POA info PATCH test PASSED")
                        self.log(f"   POA name: {data['poa_info']['name']}")
                        self.log(f"   Relationship: {data['poa_info']['relationship']}")
                        self.log(f"   Phone: {data['poa_info']['phone']}")
                        self.log(f"   Email: {data['poa_info']['email']}")
                        return True
                    else:
                        self.log("❌ POA info PATCH test FAILED - POA info not properly updated")
                        return False
                else:
                    self.log(f"❌ POA info PATCH test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ POA info PATCH test error: {str(e)}")
            return False

    async def test_persistence(self) -> bool:
        """Verify persistence by getting the care recipient and checking both dnr_info and poa_info"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Check DNR info persistence
                    dnr_ok = (
                        "dnr_info" in data and 
                        data["dnr_info"]["has_dnr"] == True and
                        "dnr_document_photo" in data["dnr_info"]
                    )
                    
                    # Check POA info persistence
                    poa_ok = (
                        "poa_info" in data and 
                        data["poa_info"]["name"] == "Jane Williams Smith" and
                        data["poa_info"]["relationship"] == "Daughter"
                    )
                    
                    if dnr_ok and poa_ok:
                        self.log("✅ Persistence test PASSED")
                        self.log("   Both DNR and POA info are properly persisted")
                        return True
                    else:
                        self.log("❌ Persistence test FAILED")
                        self.log(f"   DNR info persisted: {'✓' if dnr_ok else '✗'}")
                        self.log(f"   POA info persisted: {'✓' if poa_ok else '✗'}")
                        return False
                else:
                    self.log(f"❌ Persistence test FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Persistence test error: {str(e)}")
            return False

    async def test_authentication_required(self) -> bool:
        """Test that authentication is required (401 without token)"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}",
                    json={"dnr_info": {"has_dnr": False}},
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
                response = await client.patch(
                    f"{self.base_url}/care-recipients/{fake_recipient_id}",
                    json={"dnr_info": {"has_dnr": False}},
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

    async def test_only_specified_fields_updated(self) -> bool:
        """Test that only specified fields are updated (other fields remain unchanged)"""
        try:
            # First, get original data
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}",
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    self.log(f"❌ Field isolation test FAILED - Could not get original data: {response.status_code}")
                    return False
                
                original_data = response.json()
                original_name = original_data.get("name")
                original_phone = original_data.get("phone")
                
                # Update only medical_conditions
                update_data = {
                    "medical_conditions": ["Updated Condition Test"]
                }
                
                response = await client.patch(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}",
                    json=update_data,
                    headers=self.headers
                )
                
                if response.status_code != 200:
                    self.log(f"❌ Field isolation test FAILED - PATCH failed: {response.status_code}")
                    return False
                
                updated_data = response.json()
                
                # Verify only medical_conditions changed
                name_unchanged = updated_data.get("name") == original_name
                phone_unchanged = updated_data.get("phone") == original_phone
                conditions_updated = updated_data.get("medical_conditions") == ["Updated Condition Test"]
                
                if name_unchanged and phone_unchanged and conditions_updated:
                    self.log("✅ Field isolation test PASSED")
                    self.log("   Only specified field was updated, other fields remained unchanged")
                    return True
                else:
                    self.log("❌ Field isolation test FAILED")
                    self.log(f"   Name unchanged: {'✓' if name_unchanged else '✗'}")
                    self.log(f"   Phone unchanged: {'✓' if phone_unchanged else '✗'}")
                    self.log(f"   Conditions updated: {'✓' if conditions_updated else '✗'}")
                    return False
        except Exception as e:
            self.log(f"❌ Field isolation test error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all DNR/POA PATCH endpoint tests"""
        self.log("=" * 80)
        self.log("STARTING DNR/POA PARTIAL UPDATE ENDPOINT TESTS")
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

        # 2. Test PATCH with DNR info only
        self.log("\n2. TESTING PATCH with DNR info only...")
        test_results.append(("DNR Info PATCH", await self.test_patch_dnr_info()))

        # 3. Test PATCH with POA info only
        self.log("\n3. TESTING PATCH with POA info only...")
        test_results.append(("POA Info PATCH", await self.test_patch_poa_info()))

        # 4. Verify persistence
        self.log("\n4. TESTING persistence...")
        test_results.append(("Persistence", await self.test_persistence()))

        # 5. Test authentication required
        self.log("\n5. TESTING authentication requirement...")
        test_results.append(("Authentication Required", await self.test_authentication_required()))

        # 6. Test access control
        self.log("\n6. TESTING access control...")
        test_results.append(("Access Control", await self.test_access_control()))

        # 7. Test field isolation
        self.log("\n7. TESTING field isolation...")
        test_results.append(("Field Isolation", await self.test_only_specified_fields_updated()))

        # Summary
        self.log("\n" + "=" * 80)
        self.log("TEST RESULTS SUMMARY")
        self.log("=" * 80)
        
        passed = 0
        failed = 0
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name:25} | {status}")
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
    tester = FamilyCareAPITest()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)