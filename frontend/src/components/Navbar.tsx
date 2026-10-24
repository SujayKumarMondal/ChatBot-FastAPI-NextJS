import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sun,
  Moon,
  Settings,
  History,
  Info,
  Layers3,
  Github,
  Linkedin,
  Globe,
  Briefcase,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "./ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { themePresets, useTheme } from "@/context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { currentTheme, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const developerRef = useRef<HTMLDivElement | null>(null);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showDeveloperMenu, setShowDeveloperMenu] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarSrc = user?.image ?? "";
  const isDark = themePresets[currentTheme].mode === "dark";

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.image]);

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
    window.location.href = window.location.origin || "http://localhost:5173";
  };

  return (
    <>
      <header className="app-header sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/75">
        
        <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 sm:px-5 md:px-7">

          {/* ========================================================= */}
          {/* LEFT SECTION - SIDEBAR + LOGO                            */}
          {/* ========================================================= */}
          <div className="flex items-center gap-4 min-w-0 shrink-0">

            {user && <SidebarTrigger />}

            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">

                <img
                  src="/brand_logo.png"
                  alt="ChatPaat Logo"
                  className="h-8 w-8 shrink-0 transition-transform duration-200 hover:scale-105 sm:h-9 sm:w-9"
                />

                <div className="hidden min-w-0 flex-col min-[380px]:flex">
                  <span className="text-base font-semibold tracking-tight text-foreground">
                    ChatPaat
                  </span>

                  <span className="whitespace-nowrap text-[10px] font-medium tracking-wide text-muted-foreground">
                    YOUR AI WORKSPACE
                  </span>
                </div>

              </div>
            </div>
          </div>


          {/* ========================================================= */}
          {/* CENTER SECTION - DISCLAIMER                              */}
          {/* ========================================================= */}
          <div className="flex min-w-0 justify-center px-2">

            <span className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground lg:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Private conversations · AI can make mistakes
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

                {/* OUR SERVICES */}
                <div className="relative group">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-xs md:text-sm"
                    title="Our Service"
                    onClick={() => navigate("/services")}
                  >
                    <Layers3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Our Service</span>
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
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4 sm:hidden" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>


                  {/* AVATAR */}
                  <Avatar
                    className="h-8 w-8 ring-2 ring-primary/50 hover:ring-primary/100 hover:ring-offset-2 transition-all cursor-pointer"
                    onClick={() => navigate("/profile")}
                    role="button"
                    tabIndex={0}
                    aria-label="Open profile"
                  >
                    {avatarSrc && !avatarFailed ? (
                      <img
                        src={avatarSrc}
                        alt={user.username}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={() => setAvatarFailed(true)}
                      />
                    ) : null}

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