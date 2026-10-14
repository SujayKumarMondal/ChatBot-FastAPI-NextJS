# ChatPaat: Backend Documentation

## 🚀 Overview

The ChatPaat backend is built with **FastAPI**, a modern, high-performance Python web framework. It serves as the REST API that all client applications communicate with. The backend is responsible for authentication, business logic, database operations, and integration with external services.

**Server Details:**
- **Framework**: FastAPI 0.104
- **Server**: Uvicorn 0.24 (ASGI)
- **Port**: 7004
- **Host**: 127.0.0.1 (localhost)
- **Python Version**: 3.8+

---

## 📁 Project Structure

```
fastapi_backend/
├── fastapi_server.py           # Main entry point, CORS, app initialization
├── routes.py                   # All API endpoints (~900 lines)
├── models.py                   # SQLAlchemy ORM models
├── auth.py                     # JWT & password utilities
├── db.py                       # Database configuration
├── email_utils.py              # SendGrid email integration
├── requirements.txt            # Python dependencies
├── db.sqlite3                  # SQLite database (development)
├── .env                        # Environment variables (git-ignored)
├── .env.example                # Example environment file
└── scripts/
    ├── trigger_password_reset_direct.py
    └── request_password_reset.py
```

---

## 🔧 Core Modules

### 1. **fastapi_server.py** - Application Initialization

**Responsibility**: Initialize FastAPI app, configure CORS, set up middleware

```python
# Key Components:
- app = FastAPI(title="ChatPaat API", version="1.0.0")
- CORSMiddleware configuration
- Route inclusion
- Uvicorn server startup
```

**CORS Configuration**:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # React dev server
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:7004",      # Backend endpoint
        "http://127.0.0.1:7004",
        "*"                           # Fallback for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    max_age=3600,
)
```

**Server Startup**:
```bash
python fastapi_server.py
# Runs on http://127.0.0.1:7004
# Auto-reload disabled in production
```

---

### 2. **models.py** - Database Models

Defines SQLAlchemy ORM models for database tables. Each model represents an entity in the system.

#### **CustomUser Model**
```python
class CustomUser(Base):
    __tablename__ = "chatpaat_app_customuser"
    
    id: int                      # Primary key
    username: str               # Unique username
    email: str                  # Unique email
    password: str               # Hashed password
    first_name: str             # User's first name
    last_name: str              # User's last name
    is_active: bool             # Account status
    is_staff: bool              # Staff flag (for future admin)
    is_superuser: bool          # Superuser flag (for future admin)
    last_login: datetime         # Last login timestamp
    date_joined: datetime        # Account creation timestamp
    
    # Relationships
    chats: List[Chat]           # User's conversations
    search_histories: List[UserSearchHistory]
```

**Key Features**:
- Unique constraints on username and email
- Cascading delete on user deletion
- Relationship with Chat and SearchHistory
- Timestamps for user activity tracking

#### **Chat Model**
```python
class Chat(Base):
    __tablename__ = "chatpaat_app_chat"
    
    id: str                     # UUID primary key
    user_id: int               # Foreign key to CustomUser
    title: str                 # AI-generated chat title
    created_at: datetime       # Creation timestamp
    updated_at: datetime       # Last update timestamp
    
    # Relationships
    user: CustomUser           # Relationship to user
    messages: List[ChatMessage] # All messages in this chat
```

**Key Features**:
- UUID for distributed system compatibility
- Cascading delete on user deletion
- Title auto-generation from first message
- Timestamps for sorting and filtering

#### **ChatMessage Model**
```python
class ChatMessage(Base):
    __tablename__ = "chatpaat_app_chatmessage"
    
    id: int                    # Primary key
    chat_id: str              # Foreign key to Chat
    role: str                 # 'user' or 'assistant'
    content: str              # Message text
    created_at: datetime      # Message timestamp
    
    # Relationships
    chat: Chat                # Parent chat
```

**Key Features**:
- Role enum: 'user' | 'assistant'
- Full message content stored (no truncation)
- Indexed on chat_id for fast retrieval
- Timestamps for message ordering

#### **UserSearchHistory Model**
```python
class UserSearchHistory(Base):
    __tablename__ = "chatpaat_app_usersearchhistory"
    
    id: int                    # Primary key
    user_id: int              # Foreign key to CustomUser
    search_query: str         # Search query text
    created_at: datetime      # Search timestamp
