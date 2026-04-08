# ChatPaat: API Documentation

## 🔌 API Overview

ChatPaat exposes a complete REST API built with FastAPI. This document provides detailed endpoint documentation with request/response examples, error codes, and implementation notes.

**Base URL**: `http://127.0.0.1:7004` (development)

**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

---

## 🔐 Authentication Endpoints

### **POST /api/register/**
Register a new user account.

**Request**:
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Username or email already exists
- `422 Unprocessable Entity`: Invalid input data

**Validation**:
- Username: Not taken, alphanumeric preferred
- Email: Valid format, not taken
- Password: Min 8 characters recommended (enforce client-side)

---

### **POST /api/login/**
Authenticate user with email and password.

**Request**:
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid email or password
- `401 Unauthorized`: User not found or password incorrect

---

### **POST /api/auth/google/exchange/**
Exchange Google authorization code for JWT tokens.

**Request**:
```json
{
  "code": "authorization_code_from_google",
  "redirect_uri": "http://localhost:5173/oauth-callback"
}
```

**Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid code or token exchange failed
- `500 Internal Server Error`: Google OAuth not configured

**Process**:
1. Frontend obtains authorization code from Google
2. Sends code to backend
3. Backend exchanges code for Google access token
4. Backend fetches user info from Google
5. Backend creates/updates user in database
6. Returns local JWT tokens

---

### **POST /api/auth/password-reset/**
Initiate password reset by sending email link.

**Request**:
```json
{
  "email": "john@example.com"
}
```

**Response** (200 OK):
```json
{
  "detail": "If an account with that email exists, instructions have been sent."
}
```

**Notes**:
- Returns same message regardless of whether user exists (no user enumeration)
- Sends email with 1-hour-valid reset link
- Link format: `{FRONTEND_URL}/reset-password?token={token}`

**Email Content**:
```
Subject: Password reset instructions

Hello [username],

We received a request to reset your password. If you requested this, 
open the link below to set a new password:

[RESET_LINK]

If you didn't request this, you can safely ignore this email.

This link will expire in 1 hour.
```

---

### **POST /api/auth/password-reset/confirm/**
Confirm password reset with token and new password.

**Request**:
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "detail": "Password has been reset. You can now sign in with your new password."
}
```

**Error Responses**:
- `400 Bad Request`: Invalid or expired token
- `400 Bad Request`: Token already used

**Validation**:
- Token must be valid (hash matches)
- Token must not be expired (within 1 hour)
- Token must not have been used before

---

## 👤 Profile Endpoints

### **GET /api/profile/**
Get authenticated user's profile information.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "date_joined": "2025-01-15T10:30:00"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found

---

### **PUT /api/profile/**
Update user profile information.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "newemail@example.com"
}
```

**Response** (200 OK):
```json
{
  "message": "Profile updated successfully",
  "email_updated": true,
  "email": "newemail@example.com",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "newemail@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Validation**:
- Email must be unique (if changed)
- Email must be valid format

**Error Responses**:
- `400 Bad Request`: Email already taken
- `401 Unauthorized`: Invalid token

---

### **POST /api/profile/upload-image/**
Upload user profile picture.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Request** (form-data):
```
file: [binary image data]
```

**Supported Formats**:
- JPEG, PNG, GIF, WebP
- Max size: 5MB

**Response** (200 OK):
```json
{
  "message": "Profile image uploaded successfully",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "image": "data:image/jpeg;base64,..."
  }
}
```

**Error Responses**:
- `400 Bad Request`: File size exceeds 5MB
- `400 Bad Request`: Invalid file type
- `401 Unauthorized`: Invalid token

---

### **POST /api/profile/change-password/**
Change password for authenticated user.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request**:
```json
{
  "old_password": "CurrentPassword123",
  "new_password": "NewSecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses**:
- `400 Bad Request`: Old password is incorrect
- `400 Bad Request`: New password is same as old password
- `401 Unauthorized`: Invalid token

---

### **DELETE /api/profile/**
Delete user account and all associated data.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "message": "Account deleted successfully",
  "user_id": 1,
  "username": "john_doe"
}
```

**Cascade Deletions**:
- All chats and messages
- Search history
- Password reset tokens

**Error Responses**:
- `401 Unauthorized`: Invalid token
- `500 Internal Server Error`: Database error

---

## 💬 Chat & Message Endpoints

### **POST /prompt_gpt/**
Send message to AI and get response.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request**:
```json
{
  "chat_id": "550e8400-e29b-41d4-a716-446655440000",
  "content": "What is machine learning?"
}
```

**Response** (200 OK):
```json
{
  "chat_id": "550e8400-e29b-41d4-a716-446655440000",
  "reply": "Machine learning is a subset of artificial intelligence...",
  "title": "Understanding Machine Learning"
}
```

**Behavior**:
- If `chat_id` is null/omitted: Creates new chat with UUID
- Stores user message in database
- Calls Groq API for AI response
- Stores AI response in database
- Generates chat title on first message
- Returns response immediately

**Error Responses**:
- `400 Bad Request`: No content provided
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: User doesn't own the chat

---

### **GET /get_chat_messages/{chat_id}/**
Retrieve all messages in a specific chat.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
[
  {
    "role": "user",
    "content": "What is machine learning?"
  },
  {
    "role": "assistant",
    "content": "Machine learning is a subset of artificial intelligence..."
  },
  {
    "role": "user",
    "content": "Can you give an example?"
  },
  {
    "role": "assistant",
    "content": "Sure! Here's an example..."
  }
]
```

