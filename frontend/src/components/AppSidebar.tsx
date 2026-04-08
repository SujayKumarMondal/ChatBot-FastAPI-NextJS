import {
  Bot,
  MessageSquare,
  Zap,
  MessageSquarePlus,
  Search,
  Star,
  Archive,
  Trash2,
  AlertTriangle,
  Github,
  Linkedin,
  Globe,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// import { Badge } from "@/components/ui/badge";
import { Link, NavLink } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getSevenDaysChats,
  getTodaysChats,
  getYesterdaysChats,
  deleteChat,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface IChat {
  id: string;
  title: string;
  created: string;
  isFavorite?: boolean;
  folder?: string;
  isArchived?: boolean;
}

export function AppSidebar() {
  const [recentChats, setRecentChats] = useState<IChat[]>([]);
  const [yesterdaysChats, setYesterdaysChat] = useState<IChat[]>([]);
  const [sevenDaysChats, setSevenDaysChat] = useState<IChat[]>([]);
  const { refreshTrigger, token } = useAuth();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const isMountedRef = useRef(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    chatId: string | null;
    chatTitle: string;
  }>({
    isOpen: false,
    chatId: null,
    chatTitle: "",
  });

  // ⏰ IST Clock
  const [time, setTime] = useState("");
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      };
      setTime(new Intl.DateTimeFormat("en-IN", options).format(now));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchChatsData = useCallback(async () => {
    // Try to get token from context first, then fallback to sessionStorage
    let tokenToUse = token || sessionStorage.getItem("access_token");
    
    // If still no token, wait a bit and try again (handles race condition)
    if (!tokenToUse) {
      console.log("No token available yet, waiting...");
      await new Promise(resolve => setTimeout(resolve, 100));
      tokenToUse = token || sessionStorage.getItem("access_token");
    }
    
    if (!tokenToUse) {
      console.log("No token available (context or sessionStorage), clearing chats");
      if (isMountedRef.current) {
        setRecentChats([]);
        setYesterdaysChat([]);
        setSevenDaysChat([]);
      }
      return;
    }
    
    try {
      console.log("Fetching chats with token:", tokenToUse.substring(0, 10) + "...");
      const [today, yesterday, seven] = await Promise.all([
        getTodaysChats(tokenToUse),
        getYesterdaysChats(tokenToUse),
        getSevenDaysChats(tokenToUse),
      ]);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setRecentChats(today || []);
        setYesterdaysChat(yesterday || []);
        setSevenDaysChat(seven || []);
        console.log("✅ Chats loaded successfully", { 
          todayCount: today?.length || 0,
          yesterdayCount: yesterday?.length || 0,
          sevenDaysCount: seven?.length || 0,
          totalChats: (today?.length || 0) + (yesterday?.length || 0) + (seven?.length || 0)
        });
      }
    } catch (error) {
      console.error("❌ Error fetching chats:", error);
      if (isMountedRef.current) {
        setRecentChats([]);
        setYesterdaysChat([]);
        setSevenDaysChat([]);
      }
    }
  }, [token]);

  // Fetch chats when token changes (e.g., after OAuth sign-in) or when refreshTrigger changes
  useEffect(() => {
    console.log("AppSidebar useEffect triggered - token:", !!token, "sessionStorageToken:", !!sessionStorage.getItem("access_token"), "refreshTrigger:", refreshTrigger);
    fetchChatsData();
  }, [token, refreshTrigger, fetchChatsData]);

  // Also refetch when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("Window focus detected, refetching chats");
      fetchChatsData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchChatsData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const toggleFavorite = (chatId: string) => {
    const updateChats = (chats: IChat[]) =>
      chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, isFavorite: !chat.isFavorite }
          : chat
      );

    setRecentChats(updateChats(recentChats));
    setYesterdaysChat(updateChats(yesterdaysChats));
    setSevenDaysChat(updateChats(sevenDaysChats));
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // Ensure token is available
      if (!token) {
        addToast({
          type: "error",
          message: "Authentication required. Please log in.",
          duration: 3000,
        });
        return;
      }
      // Call API to delete chat from database
      await deleteChat(chatId, token);

      // Remove from UI state across all arrays
      setRecentChats(recentChats.filter((c) => c.id !== chatId));
      setYesterdaysChat(yesterdaysChats.filter((c) => c.id !== chatId));
      setSevenDaysChat(sevenDaysChats.filter((c) => c.id !== chatId));

      // Show success toast
      addToast({
        type: "success",
        message: "Chat deleted successfully",
        duration: 2000,
      });

      // Close dialog
      setDeleteDialog({ isOpen: false, chatId: null, chatTitle: "" });
    } catch (error) {
      console.error("Error deleting chat:", error);
      addToast({
        type: "error",
        message: "Failed to delete chat. Please try again.",
        duration: 3000,
      });
    }
  };

  const filterChats = (chats: IChat[]) => {
    return chats.filter((chat) => {
      const matchesSearch = chat.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesArchived = showArchived ? chat.isArchived : !chat.isArchived;
      return matchesSearch && matchesArchived;
    });
  };

  const truncateTitle = (title: string, maxLength: number = 18) => {
    // Remove quotes if present
    let cleanTitle = title[0] === "'" || title[0] === '"' ? title.slice(1, -1) : title;
    
    // Truncate to max length and add ellipsis if needed
    if (cleanTitle.length > maxLength) {
      return cleanTitle.slice(0, maxLength) + "...";
    }
    return cleanTitle;
  };

  const allChats = [...recentChats, ...yesterdaysChats, ...sevenDaysChats];
  const favorites = allChats.filter((c) => c.isFavorite);
  const filteredRecent = filterChats(recentChats);
  const filteredYesterday = filterChats(yesterdaysChats);
  const filteredSevenDays = filterChats(sevenDaysChats);

  const renderChatItem = (chat: IChat) => (
    <SidebarMenuItem key={chat.id}>
      <div className="flex justify-between items-center group">
        <NavLink to={`chats/${chat.id}`} className="flex-1">
          {({ isActive }) => (
            <SidebarMenuButton
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition cursor-pointer text-sm font-medium",
                isActive 
                  ? "bg-gradient-to-r from-primary/40 to-accent/40 text-primary border border-primary/40 shadow-md shadow-primary/20" 
                  : "hover:bg-primary/20 hover:border-primary/30 border border-transparent"
              )}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0 text-primary/70" />
              <span className="truncate" title={chat.title}>
                {truncateTitle(chat.title)}
              </span>
            </SidebarMenuButton>
          )}
        </NavLink>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              setDeleteDialog({
                isOpen: true,
                chatId: chat.id,
                chatTitle: chat.title,
              });
            }}
            className="p-1.5 hover:bg-destructive/30 rounded-lg text-destructive/60 hover:text-destructive transition-all"
            title="Delete chat"
            aria-label="Delete chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Favorite/Star Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(chat.id);
            }}
            className="p-1.5 hover:bg-primary/30 rounded-lg transition-all"
            title={chat.isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={
              chat.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Star
              className={cn(
                "w-4 h-4",
                chat.isFavorite
                  ? "fill-accent text-accent"
                  : "text-muted-foreground/50 hover:text-accent"
              )}
            />
          </button>
        </div>
      </div>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="bg-gradient-to-b from-background to-secondary/5 text-foreground border-r border-primary/20">
      <SidebarContent className="flex flex-col justify-between h-full">
        <div className="space-y-4">
          {/* ⏰ IST Clock */}
          <div className="px-4 pt-4 pb-2 text-center">
            <div className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center justify-center gap-2 pr-8">
              <span className="animate-pulse text-lg">🕒</span>
              {time} IST
            </div>
          </div>

          {/* New Chat Button */}
          <div className="px-4">
            <Button
              variant="default"
              className="w-full justify-start cursor-pointer gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:shadow-primary/40 transition-all text-white font-semibold"
              asChild
            >
              <Link to="/chats/new">
                <MessageSquarePlus className="w-4 h-4" />
                New Chat
              </Link>
            </Button>
          </div>

          {/* Search Bar */}
          <div className="px-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm rounded-lg border-primary/30"
                aria-label="Search chats"
              />
            </div>
          </div>

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase flex items-center gap-2 px-4 bg-gradient-to-r from-primary/20 to-accent/20 py-1 rounded">
                <Star className="w-4 h-4 text-accent" />
                Favorites
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {favorites.map(renderChatItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Recent Chats */}
          {filteredRecent.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase px-4 pb-2 text-primary/80">
                📌 Recent
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {filteredRecent.map(renderChatItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Yesterday */}
          {filteredYesterday.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase px-4 pb-2 text-primary/80">
                📅 Yesterday
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {filteredYesterday.map(renderChatItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Last 7 Days */}
          {filteredSevenDays.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase px-4 pb-2 text-primary/80">
                🕐 Last 7 Days
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {filteredSevenDays.map(renderChatItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-primary/20 bg-gradient-to-t from-primary/5 to-transparent space-y-2">
          {/* About and Show Archived Side-by-Side */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-xs hover:bg-primary/20 transition-all border border-primary/30"
              asChild
            >
              <Link to="/about">
                <Bot className="h-4 w-4" />
                <span>About</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 gap-2 text-xs hover:bg-primary/20 transition-all border border-primary/30"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Hide" : "Archived"}
            </Button>
          </div>
          <div className="flex items-center justify-between bg-gradient-to-r from-primary/30 to-accent/30 hover:from-primary/40 hover:to-accent/40 px-3 py-2 rounded-lg transition text-xs font-semibold border border-primary/40 shadow-md shadow-primary/10">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Developer
            </span>
            <div className="flex items-center gap-2">
              <a
                href="https://sujaykumarmondal.github.io/portfolio/" 
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-primary/20 transition"
                title="Portfolio"
              >
                <Globe className="w-3.5 h-3.5 text-white" />
              </a>
              <a
                href="https://www.linkedin.com/in/sujay-kumar-mondal-a125481b7/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-primary/20 transition"
                title="LinkedIn"
              >
                <Linkedin className="w-3.5 h-3.5 text-white" />
              </a>
              <a
                href="https://github.com/SujayKumarMondal"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-primary/20 transition"
                title="GitHub"
              >
                <Github className="w-3.5 h-3.5 text-white" />
              </a>
            </div>
          </div>
        </div>
      </SidebarContent>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <div className="bg-gradient-to-br from-card to-card/80 border border-primary/40 rounded-2xl shadow-xl shadow-primary/20 p-6 max-w-sm w-full mx-4 animate-scaleIn">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
              <div>
                <h2 className="font-bold text-lg text-foreground">Delete Chat</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteDialog.chatTitle}"</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setDeleteDialog({ isOpen: false, chatId: null, chatTitle: "" })
                }
                className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted/50 transition border border-primary/30 text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteDialog.chatId &&
                  handleDeleteChat(deleteDialog.chatId)
                }
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-destructive to-destructive/80 hover:shadow-lg hover:shadow-destructive/30 text-white transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
