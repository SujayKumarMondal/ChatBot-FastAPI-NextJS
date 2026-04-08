# ChatPaat: Frontend Documentation

## 🎨 Overview

The ChatPaat frontend is a modern, responsive single-page application (SPA) built with **React 18**, **TypeScript**, and **Vite**. It provides a beautiful, intuitive interface for users to interact with the AI chatbot while managing their profiles and conversation history.

**Technology Stack**:
- **Framework**: React 18.3
- **Language**: TypeScript 5.5
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 4 + Custom CSS
- **Animations**: Framer Motion 12
- **HTTP Client**: Axios 1.12
- **State Management**: React Query 5 + Context API
- **Routing**: React Router 7
- **Port**: 5173 (Development)

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── pages/                      # Page components
│   │   ├── HomePage.tsx           # Main chat interface
│   │   ├── SignIn.tsx             # Login page
│   │   ├── RegisterPage.tsx        # Registration page
│   │   ├── ProfilePage.tsx         # Profile management
│   │   ├── SettingsPage.tsx        # Account settings
│   │   ├── ForgotPassword.tsx      # Password reset initiation
│   │   ├── ResetPassword.tsx       # Password reset confirmation
│   │   ├── OAuthCallback.tsx       # Google OAuth handler
│   │   ├── AboutPage.tsx           # About page
│   │   ├── TermsPage.tsx           # Terms of service
│   │   ├── PrivacyPolicyPage.tsx  # Privacy policy
│   │   └── ...
│   ├── components/                 # Reusable components
│   │   ├── MainLayout.tsx          # Main app layout wrapper
│   │   ├── AppSidebar.tsx          # Chat history sidebar
│   │   ├── Navbar.tsx              # Top navigation bar
│   │   ├── Message.tsx             # Chat message component
│   │   ├── TypingLoader.tsx        # Loading animation
│   │   ├── LoginPrompt.tsx         # Prompt for unauthenticated users
│   │   ├── PageTransition.tsx      # Page animation wrapper
│   │   ├── Dashboard.tsx            # Dashboard component
│   │   └── ui/                     # UI component library
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── card.tsx
│   │       ├── avatar.tsx
│   │       └── ... (other UI components)
│   ├── context/                    # React Context providers
│   │   ├── AuthContext.tsx         # Authentication state
│   │   ├── ThemeContext.tsx        # Dark/light mode
│   │   └── ToastContext.tsx        # Toast notifications
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-mobile.ts           # Mobile detection hook
│   │   └── ... (other custom hooks)
│   ├── lib/                        # Utility functions
│   │   ├── api.ts                  # API client functions
│   │   ├── utils.ts                # General utilities
│   │   ├── animations.ts           # Animation variants
│   │   ├── responsive.tsx          # Responsive utilities
│   │   ├── a11y.tsx                # Accessibility utilities
│   │   ├── advancedChat.tsx        # Chat-specific utilities
│   │   └── imageStorage.ts         # Image handling (localStorage)
│   ├── styles/                     # Global styles
│   │   └── ... (CSS files)
│   ├── i18n/                       # Internationalization
│   │   └── locales/
│   ├── assets/                     # Static assets (images, fonts)
│   ├── App.tsx                     # Main app component
│   ├── main.tsx                    # Entry point
│   └── vite-env.d.ts              # Vite env types
├── public/                         # Static files
│   └── manifest.json
├── index.html                      # HTML entry point
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite config
├── eslint.config.js               # ESLint config
└── components.json                 # Component config
```

---

## 🔌 Core Modules

### 1. **Context API - State Management**

#### **AuthContext.tsx** - Authentication State
Manages user authentication, tokens, and user data.

```typescript
interface AuthContextType {
  user: User | null;                          // Current user
  token: string | null;                       // JWT access token
  isLoading: boolean;                         // Auth restoration status
  signIn: (email: string, password: string) => Promise<void>;
  signInWithTokens: (access: string, refresh: string, user: User) => void;
  signOut: () => void;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  storeUserSearch: (searchQuery: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshTrigger: number;                    // Trigger for external refetch
}

interface User {
  username: string;
  email: string;
  image?: string;
  first_name?: string;
  last_name?: string;
}
```

**Key Features**:
- Session restoration from sessionStorage on page load
- JWT token persistence
- Google OAuth integration
- User data updates
- Sign in/out functions

**Usage**:
```typescript
const { user, token, signIn, signOut } = useAuth();

if (!user) {
  return <LoginPrompt />;
}
```

---

#### **ThemeContext.tsx** - Theme Management
Manages dark/light mode preference.

```typescript
interface Theme {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  isDark: () => boolean;
}
```

**Features**:
- Persistent theme preference (localStorage)
- CSS class-based theming
- System theme detection (optional)

---

#### **ToastContext.tsx** - Notifications
Global toast notification system.

```typescript
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

function showToast(message: string, type: string, duration?: number) {
  // Display temporary notification to user
}
```

---

### 2. **API Client - axios + Services**

**lib/api.ts** - HTTP requests to FastAPI backend

```typescript
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:7004";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Authentication
export async function signUp(username: string, email: string, password: string) {
  return api.post("/api/register/", { username, email, password });
}

export async function signIn(email: string, password: string) {
  return api.post("/api/login/", { email, password });
}

// Chat Operations
export async function promptGPT(data: { chat_id: string; content: string }, token: string) {
  return api.post("/prompt_gpt/", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getChatMessages(chatId: string, token: string) {
  return api.get(`/get_chat_messages/${chatId}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getTodaysChats(token: string) {
  return api.get("/todays_chat/", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Profile Management
export async function getUserProfile(token: string) {
  return api.get("/api/profile/", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateUserProfile(data: object, token: string) {
  return api.put("/api/profile/", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteAccount(token: string) {
  return api.delete("/api/profile/", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

---

### 3. **Key Components**

#### **App.tsx** - Root Component
```typescript
export const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Auth routes */}
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/oauth-callback" element={<OAuthCallback />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* App layout */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="chats/:chat_uid" element={<HomePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
```

---

#### **MainLayout.tsx** - Layout Wrapper
Provides the main application layout with sidebar and navigation.

```typescript
export const MainLayout = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <LoginPrompt />;
  }
  
  return (
    <div className="flex h-screen">
      <AppSidebar />          {/* Chat history sidebar */}
      <div className="flex-1 flex flex-col">
        <Navbar />             {/* Top navigation */}
        <main className="flex-1 overflow-auto">
          <Outlet />           {/* Route content */}
        </main>
      </div>
    </div>
  );
};
```

---

#### **HomePage.tsx** - Main Chat Interface
The primary chat interface where users interact with the AI.

**Key Features**:
- Message input with send button
- Chat display with message history
- Real-time placeholder/typing indicator
- Markdown rendering for responses
- Code syntax highlighting
- Copy-to-clipboard for code blocks
- Responsive design for mobile/tablet/desktop

**Component States**:
```typescript
const [messages, setMessages] = useState([
  { role: "assistant", content: "Welcome! I'm here to assist you." }
]);
const [input, setInput] = useState("");
const [chatID, setChatID] = useState("");
const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
```

**Message Sending**:
```typescript
const mutation = useMutation({
  mutationFn: ({ chat_id, content }: { chat_id: string; content: string }) =>
    promptGPT({ chat_id, content }, getToken()),
  onSuccess: (res) => {
    if (res?.reply) {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
      queryClient.invalidateQueries({ queryKey: ["chatMessages", chatID] });
    }
  },
  onError: (error: any) => {
    // Show error toast
  },
});
```

---

#### **AppSidebar.tsx** - Chat History
Displays organized chat history with filtering options.

**Features**:
- Today's chats
- Yesterday's chats
- Last 7 days chats
- Delete chat functionality
- Chat selection/navigation
- New chat creation

**Implementation**:
```typescript
export const AppSidebar = () => {
  const { user, token } = useAuth();
  
  const { data: todaysChats } = useQuery({
    queryKey: ["todaysChats", token],
    queryFn: () => getTodaysChats(token),
    enabled: !!token,
  });
  
  return (
    <div className="sidebar">
      <button onClick={createNewChat}>New Chat</button>
      <div>
        <h3>Today</h3>
        {todaysChats?.map(chat => (
          <ChatItem key={chat.id} chat={chat} />
        ))}
      </div>
    </div>
  );
};
```

---

#### **Navbar.tsx** - Top Navigation
Top bar with user menu and navigation.

**Components**:
- Logo / Home link
- User avatar
- Theme toggle
- Settings/Profile links
- Logout button

---

#### **Message.tsx** - Chat Message Rendering
Individual message component with styling based on sender.

```typescript
interface MessageProps {
  role: "user" | "assistant";
  content: string;
  index: number;
}

export const Message = ({ role, content, index }: MessageProps) => {
  const isUser = role === "user";
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={isUser ? "user-message" : "assistant-message"}
    >
      {isUser ? (
        <p>{content}</p>
      ) : (
        <ReactMarkdown
          components={{
            code: (props) => <SyntaxHighlighter {...props} style={vs2015} />,
            // ... other markdown components
          }}
        >
          {content}
        </ReactMarkdown>
      )}
    </motion.div>
  );
};
```

**Features**:
- Framer Motion slide-in animation
- Markdown rendering (assistant messages)
- Code syntax highlighting
- Copy button for code blocks
- Different styling for user vs assistant

---

#### **TypingLoader.tsx** - Loading Indicator
Animated loading indicator shown while waiting for AI response.

```typescript
export const TypingLoader = () => {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
          className="w-2 h-2 bg-blue-500 rounded-full"
        />
      ))}
    </div>
  );
};
```

---

### 4. **UI Component Library**

Located in `components/ui/`, these are reusable UI components built with Radix UI primitives and Tailwind CSS.

```
ui/
├── button.tsx           # Button component
├── input.tsx            # Text input
├── textarea.tsx         # Multi-line input
├── card.tsx             # Card container
├── avatar.tsx          # User avatar
├── dropdown.tsx        # Dropdown menu
├── dialog.tsx          # Modal dialog
├── sheet.tsx           # Sidebar sheet
├── separator.tsx       # Visual divider
├── badge.tsx           # Badge/tag
├── skeleton.tsx        # Loading skeleton
├── tooltip.tsx         # Tooltip overlay
└── use-toast.tsx       # Toast hook
```

**All components**:
- Accept `className` prop for customization
- Use `cn()` utility function for class merging
- Are exported with proper TypeScript types
- Use Tailwind CSS for styling
- Support dark mode

**Example Button**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  children,
  ...props 
}: ButtonProps) => {
  return (
    <button
      className={cn(
        'rounded-lg font-medium transition-colors',
        variant === 'primary' && 'bg-blue-500 text-white hover:bg-blue-600',
        variant === 'secondary' && 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        size === 'sm' && 'px-3 py-1 text-sm',
        size === 'md' && 'px-4 py-2',
        size === 'lg' && 'px-6 py-3 text-lg',
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
};
```

