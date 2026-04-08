# ChatPaat: Database Documentation

## 🗄️ Overview

ChatPaat uses a relational database to persist all user data, conversations, and system information. The database layer is abstracted using **SQLAlchemy ORM**, which provides database-agnostic Python code that works with multiple database engines.

**Database Options**:
- **Development**: SQLite 3 (file-based, zero-configuration)
- **Production**: PostgreSQL 12+ (recommended for scale)
- **Fallback**: MySQL, MariaDB (with minimal modifications)

---

## 📋 Database Schema

### Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA STRUCTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐                                       │
│  │   CustomUser         │  (ID: 1..N)                          │
│  ├──────────────────────┤                                       │
│  │ id (PK)              │                                       │
│  │ username (UNIQUE)    │────┐                                  │
│  │ email (UNIQUE)       │    │                                  │
│  │ password (HASH)      │    │                                  │
│  │ first_name           │    │  1:N                             │
│  │ last_name            │    │                                  │
│  │ is_active            │    │                                  │
│  │ is_staff             │    │  ┌──────────────────────┐        │
│  │ is_superuser         │    ├──┤ Chat                 │        │
│  │ last_login           │    │  ├──────────────────────┤        │
│  │ date_joined          │    │  │ id (PK, UUID)        │        │
│  └──────────────────────┘    │  │ user_id (FK)         │        │
│                              │  │ title                │        │
│  ┌──────────────────────┐    │  │ created_at           │        │
│  │ UserSearchHistory    │    │  │ updated_at           │        │
│  ├──────────────────────┤    │  └──────────────────────┘        │
│  │ id (PK)              │    │           │                      │
│  │ user_id (FK)         │────┘           │ 1:N                  │
│  │ search_query         │                │                      │
│  │ created_at           │    ┌──────────┴──────────┐            │
│  └──────────────────────┘    │                      │           │
│                              │  ┌──────────────────────────┐    │
│  ┌──────────────────────┐    │  │   ChatMessage          │    │
│  │ PasswordResetToken   │    │  ├──────────────────────────┤    │
│  ├──────────────────────┤    │  │ id (PK)                 │    │
│  │ id (PK)              │    │  │ chat_id (FK)            │    │
│  │ user_id (FK)         │────┘  │ role (user|assistant)   │    │
│  │ token_hash           │       │ content                 │    │
│  │ used                 │       │ created_at              │    │
│  │ expires_at           │       └──────────────────────────┘    │
│  │ created_at           │                                       │
│  └──────────────────────┘                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Detailed Table Schemas

### **Table: chatpaat_app_customuser**

**Purpose**: Store user account information and authentication credentials

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `username` | VARCHAR(150) | NOT NULL, UNIQUE, INDEX | User's username |
| `email` | VARCHAR(254) | NOT NULL, UNIQUE, INDEX | User's email address |
| `password` | VARCHAR(128) | NOT NULL | Bcrypt/Argon2 hashed password |
| `first_name` | VARCHAR(150) | NOT NULL, DEFAULT '' | User's first name |
| `last_name` | VARCHAR(150) | NOT NULL, DEFAULT '' | User's last name |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Account active status |
| `is_staff` | BOOLEAN | NOT NULL, DEFAULT FALSE | Staff user flag |
| `is_superuser` | BOOLEAN | NOT NULL, DEFAULT FALSE | Superuser flag |
| `last_login` | DATETIME | NULLABLE | Timestamp of last login |
| `date_joined` | DATETIME | NOT NULL, DEFAULT NOW | Account creation timestamp |

**Indexes**:
```sql
INDEX idx_username (username)
INDEX idx_email (email)
```

**Example Rows**:
```
id | username  | email                | password                      | first_name | last_name | date_joined
1  | john_doe  | john@example.com    | $argon2id$v=19$m=102400... | John       | Doe       | 2025-01-15T10:30:00
2  | jane_smith| jane@example.com    | $argon2id$v=19$m=102400... | Jane       | Smith     | 2025-01-16T14:22:00
```

---

### **Table: chatpaat_app_chat**

