# ChatPaat: Workflow & Flowcharts

## 🔄 Overview

This document provides detailed flowcharts and process diagrams for all major user workflows and system operations in ChatPaat.

---

## 📱 User Workflows

### 1. **User Registration & Sign-In Flow**

```mermaid
flowchart TD
    A[User Opens App] --> B{Authenticated?}
    B -->|No| C[Show Sign-In Page]
    C --> D{User Action?}
    D -->|Register| E[Click Register Link]
    E --> F[Fill Registration Form]
    F --> G[Submit: username, email, password]
    G --> H{Backend Validation}
    H -->|Username Exists| I[Show Error]
    I --> F
    H -->|Email Exists| J[Show Error]
    J --> F
    H -->|Valid| K[Hash Password with Argon2]
    K --> L[Create CustomUser Record]
    L --> M[Generate Access & Refresh Tokens]
    M --> N[Return Tokens to Frontend]
    N --> O[Store in SessionStorage]
    O --> P[Redirect to Home]
    P --> Q[Show Chat Interface]
    
    D -->|Sign In with Email| R[Enter Email & Password]
    R --> S[Submit Credentials]
    S --> T{Verify Credentials}
    T -->|Invalid| U[Show Error]
    U --> R
    T -->|Valid| K
    
    D -->|Sign In with Google| V[Click Google Button]
    V --> W[Google OAuth Dialog]
    W --> X[User Grants Permission]
    X --> Y[Google Returns Auth Code]
    Y --> Z[Send Code to Backend]
    Z --> AA[Exchange for Google Token]
    AA --> AB[Fetch User Info from Google]
    AB --> AC{User Exists?}
    AC -->|Yes| AD[Update User Info]
    AC -->|No| AE[Create New User]
    AD --> AF[Generate Local JWT Tokens]
    AE --> AF
    AF --> AG[Return Tokens to Frontend]
    AG --> O
    
    B -->|Yes| P
    Q --> AH[Main Chat Interface]
```

---

### 2. **Chat & Message Flow**

```mermaid
flowchart TD
    A[User Types Message] --> B[Click Send]
    B --> C[Add Message to Local State]
    C --> D[Show User Message in UI]
    D --> E[Disable Input, Show Typing Indicator]
    E --> F[POST /prompt_gpt/]
    
    F --> G[Backend: Verify JWT Token]
    G --> H{Token Valid?}
    H -->|No| I[Return 401 Unauthorized]
    I --> J[Frontend: Show Login Prompt]
    
    H -->|Yes| K[Get Current User from DB]
    K --> L{Chat Exists?}
    L -->|No| M[Create New Chat with UUID]
    L -->|Yes| N[Use Existing Chat]
    M --> O[Store User Message in DB]
    N --> O
    O --> P{First Message?}
    P -->|Yes| Q[Call Groq API to Generate Title]
    Q --> R[Update Chat Title in DB]
    P -->|No| S[Continue]
    R --> S
    
    S --> T[Build Message Context]
    T --> U[Call Groq API: llama-3.1-8b-instant]
    U --> V{API Success?}
    V -->|No| W[Return 500 Error]
    W --> X[Show Error in ChatUI]
    
    V -->|Yes| Y[Extract AI Response]
    Y --> Z[Store Assistant Message in DB]
    Z --> AA[Return Response to Frontend]
    AA --> AB[Remove Typing Indicator]
    AB --> AC[Add AI Message to Local State]
    AC --> AD[Render Markdown + Code Highlighting]
    AD --> AE[Enable Input, Focus Textarea]
    AE --> AF[Auto-scroll to Bottom]
    AF --> AG[User Can Copy Code Blocks]
```

---

### 3. **Chat History Organization Flow**

```mermaid
flowchart TD
    A[User Opens App] --> B[AppSidebar Component Loads]
    B --> C[Calculate Time Filters]
    C --> D[Today 00:00:00]
    C --> E[Yesterday Boundaries]
    C --> F[Last 7 Days]
    
    D --> G[GET /todays_chat/]
    E --> H[GET /yesterdays_chat/]
    F --> I[GET /seven_days_chat/]
    
    G --> J{Database Query}
    J --> K[WHERE user_id = ? AND created_at >= today]
    K --> L[ORDER BY created_at DESC]
    L --> M[Return Chat List]
    
    H --> N[WHERE user_id = ? AND created_at >= yesterday...]
    N --> O[Return Chat List]
    
    I --> P[WHERE user_id = ? AND created_at >= 7_days_ago...]
    P --> Q[Return Chat List]
    
    M --> R[Display Today's Chats]
    O --> S[Display Yesterday's Chats]
    Q --> T[Display Last 7 Days Chats]
    
    R --> U[User Clicks Chat]
    S --> U
    T --> U
    
    U --> V[Fetch Chat ID]
    V --> W[GET /get_chat_messages/{chat_id}/]
    W --> X[Query All Messages for Chat]
    X --> Y[Return Sorted Message List]
    Y --> Z[Update HomePage State]
    Z --> AA[Render Messages in Chat View]
```

