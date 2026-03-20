from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import bcrypt
import httpx

from jose import jwt, JWTError

from core.config import db, logger

router = APIRouter(prefix="/auth", tags=["auth"])

# JWT config
JWT_SECRET = "vitaguide_jwt_secret_2026_xK9mP2vL"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 30

# Emergent Google Auth
EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


# ── Models ──

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    profile_id: Optional[str] = None  # link existing profile

class LoginRequest(BaseModel):
    email: str
    password: str
    profile_id: Optional[str] = None  # link existing local profile on first login

class GoogleAuthRequest(BaseModel):
    session_id: str
    profile_id: Optional[str] = None  # link existing profile

class UserResponse(BaseModel):
    user_id: str
    email: str
    first_name: Optional[str] = None
    picture: Optional[str] = None
    profile_id: Optional[str] = None
    auth_provider: str
    created_at: str


# ── Helpers ──

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> str:
    """Returns user_id from token or raises."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Ungültiger oder abgelaufener Token")


async def get_current_user(request: Request) -> dict:
    """Extract and validate user from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    token = auth_header.split(" ", 1)[1]
    user_id = decode_token(token)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
    return user


def user_to_response(user: dict) -> dict:
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "first_name": user.get("first_name"),
        "picture": user.get("picture"),
        "profile_id": user.get("profile_id"),
        "auth_provider": user.get("auth_provider", "email"),
        "created_at": str(user.get("created_at", "")),
    }


# ── Routes ──

@router.post("/register")
async def register(req: RegisterRequest):
    """Register with email + password."""
    email = req.email.strip().lower()
    if not email or not req.password:
        raise HTTPException(status_code=400, detail="E-Mail und Passwort erforderlich")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 6 Zeichen lang sein")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="E-Mail bereits registriert")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "user_id": user_id,
        "email": email,
        "password_hash": hash_password(req.password),
        "first_name": req.first_name or "",
        "picture": "",
        "profile_id": req.profile_id or "",
        "auth_provider": "email",
        "created_at": now,
        "last_login": now,
    }

    # If profile_id provided, update the health profile to link to user
    if req.profile_id:
        await db.health_profiles.update_one(
            {"id": req.profile_id},
            {"$set": {"user_id": user_id}}
        )

    await db.users.insert_one(user_doc)
    token = create_token(user_id)

    logger.info(f"User registered: {email} ({user_id})")
    return {"token": token, "user": user_to_response(user_doc)}


@router.post("/login")
async def login(req: LoginRequest):
    """Login with email + password."""
    email = req.email.strip().lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch")

    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Bitte mit Google anmelden")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch")

    # Link local profile if provided and user has no profile yet
    if req.profile_id and not user.get("profile_id"):
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"profile_id": req.profile_id}}
        )
        await db.health_profiles.update_one(
            {"id": req.profile_id},
            {"$set": {"user_id": user["user_id"]}}
        )
        user["profile_id"] = req.profile_id

    # Update last login
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )

    token = create_token(user["user_id"])
    logger.info(f"User logged in: {email}")
    return {"token": token, "user": user_to_response(user)}


@router.post("/google")
async def google_auth(req: GoogleAuthRequest):
    """Authenticate with Emergent Google OAuth session_id."""
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id erforderlich")

    # Exchange session_id with Emergent Auth
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                EMERGENT_AUTH_SESSION_URL,
                headers={"X-Session-ID": req.session_id},
                timeout=10,
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Google-Authentifizierung fehlgeschlagen")
            google_data = resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Authentifizierungsdienst nicht erreichbar")

    email = google_data.get("email", "").strip().lower()
    name = google_data.get("name", "")
    picture = google_data.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Keine E-Mail von Google erhalten")

    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()

    if user:
        # Update existing user
        update = {"last_login": now, "picture": picture}
        if name and not user.get("first_name"):
            update["first_name"] = name.split()[0] if name else ""
        # Link profile if provided and user has none
        if req.profile_id and not user.get("profile_id"):
            update["profile_id"] = req.profile_id
            await db.health_profiles.update_one(
                {"id": req.profile_id},
                {"$set": {"user_id": user["user_id"]}}
            )
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
        user.update(update)
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "password_hash": "",
            "first_name": name.split()[0] if name else "",
            "picture": picture,
            "profile_id": req.profile_id or "",
            "auth_provider": "google",
            "google_id": google_data.get("id", ""),
            "created_at": now,
            "last_login": now,
        }
        if req.profile_id:
            await db.health_profiles.update_one(
                {"profile_id": req.profile_id},
                {"$set": {"user_id": user_id}}
            )
        await db.users.insert_one(user)
        logger.info(f"Google user created: {email} ({user_id})")

    token = create_token(user["user_id"])
    return {"token": token, "user": user_to_response(user)}


@router.get("/me")
async def get_me(request: Request):
    """Get current user data (requires JWT)."""
    user = await get_current_user(request)
    return {"user": user_to_response(user)}


@router.post("/link-profile")
async def link_profile(request: Request):
    """Link a health_profile_id to the current user."""
    user = await get_current_user(request)
    body = await request.json()
    profile_id = body.get("profile_id", "")
    if not profile_id:
        raise HTTPException(status_code=400, detail="profile_id erforderlich")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"profile_id": profile_id}}
    )
    await db.health_profiles.update_one(
        {"id": profile_id},
        {"$set": {"user_id": user["user_id"]}}
    )
    logger.info(f"Profile {profile_id} linked to user {user['user_id']}")
    return {"success": True, "profile_id": profile_id}


@router.get("/sync-data/{profile_id}")
async def sync_all_data(profile_id: str, request: Request):
    """Fetch all user data for local caching. Requires auth."""
    user = await get_current_user(request)
    # Only allow syncing own data
    if user.get("profile_id") != profile_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")

    # Fetch all relevant data
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    plan = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    medications = await db.medications.find({"profile_id": profile_id}, {"_id": 0}).to_list(100)
    water_goal = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    points = await db.user_points.find_one({"profile_id": profile_id}, {"_id": 0})
    streak = await db.user_streaks.find_one({"profile_id": profile_id}, {"_id": 0})
    settings_doc = await db.reward_settings.find_one({}, {"_id": 0})

    return {
        "profile": profile,
        "supplement_plan": plan,
        "medications": medications,
        "water_goal": water_goal,
        "points": points,
        "streak": streak,
        "reward_settings": settings_doc,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/logout")
async def logout(request: Request):
    """Logout - client should delete the token."""
    return {"success": True}