**Purpose**: Store conversation sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | STRING(36) | PRIMARY KEY | UUID for distributed systems |
| `user_id` | INTEGER | FOREIGN KEY, INDEX | Reference to CustomUser |
| `title` | VARCHAR(255) | NULLABLE | AI-generated conversation title |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW | Conversation start time |
| `updated_at` | DATETIME | NOT NULL, DEFAULT NOW, ONUPDATE NOW | Last message timestamp |

**Foreign Keys**:
```sql
FOREIGN KEY (user_id) REFERENCES chatpaat_app_customuser(id) ON DELETE CASCADE
```

**Indexes**:
```sql
INDEX idx_user_id (user_id)
INDEX idx_created_at (created_at)
INDEX idx_updated_at (updated_at)
```

**Example Row**:
```
id                                   | user_id | title                    | created_at           | updated_at
550e8400-e29b-41d4-a716-446655440000 | 1       | What is Machine Learning | 2025-01-15T10:35:00  | 2025-01-15T10:45:32
```

---

### **Table: chatpaat_app_chatmessage**

**Purpose**: Store individual messages within conversations

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Message identifier |
| `chat_id` | STRING(36) | FOREIGN KEY, NOT NULL, INDEX | Reference to Chat |
| `role` | VARCHAR(15) | NOT NULL | 'user' or 'assistant' |
| `content` | TEXT | NOT NULL | Full message text |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW | Message timestamp |

**Foreign Keys**:
```sql
FOREIGN KEY (chat_id) REFERENCES chatpaat_app_chat(id) ON DELETE CASCADE
```

**Indexes**:
```sql
INDEX idx_chat_id (chat_id)
INDEX idx_created_at (created_at)
```

**Role Enum Values**:
- `'user'`: Message from the user
- `'assistant'`: Message from the AI

**Example Rows**:
```
id  | chat_id                              | role      | content                         | created_at
1   | 550e8400-e29b-41d4-a716-446655440000 | user      | What is machine learning?       | 2025-01-15T10:35:00
2   | 550e8400-e29b-41d4-a716-446655440000 | assistant | Machine learning is a subset... | 2025-01-15T10:35:05
3   | 550e8400-e29b-41d4-a716-446655440000 | user      | Can you explain deep learning?  | 2025-01-15T10:36:00
```

---

### **Table: chatpaat_app_usersearchhistory**

**Purpose**: Track user search queries for analytics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Record identifier |
| `user_id` | INTEGER | FOREIGN KEY, NOT NULL, INDEX | Reference to CustomUser |
| `search_query` | TEXT | NOT NULL | Search query text |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW | Search timestamp |

**Foreign Keys**:
```sql
FOREIGN KEY (user_id) REFERENCES chatpaat_app_customuser(id) ON DELETE CASCADE
```

**Indexes**:
```sql
INDEX idx_user_id (user_id)
INDEX idx_created_at (created_at)
```

**Use Case**: Analytics, user behavior tracking, search trending

---

### **Table: chatpaat_app_passwordresettoken**

**Purpose**: Temporary tokens for password reset functionality

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Token record identifier |
| `user_id` | INTEGER | FOREIGN KEY, NOT NULL, INDEX | Reference to CustomUser |
| `token_hash` | VARCHAR(128) | NOT NULL, INDEX | SHA-256 hash of token |
| `used` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether token was used |
| `expires_at` | DATETIME | NOT NULL | Token expiration time |
| `created_at` | DATETIME | NOT NULL, DEFAULT NOW | Token creation time |

**Foreign Keys**:
```sql
FOREIGN KEY (user_id) REFERENCES chatpaat_app_customuser(id) ON DELETE CASCADE
```

**Indexes**:
```sql
INDEX idx_token_hash (token_hash)
INDEX idx_user_id (user_id)
INDEX idx_expires_at (expires_at)
```

**Security Notes**:
- Token is never stored in plaintext
- Only SHA-256 hash is persisted
- One-time use (marked as `used = true`)
- Expires after 1 hour by default
- Old tokens can be cleaned up via scheduled task

**Example Row**:
```
id | user_id | token_hash                                           | used | expires_at           | created_at
1  | 1       | a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4 | false | 2025-01-15T11:35:00  | 2025-01-15T10:35:00
```

---

## 🔗 Relationships & Constraints

### **One-to-Many (1:N) Relationships**

