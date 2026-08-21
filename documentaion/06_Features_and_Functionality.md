# ChatPaat: Features & Functionality

## 🎯 Complete Feature Overview

ChatPaat provides a comprehensive set of features for intelligent conversations and user management. This document details every feature with implementation notes and technical specifications.

---

## 💬 Core Chat Features

### 1. **Real-Time AI Chat Interface**

**Description**: Users can engage in real-time conversations with an advanced AI assistant.

**Features**:
- Message input with rich formatting support
- Real-time message display
- Markdown rendering for AI responses
- Code syntax highlighting with copy buttons
- Typing indicator animation while AI processes
- Auto-scroll to latest messages
- Empty state guidance message

**Technical Implementation**:
```typescript
// Frontend
- useQuery to fetch previous messages
- useMutation to send new message to /prompt_gpt/
- Real-time state update with setMessages()
- Markdown rendering with react-markdown
- Syntax highlighting with react-syntax-highlighter

// Backend
- /prompt_gpt/ endpoint receives chat_id and content
- Call Groq API: openai/gpt-oss-20b model
- Store user message and AI response in database
- Return response to frontend
```

**User Experience**:
- ✅ Messages appear instantly
- ✅ Typing loader shown during processing
- ✅ Full markdown support in AI responses
- ✅ Code blocks with language highlighting
- ✅ Copy button for code snippets

---

### 2. **Chat Session Management**

**Description**: Create, organize, and manage multiple independent conversation sessions.

**Features**:
- Create new chats with unique UUID
- Auto-generating chat titles from first message
- View chat history organized by time
- Delete existing chats
- Persist all messages in database
- Message isolation between chats

**Time-Based Organization**:
- **Today's Chats**: Created since 00:00:00 today
- **Yesterday's Chats**: Created yesterday
- **Last 7 Days**: Created in past 7 days
- **Full History**: Access all conversations

**Technical Implementation**:
```python
# Backend
GET /todays_chat/          # Query chats with TODAY filter
GET /yesterdays_chat/      # Query chats with YESTERDAY filter
GET /seven_days_chat/      # Query chats with LAST_7_DAYS filter
DELETE /delete_chat/{id}/  # Cascade delete chat & messages
```

```typescript
// Frontend
- AppSidebar component with chat list
- useQuery to fetch chats by time filter
- Click chat to load its messages
- Delete button with confirmation
- Create new chat button
```

---

### 3. **AI-Generated Chat Titles**

**Description**: Intelligent automatic title generation for conversations.

**How It Works**:
1. User sends first message
2. Backend calls Groq API with prompt: "Generate short 3-5 word title"
3. AI generates title (e.g., "Understanding Machine Learning")
4. Title stored in Chat record
5. Title displayed in sidebar

**Benefits**:
- ✅ Quick identification of conversations
- ✅ No manual title entry required
- ✅ AI-generated summaries are accurate
- ✅ Fallback to first 50 chars if API fails

**Implementation**:
```python
def create_chat_title(user_message: str) -> str:
    """Generate title from first message"""
    # Call Groq API with message
    # Extract title from response
    # Return title (max 50 chars fallback)
```

---

### 4. **Message Persistence & History**

**Description**: All messages are permanently stored and easily retrievable.

**Features**:
- Store all user messages
- Store all AI responses
- Maintain message order with timestamps
- Support infinite message history
- Load history on chat selection
- Search within conversation (future)

**Data Structure**:
```
Chat
├── Message 1: User - "What is AI?"
├── Message 2: Assistant - "AI is artificial intelligence..."
├── Message 3: User - "Tell me more"
└── Message 4: Assistant - "Sure, here are more details..."
```

**Database Queries**:
```python
# Get all messages in a chat
messages = db.query(ChatMessage).filter(
    ChatMessage.chat_id == chat_id
).order_by(ChatMessage.created_at.asc()).all()

# Get recent messages
recent = db.query(ChatMessage).filter(
    ChatMessage.chat_id == chat_id
).order_by(ChatMessage.created_at.desc()).limit(20).all()
```

