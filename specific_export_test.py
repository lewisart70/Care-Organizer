#!/usr/bin/env python3

import requests
import json
import sys

# Use the correct backend URL from frontend .env
BACKEND_URL = "https://railway-recovery.preview.emergentagent.com/api"

def log(message):
    print(f"[INFO] {message}")

def test_specific_export_scenario():
    """Test the exact scenario from the review request"""
    log("Testing the specific Export Report PDF scenario from review request")
    
    # 1. Register/login user
    auth_data = {
        "email": "specifictest@test.com",
        "password": "Test123!",
        "name": "Specific Test User"
    }
    
    # Try login first, then register if needed
    response = requests.post(f"{BACKEND_URL}/auth/login", json={"email": auth_data["email"], "password": auth_data["password"]})
    if response.status_code != 200:
        # Register if login fails
        response = requests.post(f"{BACKEND_URL}/auth/register", json=auth_data)
        if response.status_code != 200:
            log(f"❌ Failed to authenticate user: {response.status_code}")
            return False
    
    token = response.json().get("token")
    if not token:
        log("❌ No token received")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    log("✅ User authenticated")
    
    # 2. Create a care recipient
    recipient_data = {
        "name": "Jane Specific Test",
        "date_of_birth": "1955-05-05",
        "gender": "female"
    }
    
    response = requests.post(f"{BACKEND_URL}/care-recipients", json=recipient_data, headers=headers)
    if response.status_code != 200:
        log(f"❌ Failed to create care recipient: {response.status_code}")
        return False
    
    recipient_id = response.json().get("recipient_id")
    log(f"✅ Care recipient created: {recipient_id}")
    
    # 3. Add some test data (a doctor, a medication)
    # Add doctor
    doctor_data = {
        "name": "Dr. Johnson",
        "specialty": "Family Medicine",
        "phone": "416-555-0200"
    }
    response = requests.post(f"{BACKEND_URL}/care-recipients/{recipient_id}/doctors", 
                           json=doctor_data, headers=headers)
    if response.status_code == 200:
        log("✅ Test doctor added")
    
    # Add medication
    med_data = {
        "name": "Metformin",
        "dosage": "500mg",
        "frequency": "Twice daily"
    }
    response = requests.post(f"{BACKEND_URL}/care-recipients/{recipient_id}/medications", 
                           json=med_data, headers=headers)
    if response.status_code == 200:
        log("✅ Test medication added")
    
    # 4. Test POST /api/care-recipients/{recipient_id}/export-report with EXACT parameters from review request
    export_data = {
        "sections": ["medications", "doctors", "appointments"],
        "time_period": "7_days",
        "delivery_method": "download"
    }
    
    log("Testing POST /api/care-recipients/{recipient_id}/export-report with exact parameters from review request")
    log(f"Request body: {json.dumps(export_data, indent=2)}")
    
    response = requests.post(f"{BACKEND_URL}/care-recipients/{recipient_id}/export-report", 
                           json=export_data, headers=headers)
    
    log(f"Response status: {response.status_code}")
    log(f"Response headers: {dict(response.headers)}")
    
    # 5. Verify the PDF is generated correctly
    if response.status_code == 200:
        # Should return PDF content (application/pdf)
        content_type = response.headers.get('content-type', '').lower()
        if 'application/pdf' in content_type:
            log("✅ Correct Content-Type: application/pdf")
        else:
            log(f"❌ Wrong Content-Type: {content_type}")
            return False
        
        # Check PDF content
        pdf_content = response.content
        
        if len(pdf_content) == 0:
            log("❌ Empty PDF content received")
            return False
        
        if pdf_content.startswith(b'%PDF-'):
            log(f"✅ Valid PDF received ({len(pdf_content)} bytes)")
            log("✅ PDF starts with correct header: %PDF-")
        else:
            log(f"❌ Invalid PDF format. Content starts with: {pdf_content[:50]}")
            return False
        
        # Check content disposition
        content_disposition = response.headers.get('content-disposition', '')
        if 'attachment' in content_disposition:
            log(f"✅ Correct Content-Disposition for download: {content_disposition}")
        else:
            log(f"⚠️ Content-Disposition: {content_disposition}")
        
        log("🎉 SPECIFIC EXPORT SCENARIO TEST PASSED!")
        log("✅ The 'dict' object has no attribute 'build' issue is FIXED!")
        return True
    
    else:
        log(f"❌ Export request failed with status {response.status_code}")
        log(f"Response text: {response.text}")
        return False

if __name__ == "__main__":
    print("Testing Specific Export Report PDF Scenario")
    print("=" * 60)
    
    success = test_specific_export_scenario()
    
    if success:
        print("\n✅ EXPORT REPORT PDF FIX VERIFIED SUCCESSFULLY!")
    else:
        print("\n❌ EXPORT REPORT PDF ISSUE NOT FIXED")
    
    sys.exit(0 if success else 1)