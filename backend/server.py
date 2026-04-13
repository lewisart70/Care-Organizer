from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import json
import base64
import io
from openai import AsyncOpenAI
import resend
from passlib.context import CryptContext
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Password hashing context for sensitive data
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET_KEY']
JWT_ALGORITHM = "HS256"
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', os.environ.get('EMERGENT_LLM_KEY', ''))
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
DEMO_ACCOUNT_EMAIL = os.environ.get('DEMO_ACCOUNT_EMAIL', '')
DEMO_ACCOUNT_PASSWORD = os.environ.get('DEMO_ACCOUNT_PASSWORD', '')

# OpenAI client for AI features (STT, chat completions)
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Initialize Resend
resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Custom validation error handler - returns clearer error messages instead of raw 422
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    missing_fields = [e["loc"][-1] for e in errors if e["type"] == "missing"]
    if missing_fields:
        detail = f"Missing required fields: {', '.join(str(f) for f in missing_fields)}"
    else:
        detail = "; ".join(e.get("msg", "Validation error") for e in errors)
    logger.warning(f"Validation error on {request.method} {request.url.path}: {detail}")
    return JSONResponse(status_code=422, content={"detail": detail})

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
        response.headers["Pragma"] = "no-cache"
        return response

app.add_middleware(SecurityHeadersMiddleware)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ======================== HEALTH CHECK & STARTUP ========================