---

## 👤 User Authentication & Management

### 5. **Email/Password Authentication**

**Description**: Traditional username/email and password-based account creation and login.

**Features**:
- User registration with username, email, password
- Secure password hashing (Argon2)
- Email uniqueness validation
- Username uniqueness validation
- Auto-login after registration
- Login with email (not username)

**Security Measures**:
- ✅ Argon2 password hashing (GPU-resistant)
- ✅ 72-character password truncation (bcrypt limit)
- ✅ Duplicate email/username prevention
- ✅ Clear error messages without user enumeration

**Implementation**:
```python
@router.post("/api/register/")
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Validate email uniqueness
    # Validate username uniqueness
    # Hash password with Argon2
    # Create CustomUser record
    # Generate JWT tokens
    # Return tokens

@router.post("/api/login/")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    # Query user by email
    # Verify password hash
    # Generate JWT tokens
    # Return tokens
```

---

### 6. **Google OAuth 2.0 Integration**

**Description**: One-click authentication using Google accounts.

**Features**:
- Sign in with Google account
- Automatic user creation on first login
- Update user info from Google profile
- No password storage for OAuth users
- Generate local JWT tokens

**OAuth Flow**:
1. User clicks "Sign in with Google"
2. Google authorization dialog
3. User grants permission
4. Frontend receives authorization code
5. Backend exchanges code for Google access token
6. Backend fetches user info from Google API
7. User auto-created or updated in database
8. Local JWT tokens generated
9. User logged in automatically

**Benefits**:
- ✅ One-click signup/login
- ✅ No password management for users
- ✅ Automatic account creation
- ✅ Secure token exchange

**Implementation**:
```python
@router.post("/api/auth/google/exchange/")
def google_exchange(req: GoogleExchangeRequest, db: Session = Depends(get_db)):
    # Exchange code for Google access token
    # Fetch user info from Google
    # Upsert user in database
    # Generate local JWT tokens
    # Return tokens
```

---

### 7. **JWT Token-Based Session Management**

**Description**: Stateless authentication using JSON Web Tokens.

**Token Structure**:
- **Access Token**: 24-hour validity
  - Contains user ID
  - Used for API requests
  - Sent in Authorization header
- **Refresh Token**: 7-day validity
  - Used to get new access tokens
  - Extends session duration

**Storage**:
- Tokens stored in browser `sessionStorage`
- Cleared on logout
- Cleared on tab close

**Validation**:
```python
def verify_token(token: str) -> Optional[str]:
    """Decode JWT and extract user ID"""
    # Verify signature using SECRET_KEY
    # Check expiration
    # Extract 'sub' claim (user ID)
    # Return user ID or None
```

**Usage in API Calls**:
```typescript
// Frontend sends token with every request
headers: {
  "Authorization": `Bearer ${token}`
}

// Backend verifies token before processing
user = get_current_user(authorization_header, db)
```

---

### 8. **Password Reset & Recovery**

**Description**: Secure, email-based password recovery system.

**Features**:
- Initiate password reset via email
- Email links with time-limited tokens
- One-time use tokens (prevent replay)
- 1-hour expiration window
- Secure token hashing (SHA-256)
- Confirmation with new password

**Security Measures**:
- ✅ Token hashing (never stored in plaintext)
- ✅ One-time use (marked as used after redemption)
- ✅ Expiration validation (1 hour)
- ✅ Silent failure (no user enumeration)
- ✅ Secure email transmission (SendGrid)

**Process**:
1. User enters email on forgot-password page
2. Backend queries user by email
3. Generates random token
4. Hashes token with secret key
5. Creates PasswordResetToken record (expires in 1 hour)
6. Sends email with reset link
7. User clicks link in email → /reset-password?token=...
8. Frontend extracts token from URL
9. User enters new password
10. Backend verifies token and updates password
11. Token marked as used
12. User can log in with new password

