# ChatPaat: Security & Authentication

## 🔐 Security Architecture

ChatPaat implements multi-layered security to protect user data and ensure secure operations. This document details all security mechanisms, best practices, and implementation details.

---

## 🔑 Authentication Methods

### **1. JWT (JSON Web Token) Authentication**

**What is JWT?**
A JSON Web Token is a self-contained, stateless authentication mechanism. The token contains encoded user information and is cryptographically signed to prevent tampering.

**JWT Structure**:
```

[Header].[Payload].[Signature]
```

**Header** (Base64 decoded):
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload** (Base64 decoded):
```json
{
  "sub": "1",              // User ID
  "exp": 1674927276,       // Expiration timestamp
  "iat": 1674840876        // Issued at timestamp
}
```

**Signature**:
```
HMAC-SHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  SECRET_KEY
)
```

**Benefits**:
- ✅ Stateless (no session storage required)
- ✅ Scalable (works across multiple servers)
- ✅ Self-contained (includes user ID)
- ✅ Cryptographically signed (tamper-proof)
- ✅ Expiration validation (time-based)

**Configuration**:
```python
# .env
JWT_SECRET_KEY=your-very-long-random-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# auth.py
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")  # HS256
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS"))  # 24
```

**Token Generation**:
```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

**Token Validation**:
```python
def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and extract user ID"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        return user_id
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid or tampered token
```

**Using Tokens in Requests**:
```typescript
// Frontend stores token after login/register
sessionStorage.setItem('access_token', response.access);

// Include token in all protected API calls
const token = sessionStorage.getItem('access_token');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

---

### **2. Google OAuth 2.0 Integration**

**What is OAuth?**
OAuth is an industry-standard authorization protocol that allows users to grant third-party applications access to their accounts without sharing passwords.

**OAuth 2.0 Flow**:
```
1. User clicks "Sign in with Google"
        ↓
2. Browser redirects to Google Authorization Endpoint
        ↓
3. User authenticates and grants permission
        ↓
4. Google redirects back to app with authorization code
        ↓
5. App exchanges code for access token (backend-to-backend)
        ↓
6. App uses token to fetch user info from Google
        ↓
7. App creates/updates user in local database
        ↓
8. App issues local JWT token to user
        ↓
9. User is now logged in to app
```

**Configuration**:
```python
# .env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=http://localhost:5173
```

**Implementation**:
```python
@router.post("/api/auth/google/exchange/")
def google_exchange(req: GoogleExchangeRequest, db: Session = Depends(get_db)):
    """Exchange Google OAuth code for local JWT tokens"""
    
    # Step 1: Exchange code for Google access token
    token_data = _exchange_code_for_tokens(
        req.code,
        req.redirect_uri or f"{FRONTEND_URL}/oauth-callback"
    )
    
    # Step 2: Fetch user info from Google
    access_token = token_data.get("access_token")
    info = _get_google_userinfo(access_token)
    
    # Step 3: Extract user info
    email = info.get("email")
    name = info.get("name")
    
    # Step 4: Upsert user in database
    user = db.query(CustomUser).filter(CustomUser.email == email).first()
    
    if not user:
        # Create new user on first OAuth login
        base_username = email.split("@")[0]
        username = _ensure_unique_username(db, base_username)
        random_pw = str(uuid.uuid4())  # Random password for OAuth users
        
        user = CustomUser(
            username=username,
            email=email,
            password=hash_password(random_pw),
            first_name=name
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Step 5: Generate local JWT tokens
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
```

**Security Benefits**:
- ✅ Users don't share passwords
- ✅ No password storage burden
- ✅ One-click signup/login
- ✅ Automatic account creation
- ✅ Secure token exchange (backend-to-backend)
- ✅ Simplified password management for users

---

## 🔒 Password Security

### **Password Hashing Algorithm: Argon2**

**What is Argon2?**
Argon2 is a modern, GPU-resistant password hashing algorithm that won the Password Hashing Competition in 2015. It provides strong defense against brute-force attacks.

**Why Argon2?**
- **Memory-Hard**: Uses significant RAM, making GPU attacks expensive
- **Time-Hard**: Configurable iterations prevent brute-force
- **GPU-Resistant**: Designed to resist GPU/ASIC acceleration
- **Proven**: Winner of Password Hashing Competition 2015
- **Modern**: Better than older bcrypt and scrypt

**Configuration**:
```python
# auth.py
from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)
```

**Password Hashing**:
```python
def hash_password(password: str) -> str:
    """Hash password using Argon2"""
    # Truncate to 72 bytes (bcrypt limit, for compatibility)
    password = password[:72]
    return pwd_context.hash(password)
    
# Example hashed password:
# $argon2id$v=19$m=102400,t=2,p=8$v7/Ao5e80GH7C+Z3BbxI5w$jz9jLt4B8Y3Z9K4M7N0O1P2Q3R4S5T6U7V8W9X0Y1Z
```

