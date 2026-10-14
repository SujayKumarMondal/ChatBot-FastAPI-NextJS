import { useState } from "react";
import { MessageCircle, Edit2, Trash2, Copy } from "lucide-react";

interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  reactions?: Record<string, number>;
  replyTo?: string;
  isEdited?: boolean;
}

interface ThreadMessage extends ChatMessage {
  threadMessages?: ChatMessage[];
}

export function useAdvancedChat() {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [
      ...prev,
      { ...message, threadMessages: [] } as ThreadMessage,
    ]);
  };

  const editMessage = (id: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? { ...msg, content: newContent, isEdited: true }
          : msg
      )
    );
    setEditingId(null);
  };

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              reactions: {
                ...msg.reactions,
                [emoji]: (msg.reactions?.[emoji] || 0) + 1,
              },
            }
          : msg
      )
    );
  };

  const addReply = (parentId: string, reply: ChatMessage) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === parentId
          ? {
              ...msg,
              threadMessages: [...(msg.threadMessages || []), reply],
            }
          : msg
      )
    );
    setReplyingTo(null);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return {
    messages,
    editingId,
    setEditingId,
    replyingTo,
    setReplyingTo,
    openThread,
    setOpenThread,
    copiedId,
    addMessage,
    editMessage,
    deleteMessage,
    addReaction,
    addReply,
    copyMessage,
  };
}

// Thread view component
export function ThreadView({
  parentMessage,
  threadMessages,
  onAddReply,
  onClose,
}: {
  parentMessage: ChatMessage;
  threadMessages: ChatMessage[];
  onAddReply: (message: ChatMessage) => void;
  onClose: () => void;
}) {
  const [replyContent, setReplyContent] = useState("");

  const handleAddReply = () => {
    if (!replyContent.trim()) return;
    onAddReply({
      id: crypto.randomUUID(),
      content: replyContent,
      role: "user",
      timestamp: new Date(),
    });
    setReplyContent("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center p-4">
      <div className="bg-card rounded-lg w-full md:max-w-lg max-h-[80vh] flex flex-col border border-border shadow-xl animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Thread</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close thread"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Parent message */}
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-sm font-medium text-primary mb-2">Original</p>
            <p className="text-sm text-foreground">{parentMessage.content}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {parentMessage.timestamp.toLocaleTimeString()}
            </p>
          </div>

          {/* Thread replies */}
          {threadMessages.length > 0 ? (
            threadMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg border ${
                  msg.role === "user"
                    ? "bg-primary/10 border-primary/20"
                    : "bg-card border-border"
                }`}
              >
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {msg.role === "user" ? "You" : "Assistant"}
                </p>
                <p className="text-sm text-foreground">{msg.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-4">
              No replies yet. Start the conversation!
            </p>
          )}
        </div>

        {/* Reply input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Reply in thread..."
              className="flex-1 rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
            />
            <button
              onClick={handleAddReply}
              disabled={!replyContent.trim()}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced message with all features
export function EnhancedMessage({
  message,
  isEditing,
  onEdit,
  onDelete,
  onReact,
  onReply,
  onOpenThread,
  onCopy,
  threadCount,
}: {
  message: ThreadMessage;
  isEditing: boolean;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
  onOpenThread?: () => void;
  onCopy?: () => void;
  threadCount?: number;
}) {
  const [showActions, setShowActions] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);

  return (
    <div
      className="group animate-fadeIn"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`rounded-lg p-4 mb-2 border transition-all ${
          message.role === "user"
            ? "bg-primary/10 border-primary/20 ml-auto max-w-md"
            : "bg-card border-border mr-auto max-w-md"
        }`}
      >
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-2 rounded bg-background text-foreground border border-border text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(editedContent)}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90"
              >
                Save
              </button>
              <button
                onClick={() => setEditedContent(message.content)}
                className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded hover:opacity-90"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground">{message.content}</p>
            {message.isEdited && (
              <p className="text-xs text-muted-foreground mt-1">(edited)</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </>
        )}
      </div>

      {/* Reactions */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <div className="flex gap-1 ml-4 mb-2">
          {Object.entries(message.reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 transition-colors"
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}

      {/* Thread indicator */}
      {threadCount ? threadCount > 0 && (
        <button
          onClick={onOpenThread}
          className="text-xs text-primary hover:underline ml-4 mb-2"
        >
          <MessageCircle className="inline h-3 w-3 mr-1" />
          {threadCount} {threadCount === 1 ? "reply" : "replies"}
        </button>
      ) : null}

      {/* Actions */}
      {showActions && !isEditing && (
        <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          {onReact && (
            <button
              onClick={() => onReact("👍")}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Add reaction"
            >
              😊
            </button>
          )}
          {onReply && message.role === "assistant" && (
            <button
              onClick={onReply}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Reply in thread"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          {onCopy && (
            <button
              onClick={onCopy}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Copy message"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {onEdit && message.role === "user" && (
            <button
              onClick={() => setShowActions(false)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
              title="Edit message"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {onDelete && message.role === "user" && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-destructive/20 transition-colors"
              title="Delete message"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
