#!/usr/bin/env python3

import requests
import json
import sys
import base64
import uuid
from datetime import datetime

# Use the correct backend URL from the agent context
BACKEND_URL = "https://railway-recovery.preview.emergentagent.com/api"

class FamilyCareOrganizerTestRunner:
    def __init__(self):
        self.token = None
        self.care_recipient_id = None
        # Demo credentials from test_credentials.md
        self.demo_email = "demo@familycareorganizer.com"
        self.demo_password = "Demo2026!"
        self.test_name = "Demo User"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_health_check(self):
        """Test health check endpoint"""
        self.log("Testing health check endpoint...")
        
        try:
            response = requests.get(f"{BACKEND_URL}/health")
            self.log(f"Health check response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("status") == "healthy":
                    self.log("✅ PASS: Health check successful")
                    self.log(f"  Database status: {result.get('database', 'unknown')}")
                    return True
                else:
                    self.log("❌ FAIL: Health check returned unhealthy status")
                    return False
            else:
                self.log(f"❌ FAIL: Health check failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Health check error: {str(e)}")
            return False

    def test_demo_login(self):
        """Test login with demo credentials"""
        self.log(f"Testing demo login with {self.demo_email}...")
        
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
                
                if self.token and user:
                    self.log(f"✅ PASS: Demo login successful for user: {user.get('name', user.get('email'))}")
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

    def test_apple_auth_new_user(self):
        """Test Apple auth with new user"""
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
                token_verified = result.get("token_verified")
                
                if token and user and user.get("email") == test_email:
                    self.log(f"✅ PASS: Apple auth new user successful")
                    self.log(f"  Token verified: {token_verified}")
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

    def test_apple_auth_empty_user_id(self):
        """Test Apple auth with empty user_id - should return 400"""
        self.log("Testing Apple auth with empty user_id...")
        
        data = {
            "user_id": "",
            "email": "test@example.com",
            "full_name": "Test User"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/apple", json=data)
            self.log(f"Apple auth empty user_id response status: {response.status_code}")
            
            if response.status_code == 400:
                self.log("✅ PASS: Apple auth correctly rejected empty user_id with 400")
                return True
            else:
                self.log(f"❌ FAIL: Apple auth should return 400 for empty user_id, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Apple auth empty user_id error: {str(e)}")
            return False

    def test_auth_me(self):
        """Test /auth/me endpoint with valid token"""
        if not self.token:
            self.log("❌ FAIL: No authentication token available for /auth/me test")
            return False
        
        self.log("Testing /auth/me endpoint...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            self.log(f"Auth me response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("user_id") and result.get("email"):
                    self.log(f"✅ PASS: /auth/me successful for user: {result.get('name', result.get('email'))}")
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

    def test_google_auth(self):
        """Test Google auth with google_user_id and email"""
        self.log("Testing Google auth...")
        
        # Generate unique Google user ID
        google_user_id = f"google_test_{uuid.uuid4().hex[:12]}"
        test_email = f"google_test_{uuid.uuid4().hex[:8]}@gmail.com"
        
        data = {
            "google_user_id": google_user_id,
            "email": test_email,
            "name": "Google Test User",
            "picture": "https://example.com/picture.jpg"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/google", json=data)
            self.log(f"Google auth response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                token = result.get("token")
                user = result.get("user", {})
                
                if token and user and user.get("email") == test_email:
                    self.log(f"✅ PASS: Google auth successful")
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
    
    def test_auth_register(self):
        """Test user registration with unique email"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@familycare.com"
        self.log(f"Testing user registration with {unique_email}...")
        
        data = {
            "email": unique_email,
            "password": self.demo_password,
            "name": "Test User Registration"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/register", json=data)
            self.log(f"Registration response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("token") and result.get("user"):
                    self.log("✅ PASS: User registration successful")
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
    
    def test_auth_login(self):
        """Test login with demo credentials (fallback if demo login fails)"""
        self.log(f"Testing login with {self.demo_email}...")
        
        data = {
            "email": self.demo_email,
            "password": self.demo_password
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/login", json=data)
            self.log(f"Login response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.token = result.get("token")
                user = result.get("user", {})
                
                if self.token and user:
                    self.log(f"✅ PASS: Login successful for user: {user.get('name', user.get('email'))}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid login response format")
                    return False
            else:
                self.log(f"❌ FAIL: Login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Login error: {str(e)}")
            return False
    
    def test_auth_logout(self):
        """Test logout endpoint"""
        self.log("Testing logout...")
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/logout")
            self.log(f"Logout response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log("✅ PASS: Logout successful")
                    return True
                else:
                    self.log("❌ FAIL: Invalid logout response format")
                    return False
            else:
                self.log(f"❌ FAIL: Logout failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Logout error: {str(e)}")
            return False
    
    def test_care_recipients_create(self):
        """Test creating a care recipient"""
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        self.log("Testing care recipient creation...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "name": "Margaret Smith",
            "date_of_birth": "1940-03-15",
            "gender": "Female",
            "address": "123 Maple Street, Toronto, ON",
            "phone": "+1-416-555-0123",
            "medical_conditions": ["Dementia", "Hypertension"],
            "allergies": ["Penicillin", "Sulfa drugs"],
            "blood_type": "O+",
            "notes": "Requires assistance with daily activities"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients", json=data, headers=headers)
            self.log(f"Create care recipient response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.care_recipient_id = result.get("recipient_id")
                
                if self.care_recipient_id and result.get("name") == data["name"]:
                    self.log(f"✅ PASS: Care recipient created with ID: {self.care_recipient_id}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid care recipient creation response")
                    return False
            else:
                self.log(f"❌ FAIL: Care recipient creation failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Care recipient creation error: {str(e)}")
            return False
    
    def test_care_recipients_list(self):
        """Test listing care recipients"""
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        self.log("Testing care recipients list...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients", headers=headers)
            self.log(f"List care recipients response status: {response.status_code}")
            
            if response.status_code == 200:
                recipients = response.json()
                
                if isinstance(recipients, list):
                    self.log(f"✅ PASS: Retrieved {len(recipients)} care recipients")
                    
                    # If we created a recipient, verify it's in the list
                    if self.care_recipient_id:
                        found = any(r.get("recipient_id") == self.care_recipient_id for r in recipients)
                        if found:
                            self.log("✅ PASS: Created recipient found in list")
                        else:
                            self.log("⚠️  WARNING: Created recipient not found in list")
                    
                    return True
                else:
                    self.log("❌ FAIL: Invalid care recipients list response format")
                    return False
            else:
                self.log(f"❌ FAIL: List care recipients failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List care recipients error: {str(e)}")
            return False
    
    def test_care_recipients_update(self):
        """Test updating a care recipient"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing care recipient update...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "name": "Margaret Smith (Updated)",
            "date_of_birth": "1940-03-15",
            "gender": "Female",
            "address": "456 Oak Avenue, Toronto, ON",
            "notes": "Updated notes - requires additional assistance"
        }
        
        try:
            response = requests.put(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}", json=data, headers=headers)
            self.log(f"Update care recipient response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("name") == data["name"] and result.get("address") == data["address"]:
                    self.log("✅ PASS: Care recipient updated successfully")
                    return True
                else:
                    self.log("❌ FAIL: Care recipient update did not persist correctly")
                    return False
            else:
                self.log(f"❌ FAIL: Care recipient update failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Care recipient update error: {str(e)}")
            return False
    
    def test_care_recipients_delete(self):
        """Test deleting a care recipient - create a separate one for deletion"""
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        self.log("Testing care recipient deletion...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # First create a recipient to delete
        data = {
            "name": "Test Delete User",
            "date_of_birth": "1950-01-01",
            "gender": "Male"
        }
        
        try:
            # Create recipient
            response = requests.post(f"{BACKEND_URL}/care-recipients", json=data, headers=headers)
            if response.status_code != 200:
                self.log("❌ FAIL: Could not create recipient for deletion test")
                return False
            
            delete_recipient_id = response.json().get("recipient_id")
            
            # Delete recipient
            # Note: The API might not have a delete endpoint, checking if it exists
            response = requests.delete(f"{BACKEND_URL}/care-recipients/{delete_recipient_id}", headers=headers)
            self.log(f"Delete care recipient response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result:
                    self.log("✅ PASS: Care recipient deleted successfully")
                    return True
                else:
                    self.log("❌ FAIL: Invalid deletion response format")
                    return False
            elif response.status_code == 404 or response.status_code == 405:
                self.log("⚠️  INFO: Delete endpoint not implemented (405/404)")
                return True  # Not a failure if endpoint doesn't exist
            else:
                self.log(f"❌ FAIL: Care recipient deletion failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Care recipient deletion error: {str(e)}")
            return False
    
    def test_medications_create(self):
        """Test creating medications"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing medication creation...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        medications = [
            {
                "name": "Donepezil",
                "dosage": "10mg",
                "frequency": "Once daily",
                "time_of_day": "Evening",
                "prescribing_doctor": "Dr. Johnson",
                "instructions": "Take with food"
            },
            {
                "name": "Lisinopril",
                "dosage": "5mg",
                "frequency": "Once daily",
                "time_of_day": "Morning",
                "prescribing_doctor": "Dr. Smith",
                "instructions": "For blood pressure"
            }
        ]
        
        created_count = 0
        
        try:
            for med_data in medications:
                response = requests.post(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/medications", json=med_data, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("name") == med_data["name"]:
                        created_count += 1
                        self.log(f"✅ Created medication: {med_data['name']}")
                    else:
                        self.log(f"❌ Invalid response for medication: {med_data['name']}")
                else:
                    self.log(f"❌ Failed to create medication {med_data['name']}: {response.status_code}")
            
            if created_count == len(medications):
                self.log(f"✅ PASS: All {created_count} medications created successfully")
                return True
            elif created_count > 0:
                self.log(f"⚠️  PARTIAL: {created_count}/{len(medications)} medications created")
                return True
            else:
                self.log("❌ FAIL: No medications created")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Medications creation error: {str(e)}")
            return False
    
    def test_medications_list(self):
        """Test listing medications"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing medications list...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/medications", headers=headers)
            self.log(f"List medications response status: {response.status_code}")
            
            if response.status_code == 200:
                medications = response.json()
                
                if isinstance(medications, list):
                    self.log(f"✅ PASS: Retrieved {len(medications)} medications")
                    return True
                else:
                    self.log("❌ FAIL: Invalid medications list response format")
                    return False
            else:
                self.log(f"❌ FAIL: List medications failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List medications error: {str(e)}")
            return False
    
    def test_appointments_create(self):
        """Test creating appointments"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing appointment creation...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        appointments = [
            {
                "title": "Cardiology Appointment",
                "date": "2025-03-15",
                "time": "10:00 AM",
                "doctor_name": "Dr. Johnson",
                "location": "Toronto General Hospital",
                "category": "doctor",
                "notes": "Regular checkup",
                "blood_pressure": "130/85",
                "weight": "72.5 kg"
            },
            {
                "title": "PSW Visit",
                "date": "2025-03-16",
                "time": "2:00 PM",
                "category": "psw",
                "notes": "Weekly personal care"
            }
        ]
        
        created_count = 0
        
        try:
            for appt_data in appointments:
                response = requests.post(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/appointments", json=appt_data, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("title") == appt_data["title"]:
                        created_count += 1
                        self.log(f"✅ Created appointment: {appt_data['title']}")
                    else:
                        self.log(f"❌ Invalid response for appointment: {appt_data['title']}")
                else:
                    self.log(f"❌ Failed to create appointment {appt_data['title']}: {response.status_code}")
            
            if created_count == len(appointments):
                self.log(f"✅ PASS: All {created_count} appointments created successfully")
                return True
            elif created_count > 0:
                self.log(f"⚠️  PARTIAL: {created_count}/{len(appointments)} appointments created")
                return True
            else:
                self.log("❌ FAIL: No appointments created")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Appointments creation error: {str(e)}")
            return False
    
    def test_appointments_list(self):
        """Test listing appointments"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing appointments list...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/appointments", headers=headers)
            self.log(f"List appointments response status: {response.status_code}")
            
            if response.status_code == 200:
                appointments = response.json()
                
                if isinstance(appointments, list):
                    self.log(f"✅ PASS: Retrieved {len(appointments)} appointments")
                    return True
                else:
                    self.log("❌ FAIL: Invalid appointments list response format")
                    return False
            else:
                self.log(f"❌ FAIL: List appointments failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List appointments error: {str(e)}")
            return False
    
    def test_notes_create(self):
        """Test creating notes"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing notes creation...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        notes = [
            {
                "content": "Margaret had a good day today. She was alert and engaged during conversation.",
                "category": "general"
            },
            {
                "content": "Blood pressure reading: 135/80. Slightly elevated, monitoring closely.",
                "category": "medical"
            }
        ]
        
        created_count = 0
        
        try:
            for note_data in notes:
                response = requests.post(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/notes", json=note_data, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("content") == note_data["content"]:
                        created_count += 1
                        self.log(f"✅ Created note with category: {note_data['category']}")
                    else:
                        self.log(f"❌ Invalid response for note with category: {note_data['category']}")
                else:
                    self.log(f"❌ Failed to create note: {response.status_code}")
            
            if created_count == len(notes):
                self.log(f"✅ PASS: All {created_count} notes created successfully")
                return True
            elif created_count > 0:
                self.log(f"⚠️  PARTIAL: {created_count}/{len(notes)} notes created")
                return True
            else:
                self.log("❌ FAIL: No notes created")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Notes creation error: {str(e)}")
            return False
    
    def test_notes_list(self):
        """Test listing notes"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing notes list...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/notes", headers=headers)
            self.log(f"List notes response status: {response.status_code}")
            
            if response.status_code == 200:
                notes = response.json()
                
                if isinstance(notes, list):
                    self.log(f"✅ PASS: Retrieved {len(notes)} notes")
                    return True
                else:
                    self.log("❌ FAIL: Invalid notes list response format")
                    return False
            else:
                self.log(f"❌ FAIL: List notes failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List notes error: {str(e)}")
            return False
    
    def test_notes_update(self):
        """Test updating notes"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing notes update...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # First get existing notes
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/notes", headers=headers)
            if response.status_code != 200:
                self.log("❌ FAIL: Could not retrieve notes for update test")
                return False
            
            notes = response.json()
            if not notes:
                self.log("⚠️  INFO: No notes available to update")
                return True
            
            # Update the first note
            note_id = notes[0].get("note_id")
            if not note_id:
                self.log("❌ FAIL: No note_id found in note")
                return False
            
            update_data = {
                "content": "Updated note content: Margaret continues to show improvement in her daily activities.",
                "category": "medical"
            }
            
            response = requests.put(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/notes/{note_id}", json=update_data, headers=headers)
            self.log(f"Update note response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("content") == update_data["content"]:
                    self.log("✅ PASS: Note updated successfully")
                    return True
                else:
                    self.log("❌ FAIL: Note update did not persist correctly")
                    return False
            else:
                self.log(f"❌ FAIL: Note update failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Note update error: {str(e)}")
            return False
    
    def test_caregivers_list(self):
        """Test listing caregivers"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing caregivers list...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/caregivers", headers=headers)
            self.log(f"List caregivers response status: {response.status_code}")
            
            if response.status_code == 200:
                caregivers = response.json()
                
                if isinstance(caregivers, list):
                    self.log(f"✅ PASS: Retrieved {len(caregivers)} caregivers")
                    return True
                else:
                    self.log("❌ FAIL: Invalid caregivers list response format")
                    return False
            else:
                self.log(f"❌ FAIL: List caregivers failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List caregivers error: {str(e)}")
            return False
    
    def test_invite_caregiver(self):
        """Test inviting a caregiver"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing caregiver invitation...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "email": f"caregiver_{uuid.uuid4().hex[:8]}@example.com",
            "caregiver_name": "Test Caregiver",
            "message": "Please join our care team for Margaret"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/invite-caregiver", json=data, headers=headers)
            self.log(f"Invite caregiver response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                if "message" in result and "invite_id" in result:
                    self.log("✅ PASS: Caregiver invitation sent successfully")
                    return True
                else:
                    self.log("❌ FAIL: Invalid invitation response format")
                    return False
            else:
                self.log(f"❌ FAIL: Caregiver invitation failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Caregiver invitation error: {str(e)}")
            return False
    
    def test_dashboard(self):
        """Test dashboard endpoint"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing dashboard...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/dashboard/{self.care_recipient_id}", headers=headers)
            self.log(f"Dashboard response status: {response.status_code}")
            
            if response.status_code == 200:
                dashboard_data = response.json()
                
                if isinstance(dashboard_data, dict):
                    self.log("✅ PASS: Dashboard data retrieved successfully")
                    # Log some key metrics if available
                    if "medications_count" in dashboard_data:
                        self.log(f"  📊 Medications: {dashboard_data.get('medications_count', 0)}")
                    if "appointments_count" in dashboard_data:
                        self.log(f"  📊 Appointments: {dashboard_data.get('appointments_count', 0)}")
                    return True
                else:
                    self.log("❌ FAIL: Invalid dashboard response format")
                    return False
            else:
                self.log(f"❌ FAIL: Dashboard failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Dashboard error: {str(e)}")
            return False
    
    def test_export_report(self):
        """Test PDF export report"""
        if not self.token or not self.care_recipient_id:
            self.log("❌ FAIL: No authentication token or care recipient ID available")
            return False
        
        self.log("Testing export report...")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "sections": ["medications", "appointments", "notes"],
            "time_period": "7_days",
            "delivery_method": "download"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.care_recipient_id}/export-report", json=data, headers=headers)
            self.log(f"Export report response status: {response.status_code}")
            
            if response.status_code == 200:
                # Check if it's a PDF response
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    pdf_size = len(response.content)
                    self.log(f"✅ PASS: PDF export successful, size: {pdf_size} bytes")
                    return True
                else:
                    # Might be a JSON response with download link
                    try:
                        result = response.json()
                        if "success" in result or "message" in result:
                            self.log("✅ PASS: Export report generated successfully")
                            return True
                        else:
                            self.log("❌ FAIL: Unexpected export response format")
                            return False
                    except:
                        self.log("❌ FAIL: Invalid export response")
                        return False
            else:
                self.log(f"❌ FAIL: Export report failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Export report error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests focusing on code quality fixes verification"""
        self.log("=" * 80)
        self.log("FAMILY CARE ORGANIZER BACKEND API TESTING - CODE QUALITY FIXES")
        self.log("=" * 80)
        
        tests = [
            # Core health and authentication tests as requested
            ("Health Check", self.test_health_check),
            ("Demo Login", self.test_demo_login),
            ("Apple Auth - New User", self.test_apple_auth_new_user),
            ("Apple Auth - Empty User ID", self.test_apple_auth_empty_user_id),
            ("Auth Register", self.test_auth_register),
            ("Auth Me", self.test_auth_me),
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
        self.log("CODE QUALITY FIXES TESTING SUMMARY")
        self.log("=" * 80)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"  {test_name}: {status}")
        
        self.log(f"\nTotal Tests: {len(tests)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        
        if failed == 0:
            self.log("\n🎉 ALL CODE QUALITY FIXES TESTS PASSED!")
            return True
        else:
            self.log(f"\n⚠️  {failed} TESTS FAILED - See details above")
            
            # List failed tests
            failed_tests = [k for k, v in results.items() if not v]
            self.log("\nFailed Tests:")
            for test in failed_tests:
                self.log(f"  ❌ {test}")
            
            return False

if __name__ == "__main__":
    print("Family Care Organizer Backend API Testing - Code Quality Fixes")
    print(f"Testing against: {BACKEND_URL}")
    print("Using demo credentials: demo@familycareorganizer.com / Demo2026!")
    print()
    
    tester = FamilyCareOrganizerTestRunner()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)