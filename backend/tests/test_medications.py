"""Medication CRUD and AI interaction checker tests"""
import pytest
import uuid

class TestMedications:
    """Medication management and AI features"""

    @pytest.fixture(scope="class")
    def recipient_id(self, base_url, api_client, auth_headers):
        """Get or create a test recipient for medication tests"""
        recipients = api_client.get(
            f"{base_url}/api/care-recipients",
            headers=auth_headers
        ).json()
        
        if len(recipients) > 0:
            return recipients[0]["recipient_id"]
        
        # Create one
        payload = {"name": f"TEST_MedRecipient_{uuid.uuid4().hex[:6]}"}
        response = api_client.post(
            f"{base_url}/api/care-recipients",
            json=payload,
            headers=auth_headers
        )
        return response.json()["recipient_id"]

    def test_create_medication(self, base_url, api_client, auth_headers, recipient_id):
        """Test adding medication to recipient"""
        payload = {
            "name": "Metformin",
            "dosage": "500mg",
            "frequency": "Twice daily",
            "time_of_day": "Morning and Evening",
            "prescribing_doctor": "Dr. Smith",
            "start_date": "2024-01-01",
            "instructions": "Take with food"
        }
        
        response = api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/medications",
            json=payload,
            headers=auth_headers
        )
        print(f"Create medication status: {response.status_code}")
        print(f"Create medication response: {response.text}")
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "medication_id" in data
        assert data["name"] == payload["name"]
        assert data["dosage"] == payload["dosage"]
        assert data["recipient_id"] == recipient_id
        print(f"✓ Medication created: {data['medication_id']}")
        
        # Verify with GET
        get_response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/medications",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        meds = get_response.json()
        assert any(m["medication_id"] == data["medication_id"] for m in meds)
        print("✓ Medication persisted correctly")

    def test_list_medications(self, base_url, api_client, auth_headers, recipient_id):
        """Test listing medications for recipient"""
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/medications",
            headers=auth_headers
        )
        print(f"List medications status: {response.status_code}")
        
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} medication(s)")

    def test_ai_medication_interactions(self, base_url, api_client, auth_headers):
        """Test AI medication interaction checker endpoint"""
        payload = {
            "medications": ["Warfarin", "Aspirin", "Ibuprofen"]
        }
        
        response = api_client.post(
            f"{base_url}/api/ai/medication-interactions",
            json=payload,
            headers=auth_headers
        )
        print(f"AI interaction check status: {response.status_code}")
        print(f"AI interaction response: {response.text}")
        
        assert response.status_code == 200, f"AI check failed: {response.text}"
        
        data = response.json()
        # Response should have interactions or summary
        assert "interactions" in data or "summary" in data
        print("✓ AI medication interaction checker working")
        print(f"  Response keys: {list(data.keys())}")
