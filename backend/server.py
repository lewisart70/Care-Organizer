from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET_KEY']
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== PYDANTIC MODELS ========================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

class CareRecipientCreate(BaseModel):
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    blood_type: Optional[str] = None
    health_card_number: Optional[str] = None
    insurance_info: Optional[str] = None
    interests: Optional[List[str]] = []
    notes: Optional[str] = None

class CareRecipientOut(BaseModel):
    recipient_id: str
    name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    medical_conditions: Optional[List[str]] = []
    allergies: Optional[List[str]] = []
    blood_type: Optional[str] = None
    health_card_number: Optional[str] = None
    insurance_info: Optional[str] = None
    interests: Optional[List[str]] = []
    notes: Optional[str] = None
    caregivers: Optional[List[str]] = []
    created_at: Optional[str] = None

class MedicationCreate(BaseModel):
    name: str
    dosage: str
    frequency: str
    time_of_day: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    instructions: Optional[str] = None
    side_effects: Optional[str] = None

class MedicationOut(BaseModel):
    medication_id: str
    recipient_id: str
    name: str
    dosage: str
    frequency: str
    time_of_day: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    instructions: Optional[str] = None
    side_effects: Optional[str] = None

class EmergencyContactCreate(BaseModel):
    name: str
    relationship: str
    phone: str
    email: Optional[str] = None
    is_primary: Optional[bool] = False
    notes: Optional[str] = None

class EmergencyContactOut(BaseModel):
    contact_id: str
    recipient_id: str
    name: str
    relationship: str
    phone: str
    email: Optional[str] = None
    is_primary: Optional[bool] = False
    notes: Optional[str] = None

class DoctorCreate(BaseModel):
    name: str
    specialty: str
    phone: Optional[str] = None
    address: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class DoctorOut(BaseModel):
    doctor_id: str
    recipient_id: str
    name: str
    specialty: str
    phone: Optional[str] = None
    address: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class NoteCreate(BaseModel):
    content: str
    category: Optional[str] = "general"

class NoteOut(BaseModel):
    note_id: str
    recipient_id: str
    author_id: str
    author_name: Optional[str] = None
    content: str
    category: Optional[str] = "general"
    created_at: Optional[str] = None

class IncidentCreate(BaseModel):
    incident_type: str
    description: str
    severity: Optional[str] = "moderate"
    location: Optional[str] = None
    injuries: Optional[str] = None
    action_taken: Optional[str] = None

class IncidentOut(BaseModel):
    incident_id: str
    recipient_id: str
    incident_type: str
    description: str
    severity: Optional[str] = "moderate"
    location: Optional[str] = None
    injuries: Optional[str] = None
    action_taken: Optional[str] = None
    reported_by: Optional[str] = None
    created_at: Optional[str] = None

class BathingCreate(BaseModel):
    date: str
    bath_type: Optional[str] = "full"
    notes: Optional[str] = None
    assisted_by: Optional[str] = None

class BathingOut(BaseModel):
    bathing_id: str
    recipient_id: str
    date: str
    bath_type: Optional[str] = "full"
    notes: Optional[str] = None
    assisted_by: Optional[str] = None

class AppointmentCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    doctor_name: Optional[str] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    reminder: Optional[bool] = True

class AppointmentOut(BaseModel):
    appointment_id: str
    recipient_id: str
    title: str
    date: str
    time: Optional[str] = None
    doctor_name: Optional[str] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None
    notes: Optional[str] = None
    reminder: Optional[bool] = True

class DailyRoutineCreate(BaseModel):
    time_of_day: str
    activity: str
    notes: Optional[str] = None

class DailyRoutineOut(BaseModel):
    routine_id: str
    recipient_id: str
    time_of_day: str
    activity: str
    notes: Optional[str] = None

class NutritionCreate(BaseModel):
    meal_type: str
    food_items: str
    notes: Optional[str] = None
    date: Optional[str] = None
    dietary_restrictions: Optional[str] = None

class NutritionOut(BaseModel):
    nutrition_id: str
    recipient_id: str
    meal_type: str
    food_items: str
    notes: Optional[str] = None
    date: Optional[str] = None
    dietary_restrictions: Optional[str] = None

class LegalFinancialCreate(BaseModel):
    item_type: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    due_date: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None

class LegalFinancialOut(BaseModel):
    item_id: str
    recipient_id: str
    item_type: str
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    due_date: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None

class MedicationInteractionRequest(BaseModel):
    medications: List[str]

class SmartReminderRequest(BaseModel):
    recipient_id: str

class InviteCaregiverRequest(BaseModel):
    email: str