**Implementation**:
```python
@router.post("/api/auth/password-reset/")
def password_reset(req: PasswordResetRequest, db: Session = Depends(get_db)):
    """Initiate password reset"""
    user = db.query(CustomUser).filter(CustomUser.email == req.email).first()
    if user:
        token = secrets.token_urlsafe(48)
        token_hash = hashlib.sha256((token + SECRET_KEY).encode()).hexdigest()
        prt = PasswordResetToken(user_id=user.id, token_hash=token_hash, ...)
        db.add(prt)
        db.commit()
        send_email(user.email, reset_link)

@router.post("/api/auth/password-reset/confirm/")
def password_reset_confirm(req: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Confirm password reset"""
    token_hash = hashlib.sha256((req.token + SECRET_KEY).encode()).hexdigest()
    prt = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > now
    ).first()
    user = db.query(CustomUser).filter(CustomUser.id == prt.user_id).first()
    user.password = hash_password(req.new_password)
    prt.used = True
    db.commit()
```

---

### 9. **Password Change** (Authenticated)

**Description**: Allow authenticated users to change their password.

**Features**:
- Verify current password before allowing change
- Prevent setting new password same as old password
- Immediate effect (no logout required, for convenience)
- User should re-login on other sessions

**Implementation**:
```python
@router.post("/api/profile/change-password/")
def change_password(password_data: ChangePasswordRequest, ...):
    user = get_current_user(authorization, db)
    
    # Verify old password
    if not verify_password(password_data.old_password, user.password):
        raise HTTPException(detail="Old password is incorrect")
    
    # Prevent same password
    if password_data.new_password == password_data.old_password:
        raise HTTPException(detail="New password must be different")
    
    # Update password
    user.password = hash_password(password_data.new_password)
    db.commit()
```

---

## 👨‍💼 Profile Management

### 10. **User Profile Information**

**Description**: Store and manage user details and preferences.

**Profile Fields**:
- Username (immutable)
- Email (changeable, unique)
- First Name
- Last Name
- Account creation date
- Profile picture (optional)

**Features**:
- View full profile information
- Update first and last names
- Change email address
- Upload profile picture
- View account creation date

**Implementation**:
```python
@router.get("/api/profile/")
def get_profile(auth: str = Header(None), db: Session = Depends(get_db)):
    """Get current user's profile"""
    user = get_current_user(auth, db)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "date_joined": user.date_joined
    }

@router.put("/api/profile/")
def update_profile(profile_data: UpdateProfileRequest, ...):
    """Update user profile"""
    user = get_current_user(auth, db)
    
    # Email uniqueness check if changed
    if profile_data.email and profile_data.email != user.email:
        existing = db.query(CustomUser).filter(
            CustomUser.email == profile_data.email
        ).first()
        if existing:
            raise HTTPException(detail="Email already exists")
    
    # Update fields
    if profile_data.first_name:
        user.first_name = profile_data.first_name
    if profile_data.last_name:
        user.last_name = profile_data.last_name
    if profile_data.email:
        user.email = profile_data.email
    
    db.commit()
```

---

### 11. **Profile Picture Upload**

**Description**: Upload and manage user profile pictures.

**Features**:
- Upload image files (JPEG, PNG, GIF, WebP)
- Validate file size (max 5MB)
- Validate file type
- Convert to base64 for storage
- Display profile picture in navbar and sidebars
- Fallback to DiceBear API for avatar generation

**Supported Formats**:
- ✅ JPEG
- ✅ PNG
- ✅ GIF
- ✅ WebP

**File Validation**:
```python
# Max size: 5MB
MAX_SIZE = 5 * 1024 * 1024

# Allowed types
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

# Implementation
@router.post("/api/profile/upload-image/")
def upload_profile_image(file: UploadFile = File(...), ...):
    contents = file.file.read()
    
    # Validate size
    if len(contents) > MAX_SIZE:
        raise HTTPException(detail="File too large")
    
    # Validate type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(detail="Invalid file type")
    
    # Convert to base64
    image_base64 = base64.b64encode(contents).decode('utf-8')
    image_data_url = f"data:{file.content_type};base64,{image_base64}"
    
    # Store in database (optional)
```

