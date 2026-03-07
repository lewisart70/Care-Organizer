#!/usr/bin/env python3
"""
Backend Testing Script for FamilyCare Organizer App
Tests Notes and Incidents Edit Functionality
"""

import asyncio
import httpx
import json
import uuid
from typing import Dict, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://care-recipient-app.preview.emergentagent.com/api"

class NotesIncidentsEditTest:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.auth_token = None
        self.test_user = {
            "email": f"test_notes_incidents_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPassword123!",
            "name": "Notes Incidents Test User"
        }
        self.care_recipient_id = None
        self.note_id = None
        self.incident_id = None
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
                "name": "Eleanor Rodriguez",
                "date_of_birth": "1942-08-15",
                "gender": "female",
                "address": "456 Pine Avenue, Toronto, ON",
                "phone": "416-555-0123",
                "medical_conditions": ["Diabetes Type 2", "Osteoporosis", "Mild Dementia"],
                "allergies": ["Penicillin", "Shellfish"],
                "blood_type": "O+",
                "weight": "68 kg",
                "blood_pressure": "140/90",
                "health_card_number": "1234-567-890",
                "notes": "Family caregiver testing notes and incident management features."
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

    async def create_note(self) -> bool:
        """Create a test note to edit later"""
        try:
            note_data = {
                "content": "Initial note about Eleanor's medication schedule. She takes metformin with breakfast and insulin before dinner.",
                "category": "medication",
                "photo": None
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/notes",
                    json=note_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.note_id = data["note_id"]
                    self.log(f"✅ Note created successfully: {self.note_id}")
                    self.log(f"   Content: {data['content'][:50]}...")
                    self.log(f"   Category: {data['category']}")
                    return True
                else:
                    self.log(f"❌ Note creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Note creation error: {str(e)}")
            return False

    async def test_update_note(self) -> bool:
        """Test PUT /api/care-recipients/{recipient_id}/notes/{note_id} - Update note"""
        try:
            if not self.note_id:
                self.log("❌ Note update test FAILED - No note ID available")
                return False
                
            updated_note_data = {
                "content": "UPDATED: Eleanor's medication schedule has changed. She now takes extended-release metformin once daily at breakfast (500mg) and continues insulin before dinner. Added vitamin D supplement twice weekly.",
                "category": "care_plan",
                "photo": None
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/notes/{self.note_id}",
                    json=updated_note_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Verify all fields were updated correctly
                    content_updated = "UPDATED:" in data.get("content", "")
                    category_updated = data.get("category") == "care_plan"
                    has_updated_at = "updated_at" in data
                    
                    if content_updated and category_updated:
                        self.log("✅ Note update PASSED")
                        self.log(f"   Updated content: {data.get('content')[:60]}...")
                        self.log(f"   Updated category: {data.get('category')}")
                        self.log(f"   Has updated_at field: {'✓' if has_updated_at else '✗'}")
                        return True
                    else:
                        self.log("❌ Note update FAILED - Fields not properly updated")
                        self.log(f"   Content updated: {'✓' if content_updated else '✗'}")
                        self.log(f"   Category updated: {'✓' if category_updated else '✗'}")
                        return False
                else:
                    self.log(f"❌ Note update FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Note update error: {str(e)}")
            return False

    async def verify_note_persistence(self) -> bool:
        """Verify note update persists by fetching all notes"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/notes",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    notes = response.json()
                    if isinstance(notes, list) and len(notes) > 0:
                        # Find our updated note
                        updated_note = None
                        for note in notes:
                            if note.get("note_id") == self.note_id:
                                updated_note = note
                                break
                        
                        if updated_note:
                            content_persisted = "UPDATED:" in updated_note.get("content", "")
                            category_persisted = updated_note.get("category") == "care_plan"
                            
                            if content_persisted and category_persisted:
                                self.log("✅ Note persistence verification PASSED")
                                self.log(f"   Updated content found in database")
                                self.log(f"   Category correctly saved: {updated_note.get('category')}")
                                return True
                            else:
                                self.log("❌ Note persistence FAILED - Updates not saved to database")
                                return False
                        else:
                            self.log("❌ Note persistence FAILED - Updated note not found")
                            return False
                    else:
                        self.log("❌ Note persistence FAILED - No notes returned")
                        return False
                else:
                    self.log(f"❌ Note persistence verification FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Note persistence verification error: {str(e)}")
            return False

    async def create_incident(self) -> bool:
        """Create a test incident to edit later"""
        try:
            incident_data = {
                "incident_type": "fall",
                "description": "Eleanor slipped in the bathroom near the shower. She was reaching for her towel when she lost her balance.",
                "severity": "minor",
                "location": "bathroom",
                "injuries": "Small bruise on left elbow, no bleeding",
                "action_taken": "Helped her sit down, applied ice pack to elbow, monitored for 30 minutes",
                "photo": None
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/incidents",
                    json=incident_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.incident_id = data["incident_id"]
                    self.log(f"✅ Incident created successfully: {self.incident_id}")
                    self.log(f"   Type: {data['incident_type']}")
                    self.log(f"   Severity: {data['severity']}")
                    self.log(f"   Location: {data['location']}")
                    return True
                else:
                    self.log(f"❌ Incident creation failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Incident creation error: {str(e)}")
            return False

    async def test_update_incident(self) -> bool:
        """Test PUT /api/care-recipients/{recipient_id}/incidents/{incident_id} - Update incident"""
        try:
            if not self.incident_id:
                self.log("❌ Incident update test FAILED - No incident ID available")
                return False
                
            updated_incident_data = {
                "incident_type": "fall",
                "description": "UPDATED: Eleanor slipped in the bathroom near the shower while reaching for towel. Follow-up: Installed grab bar and non-slip mat for safety.",
                "severity": "moderate", 
                "location": "main bathroom - near shower",
                "injuries": "Small bruise on left elbow (resolved), minor scrape on knee",
                "action_taken": "Immediate: Applied ice, monitored vitals. Follow-up: Installed safety equipment, scheduled occupational therapy assessment for bathroom safety evaluation.",
                "photo": None
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.put(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/incidents/{self.incident_id}",
                    json=updated_incident_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Verify all fields were updated correctly
                    description_updated = "UPDATED:" in data.get("description", "")
                    severity_updated = data.get("severity") == "moderate"
                    location_updated = "main bathroom" in data.get("location", "")
                    injuries_updated = "scrape on knee" in data.get("injuries", "")
                    action_updated = "Follow-up:" in data.get("action_taken", "")
                    
                    all_updated = description_updated and severity_updated and location_updated and injuries_updated and action_updated
                    
                    if all_updated:
                        self.log("✅ Incident update PASSED")
                        self.log(f"   Updated description: {data.get('description')[:60]}...")
                        self.log(f"   Updated severity: {data.get('severity')}")
                        self.log(f"   Updated location: {data.get('location')}")
                        self.log(f"   Updated injuries: {data.get('injuries')[:40]}...")
                        self.log(f"   Updated action: {data.get('action_taken')[:50]}...")
                        return True
                    else:
                        self.log("❌ Incident update FAILED - Fields not properly updated")
                        self.log(f"   Description updated: {'✓' if description_updated else '✗'}")
                        self.log(f"   Severity updated: {'✓' if severity_updated else '✗'}")
                        self.log(f"   Location updated: {'✓' if location_updated else '✗'}")
                        self.log(f"   Injuries updated: {'✓' if injuries_updated else '✗'}")
                        self.log(f"   Action updated: {'✓' if action_updated else '✗'}")
                        return False
                else:
                    self.log(f"❌ Incident update FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Incident update error: {str(e)}")
            return False

    async def verify_incident_persistence(self) -> bool:
        """Verify incident update persists by fetching all incidents"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/incidents",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    incidents = response.json()
                    if isinstance(incidents, list) and len(incidents) > 0:
                        # Find our updated incident
                        updated_incident = None
                        for incident in incidents:
                            if incident.get("incident_id") == self.incident_id:
                                updated_incident = incident
                                break
                        
                        if updated_incident:
                            description_persisted = "UPDATED:" in updated_incident.get("description", "")
                            severity_persisted = updated_incident.get("severity") == "moderate"
                            location_persisted = "main bathroom" in updated_incident.get("location", "")
                            
                            if description_persisted and severity_persisted and location_persisted:
                                self.log("✅ Incident persistence verification PASSED")
                                self.log(f"   Updated description persisted in database")
                                self.log(f"   Severity correctly saved: {updated_incident.get('severity')}")
                                self.log(f"   Location correctly saved: {updated_incident.get('location')}")
                                return True
                            else:
                                self.log("❌ Incident persistence FAILED - Updates not saved to database")
                                return False
                        else:
                            self.log("❌ Incident persistence FAILED - Updated incident not found")
                            return False
                    else:
                        self.log("❌ Incident persistence FAILED - No incidents returned")
                        return False
                else:
                    self.log(f"❌ Incident persistence verification FAILED: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log(f"❌ Incident persistence verification error: {str(e)}")
            return False

    async def test_authentication_required(self) -> bool:
        """Test that authentication is required for edit endpoints"""
        try:
            headers_no_auth = {"Content-Type": "application/json"}
            
            # Test note update without auth
            note_response = None
            if self.note_id:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    note_response = await client.put(
                        f"{self.base_url}/care-recipients/{self.care_recipient_id}/notes/{self.note_id}",
                        json={"content": "test", "category": "general"},
                        headers=headers_no_auth
                    )
            
            # Test incident update without auth
            incident_response = None
            if self.incident_id:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    incident_response = await client.put(
                        f"{self.base_url}/care-recipients/{self.care_recipient_id}/incidents/{self.incident_id}",
                        json={"incident_type": "test", "description": "test"},
                        headers=headers_no_auth
                    )
            
            note_auth_correct = note_response and note_response.status_code == 401
            incident_auth_correct = incident_response and incident_response.status_code == 401
            
            if note_auth_correct and incident_auth_correct:
                self.log("✅ Authentication test PASSED - 401 returned without token for both endpoints")
                return True
            else:
                self.log(f"❌ Authentication test FAILED")
                if note_response:
                    self.log(f"   Note update without auth: {note_response.status_code} (expected 401)")
                if incident_response:
                    self.log(f"   Incident update without auth: {incident_response.status_code} (expected 401)")
                return False
        except Exception as e:
            self.log(f"❌ Authentication test error: {str(e)}")
            return False

    async def test_non_existent_resources(self) -> bool:
        """Test updating non-existent notes and incidents returns 404"""
        try:
            fake_note_id = f"note_{uuid.uuid4().hex[:12]}"
            fake_incident_id = f"inc_{uuid.uuid4().hex[:12]}"
            
            # Test updating non-existent note
            async with httpx.AsyncClient(timeout=30.0) as client:
                note_response = await client.put(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/notes/{fake_note_id}",
                    json={"content": "test", "category": "general"},
                    headers=self.headers
                )
                
                incident_response = await client.put(
                    f"{self.base_url}/care-recipients/{self.care_recipient_id}/incidents/{fake_incident_id}",
                    json={"incident_type": "test", "description": "test"},
                    headers=self.headers
                )
            
            note_404_correct = note_response.status_code == 404
            incident_404_correct = incident_response.status_code == 404
            
            if note_404_correct and incident_404_correct:
                self.log("✅ Non-existent resources test PASSED - 404 returned for both")
                return True
            else:
                self.log(f"❌ Non-existent resources test FAILED")
                self.log(f"   Note update (non-existent): {note_response.status_code} (expected 404)")
                self.log(f"   Incident update (non-existent): {incident_response.status_code} (expected 404)")
                return False
        except Exception as e:
            self.log(f"❌ Non-existent resources test error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all Notes and Incidents edit tests"""
        self.log("=" * 80)
        self.log("STARTING NOTES AND INCIDENTS EDIT FUNCTIONALITY TESTS")
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

        # 2. Create note for editing
        self.log("\n2. SETUP - Creating test note...")
        test_results.append(("Create Note", await self.create_note()))

        # 3. Test note update
        self.log("\n3. TESTING PUT /api/care-recipients/{id}/notes/{note_id}...")
        test_results.append(("Update Note", await self.test_update_note()))

        # 4. Verify note persistence
        self.log("\n4. VERIFYING note update persistence...")
        test_results.append(("Note Persistence", await self.verify_note_persistence()))

        # 5. Create incident for editing
        self.log("\n5. SETUP - Creating test incident...")
        test_results.append(("Create Incident", await self.create_incident()))

        # 6. Test incident update
        self.log("\n6. TESTING PUT /api/care-recipients/{id}/incidents/{incident_id}...")
        test_results.append(("Update Incident", await self.test_update_incident()))

        # 7. Verify incident persistence
        self.log("\n7. VERIFYING incident update persistence...")
        test_results.append(("Incident Persistence", await self.verify_incident_persistence()))

        # 8. Test authentication required
        self.log("\n8. TESTING authentication requirement...")
        test_results.append(("Authentication Required", await self.test_authentication_required()))

        # 9. Test non-existent resources
        self.log("\n9. TESTING non-existent resource handling...")
        test_results.append(("Non-existent Resources", await self.test_non_existent_resources()))

        # Summary
        self.log("\n" + "=" * 80)
        self.log("NOTES AND INCIDENTS EDIT TEST RESULTS SUMMARY")
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
    tester = NotesIncidentsEditTest()
    success = await tester.run_all_tests()
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)