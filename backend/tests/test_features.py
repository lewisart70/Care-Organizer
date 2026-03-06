"""Tests for emergency contacts, appointments, notes, incidents, bathing, nutrition, legal/financial, routines, doctors"""
import pytest
import uuid

class TestEmergencyContacts:
    """Emergency contact management"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_ContactRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_create_emergency_contact(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "name": "John Doe",
            "relationship": "Son",
            "phone": "555-9999",
            "email": "john@example.com",
            "is_primary": True
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/emergency-contacts",
            json=payload, headers=auth_headers
        )
        print(f"Create emergency contact status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "contact_id" in data
        assert data["name"] == payload["name"]
        print("✓ Emergency contact created")

    def test_list_emergency_contacts(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/emergency-contacts",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} emergency contact(s)")


class TestAppointments:
    """Appointment management"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_ApptRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_create_appointment(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "title": "Cardiology Checkup",
            "date": "2026-02-15",
            "time": "10:00 AM",
            "doctor_name": "Dr. Johnson",
            "location": "City Medical Center",
            "appointment_type": "Checkup",
            "reminder": True
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/appointments",
            json=payload, headers=auth_headers
        )
        print(f"Create appointment status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "appointment_id" in data
        assert data["title"] == payload["title"]
        print("✓ Appointment created")

    def test_list_appointments(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/appointments",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} appointment(s)")


class TestNotes:
    """Caregiver notes management"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_NoteRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_create_note(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "content": "Had a good day today. Appetite was strong.",
            "category": "daily"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/notes",
            json=payload, headers=auth_headers
        )
        print(f"Create note status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "note_id" in data
        assert data["content"] == payload["content"]
        assert "author_name" in data
        print("✓ Note created")

    def test_list_notes(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/notes",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} note(s)")


class TestIncidents:
    """Incident/fall logging"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_IncidentRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_log_incident(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "incident_type": "Fall",
            "description": "Slipped in bathroom",
            "severity": "moderate",
            "location": "Bathroom",
            "injuries": "Minor bruise on arm",
            "action_taken": "Applied ice, monitored for 24h"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/incidents",
            json=payload, headers=auth_headers
        )
        print(f"Log incident status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "incident_id" in data
        assert data["incident_type"] == payload["incident_type"]
        print("✓ Incident logged")

    def test_list_incidents(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/incidents",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} incident(s)")


class TestBathing:
    """Bathing record tracking"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_BathRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_log_bathing_record(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "date": "2026-01-20",
            "bath_type": "full",
            "notes": "No issues",
            "assisted_by": "Nurse Mary"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/bathing",
            json=payload, headers=auth_headers
        )
        print(f"Log bathing status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "bathing_id" in data
        print("✓ Bathing record logged")

    def test_list_bathing_records(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/bathing",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} bathing record(s)")


class TestNutrition:
    """Nutrition/meal tracking"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_NutritionRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_log_nutrition(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "meal_type": "Lunch",
            "food_items": "Grilled chicken, steamed vegetables, brown rice",
            "notes": "Ate well",
            "date": "2026-01-20"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/nutrition",
            json=payload, headers=auth_headers
        )
        print(f"Log nutrition status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "nutrition_id" in data
        print("✓ Nutrition logged")

    def test_list_nutrition_records(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/nutrition",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} nutrition record(s)")


class TestLegalFinancial:
    """Legal/financial checklist items"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_LegalRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_add_legal_financial_item(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "item_type": "legal",
            "title": "Update Power of Attorney",
            "description": "Renew POA document",
            "status": "pending",
            "due_date": "2026-03-01"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/legal-financial",
            json=payload, headers=auth_headers
        )
        print(f"Add legal/financial item status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "item_id" in data
        print("✓ Legal/financial item added")

    def test_list_legal_financial_items(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/legal-financial",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} legal/financial item(s)")


class TestDailyRoutine:
    """Daily routine management"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_RoutineRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_add_daily_routine(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "time_of_day": "8:00 AM",
            "activity": "Breakfast and morning medications",
            "notes": "Prefers tea with breakfast"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/routines",
            json=payload, headers=auth_headers
        )
        print(f"Add daily routine status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "routine_id" in data
        print("✓ Daily routine added")

    def test_list_daily_routines(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/routines",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} daily routine(s)")


class TestDoctors:
    """Doctor/specialist management"""
    
    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        recipients = api_client.get(f"{base_url}/api/care-recipients", headers=auth_headers).json()
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        payload = {"name": f"TEST_DoctorRecipient_{uuid.uuid4().hex[:6]}"}
        return api_client.post(f"{base_url}/api/care-recipients", json=payload, headers=auth_headers).json()["recipient_id"]

    def test_add_doctor(self, base_url, api_client, auth_headers, recipient_id):
        payload = {
            "name": "Dr. Sarah Williams",
            "specialty": "Geriatric Medicine",
            "phone": "555-1111",
            "address": "123 Medical Plaza",
            "email": "dr.williams@example.com"
        }
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/doctors",
            json=payload, headers=auth_headers
        )
        print(f"Add doctor status: {response.status_code}")
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert "doctor_id" in data
        print("✓ Doctor added")

    def test_list_doctors(self, base_url, api_client, auth_headers, recipient_id):
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/doctors",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} doctor(s)")