---

### 4. **Profile Management Flow**

```mermaid
flowchart TD
    A[User Clicks Profile/Settings] --> B[Navigate to ProfilePage]
    B --> C[GET /api/profile/]
    C --> D[Fetch User Data from DB]
    D --> E[Return User Info]
    E --> F[Populate Form with Data]
    
    F --> G{User Action?}
    G -->|Edit First/Last Name| H[Edit Text Fields]
    H --> I[Click Save]
    I --> J[Validate Form]
    J --> K[PUT /api/profile/]
    K --> L[Update CustomUser Record]
    L --> M[Return Updated User]
    M --> N[Show Success Toast]
    N --> O[Update Local State]
    
    G -->|Change Email| P[Edit Email Field]
    P --> Q[Click Save]
    Q --> R[Check Email Uniqueness]
    R --> S{Email Taken?}
    S -->|Yes| T[Show Error]
    T --> P
    S -->|No| K
    
    G -->|Upload Profile Pic| U[Click Upload Button]
    U --> V[Select Image File]
    V --> W[Validate File Type & Size]
    W --> X{Valid?}
    X -->|No| Y[Show Error]
    X -->|Yes| Z[POST /api/profile/upload-image/]
    Z --> AA[Convert to Base64]
    AA --> AB[Store in Database]
    AB --> AC[Return Image URL]
    AC --> AD[Display Preview]
    
    G -->|Change Password| AE[Navigate to Settings]
    AE --> AF[Enter Old Password]
    AF --> AG[Enter New Password]
    AG --> AH[Click Change Password]
    AH --> AI[POST /api/profile/change-password/]
    AI --> AJ{Old Password Correct?}
    AJ -->|No| AK[Show Error]
    AK --> AF
    AJ -->|Yes| AL[Hash New Password]
    AL --> AM[Update CustomUser]
    AM --> AN[Show Success Message]
    AN --> AO[Session Restored]
    
    G -->|Delete Account| AP[Click Delete Account]
    AP --> AQ[Show Confirmation Dialog]
    AQ --> AR[User Confirms]
    AR --> AS[DELETE /api/profile/]
    AS --> AT[Cascade Delete All User Data]
    AT --> AU[Return Success]
    AU --> AV[Clear SessionStorage]
    AV --> AW[Redirect to Sign-In]
    AW --> AX[Show Account Deleted Message]
```

---

### 5. **Password Reset Flow**

```mermaid
flowchart TD
    A[User Clicks Forgot Password] --> B[Navigate to ForgotPasswordPage]
    B --> C[Enter Email Address]
    C --> D[Click Send Reset Link]
    D --> E[POST /api/auth/password-reset/]
    
    E --> F{User Exists?}
    F -->|No| G[Silent Failure - Show Generic Message]
    F -->|Yes| H[Generate Random Token]
    H --> I[Hash Token with Secret Key]
    I --> J[Create PasswordResetToken Record]
    J --> K[Set Expiration: 1 Hour]
    K --> L[Create Reset Link]
    L --> M[Build Reset URL]
    M --> N[Send Email via SendGrid]
    N --> O[Email Delivered]
    
    G --> P[Show Success Message]
    O --> P
    
    P --> Q[User Opens Email]
    Q --> R[Clicks Reset Link]
    R --> S[Navigate to /reset-password?token=...]
    
    S --> T[Extract Token from URL]
    T --> U[Display Reset Password Form]
    U --> V[User Enters New Password]
    V --> W[Click Reset Password]
    W --> X[POST /api/auth/password-reset/confirm/]
    
    X --> Y[Hash Token Again]
    Y --> Z{Token Valid?}
    Z -->|Invalid| AA[Show Error - Token Invalid]
    Z -->|Expired| AB[Show Error - Token Expired]
    Z -->|Used| AC[Show Error - Already Used]
    
    Z -->|Valid| AD[Find Associated User]
    AD --> AE[Hash New Password]
    AE --> AF[Update CustomUser Password]
    AF --> AG[Mark Token as Used]
    AG --> AH[Commit to Database]
    AH --> AI[Return Success]
    AI --> AJ[Show Success Message]
    AJ --> AK[Redirect to Sign-In]
    AK --> AL[User Can Now Login with New Password]
```

