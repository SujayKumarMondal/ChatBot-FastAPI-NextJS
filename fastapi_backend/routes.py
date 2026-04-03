# ======================= Imports =======================
import os
import uuid
from datetime import datetime, timedelta
import requests
import base64
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Header, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import hashlib
from auth import SECRET_KEY
from datetime import timezone
import secrets, hashlib

from db import get_db
from models import CustomUser, Chat, ChatMessage, UserSearchHistory, PasswordResetToken
from auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, verify_token, SECRET_KEY
)
# Google OAuth settings
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Groq API settings
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = os.getenv("GROQ_API_URL")
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
    user = db.query(CustomUser).filter(CustomUser.email == req.email).first()
    if user:
        token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256((token + SECRET_KEY).encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        # You may need to define PasswordResetToken in your models
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
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "model": "llama-3.1-8b-instant",
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
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
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
    """Health check endpoint"""
    return {"status": "healthy"}


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
        created_at=datetime.utcnow()
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
    # Check if username already exists
    existing_user = db.query(CustomUser).filter(CustomUser.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists."
        )
    
    # Check if email already exists
    existing_email = db.query(CustomUser).filter(CustomUser.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists."
        )
    
    # Create new user
    new_user = CustomUser(
        username=user_data.username,
        email=user_data.email,
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
    user = db.query(CustomUser).filter(CustomUser.email == user_data.email).first()
    
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
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
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
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Google OAuth client ID/secret not configured")

    redirect_uri = req.redirect_uri or f"{FRONTEND_URL}/oauth-callback"

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
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name
        }
    }


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
        # user.image = image_data_url
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Profile image uploaded successfully",
            # "image": user.image,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                # "image": user.image
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error uploading image: {str(e)}"
        )

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


@router.post("/api/profile/change-password/", tags=["Profile"])
def change_password(
    password_data: ChangePasswordRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Change user's password
    """
    user = get_current_user(authorization, db)
    
    if not verify_password(password_data.old_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )
    
    if password_data.new_password == password_data.old_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from old password"
        )
    
    user.password = hash_password(password_data.new_password)
    db.commit()
    
    return {
        "message": "Password changed successfully"
    }


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
    
    if not prompt_data.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No prompt content provided."
        )
    
    # Get or create chat
    chat_id = prompt_data.chat_id or str(uuid.uuid4())
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    
    if chat:
        if chat.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to chat."
            )
    else:
        chat = Chat(
            id=chat_id,
            user_id=user.id,
            title=None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(chat)
        db.commit()
        db.refresh(chat)
    
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
        created_at=datetime.utcnow()
    )
    db.add(user_message)
    db.commit()
    
    # Get chat history (last 20 messages)
    chat_messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat.id
    ).order_by(ChatMessage.created_at).limit(20).all()
    
    groq_messages = [{"role": m.role, "content": m.content} for m in chat_messages]
    
    # Add system message if not exists
    if not any(msg["role"] == "system" for msg in groq_messages):
        groq_messages.insert(0, {"role": "system", "content": "You are a helpful assistant."})
    
    # Call Groq API
    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": groq_messages,
            "max_tokens": 1024,
            "temperature": 0.6,
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        data = response.json()
        groq_reply = data["choices"][0]["message"]["content"]
        
        if not groq_reply:
            raise RuntimeError("Groq returned no text.")
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
        created_at=datetime.utcnow()
    )
    db.add(assistant_message)
    db.commit()
    
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
    
    # Get chat
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Check authorization
    if chat.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access to chat messages."
        )
    
    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.chat_id == chat.id
    ).order_by(ChatMessage.created_at).all()
    
    return [
        {
            "role": msg.role,
            "content": msg.content
        }
        for msg in messages
    ]


@router.get("/todays_chat/", tags=["Chat"])
def todays_chat(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get today's chats
    """
    # Get current user
    user = get_current_user(authorization, db)
    
    today = datetime.utcnow().date()
    chats = db.query(Chat).filter(
        Chat.user_id == user.id,
        Chat.created_at >= datetime.combine(today, datetime.min.time())
    ).order_by(Chat.created_at.desc()).limit(10).all()
    
    return [
        {
            "id": chat.id,
            "title": chat.title,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at
        }
        for chat in chats
    ]


@router.get("/yesterdays_chat/", tags=["Chat"])
def yesterdays_chat(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get yesterday's chats
    """
    # Get current user
    user = get_current_user(authorization, db)
    
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    chats = db.query(Chat).filter(
        Chat.user_id == user.id,
        Chat.created_at >= datetime.combine(yesterday, datetime.min.time()),
        Chat.created_at < datetime.combine(today, datetime.min.time())
    ).order_by(Chat.created_at.desc()).limit(10).all()
    
    return [
        {
            "id": chat.id,
            "title": chat.title,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at
        }
        for chat in chats
    ]


@router.get("/seven_days_chat/", tags=["Chat"])
def seven_days_chat(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Get chats from the last 7 days (excluding today and yesterday)
    """
    # Get current user
    user = get_current_user(authorization, db)
    
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    seven_days_ago = today - timedelta(days=7)
    
    chats = db.query(Chat).filter(
        Chat.user_id == user.id,
        Chat.created_at >= datetime.combine(seven_days_ago, datetime.min.time()),
        Chat.created_at < datetime.combine(yesterday, datetime.min.time())
    ).order_by(Chat.created_at.desc()).limit(10).all()
    
    return [
        {
            "id": chat.id,
            "title": chat.title,
            "created_at": chat.created_at,
            "updated_at": chat.updated_at
        }
        for chat in chats
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


