# ======================= Imports =======================
import os
import uuid
from datetime import datetime, timedelta
import requests
import base64
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, logger, status, Header, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
import hashlib
import re
from dotenv import load_dotenv

# from win32comext import authorization
from auth import SECRET_KEY
from datetime import timezone
import secrets, hashlib

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

from db import get_db
from models import CustomUser, Chat, ChatMessage, UserSearchHistory, PasswordResetToken
from auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, verify_token, SECRET_KEY
)

# Database Configuration (from db.py)
USE_POSTGRES = os.getenv("USE_POSTGRES", "").lower() == "true"
DB_NAME = os.getenv("DB_NAME", "")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# Google OAuth settings
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def get_google_oauth_config() -> tuple[str, str]:
    """Resolve Google OAuth credentials from environment variables."""
    load_dotenv(BACKEND_DIR / ".env", override=False)
    client_id = (os.getenv("GOOGLE_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip()

    if not client_id or not client_secret:
        raise RuntimeError("Google OAuth client ID/secret are not configured.")

    return client_id, client_secret

# Groq API settings
DEFAULT_GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"


def get_groq_config() -> tuple[str, str]:
    """Resolve Groq credentials from environment variables with safe defaults."""
    load_dotenv(BACKEND_DIR / ".env", override=False)

    groq_api_key = (os.getenv("GROQ_API_KEY") or "").strip()
    groq_api_url = (os.getenv("GROQ_API_URL") or DEFAULT_GROQ_API_URL).strip()

    if not groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    if not groq_api_url.startswith(("http://", "https://")):
        groq_api_url = DEFAULT_GROQ_API_URL

    return groq_api_key, groq_api_url


def get_groq_model() -> str:
    return (os.getenv("GROQ_MODEL") or DEFAULT_GROQ_MODEL).strip()


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _validate_username(username: str) -> Optional[str]:
    username_value = (username or "").strip()
    if len(username_value) < 3:
        return "Username must be at least 3 characters."
    if not re.fullmatch(r"[A-Za-z0-9_]+", username_value):
        return "Username can only contain letters, numbers, and underscores."
    return None


def _validate_email(email: str) -> Optional[str]:
    email_value = (email or "").strip()
    if not re.fullmatch(r"[^@\s]+@gmail\.com", email_value, re.IGNORECASE):
        return "Email must end with @gmail.com."
    return None


def _validate_password(password: str) -> Optional[str]:
    password_value = password or ""
    if len(password_value) < 9:
        return "Password must be at least 9 characters."
    if not re.search(r"\d", password_value):
        return "Password must include at least one number."
    if not re.search(r"[^A-Za-z0-9\s]", password_value):
        return "Password must include at least one special character."
    return None

from email_utils import send_email

# ======================= Router =======================
router = APIRouter()

# ======================= Request Schemas =======================
class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# ======================= Password Management Endpoints =======================
@router.post("/api/auth/password-reset/", tags=["Authentication"])
def password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Initiate password reset by sending a reset link to user's email.
    
    - **email**: User's email address
    - Returns: Success message if email exists, silent if not
    """
    normalized_email = _normalize_email(req.email)
    user = db.query(CustomUser).filter(func.lower(CustomUser.email) == normalized_email).first()
    if user:
        token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256((token + SECRET_KEY).encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        prt = PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at, used=False)
        db.add(prt)
        db.commit()
        reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
        subject = "Password reset instructions"
        body = f"Hello {user.username},\n\nWe received a request to reset your password. If you requested this, open the link below to set a new password:\n\n{reset_link}\n\nIf you didn't request this, you can safely ignore this email.\n\nThis link will expire in 1 hour."
        try:
            # Use SendGrid integration for email delivery
            send_email(user.email, subject, body)
        except Exception as e:
            print(f"[password_reset] failed to send email: {e}")
    return {"detail": "If an account with that email exists, instructions have been sent."}

@router.post("/api/auth/password-reset/confirm/", tags=["Authentication"])
def password_reset_confirm(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Confirm password reset using token and set new password.
    
    - **token**: Password reset token from email link
    - **new_password**: New password to set
    - Returns: Success or error if token is invalid/expired
    """
    token_hash = hashlib.sha256((req.token + SECRET_KEY).encode()).hexdigest()
    now = datetime.now(timezone.utc)
    prt = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash, PasswordResetToken.used == False, PasswordResetToken.expires_at > now).first()
    if not prt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    user = db.query(CustomUser).filter(CustomUser.id == prt.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    user.password = hash_password(req.new_password)
    prt.used = True
    db.add(user)
    db.add(prt)
    db.commit()
    return {"detail": "Password has been reset. You can now sign in with your new password."}

@router.post("/api/profile/change-password/", tags=["Profile"])
def change_password(password_data: ChangePasswordRequest, authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Change password for authenticated user.
    
    - **old_password**: Current password
    - **new_password**: New password to set
    - **authorization**: Bearer token from header
    - Returns: Success or error if old password is incorrect
    """
    user = get_current_user(authorization, db)
    if not verify_password(password_data.old_password, user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Old password is incorrect")
    if password_data.new_password == password_data.old_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different from old password")
    user.password = hash_password(password_data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ======================= Pydantic Schemas =======================

class UserRegister(BaseModel):
    username: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class PromptRequest(BaseModel):
    chat_id: Optional[str] = None
    content: str


class ChatMessageResponse(BaseModel):
    role: str
    content: str

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SearchQueryRequest(BaseModel):
    search_query: str


class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    date_joined: datetime

    class Config:
        from_attributes = True


class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None


class UpdateChatTitleRequest(BaseModel):
    title: str




# ======================= ChangePasswordRequest Model =======================
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ======================= Helper Functions =======================

def get_current_user(token: str, db: Session) -> CustomUser:
    """Get current user from JWT token"""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    if not token.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    token = token.replace("Bearer ", "")
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user = db.query(CustomUser).filter(CustomUser.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def create_chat_title(user_message: str) -> str:
    """Create a short title for the chat using Groq"""
    try:
        groq_api_key, groq_api_url = get_groq_config()
        headers = {"Authorization": f"Bearer {groq_api_key}"}
        payload = {
            "model": get_groq_model(),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a helpful assistant. Provide a short descriptive title "
                        "for the user's conversation in 3-5 words. Do not add quotes."
                    ),
                },
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 16,
            "temperature": 0.2,
        }
        response = requests.post(groq_api_url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        title = data["choices"][0]["message"]["content"].strip()
        if not title:
            title = user_message[:50]
    except Exception:
        title = user_message[:50]
    return title



# ======================= Default ========================== #

@router.get("/")
async def read_root():
    """Serve the documentation homepage"""
    root_dir = Path(__file__).parent.parent
    index_path = root_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path, media_type="text/html")
    return {"message": "ChatPaat Documentation - Visit /docs for API documentation"}


@router.get("/health/")
def health_check():
    """Health check endpoint with database info"""
    return {
        "status": "healthy",
        "database": {
            "type": "PostgreSQL" if USE_POSTGRES else "SQLite",
            "host": DB_HOST if USE_POSTGRES else "local",
            "port": DB_PORT if USE_POSTGRES else "N/A",
            "database": DB_NAME if USE_POSTGRES else "db.sqlite3",
            "user": DB_USER if USE_POSTGRES else "N/A"
        }
    }


@router.post("/api/store_search/")
def user_search(
    search_data: SearchQueryRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Store user search query in the database
    """
    # Get current user
    user = get_current_user(authorization, db)
    
    if not search_data.search_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query is required."
        )
    
    # Store search query
    search_history = UserSearchHistory(
        user_id=user.id,
        search_query=search_data.search_query,
        created_at=datetime.now(timezone.utc)
    )
    db.add(search_history)
    db.commit()
    
    return {
        "message": "Search query stored successfully."
    }


# ======================= Authentication Endpoints =======================

@router.post("/api/register/", tags=["Authentication"])
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user
    """
    normalized_username = (user_data.username or "").strip()
    normalized_email = _normalize_email(user_data.email)

    username_error = _validate_username(normalized_username)
    if username_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=username_error)

    email_error = _validate_email(normalized_email)
    if email_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=email_error)

    password_error = _validate_password(user_data.password)
    if password_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=password_error)

    # Check if username already exists
    existing_user = db.query(CustomUser).filter(func.lower(CustomUser.username) == normalized_username.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists."
        )
    
    # Check if email already exists
    existing_email = db.query(CustomUser).filter(func.lower(CustomUser.email) == normalized_email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Create new user
    new_user = CustomUser(
        username=normalized_username,
        email=normalized_email,
        password=hash_password(user_data.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create tokens
    access_token = create_access_token({"sub": str(new_user.id)})
    refresh_token = create_refresh_token({"sub": str(new_user.id)})
    
    return {
        "access": access_token,
        "refresh": refresh_token,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email
        }
    }


@router.post("/api/login/", tags=["Authentication"])
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return JWT tokens
    """
    # Find user by email
    normalized_email = _normalize_email(user_data.email)
    user = db.query(CustomUser).filter(func.lower(CustomUser.email) == normalized_email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(user_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credentials"
        )
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return {
        "access": access_token,
        "refresh": refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


# ======================= Google OAuth Endpoints =======================


def _ensure_unique_username(db: Session, base_username: str) -> str:
    username = base_username
    counter = 1
    while db.query(CustomUser).filter(CustomUser.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1
    return username


def _exchange_code_for_tokens(code: str, redirect_uri: str) -> dict:
    token_url = "https://oauth2.googleapis.com/token"
    client_id, client_secret = get_google_oauth_config()
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    resp = requests.post(token_url, data=data, timeout=10)
    
    if not resp.ok:
        print(f"\n[ERROR] ❌ Google token exchange failed: {resp.status_code}")
        print(f"  Response Text: {resp.text}\n")
    else:
        print(f"✅ Token exchange successful!")
    
    resp.raise_for_status()
    return resp.json()


def _get_google_userinfo(access_token: str) -> dict:
    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(userinfo_url, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


class GoogleExchangeRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None


@router.post("/api/auth/google/exchange/", tags=["Authentication"])
def google_exchange(req: GoogleExchangeRequest, db: Session = Depends(get_db)):
    """
    Exchange Google OAuth2 authorization code for tokens, create/upsert user,
    and return local JWT tokens.
    Frontend should send the `code` it received and the `redirect_uri` used.
    """
    try:
        get_google_oauth_config()
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=str(e))

    redirect_uri = req.redirect_uri or f"{FRONTEND_URL}/oauth-callback"
    print(f"[google_exchange] Received code; redirect_uri={redirect_uri}")

    try:
        token_data = _exchange_code_for_tokens(req.code, redirect_uri)
    except Exception as e:
        error_msg = f"Failed to exchange code: {str(e)}"
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=error_msg)

    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="No access token returned from Google")

    try:
        info = _get_google_userinfo(access_token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Failed to fetch userinfo: {str(e)}")

    email = info.get("email")
    name = info.get("name") or ""
    sub = info.get("sub")

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Google did not return an email for this account")

    # Upsert user
    user = db.query(CustomUser).filter(CustomUser.email == email).first()
    if not user:
        base_username = email.split("@")[0]
        username = _ensure_unique_username(db, base_username)
        # Create a random password since we don't use it for OAuth users
        random_pw = str(uuid.uuid4())
        user = CustomUser(
            username=username,
            email=email,
            password=hash_password(random_pw),
            first_name=name
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create local JWTs
    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})

    return {
        "access": access,
        "refresh": refresh,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name
        }
    }


# ======================= Token Refresh & Logout Endpoints =======================

@router.post("/api/refresh-token/", tags=["Authentication"])
def refresh_token(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token
    
    - **authorization**: Bearer refresh token from header
    - Returns: New access and refresh tokens
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Verify user still exists
    user = db.query(CustomUser).filter(CustomUser.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Generate new tokens
    new_access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    logger.info(f"✅ Tokens refreshed for user {user.id}")
    
    return {
        "access": new_access_token,
        "refresh": new_refresh_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }


@router.post("/api/logout/", tags=["Authentication"])
def logout(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    Logout endpoint - frontend should delete local tokens
    
    - **authorization**: Bearer token from header
    - Returns: Logout confirmation
    """
    user = get_current_user(authorization, db)
    logger.info(f"✅ User {user.id} logged out")
    
    # In future, store revoked tokens in Redis/cache for token blacklisting
    return {"detail": "Logged out successfully"}


# ======================= User Profile Endpoints =======================

@router.get("/api/profile/", tags=["Profile"])
def get_profile(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile information
    """
    user = get_current_user(authorization, db)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        # "image": user.image,
        "date_joined": user.date_joined
    }


@router.put("/api/profile/", tags=["Profile"])
def update_profile(
    profile_data: UpdateProfileRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Update user's profile information (name, email)
    """
    user = get_current_user(authorization, db)
    
    email_updated = False
    
    # Check if email is being updated and if it's already taken
    if profile_data.email and profile_data.email != user.email:
        existing_email = db.query(CustomUser).filter(
            CustomUser.email == profile_data.email
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists."
            )
        user.email = profile_data.email
        email_updated = True
    
    if profile_data.first_name is not None:
        user.first_name = profile_data.first_name
    if profile_data.last_name is not None:
        user.last_name = profile_data.last_name
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "Profile updated successfully",
        "email_updated": email_updated,
        "email": user.email,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "image": user.image
        }
    }


@router.post("/api/profile/upload-image/", tags=["Profile"])
def upload_profile_image(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Upload user's profile image (stored as base64)
    """
    user = get_current_user(authorization, db)
    
    try:
        # Read the uploaded file
        contents = file.file.read()
        
        # Validate file size (max 5MB)
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only JPEG, PNG, GIF, and WebP images are allowed"
            )
        
        # Convert to base64
        image_base64 = base64.b64encode(contents).decode('utf-8')
        image_data_url = f"data:{file.content_type};base64,{image_base64}"
        
        # Save to database
        user.image = image_data_url
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Profile image uploaded successfully",
            "image": user.image,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "image": user.image,
                "image": user.image
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error uploading image: {str(e)}"
        )


@router.delete("/api/profile/", tags=["Profile"])
def delete_account(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Delete user account and all associated data
    """
    user = get_current_user(authorization, db)
    
    try:
        user_id = user.id
        username = user.username
        db.delete(user)
        db.commit()
        
        return {
            "message": "Account deleted successfully",
            "user_id": user_id,
            "username": username
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting account: {str(e)}"
        )


# ======================= Chat Endpoints =======================

@router.post("/prompt_gpt/", tags=["Chat"])
def prompt_gpt(
    prompt_data: PromptRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Send a prompt to Groq and get response
    """
    # Get current user
    user = get_current_user(authorization, db)
    print(f"\n📨 [prompt_gpt] User: {user.username} (ID: {user.id})")
    
    if not prompt_data.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No prompt content provided."
        )
    
    # Get or create chat
    chat_id = prompt_data.chat_id or str(uuid.uuid4())
    print(f"📋 [prompt_gpt] Chat ID: {chat_id}")
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    
    if chat:
        print(f"✅ [prompt_gpt] Chat exists - checking ownership")
        if chat.user_id != user.id:
            print(f"❌ [prompt_gpt] Unauthorized - Chat owner: {chat.user_id}, User: {user.id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to chat."
            )
    else:
        print(f"🆕 [prompt_gpt] Creating new chat with user_id={user.id}")
        chat = Chat(
            id=chat_id,
            user_id=user.id,
            title=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)
        print(f"✅ [prompt_gpt] Chat created: {chat.id} for user {chat.user_id}")
    
    # Create chat title if not exists
    if not chat.title:
        try:
            chat.title = create_chat_title(prompt_data.content)
            db.commit()
        except Exception:
            pass
    
    # Save user message
    user_message = ChatMessage(
        chat_id=chat.id,
        role="user",
        content=prompt_data.content,
        created_at=datetime.now(timezone.utc)
    )
    db.add(user_message)
    db.commit()
    print(f"💬 [prompt_gpt] User message saved for chat {chat.id}")
    
    # Get chat history (last 20 messages)
    chat_messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat.id
    ).order_by(ChatMessage.created_at).limit(20).all()
    print(f"📜 [prompt_gpt] Retrieved {len(chat_messages)} messages from chat history")
    
    groq_messages = [{"role": m.role, "content": m.content} for m in chat_messages]
    
    # Add system message if not exists
    if not any(msg["role"] == "system" for msg in groq_messages):
        groq_messages.insert(0, {"role": "system", "content": "You are a helpful assistant."})
    
    # Call Groq API
    try:
        groq_api_key, groq_api_url = get_groq_config()
        headers = {"Authorization": f"Bearer {groq_api_key}"}
        payload = {
            "model": get_groq_model(),
            "messages": groq_messages,
            "max_tokens": 1024,
            "temperature": 0.6,
        }
        if payload["model"].startswith("openai/gpt-oss"):
            payload["reasoning_effort"] = "low"
        response = requests.post(groq_api_url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        groq_reply = data["choices"][0]["message"]["content"]
        
        if not groq_reply:
            raise RuntimeError("Groq returned no text.")
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Groq configuration error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Groq error: {str(e)}"
        )
    
    # Save assistant response
    assistant_message = ChatMessage(
        chat_id=chat.id,
        role="assistant",
        content=groq_reply,
        created_at=datetime.now(timezone.utc)
    )
    db.add(assistant_message)
    db.commit()
    print(f"🤖 [prompt_gpt] Assistant message saved for chat {chat.id}")
    print(f"✅ [prompt_gpt] Chat {chat.id} complete - returning reply\n")
    
    return {"reply": groq_reply}


@router.get("/get_chat_messages/{chat_id}/", tags=["Chat"])
def get_chat_messages(
    chat_id: str,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get all messages for a specific chat
    """
    # Get current user
    user = get_current_user(authorization, db)
    print(f"\n📖 [get_chat_messages] User {user.username} requesting chat: {chat_id}")
    
    # Get chat
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        print(f"❌ [get_chat_messages] Chat not found: {chat_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    print(f"✅ [get_chat_messages] Chat found - Chat owner: {chat.user_id}, Current user: {user.id}")
    
    # Check authorization
    if chat.user_id != user.id:
        print(f"❌ [get_chat_messages] Unauthorized - Chat owner: {chat.user_id}, User: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access to chat messages."
        )
    
    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat.id
    ).order_by(ChatMessage.created_at).all()
    
    print(f"📊 [get_chat_messages] Retrieved {len(messages)} messages for chat {chat_id}")
    print(f"✅ [get_chat_messages] Returning messages\n")
    
    return [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in messages
    ]





@router.delete("/delete_chat/{chat_id}/", tags=["Chat"])
def delete_chat(
    chat_id: str,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Delete a chat and all its associated messages
    """
    # Get current user
    user = get_current_user(authorization, db)
    
    # Find the chat
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    try:
        # Delete all messages in the chat (cascade will handle this)
        db.delete(chat)
        db.commit()
        
        return {
            "message": "Chat deleted successfully",
            "chat_id": chat_id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting chat: {str(e)}"
        )


# ======================= Additional Chat Management Endpoints =======================

@router.get("/api/chats/", tags=["Chat"])
def get_all_chats(
    authorization: str = Header(None),
    skip: int = 0,
    limit: int = 50,
    search: str = "",
    db: Session = Depends(get_db)
):
    """
    Get all chats for current user with optional search and pagination
    """
    user = get_current_user(authorization, db)
    
    query = db.query(Chat).filter(Chat.user_id == user.id)
    
    if search:
        query = query.filter(Chat.title.ilike(f"%{search}%"))
    
    total = query.count()
    chats = query.order_by(Chat.updated_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "data": [
            {
                "id": chat.id,
                "title": chat.title,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "message_count": len(chat.messages) if chat.messages else 0
            }
            for chat in chats
        ]
    }


@router.put("/api/chats/{chat_id}/", tags=["Chat"])
def update_chat_title(
    chat_id: str,
    title_data: UpdateChatTitleRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Update chat title
    """
    user = get_current_user(authorization, db)
    
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    if not title_data.title or not title_data.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title cannot be empty"
        )
    
    chat.title = title_data.title.strip()
    chat.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {
        "message": "Chat title updated successfully",
        "chat_id": chat.id,
        "title": chat.title
    }


@router.get("/api/chats/{chat_id}/messages/", tags=["Chat"])
def get_chat_messages_paginated(
    chat_id: str,
    authorization: str = Header(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get chat messages with pagination (most recent last)
    """
    user = get_current_user(authorization, db)
    
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    total_messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat.id
    ).count()
    
    messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat.id
    ).order_by(ChatMessage.created_at.asc()).offset(skip).limit(limit).all()
    
    return {
        "total": total_messages,
        "skip": skip,
        "limit": limit,
        "chat_id": chat.id,
        "data": [
            {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at
            }
            for msg in messages
        ]
    }


# ======================= Message Search Endpoints =======================

@router.get("/api/chats/search-messages/", tags=["Chat"])
def search_messages(
    query: str = Query(..., min_length=1, max_length=200),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Search user's messages across all chats
    
    - **query**: Search query string
    - **authorization**: Bearer token
    - Returns: List of matching messages with context
    """
    user = get_current_user(authorization, db)
    
    if not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )
    
    # Search messages across all user's chats
    results = db.query(ChatMessage).join(Chat).filter(
        Chat.user_id == user.id,
        ChatMessage.content.ilike(f"%{query}%")
    ).order_by(ChatMessage.created_at.desc()).limit(100).all()
    
    logger.info(f"✅ Message search completed for user {user.id}: found {len(results)} results")
    
    return {
        "query": query,
        "count": len(results),
        "results": [
            {
                "message_id": msg.id,
                "chat_id": msg.chat_id,
                "chat_title": msg.chat.title or "Untitled",
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat() if msg.created_at else ""
            }
            for msg in results
        ]
    }


@router.get("/api/export/chats/", tags=["Data Export"])
def export_all_chats(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Export all user's chats and messages as JSON
    """
    user = get_current_user(authorization, db)
    
    chats = db.query(Chat).filter(Chat.user_id == user.id).order_by(Chat.created_at.desc()).all()
    
    export_data = {
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "date_joined": user.date_joined
        },
        "export_date": datetime.now(timezone.utc).isoformat(),
        "total_chats": len(chats),
        "chats": [
            {
                "id": chat.id,
                "title": chat.title,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "messages": [
                    {
                        "role": msg.role,
                        "content": msg.content,
                        "created_at": msg.created_at
                    }
                    for msg in chat.messages
                ]
            }
            for chat in chats
        ]
    }
    
    return export_data


# ======================= Data Export Endpoints =======================

@router.get("/api/data/customuser/", tags=["Data Export"])
def get_all_custom_users(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get all CustomUser records in JSON format (ADMIN ONLY)
    """
    user = get_current_user(authorization, db)
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access this endpoint"
        )
    
    users = db.query(CustomUser).all()
    
    return {
        "count": len(users),
        "data": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "date_joined": u.date_joined,
            }
            for u in users
        ]
    }


@router.get("/api/data/customuser/{user_id}", tags=["Data Export"])
def get_custom_user_by_id(
    user_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get a specific CustomUser by ID in JSON format (Own profile or ADMIN)
    """
    user = get_current_user(authorization, db)
    
    if user.id != user_id and not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access"
        )
    
    target_user = db.query(CustomUser).filter(CustomUser.id == user_id).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": target_user.id,
        "username": target_user.username,
        "email": target_user.email,
        "first_name": target_user.first_name,
        "last_name": target_user.last_name,
        "date_joined": target_user.date_joined,
    }


@router.get("/api/data/chat/", tags=["Data Export"])
def get_all_chats(
    db: Session = Depends(get_db)
):
    """
    Get all Chat records in JSON format (all users' chats)
    """
    chats = db.query(Chat).all()
    
    return {
        "count": len(chats),
        "data": [
            {
                "id": chat.id,
                "user_id": chat.user_id,
                "title": chat.title,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at
            }
            for chat in chats
        ]
    }


@router.get("/api/data/chat/{chat_id}", tags=["Data Export"])
def get_chat_by_id(
    chat_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a specific Chat record by ID in JSON format
    """
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    return {
        "id": chat.id,
        "user_id": chat.user_id,
        "title": chat.title,
        "created_at": chat.created_at,
        "updated_at": chat.updated_at
    }


@router.get("/api/data/chat/by-user-id/{user_id}", tags=["Data Export"])
def get_chats_by_user_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all Chat records for a specific user in JSON format
    """
    chats = db.query(Chat).filter(Chat.user_id == user_id).all()
    
    return {
        "user_id": user_id,
        "count": len(chats),
        "data": [
            {
                "id": chat.id,
                "user_id": chat.user_id,
                "title": chat.title,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at
            }
            for chat in chats
        ]
    }


@router.get("/api/data/usersearchhistory/", tags=["Data Export"])
def get_all_search_history(
    db: Session = Depends(get_db)
):
    """
    Get all UserSearchHistory records in JSON format
    """
    search_history = db.query(UserSearchHistory).all()
    
    return {
        "count": len(search_history),
        "data": [
            {
                "id": sh.id,
                "user_id": sh.user_id,
                "search_query": sh.search_query,
                "created_at": sh.created_at
            }
            for sh in search_history
        ]
    }


@router.get("/api/data/usersearchhistory/{history_id}", tags=["Data Export"])
def get_search_history_by_id(
    history_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific UserSearchHistory record by ID in JSON format
    """
    search_history = db.query(UserSearchHistory).filter(UserSearchHistory.id == history_id).first()
    
    if not search_history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search history record not found"
        )
    
    return {
        "id": search_history.id,
        "user_id": search_history.user_id,
        "search_query": search_history.search_query,
        "created_at": search_history.created_at
    }


@router.get("/api/data/usersearchhistory/by-user-id/{user_id}", tags=["Data Export"])
def get_search_history_by_user_id(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all UserSearchHistory records for a specific user in JSON format
    """
    search_history = db.query(UserSearchHistory).filter(UserSearchHistory.user_id == user_id).all()
    
    if not search_history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No search history found for this user"
        )
    
    return {
        "user_id": user_id,
        "count": len(search_history),
        "data": [
            {
                "id": sh.id,
                "user_id": sh.user_id,
                "search_query": sh.search_query,
                "created_at": sh.created_at
            }
            for sh in search_history
        ]
    }


# ======================= Chat History for Table View =======================

@router.get("/api/chat-history/", tags=["Chat History"])
def get_chat_history_table(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get detailed chat history for ag-grid table display
    Returns one row per message with full user and chat details
    Ordered by timestamp (descending)
    """
    user = get_current_user(authorization, db)
    
    # Fetch all chats and messages for the current user
    chats = db.query(Chat).filter(Chat.user_id == user.id).all()
    
    chat_history_rows = []
    
    for chat in chats:
        # For each chat, create rows for all messages
        messages = db.query(ChatMessage).filter(ChatMessage.chat_id == chat.id).order_by(ChatMessage.created_at.desc()).all()
        
        for message in messages:
            chat_history_rows.append({
                "userId": user.id,
                "userName": user.username,
                "userEmail": user.email,
                "role": user.role or "user",
                "timestamp": message.created_at.isoformat() if message.created_at else "",
                "chatId": chat.id,
                "chatTitle": chat.title or "Untitled",
                "question": next((m.content for m in messages if m.role == "user"), ""),
                "response": message.content if message.role == "assistant" else "",
                "messageRole": message.role,
                "messageId": message.id
            })
    
    # Sort by timestamp descending
    chat_history_rows.sort(key=lambda x: x["timestamp"], reverse=True)
    
    print(f"[get_chat_history_table] Fetched {len(chat_history_rows)} message rows for user {user.id}")
    
    return {
        "total": len(chat_history_rows),
        "data": chat_history_rows
    }


# ======================= OPTIONAL/FUTURE FEATURES =======================
# These endpoints are stubs for future implementation

@router.post("/api/auth/2fa/enable/", tags=["Authentication"], deprecated=True)
def enable_2fa(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    🚧 FUTURE FEATURE: Enable Two-Factor Authentication
    
    Generates a 2FA secret and returns a QR code for setup.
    Requires: pip install pyotp qrcode
    
    - **authorization**: Bearer token
    - Returns: Secret and QR code image
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="2FA support coming soon. To enable: pip install pyotp qrcode"
    )


@router.post("/api/chats/{chat_id}/export/pdf/", tags=["Data Export"], deprecated=True)
def export_chat_as_pdf(
    chat_id: str,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    🚧 FUTURE FEATURE: Export Chat as PDF
    
    Exports a conversation to PDF format for archival or sharing.
    Requires: pip install reportlab
    
    - **chat_id**: Chat ID to export
    - **authorization**: Bearer token
    - Returns: PDF file
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="PDF export coming soon. To enable: pip install reportlab"
    )


@router.get("/api/docs/message-encryption/", tags=["Documentation"], deprecated=True)
def message_encryption_docs():
    """
    🚧 FUTURE FEATURE: Message Encryption at Rest
    
    Messages can be encrypted using cryptography.fernet for enhanced privacy.
    Requires: pip install cryptography
    
    Implementation note:
    - Add 'content_encrypted' column to ChatMessage model
    - Store encryption key securely (AWS KMS, HashiCorp Vault)
    - Decrypt on demand for user viewing
    
    This trades performance for privacy - use only if required by regulations.
    """
    return {
        "feature": "Message Encryption",
        "status": "future",
        "description": "End-to-end message encryption at rest",
        "requires": ["cryptography"],
        "implementation_notes": [
            "Add content_encrypted column to ChatMessage",
            "Use Fernet symmetric encryption",
            "Store key in secure vault (KMS/Vault)",
            "Decrypt on-demand for display",
            "Trade-off: Performance vs Privacy"
        ]
    }