---

### 12. **Account Deletion**

**Description**: Permanently delete user account and all associated data.

**Features**:
- Requires authentication
- Cascade deletes all user data:
  - All chats
  - All messages
  - All search history
  - All password reset tokens
- No recovery possible (permanent)
- Immediate effect

**Data Deletion Flow**:
```
DELETE User Account
  ├─ DELETE all Chats (cascade)
  │  └─ DELETE all ChatMessages (cascade)
  ├─ DELETE all UserSearchHistory (cascade)
  ├─ DELETE all PasswordResetTokens (cascade)
  └─ Clear SessionStorage (frontend)
```

**Implementation**:
```python
@router.delete("/api/profile/")
def delete_account(auth: str = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(auth, db)
    
    # Database cascade will delete:
    # - All chats and messages
    # - Search history
    # - Password reset tokens
    db.delete(user)
    db.commit()
    
    # Frontend will clear session storage
```

---

## 🎨 User Interface Features

### 13. **Responsive Design**

**Description**: Seamless experience across all device sizes.

**Breakpoints**:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

**Responsive Elements**:
- ✅ Flexible grid layouts
- ✅ Mobile-first component design
- ✅ Touch-friendly buttons and inputs
- ✅ Adaptive navigation (mobile menu)
- ✅ Optimized font sizes

**Implementation**:
```tsx
// Tailwind responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>

<nav className="hidden md:flex gap-4">
  {/* Desktop only */}
</nav>

<button className="md:hidden">
  {/* Mobile only */}
</button>
```

---

### 14. **Dark/Light Theme Support**

**Description**: Dynamic theme switching for user comfort.

**Features**:
- Toggle between dark and light modes
- Preference persistence (localStorage)
- Tailwind CSS dark mode classes
- Smooth transitions between themes
- System theme detection (optional)

**Implementation**:
```typescript
// ThemeContext
const [isDark, setIsDark] = useState(() => {
  const saved = localStorage.getItem('theme');
  return saved ? saved === 'dark' : false;
});

effect(() => {
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', isDark);
}, [isDark]);

// Usage
<button onClick={() => setIsDark(!isDark)}>
  {isDark ? <Sun /> : <Moon />}
</button>
```

---

### 15. **Professional Animations & Transitions**

**Description**: Smooth, delightful micro-interactions using Framer Motion.

**Animation Types**:
- ✅ Message slide-in (left/right)
- ✅ Button hover effects
- ✅ Page transitions
- ✅ Modal animations
- ✅ Typing loader dots
- ✅ Fade-in/out effects
- ✅ Smooth scroll behavior

**Example Animations**:
```typescript
// Message animation
<motion.div
  initial={{ opacity: 0, x: isUser ? 20 : -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.3 }}
>
  {message}
</motion.div>

// Button hover
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Click me
</motion.button>

// Typing loader
{[0, 1, 2].map(i => (
  <motion.div
    animate={{ y: [0, -10, 0] }}
    transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
  />
))}
```

---

### 16. **Accessibility Features**

**Description**: Full accessibility support for all users.

**Features**:
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Color contrast compliance
- ✅ Screen reader compatible
- ✅ Focus indicators on buttons/inputs
- ✅ Semantic HTML structure

**Implementation**:
```tsx
<button
  aria-label="Send message"
  onClick={handleSend}
>
  <SendIcon />
</button>

<input
  aria-describedby="password-hint"
  type="password"
  {...}
/>

<div id="password-hint">
  Password must be at least 8 characters
</div>
```

---

## 🔍 Content Rendering

### 17. **Markdown Rendering**

**Description**: AI responses support full Markdown formatting.