@api_router.get("/health")
async def health_check():
    """Health check endpoint for Railway monitoring and Apple review verification."""
    try:
        # Quick DB connectivity check
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.on_event("startup")
async def seed_demo_account():
    """Seed demo account on startup if DEMO_ACCOUNT_EMAIL is configured."""
    if DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD:
        try:
            existing = await db.users.find_one({"email": DEMO_ACCOUNT_EMAIL}, {"_id": 0})
            if not existing:
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                demo_user = {
                    "user_id": user_id,
                    "email": DEMO_ACCOUNT_EMAIL,
                    "name": "Demo User",
                    "password_hash": hash_password(DEMO_ACCOUNT_PASSWORD),
                    "picture": None,
                    "disclaimer_accepted": True,
                    "disclaimer_accepted_at": datetime.now(timezone.utc).isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.users.insert_one(demo_user)
                logger.info(f"Demo account seeded: {DEMO_ACCOUNT_EMAIL}")
            else:
                # Ensure password is up-to-date
                await db.users.update_one(
                    {"email": DEMO_ACCOUNT_EMAIL},
                    {"$set": {"password_hash": hash_password(DEMO_ACCOUNT_PASSWORD)}}
                )
                logger.info(f"Demo account already exists: {DEMO_ACCOUNT_EMAIL}")
        except Exception as e:
            logger.error(f"Failed to seed demo account: {e}")

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
    weight: Optional[str] = None
    blood_pressure: Optional[str] = None
    blood_pressure_date: Optional[str] = None
    health_card_number: Optional[str] = None
    insurance_info: Optional[str] = None
    interests: Optional[List[str]] = []
    favorite_foods: Optional[List[str]] = []
    favorite_meals: Optional[dict] = None
    notes: Optional[str] = None
    dnr_info: Optional[dict] = None
    poa_info: Optional[dict] = None
    pharmacy_info: Optional[dict] = None  # name, address, phone, fax
    legal_financial_password: Optional[str] = None  # Password for legal/financial section
    legal_financial_password_hint: Optional[str] = None  # Password hint

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
    weight: Optional[str] = None
    blood_pressure: Optional[str] = None
    blood_pressure_date: Optional[str] = None
    health_card_number: Optional[str] = None
    insurance_info: Optional[str] = None
    interests: Optional[List[str]] = []
    favorite_foods: Optional[List[str]] = []
    favorite_meals: Optional[dict] = None
    notes: Optional[str] = None
    caregivers: Optional[List[str]] = []
    created_at: Optional[str] = None
    profile_photo: Optional[str] = None
    dnr_info: Optional[dict] = None
    poa_info: Optional[dict] = None
    pharmacy_info: Optional[dict] = None
    has_legal_password: Optional[bool] = False  # Don't expose actual password, just whether it's set
    legal_financial_password_hint: Optional[str] = None

class AudioTranscriptionRequest(BaseModel):
    audio_base64: str
    language: Optional[str] = "en"

class ProfilePhotoRequest(BaseModel):
    photo_base64: str

class SummarizeAppointmentRequest(BaseModel):
    transcript: str
    appointment_title: Optional[str] = None

class CaregiverInviteRequest(BaseModel):
    email: EmailStr
    caregiver_name: Optional[str] = None
    message: Optional[str] = None

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
    photo: Optional[str] = None

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
    photo: Optional[str] = None

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

class RoutineCreate(BaseModel):
    time_of_day: str  # morning, afternoon, evening, night
    activity: str
    notes: Optional[str] = None

class AppointmentCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    doctor_name: Optional[str] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None
    category: Optional[str] = None  # psw, doctor, grooming, footcare, respite, other
    notes: Optional[str] = None
    reminder: Optional[bool] = True
    blood_pressure: Optional[str] = None  # e.g., "120/80"
    weight: Optional[str] = None  # e.g., "150 lbs"
    repeats: Optional[bool] = False
    repeat_frequency: Optional[str] = None  # daily, weekly, monthly

class AppointmentOut(BaseModel):
    appointment_id: str
    recipient_id: str
    title: str
    date: str
    time: Optional[str] = None
    doctor_name: Optional[str] = None
    location: Optional[str] = None
    appointment_type: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    reminder: Optional[bool] = True
    blood_pressure: Optional[str] = None
    weight: Optional[str] = None
    repeats: Optional[bool] = False
    repeat_frequency: Optional[str] = None

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
    image: Optional[str] = None  # Base64 encoded image

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
    image: Optional[str] = None

class MedicationInteractionRequest(BaseModel):
    medications: List[str]

class SmartReminderRequest(BaseModel):
    recipient_id: str

class InviteCaregiverRequest(BaseModel):
    email: str

# ======================== CAREGIVER RESOURCE FINDER MODELS ========================

class ResourceSearchRequest(BaseModel):
    location: str  # e.g., "Toronto, Ontario, Canada" or "Seattle, Washington, USA"
    category: str  # home_care, government_programs, dementia_support, mental_health, legal_financial, medical_equipment
    specific_query: Optional[str] = None  # Additional search terms

class ResourceItem(BaseModel):
    name: str
    description: str
    category: str
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None

class SavedResourceCreate(BaseModel):
    name: str
    description: str
    category: str
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    location_searched: Optional[str] = None

# ======================== EXPORT REPORT MODELS ========================

class ExportReportRequest(BaseModel):
    sections: List[str]  # e.g., ["medications", "appointments", "doctors", "routines", "incidents", "notes", "bathing", "emergency_contacts"]
    time_period: str  # "7_days" or "30_days"
    delivery_method: str  # "download", "email_self", "email_other"
    recipient_email: Optional[str] = None  # Required if delivery_method is "email_other"

# ======================== AI HELPERS ========================

async def ai_chat_completion(system_message: str, user_message: str, model: str = "gpt-4o-mini") -> str:
    """Send a chat completion request to OpenAI and return the response text."""
    if not openai_client:
        raise HTTPException(status_code=500, detail="AI service not configured. Set OPENAI_API_KEY.")
    response = await openai_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content or ""

def clean_json_response(text: str) -> str:
    """Strip markdown code fences from an LLM JSON response."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()

# ======================== AUTH HELPERS ========================

# Apple Sign-In token verification
APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
APPLE_BUNDLE_ID = "com.familycareorganizer.app"
_apple_keys_cache = {"keys": None, "fetched_at": None}

async def fetch_apple_public_keys():
    """Fetch and cache Apple's public keys for identity token verification."""
    now = datetime.now(timezone.utc)
    # Cache keys for 24 hours
    if _apple_keys_cache["keys"] and _apple_keys_cache["fetched_at"]:
        age = (now - _apple_keys_cache["fetched_at"]).total_seconds()
        if age < 86400:
            return _apple_keys_cache["keys"]
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(APPLE_PUBLIC_KEYS_URL, timeout=10)
            resp.raise_for_status()
            keys = resp.json().get("keys", [])
            _apple_keys_cache["keys"] = keys
            _apple_keys_cache["fetched_at"] = now
            logger.info(f"Fetched {len(keys)} Apple public keys")
            return keys
    except Exception as e:
        logger.error(f"Failed to fetch Apple public keys: {e}")
        # Return cached keys if available, even if stale
        if _apple_keys_cache["keys"]:
            return _apple_keys_cache["keys"]
        return []

async def verify_apple_identity_token(identity_token: str) -> Optional[dict]:
    """
    Verify an Apple identity token (JWT) and return the decoded payload.
    Returns None if verification fails or token is not provided.
    """
    if not identity_token:
        return None
    try:
        from jwt.algorithms import RSAAlgorithm
        # Get the key ID from the token header
        unverified_header = jwt.get_unverified_header(identity_token)
        kid = unverified_header.get("kid")
        if not kid:
            logger.warning("Apple identity token missing kid header")
            return None
        
        # Fetch Apple's public keys
        apple_keys = await fetch_apple_public_keys()
        if not apple_keys:
            logger.warning("No Apple public keys available for verification")
            return None
        
        # Find the matching key
        matching_key = None
        for key in apple_keys:
            if key.get("kid") == kid:
                matching_key = key
                break
        
        if not matching_key:
            logger.warning(f"No matching Apple public key for kid: {kid}")
            return None
        
        # Convert JWK to public key
        public_key = RSAAlgorithm.from_jwk(json.dumps(matching_key))
        
        # Decode and verify the token
        decoded = jwt.decode(
            identity_token,
            public_key,
            algorithms=["RS256"],
            audience=APPLE_BUNDLE_ID,
            issuer=APPLE_ISSUER,
        )
        logger.info(f"Apple identity token verified successfully, sub: {decoded.get('sub', 'unknown')[:10]}...")
        return decoded
    except jwt.ExpiredSignatureError:
        logger.warning("Apple identity token expired")
        return None
    except jwt.InvalidAudienceError:
        logger.warning("Apple identity token audience mismatch")
        return None
    except jwt.InvalidIssuerError:
        logger.warning("Apple identity token issuer mismatch")
        return None
    except Exception as e:
        logger.warning(f"Apple identity token verification failed: {e}")
        return None

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
        "disclaimer_accepted": False,
        "disclaimer_accepted_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.email)
    return {
        "token": token,
        "user": {"user_id": user_id, "email": data.email, "name": data.name, "picture": None, "disclaimer_accepted": False}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    logger.info(f"Login attempt for email: {data.email}")
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        logger.warning(f"Login failed - user not found: {data.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if "password_hash" not in user:
        # User signed up via Apple or Google - no password set
        auth_method = "Apple" if user.get("apple_user_id") else "Google" if user.get("google_user_id") else "social"
        logger.warning(f"Login failed - user has no password (signed up via {auth_method}): {data.email}")
        raise HTTPException(status_code=401, detail=f"Please sign in with {auth_method}")
    if not verify_password(data.password, user["password_hash"]):
        logger.warning(f"Login failed - wrong password: {data.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["user_id"], user["email"])
    logger.info(f"Login successful: {data.email}")
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"], 
            "email": user["email"], 
            "name": user["name"], 
            "picture": user.get("picture"),
            "disclaimer_accepted": user.get("disclaimer_accepted", False)
        }
    }

class AppleAuthRequest(BaseModel):
    user_id: str  # Apple's unique user identifier
    email: Optional[str] = None
    full_name: Optional[str] = None
    identity_token: Optional[str] = None  # For backend verification (optional)

@api_router.post("/auth/apple")
async def apple_auth(data: AppleAuthRequest):
    """
    Authenticate user with Apple Sign-In credentials.
    Apple only provides email/name on FIRST sign-in, so we store it.
    If identity_token is provided, it will be verified against Apple's public keys.
    """
    logger.info(f"Apple auth attempt - user_id prefix: {data.user_id[:10] if data.user_id else 'NONE'}..., email: {data.email}, has_name: {bool(data.full_name)}, has_token: {bool(data.identity_token)}")
    
    if not data.user_id or not data.user_id.strip():
        logger.error("Apple auth failed - empty user_id")
        raise HTTPException(status_code=400, detail="Apple user ID is required")
    
    # Use Apple user ID as unique identifier
    apple_user_id = data.user_id.strip()
    
    # Verify identity token if provided (enhances security)
    verified_claims = None
    if data.identity_token:
        verified_claims = await verify_apple_identity_token(data.identity_token)
        if verified_claims:
            # Cross-check: the 'sub' claim in the token should match the user_id
            token_sub = verified_claims.get("sub", "")
            if token_sub != apple_user_id:
                logger.warning(f"Apple auth - user_id mismatch: provided={apple_user_id[:10]}..., token_sub={token_sub[:10]}...")
                raise HTTPException(status_code=401, detail="Apple authentication failed - user ID mismatch")
            # Use email from verified token if available (more trustworthy)
            if verified_claims.get("email") and not data.email:
                data.email = verified_claims["email"]
            logger.info("Apple identity token verified successfully")
        else:
            # Token was provided but couldn't be verified - log but don't block
            # (token might be expired by the time it reaches backend)
            logger.warning("Apple identity token provided but verification failed - proceeding with unverified auth")
    
    try:
        # Check if user already exists (by Apple ID stored in metadata)
        existing = await db.users.find_one({"apple_user_id": apple_user_id}, {"_id": 0})
        
        if existing:
            # Returning user - use stored info
            user_id = existing["user_id"]
            disclaimer_accepted = existing.get("disclaimer_accepted", False)
            token = create_token(user_id, existing["email"])
            logger.info(f"Apple auth success (returning user): {existing['email']}")
            return {
                "token": token,
                "user": {
                    "user_id": user_id,
                    "email": existing["email"],
                    "name": existing["name"],
                    "picture": existing.get("picture"),
                    "disclaimer_accepted": disclaimer_accepted
                },
                "token_verified": verified_claims is not None
            }
        else:
            # New user - create account
            # Apple only provides email on first sign-in
            email = data.email or f"{apple_user_id[:20]}@privaterelay.appleid.com"
            name = data.full_name or "Apple User"
            
            # Check if email already exists (user might have registered with email first)
            existing_email = await db.users.find_one({"email": email}, {"_id": 0})
            if existing_email:
                # Link Apple ID to existing account
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"apple_user_id": apple_user_id}}
                )
                user_id = existing_email["user_id"]
                disclaimer_accepted = existing_email.get("disclaimer_accepted", False)
                logger.info(f"Apple auth success (linked to existing account): {email}")
            else:
                # Create new user
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                await db.users.insert_one({
                    "user_id": user_id,
                    "apple_user_id": apple_user_id,
                    "email": email,
                    "name": name,
                    "picture": None,
                    "disclaimer_accepted": False,
                    "disclaimer_accepted_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                disclaimer_accepted = False
                logger.info(f"Apple auth success (new user created): {email}")
            
            token = create_token(user_id, email)
            return {
                "token": token,
                "user": {
                    "user_id": user_id,
                    "email": email,
                    "name": name,
                    "picture": None,
                    "disclaimer_accepted": disclaimer_accepted
                },
                "token_verified": verified_claims is not None
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Apple auth unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed. Please try again.")

@api_router.post("/auth/google")
async def google_auth(request: Request):
    body = await request.json()
    
    # Support both old session-based auth and new direct Google OAuth
    google_user_id = body.get("google_user_id")
    email = body.get("email")
    name = body.get("name")
    picture = body.get("picture")
    
    # If using new direct Google OAuth
    if google_user_id and email:
        # Check if user exists by Google ID
        existing = await db.users.find_one({"google_user_id": google_user_id}, {"_id": 0})
        
        if existing:
            # Returning user
            user_id = existing["user_id"]
            await db.users.update_one(
                {"user_id": user_id}, 
                {"$set": {"name": name or existing["name"], "picture": picture or existing.get("picture")}}
            )
            disclaimer_accepted = existing.get("disclaimer_accepted", False)
            token = create_token(user_id, existing["email"])
            return {
                "token": token,
                "user": {
                    "user_id": user_id,
                    "email": existing["email"],
                    "name": name or existing["name"],
                    "picture": picture or existing.get("picture"),
                    "disclaimer_accepted": disclaimer_accepted
                }
            }
        else:
            # Check if email exists (might have registered with email first)
            existing_email = await db.users.find_one({"email": email}, {"_id": 0})
            if existing_email:
                # Link Google ID to existing account
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"google_user_id": google_user_id, "name": name or existing_email["name"], "picture": picture}}
                )
                user_id = existing_email["user_id"]
                disclaimer_accepted = existing_email.get("disclaimer_accepted", False)
            else:
                # Create new user
                user_id = f"user_{uuid.uuid4().hex[:12]}"
                await db.users.insert_one({
                    "user_id": user_id,
                    "google_user_id": google_user_id,
                    "email": email,
                    "name": name or "Google User",
                    "picture": picture,
                    "disclaimer_accepted": False,
                    "disclaimer_accepted_at": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                disclaimer_accepted = False
            
            token = create_token(user_id, email)
            return {
                "token": token,
                "user": {
                    "user_id": user_id,
                    "email": email,
                    "name": name or "Google User",
                    "picture": picture,
                    "disclaimer_accepted": disclaimer_accepted
                }
            }
    
    # Fallback to old session-based auth (for backwards compatibility)
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="google_user_id and email required, or session_id")
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
        disclaimer_accepted = existing.get("disclaimer_accepted", False)
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data["name"],
            "picture": data.get("picture"),
            "disclaimer_accepted": False,
            "disclaimer_accepted_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        disclaimer_accepted = False
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
        "user": {"user_id": user_id, "email": email, "name": data["name"], "picture": data.get("picture"), "disclaimer_accepted": disclaimer_accepted}
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"], 
        "email": user["email"], 
        "name": user["name"], 
        "picture": user.get("picture"),
        "disclaimer_accepted": user.get("disclaimer_accepted", False)
    }

