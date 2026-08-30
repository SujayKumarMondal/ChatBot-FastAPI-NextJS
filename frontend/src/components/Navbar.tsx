import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Settings,
  History,
  Info,
  Github,
  Linkedin,
  Globe,
  Briefcase,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { currentTheme, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const developerRef = useRef<HTMLDivElement | null>(null);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeveloperMenu, setShowDeveloperMenu] = useState(false);

  const isDark = currentTheme === "dark" || currentTheme !== "light";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (developerRef.current && !developerRef.current.contains(event.target as Node)) {
        setShowDeveloperMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOutConfirm = () => {
    setShowSignOutDialog(false);
    signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-gradient-to-r from-background via-background to-primary/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 shadow-lg shadow-primary/10">
        
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 md:px-6">

          {/* ========================================================= */}
          {/* LEFT SECTION - SIDEBAR + LOGO                            */}
          {/* ========================================================= */}
          <div className="flex items-center gap-4 min-w-0 shrink-0">

            {user && <SidebarTrigger />}

            <div className="hidden sm:flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">

                <img
                  src="/brand_logo.png"
                  alt="ChatPaat Logo"
                  className="h-10 w-10 hover:scale-110 transition-transform"
                />

                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                    ChatPaat
                  </span>

                  <span className="text-[10px] font-medium text-accent/70">
                    AI Companion
                  </span>
                </div>

              </div>
            </div>
          </div>


          {/* ========================================================= */}
          {/* CENTER SECTION - DISCLAIMER                              */}
          {/* ========================================================= */}
          <div className="flex min-w-0 justify-center px-2">

            <span className="hidden lg:block text-center text-sm md:text-base font-bold text-muted-foreground truncate max-w-[44rem] border-l border-border/40 pl-1">
              Your AI Assistant. It can make mistakes, check wisely before you act.
            </span>

          </div>


          {/* ========================================================= */}
          {/* RIGHT SECTION - ACTIONS                                  */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">

            {!user ? (
              <>
                {/* ABOUT */}
                <div className="relative group">

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-xs md:text-sm"
                    title="About"
                    onClick={() => navigate("/about")}
                  >
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      About
                    </span>
                  </Button>

                </div>


                {/* DEVELOPER */}
                <div className="relative" ref={developerRef}>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-xs md:text-sm"
                    title="Developer"
                    onClick={() => setShowDeveloperMenu((v) => !v)}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">Developer</span>
                  </Button>

                  <div className={`absolute right-0 top-full mt-2 ${showDeveloperMenu ? "flex" : "hidden"} flex-col min-w-[180px] rounded-xl border border-border bg-background/95 p-2 shadow-2xl backdrop-blur-md z-50`}>
                    <a
                      href="https://skm10-portfolio.netlify.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition-all"
                      title="Portfolio website"
                      onClick={() => setShowDeveloperMenu(false)}
                    >
                      <Globe className="h-4 w-4 text-primary" />
                      <span>Portfolio</span>
                    </a>

                    <a
                      href="https://www.linkedin.com/in/sujay-kumar-mondal-a125481b7/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition-all"
                      title="LinkedIn profile"
                      onClick={() => setShowDeveloperMenu(false)}
                    >
                      <Linkedin className="h-4 w-4 text-primary" />
                      <span>LinkedIn</span>
                    </a>

                    <a
                      href="https://github.com/SujayKumarMondal"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-primary/10 transition-all"
                      title="GitHub profile"
                      onClick={() => setShowDeveloperMenu(false)}
                    >
                      <Github className="h-4 w-4 text-primary" />
                      <span>GitHub</span>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* HISTORY */}
                <div className="relative group">

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate("/history")}
                      className="hover:bg-primary/10 hover:text-primary transition-all rounded-full"
                      title="Click to check history"
                      aria-label="View chat history"
                    >
                      <History className="h-5 w-5" />
                    </Button>
                  </motion.div>

                </div>
              </>
            )}


            {/* ======================================================= */}
            {/* THEME TOGGLE                                             */}
            {/* ======================================================= */}
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


            {/* ======================================================= */}
            {/* SETTINGS                                                 */}
            {/* ======================================================= */}
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


            {/* ======================================================= */}
            {/* USER SECTION                                             */}
            {/* ======================================================= */}
            {user && (
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-border/40">

                {/* USER NAME */}
                <span className="hidden sm:block text-sm font-semibold text-foreground/80 truncate max-w-[100px]">
                  {user.first_name
                    ? user.first_name.split(" ")[0]
                    : user.username}
                </span>


                <div className="flex items-center gap-2">

                  {/* SIGN OUT */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive/20 hover:text-destructive transition-all text-xs rounded-full"
                    onClick={() => setShowSignOutDialog(true)}
                  >
                    Sign Out
                  </Button>


                  {/* AVATAR */}
                  <Avatar
                    className="h-8 w-8 ring-2 ring-primary/50 hover:ring-primary/100 hover:ring-offset-2 transition-all cursor-pointer"
                    onClick={() => navigate("/profile")}
                    role="button"
                    tabIndex={0}
                    aria-label="Open profile"
                  >
                    <AvatarImage
                      src={user.image}
                      alt={user.username}
                    />

                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                      {user.first_name
                        ? user.first_name[0]?.toUpperCase()
                        : user.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                </div>

              </div>
            )}

          </div>
        </div>
      </header>


      {/* ============================================================= */}
      {/* SIGN OUT DIALOG                                               */}
      {/* ============================================================= */}
      {showSignOutDialog && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[999]"
          onClick={() => setShowSignOutDialog(false)}
        >

          <motion.div
            className="bg-background border border-border rounded-lg shadow-xl p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >

            <h2 className="text-lg font-semibold mb-2">
              Sign Out?
            </h2>

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

          </motion.div>
        </div>
      )}
    </>
  );
}