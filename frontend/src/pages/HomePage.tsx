import { useEffect, useRef, useState } from "react";
import { SendHorizonalIcon, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vs2015 from "react-syntax-highlighter/dist/esm/styles/prism/atom-dark";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TypingLoader from "@/components/TypingLoader";
import LoginPrompt from "@/components/LoginPrompt";
import { promptGPT } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Homepage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { chat_uid } = useParams();
  const { user, storeUserSearch } = useAuth();
  const [input, setInput] = useState("");
  const [chatID, setChatID] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([{ role: "assistant", content: "Welcome! I'm here to assist you." }]);

  // Get JWT token from sessionStorage
  const getToken = () => sessionStorage.getItem("access_token") || "";

  useEffect(() => {
    setChatID(chat_uid ? chat_uid : crypto.randomUUID());
  }, [chat_uid]);

  useEffect(() => {
    if (!user) {
      setMessages([]);
    }
  }, [user]);

  // 🔹 Send message
  const mutation = useMutation({
    mutationFn: ({ chat_id, content }: { chat_id: string; content: string }) =>
      promptGPT({ chat_id, content }, getToken()),
    onSuccess: (res) => {
      console.log("Groq Response:", res);
      if (res?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply },
        ]);
        // Invalidate chat data to ensure it's in sync
        queryClient.invalidateQueries({ queryKey: ["chatMessages", chatID] });
      }
    },
    onError: (error: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: Please log in to use the service. ${error.message}`,
        },
      ]);
    },
  });

  // 🔹 Fetch old chat messages
  const { data: chatData } = useQuery({
    queryKey: ["chatMessages", chatID],
    queryFn: async () => {
      const res = await fetch(`http://127.0.0.1:7004/get_chat_messages/${chatID}/`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!res.ok) return []; // prevent blank screen
      return res.json();
    },
    enabled: !!chatID,
  });

  useEffect(() => {
    if (chatID && Array.isArray(chatData)) {
      setMessages(
        chatData.map((m: any) => ({
          role: m.role,
          content: m.content,
        }))
      );
    }
  }, [chatID, chatData]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "/chats/new") {
      setMessages([
        { role: "assistant", content: "Welcome! I'm here to assist you." },
      ]);
    }
  }, [location.pathname]);

  // Removed auto-scroll to bottom on message change

  const handleSend = () => {
    if (!input.trim()) return;

    if (location.pathname === "/" || location.pathname === "/chats/new") {
      navigate(`/chats/${chatID}`);
    }

    const newMessage = { role: "user", content: input };
    setMessages((prev) =>
      [...prev, newMessage].filter(
        (p) => p.content !== "Welcome! I'm here to assist you."
      ) as { role: "user" | "assistant"; content: string }[]
    );

    mutation.mutate({ chat_id: chatID, content: input });
    setInput("");

    if (user) {
      storeUserSearch(input);
      // Invalidate sidebar chats to show new chat immediately
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
          {messages.map((msg, idx) =>
            msg.role === "user" ? (
              <motion.div
                key={idx}
                className="w-full mx-auto p-4 rounded-xl bg-primary text-primary-foreground self-end animate-message-enter"
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
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <motion.div
          className="border-t p-4 sticky bottom-0 z-50 bg-background text-foreground"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <motion.div
              className="flex-1"
              whileFocus="focused"
            >
              <Textarea
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="flex-1 resize-none min-h-[80px] max-h-[200px] rounded-md border border-input bg-muted/40 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground shadow-sm transition"
              />
            </motion.div>

            <motion.button
              onClick={handleSend}
              className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <SendHorizonalIcon size={18} className="cursor-pointer" />
            </motion.button>
          </div>
        </motion.div>
      </div>
      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-muted-foreground bg-background border-t">
        By messaging ChatPaat, you agree to our{' '}
        <Link to="/terms" className="underline hover:text-primary">Terms</Link> and have read our{' '}
        <Link to="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
      </footer>
    </div>
  );
}