```

**Use Case**: Track user searches for analytics and history

#### **PasswordResetToken Model**
```python
class PasswordResetToken(Base):
    __tablename__ = "chatpaat_app_passwordresettoken"
    
    id: int                    # Primary key
    user_id: int              # Foreign key to CustomUser
    token_hash: str           # SHA-256 hash of token
    used: bool                # Whether token has been used
    expires_at: datetime      # Token expiration time
    created_at: datetime      # Token creation time
```

**Key Features**:
- Token hashing for security (never store plain tokens)
- One-time use tokens (marked as used)
- Expiration validation (1 hour default)
- User association for recovery

---

### 3. **auth.py** - Authentication Utilities

Core authentication logic for JWT token management and password hashing.

#### **Password Hashing**
```python
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using Argon2 algorithm"""
    password = password[:72]  # Bcrypt 72-byte limit
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password"""
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)
```

**Algorithm**: Argon2 (memory-hard, resistant to GPU attacks)

#### **JWT Token Management**
```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token
    - Duration: 24 hours (configurable)
    - Payload: { 'sub': user_id, 'exp': expiration_timestamp }
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token
    - Duration: 7 days
    - Used to obtain new access tokens
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and extract user ID
    - Returns: user_id if valid, None if expired/invalid
    """
    payload = decode_token(token)
    if payload is None:
        return None
    return payload.get("sub")
```

**Token Structure**:
```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { "sub": "user_id", "exp": timestamp }
Signature: HMAC-SHA256(encoded_header.encoded_payload, SECRET_KEY)
```

**Configuration** (from `.env`):
```env
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24
```

---

### 4. **db.py** - Database Configuration

Manages database connection and session management.

#### **Database Selection**
```python
USE_POSTGRES = os.getenv("USE_POSTGRES", "").lower() == "true"

if USE_POSTGRES and DB_NAME:
    DATABASE_URL = f"postgresql://{DB_USER}:{password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    DATABASE_URL = f"sqlite:///./db.sqlite3"  # Default SQLite
```

**Supported Databases**:
- **SQLite**: Default, file-based, great for development
- **PostgreSQL**: Recommended for production, supports larger scales

#### **Session Management**
```python
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency injection for database sessions
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### **Database Initialization**
```python
def init_db():
    """Create all tables in the database"""
    from models import Base
    Base.metadata.create_all(bind=engine)
```

**Connection Pooling**:
- SQLAlchemy handles connection pooling automatically
- Pool size: 5 (default), max_overflow: 10
- Connections recycled after 1 hour

---

### 5. **routes.py** - API Endpoints

Contains all API endpoint definitions. This is the core business logic layer.

#### **Endpoint Categories**

##### A. **Authentication Endpoints**

**POST `/api/register/`** - User Registration
```python
@router.post("/api/register/", tags=["Authentication"])
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user
    
    Request:
    {
      "username": "john_doe",
      "email": "john@example.com",
      "password": "SecurePassword123"
    }
    
    Response:
    {
      "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
      "user": {
        "username": "john_doe",
        "email": "john@example.com"
      }
    }
    
    Validations:
    - Username uniqueness check
    - Email uniqueness check
    - Password hashing with Argon2
    """