**Password Verification**:
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password"""
    plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)

# Process:
# 1. Receive plain password from user
# 2. Retrieve hashed password from database
# 3. Use pwd_context.verify() to check if they match
# 4. Return True/False
```

**Argon2 Parameters**:
```
$argon2id$v=19$m=102400,t=2,p=8$...
         ↑                ↑     ↑  ↑
      version      memory time  parallelism
      
m=102400    → 100 MB memory per hash (strong)
t=2         → 2-3 iterations
p=8         → 8 parallel processes
```

---

### **Password Reset Security**

**Token Generation**:
```python
import secrets
import hashlib

# Generate random token
token = secrets.token_urlsafe(48)  # 48 bytes Base64 = 64 chars

# Hash token with secret key
token_hash = hashlib.sha256((token + SECRET_KEY).encode()).hexdigest()

# Store token_hash in database (never plain token)
prt = PasswordResetToken(
    user_id=user.id,
    token_hash=token_hash,
    used=False,
    expires_at=datetime.utcnow() + timedelta(hours=1)
)
db.add(prt)
db.commit()
```

**Token Validation**:
```python
# User clicks reset link with token in URL
received_token = request.query_params.get("token")

# Hash token again
received_hash = hashlib.sha256((received_token + SECRET_KEY).encode()).hexdigest()

# Query database for matching hash
prt = db.query(PasswordResetToken).filter(
    PasswordResetToken.token_hash == received_hash,
    PasswordResetToken.used == False,
    PasswordResetToken.expires_at > datetime.utcnow()
).first()

# Only valid if:
# 1. Hash matches (token is valid)
# 2. Token hasn't been used (prevents replay)
# 3. Token hasn't expired (1-hour window)
```

**Security Features**:
- ✅ Token hashing prevents database breach impact
- ✅ One-time use prevents replay attacks
- ✅ Expiration prevents unlimited window
- ✅ Email-based verification (user controls)
- ✅ Silent failure prevents user enumeration

---

## 🌐 Network Security

### **CORS (Cross-Origin Resource Sharing)**

**What is CORS?**
CORS is a security policy that controls which domains can access an API.

**Configuration**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",      # React dev server
        "http://127.0.0.1:5173",
        "http://localhost",
        "http://127.0.0.1",
        "*"                           # Allow all (dev only!)
    ],
    allow_credentials=True,           # Allow cookies/tokens
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],              # Allow all headers
    max_age=3600,                     # Cache preflight for 1 hour
)
```

**Production CORS**:
```python
# Restrict to production domain only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://chatpaat.com",
        "https://www.chatpaat.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
)
```

**Why CORS?**
- ✅ Prevents unauthorized domain access
- ✅ Protects against CSRF (Cross-Site Request Forgery)
- ✅ Controls which origins can call your API
- ✅ Restricts HTTP methods and headers

---

### **HTTPS (Recommended for Production)**

**Why HTTPS?**
- ✅ Encrypts all data in transit
- ✅ Prevents man-in-the-middle attacks
- ✅ Authenticates server identity
- ✅ Browser shows trust indicators
- ✅ Essential for password/token security

**Implementation**:
```python
# Local development (HTTP is fine)
uvicorn.run("fastapi_server:app", host="localhost", port=7004, ssl_keyfile=None)

# Production with SSL certificate
uvicorn.run(
    "fastapi_server:app",
    host="0.0.0.0",
    port=443,
    ssl_keyfile="/path/to/key.pem",
    ssl_certfile="/path/to/cert.pem"
)
```

---

## 🛡️ Data Protection

### **User Data Isolation**

**Database-Level Isolation**:
```python
# Every query includes user_id check
user = get_current_user(token, db)

# Get user's chats only
chats = db.query(Chat).filter(Chat.user_id == user.id).all()

# Get chat messages (verify ownership)
chat = db.query(Chat).filter(Chat.id == chat_id).first()
if chat.user_id != user.id:
    raise HTTPException(status_code=403, detail="Unauthorized")
```

**Query Authorization Pattern**:
```python
def get_current_user(token: str, db: Session) -> CustomUser:
    """Verify token and get user"""
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(CustomUser).filter(CustomUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Every protected endpoint calls get_current_user()
# This ensures user isolation automatically
```

**Benefits**:
- ✅ Each user only sees their data
- ✅ No cross-user data leakage
- ✅ Consistent authorization checks
- ✅ Prevents privilege escalation

---

### **Password Reset Token Cleanup** (Future Enhancement)

```python
def cleanup_expired_tokens(db: Session):
    """Remove expired password reset tokens (run as scheduled task)"""
    from datetime import datetime
    
    now = datetime.utcnow()
    expired_count = db.query(PasswordResetToken).filter(
        PasswordResetToken.expires_at < now,
        PasswordResetToken.used == False
    ).delete()
    
    db.commit()
    print(f"Cleaned up {expired_count} expired tokens")

# Run daily via cron job or task scheduler
# 0 0 * * * python -c "from routes import cleanup_expired_tokens; cleanup_expired_tokens()"
```

---

## 🚨 Input Validation & Sanitization

### **Pydantic Models for Validation**

```python
from pydantic import BaseModel, Field, EmailStr

class UserRegister(BaseModel):
    username: str               # Required
    email: EmailStr             # Must be valid email
    password: str               # Required, no min length enforced server-side
    
    class Config:
        # JSON Schema settings
        schema_extra = {
            "example": {
                "username": "john_doe",
                "email": "john@example.com",
                "password": "securepass123"
            }
        }

# Validation happens automatically:
# - Missing fields → 422 error
# - Invalid email format → 422 error
# - Wrong type → 422 error
```

**Benefits**:
- ✅ Type checking
- ✅ Required field enforcement
- ✅ Format validation
- ✅ Automatic error responses
- ✅ Prevents injection attacks

### **SQL Injection Prevention**

```python
# ❌ VULNERABLE (raw SQL)
query = f"SELECT * FROM users WHERE email = '{email}'"
db.execute(query)

# ✅ SAFE (SQLAlchemy ORM)
user = db.query(CustomUser).filter(CustomUser.email == email).first()

# SQLAlchemy binds parameters safely, preventing SQL injection
```

---

## 🔐 Secure Configuration

### **Environment Variables**

```bash
# .env (NEVER commit this file!)
JWT_SECRET_KEY=<64-character-random-string>
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

GROQ_API_KEY=<your-api-key>
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>

SENDGRID_API_KEY=<your-api-key>
SENDER_EMAIL=noreply@example.com

USE_POSTGRES=false
# DB_PASSWORD=<secure-password>

# .env.example (Safe to commit, shows structure)
JWT_SECRET_KEY=your-very-long-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

GROQ_API_KEY=your-groq-api-key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

SENDGRID_API_KEY=your-sendgrid-api-key
SENDER_EMAIL=noreply@example.com
```

**Best Practices**:
- ✅ Use `.gitignore` to prevent committing `.env`
- ✅ Store production secrets in secure vault (AWS Secrets Manager, etc.)
- ✅ Rotate API keys regularly
- ✅ Use environment-specific configurations
- ✅ Never log sensitive data

---

## 🔍 Error Messages & Logging

### **Safe Error Messages**

```python
# ❌ UNSAFE: Reveals system details
raise Exception("Database connection failed: password incorrect")

# ✅ SAFE: Generic message to user, detailed logging
logger.error(f"Database connection failed: {detailed_error}")
raise HTTPException(status_code=500, detail="An error occurred. Please try again later.")

# ❌ UNSAFE: Reveals if user exists
if db.query(CustomUser).filter(CustomUser.email == email).first():
    raise HTTPException(detail="User with this email already exists")

# ✅ SAFE: Silent failure prevents user enumeration
user = db.query(CustomUser).filter(CustomUser.email == email).first()
if user:
    # Send email
return {"detail": "If account exists, reset instructions have been sent"}
```

---

## ✅ Security Checklist

**Authentication**:
- ✅ JWT tokens with expiration
- ✅ Google OAuth 2.0 integration
- ✅ Token verification on protected routes
- ✅ Secure token storage (sessionStorage)

**Password Security**:
- ✅ Argon2 hashing (memory-hard)
- ✅ Password reset with one-time tokens
- ✅ Token expiration (1 hour)
- ✅ Token hashing (SHA-256)
- ✅ Change password endpoint

**Network Security**:
- ✅ CORS configuration
- ✅ HTTPS recommended for production
- ✅ Content-Type validation

**Data Protection**:
- ✅ User isolation at database level
- ✅ Authorization checks on all endpoints
- ✅ Cascade delete on user deletion
- ✅ No sensitive data in logs

**Input Validation**:
- ✅ Pydantic schema validation
- ✅ SQLAlchemy ORM (prevents SQLi)
- ✅ Type checking
- ✅ Format validation

**Configuration**:
- ✅ Environment variables for secrets
- ✅ No hardcoded credentials
- ✅ `.env` in `.gitignore`
- ✅ Separate dev/prod configurations

---

## 🚀 Security Best Practices

### **For Developers**

1. **Never commit `.env` file** - Use `.env.example` instead
2. **Always verify JWT tokens** - Use `get_current_user()` helper
3. **Validate all user input** - Use Pydantic schemas
4. **Rotate API keys regularly** - Quarterly minimum
5. **Use HTTPS in production** - Always encrypt in transit
6. **Keep dependencies updated** - Run `pip update-check`
7. **Don't log sensitive data** - Passwords, tokens, etc.
8. **Use strong database passwords** - Min 16 characters
9. **Backup user data regularly** - Encrypted backups
10. **Monitor for suspicious activity** - Log API failures

### **For Operations**

1. Use database encryption at rest
2. Enable database backups with encryption
3. Monitor failed login attempts
4. Use Web Application Firewall (WAF)
5. Implement rate limiting on authentication endpoints
6. Regular security audits
7. Penetration testing
8. Encrypted connections to database

---

## 📚 Related Documentation

- **JWT Tokens**: See code in `04_Backend_Documentation.md`
- **API Security**: See `07_API_Documentation.md` error handling
- **Database Security**: See `04_Database_Documentation.md`

---

**Security Documentation Last Updated**: Q1 2026  
**Security Level**: Production-Ready  
**Authentication Methods**: JWT + OAuth 2.0