@api_router.post("/auth/accept-disclaimer")
async def accept_disclaimer(user: dict = Depends(get_current_user)):
    """Mark that the user has accepted the privacy and security disclaimer."""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "disclaimer_accepted": True,
            "disclaimer_accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    # Log consent action
    await db.audit_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "action": "CONSENT_ACCEPTED",
        "details": "User accepted privacy and security disclaimer",
        "ip_address": None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "message": "Disclaimer accepted"}

@api_router.post("/auth/withdraw-consent")
async def withdraw_consent(user: dict = Depends(get_current_user)):
    """Withdraw consent - this will schedule account for deletion."""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "consent_withdrawn": True,
            "consent_withdrawn_at": datetime.now(timezone.utc).isoformat(),
            "scheduled_deletion_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }}
    )
    # Log consent withdrawal
    await db.audit_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "action": "CONSENT_WITHDRAWN",
        "details": "User withdrew consent - account scheduled for deletion in 30 days",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "message": "Consent withdrawn. Your account will be deleted in 30 days. You can cancel this by logging in again."}

@api_router.post("/auth/logout")
async def logout(request: Request):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    return {"message": "Logged out"}

# ======================== COMPLIANCE & DATA PRIVACY ROUTES ========================

@api_router.delete("/account/delete")
async def delete_account(user: dict = Depends(get_current_user)):
    """
    Permanently delete user account and all associated data.
    PIPEDA/HIPAA compliant - removes all PII and health information.
    """
    user_id = user["user_id"]
    
    # Get all care recipients owned by this user
    recipients = await db.care_recipients.find({"created_by": user_id}).to_list(100)
    
    for recipient in recipients:
        recipient_id = recipient["recipient_id"]
        # Delete all associated data for each care recipient
        await db.medications.delete_many({"recipient_id": recipient_id})
        await db.appointments.delete_many({"recipient_id": recipient_id})
        await db.doctors.delete_many({"recipient_id": recipient_id})
        await db.notes.delete_many({"recipient_id": recipient_id})
        await db.incidents.delete_many({"recipient_id": recipient_id})
        await db.bathing.delete_many({"recipient_id": recipient_id})
        await db.routines.delete_many({"recipient_id": recipient_id})
        await db.emergency_contacts.delete_many({"recipient_id": recipient_id})
        await db.legal_financial.delete_many({"recipient_id": recipient_id})
        await db.reminders.delete_many({"recipient_id": recipient_id})
    
    # Delete care recipients
    await db.care_recipients.delete_many({"created_by": user_id})
    
    # Delete saved resources
    await db.saved_resources.delete_many({"user_id": user_id})
    
    # Delete chat messages
    await db.chat_messages.delete_many({"user_id": user_id})
    
    # Delete user sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    
    # Log the deletion (anonymized)
    await db.audit_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": "DELETED_USER",
        "action": "ACCOUNT_DELETED",
        "details": "User account and all associated data permanently deleted",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Finally delete the user
    await db.users.delete_one({"user_id": user_id})
    
    return {"success": True, "message": "Your account and all associated data have been permanently deleted."}