#### **CustomUser → Chat**
- One user can have many chats
- When user is deleted, all their chats are deleted (CASCADE)

```python
class CustomUser(Base):
    chats = relationship("Chat", back_populates="user", cascade="all, delete-orphan")

class Chat(Base):
    user = relationship("CustomUser", back_populates="chats")
```

#### **Chat → ChatMessage**
- One chat can have many messages
- When chat is deleted, all its messages are deleted (CASCADE)

```python
class Chat(Base):
    messages = relationship("ChatMessage", back_populates="chat", cascade="all, delete-orphan")

class ChatMessage(Base):
    chat = relationship("Chat", back_populates="messages")
```

#### **CustomUser → UserSearchHistory**
- One user can have many search history records
- When user is deleted, all their records are deleted (CASCADE)

```python
class CustomUser(Base):
    search_histories = relationship("UserSearchHistory", back_populates="user", cascade="all, delete-orphan")
```

---

## 📈 Data Access Patterns

### **Query Examples**

#### **Get User by Email**
```python
from models import CustomUser
from sqlalchemy.orm import Session

def get_user_by_email(db: Session, email: str) -> CustomUser:
    return db.query(CustomUser).filter(CustomUser.email == email).first()

# SQL Generated:
# SELECT * FROM chatpaat_app_customuser WHERE email = ?
```

#### **Get All Chats for User**
```python
def get_user_chats(db: Session, user_id: int):
    return db.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.updated_at.desc()).all()

# SQL Generated:
# SELECT * FROM chatpaat_app_chat WHERE user_id = ? ORDER BY updated_at DESC
```

#### **Get Messages in Chat**
```python
def get_chat_messages(db: Session, chat_id: str):
    return db.query(ChatMessage).filter(ChatMessage.chat_id == chat_id).order_by(ChatMessage.created_at.asc()).all()

# SQL Generated:
# SELECT * FROM chatpaat_app_chatmessage WHERE chat_id = ? ORDER BY created_at ASC
```

#### **Get Chats Created Today**
```python
from datetime import datetime, timedelta

def get_todays_chats(db: Session, user_id: int):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return db.query(Chat).filter(
        Chat.user_id == user_id,
        Chat.created_at >= today
    ).order_by(Chat.created_at.desc()).all()

# SQL Generated:
# SELECT * FROM chatpaat_app_chat 
# WHERE user_id = ? AND created_at >= ?
# ORDER BY created_at DESC
```

#### **Get Valid Password Reset Tokens**
```python
from datetime import datetime

def get_valid_reset_token(db: Session, token_hash: str):
    now = datetime.utcnow()
    return db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > now
    ).first()

# SQL Generated:
# SELECT * FROM chatpaat_app_passwordresettoken
# WHERE token_hash = ? AND used = FALSE AND expires_at > ?
```

---

## 🔐 Data Integrity & Constraints

### **Unique Constraints**
- `CustomUser.username`: Usernames must be unique
- `CustomUser.email`: Emails must be unique
- Prevents duplicate accounts

### **Foreign Key Constraints**
- All foreign keys enforce referential integrity
- DELETE CASCADE ensures orphan-free database
- Example: Deleting user automatically deletes their chats

### **NOT NULL Constraints**
- Critical fields are protected (email, password, etc.)
- Defaults provided for optional fields

---

## 💾 Database Migration Strategy

### **SQLAlchemy + Alembic Setup** (Future Enhancement)

```bash
# Initialize Alembic
alembic init migrations

# Create migration
alembic revision --autogenerate -m "Add new column"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### **Manual Migration** (Current Approach)

```python
# In db.py
from models import Base

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

