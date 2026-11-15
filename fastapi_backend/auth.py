import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4
import jwt
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "24"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a short-lived JWT access token."""
    to_encode = data.copy()
    to_encode.update({"type": "access", "jti": str(uuid4())})
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a single-use, seven-day JWT refresh token."""
    to_encode = data.copy()
    to_encode.update({"type": "refresh", "jti": str(uuid4())})
    expire = datetime.utcnow() + timedelta(days=7)  # Refresh token valid for 7 days
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict[str, Any]]:
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """Verify the JWT and its intended use, then return its subject."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != token_type:
        return None
    user_id = payload.get("sub")
    return user_id
