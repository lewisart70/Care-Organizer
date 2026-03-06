"""Care recipient CRUD tests - create profile, list, update"""
import pytest
import uuid

class TestCareRecipients:
    """Care recipient profile management"""

    def test_create_care_recipient(self, base_url, api_client, auth_headers):
        """Test creating a care recipient profile"""
        payload = {
            "name": f"TEST_Recipient_{uuid.uuid4().hex[:6]}",
            "date_of_birth": "1940-05-15",
            "gender": "Female",
            "address": "123 Care St, City, State",
            "phone": "555-1234",
            "medical_conditions": ["Diabetes", "Hypertension"],
            "allergies": ["Penicillin"],
            "blood_type": "O+",
            "notes": "Prefers morning appointments"
        }
        
        response = api_client.post(
            f"{base_url}/api/care-recipients",
            json=payload,
            headers=auth_headers
        )
        print(f"Create recipient status: {response.status_code}")
        print(f"Create recipient response: {response.text}")
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "recipient_id" in data
        assert data["name"] == payload["name"]
        assert data["date_of_birth"] == payload["date_of_birth"]
        assert data["gender"] == payload["gender"]
        assert "caregivers" in data
        print(f"✓ Care recipient created: {data['recipient_id']}")
        
        # Verify persistence with GET
        get_response = api_client.get(
            f"{base_url}/api/care-recipients/{data['recipient_id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == payload["name"]
        print("✓ Care recipient persisted correctly")

    def test_list_care_recipients(self, base_url, api_client, auth_headers):
        """Test listing care recipients"""
        response = api_client.get(
            f"{base_url}/api/care-recipients",
            headers=auth_headers
        )
        print(f"List recipients status: {response.status_code}")
        
        assert response.status_code == 200, f"List failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Found {len(data)} care recipient(s)")

    def test_get_dashboard_stats(self, base_url, api_client, auth_headers):
        """Test dashboard endpoint with stats"""
        # First get a recipient
        recipients = api_client.get(
            f"{base_url}/api/care-recipients",
            headers=auth_headers
        ).json()
        
        if len(recipients) == 0:
            pytest.skip("No recipients available for dashboard test")
        
        recipient_id = recipients[0]["recipient_id"]
        
        response = api_client.get(
            f"{base_url}/api/dashboard/{recipient_id}",
            headers=auth_headers
        )
        print(f"Dashboard status: {response.status_code}")
        print(f"Dashboard response: {response.text}")
        
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        assert "recipient" in data
        assert "stats" in data
        assert "medications" in data["stats"]
        assert "appointments" in data["stats"]
        assert "notes" in data["stats"]
        assert "caregivers" in data["stats"]
        print("✓ Dashboard loads with stats")

    def test_list_caregivers(self, base_url, api_client, auth_headers):
        """Test listing caregivers for a recipient"""
        # Get first recipient
        recipients = api_client.get(
            f"{base_url}/api/care-recipients",
            headers=auth_headers
        ).json()
        
        if len(recipients) == 0:
            pytest.skip("No recipients available")
        
        recipient_id = recipients[0]["recipient_id"]
        
        response = api_client.get(
            f"{base_url}/api/care-recipients/{recipient_id}/caregivers",
            headers=auth_headers
        )
        print(f"List caregivers status: {response.status_code}")
        
        assert response.status_code == 200, f"List caregivers failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one caregiver"
        print(f"✓ Found {len(data)} caregiver(s)")
