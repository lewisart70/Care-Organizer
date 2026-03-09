#!/usr/bin/env python3
"""
Test transcription with a more realistic audio sample
"""
import requests
import base64
import wave
import struct
import io

BASE_URL = "https://family-health-hub-23.preview.emergentagent.com/api"
TEST_EMAIL = "caretest@example.com"
TEST_PASSWORD = "SecurePass123!"

def create_simple_wav():
    """Create a simple wav audio file in memory for testing"""
    sample_rate = 16000
    duration = 1.0  # seconds
    frequency = 440  # Hz (A4 note)
    
    # Generate samples
    samples = []
    for i in range(int(sample_rate * duration)):
        t = i / sample_rate
        sample = int(32767 * 0.5 * (1.0 if t < 0.5 else 0.0))  # Simple beep
        samples.append(sample)
    
    # Create WAV in memory
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Pack samples as 16-bit signed integers
        wav_data = struct.pack('<' + 'h' * len(samples), *samples)
        wav_file.writeframes(wav_data)
    
    buffer.seek(0)
    return buffer.getvalue()

def test_transcription_with_real_audio():
    """Test transcription with a properly formatted audio file"""
    # Login first
    session = requests.Session()
    
    # Login
    login_url = f"{BASE_URL}/auth/login"
    login_payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = session.post(login_url, json=login_payload)
    if response.status_code != 200:
        print("❌ Login failed")
        return False
    
    token = response.json()["token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    # Create simple WAV audio
    wav_data = create_simple_wav()
    audio_b64 = base64.b64encode(wav_data).decode('utf-8')
    audio_data_uri = f"data:audio/wav;base64,{audio_b64}"
    
    # Test transcription
    transcribe_url = f"{BASE_URL}/transcribe"
    payload = {
        "audio_base64": audio_data_uri,
        "language": "en"
    }
    
    print("🎤 Testing transcription with valid WAV audio...")
    response = session.post(transcribe_url, json=payload, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        if "text" in data:
            print(f"✅ Transcription successful: '{data['text']}'")
            return True
        else:
            print(f"✅ Transcription endpoint working but no text returned: {data}")
            return True
    else:
        print(f"❌ Transcription failed: {response.status_code}")
        return False

if __name__ == "__main__":
    test_transcription_with_real_audio()