# ======================== AUTH HELPERS ========================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = None
    # Check cookie first
    token = request.cookies.get("session_token")
    # Then Authorization header
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Check if it's a session token (from Google auth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    # Try JWT token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    return {
        "token": token,
        "user": {"user_id": user_id, "email": data.email, "name": data.name, "picture": None}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if "password_hash" not in user:
        raise HTTPException(status_code=401, detail="Please sign in with Google")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["user_id"], user["email"])
    return {
        "token": token,
        "user": {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture")}
    }

@api_router.post("/auth/google")
async def google_auth(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = resp.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data["name"], "picture": data.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    session_token = data.get("session_token", f"sess_{uuid.uuid4().hex}")
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    token = create_token(user_id, email)
    return {
        "token": token,
        "session_token": session_token,
        "user": {"user_id": user_id, "email": email, "name": data["name"], "picture": data.get("picture")}
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "picture": user.get("picture")}

@api_router.post("/auth/logout")
async def logout(request: Request):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out"}

# ======================== CARE RECIPIENT ROUTES ========================

@api_router.post("/care-recipients")
async def create_care_recipient(data: CareRecipientCreate, user: dict = Depends(get_current_user)):
    recipient_id = f"cr_{uuid.uuid4().hex[:12]}"
    doc = {
        "recipient_id": recipient_id,
        **data.dict(),
        "caregivers": [user["user_id"]],
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.care_recipients.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients")
async def list_care_recipients(user: dict = Depends(get_current_user)):
    recipients = await db.care_recipients.find(
        {"caregivers": user["user_id"]}, {"_id": 0}
    ).to_list(100)
    return recipients

@api_router.get("/care-recipients/{recipient_id}")
async def get_care_recipient(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one(
        {"recipient_id": recipient_id, "caregivers": user["user_id"]}, {"_id": 0}
    )
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    return r

@api_router.put("/care-recipients/{recipient_id}")
async def update_care_recipient(recipient_id: str, data: CareRecipientCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    await db.care_recipients.update_one(
        {"recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.care_recipients.find_one({"recipient_id": recipient_id}, {"_id": 0})
    return updated

@api_router.post("/care-recipients/{recipient_id}/invite")
async def invite_caregiver(recipient_id: str, data: InviteCaregiverRequest, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    invited_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found. They must register first.")
    if invited_user["user_id"] in r.get("caregivers", []):
        raise HTTPException(status_code=400, detail="User is already a caregiver")
    await db.care_recipients.update_one(
        {"recipient_id": recipient_id},
        {"$push": {"caregivers": invited_user["user_id"]}}
    )
    return {"message": f"{invited_user['name']} added as caregiver"}

@api_router.get("/care-recipients/{recipient_id}/caregivers")
async def list_caregivers(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    caregiver_ids = r.get("caregivers", [])
    caregivers = await db.users.find({"user_id": {"$in": caregiver_ids}}, {"_id": 0, "password_hash": 0}).to_list(50)
    return caregivers

# ======================== MEDICATIONS ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/medications")
async def create_medication(recipient_id: str, data: MedicationCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    med_id = f"med_{uuid.uuid4().hex[:12]}"
    doc = {"medication_id": med_id, "recipient_id": recipient_id, **data.dict()}
    await db.medications.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/medications")
async def list_medications(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    meds = await db.medications.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(200)
    return meds

@api_router.delete("/care-recipients/{recipient_id}/medications/{medication_id}")
async def delete_medication(recipient_id: str, medication_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.medications.delete_one({"medication_id": medication_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medication not found")
    return {"message": "Medication deleted"}

# ======================== EMERGENCY CONTACTS ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/emergency-contacts")
async def create_emergency_contact(recipient_id: str, data: EmergencyContactCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    contact_id = f"ec_{uuid.uuid4().hex[:12]}"
    doc = {"contact_id": contact_id, "recipient_id": recipient_id, **data.dict()}
    await db.emergency_contacts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/emergency-contacts")
async def list_emergency_contacts(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    contacts = await db.emergency_contacts.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50)
    return contacts

@api_router.delete("/care-recipients/{recipient_id}/emergency-contacts/{contact_id}")
async def delete_emergency_contact(recipient_id: str, contact_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.emergency_contacts.delete_one({"contact_id": contact_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ======================== DOCTORS ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/doctors")
async def create_doctor(recipient_id: str, data: DoctorCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    doctor_id = f"doc_{uuid.uuid4().hex[:12]}"
    doc = {"doctor_id": doctor_id, "recipient_id": recipient_id, **data.dict()}
    await db.doctors.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/doctors")
async def list_doctors(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    doctors = await db.doctors.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50)
    return doctors

@api_router.delete("/care-recipients/{recipient_id}/doctors/{doctor_id}")
async def delete_doctor(recipient_id: str, doctor_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.doctors.delete_one({"doctor_id": doctor_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"message": "Doctor deleted"}

# ======================== NOTES ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/notes")
async def create_note(recipient_id: str, data: NoteCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    doc = {
        "note_id": note_id, "recipient_id": recipient_id,
        "author_id": user["user_id"], "author_name": user["name"],
        "content": data.content, "category": data.category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/notes")
async def list_notes(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    notes = await db.notes.find({"recipient_id": recipient_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return notes

@api_router.delete("/care-recipients/{recipient_id}/notes/{note_id}")
async def delete_note(recipient_id: str, note_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.notes.delete_one({"note_id": note_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ======================== INCIDENTS ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/incidents")
async def create_incident(recipient_id: str, data: IncidentCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    inc_id = f"inc_{uuid.uuid4().hex[:12]}"
    doc = {
        "incident_id": inc_id, "recipient_id": recipient_id,
        **data.dict(), "reported_by": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.incidents.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/incidents")
async def list_incidents(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    incidents = await db.incidents.find({"recipient_id": recipient_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return incidents

# ======================== BATHING ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/bathing")
async def create_bathing(recipient_id: str, data: BathingCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    bath_id = f"bath_{uuid.uuid4().hex[:12]}"
    doc = {"bathing_id": bath_id, "recipient_id": recipient_id, **data.dict()}
    await db.bathing.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/bathing")
async def list_bathing(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    records = await db.bathing.find({"recipient_id": recipient_id}, {"_id": 0}).sort("date", -1).to_list(200)
    return records

# ======================== APPOINTMENTS ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/appointments")
async def create_appointment(recipient_id: str, data: AppointmentCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    appt_id = f"appt_{uuid.uuid4().hex[:12]}"
    doc = {"appointment_id": appt_id, "recipient_id": recipient_id, **data.dict()}
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/appointments")
async def list_appointments(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    appts = await db.appointments.find({"recipient_id": recipient_id}, {"_id": 0}).sort("date", 1).to_list(200)
    return appts

@api_router.delete("/care-recipients/{recipient_id}/appointments/{appointment_id}")
async def delete_appointment(recipient_id: str, appointment_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.appointments.delete_one({"appointment_id": appointment_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"message": "Appointment deleted"}

# ======================== DAILY ROUTINE ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/routines")
async def create_routine(recipient_id: str, data: DailyRoutineCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    routine_id = f"rtn_{uuid.uuid4().hex[:12]}"
    doc = {"routine_id": routine_id, "recipient_id": recipient_id, **data.dict()}
    await db.routines.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/routines")
async def list_routines(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    routines = await db.routines.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100)
    return routines

@api_router.delete("/care-recipients/{recipient_id}/routines/{routine_id}")
async def delete_routine(recipient_id: str, routine_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.routines.delete_one({"routine_id": routine_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Routine not found")
    return {"message": "Routine deleted"}

# ======================== NUTRITION ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/nutrition")
async def create_nutrition(recipient_id: str, data: NutritionCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    nut_id = f"nut_{uuid.uuid4().hex[:12]}"
    doc = {"nutrition_id": nut_id, "recipient_id": recipient_id, **data.dict()}
    await db.nutrition.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/nutrition")
async def list_nutrition(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    records = await db.nutrition.find({"recipient_id": recipient_id}, {"_id": 0}).sort("date", -1).to_list(200)
    return records

# ======================== LEGAL FINANCIAL ROUTES ========================

@api_router.post("/care-recipients/{recipient_id}/legal-financial")
async def create_legal_financial(recipient_id: str, data: LegalFinancialCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    item_id = f"lf_{uuid.uuid4().hex[:12]}"
    doc = {"item_id": item_id, "recipient_id": recipient_id, **data.dict()}
    await db.legal_financial.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/care-recipients/{recipient_id}/legal-financial")
async def list_legal_financial(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    items = await db.legal_financial.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100)
    return items

@api_router.put("/care-recipients/{recipient_id}/legal-financial/{item_id}")
async def update_legal_financial(recipient_id: str, item_id: str, data: LegalFinancialCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    await db.legal_financial.update_one({"item_id": item_id, "recipient_id": recipient_id}, {"$set": data.dict()})
    updated = await db.legal_financial.find_one({"item_id": item_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Item not found")
    return updated

# ======================== AI ROUTES ========================

@api_router.post("/ai/medication-interactions")
async def check_medication_interactions(data: MedicationInteractionRequest, user: dict = Depends(get_current_user)):
    if len(data.medications) < 2:
        return {"interactions": [], "summary": "Need at least 2 medications to check interactions."}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        med_list = ", ".join(data.medications)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"med_interaction_{uuid.uuid4().hex[:8]}",
            system_message="You are a pharmaceutical expert assistant. You provide medication interaction information for caregivers. Always include a disclaimer that this is informational only and users should consult their pharmacist or doctor. Be concise and practical. Format your response as JSON with keys: 'interactions' (array of objects with 'medications', 'severity', 'description') and 'summary' (brief overall assessment)."
        )
        chat.with_model("openai", "gpt-4o-mini")
        user_message = UserMessage(text=f"Check for potential drug interactions between these medications: {med_list}. Return the response as valid JSON.")
        response = await chat.send_message(user_message)
        import json
        try:
            clean = response.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                if clean.endswith("```"):
                    clean = clean[:-3]
                clean = clean.strip()
            result = json.loads(clean)
            return result
        except json.JSONDecodeError:
            return {"interactions": [], "summary": response, "raw": True}
    except Exception as e:
        logger.error(f"AI medication check error: {e}")
        return {"interactions": [], "summary": f"Unable to check interactions at this time. Please consult your pharmacist.", "error": str(e)}

@api_router.post("/ai/smart-reminders")
async def get_smart_reminders(data: SmartReminderRequest, user: dict = Depends(get_current_user)):
    try:
        recipient = await db.care_recipients.find_one({"recipient_id": data.recipient_id, "caregivers": user["user_id"]}, {"_id": 0})
        if not recipient:
            raise HTTPException(status_code=404, detail="Care recipient not found")
        meds = await db.medications.find({"recipient_id": data.recipient_id}, {"_id": 0}).to_list(50)
        appts = await db.appointments.find({"recipient_id": data.recipient_id}, {"_id": 0}).to_list(20)
        incidents = await db.incidents.find({"recipient_id": data.recipient_id}, {"_id": 0}).sort("created_at", -1).to_list(5)
        context = f"""Care recipient: {recipient.get('name', 'Unknown')}
Medical conditions: {', '.join(recipient.get('medical_conditions', []))}
Allergies: {', '.join(recipient.get('allergies', []))}
Medications: {', '.join([m.get('name', '') + ' (' + m.get('dosage', '') + ')' for m in meds])}
Upcoming appointments: {', '.join([a.get('title', '') + ' on ' + a.get('date', '') for a in appts[:5]])}
Recent incidents: {', '.join([i.get('description', '') for i in incidents[:3]])}"""

        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"reminders_{uuid.uuid4().hex[:8]}",
            system_message="You are a caring and knowledgeable elder care assistant. Generate helpful, practical reminders and suggestions for family caregivers based on the care recipient's profile. Be warm, supportive, and actionable. Return as JSON with key 'reminders' (array of objects with 'title', 'description', 'priority' (high/medium/low), 'category' (medication/health/safety/appointment/wellness))."
        )
        chat.with_model("openai", "gpt-4o-mini")
        msg = UserMessage(text=f"Based on this care profile, generate 5-8 smart care reminders:\n{context}\nReturn as valid JSON.")
        response = await chat.send_message(msg)
        import json
        try:
            clean = response.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                if clean.endswith("```"):
                    clean = clean[:-3]
                clean = clean.strip()
            result = json.loads(clean)
            return result
        except json.JSONDecodeError:
            return {"reminders": [{"title": "Care Tip", "description": response, "priority": "medium", "category": "wellness"}]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Smart reminders error: {e}")
        return {"reminders": [{"title": "Stay Connected", "description": "Remember to check in regularly with your loved one and coordinate with other caregivers.", "priority": "medium", "category": "wellness"}]}

# ======================== DASHBOARD ROUTE ========================

@api_router.get("/dashboard/{recipient_id}")
async def get_dashboard(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    med_count = await db.medications.count_documents({"recipient_id": recipient_id})
    appt_count = await db.appointments.count_documents({"recipient_id": recipient_id})
    note_count = await db.notes.count_documents({"recipient_id": recipient_id})
    incident_count = await db.incidents.count_documents({"recipient_id": recipient_id})
    recent_notes = await db.notes.find({"recipient_id": recipient_id}, {"_id": 0}).sort("created_at", -1).to_list(3)
    upcoming_appts = await db.appointments.find({"recipient_id": recipient_id}, {"_id": 0}).sort("date", 1).to_list(3)
    caregiver_count = len(r.get("caregivers", []))
    return {
        "recipient": r,
        "stats": {
            "medications": med_count,
            "appointments": appt_count,
            "notes": note_count,
            "incidents": incident_count,
            "caregivers": caregiver_count
        },
        "recent_notes": recent_notes,
        "upcoming_appointments": upcoming_appts
    }

# ======================== SETUP ========================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