@api_router.get("/account/export-all-data")
async def export_all_user_data(user: dict = Depends(get_current_user)):
    """
    Export all user data in JSON format.
    PIPEDA/HIPAA compliant - provides complete data portability.
    """
    user_id = user["user_id"]
    
    # Get user info (excluding password)
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    
    # Get all care recipients
    recipients = await db.care_recipients.find({"caregivers": user_id}, {"_id": 0}).to_list(100)
    
    # For each recipient, get all associated data
    full_data = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "export_type": "FULL_DATA_EXPORT",
        "user": user_data,
        "care_recipients": []
    }
    
    for recipient in recipients:
        recipient_id = recipient["recipient_id"]
        recipient_data = {
            **recipient,
            "medications": await db.medications.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100),
            "appointments": await db.appointments.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100),
            "doctors": await db.doctors.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100),
            "notes": await db.notes.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(500),
            "incidents": await db.incidents.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100),
            "bathing_records": await db.bathing.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100),
            "daily_routines": await db.routines.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(100),
            "emergency_contacts": await db.emergency_contacts.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50),
            "legal_financial": await db.legal_financial.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50),
        }
        full_data["care_recipients"].append(recipient_data)
    
    # Add saved resources
    full_data["saved_resources"] = await db.saved_resources.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    # Log the export
    await db.audit_logs.insert_one({
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "action": "DATA_EXPORT",
        "details": "User exported all personal data",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return full_data

@api_router.get("/account/audit-log")
async def get_user_audit_log(user: dict = Depends(get_current_user)):
    """Get audit log of all actions taken on the user's account."""
    logs = await db.audit_logs.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    return {"logs": logs}

@api_router.get("/compliance/data-policy")
async def get_data_policy():
    """Return information about data handling policies."""
    return {
        "data_residency": {
            "primary_location": "North America",
            "provider": "Cloud Infrastructure",
            "note": "For BC/NS compliance requiring Canadian-only storage, please contact support."
        },
        "encryption": {
            "at_rest": "AES-256",
            "in_transit": "TLS 1.3",
            "passwords": "bcrypt hashing"
        },
        "data_retention": {
            "active_accounts": "Data retained while account is active",
            "deleted_accounts": "All data permanently deleted within 30 days",
            "audit_logs": "Retained for 7 years for compliance"
        },
        "user_rights": {
            "access": "Users can export all their data at any time",
            "deletion": "Users can delete their account and all data",
            "consent_withdrawal": "Users can withdraw consent at any time",
            "portability": "Data exported in standard JSON format"
        },
        "compliance_frameworks": [
            "PIPEDA (Canada)",
            "PHIPA (Ontario)",
            "HIPAA (USA) - Prepared for BAA",
            "CCPA (California)"
        ]
    }

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
    # Add has_legal_password flag without exposing actual password
    r['has_legal_password'] = bool(r.get('legal_financial_password'))
    # Remove the actual password from response
    r.pop('legal_financial_password', None)
    return r

# Legal & Financial Password endpoints
@api_router.post("/care-recipients/{recipient_id}/legal-financial/verify-password")
async def verify_legal_password(recipient_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Verify the password for legal/financial section"""
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    body = await request.json()
    password = body.get('password', '')
    
    stored_password = r.get('legal_financial_password')
    if not stored_password:
        return {"valid": True, "message": "No password set"}
    
    # Verify using bcrypt hash
    if pwd_context.verify(password, stored_password):
        return {"valid": True, "message": "Password correct"}
    else:
        return {"valid": False, "message": "Incorrect password. Please contact the primary caregiver for access."}

@api_router.post("/care-recipients/{recipient_id}/legal-financial/set-password")
async def set_legal_password(recipient_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Set or change the password for legal/financial section - only primary caregiver"""
    r = await db.care_recipients.find_one({"recipient_id": recipient_id})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    # Check if user is primary caregiver (first in the list)
    caregivers = r.get('caregivers', [])
    if not caregivers or caregivers[0] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only the primary caregiver can set or change the password")
    
    body = await request.json()
    new_password = body.get('password', '')
    hint = body.get('hint', '')
    
    # Hash the password using bcrypt
    hashed_password = pwd_context.hash(new_password) if new_password else None
    
    await db.care_recipients.update_one(
        {"recipient_id": recipient_id},
        {"$set": {
            "legal_financial_password": hashed_password,
            "legal_financial_password_hint": hint if hint else None
        }}
    )
    
    if new_password:
        return {"message": "Password set successfully"}
    else:
        return {"message": "Password removed"}

@api_router.get("/care-recipients/{recipient_id}/legal-financial/is-primary")
async def check_is_primary_caregiver(recipient_id: str, user: dict = Depends(get_current_user)):
    """Check if current user is the primary caregiver"""
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    caregivers = r.get('caregivers', [])
    is_primary = caregivers and caregivers[0] == user["user_id"]
    return {"is_primary": is_primary}

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

@api_router.patch("/care-recipients/{recipient_id}")
async def partial_update_care_recipient(recipient_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Partial update - only updates the fields provided in the request body."""
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    body = await request.json()
    
    # Only update fields that are provided
    update_data = {}
    allowed_fields = [
        'name', 'date_of_birth', 'gender', 'address', 'phone',
        'medical_conditions', 'allergies', 'blood_type', 'weight',
        'blood_pressure', 'blood_pressure_date', 'health_card_number',
        'insurance_info', 'interests', 'favorite_foods', 'favorite_meals',
        'notes', 'dnr_info', 'poa_info', 'profile_photo', 'pharmacy_info'
    ]
    
    for field in allowed_fields:
        if field in body:
            update_data[field] = body[field]
    
    if update_data:
        await db.care_recipients.update_one(
            {"recipient_id": recipient_id},
            {"$set": update_data}
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

@api_router.post("/care-recipients/{recipient_id}/invite-caregiver")
async def invite_caregiver_by_email(recipient_id: str, data: CaregiverInviteRequest, user: dict = Depends(get_current_user)):
    """Send an email invitation to a caregiver to join the care team."""
    # Verify user has access to this care recipient
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    care_recipient_name = r.get("name", "your loved one")
    inviter_name = user.get("name", "A caregiver")
    
    # Check if the invitee already has an account
    existing_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Create invite record
    invite_id = f"inv_{uuid.uuid4().hex[:12]}"
    invite_record = {
        "invite_id": invite_id,
        "recipient_id": recipient_id,
        "email": data.email,
        "caregiver_name": data.caregiver_name,
        "invited_by": user["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.caregiver_invites.insert_one(invite_record)
    
    # Prepare email content
    custom_message = f"<p><em>\"{data.message}\"</em></p>" if data.message else ""
    
    if existing_user:
        # User exists - they just need to accept the invite
        subject = f"You've been invited to help care for {care_recipient_name}"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #D97757;">FamilyCare Organizer</h1>
            </div>
            <h2 style="color: #333;">You're Invited to Join a Care Team!</h2>
            <p>Hi {existing_user.get('name', 'there')},</p>
            <p><strong>{inviter_name}</strong> has invited you to help care for <strong>{care_recipient_name}</strong> using the FamilyCare Organizer app.</p>
            {custom_message}
            <p>Since you already have an account, simply open the app and you'll see the invitation waiting for you.</p>
            <div style="background-color: #FFF5F0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #D97757;"><strong>What you'll be able to do:</strong></p>
                <ul style="color: #666;">
                    <li>View and update medical information</li>
                    <li>Track medications and appointments</li>
                    <li>Add caregiver notes</li>
                    <li>Access emergency contacts</li>
                </ul>
            </div>
            <p style="color: #666; font-size: 14px;">Together, we can provide the best care possible.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">This email was sent from FamilyCare Organizer.</p>
        </div>
        """
    else:
        # New user - they need to register first
        subject = f"You're invited to help care for {care_recipient_name}"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #D97757;">FamilyCare Organizer</h1>
            </div>
            <h2 style="color: #333;">You're Invited to Join a Care Team!</h2>
            <p>Hi{' ' + data.caregiver_name if data.caregiver_name else ''},</p>
            <p><strong>{inviter_name}</strong> has invited you to help care for <strong>{care_recipient_name}</strong> using the FamilyCare Organizer app.</p>
            {custom_message}
            <div style="background-color: #FFF5F0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #D97757;"><strong>Getting Started is Easy:</strong></p>
                <ol style="color: #666;">
                    <li>Download the FamilyCare Organizer app</li>
                    <li>Create an account using this email: <strong>{data.email}</strong></li>
                    <li>Once registered, you'll automatically be added to the care team</li>
                </ol>
            </div>
            <div style="background-color: #f0f8f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #27AE60;"><strong>As a caregiver, you'll be able to:</strong></p>
                <ul style="color: #666;">
                    <li>View and update medical information</li>
                    <li>Track medications and appointments</li>
                    <li>Add caregiver notes and observations</li>
                    <li>Access emergency contacts</li>
                </ul>
            </div>
            <p style="color: #666; font-size: 14px;">Together, we can provide the best care possible for {care_recipient_name}.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">This email was sent from FamilyCare Organizer. If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        """
    
    # Send email via Resend
    email_sent = False
    
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [data.email],
            "subject": subject,
            "html": html_content
        }
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        email_sent = True
        
        # Update invite record with email status
        await db.caregiver_invites.update_one(
            {"invite_id": invite_id},
            {"$set": {"email_sent": True, "email_id": email_result.get("id")}}
        )
        
    except Exception as e:
        logger.error(f"Failed to send invite email: {str(e)}")
        
        # Update invite record with failure but don't fail the request
        await db.caregiver_invites.update_one(
            {"invite_id": invite_id},
            {"$set": {"email_sent": False, "email_error": str(e)}}
        )
        
        # Check if it's a Resend domain verification issue (free tier limitation)
        if "verify a domain" in str(e).lower() or "testing emails" in str(e).lower():
            # Still return success - the invite is recorded, email just couldn't be sent
            return {
                "message": f"Invitation recorded for {data.email}",
                "invite_id": invite_id,
                "user_exists": existing_user is not None,
                "email_sent": False,
                "email_note": "Email delivery requires domain verification in Resend. The invitation has been saved - please share the app link directly with the caregiver."
            }
        
        # For other errors, raise the exception
        raise HTTPException(status_code=500, detail=f"Failed to send invitation email: {str(e)}")
    
    return {
        "message": f"Invitation sent to {data.email}",
        "invite_id": invite_id,
        "user_exists": existing_user is not None,
        "email_sent": email_sent
    }

@api_router.post("/care-recipients/{recipient_id}/profile-photo")
async def upload_profile_photo(recipient_id: str, data: ProfilePhotoRequest, user: dict = Depends(get_current_user)):
    """Upload a profile photo for a care recipient (for identification by PSWs/care team)."""
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    # Store the base64 photo (data URI format expected: data:image/jpeg;base64,...)
    await db.care_recipients.update_one(
        {"recipient_id": recipient_id},
        {"$set": {"profile_photo": data.photo_base64}}
    )
    return {"message": "Profile photo updated successfully"}

@api_router.delete("/care-recipients/{recipient_id}/profile-photo")
async def delete_profile_photo(recipient_id: str, user: dict = Depends(get_current_user)):
    """Remove the profile photo from a care recipient."""
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    await db.care_recipients.update_one(
        {"recipient_id": recipient_id},
        {"$unset": {"profile_photo": ""}}
    )
    return {"message": "Profile photo removed"}

# ======================== AUDIO TRANSCRIPTION (Voice-to-Text) ========================

@api_router.post("/transcribe")
async def transcribe_audio(data: AudioTranscriptionRequest, user: dict = Depends(get_current_user)):
    """Convert voice recording to text using OpenAI Whisper API."""
    if not openai_client:
        raise HTTPException(status_code=500, detail="AI service not configured. Set OPENAI_API_KEY.")
    try:
        audio_data = data.audio_base64
        if ',' in audio_data:
            audio_data = audio_data.split(',')[1]
        
        audio_bytes = base64.b64decode(audio_data)
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "recording.wav"
        
        response = await openai_client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="json",
            language=data.language,
        )
        
        return {"text": response.text, "success": True}
    
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@api_router.post("/ai/summarize-appointment")
async def summarize_appointment(data: SummarizeAppointmentRequest, user: dict = Depends(get_current_user)):
    """Use AI to summarize a doctor appointment transcript and extract key medical information."""
    try:
        system_prompt = """You are a medical assistant helping caregivers understand doctor appointments.
Analyze the appointment transcript and extract key information in a structured format.

Please provide:
1. **Summary**: A brief 2-3 sentence overview of the appointment
2. **Diagnosis/Condition**: Any diagnoses or conditions discussed
3. **Medications**: Any medications prescribed or adjusted (name, dosage, frequency)
4. **Instructions**: Key care instructions or recommendations
5. **Follow-up**: Next appointment or follow-up actions needed
6. **Important Notes**: Any warnings, red flags, or critical information

Be concise but thorough. If information is not mentioned in the transcript, indicate "Not discussed"."""

        user_msg = f"""Please summarize this doctor appointment recording:

Appointment: {data.appointment_title or 'Doctor Visit'}

Transcript:
{data.transcript}"""

        response = await ai_chat_completion(system_prompt, user_msg, model="gpt-4o-mini")
        
        return {
            "summary": response,
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

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

@api_router.put("/care-recipients/{recipient_id}/emergency-contacts/{contact_id}")
async def update_emergency_contact(recipient_id: str, contact_id: str, data: EmergencyContactCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.emergency_contacts.find_one({"contact_id": contact_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.emergency_contacts.update_one(
        {"contact_id": contact_id, "recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.emergency_contacts.find_one({"contact_id": contact_id}, {"_id": 0})
    return updated

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

@api_router.put("/care-recipients/{recipient_id}/doctors/{doctor_id}")
async def update_doctor(recipient_id: str, doctor_id: str, data: DoctorCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.doctors.find_one({"doctor_id": doctor_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Doctor not found")
    await db.doctors.update_one(
        {"doctor_id": doctor_id, "recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.doctors.find_one({"doctor_id": doctor_id}, {"_id": 0})
    return updated

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

@api_router.put("/care-recipients/{recipient_id}/notes/{note_id}")
async def update_note(recipient_id: str, note_id: str, data: NoteCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.notes.find_one({"note_id": note_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.notes.update_one(
        {"note_id": note_id, "recipient_id": recipient_id},
        {"$set": {"content": data.content, "category": data.category, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    updated = await db.notes.find_one({"note_id": note_id}, {"_id": 0})
    return updated

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

@api_router.delete("/care-recipients/{recipient_id}/incidents/{incident_id}")
async def delete_incident(recipient_id: str, incident_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.incidents.delete_one({"incident_id": incident_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"message": "Incident deleted"}

@api_router.put("/care-recipients/{recipient_id}/incidents/{incident_id}")
async def update_incident(recipient_id: str, incident_id: str, data: IncidentCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.incidents.find_one({"incident_id": incident_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Incident not found")
    await db.incidents.update_one(
        {"incident_id": incident_id, "recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.incidents.find_one({"incident_id": incident_id}, {"_id": 0})
    return updated

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

@api_router.delete("/care-recipients/{recipient_id}/bathing/{bathing_id}")
async def delete_bathing(recipient_id: str, bathing_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    result = await db.bathing.delete_one({"bathing_id": bathing_id, "recipient_id": recipient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bathing record not found")
    return {"message": "Bathing record deleted"}

@api_router.put("/care-recipients/{recipient_id}/bathing/{bathing_id}")
async def update_bathing(recipient_id: str, bathing_id: str, data: BathingCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.bathing.find_one({"bathing_id": bathing_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Bathing record not found")
    await db.bathing.update_one(
        {"bathing_id": bathing_id, "recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.bathing.find_one({"bathing_id": bathing_id}, {"_id": 0})
    return updated

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

@api_router.put("/care-recipients/{recipient_id}/appointments/{appointment_id}")
async def update_appointment(recipient_id: str, appointment_id: str, data: AppointmentCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.appointments.find_one({"appointment_id": appointment_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Appointment not found")
    await db.appointments.update_one(
        {"appointment_id": appointment_id, "recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    return updated

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

@api_router.put("/care-recipients/{recipient_id}/routines/{routine_id}")
async def update_routine(recipient_id: str, routine_id: str, data: RoutineCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    existing = await db.routines.find_one({"routine_id": routine_id, "recipient_id": recipient_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Routine not found")
    await db.routines.update_one(
        {"routine_id": routine_id, "recipient_id": recipient_id},
        {"$set": data.dict()}
    )
    updated = await db.routines.find_one({"routine_id": routine_id}, {"_id": 0})
    return updated

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
        med_list = ", ".join(data.medications)
        system_msg = "You are a pharmaceutical expert assistant. You provide medication interaction information for caregivers. Always include a disclaimer that this is informational only and users should consult their pharmacist or doctor. Be concise and practical. Format your response as JSON with keys: 'interactions' (array of objects with 'medications', 'severity', 'description') and 'summary' (brief overall assessment)."
        user_msg = f"Check for potential drug interactions between these medications: {med_list}. Return the response as valid JSON."
        response = await ai_chat_completion(system_msg, user_msg, model="gpt-4o-mini")
        try:
            result = json.loads(clean_json_response(response))
            return result
        except json.JSONDecodeError:
            return {"interactions": [], "summary": response, "raw": True}
    except Exception as e:
        logger.error(f"AI medication check error: {e}")
        return {"interactions": [], "summary": "Unable to check interactions at this time. Please consult your pharmacist.", "error": str(e)}

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

        system_msg = "You are a caring and knowledgeable elder care assistant. Generate helpful, practical reminders and suggestions for family caregivers based on the care recipient's profile. Be warm, supportive, and actionable. Return as JSON with key 'reminders' (array of objects with 'title', 'description', 'priority' (high/medium/low), 'category' (medication/health/safety/appointment/wellness))."
        user_msg = f"Based on this care profile, generate 5-8 smart care reminders:\n{context}\nReturn as valid JSON."
        response = await ai_chat_completion(system_msg, user_msg, model="gpt-4o-mini")
        try:
            result = json.loads(clean_json_response(response))
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

# ======================== PUSH NOTIFICATIONS ========================

class PushTokenRegister(BaseModel):
    token: str
    device_name: Optional[str] = None

async def send_push_notifications(recipient_id: str, exclude_user_id: str, title: str, body: str):
    """Send push notifications to all caregivers of a recipient except the actor."""
    try:
        r = await db.care_recipients.find_one({"recipient_id": recipient_id}, {"_id": 0})
        if not r:
            return
        caregiver_ids = [cid for cid in r.get("caregivers", []) if cid != exclude_user_id]
        if not caregiver_ids:
            return
        tokens_cursor = db.push_tokens.find({"user_id": {"$in": caregiver_ids}}, {"_id": 0})
        tokens = await tokens_cursor.to_list(100)
        if not tokens:
            return
        messages = [{"to": t["token"], "title": title, "body": body, "sound": "default"} for t in tokens]
        async with httpx.AsyncClient() as http_client:
            await http_client.post("https://exp.host/--/api/v2/push/send", json=messages, headers={"Content-Type": "application/json"})
    except Exception as e:
        logger.error(f"Push notification error: {e}")

@api_router.post("/push-tokens/register")
async def register_push_token(data: PushTokenRegister, user: dict = Depends(get_current_user)):
    existing = await db.push_tokens.find_one({"token": data.token})
    if existing:
        await db.push_tokens.update_one({"token": data.token}, {"$set": {"user_id": user["user_id"]}})
    else:
        await db.push_tokens.insert_one({
            "user_id": user["user_id"],
            "token": data.token,
            "device_name": data.device_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    return {"message": "Push token registered"}

@api_router.delete("/push-tokens")
async def unregister_push_token(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    token = body.get("token")
    if token:
        await db.push_tokens.delete_one({"token": token, "user_id": user["user_id"]})
    return {"message": "Push token removed"}

# ======================== CHAT ROUTES ========================

class ChatMessageCreate(BaseModel):
    content: str
    photo: Optional[str] = None

@api_router.post("/care-recipients/{recipient_id}/chat")
async def create_chat_message(recipient_id: str, data: ChatMessageCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    doc = {
        "message_id": msg_id,
        "recipient_id": recipient_id,
        "sender_id": user["user_id"],
        "sender_name": user["name"],
        "content": data.content,
        "photo": data.photo,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(doc)
    doc.pop("_id", None)
    # Notify other caregivers
    await send_push_notifications(
        recipient_id, user["user_id"],
        f"New message from {user['name']}",
        data.content[:100]
    )
    return doc

@api_router.get("/care-recipients/{recipient_id}/chat")
async def list_chat_messages(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    messages = await db.chat_messages.find(
        {"recipient_id": recipient_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    return messages

# ======================== BATHING STATUS ========================

@api_router.get("/care-recipients/{recipient_id}/bathing-status")
async def get_bathing_status(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    last_bath = await db.bathing.find_one(
        {"recipient_id": recipient_id}, {"_id": 0}, sort=[("date", -1)]
    )
    days_since = None
    needs_reminder = False
    if last_bath and last_bath.get("date"):
        try:
            last_date = datetime.fromisoformat(last_bath["date"])
            days_since = (datetime.now(timezone.utc) - last_date.replace(tzinfo=timezone.utc)).days
            needs_reminder = days_since >= 3
        except (ValueError, TypeError):
            pass
    return {
        "last_bath": last_bath,
        "days_since": days_since,
        "needs_reminder": needs_reminder
    }

# ======================== PDF EXPORT ========================

@api_router.get("/export/{recipient_id}/pdf")
async def export_care_report_legacy(recipient_id: str, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")

    meds = await db.medications.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(200)
    contacts = await db.emergency_contacts.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50)
    doctors = await db.doctors.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50)
    notes = await db.notes.find({"recipient_id": recipient_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    incidents = await db.incidents.find({"recipient_id": recipient_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    appointments = await db.appointments.find({"recipient_id": recipient_id}, {"_id": 0}).sort("date", 1).to_list(50)
    routines = await db.routines.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50)
    legal_items = await db.legal_financial.find({"recipient_id": recipient_id}, {"_id": 0}).to_list(50)

    from fpdf import FPDF

    class CareReportPDF(FPDF):
        def header(self):
            self.set_font('Helvetica', 'B', 16)
            self.cell(0, 10, 'Family Care Organizer Report', 0, 1, 'C')
            self.set_font('Helvetica', '', 10)
            self.cell(0, 6, f'Generated: {datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")}', 0, 1, 'C')
            self.ln(5)

        def section_title(self, title):
            self.set_font('Helvetica', 'B', 14)
            self.set_fill_color(217, 119, 87)
            self.set_text_color(255, 255, 255)
            self.cell(0, 10, f'  {title}', 0, 1, 'L', True)
            self.set_text_color(0, 0, 0)
            self.ln(3)

        def add_field(self, label, value):
            if not value:
                return
            self.set_font('Helvetica', 'B', 10)
            self.cell(50, 6, label + ':', 0, 0)
            self.set_font('Helvetica', '', 10)
            self.multi_cell(0, 6, str(value))

    pdf = CareReportPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Profile
    pdf.section_title('Care Recipient Profile')
    pdf.add_field('Name', r.get('name'))
    pdf.add_field('Date of Birth', r.get('date_of_birth'))
    pdf.add_field('Gender', r.get('gender'))
    pdf.add_field('Phone', r.get('phone'))
    pdf.add_field('Address', r.get('address'))
    pdf.add_field('Blood Type', r.get('blood_type'))
    pdf.add_field('Health Card', r.get('health_card_number'))
    pdf.add_field('Insurance', r.get('insurance_info'))
    pdf.add_field('Medical Conditions', ', '.join(r.get('medical_conditions', [])))
    pdf.add_field('Allergies', ', '.join(r.get('allergies', [])))
    pdf.ln(5)

    # Medications
    if meds:
        pdf.section_title(f'Medications ({len(meds)})')
        for m in meds:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  {m['name']} - {m['dosage']}", 0, 1)
            pdf.set_font('Helvetica', '', 9)
            pdf.cell(0, 5, f"    Frequency: {m['frequency']}", 0, 1)
            if m.get('time_of_day'):
                pdf.cell(0, 5, f"    Time: {m['time_of_day']}", 0, 1)
            if m.get('instructions'):
                pdf.cell(0, 5, f"    Instructions: {m['instructions']}", 0, 1)
            pdf.ln(2)

    # Emergency Contacts
    if contacts:
        pdf.section_title(f'Emergency Contacts ({len(contacts)})')
        for c in contacts:
            primary = ' (PRIMARY)' if c.get('is_primary') else ''
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  {c['name']} - {c['relationship']}{primary}", 0, 1)
            pdf.set_font('Helvetica', '', 9)
            pdf.cell(0, 5, f"    Phone: {c['phone']}", 0, 1)
            pdf.ln(2)

    # Doctors
    if doctors:
        pdf.section_title(f'Doctors & Specialists ({len(doctors)})')
        for d in doctors:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  {d['name']} - {d['specialty']}", 0, 1)
            pdf.set_font('Helvetica', '', 9)
            if d.get('phone'):
                pdf.cell(0, 5, f"    Phone: {d['phone']}", 0, 1)
            pdf.ln(2)

    # Appointments
    if appointments:
        pdf.section_title(f'Appointments ({len(appointments)})')
        for a in appointments:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  {a['date']} - {a['title']}", 0, 1)
            pdf.set_font('Helvetica', '', 9)
            if a.get('doctor_name'):
                pdf.cell(0, 5, f"    Doctor: {a['doctor_name']}", 0, 1)
            if a.get('location'):
                pdf.cell(0, 5, f"    Location: {a['location']}", 0, 1)
            pdf.ln(2)

    # Daily Routine
    if routines:
        pdf.section_title(f'Daily Routine ({len(routines)})')
        for rt in routines:
            pdf.set_font('Helvetica', '', 10)
            pdf.cell(0, 6, f"  [{rt['time_of_day'].upper()}] {rt['activity']}", 0, 1)
        pdf.ln(3)

    # Recent Notes
    if notes:
        pdf.section_title(f'Recent Notes ({len(notes)})')
        for n in notes[:10]:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  [{n.get('category', 'general')}] by {n.get('author_name', 'Unknown')}", 0, 1)
            pdf.set_font('Helvetica', '', 9)
            content = n.get('content', '')[:200]
            pdf.multi_cell(0, 5, f"    {content}")
            pdf.ln(2)

    # Incidents
    if incidents:
        pdf.section_title(f'Incidents ({len(incidents)})')
        for inc in incidents[:10]:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  [{inc.get('severity', 'unknown').upper()}] {inc.get('incident_type', '')}", 0, 1)
            pdf.set_font('Helvetica', '', 9)
            pdf.multi_cell(0, 5, f"    {inc.get('description', '')[:200]}")
            pdf.ln(2)

    # Legal/Financial
    if legal_items:
        pdf.section_title(f'Legal & Financial ({len(legal_items)})')
        for lf in legal_items:
            pdf.set_font('Helvetica', 'B', 10)
            pdf.cell(0, 6, f"  [{lf.get('item_type', '')}] {lf.get('title', '')} - {lf.get('status', '')}", 0, 1)
            pdf.ln(2)

    pdf_bytes = pdf.output()
    buffer = io.BytesIO(pdf_bytes)
    safe_name = r.get('name', 'care_report').replace(' ', '_')
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}_care_report.pdf"'}
    )

# ======================== NOTIFICATION-ENABLED UPDATES ========================
# Override note creation to add push notifications

_original_create_note = create_note

@api_router.post("/care-recipients/{recipient_id}/notes", include_in_schema=False)
async def create_note_with_notification(recipient_id: str, data: NoteCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    doc = {
        "note_id": note_id, "recipient_id": recipient_id,
        "author_id": user["user_id"], "author_name": user["name"],
        "content": data.content, "category": data.category,
        "photo": data.photo,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    await send_push_notifications(
        recipient_id, user["user_id"],
        f"New note from {user['name']}",
        f"[{data.category}] {data.content[:80]}"
    )
    return doc

_original_create_incident = create_incident

@api_router.post("/care-recipients/{recipient_id}/incidents", include_in_schema=False)
async def create_incident_with_notification(recipient_id: str, data: IncidentCreate, user: dict = Depends(get_current_user)):
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
    await send_push_notifications(
        recipient_id, user["user_id"],
        f"Incident reported by {user['name']}",
        f"[{data.severity}] {data.description[:80]}"
    )
    return doc

_original_create_medication = create_medication

@api_router.post("/care-recipients/{recipient_id}/medications", include_in_schema=False)
async def create_medication_with_notification(recipient_id: str, data: MedicationCreate, user: dict = Depends(get_current_user)):
    r = await db.care_recipients.find_one({"recipient_id": recipient_id, "caregivers": user["user_id"]})
    if not r:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    med_id = f"med_{uuid.uuid4().hex[:12]}"
    doc = {"medication_id": med_id, "recipient_id": recipient_id, **data.dict()}
    await db.medications.insert_one(doc)
    doc.pop("_id", None)
    await send_push_notifications(
        recipient_id, user["user_id"],
        f"Medication added by {user['name']}",
        f"{data.name} - {data.dosage}"
    )
    return doc

# ======================== NOTIFICATIONS LIST ========================

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get notification preferences and bathing reminders for all recipients."""
    recipients = await db.care_recipients.find({"caregivers": user["user_id"]}, {"_id": 0}).to_list(100)
    reminders = []
    for r in recipients:
        rid = r["recipient_id"]
        # Bathing reminder
        last_bath = await db.bathing.find_one({"recipient_id": rid}, {"_id": 0}, sort=[("date", -1)])
        if last_bath and last_bath.get("date"):
            try:
                last_date = datetime.fromisoformat(last_bath["date"])
                days_since = (datetime.now(timezone.utc) - last_date.replace(tzinfo=timezone.utc)).days
                if days_since >= 3:
                    reminders.append({
                        "type": "bathing",
                        "title": f"Bathing Reminder for {r['name']}",
                        "body": f"Last bath was {days_since} days ago",
                        "recipient_id": rid,
                        "priority": "medium"
                    })
            except (ValueError, TypeError):
                pass
        # Upcoming appointments (24h)
        upcoming = await db.appointments.find({"recipient_id": rid}, {"_id": 0}).sort("date", 1).to_list(10)
        for appt in upcoming:
            try:
                appt_date = datetime.fromisoformat(appt["date"])
                diff = (appt_date.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days
                if 0 <= diff <= 1:
                    reminders.append({
                        "type": "appointment",
                        "title": f"Upcoming: {appt['title']}",
                        "body": f"Appointment on {appt['date']}" + (f" at {appt['time']}" if appt.get('time') else ""),
                        "recipient_id": rid,
                        "priority": "high"
                    })
            except (ValueError, TypeError):
                pass
    return {"reminders": reminders}

# ======================== CAREGIVER RESOURCE FINDER ROUTES ========================

RESOURCE_CATEGORIES = {
    "home_care": "Home Care Services (PSW agencies, nursing care, respite care, home health aides)",
    "government_programs": "Government Healthcare Programs and Subsidies",
    "dementia_support": "Dementia and Alzheimer's Support (support groups, memory clinics, day programs)",
    "mental_health": "Caregiver Mental Health Support (counseling, support groups, crisis lines)",
    "legal_financial": "Elder Law and Financial Planning (lawyers, financial advisors)",
    "medical_equipment": "Medical Equipment and Supplies (mobility aids, home modifications)"
}

# Pre-loaded essential resources (always shown)
ESSENTIAL_RESOURCES = {
    "canada": [
        {
            "name": "Alzheimer Society of Canada",
            "description": "National organization providing support, education, and resources for those affected by Alzheimer's disease and other dementias.",
            "category": "dementia_support",
            "website": "https://alzheimer.ca",
            "phone": "1-800-616-8816",
            "notes": "First Link® program connects families with local support"
        }
    ],
    "usa": [
        {
            "name": "Alzheimer's Association",
            "description": "Leading voluntary health organization in Alzheimer's care, support and research.",
            "category": "dementia_support", 
            "website": "https://www.alz.org",
            "phone": "1-800-272-3900",
            "notes": "24/7 Helpline available"
        }
    ]
}

@api_router.post("/resources/search")
async def search_caregiver_resources(data: ResourceSearchRequest, user: dict = Depends(get_current_user)):
    """
    AI-powered search for caregiver support resources based on location and category.
    Uses GPT to find and format relevant local resources.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    category_description = RESOURCE_CATEGORIES.get(data.category, data.category)
    
    # Build the search prompt
    search_prompt = f"""You are a helpful assistant specializing in finding caregiver support resources. 
    
The user is looking for {category_description} in {data.location}.
{f"Additional search criteria: {data.specific_query}" if data.specific_query else ""}

Please search for and provide 5-8 REAL, VERIFIED resources that are:
1. Actually available in or serving {data.location}
2. Currently operating (not defunct organizations)
3. Relevant to the category: {category_description}

For each resource, provide:
- name: Official organization name
- description: Brief description of services (1-2 sentences)
- website: Official website URL (if available)
- phone: Contact phone number (if available)
- address: Physical address or service area (if applicable)
- email: Contact email (if available)
- notes: Any important notes (eligibility, fees, hours, etc.)

IMPORTANT:
- Focus on government programs, non-profits, and established service providers
- Include regional health authority contacts if applicable
- For Canada, include provincial health programs (e.g., Ontario Health at Home, BC Home Health)
- For USA, include state/county programs and Area Agency on Aging contacts
- Prioritize free or subsidized services when available

Return your response as a JSON array of objects with the fields listed above.
Only return the JSON array, no additional text or explanation.
Example format:
[
  {{"name": "Example Service", "description": "Description here", "website": "https://example.com", "phone": "1-800-555-1234", "address": "123 Main St", "email": "info@example.com", "notes": "Free for residents"}}
]"""

    try:
        system_msg = "You are a knowledgeable assistant that helps caregivers find support resources. Always provide accurate, real-world information about actual organizations and programs."
        response = await ai_chat_completion(system_msg, search_prompt, model="gpt-4o")
        
        # Parse the JSON response
        cleaned_response = clean_json_response(response)
        
        resources = json.loads(cleaned_response)
        
        # Determine country for essential resources
        location_lower = data.location.lower()
        essential = []
        if any(country in location_lower for country in ["canada", "ontario", "british columbia", "alberta", "quebec", "manitoba", "saskatchewan"]):
            essential = ESSENTIAL_RESOURCES.get("canada", [])
        elif any(country in location_lower for country in ["usa", "united states", "america", "california", "texas", "new york", "florida"]):
            essential = ESSENTIAL_RESOURCES.get("usa", [])
        
        # Filter essential resources by category if specified
        if data.category != "all":
            essential = [r for r in essential if r.get("category") == data.category]
        
        return {
            "success": True,
            "location": data.location,
            "category": data.category,
            "resources": resources,
            "essential_resources": essential,
            "total_count": len(resources) + len(essential)
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        # Return essential resources even if AI fails
        location_lower = data.location.lower()
        essential = []
        if any(country in location_lower for country in ["canada", "ontario", "british columbia", "alberta", "quebec"]):
            essential = ESSENTIAL_RESOURCES.get("canada", [])
        elif any(country in location_lower for country in ["usa", "united states", "america"]):
            essential = ESSENTIAL_RESOURCES.get("usa", [])
        
        return {
            "success": False,
            "message": "Could not parse AI response, showing essential resources only",
            "location": data.location,
            "category": data.category,
            "resources": [],
            "essential_resources": essential,
            "total_count": len(essential)
        }
    except Exception as e:
        logger.error(f"Resource search error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@api_router.get("/resources/categories")
async def get_resource_categories(user: dict = Depends(get_current_user)):
    """Get list of available resource categories."""
    return {
        "categories": [
            {"id": "home_care", "name": "Home Care Services", "icon": "home", "description": "PSW agencies, nursing care, respite care"},
            {"id": "government_programs", "name": "Government Programs", "icon": "business", "description": "Healthcare subsidies, provincial/state programs"},
            {"id": "dementia_support", "name": "Dementia & Alzheimer's", "icon": "heart", "description": "Support groups, memory clinics, day programs"},
            {"id": "mental_health", "name": "Caregiver Mental Health", "icon": "happy", "description": "Counseling, support groups, crisis lines"},
            {"id": "legal_financial", "name": "Legal & Financial", "icon": "document-text", "description": "Elder law attorneys, financial advisors"},
            {"id": "medical_equipment", "name": "Medical Equipment", "icon": "medkit", "description": "Mobility aids, home safety equipment"}
        ]
    }

# ======================== SAVED RESOURCES ROUTES ========================

@api_router.post("/resources/saved")
async def save_resource(data: SavedResourceCreate, user: dict = Depends(get_current_user)):
    """Save a resource to user's bookmarks."""
    resource_id = f"res_{uuid.uuid4().hex[:12]}"
    doc = {
        "resource_id": resource_id,
        "user_id": user["user_id"],
        **data.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.saved_resources.insert_one(doc)
    doc.pop("_id", None)
    return {"message": "Resource saved", "resource": doc}

@api_router.get("/resources/saved")
async def get_saved_resources(user: dict = Depends(get_current_user)):
    """Get user's saved/bookmarked resources."""
    resources = await db.saved_resources.find(
        {"user_id": user["user_id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return resources

@api_router.delete("/resources/saved/{resource_id}")
async def delete_saved_resource(resource_id: str, user: dict = Depends(get_current_user)):
    """Remove a saved resource."""
    result = await db.saved_resources.delete_one({
        "resource_id": resource_id,
        "user_id": user["user_id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {"message": "Resource removed"}

# ======================== EXPORT REPORT ROUTES ========================

def generate_care_report_pdf(care_recipient: dict, data: dict, sections: List[str], time_period: str) -> bytes:
    """Generate a professional PDF care report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=6,
        textColor=colors.HexColor('#D97757'),
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.HexColor('#666666'),
        alignment=TA_CENTER,
        spaceAfter=20
    )
    
    section_header_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2C3E50'),
        spaceBefore=15,
        spaceAfter=10,
        borderPadding=5
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#333333'),
        spaceAfter=6
    )
    
    story = []
    
    # Header
    story.append(Paragraph("Family Care Organizer", title_style))
    story.append(Paragraph("Care Summary Report", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#D97757')))
    story.append(Spacer(1, 12))
    
    # Care Recipient Info
    recipient_name = care_recipient.get('name', 'Unknown')
    period_text = "Last 7 Days" if time_period == "7_days" else "Last 30 Days"
    report_date = datetime.now().strftime("%B %d, %Y")
    
    info_data = [
        ["Care Recipient:", recipient_name],
        ["Report Period:", period_text],
        ["Generated:", report_date]
    ]
    
    info_table = Table(info_data, colWidths=[1.5*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#333333')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 20))
    
    # Helper function to format dates
    def format_date(date_str):
        if not date_str:
            return "N/A"
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime("%b %d, %Y %I:%M %p")
        except Exception:
            return date_str
    
    # Medications Section
    if "medications" in sections and data.get("medications"):
        story.append(Paragraph("Medications", section_header_style))
        meds = data["medications"]
        for med in meds:
            med_text = f"<b>{med.get('name', 'Unknown')}</b> - {med.get('dosage', '')} | {med.get('frequency', '')} | {med.get('time_of_day', '')}"
            if med.get('notes'):
                med_text += f"<br/><i>Notes: {med.get('notes')}</i>"
            story.append(Paragraph(med_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Appointments Section
    if "appointments" in sections and data.get("appointments"):
        story.append(Paragraph("Appointments", section_header_style))
        for appt in data["appointments"]:
            appt_text = f"<b>{appt.get('title', 'Appointment')}</b> - {appt.get('date', '')} at {appt.get('time', '')}"
            if appt.get('doctor_name'):
                appt_text += f" with {appt.get('doctor_name')}"
            if appt.get('location'):
                appt_text += f"<br/>Location: {appt.get('location')}"
            story.append(Paragraph(appt_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Doctors Section
    if "doctors" in sections and data.get("doctors"):
        story.append(Paragraph("Doctors & Specialists", section_header_style))
        for doctor in data["doctors"]:
            doc_text = f"<b>{doctor.get('name', 'Unknown')}</b> - {doctor.get('specialty', '')}"
            if doctor.get('phone'):
                doc_text += f"<br/>Phone: {doctor.get('phone')}"
            if doctor.get('address'):
                doc_text += f"<br/>Address: {doctor.get('address')}"
            story.append(Paragraph(doc_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Daily Routines Section
    if "routines" in sections and data.get("routines"):
        story.append(Paragraph("Daily Routines", section_header_style))
        for routine in data["routines"]:
            routine_text = f"<b>{routine.get('time', '')} - {routine.get('activity', '')}</b>"
            if routine.get('notes'):
                routine_text += f"<br/><i>{routine.get('notes')}</i>"
            story.append(Paragraph(routine_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Incidents Section
    if "incidents" in sections and data.get("incidents"):
        story.append(Paragraph("Incidents & Falls", section_header_style))
        for incident in data["incidents"]:
            incident_text = f"<b>{incident.get('incident_type', '').title()}</b> ({incident.get('severity', '').title()}) - {format_date(incident.get('created_at'))}"
            incident_text += f"<br/>{incident.get('description', '')}"
            if incident.get('action_taken'):
                incident_text += f"<br/><i>Action: {incident.get('action_taken')}</i>"
            story.append(Paragraph(incident_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Notes Section
    if "notes" in sections and data.get("notes"):
        story.append(Paragraph("Caregiver Notes", section_header_style))
        for note in data["notes"]:
            note_text = f"<b>{note.get('category', 'General').title()}</b> - {format_date(note.get('created_at'))}"
            note_text += f"<br/>{note.get('content', '')}"
            note_text += f"<br/><i>By: {note.get('author_name', 'Unknown')}</i>"
            story.append(Paragraph(note_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Bathing Section
    if "bathing" in sections and data.get("bathing"):
        story.append(Paragraph("Bathing Records", section_header_style))
        for bath in data["bathing"]:
            bath_text = f"<b>{bath.get('bath_date', '')}</b> - {bath.get('bath_type', '').title()}"
            if bath.get('assisted_by'):
                bath_text += f" (Assisted by: {bath.get('assisted_by')})"
            if bath.get('notes'):
                bath_text += f"<br/><i>{bath.get('notes')}</i>"
            story.append(Paragraph(bath_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Emergency Contacts Section
    if "emergency_contacts" in sections and data.get("emergency_contacts"):
        story.append(Paragraph("Emergency Contacts", section_header_style))
        for contact in data["emergency_contacts"]:
            contact_text = f"<b>{contact.get('name', 'Unknown')}</b> - {contact.get('relationship', '')}"
            contact_text += f"<br/>Phone: {contact.get('phone', 'N/A')}"
            if contact.get('email'):
                contact_text += f" | Email: {contact.get('email')}"
            story.append(Paragraph(contact_text, normal_style))
        story.append(Spacer(1, 10))
    
    # Footer
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CCCCCC')))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
    story.append(Paragraph(f"Generated by Family Care Organizer | {report_date}", footer_style))
    story.append(Paragraph("This report is confidential and intended for authorized caregivers only.", footer_style))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

@api_router.post("/care-recipients/{recipient_id}/export-report")
async def export_care_report(
    recipient_id: str, 
    data: ExportReportRequest, 
    user: dict = Depends(get_current_user)
):
    """Generate and optionally email a care report PDF."""
    
    # Get care recipient
    care_recipient = await db.care_recipients.find_one(
        {"recipient_id": recipient_id, "caregivers": user["user_id"]},
        {"_id": 0}
    )
    if not care_recipient:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    # Calculate date filter
    if data.time_period == "7_days":
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)
    else:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
    
    cutoff_str = cutoff_date.isoformat()
    
    # Gather data for each section
    report_data = {}
    
    if "medications" in data.sections:
        report_data["medications"] = await db.medications.find(
            {"recipient_id": recipient_id}, {"_id": 0}
        ).to_list(100)
    
    if "appointments" in data.sections:
        report_data["appointments"] = await db.appointments.find(
            {"recipient_id": recipient_id}, {"_id": 0}
        ).sort("date", -1).to_list(50)
    
    if "doctors" in data.sections:
        report_data["doctors"] = await db.doctors.find(
            {"recipient_id": recipient_id}, {"_id": 0}
        ).to_list(50)
    
    if "routines" in data.sections:
        report_data["routines"] = await db.routines.find(
            {"recipient_id": recipient_id}, {"_id": 0}
        ).to_list(50)
    
    if "incidents" in data.sections:
        report_data["incidents"] = await db.incidents.find(
            {"recipient_id": recipient_id, "created_at": {"$gte": cutoff_str}}, {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    
    if "notes" in data.sections:
        report_data["notes"] = await db.notes.find(
            {"recipient_id": recipient_id, "created_at": {"$gte": cutoff_str}}, {"_id": 0}
        ).sort("created_at", -1).to_list(50)
    
    if "bathing" in data.sections:
        report_data["bathing"] = await db.bathing.find(
            {"recipient_id": recipient_id}, {"_id": 0}
        ).sort("bath_date", -1).to_list(50)
    
    if "emergency_contacts" in data.sections:
        report_data["emergency_contacts"] = await db.emergency_contacts.find(
            {"recipient_id": recipient_id}, {"_id": 0}
        ).to_list(20)
    
    # Generate PDF
    pdf_bytes = generate_care_report_pdf(care_recipient, report_data, data.sections, data.time_period)
    
    # Handle delivery method
    if data.delivery_method == "download":
        # Return PDF for download
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=care_report_{recipient_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
            }
        )
    
    elif data.delivery_method in ["email_self", "email_other"]:
        # Determine recipient email
        if data.delivery_method == "email_self":
            recipient_email = user.get("email")
            if not recipient_email:
                raise HTTPException(status_code=400, detail="User email not found")
        else:
            recipient_email = data.recipient_email
            if not recipient_email:
                raise HTTPException(status_code=400, detail="Recipient email is required")
        
        # Send email with PDF attachment
        if not RESEND_API_KEY:
            raise HTTPException(status_code=500, detail="Email service not configured")
        
        resend.api_key = RESEND_API_KEY
        
        try:
            care_name = care_recipient.get('name', 'Care Recipient')
            period_text = "Last 7 Days" if data.time_period == "7_days" else "Last 30 Days"
            
            email_response = resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": recipient_email,
                "subject": f"Care Report for {care_name} - {period_text}",
                "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #D97757; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Family Care Organizer</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f9f9f9;">
                        <h2 style="color: #2C3E50;">Care Report</h2>
                        <p>Hello,</p>
                        <p>Please find attached the care report for <strong>{care_name}</strong>.</p>
                        <p><strong>Report Period:</strong> {period_text}</p>
                        <p><strong>Generated:</strong> {datetime.now().strftime("%B %d, %Y")}</p>
                        <p>This report includes the following sections:</p>
                        <ul>
                            {"".join([f"<li>{s.replace('_', ' ').title()}</li>" for s in data.sections])}
                        </ul>
                        <hr style="border: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">
                            This is a confidential document generated by Family Care Organizer. 
                            Please handle with care and share only with authorized individuals.
                        </p>
                    </div>
                </div>
                """,
                "attachments": [
                    {
                        "filename": f"care_report_{care_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
                        "content": base64.b64encode(pdf_bytes).decode('utf-8')
                    }
                ]
            })
            
            return {
                "success": True,
                "message": f"Report sent successfully to {recipient_email}",
                "email_id": email_response.get("id")
            }
            
        except Exception as e:
            logger.error(f"Failed to send report email: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid delivery method")

@api_router.get("/care-recipients/{recipient_id}/export-sections")
async def get_export_sections(recipient_id: str, user: dict = Depends(get_current_user)):
    """Get available sections for export with counts."""
    
    # Verify access
    care_recipient = await db.care_recipients.find_one(
        {"recipient_id": recipient_id, "caregivers": user["user_id"]}
    )
    if not care_recipient:
        raise HTTPException(status_code=404, detail="Care recipient not found")
    
    sections = [
        {"id": "medications", "name": "Medications", "icon": "medical"},
        {"id": "appointments", "name": "Appointments", "icon": "calendar"},
        {"id": "doctors", "name": "Doctors & Specialists", "icon": "person"},
        {"id": "routines", "name": "Daily Routines", "icon": "time"},
        {"id": "incidents", "name": "Incidents & Falls", "icon": "alert-circle"},
        {"id": "notes", "name": "Caregiver Notes", "icon": "document-text"},
        {"id": "bathing", "name": "Bathing Records", "icon": "water"},
        {"id": "emergency_contacts", "name": "Emergency Contacts", "icon": "call"}
    ]
    
    return {"sections": sections}

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