---

### 5. **Page Components**

#### **SignIn.tsx** - Login
- Email and password input
- Form validation
- OAuth button (Google)
- Link to registration and forgot password
- Error handling and display

---

#### **RegisterPage.tsx** - User Registration
- Username, email, password inputs
- Password confirmation
- Form validation
- Submit and auto-login
- Link to signin

---

#### **ProfilePage.tsx** - User Profile
- Display user information
- Upload profile picture
- Edit first/last name
- Edit email
- Display account creation date
- Account settings link

---

#### **SettingsPage.tsx** - Account Settings
- Change password form
- Delete account button with confirmation
- Display user email
- Account information

---

#### **ForgotPassword.tsx** - Password Reset Initiation
- Email input
- Submit button
- Success/error messages
- Link to signin

---

#### **ResetPassword.tsx** - Password Confirmation
- Extract token from URL query
- New password input and confirmation
- Submit handler
- Success redirect to signin

---

#### **OAuthCallback.tsx** - Google OAuth Handler
```typescript
export const OAuthCallback = () => {
  const navigate = useNavigate();
  const { signInWithTokens } = useAuth();
  
  useEffect(() => {
    // Extract authorization code from URL
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    
    if (code) {
      // Exchange code for JWT tokens
      fetch('http://127.0.0.1:7004/api/auth/google/exchange/', {
        method: 'POST',
        body: JSON.stringify({ code, redirect_uri: window.location.origin + '/oauth-callback' }),
      })
      .then(res => res.json())
      .then(data => {
        signInWithTokens(data.access, data.refresh, data.user);
        navigate('/');
      });
    }
  }, []);
  
  return <TypingLoader />;
};
```

