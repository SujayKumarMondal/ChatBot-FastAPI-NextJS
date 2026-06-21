import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean, func, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()

# UTC datetime factory function
def utc_now():
    return datetime.now(timezone.utc)


class CustomUser(Base):
    __tablename__ = "chatpaat_app_customuser"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(150), unique=True, nullable=False, index=True)
    email = Column(String(254), unique=True, nullable=False, index=True)
    password = Column(String(128), nullable=False)
    first_name = Column(String(150), nullable=False, default='')
    last_name = Column(String(150), nullable=False, default='')
    image = Column(Text, nullable=True)  # Store base64 or image URL
    is_active = Column(Boolean, default=True)
    is_staff = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    date_joined = Column(DateTime, default=utc_now)
    
    # Relationships
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")
    search_histories = relationship("UserSearchHistory", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", cascade="all, delete-orphan", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    
    def __str__(self):
        return self.username


class Chat(Base):
    __tablename__ = "chatpaat_app_chat"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("chatpaat_app_customuser.id"), nullable=True, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = relationship("CustomUser", back_populates="chats")
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")
    
    def __str__(self):
        return f"{self.title or str(self.id)}"


class RoleEnum(str, enum.Enum):
    assistant = "assistant"
    user = "user"


class ChatMessage(Base):
    __tablename__ = "chatpaat_app_chatmessage"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(String(36), ForeignKey("chatpaat_app_chat.id"), nullable=False, index=True)
    role = Column(String(15), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    chat = relationship("Chat", back_populates="messages")
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class UserSearchHistory(Base):
    __tablename__ = "chatpaat_app_usersearchhistory"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("chatpaat_app_customuser.id"), nullable=False, index=True)
    search_query = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    user = relationship("CustomUser", back_populates="search_histories")
    
    def __str__(self):
        return f"{self.user.username}: {self.search_query[:50]}"


# Password Reset Token Model
class PasswordResetToken(Base):
    __tablename__ = "chatpaat_app_passwordresettoken"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("chatpaat_app_customuser.id"), nullable=False, index=True)
    token_hash = Column(String(128), nullable=False, index=True)
    used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    # Relationship
    user = relationship("CustomUser")

    def __str__(self):
        return f"PasswordResetToken(user_id={self.user_id}, used={self.used})"


# ✅ ADDED: User Preferences Model for storing user settings
class UserPreferences(Base):
    __tablename__ = "chatpaat_app_userpreferences"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("chatpaat_app_customuser.id"), unique=True, nullable=False, index=True)
    theme = Column(String(20), default="light")  # light, dark, auto
    language = Column(String(10), default="en")  # en, es, fr, de, ja, etc.
    notifications_enabled = Column(Boolean, default=True)
    email_on_new_features = Column(Boolean, default=True)
    two_factor_enabled = Column(Boolean, default=False)
    timezone = Column(String(50), default="UTC")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationship
    user = relationship("CustomUser", back_populates="preferences")
    
    def __str__(self):
        return f"UserPreferences(user_id={self.user_id}, theme={self.theme})"


# ✅ ADDED: Audit Log Model for compliance and debugging
class AuditLog(Base):
    __tablename__ = "chatpaat_app_auditlog"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("chatpaat_app_customuser.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # login, create_chat, delete_account, etc.
    resource = Column(String(100), nullable=False)  # Chat, User, Message, etc.
    resource_id = Column(String(255), nullable=True)
    changes = Column(JSON, nullable=True)  # What changed (e.g., {"email": "old@example.com" -> "new@example.com"})
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    status = Column(String(20), default="success")  # success, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    
    # Relationship
    user = relationship("CustomUser", back_populates="audit_logs")
    
    def __str__(self):
        return f"AuditLog(user_id={self.user_id}, action={self.action}, resource={self.resource})"
