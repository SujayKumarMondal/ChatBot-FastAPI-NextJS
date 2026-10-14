import {
  MessageSquare,
  Star,
  Trash2,
  AlertTriangle,
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

import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  getChatsByUserId,
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
  const { user, isLoading, refreshTrigger } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
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
      return;
    }
    
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


  const toggleFavorite = (chatId: string) => {
    const updatedChats = allChats.map((chat) =>
      chat.id === chatId
        ? { ...chat, isFavorite: !chat.isFavorite }
        : chat
    );
    setAllChats(updatedChats);
  };

  const handleDeleteChat = async (chatId: string) => {
    setAllChats((prevChats) => prevChats.filter((c) => c.id !== chatId));
    addToast({
      type: "success",
      message: "Chat removed from sidebar",
      duration: 2000,
    });
    setDeleteDialog({ isOpen: false, chatId: null, chatTitle: "" });
  };

  const handleNewChat = () => {
    navigate("/chats/new");
  };

  const filterChats = (chats: IChat[]) => {
    return chats.filter((chat) => !chat.isArchived);
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

  const favorites = allChats.filter((c) => c.isFavorite);
  const filteredChats = filterChats(allChats);

  const renderChatItem = (chat: IChat) => (
    <SidebarMenuItem key={chat.id}>
      <div className="flex items-center gap-2 group w-full min-h-[2.75rem]">
        <NavLink to={`chats/${chat.id}`} className="flex-1 min-w-0">
          {({ isActive }) => (
            <SidebarMenuButton
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg transition cursor-pointer text-[13px] sm:text-sm font-medium h-10 w-full",
                isActive 
                  ? "bg-gradient-to-r from-primary/40 to-accent/40 text-primary border border-primary/40 shadow-md shadow-primary/20" 
                  : "hover:bg-primary/20 hover:border-primary/30 border border-transparent"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-primary/70" />
              <span className="truncate leading-4" title={chat.title}>
                {truncateTitle(chat.title, window.innerWidth < 640 ? 16 : 18)}
              </span>
            </SidebarMenuButton>
          )}
        </NavLink>

        <div className="flex items-center justify-center gap-0.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
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
            className="p-1.5 hover:bg-destructive/30 rounded-lg text-destructive/60 hover:text-destructive transition-all flex items-center justify-center min-w-6 h-6"
            title="Delete chat"
            aria-label="Delete chat"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Favorite/Star Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(chat.id);
            }}
            className="p-1.5 hover:bg-primary/30 rounded-lg transition-all flex items-center justify-center min-w-6 h-6"
            title={chat.isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-label={
              chat.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Star
              className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4",
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
          <div className="px-4 pt-4">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full rounded-xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:opacity-95"
            >
              New Chat
            </button>
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
