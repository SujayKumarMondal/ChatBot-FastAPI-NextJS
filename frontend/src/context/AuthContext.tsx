import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getApiBaseUrl } from "../lib/config";

const API_BASE_URL = getApiBaseUrl();

interface User {
  id: number;
  username: string;
  email: string;
  image?: string;
  first_name?: string;
  last_name?: string;
  oauth_provider?: "google";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean; // Track if auth is being restored from localStorage
  signInWithTokens: (access: string, refresh: string, user: User) => void;
  signOut: () => void;
  logout: () => void; // Alias for signOut, used in ProfilePage
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
    sessionStorage.setItem("access_token", access);
    sessionStorage.setItem("refresh_token", refresh);

    const profileWithStoredImage = {
      ...userProfile,
      image: userProfile.image || "",
      oauth_provider: userProfile.oauth_provider || "google",
    };

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

      const response = await fetch(`${API_BASE_URL}/api/store_search/`, {
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
    <AuthContext.Provider value={{ user, token, isLoading, signInWithTokens, signOut, logout, storeUserSearch, updateUser, refreshTrigger }}>
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
