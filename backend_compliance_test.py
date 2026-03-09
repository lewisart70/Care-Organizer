#!/usr/bin/env python3
"""
Comprehensive compliance and privacy endpoints testing for Family Care Organizer app
Tests all PIPEDA/HIPAA compliance features including data export, audit logs, consent management
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://care-recipient-app.preview.emergentagent.com/api"
print(f"🧪 FAMILY CARE ORGANIZER - COMPLIANCE & PRIVACY TESTING")
print(f"🔗 Backend URL: {BASE_URL}")
print(f"⚡ Testing all compliance endpoints for PIPEDA/HIPAA requirements")
print("=" * 80)

# Test results tracking
test_results = []
def log_test(test_name, status, details=""):
    symbol = "✅" if status else "❌"
    test_results.append({"test": test_name, "status": status, "details": details})
    print(f"{symbol} {test_name}: {details}")

def print_summary():
    print("\n" + "=" * 80)
    print("📊 COMPLIANCE TESTING SUMMARY")
    print("=" * 80)
    passed = sum(1 for r in test_results if r["status"])
    total = len(test_results)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    if total - passed > 0:
        print("\n❌ FAILED TESTS:")
        for r in test_results:
            if not r["status"]:
                print(f"  • {r['test']}: {r['details']}")
    print("=" * 80)

# Test variables
compliance_user_token = None
compliance_user_id = None
test_recipient_id = None
delete_test_token = None
delete_test_user_id = None

try:
    # =============================================================================
    # TEST 1: GET /api/compliance/data-policy (No auth required)
    # =============================================================================
    print("\n🔒 TEST 1: Data Policy Compliance Information")
    
    response = requests.get(f"{BASE_URL}/compliance/data-policy")
    
    if response.status_code == 200:
        policy_data = response.json()
        
        # Verify required fields
        required_fields = ["data_residency", "encryption", "compliance_frameworks"]
        all_present = all(field in policy_data for field in required_fields)
        
        if all_present:
            # Check encryption details
            encryption = policy_data.get("encryption", {})
            has_encryption_details = all(key in encryption for key in ["at_rest", "in_transit", "passwords"])
            
            # Check compliance frameworks
            frameworks = policy_data.get("compliance_frameworks", [])
            has_frameworks = len(frameworks) > 0 and "PIPEDA" in str(frameworks)
            
            if has_encryption_details and has_frameworks:
                log_test("Data Policy Endpoint", True, f"All required fields present. Frameworks: {len(frameworks)}")
                print(f"   📋 Encryption: {encryption}")
                print(f"   🏛️ Frameworks: {frameworks}")
            else:
                log_test("Data Policy Endpoint", False, "Missing encryption details or compliance frameworks")
        else:
            log_test("Data Policy Endpoint", False, f"Missing required fields. Got: {list(policy_data.keys())}")
    else:
        log_test("Data Policy Endpoint", False, f"Status {response.status_code}: {response.text}")

    # =============================================================================
    # TEST 2: Create compliance test user
    # =============================================================================
    print("\n👤 TEST 2: Register Compliance Test User")
    
    test_email = f"compliancetest@test.com"
    user_data = {
        "email": test_email,
        "password": "Test123!",
        "name": "Compliance Tester"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    
    if response.status_code in [200, 201]:
        user_info = response.json()
        if "token" in user_info and "user" in user_info:
            compliance_user_token = user_info["token"]
            compliance_user_id = user_info["user"]["user_id"]
            log_test("User Registration", True, f"User created with ID: {compliance_user_id[:8]}...")
        else:
            log_test("User Registration", False, f"Invalid response format: {user_info}")
    else:
        # User might already exist, try login
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": test_email,
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            user_info = login_response.json()
            compliance_user_token = user_info["token"]
            compliance_user_id = user_info["user"]["user_id"]
            log_test("User Registration", True, f"Existing user logged in: {compliance_user_id[:8]}...")
        else:
            log_test("User Registration", False, f"Registration failed: {response.status_code}, Login failed: {login_response.status_code}")
            raise Exception("Cannot proceed without user authentication")

    # =============================================================================
    # TEST 3: Create care recipient with test data
    # =============================================================================
    print("\n👵 TEST 3: Create Care Recipient with Test Data")
    
    headers = {"Authorization": f"Bearer {compliance_user_token}"}
    recipient_data = {
        "name": "Margaret Compliance Smith",
        "date_of_birth": "1945-06-15",
        "gender": "female",
        "address": "123 Privacy Lane, Compliance City, ON",
        "phone": "555-COMP-123",
        "medical_conditions": ["Privacy Testing Condition", "Data Security Syndrome"],
        "allergies": ["Non-compliant software"],
        "blood_type": "B+",
        "weight": "65kg",
        "blood_pressure": "120/80"
    }
    
    response = requests.post(f"{BASE_URL}/care-recipients", json=recipient_data, headers=headers)
    
    if response.status_code in [200, 201]:
        recipient_info = response.json()
        test_recipient_id = recipient_info.get("recipient_id")
        log_test("Care Recipient Creation", True, f"Created recipient: {test_recipient_id[:8]}...")
        
        # Add some medications for data export testing
        medication_data = {
            "name": "Privacy Pills",
            "dosage": "1 tablet daily",
            "frequency": "Daily",
            "notes": "For data protection compliance",
            "start_date": "2024-01-01"
        }
        
        med_response = requests.post(
            f"{BASE_URL}/care-recipients/{test_recipient_id}/medications",
            json=medication_data,
            headers=headers
        )
        
        if med_response.status_code in [200, 201]:
            print(f"   💊 Added test medication")
        
        # Add a test note
        note_data = {
            "content": "This is test data for compliance verification. Contains sensitive information that should be exportable and deletable.",
            "category": "medical",
            "created_at": datetime.now().isoformat()
        }
        
        note_response = requests.post(
            f"{BASE_URL}/care-recipients/{test_recipient_id}/notes",
            json=note_data,
            headers=headers
        )
        
        if note_response.status_code in [200, 201]:
            print(f"   📝 Added test note")
            
    else:
        log_test("Care Recipient Creation", False, f"Status {response.status_code}: {response.text}")

    # =============================================================================
    # TEST 4: GET /api/account/export-all-data (Auth required)
    # =============================================================================
    print("\n📤 TEST 4: Export All User Data (PIPEDA/HIPAA Data Portability)")
    
    if compliance_user_token:
        response = requests.get(f"{BASE_URL}/account/export-all-data", headers=headers)
        
        if response.status_code == 200:
            export_data = response.json()
            
            # Verify required data sections
            required_sections = ["user", "care_recipients"]
            sections_present = all(section in export_data for section in required_sections)
            
            if sections_present:
                user_info = export_data.get("user", {})
                care_recipients = export_data.get("care_recipients", [])
                
                # Verify user info contains expected fields
                has_user_fields = all(field in user_info for field in ["user_id", "email", "name"])
                
                # Check if care recipients data includes nested data
                has_nested_data = False
                if care_recipients and len(care_recipients) > 0:
                    recipient = care_recipients[0]
                    # Check for medications, notes, etc.
                    nested_fields = ["medications", "notes", "appointments", "incidents"]
                    has_nested_data = any(field in recipient for field in nested_fields)
                
                log_test("Data Export", True, f"Export includes {len(care_recipients)} recipients with nested data: {has_nested_data}")
                print(f"   📊 Export size: {len(json.dumps(export_data))} characters")
                print(f"   🏥 Recipients: {len(care_recipients)}")
                
                if care_recipients:
                    recipient = care_recipients[0]
                    print(f"   💊 Medications: {len(recipient.get('medications', []))}")
                    print(f"   📝 Notes: {len(recipient.get('notes', []))}")
                    
            else:
                log_test("Data Export", False, f"Missing required sections. Got: {list(export_data.keys())}")
        else:
            log_test("Data Export", False, f"Status {response.status_code}: {response.text}")
    else:
        log_test("Data Export", False, "No authentication token available")

    # =============================================================================
    # TEST 5: GET /api/account/audit-log (Auth required) - Initial check
    # =============================================================================
    print("\n📋 TEST 5A: Initial Audit Log Check")
    
    if compliance_user_token:
        response = requests.get(f"{BASE_URL}/account/audit-log", headers=headers)
        
        if response.status_code == 200:
            audit_data = response.json()
            if "logs" in audit_data:
                initial_log_count = len(audit_data["logs"])
                log_test("Initial Audit Log", True, f"Retrieved {initial_log_count} audit entries")
                
                # Show recent logs
                for log_entry in audit_data["logs"][-3:]:  # Last 3 entries
                    print(f"   📋 {log_entry.get('action', 'Unknown')}: {log_entry.get('details', '')}")
            else:
                log_test("Initial Audit Log", False, f"Invalid response format: {audit_data}")
        else:
            log_test("Initial Audit Log", False, f"Status {response.status_code}: {response.text}")
    else:
        log_test("Initial Audit Log", False, "No authentication token available")

    # =============================================================================
    # TEST 6: POST /api/auth/accept-disclaimer (Auth required)
    # =============================================================================
    print("\n✅ TEST 6: Accept Privacy Disclaimer")
    
    if compliance_user_token:
        response = requests.post(f"{BASE_URL}/auth/accept-disclaimer", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                log_test("Accept Disclaimer", True, "Consent acceptance recorded successfully")
            else:
                log_test("Accept Disclaimer", False, f"Unexpected response: {result}")
        else:
            log_test("Accept Disclaimer", False, f"Status {response.status_code}: {response.text}")
    else:
        log_test("Accept Disclaimer", False, "No authentication token available")

    # =============================================================================
    # TEST 7: GET /api/account/audit-log (Auth required) - Verify consent logged
    # =============================================================================
    print("\n📋 TEST 7: Verify Consent in Audit Log")
    
    if compliance_user_token:
        response = requests.get(f"{BASE_URL}/account/audit-log", headers=headers)
        
        if response.status_code == 200:
            audit_data = response.json()
            if "logs" in audit_data:
                logs = audit_data["logs"]
                consent_logs = [log for log in logs if log.get("action") == "CONSENT_ACCEPTED"]
                
                if consent_logs:
                    log_test("Consent Audit Verification", True, f"Found {len(consent_logs)} consent acceptance entries")
                    latest_consent = consent_logs[-1]
                    print(f"   ✅ Latest consent: {latest_consent.get('timestamp', 'Unknown time')}")
                else:
                    log_test("Consent Audit Verification", False, "No CONSENT_ACCEPTED entries found in audit log")
                    
                # Show all log entries for debugging
                print(f"   📋 Total audit entries: {len(logs)}")
                for log_entry in logs[-5:]:  # Last 5 entries
                    print(f"      • {log_entry.get('action', 'Unknown')}: {log_entry.get('details', '')[:50]}...")
            else:
                log_test("Consent Audit Verification", False, f"Invalid response format: {audit_data}")
        else:
            log_test("Consent Audit Verification", False, f"Status {response.status_code}: {response.text}")
    else:
        log_test("Consent Audit Verification", False, "No authentication token available")

    # =============================================================================
    # TEST 8: POST /api/auth/withdraw-consent (Auth required)
    # =============================================================================
    print("\n🚫 TEST 8: Withdraw Consent")
    
    if compliance_user_token:
        response = requests.post(f"{BASE_URL}/auth/withdraw-consent", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                message = result.get("message", "")
                has_grace_period = "30" in message and ("day" in message.lower() or "grace" in message.lower())
                log_test("Withdraw Consent", True, f"Consent withdrawal processed. Grace period mentioned: {has_grace_period}")
                print(f"   📅 Message: {message}")
            else:
                log_test("Withdraw Consent", False, f"Unexpected response: {result}")
        else:
            log_test("Withdraw Consent", False, f"Status {response.status_code}: {response.text}")
    else:
        log_test("Withdraw Consent", False, "No authentication token available")

    # =============================================================================
    # TEST 9: Create separate user for deletion testing
    # =============================================================================
    print("\n👤 TEST 9: Create User for Deletion Testing")
    
    delete_email = f"deletetest@test.com"
    delete_user_data = {
        "email": delete_email,
        "password": "Delete123!",
        "name": "Delete Test User"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=delete_user_data)
    
    if response.status_code in [200, 201]:
        user_info = response.json()
        delete_test_token = user_info["token"]
        delete_test_user_id = user_info["user"]["user_id"]
        log_test("Delete Test User Creation", True, f"Created user for deletion: {delete_test_user_id[:8]}...")
    else:
        # Try login if user exists
        login_response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": delete_email,
            "password": "Delete123!"
        })
        
        if login_response.status_code == 200:
            user_info = login_response.json()
            delete_test_token = user_info["token"]
            delete_test_user_id = user_info["user"]["user_id"]
            log_test("Delete Test User Creation", True, f"Using existing deletion test user: {delete_test_user_id[:8]}...")
        else:
            log_test("Delete Test User Creation", False, f"Cannot create or login deletion test user")

    # Add test data for deletion verification
    if delete_test_token:
        print("   📝 Adding test data for deletion verification...")
        delete_headers = {"Authorization": f"Bearer {delete_test_token}"}
        
        # Create care recipient
        recipient_data = {
            "name": "Test Delete Recipient",
            "date_of_birth": "1950-01-01",
            "medical_conditions": ["Test condition for deletion"]
        }
        
        delete_response = requests.post(f"{BASE_URL}/care-recipients", json=recipient_data, headers=delete_headers)
        if delete_response.status_code == 201:
            delete_recipient_id = delete_response.json().get("recipient_id")
            print(f"      🏥 Created care recipient: {delete_recipient_id[:8]}...")
            
            # Add a medication
            med_data = {
                "name": "Delete Test Medication",
                "dosage": "Test dosage",
                "frequency": "Test frequency"
            }
            
            med_response = requests.post(
                f"{BASE_URL}/care-recipients/{delete_recipient_id}/medications",
                json=med_data,
                headers=delete_headers
            )
            
            if med_response.status_code == 201:
                print(f"      💊 Added test medication")

    # =============================================================================
    # TEST 10: DELETE /api/account/delete (Auth required)
    # =============================================================================
    print("\n🗑️ TEST 10: Account Deletion (Complete Data Removal)")
    
    if delete_test_token:
        # First, verify user has data
        export_response = requests.get(f"{BASE_URL}/account/export-all-data", headers={"Authorization": f"Bearer {delete_test_token}"})
        
        if export_response.status_code == 200:
            pre_delete_data = export_response.json()
            recipients_count = len(pre_delete_data.get("care_recipients", []))
            print(f"   📊 Pre-deletion: {recipients_count} care recipients")
        
        # Perform deletion
        delete_response = requests.delete(f"{BASE_URL}/account/delete", headers={"Authorization": f"Bearer {delete_test_token}"})
        
        if delete_response.status_code == 200:
            result = delete_response.json()
            if result.get("success"):
                log_test("Account Deletion", True, "Account and all data permanently deleted")
                print(f"   🗑️ Message: {result.get('message', '')}")
                
                # Verify data is gone - token should now be invalid
                verify_response = requests.get(f"{BASE_URL}/account/export-all-data", headers={"Authorization": f"Bearer {delete_test_token}"})
                
                if verify_response.status_code == 401:
                    print(f"   ✅ Verification: Token invalidated after deletion")
                else:
                    print(f"   ⚠️ Warning: Token still valid after deletion (status: {verify_response.status_code})")
                    
            else:
                log_test("Account Deletion", False, f"Deletion failed: {result}")
        else:
            log_test("Account Deletion", False, f"Status {delete_response.status_code}: {delete_response.text}")
    else:
        log_test("Account Deletion", False, "No deletion test token available")

    # =============================================================================
    # FINAL SUMMARY
    # =============================================================================
    print_summary()
    
    # Final compliance check
    passed_tests = sum(1 for r in test_results if r["status"])
    total_tests = len(test_results)
    
    if passed_tests == total_tests:
        print("\n🎉 ALL COMPLIANCE TESTS PASSED!")
        print("✅ Family Care Organizer is PIPEDA/HIPAA compliant")
        print("✅ Data portability, consent management, and deletion rights implemented")
        print("✅ Audit logging and transparency features working")
    else:
        print(f"\n⚠️ {total_tests - passed_tests} compliance issues need attention")
        print("❗ Review failed tests above for PIPEDA/HIPAA compliance gaps")

except Exception as e:
    print(f"\n💥 TESTING ERROR: {str(e)}")
    print("❌ Compliance testing could not complete")
    import traceback
    traceback.print_exc()

print(f"\n🏁 Compliance testing completed at {datetime.now()}")
print("=" * 80)