```

**Validation Logic**:
1. Check if username already exists
2. Check if email already exists
3. Hash password using Argon2
4. Create user record in database
5. Generate access and refresh tokens
6. Return tokens and user info

---

**POST `/api/login/`** - User Login
```python
@router.post("/api/login/", tags=["Authentication"])
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user with email and password
    
    Request:
    {
      "email": "john@example.com",
      "password": "SecurePassword123"
    }
    
    Response:
    {
      "access": "jwt_token",
      "refresh": "jwt_token",
      "user": {
        "username": "john_doe",
        "email": "john@example.com"
      }
    }
    
    Error Cases:
    - 400: Invalid email or password
    - User not found
    - Password verification failed
    """
```

**Authentication Process**:
1. Query user by email
2. Verify password against hash
3. Generate JWT tokens
4. Return tokens and user info
5. Frontend stores tokens in sessionStorage

---

**POST `/api/auth/google/exchange/`** - Google OAuth Exchange
```python
@router.post("/api/auth/google/exchange/", tags=["Authentication"])
def google_exchange(req: GoogleExchangeRequest, db: Session = Depends(get_db)):
    """
    Exchange Google authorization code for local JWT tokens
    
    Request:
    {
      "code": "authorization_code_from_google",
      "redirect_uri": "http://localhost:5173/oauth-callback"
    }
    
    Process:
    1. Exchange code for Google access token
    2. Fetch user info from Google
    3. Upsert user in database
    4. Generate local JWT tokens
    5. Return tokens
    
    Features:
    - Automatic user creation or update
    - Unique username generation (with counter)
    - No password stored for OAuth users
    """
```

---

##### B. **Password Management Endpoints**

**POST `/api/auth/password-reset/`** - Initiate Password Reset
```python
@router.post("/api/auth/password-reset/", tags=["Authentication"])
def password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Initiate password reset by sending reset email
    
    Request:
    {
      "email": "user@example.com"
    }
    
    Process:
    1. Query user by email
    2. Generate secure token
    3. Hash token and store in database
    4. Create reset link: /reset-password?token=<token>
    5. Send email with reset link
    6. Token expires in 1 hour
    
    Security:
    - Silent failure (no user enumeration)
    - Token hashing (never store plain token)
    - One-time use (marked as used)
    - Expiration validation
    """
