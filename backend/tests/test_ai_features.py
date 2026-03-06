"""AI features testing - smart reminders endpoint"""
import pytest
import uuid

class TestAIFeatures:
    """AI-powered features"""

    @pytest.fixture(scope="class")
    def recipient_with_data(self, base_url, api_client, auth_headers):
        """Create a recipient with some data for AI context"""
        # Create recipient
        payload = {
            "name": f"TEST_AIRecipient_{uuid.uuid4().hex[:6]}",
            "medical_conditions": ["Diabetes", "Arthritis"],
            "allergies": ["Penicillin"]
        }
        recipient = api_client.post(
            f"{base_url}/api/care-recipients",
            json=payload,
            headers=auth_headers
        ).json()
        
        recipient_id = recipient["recipient_id"]
        
        # Add a medication
        api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/medications",
            json={"name": "Metformin", "dosage": "500mg", "frequency": "Twice daily"},
            headers=auth_headers
        )
        
        # Add an appointment
        api_client.post(
            f"{base_url}/api/care-recipients/{recipient_id}/appointments",
            json={"title": "Diabetes Checkup", "date": "2026-02-10"},
            headers=auth_headers
        )
        
        return recipient_id

    def test_smart_reminders_ai(self, base_url, api_client, auth_headers, recipient_with_data):
        """Test AI smart reminders endpoint"""
        payload = {"recipient_id": recipient_with_data}
        
        response = api_client.post(
            f"{base_url}/api/ai/smart-reminders",
            json=payload,
            headers=auth_headers
        )
        print(f"Smart reminders status: {response.status_code}")
        print(f"Smart reminders response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Smart reminders failed: {response.text}"
        
        data = response.json()
        assert "reminders" in data
        assert isinstance(data["reminders"], list)
        
        # If we got reminders, check structure
        if len(data["reminders"]) > 0:
            reminder = data["reminders"][0]
            assert "title" in reminder
            assert "description" in reminder
            print(f"✓ AI smart reminders working - generated {len(data['reminders'])} reminders")
        else:
            print("✓ AI smart reminders endpoint working (returned empty list)")