**Order**: Messages returned in chronological order (oldest first)

**Error Responses**:
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: User doesn't own the chat
- `404 Not Found`: Chat not found

---

### **GET /todays_chat/**
Get all chats created today for authenticated user.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Understanding Machine Learning",
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T10:45:32"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Python Programming Tips",
    "created_at": "2025-01-15T14:22:00",
    "updated_at": "2025-01-15T14:35:00"
  }
]
```

**Filter**: `created_at >= TODAY_AT_00_00_00`  
**Order**: By `updated_at DESC` (most recent first)

---

### **GET /yesterdays_chat/**
Get all chats from yesterday.

**Filter**: `YESTERDAY_START <= created_at < TODAY_START`

**Response Format**: Same as `/todays_chat/`

---

### **GET /seven_days_chat/**
Get all chats from past 7 days.

**Filter**: `created_at >= NOW - 7_DAYS`

**Response Format**: Same as `/todays_chat/`

---

### **DELETE /delete_chat/{chat_id}/**
Delete a chat and all its messages.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response** (200 OK):
```json
{
  "message": "Chat deleted successfully",
  "chat_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Cascade**: Automatically deletes all ChatMessage records

**Error Responses**:
- `401 Unauthorized`: Invalid token
- `403 Forbidden`: User doesn't own the chat
- `404 Not Found`: Chat not found

---

## 📊 Utility Endpoints

### **POST /api/store_search/**
Store user search query for analytics.

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Request**:
```json
{
  "search_query": "python tuple unpacking"
}
```

**Response** (200 OK):
```json
{
  "message": "Search query stored successfully."
}
```

---

### **GET /health/**
Health check endpoint.

**Response** (200 OK):
```json
{
  "status": "healthy"
}
```

---

### **GET /**
Documentation root.

**Response**: Returns `index.html` with API documentation

---

## 🔑 Authentication Pattern

### **Setting JWT Token in Requests**

**All protected endpoints require**:
```
Header: Authorization: Bearer {JWT_TOKEN}
```

**Frontend Implementation**:
```typescript
const token = sessionStorage.getItem('access_token');

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

fetch('http://127.0.0.1:7004/api/profile/', {
  method: 'GET',
  headers: headers
})
```

**Axios Setup**:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:7004'
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## ⚡ Error Handling

### **Standard Error Response**

```json
{
  "detail": "Error message explaining what went wrong"
}
```

### **Common HTTP Status Codes**

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | User doesn't own resource |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error |

### **Frontend Error Handling**

```typescript
async function callAPI(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('API Error:', err.message);
    showToast(err.message, 'error');
    
    // Auto-logout on 401
    if (response?.status === 401) {
      signOut();
      redirect('/signin');
    }
  }
}
```

---

## 📝 Request/Response Examples

### **Complete Chat Flow Example**

```typescript
// 1. Register
const registerResponse = await fetch('http://localhost:7004/api/register/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'SecurePass123'
  })
});
const { access: token } = await registerResponse.json();
sessionStorage.setItem('access_token', token);

// 2. Send message
const chatResponse = await fetch('http://localhost:7004/prompt_gpt/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    chat_id: crypto.randomUUID(),
    content: 'What is AI?'
  })
});
const { reply, chat_id } = await chatResponse.json();

// 3. Get chat messages
const messagesResponse = await fetch(
  `http://localhost:7004/get_chat_messages/${chat_id}/`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const messages = await messagesResponse.json();

// 4. Get today's chats
const chatsResponse = await fetch(
  'http://localhost:7004/todays_chat/',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const chats = await chatsResponse.json();

// 5. Update profile
const updateResponse = await fetch('http://localhost:7004/api/profile/', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: 'John',
    last_name: 'Doe'
  })
});
const updatedUser = await updateResponse.json();

// 6. Delete account
await fetch('http://localhost:7004/api/profile/', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
sessionStorage.clear();
```

---

## 🔄 API Rate Limiting

**Current Status**: Not implemented  
**Future Enhancement**: Add rate limiting for production

```python
# Future implementation
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/api/login/")
@limiter.limit("5/minute")
def login(...):
    # Max 5 login attempts per minute per IP
```

---

## 🧪 Testing API Endpoints

### **Using cURL**

```bash
# Register
curl -X POST http://localhost:7004/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# Login
curl -X POST http://localhost:7004/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# Send message (replace TOKEN)
curl -X POST http://localhost:7004/prompt_gpt/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, how are you?"
  }'
```

### **Using Postman**

1. Create new request: `POST /api/register/`
2. Body → JSON: Add registration data
3. Click Send
4. Copy `access` token
5. Use Authorization → Bearer Token
6. Make subsequent requests

---

## 📚 API Documentation Tools

**Swagger UI**: Available at `http://localhost:7004/docs`  
**ReDoc**: Available at `http://localhost:7004/redoc`

These are auto-generated from FastAPI route definitions and docstrings.

---

**API Documentation Last Updated**: Q1 2026  
**API Version**: 1.0.0  
**Authentication**: JWT Bearer Tokens
