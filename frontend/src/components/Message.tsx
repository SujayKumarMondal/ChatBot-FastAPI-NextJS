import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vs2015 from "react-syntax-highlighter/dist/esm/styles/prism/atom-dark";
import { Copy, Check, Smile, MessageCircle, Edit2, Trash2 } from "lucide-react";
import { useTypewriter, useSwipeGesture } from "../lib/animations";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  messageId?: string;
  onReact?: (emoji: string) => void;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  reactions?: Record<string, number>;
  index?: number;
}

export default function Message({
  role,
  content,
  timestamp,
  messageId,
  onReact,
  onReply,
  onEdit,
  onDelete,
  reactions,
  index = 0,
}: MessageProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isDeleted, setIsDeleted] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const isUser = role === "user";
  const isAssistant = role === "assistant";
  
  // Typewriter effect for assistant messages
  const { displayText } = useTypewriter(
    isAssistant ? content : content,
    30,
    isAssistant && role === "assistant" // Only enable for assistant messages
  );

  // Swipe to delete gesture
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture(
    () => {
      // Swipe left - delete
      if (isUser) {
        setIsDeleted(true);
        setTimeout(() => onDelete?.(messageId || ""), 300);
      }
    },
    undefined,
    50
  );

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleEdit = () => {
    if (onEdit && messageId) {
      onEdit(messageId, editedContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && messageId) {
      onDelete(messageId);
    }
  };

  return (
    <div
      ref={messageRef}
      className={`
        flex gap-3 p-4 mb-4 rounded-xl transition-all duration-300 max-w-xl md:max-w-2xl
        ${isDeleted ? "animate-swipe-out-left" : "animate-message-enter"}
        ${isUser
          ? "ml-auto bg-gradient-to-br from-primary to-primary/80 border border-primary/40 text-primary-foreground shadow-lg shadow-primary/20 rounded-3xl rounded-tr-md"
          : "bg-gradient-to-br from-card to-card/80 border border-secondary/30 text-card-foreground shadow-md shadow-secondary/10 rounded-3xl rounded-tl-md"
        }
        stagger-${index % 6}
      `}
      style={{
        animationDelay: `${index * 0.1}s`,
      } as any}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            isUser
              ? "bg-white/20 text-white"
              : "bg-gradient-to-br from-accent to-secondary text-white"
          }`}
        >
          {isUser ? "👤" : "🤖"}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${isUser ? "order-1" : "order-2"}`}>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-3 rounded-lg bg-background/20 text-foreground border border-white/20 focus:border-accent focus:outline-none backdrop-blur"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-semibold"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(content);
                }}
                className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={`prose-sm max-w-none ${isUser ? "prose-invert" : ""}`}>
              <ReactMarkdown
                components={{
                  code(props: any) {
                    const { node, inline, className, children, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");
                    const codeContent = String(children).replace(/\n$/, "");
                    const startOffset = node?.position?.start?.offset || 0;
                    const index = typeof startOffset === 'number' ? startOffset : parseInt(String(startOffset));

                    if (!inline && match) {
                      return (
                        <div className="relative group my-3 bg-background/40 rounded-lg overflow-hidden border border-white/10 backdrop-blur-sm animate-fadeIn">
                          <SyntaxHighlighter
                            style={vs2015 as any}
                            language={match[1]}
                            PreTag="pre"
                            className="!m-0 !bg-background/40 !rounded-lg"
                            {...rest}
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                          <button
                            onClick={() => handleCopyCode(codeContent, index)}
                            className="absolute top-2 right-2 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                            aria-label="Copy code"
                          >
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4 text-green-400 animate-bounce-in" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <code
                        className="px-2 py-1 rounded-md bg-white/20 font-mono text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-4 border-white/30 pl-4 italic my-2 opacity-90 animate-fadeIn">
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-4 animate-fadeIn">
                        <table className="border-collapse border border-white/20">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return (
                      <th className="border border-white/20 bg-white/10 p-2 font-semibold animate-fadeIn">
                        {children}
                      </th>
                    );
                  },
                  td({ children }) {
                    return (
                      <td className="border border-white/20 p-2 animate-fadeIn">
                        {children}
                      </td>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-2 leading-relaxed">{children}</p>;
                  },
                  h1({ children }) {
                    return <h1 className="text-lg font-bold mb-2 mt-3">{children}</h1>;
                  },
                  h2({ children }) {
                    return <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>;
                  },
                  h3({ children }) {
                    return <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>;
                  },
                }}
              >
                {isAssistant ? displayText : editedContent}
              </ReactMarkdown>
            </div>

            {/* Metadata */}
            {timestamp && (
              <div className={`text-xs mt-2 ${isUser ? "text-white/60" : "text-muted-foreground"}`}>
                {timestamp.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {showActions && !isEditing && (
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 animate-fadeIn">
          {onReact && messageId && (
            <button
              onClick={() => onReact && onReact("👍")}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
              title="React"
              aria-label="Add reaction"
            >
              <Smile className="h-4 w-4" />
            </button>
          )}
          {onReply && messageId && !isUser && (
            <button
              onClick={() => onReply(messageId)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
              title="Reply"
              aria-label="Reply to message"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          {onEdit && messageId && isUser && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-all hover:scale-110 active:scale-95"
              title="Edit"
              aria-label="Edit message"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {onDelete && messageId && isUser && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg hover:bg-destructive/40 transition-all hover:scale-110 active:scale-95"
              title="Delete"
              aria-label="Delete message"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Reactions */}
      {reactions && Object.keys(reactions).length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap animate-bounce-in">
          {Object.entries(reactions).map(([emoji, count], i) => (
            <button
              key={emoji}
              className="px-2 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold transition-all hover:scale-110 active:scale-95"
              title={`${count} reactions`}
              style={{ animationDelay: `${i * 0.05}s` } as any}
            >
              {emoji} {count > 1 && count}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