---

## 🔐 Authentication Flows

### **JWT Token Refresh** (Future Enhancement)

```mermaid
flowchart TD
    A[Access Token Near Expiry] --> B{Auto-Refresh Enabled?}
    B -->|No| C[Wait for Manual Action]
    B -->|Yes| D[Automatic Token Refresh]
    
    D --> E[Retrieve Refresh Token from SessionStorage]
    E --> F[POST /api/auth/refresh/]
    F --> G[Backend Validates Refresh Token]
    G --> H{Valid?}
    H -->|No| I[Logout User]
    I --> J[Redirect to Sign-In]
    H -->|Yes| K[Generate New Access Token]
    K --> L[Return New Token]
    L --> M[Update SessionStorage]
    M --> N[Continue Normal Operation]
```

---

### **API Request Authorization**

```mermaid
flowchart TD
    A[Frontend Makes API Request] --> B[Retrieve Access Token from SessionStorage]
    B --> C[Add Authorization Header]
    C --> D["Authorization: Bearer {token}"]
    D --> E[Send HTTP Request]
    
    E --> F[Backend Receives Request]
    F --> G[Extract Token from Header]
    G --> H{Token Present?}
    H -->|No| I[Return 401 Unauthorized]
    
    H -->|Yes| J[Verify Token Signature]
    J --> K{Signature Valid?}
    K -->|No| L[Return 401 - Invalid Token]
    
    K -->|Yes| M[Check Token Expiration]
    M --> N{Not Expired?}
    N -->|No| O[Return 401 - Token Expired]
    
    N -->|Yes| P[Extract User ID from Token]
    P --> Q[Query User from Database]
    Q --> R{User Exists?}
    R -->|No| S[Return 401 - User Not Found]
    
    R -->|Yes| T[Pass User to Route Handler]
    T --> U[Execute Business Logic]
    U --> V[Return Response]
```

---

## 💬 Message Processing Flow

### **Detailed Message & AI Response Generation**

```mermaid
flowchart TD
    A[User Submits Message] --> B[Add to React State]
    B --> C[POST /prompt_gpt/ with chat_id & content]
    
    C --> D[Backend Receives Request]
    D --> E[Verify JWT & Get User]
    E --> F[Create/Retrieve Chat from DB]
    F --> G[Save User Message to ChatMessage Table]
    
    G --> H[Query Previous Messages from DB]
    H --> I[Build Groq API Payload]
    I --> J["[system, ..., user msg n-1, assistant msg n-1, user msg n]"]
    
    J --> K[POST to Groq API]
    K --> L[Call: llama-3.1-8b-instant model]
    L --> M[Groq Processes Context Window]
    M --> N[Generate Response Tokens]
    
    N --> O[Return Response JSON]
    O --> P[Extract response text]
    P --> Q[Save AI Message to ChatMessage Table]
    Q --> R[Return Response to Frontend]
    
    R --> S[Frontend Receives Response]
    S --> T[Update Messages State]
    T --> U[Re-render Chat Interface]
    U --> V[Render Markdown Content]
    V --> W[Syntax Highlight Code Blocks]
    W --> X[Display to User]
```

---

## 🔄 Data Synchronization Flow

```mermaid
flowchart TD
    A[Chat History Updates on Backend] --> B[Frontend Polling or Real-time Sync]
    B --> C{Change Detected?}
    C -->|Yes| D[Invalidate React Query Cache]
    D --> E[Trigger Re-fetch from Backend]
    E --> F[GET /todays_chat/ etc]
    F --> G[Receive Updated Data]
    G --> H[Update Local State]
    H --> I[Re-render Sidebar]
    I --> J[Show Latest Changes]
    
    C -->|No| K[Continue Polling]
    K --> L[Wait X Seconds]
    L --> B
```

---

## 📊 System Operation Flows

### **Groq API Integration Flow**

