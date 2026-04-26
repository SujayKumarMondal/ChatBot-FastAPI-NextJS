import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { getChatHistoryTable } from "@/lib/api";
import { ArrowLeft, Download, Loader, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ChatHistoryRow {
  userId: number;
  userName: string;
  userEmail: string;
  role: string;
  timestamp: string;
  chatId: string;
  chatTitle: string;
  question: string;
  response: string;
  messageRole: string;
  messageId: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: keyof ChatHistoryRow; direction: "asc" | "desc" }>({
    key: "timestamp",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshed, setIsRefreshed] = useState(false);

  const getToken = () => sessionStorage.getItem("access_token") || "";

  // Copy to clipboard handler
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
    });
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: async () => {
      console.log("📊 [HistoryPage] Fetching chat history...");
      try {
        const result = await getChatHistoryTable(getToken());
        console.log("✅ [HistoryPage] Chat history loaded:", result);
        return result;
      } catch (err) {
        console.error("❌ [HistoryPage] Error fetching history:", err);
        throw err;
      }
    },
    enabled: !!user,
    retry: 2,
    retryDelay: 500,
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsRefreshed(false);
    try {
      await refetch();
      console.log("✅ [HistoryPage] Refresh completed");
      setIsRefreshed(true);
      // Clear "Refreshed" status after 3 seconds
      setTimeout(() => {
        setIsRefreshed(false);
      }, 3000);
    } catch (err) {
      console.error("❌ [HistoryPage] Refresh failed:", err);
      setIsRefreshed(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const rows: ChatHistoryRow[] = data?.data || [];

  // Filter rows based on search term
  const filteredRows = rows.filter((row) =>
    Object.values(row).some(
      (val) =>
        val &&
        val.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];

    if (aVal === bVal) return 0;

    const direction = sortConfig.direction === "asc" ? 1 : -1;

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * direction;
    }

    return ((aVal as any) > (bVal as any) ? 1 : -1) * direction;
  });

  const handleSort = (key: keyof ChatHistoryRow) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleDownloadCSV = () => {
    if (sortedRows.length === 0) return;

    const headers = [
      "User ID",
      "User Name",
      "User Email",
      "Role",
      "Timestamp",
      "Chat ID",
      "Chat Title",
      "Question",
      "Response",
    ];

    const csvContent = [
      headers.join(","),
      ...sortedRows.map((row) =>
        [
          row.userId,
          `"${row.userName}"`,
          `"${row.userEmail}"`,
          row.role,
          row.timestamp,
          row.chatId,
          `"${row.chatTitle}"`,
          `"${row.question.substring(0, 100)}"`,
          `"${row.response.substring(0, 100)}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `chat_history_${user?.username || "user"}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Please log in to view history
          </h1>
          <Button onClick={() => navigate("/signin")} className="rounded-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col"
    >
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-md shadow-lg">
        <div className="px-4 md:px-6 py-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-primary/10 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Chat History
              </h1>
              <p className="text-sm text-muted-foreground">
                {sortedRows.length} {sortedRows.length === 1 ? "message" : "messages"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={handleRefresh}
                disabled={isLoading || isRefreshing || isRefreshed}
                className={`font-semibold gap-2 rounded-full text-white transition-all hover:shadow-lg ${
                  isRefreshed
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:shadow-green-500/50"
                    : "bg-gradient-to-r from-secondary to-secondary/80 hover:shadow-secondary/50"
                }`}
                title={
                  isRefreshing
                    ? "Refreshing chat history..."
                    : isRefreshed
                    ? "Refresh completed!"
                    : "Refresh chat history"
                }
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isRefreshing ? "animate-spin" : isRefreshed ? "hidden" : ""
                  }`}
                />
                {isRefreshed && <Check className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {isRefreshing ? "Refreshing" : isRefreshed ? "Refreshed" : "Refresh"}
                </span>
              </Button>
            </motion.div>

            <Button
              onClick={handleDownloadCSV}
              disabled={sortedRows.length === 0}
              className="bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/50 transition-all rounded-full text-white font-semibold gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 md:px-6 pb-4">
          <input
            type="text"
            placeholder="Search in history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-border/40 bg-background/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
              <Loader className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading chat history...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
              <p className="text-destructive font-semibold">Error loading history</p>
              <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
            </div>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-3">
              <p className="text-lg font-semibold text-muted-foreground">No chat history found</p>
              <p className="text-sm text-muted-foreground">Start a new conversation to build your history</p>
              <Button onClick={() => navigate("/")} className="rounded-full mt-4">
                Start Chatting
              </Button>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-x-auto rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm shadow-lg"
          >
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-border/40">
                <tr>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("userId")}
                  >
                    User ID {sortConfig.key === "userId" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("userName")}
                  >
                    User Name {sortConfig.key === "userName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("userEmail")}
                  >
                    Email {sortConfig.key === "userEmail" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors w-16"
                    onClick={() => handleSort("role")}
                  >
                    Role {sortConfig.key === "role" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("timestamp")}
                  >
                    Timestamp {sortConfig.key === "timestamp" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors truncate"
                    onClick={() => handleSort("chatId")}
                  >
                    Chat ID {sortConfig.key === "chatId" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("chatTitle")}
                  >
                    Chat Title {sortConfig.key === "chatTitle" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("question")}
                  >
                    Question {sortConfig.key === "question" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    className="px-4 py-3 text-left font-semibold text-foreground/80 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("response")}
                  >
                    Response {sortConfig.key === "response" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {sortedRows.map((row, idx) => (
                  <motion.tr
                    key={row.messageId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-primary/5 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 group/userid">
                        <span className="text-foreground/70 group-hover:text-foreground">{row.userId}</span>
                        <button
                          onClick={() => handleCopy(row.userId.toString(), `userid-${row.messageId}`)}
                          className="opacity-0 group-hover/userid:opacity-100 transition-opacity hover:text-primary"
                          title="Copy user ID"
                        >
                          {copiedId === `userid-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 group/username">
                        <span className="font-medium text-foreground/80 group-hover:text-foreground">{row.userName}</span>
                        <button
                          onClick={() => handleCopy(row.userName, `username-${row.messageId}`)}
                          className="opacity-0 group-hover/username:opacity-100 transition-opacity hover:text-primary"
                          title="Copy user name"
                        >
                          {copiedId === `username-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 group/email">
                        <span className="text-foreground/70 group-hover:text-foreground truncate max-w-xs">{row.userEmail}</span>
                        <button
                          onClick={() => handleCopy(row.userEmail, `email-${row.messageId}`)}
                          className="opacity-0 group-hover/email:opacity-100 transition-opacity hover:text-primary flex-shrink-0"
                          title="Copy email"
                        >
                          {copiedId === `email-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 group/role">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-secondary/20 text-secondary-foreground">
                          {row.role}
                        </span>
                        <button
                          onClick={() => handleCopy(row.role, `role-${row.messageId}`)}
                          className="opacity-0 group-hover/role:opacity-100 transition-opacity hover:text-primary"
                          title="Copy role"
                        >
                          {copiedId === `role-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 group/timestamp">
                        <span className="text-foreground/70 group-hover:text-foreground whitespace-nowrap">{new Date(row.timestamp).toLocaleString()}</span>
                        <button
                          onClick={() => handleCopy(new Date(row.timestamp).toLocaleString(), `timestamp-${row.messageId}`)}
                          className="opacity-0 group-hover/timestamp:opacity-100 transition-opacity hover:text-primary flex-shrink-0"
                          title="Copy timestamp"
                        >
                          {copiedId === `timestamp-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      <div className="flex items-center gap-2 group/chatid">
                        <span className="text-foreground/60 group-hover:text-foreground truncate max-w-xs" title={row.chatId}>{row.chatId.substring(0, 8)}...</span>
                        <button
                          onClick={() => handleCopy(row.chatId, `chatid-${row.messageId}`)}
                          className="opacity-0 group-hover/chatid:opacity-100 transition-opacity hover:text-primary flex-shrink-0"
                          title="Copy chat ID"
                        >
                          {copiedId === `chatid-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 group/title">
                        <span 
                          className="text-foreground/70 group-hover:text-foreground cursor-pointer hover:text-primary truncate max-w-xs"
                          onClick={() => navigate(`/chat/${row.chatId}`)}
                          title={row.chatTitle}
                        >
                          {row.chatTitle}
                        </span>
                        <button
                          onClick={() => handleCopy(row.chatTitle, `title-${row.messageId}`)}
                          className="opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-primary flex-shrink-0"
                          title="Copy title"
                        >
                          {copiedId === `title-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 group/question">
                        <span className="text-foreground/70 group-hover:text-foreground truncate max-w-sm" title={row.question}>{row.question.substring(0, 50)}{row.question.length > 50 ? "..." : ""}</span>
                        <button
                          onClick={() => handleCopy(row.question, `question-${row.messageId}`)}
                          className="opacity-0 group-hover/question:opacity-100 transition-opacity hover:text-primary flex-shrink-0"
                          title="Copy question"
                        >
                          {copiedId === `question-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 group/response">
                        <span 
                          className="text-foreground/70 group-hover:text-foreground truncate max-w-sm"
                          title={row.response}
                        >
                          {row.response.substring(0, 50)}{row.response.length > 50 ? "..." : ""}
                        </span>
                        <button
                          onClick={() => handleCopy(row.response, `response-${row.messageId}`)}
                          className="opacity-0 group-hover/response:opacity-100 transition-opacity hover:text-primary flex-shrink-0"
                          title="Copy response"
                        >
                          {copiedId === `response-${row.messageId}` ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