**Supported Elements**:
- ✅ Headings (# H1, ## H2, etc.)
- ✅ Bold and italic text
- ✅ Lists (ordered and unordered)
- ✅ Code blocks with language specification
- ✅ Inline code
- ✅ Links
- ✅ Blockquotes
- ✅ Horizontal rules
- ✅ Tables

**Implementation**:
```tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown
  components={{
    code: ({ inline, className, children }) => (
      inline ? (
        <code className="bg-gray-200 px-1 rounded">{children}</code>
      ) : (
        <SyntaxHighlighter language={lang}>{children}</SyntaxHighlighter>
      )
    ),
    h1: ({ children }) => <h1 className="text-3xl font-bold mt-4">{children}</h1>,
    // ... other components
  }}
>
  {content}
</ReactMarkdown>
```

---

### 18. **Code Syntax Highlighting**

**Description**: Beautiful code block rendering with language-specific highlighting.

**Supported Languages**:
- Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Ruby, PHP, etc.

**Features**:
- ✅ Language-specific syntax coloring
- ✅ Copy button for code blocks
- ✅ Line numbers (optional)
- ✅ Dark theme code styling
- ✅ Proper indentation preservation

**Implementation**:
```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vs2015 from 'react-syntax-highlighter/dist/esm/styles/prism/atom-dark';

<SyntaxHighlighter
  language={language}
  style={vs2015}
  showLineNumbers={true}
>
  {code}
</SyntaxHighlighter>

// Copy button
<button onClick={() => navigator.clipboard.writeText(code)}>
  {copied ? <Check /> : <Copy />}
</button>
```

---

## 📊 Analytics & Data

### 19. **Search History Tracking**

**Description**: Track user search queries for analytics.

**Features**:
- Store all search queries
- Timestamp each search
- User isolation (per-user history)
- Optional analytics insights

**Use Cases**:
- Understand user interests
- Trending topics
- User behavior analysis
- Future recommendations

**Implementation**:
```python
@router.post("/api/store_search/")
def user_search(search_data: SearchQueryRequest, ...):
    """Store user search query"""
    user = get_current_user(auth, db)
    
    search = UserSearchHistory(
        user_id=user.id,
        search_query=search_data.search_query,
        created_at=datetime.utcnow()
    )
    db.add(search)
    db.commit()
```

---

## 💾 Data Management Features

### 20. **Complete Data Persistence**

**Description**: All user data is permanently stored and retrievable.

**Persisted Data**:
- User profiles and credentials
- Chat sessions and messages
- Search history
- Password reset tokens
- Account activity timestamps

**Data Availability**:
- ✅ Always available across sessions
- ✅ Accessible on any device (with login)
- ✅ Synced in real-time
- ✅ Organized by time periods

---

## 🎁 Summary Table

| Feature | Availability | Technology | Status |
|---------|--------------|-----------|--------|
| AI Chat | ✅ | Groq LLM | Production |
| Email Auth | ✅ | JWT + Argon2 | Production |
| Google OAuth | ✅ | OAuth 2.0 | Production |
| Password Reset | ✅ | SendGrid | Production |
| Profile Mgmt | ✅ | REST API | Production |
| Chat History | ✅ | SQLite/PostgreSQL | Production |
| Markdown Rendering | ✅ | react-markdown | Production |
| Code Highlighting | ✅ | react-syntax-highlighter | Production |
| Responsive Design | ✅ | Tailwind CSS | Production |
| Dark Mode | ✅ | CSS | Production |
| Animations | ✅ | Framer Motion | Production |
| Accessibility | ✅ | ARIA | Production |

---

## 📚 Next Steps & Related Documentation

- **API Integration**: See `07_API_Documentation.md`
- **Backend Implementation**: See `02_Backend_Documentation.md`
- **Frontend Components**: See `03_Frontend_Documentation.md`

---

**Features Documentation Last Updated**: Q1 2026  
**Total Features**: 20+  
**Status**: All production-ready
