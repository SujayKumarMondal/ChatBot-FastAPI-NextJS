import { useEffect, useRef, useState } from "react";
import { SendHorizonalIcon, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vs2015 from "react-syntax-highlighter/dist/esm/styles/prism/atom-dark";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TypingLoader from "../components/TypingLoader";
import LoginPrompt from "../components/LoginPrompt";
import SpellCheckInput from "../components/SpellCheckInput";
import { promptGPT } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../lib/config";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface MessageType {
  role: "user" | "assistant";
  content: string;
}

const getWelcomeMessage = (first_name?: string, username?: string): MessageType => ({
  role: "assistant",
  content: `Welcome${first_name ? ` ${first_name}` : username ? ` ${username}` : ""}! I'm here to assist you.`,
});

export default function Homepage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { chat_uid } = useParams();
  const { user, storeUserSearch } = useAuth();
  const [input, setInput] = useState("");
  const [chatID, setChatID] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([getWelcomeMessage(user?.first_name || user?.username)]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedChatRef = useRef<{ [key: string]: boolean }>({});

  // Get JWT token from sessionStorage
  const getToken = () => sessionStorage.getItem("access_token") || "";

  // Initialize chat ID based on route
  useEffect(() => {
    const newChatID = chat_uid || crypto.randomUUID();
    setChatID(newChatID);
  }, [chat_uid]);

  // // Auto scroll to bottom when new messages arrive
  // const scrollToBottom = useCallback(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, []);

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages, scrollToBottom]);

  // 🔹 Send message mutation with proper refetch
  const mutation = useMutation({
    mutationFn: ({ chat_id, content }: { chat_id: string; content: string }) => {
      console.log(`📤 Sending message to chat ${chat_id}`);
      return promptGPT({ chat_id, content }, getToken());
    },
    onSuccess: (res) => {
      console.log("✅ Message sent successfully, response:", res);
      if (res?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply },
        ]);
        // Invalidate cache to force refetch
        queryClient.invalidateQueries({ queryKey: ["chatMessages", chatID] });
        console.log(`🔄 Invalidated cache for chat ${chatID}`);
      }
    },
    onError: (error: any) => {
      console.error("❌ Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${error.message || "Failed to send message. Please check your connection."}`,
        },
      ]);
    },
  });

  // 🔹 Fetch chat messages for existing chat
  const { data: chatData, isLoading: isLoadingChatData } = useQuery({
    queryKey: ["chatMessages", chatID],
    queryFn: async () => {
      const token = getToken();
      if (!token) {
        console.warn("❌ No auth token available");
        return [];
      }

      try {
        setIsLoadingMessages(true);
        console.log(`📨 Fetching messages for chat: ${chatID}`);
        const res = await fetch(`${getApiBaseUrl()}/get_chat_messages/${chatID}/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`📦 Response status: ${res.status}`);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`❌ Failed to fetch messages: ${res.status} ${res.statusText} - ${errorText}`);
          return [];
        }

        const data = await res.json();
        console.log(`✅ Received ${Array.isArray(data) ? data.length : 0} messages from API`);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("🔥 Error fetching chat messages:", error);
        return [];
      } finally {
        setIsLoadingMessages(false);
      }
    },
    enabled: !!chatID && !!getToken() && !!chat_uid, // ONLY fetch if chat_uid exists (existing chat)
    staleTime: Infinity, // Don't auto-refetch, only manual refetch
    gcTime: 1000 * 60 * 30, // Keep cache for 30 minutes
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update messages when chat data is loaded - CRITICAL: Load chat history properly
  useEffect(() => {
    if (!chatID) return;

    // Prevent reloading the same chat
    if (hasLoadedChatRef.current[chatID]) {
      return;
    }

    // If API call is still loading, wait
    if (isLoadingChatData) {
      return;
    }

    // API call is done loading
    hasLoadedChatRef.current[chatID] = true;

    // We have a real chat_uid in the URL (existing chat)
    if (chat_uid) {
      // Load messages from API - use them even if empty array
      if (chatData && Array.isArray(chatData)) {
        const loadedMessages = chatData.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        // Set messages (even if empty) to prevent showing welcome message on existing chat
        setMessages(loadedMessages.length > 0 ? loadedMessages : []);
        console.log(`✅ Loaded ${loadedMessages.length} messages for chat ${chatID}`);
      } else {
        // API failed but we have a chat_uid, show empty state
        setMessages([]);
        console.warn(`⚠️ No messages found for existing chat ${chatID}`);
      }
    } else {
      // New chat (no chat_uid in URL) - show welcome message
      setMessages([getWelcomeMessage(user?.first_name || user?.username)]);
      console.log(`🆕 New chat created: ${chatID}`);
    }
  }, [chatID, chatData, isLoadingChatData, chat_uid]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (!user) {
      console.warn("⚠️ User not authenticated");
      return;
    }

    console.log(`📝 handleSend called - chat_uid: ${chat_uid}, chatID: ${chatID}`);

    // If starting a NEW chat (no URL param), navigate first
    if (!chat_uid) {
      console.log(`🆕 New chat - navigating to /chats/${chatID}`);
      navigate(`/chats/${chatID}`);
      // Note: Navigation is async, but we'll send message anyway
      // React Router will update the URL, which triggers chat_uid change
      // The message will be cached, and new chat data will be fetched
    }

    // Add user message to UI immediately
    const userMessage: MessageType = { role: "user", content: input };
    const welcomeMsg = getWelcomeMessage(user?.first_name || user?.username);
    setMessages((prev) =>
      prev.filter((m) => m.content !== welcomeMsg.content).concat([userMessage])
    );

    const messageContent = input;
    setInput(""); // Clear input immediately

    // Send message to backend
    console.log(`🚀 Mutating with chatID: ${chatID}`);
    mutation.mutate({ chat_id: chatID, content: messageContent });

    // Update search history and sidebar
    if (user) {
      storeUserSearch(messageContent);
      queryClient.invalidateQueries({ queryKey: ["todaysChats"] });
      queryClient.invalidateQueries({ queryKey: ["yesterdaysChats"] });
      queryClient.invalidateQueries({ queryKey: ["sevenDaysChats"] });
    }
  };

  const handleCopyMessage = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen">
      <div className="flex flex-col flex-1 bg-background text-foreground">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoadingMessages && (
            <div className="flex items-center justify-center py-8">
              {/* <div className="text-muted-foreground">Loading chat history...</div> */}
            </div>
          )}
          
          {messages.map((msg, idx) =>
            msg.role === "user" ? (
              <motion.div
                key={idx}
                className="w-full mx-auto p-4 rounded-xl bg-primary text-primary-foreground self-end animate-message-enter ml-auto max-w-mg"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {msg.content}
              </motion.div>
            ) : (
              <motion.div
                key={idx}
                className="prose dark:prose-invert max-w-none bg-muted text-foreground p-4 rounded-lg shadow mb-4 relative group animate-message-enter"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ReactMarkdown
                  components={{
                    code({ inline, className, children }: any) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <SyntaxHighlighter
                            style={vs2015}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md"
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </motion.div>
                      ) : (
                        <code className="bg-muted rounded px-1 py-0.5 text-sm">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                <motion.button
                  onClick={() => handleCopyMessage(msg.content, idx)}
                  className="absolute top-2 right-2 p-2 rounded-md bg-muted hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Copy message to clipboard"
                >
                  {copiedIndex === idx ? (
                    <Check size={18} className="text-green-500 animate-bounce-in" />
                  ) : (
                    <Copy size={18} className="text-foreground" />
                  )}
                </motion.button>
              </motion.div>
            )
          )}

          {mutation.isPending && <TypingLoader />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <motion.div
          className="border-t p-3 sticky bottom-[33px] z-50 bg-background text-foreground"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <motion.div
              className="flex-1"
              whileFocus="focused"
            >
              <SpellCheckInput
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1"
              />
            </motion.div>

            <motion.button
              onClick={handleSend}
              disabled={mutation.isPending || !input.trim()}
              className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <SendHorizonalIcon size={18} className="cursor-pointer" />
            </motion.button>
          </div>
        </motion.div>
      </div>
      {/* Footer */}
      <footer className="w-full text-center py-3 text-xs text-muted-foreground bg-background border-t sticky bottom-0 z-40">
        By messaging ChatPaat, you agree to our{' '}
        <Link to="/terms" className="underline hover:text-primary">Terms</Link> and have read our{' '}
        <Link to="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
      </footer>
    </div>
  );
}