---

## 🎨 Styling Architecture

### **Tailwind CSS Configuration**
- Utility-first CSS framework
- Customized color palette
- Dark mode support
- Responsive breakpoints

**Breakpoints**:
```css
sm: 640px    /* Mobile */
md: 768px    /* Tablet */
lg: 1024px   /* Desktop */
xl: 1280px   /* Large desktop */
```

### **Custom CSS**
Additional custom styles in `styles/` directory for:
- Chat message styling
- Scrollbar customization
- Animation keyframes
- Dark mode overrides

---

## ✨ Animation Library

**Framer Motion Integration** for smooth, professional animations:

```typescript
// lib/animations.ts
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.3 },
};

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};
```

**Usage**:
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

---

## 🔍 Hooks & Custom Utils

### **useAuth Hook**
```typescript
const { user, token, signIn, signOut } = useAuth();
```

### **useQuery Hook** (React Query)
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["chats"],
  queryFn: () => getTodaysChats(token),
  enabled: !!token,
});
```

### **useMutation Hook** (React Query)
```typescript
const mutation = useMutation({
  mutationFn: (data) => promptGPT(data, token),
  onSuccess: (data) => {
    // Update local state
  },
  onError: (error) => {
    // Show error
  },
});
```

---

## 📱 Responsive Design

### Mobile-First Approach
- Default styles are mobile
- Media queries add desktop enhancements
- Tailwind `md:`, `lg:`, `xl:` prefixes

**Responsive Examples**:
```html
<!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>