```

---

**POST `/api/auth/password-reset/confirm/`** - Confirm Password Reset
```python
@router.post("/api/auth/password-reset/confirm/", tags=["Authentication"])
def password_reset_confirm(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """
    Confirm password reset and set new password
    
    Request:
    {
      "token": "reset_token_from_email",
      "new_password": "NewSecurePassword123"
    }
    
    Validations:
    - Token must be valid and not expired
    - Token must not have been used
    - Hash matches the token
    
    Process:
    1. Query reset token by hash
    2. Verify token not used and not expired
    3. Find associated user
    4. Hash new password
    5. Mark token as used
    6. Update user password
    7. Return success
    """
```

---

**POST `/api/profile/change-password/`** - Change Password (Authenticated)
```python
@router.post("/api/profile/change-password/", tags=["Profile"])
def change_password(
    password_data: ChangePasswordRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user
    
    Request:
    {
      "old_password": "CurrentPassword123",
      "new_password": "NewSecurePassword123"
    }
    
    Validations:
    - JWT token must be valid
    - Old password must match current
    - New password must be different
    
    Headers:
    - Authorization: "Bearer <JWT_TOKEN>"
    """
```

---

##### C. **Chat/Message Endpoints**

**POST `/prompt_gpt/`** - Send Message & Get Response
```python
@router.post("/prompt_gpt/", tags=["Chat"])
def prompt_gpt(
    prompt_data: PromptRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Send user message to AI and get response
    
    Request:
    {
      "chat_id": "uuid-or-new",
      "content": "What is machine learning?"
    }
    
    Response:
    {
      "chat_id": "chat-uuid",
      "reply": "Machine learning is...",
      "title": "What is Machine Learning"
    }
    
    Process:
    1. Verify JWT token and get user
    2. Get or create chat
    3. Add user message to database
    4. Call Groq API with conversation history
    5. Add AI response to database
    6. Return response to frontend
    7. Generate title if first message
    
    Features:
    - Auto-creating new chats
    - Chat title generation (from first message)
    - Message persistence
    - User isolation (only own chats)
    """
```

**Groq API Integration**:
```python
headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
payload = {
    "model": "openai/gpt-oss-20b",
    "messages": [
        {"role": "system", "content": "You are helpful assistant"},
        {"role": "user", "content": user_message},
        {"role": "assistant", "content": previous_response},
        ...
    ],
    "max_tokens": 1024,
    "temperature": 0.7,
}
response = requests.post(GROQ_API_URL, headers=headers, json=payload)
```

---

**GET `/get_chat_messages/{chat_id}/`** - Fetch Chat History
```python
@router.get("/get_chat_messages/{chat_id}/", tags=["Chat"])
def get_chat_messages(
    chat_id: str,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve all messages in a specific chat
    
    Response:
    [
      {
        "role": "user",
        "content": "What is AI?"
      },
      {
        "role": "assistant",
        "content": "AI stands for..."
      }
    ]
    
    Features:
    - User isolation (verify ownership)
    - Returns messages in creation order
    - Full message content
    """
```

---

**GET `/todays_chat/`, `/yesterdays_chat/`, `/seven_days_chat/`** - Chat History Filters
```python
@router.get("/todays_chat/", tags=["Chat"])
def todays_chats(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Filter chats created today"""
    # Logic: created_at >= today at 00:00:00

@router.get("/yesterdays_chat/", tags=["Chat"])
def yesterdays_chats(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Filter chats created yesterday"""
    # Logic: yesterday at 00:00:00 <= created_at < today at 00:00:00

@router.get("/seven_days_chat/", tags=["Chat"])
def seven_days_chats(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Filter chats created in last 7 days"""
    # Logic: created_at >= 7 days ago at 00:00:00
```

---

**DELETE `/delete_chat/{chat_id}/`** - Delete Chat

```python
@router.delete("/delete_chat/{chat_id}/", tags=["Chat"])
def delete_chat(
    chat_id: str,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Delete a chat and all its messages
    
    Security:
    - Verify user owns the chat
    - Cascade delete all messages
    
    Response:
    {
      "message": "Chat deleted successfully",
      "chat_id": "deleted-uuid"
    }
    """
```

---

##### D. **Profile Endpoints**

**GET `/api/profile/`** - Get User Profile
```python
@router.get("/api/profile/", tags=["Profile"])
def get_profile(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieve authenticated user's profile
    
    Response:
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "date_joined": "2025-01-15T10:30:00"
    }
    """
```

---

**PUT `/api/profile/`** - Update Profile
```python
@router.put("/api/profile/", tags=["Profile"])
def update_profile(
    profile_data: UpdateProfileRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Update user profile information
    
    Request:
    {
      "first_name": "John",
      "last_name": "Doe",
      "email": "newemail@example.com"
    }
    
    Validations:
    - Email uniqueness check (if changed)
    - No duplicate emails allowed
    """
```

---

**POST `/api/profile/upload-image/`** - Upload Profile Image
```python
@router.post("/api/profile/upload-image/", tags=["Profile"])
def upload_profile_image(
    file: UploadFile = File(...),
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Upload and store user profile image
    
    Validations:
    - File size: max 5MB
    - File types: JPEG, PNG, GIF, WebP
    - Convert to base64 for storage
    
    Storage:
    - Stored as base64 data URL in database
    - Client can display directly as <img src="data:...">
    """
```

---

**DELETE `/api/profile/`** - Delete Account
```python
@router.delete("/api/profile/", tags=["Profile"])
def delete_account(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Delete user account and all associated data
    
    Cascade Deletes:
    - All chats and messages
    - All search history
    - All password reset tokens
    
    Returns:
    {
      "message": "Account deleted successfully",
      "user_id": 1,
      "username": "john_doe"
    }
    """
```

---

##### E. **Utility Endpoints**

**POST `/api/store_search/`** - Store Search Query
```python
@router.post("/api/store_search/")
def user_search(
    search_data: SearchQueryRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    Log user search queries for analytics
    """
```

**GET `/health/`** - Health Check
```python
@router.get("/health/")
def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy"}
```

---

### 6. **email_utils.py** - Email Integration

SendGrid integration for sending transactional emails.

```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, From

def send_email(to: str, subject: str, body: str, reply_to: Optional[str] = None) -> None:
    """
    Send email via SendGrid
    
    Parameters:
    - to: recipient email
    - subject: email subject
    - body: plain-text body content
    - reply_to: optional reply-to address
    
    Configuration:
    - SENDGRID_API_KEY: API key for authentication
    - SENDER_EMAIL: Verified sending address
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDER_EMAIL")
    
    message = Mail(
        from_email=From(sender_email),
        to_emails=to,
        subject=subject,
        plain_text_content=body,
    )
    
    client = SendGridAPIClient(api_key)
    response = client.send(message)
```

**Usage Examples**:
```python
# Password Reset Email
send_email(
    to="user@example.com",
    subject="Password reset instructions",
    body=f"Click this link to reset your password: {reset_link}",
    reply_to="user@example.com"
)

# Welcome Email
send_email(
    to="newuser@example.com",
    subject="Welcome to ChatPaat!",
    body="Thank you for signing up..."
)
```

---

## 🔐 Helper Functions

### **get_current_user()**
Extracts and validates JWT token from request header.

```python
def get_current_user(token: str, db: Session) -> CustomUser:
    """
    1. Extract Bearer token from header
    2. Verify token signature and expiration
    3. Extract user_id from token
    4. Query user from database
    5. Return user object or raise 401
    """
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    
    token = token.replace("Bearer ", "")
    user_id = verify_token(token)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user = db.query(CustomUser).filter(CustomUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user
```

---

### **create_chat_title()**
Uses Groq API to generate intelligent chat titles.

```python
def create_chat_title(user_message: str) -> str:
    """
    Generate title from user's first message using LLM
    
    Prompt: "Provide a short descriptive title in 3-5 words"
    
    Fallback: If API fails, use first 50 chars of message
    """
    try:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
        payload = {
            "model": "openai/gpt-oss-20b",
            "messages": [
                {
                    "role": "system",
                    "content": "Provide a short descriptive title in 3-5 words. Do not add quotes."
                },
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 16,
            "temperature": 0.2,
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        title = response.json()["choices"][0]["message"]["content"].strip()
        return title if title else user_message[:50]
    except Exception:
        return user_message[:50]
```

---

## 📊 Pydantic Schemas

Request/response validation schemas using Pydantic.

```python
class UserRegister(BaseModel):
    username: str       # Required
    email: str          # Required, must be valid email
    password: str       # Required, min 8 chars recommended

class UserLogin(BaseModel):
    email: str          # Required
    password: str       # Required

class PromptRequest(BaseModel):
    chat_id: Optional[str] = None  # None = create new chat
    content: str                   # Required, user message

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class ChatMessageResponse(BaseModel):
    role: str           # 'user' | 'assistant'
    content: str        # Full message text
    
    class Config:
        from_attributes = True

class ChatResponse(BaseModel):
    id: str             # UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

---

## 🚀 Environment Variables

All sensitive configuration in `.env`:

```env
# ============ JWT Configuration ============
JWT_SECRET_KEY=your-random-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# ============ Groq API Configuration ============
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

# ============ Google OAuth Configuration ============
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173

# ============ SendGrid Configuration ============
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDER_EMAIL=noreply@chatpaat.com

# ============ Database Configuration (Optional) ============
USE_POSTGRES=false
# DB_NAME=chatpaat_db
# DB_USER=postgres
# DB_PASSWORD=secure_password
# DB_HOST=localhost
# DB_PORT=5432
```

---

## 🧪 Testing the API

### Using cURL
```bash
# Register
curl -X POST http://localhost:7004/api/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'

# Login
curl -X POST http://localhost:7004/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Send message (with JWT token)
curl -X POST http://localhost:7004/prompt_gpt/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"content":"Hello, how are you?"}'
```

### Using Python
```python
import requests

# Register
response = requests.post(
    "http://localhost:7004/api/register/",
    json={
        "username": "test",
        "email": "test@example.com",
        "password": "SecurePass123"
    }
)
tokens = response.json()

# Send message
headers = {"Authorization": f"Bearer {tokens['access']}"}
response = requests.post(
    "http://localhost:7004/prompt_gpt/",
    json={"content": "What is Python?"},
    headers=headers
)
print(response.json())
```

---

## 📈 Performance Tips

1. **Database Indexing**: Indexes on `user_id`, `email`, `created_at`
2. **Query Optimization**: Use `select_from` and `join` for complex queries
3. **Connection Pooling**: SQLAlchemy handles this automatically
4. **Token Caching**: Verify tokens without database hits (using JWT claims)
5. **API Rate Limiting**: Implement rate limiting for production
6. **Async Routes**: Can convert long-running operations to async (future enhancement)

---

## 🔒 Security Checklist

- ✅ Passwords hashed with Argon2
- ✅ JWT tokens with expiration
- ✅ CORS properly configured
- ✅ Input validation with Pydantic
- ✅ SQL injection prevention via ORM
- ✅ User data isolation
- ✅ Password reset token security
- ✅ OAuth implementation following standards

---

## 📚 Next Steps

- **Database Details**: See `04_Database_Documentation.md`  
- **Complete API Reference**: See `07_API_Documentation.md`  
- **Security Deep Dive**: See `08_Security_and_Authentication.md`  
- **Deployment**: See `09_Deployment_and_Environment.md`

---

**Backend Documentation Last Updated**: Q1 2026  
**Framework Version**: FastAPI 0.104  
**Python Version**: 3.8+
