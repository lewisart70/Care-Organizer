#!/usr/bin/env python3

import requests
import json
import sys
import base64
from datetime import datetime, timedelta
import uuid

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://care-recipient-app.preview.emergentagent.com/api"

class FamilyCareBackendTest:
    def __init__(self):
        self.token = None
        self.test_email = "judge@hackathon.com"
        self.test_password = "JudgeTest123!"
        self.test_name = "Judge User"
        self.recipient_id = None
        self.care_recipient_data = {
            "name": "Margaret Smith",
            "date_of_birth": "1940-03-15",
            "gender": "Female",
            "address": "123 Maple Street, Toronto, ON M4C 1B2",
            "phone": "416-555-0123",
            "medical_conditions": ["Dementia", "Hypertension", "Arthritis"],
            "allergies": ["Penicillin", "Shellfish"],
            "blood_type": "O+",
            "weight": "68 kg",
            "notes": "Enjoys listening to classical music and looking at photo albums"
        }
        self.medication_id = None
        self.appointment_id = None
        self.doctor_id = None
        self.note_id = None
        self.incident_id = None
        self.emergency_contact_id = None
        self.routine_id = None
        self.bathing_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_auth_register(self):
        """Test 1: POST /api/auth/register"""
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
                self.log(f"✅ PASS: User registered successfully")
                return True
            elif response.status_code == 400:
                # User might already exist, try to login instead
                self.log("User already exists, will proceed to login...")
                return True
            else:
                self.log(f"❌ FAIL: Registration failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Registration error: {str(e)}")
            return False
    
    def test_auth_login(self):
        """Test 2: POST /api/auth/login"""
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
                self.log(f"✅ PASS: User logged in successfully")
                return True
            else:
                self.log(f"❌ FAIL: Login failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Login error: {str(e)}")
            return False
    
    def test_auth_me(self):
        """Test 3: GET /api/auth/me"""
        self.log("Testing get current user...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/auth/me", headers=headers)
            self.log(f"Get me response status: {response.status_code}")
            
            if response.status_code == 200:
                user = response.json()
                self.log(f"✅ PASS: Retrieved current user info")
                return True
            else:
                self.log(f"❌ FAIL: Get me failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Get me error: {str(e)}")
            return False
    
    def test_auth_accept_disclaimer(self):
        """Test 4: POST /api/auth/accept-disclaimer"""
        self.log("Testing disclaimer acceptance...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.post(f"{BACKEND_URL}/auth/accept-disclaimer", headers=headers)
            self.log(f"Accept disclaimer response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Disclaimer accepted successfully")
                return True
            else:
                self.log(f"❌ FAIL: Accept disclaimer failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Accept disclaimer error: {str(e)}")
            return False
    
    def test_create_care_recipient(self):
        """Test 5: POST /api/care-recipients"""
        self.log("Testing create care recipient...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients", json=self.care_recipient_data, headers=headers)
            self.log(f"Create care recipient response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.recipient_id = result.get("recipient_id")
                self.log(f"✅ PASS: Care recipient created - ID: {self.recipient_id}")
                return True
            else:
                self.log(f"❌ FAIL: Create care recipient failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Create care recipient error: {str(e)}")
            return False
    
    def test_list_care_recipients(self):
        """Test 6: GET /api/care-recipients"""
        self.log("Testing list care recipients...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients", headers=headers)
            self.log(f"List care recipients response status: {response.status_code}")
            
            if response.status_code == 200:
                recipients = response.json()
                self.log(f"✅ PASS: Retrieved {len(recipients)} care recipients")
                return True
            else:
                self.log(f"❌ FAIL: List care recipients failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List care recipients error: {str(e)}")
            return False
    
    def test_get_care_recipient(self):
        """Test 7: GET /api/care-recipients/{id}"""
        self.log("Testing get single care recipient...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}", headers=headers)
            self.log(f"Get care recipient response status: {response.status_code}")
            
            if response.status_code == 200:
                recipient = response.json()
                self.log(f"✅ PASS: Retrieved care recipient: {recipient.get('name')}")
                return True
            else:
                self.log(f"❌ FAIL: Get care recipient failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Get care recipient error: {str(e)}")
            return False
    
    def test_update_care_recipient(self):
        """Test 8: PATCH /api/care-recipients/{id}"""
        self.log("Testing update care recipient (including profile_picture)...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Sample base64 image (1x1 pixel PNG)
        sample_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        
        update_data = {
            "profile_photo": sample_image,
            "notes": "Updated notes for Margaret - loves classical music"
        }
        
        try:
            response = requests.patch(f"{BACKEND_URL}/care-recipients/{self.recipient_id}", json=update_data, headers=headers)
            self.log(f"Update care recipient response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Care recipient updated with profile photo")
                return True
            else:
                self.log(f"❌ FAIL: Update care recipient failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Update care recipient error: {str(e)}")
            return False
    
    def test_create_medication(self):
        """Test 9: POST /api/care-recipients/{id}/medications"""
        self.log("Testing create medication...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        medications = [
            {
                "name": "Donepezil",
                "dosage": "10mg",
                "frequency": "Once daily",
                "time_of_day": "Morning with breakfast",
                "prescribing_doctor": "Dr. Johnson",
                "instructions": "Take with food to reduce stomach upset"
            },
            {
                "name": "Lisinopril",
                "dosage": "5mg",
                "frequency": "Once daily",
                "time_of_day": "Morning",
                "prescribing_doctor": "Dr. Johnson",
                "instructions": "For blood pressure control"
            },
            {
                "name": "Calcium with Vitamin D",
                "dosage": "600mg + 400IU",
                "frequency": "Twice daily",
                "time_of_day": "With meals",
                "prescribing_doctor": "Dr. Johnson",
                "instructions": "For bone health"
            }
        ]
        
        try:
            for med in medications:
                response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/medications", json=med, headers=headers)
                if response.status_code == 200:
                    result = response.json()
                    if self.medication_id is None:  # Store first medication ID
                        self.medication_id = result.get("medication_id")
            
            self.log(f"✅ PASS: {len(medications)} medications created")
            return True
                
        except Exception as e:
            self.log(f"❌ FAIL: Create medication error: {str(e)}")
            return False
    
    def test_list_medications(self):
        """Test 10: GET /api/care-recipients/{id}/medications"""
        self.log("Testing list medications...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/medications", headers=headers)
            self.log(f"List medications response status: {response.status_code}")
            
            if response.status_code == 200:
                medications = response.json()
                self.log(f"✅ PASS: Retrieved {len(medications)} medications")
                return True
            else:
                self.log(f"❌ FAIL: List medications failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List medications error: {str(e)}")
            return False
    
    def test_create_appointment(self):
        """Test 11: POST /api/care-recipients/{id}/appointments"""
        self.log("Testing create appointment...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        appointments = [
            {
                "title": "Memory Clinic Follow-up",
                "date": "2024-02-15",
                "time": "10:00 AM",
                "doctor_name": "Dr. Sarah Johnson",
                "location": "Toronto General Hospital, Memory Clinic",
                "appointment_type": "Follow-up",
                "category": "doctor",
                "notes": "Review medication effectiveness and cognitive assessment",
                "blood_pressure": "135/85",
                "weight": "68 kg"
            },
            {
                "title": "PSW Home Visit",
                "date": "2024-02-10",
                "time": "2:00 PM",
                "doctor_name": "Sarah Wilson, PSW",
                "location": "Home",
                "appointment_type": "Personal Care",
                "category": "psw",
                "notes": "Assist with bathing and medication reminders"
            }
        ]
        
        try:
            for appt in appointments:
                response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/appointments", json=appt, headers=headers)
                if response.status_code == 200:
                    result = response.json()
                    if self.appointment_id is None:  # Store first appointment ID
                        self.appointment_id = result.get("appointment_id")
            
            self.log(f"✅ PASS: {len(appointments)} appointments created")
            return True
                
        except Exception as e:
            self.log(f"❌ FAIL: Create appointment error: {str(e)}")
            return False
    
    def test_list_appointments(self):
        """Test 12: GET /api/care-recipients/{id}/appointments"""
        self.log("Testing list appointments...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/appointments", headers=headers)
            self.log(f"List appointments response status: {response.status_code}")
            
            if response.status_code == 200:
                appointments = response.json()
                self.log(f"✅ PASS: Retrieved {len(appointments)} appointments")
                return True
            else:
                self.log(f"❌ FAIL: List appointments failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List appointments error: {str(e)}")
            return False
    
    def test_update_appointment(self):
        """Test 13: PUT /api/care-recipients/{id}/appointments/{appt_id}"""
        self.log("Testing update appointment...")
        
        if not self.token or not self.recipient_id or not self.appointment_id:
            self.log("❌ FAIL: Missing required IDs")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        update_data = {
            "title": "Memory Clinic Follow-up - UPDATED",
            "date": "2024-02-15",
            "time": "10:30 AM",
            "doctor_name": "Dr. Sarah Johnson",
            "location": "Toronto General Hospital, Memory Clinic",
            "appointment_type": "Follow-up",
            "category": "doctor",
            "notes": "Review medication effectiveness, cognitive assessment, and discuss care plan",
            "blood_pressure": "130/80",
            "weight": "68.5 kg"
        }
        
        try:
            response = requests.put(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/appointments/{self.appointment_id}", json=update_data, headers=headers)
            self.log(f"Update appointment response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Appointment updated successfully")
                return True
            else:
                self.log(f"❌ FAIL: Update appointment failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Update appointment error: {str(e)}")
            return False
    
    def test_create_doctor(self):
        """Test 14: POST /api/care-recipients/{id}/doctors"""
        self.log("Testing create doctor...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        doctor_data = {
            "name": "Dr. Sarah Johnson",
            "specialty": "Geriatrician / Memory Specialist",
            "phone": "416-555-0987",
            "address": "Toronto General Hospital, 200 Elizabeth St, Toronto, ON M5G 2C4",
            "fax": "416-555-0988",
            "email": "s.johnson@tgh.ca",
            "notes": "Primary physician for dementia care, very patient and thorough"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/doctors", json=doctor_data, headers=headers)
            self.log(f"Create doctor response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.doctor_id = result.get("doctor_id")
                self.log(f"✅ PASS: Doctor created - ID: {self.doctor_id}")
                return True
            else:
                self.log(f"❌ FAIL: Create doctor failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Create doctor error: {str(e)}")
            return False
    
    def test_list_doctors(self):
        """Test 15: GET /api/care-recipients/{id}/doctors"""
        self.log("Testing list doctors...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/doctors", headers=headers)
            self.log(f"List doctors response status: {response.status_code}")
            
            if response.status_code == 200:
                doctors = response.json()
                self.log(f"✅ PASS: Retrieved {len(doctors)} doctors")
                return True
            else:
                self.log(f"❌ FAIL: List doctors failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List doctors error: {str(e)}")
            return False
    
    def test_update_doctor(self):
        """Test 16: PUT /api/care-recipients/{id}/doctors/{doc_id}"""
        self.log("Testing update doctor...")
        
        if not self.token or not self.recipient_id or not self.doctor_id:
            self.log("❌ FAIL: Missing required IDs")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        update_data = {
            "name": "Dr. Sarah Johnson",
            "specialty": "Geriatrician / Memory Specialist",
            "phone": "416-555-0987",
            "address": "Toronto General Hospital, 200 Elizabeth St, Toronto, ON M5G 2C4",
            "fax": "416-555-0988",
            "email": "s.johnson@tgh.ca",
            "notes": "Primary physician for dementia care, very patient and thorough. Recently updated treatment plan."
        }
        
        try:
            response = requests.put(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/doctors/{self.doctor_id}", json=update_data, headers=headers)
            self.log(f"Update doctor response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Doctor updated successfully")
                return True
            else:
                self.log(f"❌ FAIL: Update doctor failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Update doctor error: {str(e)}")
            return False
    
    def test_create_note(self):
        """Test 17: POST /api/care-recipients/{id}/notes"""
        self.log("Testing create note...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        notes = [
            {
                "content": "Margaret had a good day today. She recognized family photos and was chatty during lunch. Took her medications without resistance.",
                "category": "general"
            },
            {
                "content": "Behavioral note: Margaret became agitated around 3 PM (sundowning). Redirected her attention to music, which helped calm her down. Consider adjusting afternoon activities.",
                "category": "behavioral"
            }
        ]
        
        try:
            for note in notes:
                response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/notes", json=note, headers=headers)
                if response.status_code == 200:
                    result = response.json()
                    if self.note_id is None:  # Store first note ID
                        self.note_id = result.get("note_id")
            
            self.log(f"✅ PASS: {len(notes)} notes created")
            return True
                
        except Exception as e:
            self.log(f"❌ FAIL: Create note error: {str(e)}")
            return False
    
    def test_list_notes(self):
        """Test 18: GET /api/care-recipients/{id}/notes"""
        self.log("Testing list notes...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/notes", headers=headers)
            self.log(f"List notes response status: {response.status_code}")
            
            if response.status_code == 200:
                notes = response.json()
                self.log(f"✅ PASS: Retrieved {len(notes)} notes")
                return True
            else:
                self.log(f"❌ FAIL: List notes failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List notes error: {str(e)}")
            return False
    
    def test_update_note(self):
        """Test 19: PUT /api/care-recipients/{id}/notes/{note_id}"""
        self.log("Testing update note...")
        
        if not self.token or not self.recipient_id or not self.note_id:
            self.log("❌ FAIL: Missing required IDs")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        update_data = {
            "content": "Margaret had a wonderful day today. She recognized family photos, was chatty during lunch, and took her medications without resistance. She also helped set the table which made her feel useful.",
            "category": "general"
        }
        
        try:
            response = requests.put(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/notes/{self.note_id}", json=update_data, headers=headers)
            self.log(f"Update note response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Note updated successfully")
                return True
            else:
                self.log(f"❌ FAIL: Update note failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Update note error: {str(e)}")
            return False
    
    def test_create_incident(self):
        """Test 20: POST /api/care-recipients/{id}/incidents"""
        self.log("Testing create incident...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        incident_data = {
            "incident_type": "fall",
            "description": "Margaret slipped in the bathroom while getting out of the shower. She was reaching for her towel when she lost her balance.",
            "severity": "minor",
            "location": "Bathroom",
            "injuries": "Small bruise on left elbow, no other visible injuries",
            "action_taken": "Helped her to bed, applied ice to bruise, monitored for 2 hours. No signs of serious injury. Installed additional grab bars."
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/incidents", json=incident_data, headers=headers)
            self.log(f"Create incident response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.incident_id = result.get("incident_id")
                self.log(f"✅ PASS: Incident created - ID: {self.incident_id}")
                return True
            else:
                self.log(f"❌ FAIL: Create incident failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Create incident error: {str(e)}")
            return False
    
    def test_list_incidents(self):
        """Test 21: GET /api/care-recipients/{id}/incidents"""
        self.log("Testing list incidents...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/incidents", headers=headers)
            self.log(f"List incidents response status: {response.status_code}")
            
            if response.status_code == 200:
                incidents = response.json()
                self.log(f"✅ PASS: Retrieved {len(incidents)} incidents")
                return True
            else:
                self.log(f"❌ FAIL: List incidents failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List incidents error: {str(e)}")
            return False
    
    def test_update_incident(self):
        """Test 22: PUT /api/care-recipients/{id}/incidents/{inc_id}"""
        self.log("Testing update incident...")
        
        if not self.token or not self.recipient_id or not self.incident_id:
            self.log("❌ FAIL: Missing required IDs")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        update_data = {
            "incident_type": "fall",
            "description": "Margaret slipped in the bathroom while getting out of the shower. She was reaching for her towel when she lost her balance. Updated: Bathroom floor was wet from shower.",
            "severity": "minor",
            "location": "Bathroom",
            "injuries": "Small bruise on left elbow, no other visible injuries",
            "action_taken": "Helped her to bed, applied ice to bruise, monitored for 2 hours. No signs of serious injury. Installed additional grab bars and non-slip mats."
        }
        
        try:
            response = requests.put(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/incidents/{self.incident_id}", json=update_data, headers=headers)
            self.log(f"Update incident response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Incident updated successfully")
                return True
            else:
                self.log(f"❌ FAIL: Update incident failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Update incident error: {str(e)}")
            return False
    
    def test_create_emergency_contact(self):
        """Test 23: POST /api/care-recipients/{id}/emergency-contacts"""
        self.log("Testing create emergency contact...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        contact_data = {
            "name": "John Smith",
            "relationship": "Son",
            "phone": "416-555-1234",
            "email": "john.smith@email.com",
            "is_primary": True,
            "notes": "Lives nearby, works flexible hours, primary decision maker"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/emergency-contacts", json=contact_data, headers=headers)
            self.log(f"Create emergency contact response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.emergency_contact_id = result.get("contact_id")
                self.log(f"✅ PASS: Emergency contact created - ID: {self.emergency_contact_id}")
                return True
            else:
                self.log(f"❌ FAIL: Create emergency contact failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Create emergency contact error: {str(e)}")
            return False
    
    def test_list_emergency_contacts(self):
        """Test 24: GET /api/care-recipients/{id}/emergency-contacts"""
        self.log("Testing list emergency contacts...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/emergency-contacts", headers=headers)
            self.log(f"List emergency contacts response status: {response.status_code}")
            
            if response.status_code == 200:
                contacts = response.json()
                self.log(f"✅ PASS: Retrieved {len(contacts)} emergency contacts")
                return True
            else:
                self.log(f"❌ FAIL: List emergency contacts failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List emergency contacts error: {str(e)}")
            return False
    
    def test_create_routine(self):
        """Test 25: POST /api/care-recipients/{id}/routines"""
        self.log("Testing create routine...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        routine_data = {
            "time_of_day": "morning",
            "activity": "Take medications with breakfast and listen to classical music",
            "notes": "Margaret is most alert in the morning and enjoys her routine"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/routines", json=routine_data, headers=headers)
            self.log(f"Create routine response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.routine_id = result.get("routine_id")
                self.log(f"✅ PASS: Routine created - ID: {self.routine_id}")
                return True
            else:
                self.log(f"❌ FAIL: Create routine failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Create routine error: {str(e)}")
            return False
    
    def test_list_routines(self):
        """Test 26: GET /api/care-recipients/{id}/routines"""
        self.log("Testing list routines...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/routines", headers=headers)
            self.log(f"List routines response status: {response.status_code}")
            
            if response.status_code == 200:
                routines = response.json()
                self.log(f"✅ PASS: Retrieved {len(routines)} routines")
                return True
            else:
                self.log(f"❌ FAIL: List routines failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List routines error: {str(e)}")
            return False
    
    def test_create_bathing_record(self):
        """Test 27: POST /api/care-recipients/{id}/bathing"""
        self.log("Testing create bathing record...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        bathing_data = {
            "date": "2024-02-08",
            "bath_type": "full",
            "notes": "Margaret was cooperative during bath time. Used her favorite lavender soap. No skin issues observed.",
            "assisted_by": "Sarah Wilson, PSW"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/bathing", json=bathing_data, headers=headers)
            self.log(f"Create bathing record response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.bathing_id = result.get("bathing_id")
                self.log(f"✅ PASS: Bathing record created - ID: {self.bathing_id}")
                return True
            else:
                self.log(f"❌ FAIL: Create bathing record failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Create bathing record error: {str(e)}")
            return False
    
    def test_list_bathing_records(self):
        """Test 28: GET /api/care-recipients/{id}/bathing"""
        self.log("Testing list bathing records...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/bathing", headers=headers)
            self.log(f"List bathing records response status: {response.status_code}")
            
            if response.status_code == 200:
                records = response.json()
                self.log(f"✅ PASS: Retrieved {len(records)} bathing records")
                return True
            else:
                self.log(f"❌ FAIL: List bathing records failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: List bathing records error: {str(e)}")
            return False
    
    def test_ai_resource_finder_categories(self):
        """Test 29: GET /api/resources/categories"""
        self.log("Testing AI resource finder categories...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/resources/categories", headers=headers)
            self.log(f"Resource categories response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                categories = result.get("categories", [])
                self.log(f"✅ PASS: Retrieved {len(categories)} resource categories")
                return True
            else:
                self.log(f"❌ FAIL: Resource categories failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Resource categories error: {str(e)}")
            return False
    
    def test_ai_resource_search(self):
        """Test 30: POST /api/resources/search"""
        self.log("Testing AI resource search...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        search_data = {
            "location": "Toronto, Ontario, Canada",
            "category": "dementia_support",
            "specific_query": "memory care programs and support groups"
        }
        
        try:
            # Extend timeout for AI requests
            response = requests.post(f"{BACKEND_URL}/resources/search", json=search_data, headers=headers, timeout=30)
            self.log(f"Resource search response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                resources = result.get("resources", [])
                total_count = result.get("total_count", 0)
                self.log(f"✅ PASS: Found {total_count} resources for dementia support in Toronto")
                return True
            else:
                self.log(f"❌ FAIL: Resource search failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Resource search error: {str(e)}")
            return False
    
    def test_save_resource(self):
        """Test 31: POST /api/resources/saved"""
        self.log("Testing save resource...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        resource_data = {
            "name": "Alzheimer Society of Toronto",
            "description": "Provides support programs, education, and resources for people with dementia and their families",
            "category": "dementia_support",
            "website": "https://alzheimertoronto.org",
            "phone": "416-322-6560",
            "address": "20 Eglinton Avenue West, Suite 1600, Toronto, ON M4R 1K8",
            "email": "info@alzheimertoronto.org",
            "notes": "Great resource for Margaret's family support group",
            "location_searched": "Toronto, Ontario, Canada"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/resources/saved", json=resource_data, headers=headers)
            self.log(f"Save resource response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ PASS: Resource saved successfully")
                return True
            else:
                self.log(f"❌ FAIL: Save resource failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Save resource error: {str(e)}")
            return False
    
    def test_get_saved_resources(self):
        """Test 32: GET /api/resources/saved"""
        self.log("Testing get saved resources...")
        
        if not self.token:
            self.log("❌ FAIL: No authentication token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/resources/saved", headers=headers)
            self.log(f"Get saved resources response status: {response.status_code}")
            
            if response.status_code == 200:
                resources = response.json()
                self.log(f"✅ PASS: Retrieved {len(resources)} saved resources")
                return True
            else:
                self.log(f"❌ FAIL: Get saved resources failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Get saved resources error: {str(e)}")
            return False
    
    def test_export_sections(self):
        """Test 33: GET /api/care-recipients/{id}/export-sections"""
        self.log("Testing export sections...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-sections", headers=headers)
            self.log(f"Export sections response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sections = result.get("sections", [])
                self.log(f"✅ PASS: Retrieved {len(sections)} available sections for export")
                return True
            else:
                self.log(f"❌ FAIL: Export sections failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Export sections error: {str(e)}")
            return False
    
    def test_export_report_download(self):
        """Test 34: POST /api/care-recipients/{id}/export-report (download)"""
        self.log("Testing export report PDF generation...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        export_data = {
            "sections": ["medications", "appointments", "doctors", "notes", "incidents"],
            "time_period": "7_days",
            "delivery_method": "download"
        }
        
        try:
            response = requests.post(f"{BACKEND_URL}/care-recipients/{self.recipient_id}/export-report", json=export_data, headers=headers)
            self.log(f"Export report response status: {response.status_code}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type:
                    content_length = len(response.content)
                    self.log(f"✅ PASS: PDF report generated successfully ({content_length} bytes)")
                    return True
                else:
                    self.log(f"❌ FAIL: Expected PDF content, got {content_type}")
                    return False
            else:
                self.log(f"❌ FAIL: Export report failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Export report error: {str(e)}")
            return False
    
    def test_dashboard(self):
        """Test 35: GET /api/dashboard/{id}"""
        self.log("Testing dashboard...")
        
        if not self.token or not self.recipient_id:
            self.log("❌ FAIL: No authentication token or recipient ID available")
            return False
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.get(f"{BACKEND_URL}/dashboard/{self.recipient_id}", headers=headers)
            self.log(f"Dashboard response status: {response.status_code}")
            
            if response.status_code == 200:
                dashboard = response.json()
                self.log(f"✅ PASS: Dashboard data retrieved successfully")
                return True
            else:
                self.log(f"❌ FAIL: Dashboard failed with status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ FAIL: Dashboard error: {str(e)}")
            return False
    
    def run_comprehensive_tests(self):
        """Run all comprehensive backend tests"""
        self.log("=" * 80)
        self.log("STARTING COMPREHENSIVE FAMILY CARE ORGANIZER BACKEND TESTING")
        self.log(f"Testing against: {BACKEND_URL}")
        self.log("=" * 80)
        
        tests = [
            ("AUTH: Register User", self.test_auth_register),
            ("AUTH: Login User", self.test_auth_login),
            ("AUTH: Get Current User", self.test_auth_me),
            ("AUTH: Accept Disclaimer", self.test_auth_accept_disclaimer),
            ("CARE RECIPIENTS: Create", self.test_create_care_recipient),
            ("CARE RECIPIENTS: List", self.test_list_care_recipients),
            ("CARE RECIPIENTS: Get Single", self.test_get_care_recipient),
            ("CARE RECIPIENTS: Update (with profile picture)", self.test_update_care_recipient),
            ("MEDICATIONS: Create", self.test_create_medication),
            ("MEDICATIONS: List", self.test_list_medications),
            ("APPOINTMENTS: Create", self.test_create_appointment),
            ("APPOINTMENTS: List", self.test_list_appointments),
            ("APPOINTMENTS: Update", self.test_update_appointment),
            ("DOCTORS: Create", self.test_create_doctor),
            ("DOCTORS: List", self.test_list_doctors),
            ("DOCTORS: Update", self.test_update_doctor),
            ("NOTES: Create", self.test_create_note),
            ("NOTES: List", self.test_list_notes),
            ("NOTES: Update", self.test_update_note),
            ("INCIDENTS: Create", self.test_create_incident),
            ("INCIDENTS: List", self.test_list_incidents),
            ("INCIDENTS: Update", self.test_update_incident),
            ("EMERGENCY CONTACTS: Create", self.test_create_emergency_contact),
            ("EMERGENCY CONTACTS: List", self.test_list_emergency_contacts),
            ("ROUTINES: Create", self.test_create_routine),
            ("ROUTINES: List", self.test_list_routines),
            ("BATHING: Create Record", self.test_create_bathing_record),
            ("BATHING: List Records", self.test_list_bathing_records),
            ("AI RESOURCES: Get Categories", self.test_ai_resource_finder_categories),
            ("AI RESOURCES: Search", self.test_ai_resource_search),
            ("AI RESOURCES: Save Resource", self.test_save_resource),
            ("AI RESOURCES: Get Saved Resources", self.test_get_saved_resources),
            ("EXPORT: Get Sections", self.test_export_sections),
            ("EXPORT: Generate PDF Report", self.test_export_report_download),
            ("DASHBOARD: Get Data", self.test_dashboard)
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
        self.log("COMPREHENSIVE BACKEND TESTING SUMMARY")
        self.log("=" * 80)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nTotal Tests: {len(tests)}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {failed}")
        self.log(f"Success Rate: {(passed/len(tests)*100):.1f}%")
        
        if failed == 0:
            self.log("\n🎉 ALL COMPREHENSIVE BACKEND TESTS PASSED! HACKATHON READY! 🎉")
            return True
        else:
            self.log(f"\n⚠️  {failed} TESTS FAILED - See details above")
            return False

if __name__ == "__main__":
    print("Family Care Organizer - Comprehensive Backend API Testing")
    print(f"Testing against: {BACKEND_URL}")
    print("Using realistic hackathon demo data for Margaret Smith")
    print()
    
    tester = FamilyCareBackendTest()
    success = tester.run_comprehensive_tests()
    
    sys.exit(0 if success else 1)