# Call once at startup:
# init_db()
```

---

## 📊 Database Performance

### **Indexing Strategy**

**Indexes on Foreign Keys**:
```sql
CREATE INDEX idx_chat_user_id ON chatpaat_app_chat(user_id);
CREATE INDEX idx_message_chat_id ON chatpaat_app_chatmessage(chat_id);
CREATE INDEX idx_search_history_user_id ON chatpaat_app_usersearchhistory(user_id);
```

**Indexes on Unique Columns**:
```sql
CREATE UNIQUE INDEX idx_user_username ON chatpaat_app_customuser(username);
CREATE UNIQUE INDEX idx_user_email ON chatpaat_app_customuser(email);
```

**Indexes on Timestamps** (for range queries):
```sql
CREATE INDEX idx_chat_created_at ON chatpaat_app_chat(created_at);
CREATE INDEX idx_message_created_at ON chatpaat_app_chatmessage(created_at);
```

### **Query Optimization**

1. **Use Indexes Effectively**
   - Queries on `user_id` use index for fast lookup
   - `created_at` range queries use timestamp index
   - Email lookups are fast due to unique index

2. **Connection Pooling** (SQLAlchemy)
   - Default pool size: 5
   - Reuses connections for efficiency
   - Auto-recycling after 1 hour

3. **Lazy Loading vs Eager Loading**
   ```python
   # Lazy loading (default)
   user = db.query(CustomUser).filter_by(id=1).first()
   chats = user.chats  # Separate query
   
   # Eager loading (better for performance)
   from sqlalchemy.orm import joinedload
   user = db.query(CustomUser).options(joinedload('chats')).filter_by(id=1).first()
   chats = user.chats  # No separate query
   ```

---

## 🔄 Data Lifecycle

### **User Registration**
1. User submits registration form
2. Backend creates CustomUser record with hashed password
3. User can now create chats and messages

### **Chat & Message Creation**
1. User sends first message
2. Backend creates Chat record (if new chat)
3. TMessage records created for user message
4. Groq API called for AI response
5. Assistant message stored in ChatMessage

### **Password Reset**
1. User clicks "Forgot Password"
2. PasswordResetToken created with expiration
3. Email sent with reset link containing token
4. User clicks link and submits new password
5. Token marked as used
6. CustomUser password updated

### **Account Deletion**
1. User requests account deletion
2. CASCADE delete removes:
   - All Chat records
   - All ChatMessage records
   - All UserSearchHistory records
   - All PasswordResetToken records
3. CustomUser record deleted
4. All user data permanently removed

---

## 📦 Backup & Recovery

### **SQLite Backup**
```bash
# SimpleBackup
cp fastapi_backend/db.sqlite3 fastapi_backend/db.backup.sqlite3

# Using SQLite tools
sqlite3 db.sqlite3 ".backup db.backup"
```

### **PostgreSQL Backup**
```bash
# Full database backup
pg_dump -U postgres -d chatpaat_db > backup.sql

# Restore from backup
psql -U postgres -d chatpaat_db < backup.sql
```

---

## 🔍 Monitoring & Maintenance

### **Database Health Checks**
```python
def check_db_health(db: Session) -> bool:
    """Simple health check"""
    try:
        result = db.execute("SELECT 1")
        return result is not None
    except Exception:
        return False
```

### **Cleanup Tasks** (Implement as Scheduled Job)
```python
def cleanup_expired_tokens(db: Session):
    """Remove expired password reset tokens"""
    from datetime import datetime
    now = datetime.utcnow()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.expires_at < now,
        PasswordResetToken.used == False
    ).delete()
    db.commit()
```

---

## 🚀 Scaling Considerations

### **SQLite Limitations**
- Works well for < 10 concurrent connections
- File-based, no true concurrency
- Limited to single server

### **PostgreSQL for Production**
- Supports thousands of concurrent connections
- ACID compliance with transactions
- Advanced indexing and query optimization
- Can be sharded for massive scale
- Supports replication for HA

### **Migration from SQLite to PostgreSQL**
```python
# 1. Create PostgreSQL database
# 2. Update DATABASE_URL environment variable
# 3. Run init_db() to create tables
# 4. Migrate data with script

import sqlite3
import psycopg2

def migrate_sqlite_to_postgres():
    """Copy data from SQLite to PostgreSQL"""
    # Connect to both databases
    # Read all tables from SQLite
    # Insert into PostgreSQL
    pass
```

---

## 📚 Related Documentation

- **Backend**: See `02_Backend_Documentation.md` for ORM implementation
- **API**: See `07_API_Documentation.md` for endpoint data formats
- **Deployment**: See `09_Deployment_and_Environment.md` for database setup

---

**Database Documentation Last Updated**: Q1 2026  
**Current Database**: SQLite 3  
**Production Recommended**: PostgreSQL 12+
