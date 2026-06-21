import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getProfileImageByEmail } from "@/lib/imageStorage";

// ✅ FIXED: Use environment variable for API URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

interface User {
  id: number;
  username: string;
  email: string;
  image?: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean; // Track if auth is being restored from localStorage
  signIn: (email: string, password: string) => Promise<void>;
  signInWithTokens: (access: string, refresh: string, user: User) => void;
  signOut: () => void;
  logout: () => void; // Alias for signOut, used in ProfilePage
  register: (username: string, email: string, password: string) => Promise<void>;
  storeUserSearch: (searchQuery: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshTrigger: number; // Trigger for external components to refetch on auth change
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Restore user on refresh
  useEffect(() => {
    const savedUser = sessionStorage.getItem("user");
    const savedToken = sessionStorage.getItem("access_token");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      console.log("🔄 Restoring user from sessionStorage:", parsedUser);
      setUser(parsedUser);
    }
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false); // Auth restoration complete
  }, []);

  // 🔹 Sign In (JWT login with FastAPI backend)
  const signIn = async (email: string, password: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Invalid email or password");
    }

    const data = await response.json();
    console.log("🔐 Login response received:", data);
    
    sessionStorage.setItem("access_token", data.access);
    sessionStorage.setItem("refresh_token", data.refresh);
    setToken(data.access);

    // Try to get stored image from localStorage, fallback to dicebear
    const storedImage = getProfileImageByEmail(email);
    const userProfile: User = {
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
      image: storedImage || `https://api.dicebear.com/7.x/initials/svg?seed=${data.user.email}`,
    };

    console.log("👤 Setting user profile:", userProfile);
    setUser(userProfile);
    sessionStorage.setItem("user", JSON.stringify(userProfile));
    setRefreshTrigger(prev => prev + 1); // Trigger refetch in sidebar
  } catch (err: any) {
    throw new Error(err.message || "Login failed");
  }
};


  // 🔹 Register (calls FastAPI backend)
  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Registration failed");
      }

      const data = await response.json();

      // Save tokens from register response
      sessionStorage.setItem("access_token", data.access);
      sessionStorage.setItem("refresh_token", data.refresh);
      setToken(data.access);

      // Save user profile from register response
      const userProfile: User = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        image: `https://api.dicebear.com/7.x/initials/svg?seed=${data.user.email}`,
      };

      setUser(userProfile);
      sessionStorage.setItem("user", JSON.stringify(userProfile));
      setRefreshTrigger(prev => prev + 1); // Trigger refetch in sidebar
    } catch (err: any) {
      throw new Error(err.message || "Registration failed");
    }
  };

  // 🔹 Sign Out
  const signOut = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    setRefreshTrigger(prev => prev + 1);
  };

  // 🔹 Logout (alias for signOut, used in ProfilePage)
  const logout = () => {
    signOut();
  };

  // 🔹 Sign In With Tokens (used by OAuth callback)
  const signInWithTokens = (access: string, refresh: string, userProfile: User) => {
    // Store tokens immediately
    sessionStorage.setItem("access_token", access);
    sessionStorage.setItem("refresh_token", refresh);
    
    // Update state - store immediately in sessionStorage first to ensure persistence
    const storedImage = getProfileImageByEmail(userProfile.email);
    const profileWithStoredImage = {
      ...userProfile,
      image: storedImage || userProfile.image,
    };
    
    // Update all state synchronously
    setToken(access);
    setUser(profileWithStoredImage);
    sessionStorage.setItem("user", JSON.stringify(profileWithStoredImage));
    setRefreshTrigger(prev => prev + 1);
  };

  // 🔹 Store User Search
  const storeUserSearch = async (searchQuery: string) => {
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("User is not authenticated");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/store_search/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ search_query: searchQuery }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to store search query");
      }
    } catch (err: any) {
      console.error("Error storing search query:", err.message);
    }
  };

  // 🔹 Update User (used for profile image and other updates)
  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      setRefreshTrigger(prev => prev + 1);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signIn, signInWithTokens, signOut, logout, register, storeUserSearch, updateUser, refreshTrigger }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use Auth
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
