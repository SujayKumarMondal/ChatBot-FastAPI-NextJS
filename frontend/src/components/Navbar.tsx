import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Settings, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { currentTheme, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [unreadNotifications] = useState(0);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const isDark = currentTheme === "dark" || currentTheme !== "light";

  const handleSignOutConfirm = () => {
    setShowSignOutDialog(false);
    signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-gradient-to-r from-background via-background to-primary/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-lg shadow-primary/10">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Left: Sidebar + Brand */}
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img 
                src="/brand_logo.png" 
                alt="ChatPaat Logo" 
                className="h-10 w-10 hover:scale-110 transition-transform" 
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  ChatPaat
                </span>
                <span className="text-[10px] font-medium text-accent/70">AI Companion</span>
              </div>
            </div>
          </div>
          <span className="text-xs md:text-sm font-medium text-muted-foreground hidden md:block border-l border-border/40 pl-4">
            Your AI Assistant. It can make mistakes, check wisely before you act.
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notification Bell */}
          {user && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 hover:text-primary transition-all relative rounded-full"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-br from-destructive to-accent text-white text-xs flex items-center justify-center animate-pulse font-semibold">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </div>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="hover:bg-primary/10 hover:text-primary transition-all rounded-full"
            title="Toggle theme"
            aria-label="Toggle dark/light mode"
          >
            {isDark ? (
              <Sun className="h-5 w-5 transition-transform rotate-0 hover:rotate-90" />
            ) : (
              <Moon className="h-5 w-5 transition-transform" />
            )}
          </Button>

          {/* Settings Button */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="hover:bg-primary/10 hover:text-primary transition-all rounded-full"
              title="Settings"
              aria-label="Open settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}

          {/* Auth Controls */}
          {!user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hover:border-primary hover:text-primary transition-all rounded-full border-border/40"
                onClick={() => navigate("/signin")}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all rounded-full text-white font-semibold"
                onClick={() => navigate("/register")}
              >
                Register
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border/40">
              <span className="hidden sm:block text-sm font-semibold text-foreground/80 truncate max-w-[100px]">
                {user.first_name ? user.first_name.split(' ')[0] : user.username}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-destructive/20 hover:text-destructive transition-all text-xs rounded-full"
                  onClick={() => setShowSignOutDialog(true)}
                >
                  Sign Out
                </Button>
                <Avatar 
                  className="h-8 w-8 ring-2 ring-primary/50 hover:ring-primary/100 hover:ring-offset-2 transition-all cursor-pointer"
                  onClick={() => navigate("/profile")}
                  role="button"
                  tabIndex={0}
                  aria-label="Open profile"
                >
                  <AvatarImage src={user.image} alt={user.username} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                    {user.first_name ? user.first_name[0]?.toUpperCase() : user.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999]"
          onClick={() => setShowSignOutDialog(false)}
        >
          <div 
            className="bg-background border border-border rounded-lg shadow-xl p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">Sign Out?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to sign out? You'll need to sign in again to access your account.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignOutDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOutConfirm}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