<!-- Hide on mobile, show on desktop -->
<div className="hidden lg:block">Desktop Content</div>

<!-- Mobile menu, desktop nav -->
<nav className="hidden md:flex gap-4">Desktop Nav</nav>
<button className="md:hidden">Mobile Menu</button>
```

---

## 🚀 Build & Development

### **Development Server**
```bash
cd frontend
npm install
npm run dev
# Server runs on http://localhost:5173
```

### **Production Build**
```bash
npm run build
# Output: dist/ folder
npm run preview  # Preview production build
```

### **Code Quality**
```bash
npm run lint  # Run ESLint
```

---

## 📦 Dependencies Overview

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3 | UI framework |
| react-router-dom | 7.6 | Client-side routing |
| @tanstack/react-query | 5.81 | Server state management |
| axios | 1.12 | HTTP client |
| framer-motion | 12.23 | Animations |
| tailwindcss | 4.1 | Styling |
| typescript | 5.5 | Type safety |
| vite | 5.4 | Build tool |

---

## 🔒 Security Considerations

- ✅ JWT tokens stored securely in sessionStorage (not localStorage for sensitive data)
- ✅ Token validation before API calls
- ✅ User isolation (can only access own data)
- ✅ OAuth flow follows best practices
- ✅ Form validation before submission
- ✅ HTTPS recommended for production

---

## 📚 Next Steps

- **Complete API Reference**: See `07_API_Documentation.md`
- **Workflow & Flows**: See `05_Workflow_and_Flowcharts.md`
- **Deployment**: See `09_Deployment_and_Environment.md`

---

**Frontend Documentation Last Updated**: Q1 2026  
**Framework Version**: React 18.3  
**Build Tool**: Vite 5.4
