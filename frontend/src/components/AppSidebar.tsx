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
  RotateCcw,
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
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getChatsByUserId,
  deleteChat,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

interface IChat {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  isFavorite?: boolean;
  folder?: string;
  isArchived?: boolean;
}

export function AppSidebar() {
  const [allChats, setAllChats] = useState<IChat[]>([]);
  const { user, isLoading, refreshTrigger, token } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const isMountedRef = useRef(true);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    // Wait for auth to complete loading
    if (isLoading) {
      console.log("⏳ Authentication still loading, waiting...");
      return;
    }

    // Check if we have a user with an ID
    if (!user || !user.id) {
      console.log("❌ No user available, clearing chats", { user, userId: user?.id });
      setAllChats([]);
      setIsLoadingChats(false);
      return;
    }
    
    setIsLoadingChats(true);
    try {
      console.log("🔄 Fetching chats for user:", user.id);
      const chatsData = await getChatsByUserId(user.id);
      console.log("📥 Received chats data from API:", chatsData, "Type:", typeof chatsData, "Is Array:", Array.isArray(chatsData), "Length:", chatsData?.length);
      
      // Sort chats by created_at in descending order (latest first)
      const sortedChats = (chatsData || []).sort((a: IChat, b: IChat) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      console.log("📊 Sorted chats:", sortedChats.length, "items");
      setAllChats(sortedChats);
      console.log("✅ State updated with chats");
    } catch (error) {
      console.error("❌ Error fetching chats:", error);
      setAllChats([]);
    } finally {
      setIsLoadingChats(false);
    }
  }, [user, isLoading]);

  // Fetch chats when user changes or when refreshTrigger changes
  useEffect(() => {
    console.log("🔔 AppSidebar useEffect triggered - isLoading:", isLoading, "user:", user?.id, "refreshTrigger:", refreshTrigger);
    fetchChatsData();
  }, [user?.id, isLoading, refreshTrigger]); // Only depend on user.id, not the whole user object or fetchChatsData

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

  const handleRefreshChats = async () => {
    setIsRefreshing(true);
    try {
      await fetchChatsData();
      // addToast({
      //   type: "success",
      //   message: "Chats refreshed successfully",
      //   duration: 1500,
      // });
    } catch (error) {
      console.error("Error refreshing chats:", error);
      addToast({
        type: "error",
        message: "Failed to refresh chats",
        duration: 3500,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleFavorite = (chatId: string) => {
    const updatedChats = allChats.map((chat) =>
      chat.id === chatId
        ? { ...chat, isFavorite: !chat.isFavorite }
        : chat
    );
    setAllChats(updatedChats);
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

      // Remove from UI state
      setAllChats(allChats.filter((c) => c.id !== chatId));

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
      // Handle null/undefined title
      const chatTitle = chat.title || "";
      const matchesSearch = chatTitle
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      // Show non-archived chats by default, or archived if toggled
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

  const handleNewChat = () => {
    if (!user) {
      addToast({
        message: "Please Sign In to chat with me! Have a good day!",
        type: "info",
        duration: 3000,
      });
      return;
    }
    navigate("/chats/new");
  };

  const favorites = allChats.filter((c) => c.isFavorite);
  const filteredChats = filterChats(allChats);
  
  // Log state changes (not on every render)
  useEffect(() => {
    console.log("🎯 Sidebar state CHANGED:", {
      allChatsCount: allChats.length,
      favoritesCount: favorites.length,
      filteredChatsCount: filteredChats.length,
      searchQuery,
      showArchived,
      allChats: allChats.map(c => ({ id: c.id, title: c.title, isArchived: c.isArchived, isFavorite: c.isFavorite }))
    });
  }, [allChats, favorites.length, filteredChats.length, searchQuery, showArchived]);

  const renderChatItem = (chat: IChat) => (
    <SidebarMenuItem key={chat.id}>
      <div className="flex justify-between items-center group h-10">
        <NavLink to={`chats/${chat.id}`} className="flex-1 h-full">
          {({ isActive }) => (
            <SidebarMenuButton
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition cursor-pointer text-sm font-medium h-full w-full",
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
        <div className="flex items-center gap-1 h-full px-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            className="p-1 hover:bg-destructive/30 rounded-lg text-destructive/60 hover:text-destructive transition-all flex items-center justify-center"
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
            className="p-1 hover:bg-primary/30 rounded-lg transition-all flex items-center justify-center"
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
      <SidebarContent className="flex flex-col h-full p-0">
        <div className="space-y-4 overflow-y-auto flex-1 px-0">
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
              onClick={handleNewChat}
              className="w-full justify-start cursor-pointer gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-xl hover:shadow-primary/40 transition-all text-white font-semibold"
            >
              <MessageSquarePlus className="w-4 h-4" />
              New Chat
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
              <button
                onClick={handleRefreshChats}
                disabled={isRefreshing}
                className="absolute right-3 top-3 text-muted-foreground hover:text-primary transitions-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                title="Refresh chats"
                aria-label="Refresh chats"
              >
                <RotateCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              </button>
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

          {/* All Chats */}
          {filteredChats.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase px-4 pb-2 text-primary/80">
                💬 All Chats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {filteredChats.map(renderChatItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {filteredChats.length === 0 && favorites.length === 0 && (
            <div className="px-4 py-8 text-center">
              {isLoading || isLoadingChats ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                  <p className="text-sm text-muted-foreground">Loading chats...</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No chats found</p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions - Sticky to bottom */}
        <div className="sticky bottom-0 left-0 right-0 px-4 py-3 border-t border-primary/20 bg-gradient-to-t from-primary/5 to-transparent space-y-2 z-10">
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