```mermaid
flowchart TD
    A[ChatPaat Backend] -->|Send Request| B[Groq API]
    
    B --> C[Request Format]
    C --> D["model: llama-3.1-8b-instant"]
    C --> E["messages: [...]"]
    C --> F["max_tokens: 1024"]
    C --> G["temperature: 0.7"]
    
    B --> H[Process Through LLM]
    H --> I[Generate Response]
    I --> J[Return JSON]
    
    J --> K[Response Format]
    K --> L["choices[0].message.content"]
    K --> M["finish_reason"]
    K --> N["usage.total_tokens"]
    
    L --> O[ChatPaat Backend]
    O --> P[Extract Text]
    P --> Q[Save to Database]
    Q --> R[Return to Frontend]
    R --> S[Render to User]
```

---

### **Email Service Integration Flow**

```mermaid
flowchart TD
    A[Password Reset Requested] --> B[Backend Creates Token]
    B --> C[Build Email Body]
    C --> D["From: noreply@chatpaat.com"]
    C --> E["To: user@example.com"]
    C --> F["Subject: Password Reset Instructions"]
    C --> G["Body: Reset Link + Instructions"]
    
    G --> H[Call SendGrid API]
    H --> I["POST /mail/send"]
    I --> J[SendGrid Processes Email]
    J --> K[Queue for Delivery]
    K --> L[SMTP Transmission]
    L --> M[Email Delivered to User]
    
    M --> N[User Opens Email]
    N --> O[Clicks Reset Link]
    O --> P[Browser Opens Reset Page]
```

---

## 🎨 Frontend State Management Flow

```mermaid
flowchart TD
    A[User Interaction] --> B[Dispatch Action]
    
    B --> C{State Type?}
    C -->|Auth| D[AuthContext]
    C -->|Theme| E[ThemeContext]
    C -->|Toast| F[ToastContext]
    C -->|Server Data| G["React Query"]
    
    D --> H[Update User/Token State]
    E --> I[Toggle Theme Preference]
    F --> J[Queue Toast Notification]
    G --> K[Fetch/Cache Server Data]
    
    H --> L[Re-render Components]
    I --> L
    J --> L
    K --> L
    
    L --> M[Display Updated UI]
```

---

## 🚀 Error Handling Flow

```mermaid
flowchart TD
    A[Operation Starts] --> B{Success?}
    
    B -->|Yes| C[Proceed Normally]
    C --> D[Update State]
    D --> E[Show Success Toast]
    E --> F[Return to User]
    
    B -->|No| G[Error Occurs]
    G --> H[Catch Exception]
    H --> I{Error Type?}
    
    I -->|Network Error| J[Show Network Error Toast]
    I -->|Auth Error| K[Clear SessionStorage]
    K --> L[Redirect to Sign-In]
    I -->|Validation Error| M[Display Field Errors]
    I -->|Server Error| N[Show Generic Error Message]
    
    J --> O[User Can Retry]
    M --> O
    N --> O
    O --> P[End]
```

---

## ⏱️ Timing & Sequence Diagram

### **Complete Message Flow with Timing**

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Groq
    participant Database
    
    User ->> Frontend: Types message & clicks send
    Frontend ->> Backend: POST /prompt_gpt/ + JWT
    
    Note over Backend: 1. Verify JWT<br/>2. Get user from DB<br/>3. Check/create chat<br/>4. Save user message
    
    Backend ->> Database: INSERT ChatMessage (user message)
    Database ->> Backend: Confirmation
    
    Note over Backend: 5. Build context<br/>6. Call Groq API
    
    Backend ->> Groq: POST chat/completions
    
    Note over Groq: Process<br/>Generate tokens<br/>Return response
    
    Groq ->> Backend: Response JSON
    
    Note over Backend: 7. Extract text<br/>8. Save AI response
    
    Backend ->> Database: INSERT ChatMessage (ai response)
    Database ->> Backend: Confirmation
    
    Backend ->> Frontend: Response JSON
    
    Note over Frontend: 9. Update state<br/>10. Render markdown<br/>11. Auto-scroll
    
    Frontend ->> User: Display AI response
```

---

## 📚 Related Documentation

- **API Details**: See `07_API_Documentation.md`
- **Backend Logic**: See `02_Backend_Documentation.md`
- **Frontend Logic**: See `03_Frontend_Documentation.md`

---

**Workflow Documentation Last Updated**: Q1 2026  
**Diagram Tool**: Mermaid JS
