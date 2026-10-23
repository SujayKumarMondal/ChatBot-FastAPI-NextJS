import { useCallback, useEffect, useRef, useState } from "react";
import {
  SendHorizonalIcon,
  Copy,
  Check,
  Paperclip,
  X,
  Sparkles,
  Lightbulb,
  Code2,
  PenLine,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vs2015 from "react-syntax-highlighter/dist/esm/styles/prism/atom-dark";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import TypingLoader from "../components/TypingLoader";
import LoginPrompt from "../components/LoginPrompt";
import SpellCheckInput from "../components/SpellCheckInput";
import { promptGPT, uploadRagDocument, type RagDocument } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getApiBaseUrl } from "../lib/config";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

interface MessageType {
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  id?: string | number;
  attachments?: MessageAttachment[];
}

interface ChatHistoryRecord {
  id: number | string;
  role: "user" | "assistant";
  content: string;
}

interface MessageAttachment {
  filename: string;
  status: "uploading" | "uploaded" | "failed";
  documentId?: string;
}

interface ChatDocument {
  id: string;
  filename: string;
}

interface RagSource {
  document_id: string;
  filename: string;
  chunk_index: number;
  score: number;
  excerpt: string;
}

interface PendingAttachment {
  file: File;
  previewUrl?: string;
}

const isChatHistoryRecord = (value: unknown): value is ChatHistoryRecord =>
  !!value &&
  typeof value === "object" &&
  "id" in value &&
  (typeof value.id === "number" || typeof value.id === "string") &&
  "role" in value &&
  (value.role === "user" || value.role === "assistant") &&
  "content" in value &&
  typeof value.content === "string";

const getWelcomeMessage = (first_name?: string, username?: string): MessageType => ({
  role: "assistant",
  content: `Welcome${first_name ? ` ${first_name}` : username ? ` ${username}` : ""}! I'm here to assist you.`,
});

export default function Homepage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { chat_uid } = useParams();
  const isNewChatRoute = !chat_uid || chat_uid === "new";
  const { user, storeUserSearch } = useAuth();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const attachmentUrlsRef = useRef<string[]>([]);
  const [chatID, setChatID] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | number | null>(null);
  const [chatDocuments, setChatDocuments] = useState<ChatDocument[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([getWelcomeMessage(user?.first_name || user?.username)]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hasLoadedChatRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    return () => attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Get JWT token from sessionStorage
  const getToken = () => sessionStorage.getItem("access_token") || "";

  // Initialize chat ID based on route
  useEffect(() => {
    const newChatID = isNewChatRoute ? crypto.randomUUID() : chat_uid;
    setChatID(newChatID);
  }, [chat_uid, isNewChatRoute]);

  const chatDocumentsKey = useCallback(
    (targetChatId: string) =>
      `chatpaat:chat-documents:${user?.id ?? "anonymous"}:${targetChatId}`,
    [user?.id]
  );
  const chatMessageAttachmentsKey = useCallback(
    (targetChatId: string) =>
      `chatpaat:chat-message-attachments:${user?.id ?? "anonymous"}:${targetChatId}`,
    [user?.id]
  );

  const readChatDocuments = useCallback((targetChatId: string): ChatDocument[] => {
    try {
      const saved = localStorage.getItem(chatDocumentsKey(targetChatId));
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (document): document is ChatDocument =>
          !!document &&
          typeof document.id === "string" &&
          typeof document.filename === "string"
      );
    } catch (error) {
      console.error("Unable to restore this chat's attached documents.", error);
      return [];
    }
  }, [chatDocumentsKey]);

  const saveChatDocuments = useCallback((targetChatId: string, documents: ChatDocument[]) => {
    const uniqueDocuments = Array.from(
      new Map(documents.map((document) => [document.id, document])).values()
    ).slice(0, 20);
    try {
      localStorage.setItem(chatDocumentsKey(targetChatId), JSON.stringify(uniqueDocuments));
    } catch (error) {
      console.error("Unable to save this chat's attached documents.", error);
    }
    if (chatID === targetChatId) setChatDocuments(uniqueDocuments);
    return uniqueDocuments;
  }, [chatDocumentsKey, chatID]);

  const readMessageAttachments = useCallback((targetChatId: string): Record<string, MessageAttachment[]> => {
    try {
      const saved = localStorage.getItem(chatMessageAttachmentsKey(targetChatId));
      const parsed: unknown = saved ? JSON.parse(saved) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, MessageAttachment[]] =>
          Array.isArray(entry[1]) &&
          entry[1].every(
            (attachment) =>
              !!attachment &&
              typeof attachment.filename === "string" &&
              attachment.status === "uploaded" &&
              (attachment.documentId === undefined || typeof attachment.documentId === "string")
          )
        )
      );
    } catch (error) {
      console.error("Unable to restore this chat's message attachments.", error);
      return {};
    }
  }, [chatMessageAttachmentsKey]);

  const saveMessageAttachments = useCallback((
    targetChatId: string,
    messageId: string | number,
    messageAttachments: MessageAttachment[]
  ) => {
    try {
      const saved = readMessageAttachments(targetChatId);
      localStorage.setItem(
        chatMessageAttachmentsKey(targetChatId),
        JSON.stringify({ ...saved, [messageId]: messageAttachments })
      );
    } catch (error) {
      console.error("Unable to save this chat's message attachments.", error);
    }
  }, [chatMessageAttachmentsKey, readMessageAttachments]);

  useEffect(() => {
    if (!chatID) return;
    setChatDocuments(readChatDocuments(chatID));
  }, [chatID, user?.id, readChatDocuments]);

  // 🔹 Send message mutation with proper refetch
  const mutation = useMutation({
    mutationFn: async ({
      chat_id,
      content,
      selectedAttachments,
      messageId,
      editMessageId,
    }: {
      chat_id: string;
      content: string;
      selectedAttachments: PendingAttachment[];
      messageId: string;
      editMessageId?: number;
    }) => {
      console.log(`📤 Sending message to chat ${chat_id}`);
      const token = getToken();
      const documents: RagDocument[] = [];
      const knownDocuments = Array.from(
        new Map(
          [
            ...readChatDocuments(chat_id),
            ...(chatID === chat_id ? chatDocuments : []),
          ].map((document) => [document.id, document])
        ).values()
      );
      for (let index = 0; index < selectedAttachments.length; index += 1) {
        const attachment = selectedAttachments[index];
        try {
          const document = await uploadRagDocument(attachment.file, token);
          documents.push(document);
          saveChatDocuments(chat_id, [
            ...knownDocuments,
            ...documents.map(({ id, filename }) => ({ id, filename })),
          ]);
          setMessages((previous) =>
            previous.map((message) =>
              message.id === messageId && message.attachments
                ? {
                    ...message,
                    attachments: message.attachments.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, status: "uploaded", documentId: document.id }
                        : item
                    ),
                  }
                : message
            )
          );
        } catch (error) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === messageId && message.attachments
                ? {
                    ...message,
                    attachments: message.attachments.map((item) =>
                      item.status === "uploading" ? { ...item, status: "failed" } : item
                    ),
                  }
                : message
            )
          );
          throw new Error(`Could not upload ${attachment.file.name}: ${error instanceof Error ? error.message : "Upload failed."}`);
        }
      }
      const activeDocuments = saveChatDocuments(chat_id, [
        ...knownDocuments,
        ...documents.map(({ id, filename }) => ({ id, filename })),
      ]);
      const response = await promptGPT(
        {
          chat_id,
          content,
          document_ids: activeDocuments.map((document) => document.id),
          ...(editMessageId !== undefined ? { edit_message_id: editMessageId } : {}),
        },
        token
      );
      return { ...response, activeDocuments, uploadedDocuments: documents };
    },
    onSuccess: (res, variables) => {
      console.log("✅ Message sent successfully, response:", res);
      if (res?.reply) {
        if (
          variables.editMessageId === undefined &&
          variables.selectedAttachments.length > 0 &&
          res.user_message_id !== undefined
        ) {
          saveMessageAttachments(
            variables.chat_id,
            res.user_message_id,
            variables.selectedAttachments.map((attachment, index) => ({
              filename: attachment.file.name,
              status: "uploaded" as const,
              documentId: res.uploadedDocuments[index]?.id,
            }))
          );
        }
        const assistantMessage: MessageType = {
          role: "assistant",
          content: res.reply,
          sources: Array.isArray(res.sources) ? res.sources : [],
        };
        setMessages((previous) => {
          if (variables.editMessageId !== undefined) {
            const editedIndex = previous.findIndex(
              (message) => Number(message.id) === variables.editMessageId
            );
            if (editedIndex >= 0) {
              return [
                ...previous.slice(0, editedIndex),
                {
                  ...previous[editedIndex],
                  id: res.user_message_id ?? previous[editedIndex].id,
                  content: variables.content,
                },
                assistantMessage,
              ];
            }
          }
          const withPersistedId = previous.map((message) =>
            message.id === variables.messageId
              ? { ...message, id: res.user_message_id ?? message.id }
              : message
          );
          return [...withPersistedId, assistantMessage];
        });
        // Invalidate cache to force refetch
        queryClient.invalidateQueries({ queryKey: ["chatMessages", variables.chat_id] });
        console.log(`🔄 Invalidated cache for chat ${variables.chat_id}`);
      }
    },
    onError: (error: unknown, variables) => {
      console.error("❌ Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message. Please check your connection.";
      if (variables.editMessageId === undefined) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${errorMessage}`,
          },
        ]);
      } else {
        setAttachmentError(errorMessage);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, mutation.isPending]);

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

        const data: unknown = await res.json();
        const records = Array.isArray(data) ? data.filter(isChatHistoryRecord) : [];
        console.log(`✅ Received ${records.length} messages from API`);
        return records;
      } catch (error) {
        console.error("🔥 Error fetching chat messages:", error);
        return [];
      } finally {
        setIsLoadingMessages(false);
      }
    },
    enabled: !!chatID && !!getToken() && !isNewChatRoute,
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
    if (!isNewChatRoute) {
      // Load messages from API - use them even if empty array
      if (chatData && Array.isArray(chatData)) {
        const savedAttachments = readMessageAttachments(chatID);
        const loadedMessages = chatData.map((m: ChatHistoryRecord) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          ...(savedAttachments[String(m.id)]
            ? { attachments: savedAttachments[String(m.id)] }
            : {}),
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
  }, [
    chatID,
    chatData,
    isLoadingChatData,
    chat_uid,
    isNewChatRoute,
    readMessageAttachments,
    user?.first_name,
    user?.username,
  ]);

  const handleSend = (content = input, editedMessage?: MessageType) => {
    if (!content.trim() || mutation.isPending) return;
    if (!user) {
      console.warn("⚠️ User not authenticated");
      return;
    }
    if (editedMessage && !Number.isInteger(Number(editedMessage.id))) {
      setAttachmentError("This message cannot be edited because it has not been saved yet.");
      return;
    }

    console.log(`📝 handleSend called - chat_uid: ${chat_uid}, chatID: ${chatID}`);

    // If starting a NEW chat (no URL param), navigate first
    if (isNewChatRoute) {
      console.log(`🆕 New chat - navigating to /chats/${chatID}`);
      hasLoadedChatRef.current[chatID] = true;
      navigate(`/chats/${chatID}`);
      // Note: Navigation is async, but we'll send message anyway
      // React Router will update the URL, which triggers chat_uid change
      // The message will be cached, and new chat data will be fetched
    }

    // Add user message to UI immediately
    const messageId = editedMessage?.id ?? crypto.randomUUID();
    const selectedAttachments = editedMessage ? [] : attachments;
    if (!editedMessage) {
      const userMessage: MessageType = {
        id: messageId,
        role: "user",
        content,
        attachments: selectedAttachments.map(({ file }) => ({
          filename: file.name,
          status: "uploading",
        })),
      };
      const welcomeMsg = getWelcomeMessage(user?.first_name || user?.username);
      setMessages((prev) =>
        prev.filter((m) => m.content !== welcomeMsg.content).concat([userMessage])
      );
    }

    const messageContent = content;
    setInput(""); // Clear input immediately
    if (!editedMessage) setAttachments([]);
    setAttachmentError("");
    setEditingMessageId(null);
    setEditDraft("");
    selectedAttachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current = attachmentUrlsRef.current.filter(
          (url) => url !== attachment.previewUrl
        );
      }
    });

    // Send message to backend
    console.log(`🚀 Mutating with chatID: ${chatID}`);
    mutation.mutate({
      chat_id: chatID,
      content: messageContent,
      selectedAttachments,
      messageId: String(messageId),
      ...(editedMessage ? { editMessageId: Number(editedMessage.id) } : {}),
    });

    // Update search history and sidebar
    if (user) {
      storeUserSearch(messageContent);
      queryClient.invalidateQueries({ queryKey: ["todaysChats"] });
      queryClient.invalidateQueries({ queryKey: ["yesterdaysChats"] });
      queryClient.invalidateQueries({ queryKey: ["sevenDaysChats"] });
    }
  };

  const addAttachments = (files: File[]) => {
    const supportedExtensions = [".pdf", ".txt", ".csv", ".docx", ".png", ".jpg", ".jpeg"];
    const validFiles = files.filter((file) => {
      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return supportedExtensions.includes(extension) && file.size <= 10 * 1024 * 1024;
    });
    const invalidFiles = files.length - validFiles.length;
    const remainingSlots = Math.max(0, 5 - attachments.length);
    const additions = validFiles.slice(0, remainingSlots).map((file) => {
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      if (previewUrl) attachmentUrlsRef.current.push(previewUrl);
      return { file, previewUrl };
    });
    const errors = [];
    if (invalidFiles) {
      errors.push("Only PDF, TXT, CSV, DOCX, PNG, and JPG files up to 10 MB are supported.");
    }
    if (validFiles.length > remainingSlots) {
      errors.push("You can attach up to five files to one message.");
    }
    setAttachmentError(errors.join(" "));
    setAttachments((previous) => [...previous, ...additions]);
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const handleComposerPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardItems = Array.from(event.clipboardData.items);
    const imageItems = clipboardItems.filter(
      (item) => item.kind === "file" && item.type.startsWith("image/")
    );
    if (!imageItems.length) return;

    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    const pastedImages: File[] = [];
    let failedToReadImage = false;
    for (let index = 0; index < imageItems.length; index += 1) {
      const file = imageItems[index].getAsFile();
      if (!file) {
        failedToReadImage = true;
        continue;
      }
      try {
        let imageFile: File;
        if (file.type === "image/png" || file.type === "image/jpeg") {
          const extension = file.type === "image/jpeg" ? "jpg" : "png";
          imageFile = new File([file], `pasted-image-${Date.now()}-${index}.${extension}`, {
            type: file.type,
            lastModified: Date.now(),
          });
        } else {
          const bitmap = await createImageBitmap(file);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Image conversion is unavailable.");
            context.drawImage(bitmap, 0, 0);
            const png = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("The pasted image could not be converted."));
              }, "image/png");
            });
            imageFile = new File([png], `pasted-image-${Date.now()}-${index}.png`, {
              type: "image/png",
              lastModified: Date.now(),
            });
          } finally {
            bitmap.close();
          }
        }
        pastedImages.push(imageFile);
      } catch (error) {
        failedToReadImage = true;
        console.error("Unable to prepare a pasted image for upload.", error);
      }
    }
    if (pastedImages.length) {
      addAttachments(pastedImages);
    }
    if (failedToReadImage) {
      setAttachmentError((previous) =>
        [previous, "One or more pasted images could not be read. Try copying the image again."]
          .filter(Boolean)
          .join(" ")
      );
    }
    if (!pastedImages.length && !failedToReadImage) {
      setAttachmentError("The pasted image could not be read. Try copying it again.");
      requestAnimationFrame(() => composerInputRef.current?.focus());
    }
    if (pastedText) setInput((previous) => previous + pastedText);
  };

  const removeAttachment = (index: number) => {
    setAttachments((previous) => {
      const removed = previous[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
        attachmentUrlsRef.current = attachmentUrlsRef.current.filter(
          (url) => url !== removed.previewUrl
        );
      }
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const handleCopyMessage = (content: string, id: string | number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch((error: unknown) => {
      console.error("Unable to copy message to clipboard.", error);
    });
  };

  const beginEditingMessage = (message: MessageType) => {
    setAttachmentError("");
    setEditingMessageId(message.id ?? null);
    setEditDraft(message.content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditDraft("");
    setAttachmentError("");
  };

  const isFreshChat = isNewChatRoute && messages.length === 1 && messages[0].role === "assistant";
  const promptSuggestions = [
    { icon: Lightbulb, title: "Explore an idea", prompt: "Help me explore an idea and turn it into a practical plan." },
    { icon: Code2, title: "Write some code", prompt: "Help me write and explain a clean solution to a coding problem." },
    { icon: PenLine, title: "Improve my writing", prompt: "Help me improve a piece of writing. I’ll share the draft next." },
    { icon: Paperclip, title: "Ask about a file", prompt: "Summarize the key points in the file I attached." },
  ];

  // Show login prompt if user is not authenticated
  if (!user) {
    return <LoginPrompt />;
  }

  return (
    <>
    <div className="chat-shell flex min-h-0 flex-1 flex-col text-foreground">
        {/* Messages */}
        <div ref={chatScrollRef} className="chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          {isLoadingMessages && (
            <div className="flex items-center justify-center py-8">
              {/* <div className="text-muted-foreground">Loading chat history...</div> */}
            </div>
          )}
          
          {isFreshChat && (
            <motion.section
              className="welcome-panel mx-auto flex w-full max-w-3xl flex-col items-center px-2 pb-3 pt-5 text-center sm:pt-8"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-primary">
                <Sparkles size={20} strokeWidth={1.8} />
              </div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Your AI workspace
              </p>
              <h1 className="max-w-2xl text-balance text-3xl font-semibold leading-[1.16] tracking-[-0.035em] sm:text-4xl">
                {user.first_name ? `Good to see you, ${user.first_name}.` : "What can I help you with?"}
                <span className="mt-2 block text-primary">
                  Let’s make something clear.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                Think through a problem, create something new, or bring a document to explore together.
              </p>
              <div className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {promptSuggestions.map(({ icon: Icon, title, prompt }, index) => (
                  <motion.button
                    key={title}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card/70 p-3 text-left transition duration-200 hover:border-primary/35 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + index * 0.06, duration: 0.32 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary transition group-hover:bg-primary/10">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{title}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {title === "Explore an idea" && "Shape a thought into next steps"}
                        {title === "Write some code" && "Build, debug, and understand"}
                        {title === "Improve my writing" && "Find the right words and tone"}
                        {title === "Ask about a file" && "Get answers with source citations"}
                      </span>
                    </span>
                    <ArrowUpRight size={14} className="shrink-0 text-muted-foreground/60 transition group-hover:text-primary" />
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}
          {messages
            .filter((_, idx) => !(isFreshChat && idx === 0))
            .map((msg, idx) =>
            msg.role === "user" ? (
              <motion.div
                key={msg.id ?? idx}
                className="user-message group relative ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-4 py-3 text-sm leading-6 text-foreground sm:max-w-[76%] sm:px-5"
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                {editingMessageId === msg.id ? (
                  <div className="min-w-[min(70vw,24rem)]">
                    <textarea
                      autoFocus
                      aria-label="Edit your question"
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleSend(editDraft, msg);
                        }
                        if (event.key === "Escape") cancelEditingMessage();
                      }}
                      className="min-h-24 w-full resize-y rounded-lg border border-border bg-background/80 p-2.5 text-sm leading-6 text-foreground outline-none focus:border-primary"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditingMessage}
                        className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-background/70 hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend(editDraft, msg)}
                        disabled={!editDraft.trim() || mutation.isPending}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Save &amp; resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words pr-12">{msg.content}</p>
                )}
                {!!msg.attachments?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-primary/10 pt-2.5" aria-label="Attached documents">
                    {msg.attachments.map((attachment, attachmentIndex) => (
                      <span
                        key={`${attachment.filename}-${attachmentIndex}`}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/80 bg-background/70 px-2 py-1 text-[11px] leading-4"
                        title={`${attachment.filename} · ${attachment.status}`}
                      >
                        <Paperclip size={12} className="shrink-0 text-primary" />
                        <span className="max-w-48 truncate">{attachment.filename}</span>
                        <span className={`shrink-0 ${
                          attachment.status === "uploaded"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : attachment.status === "failed"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}>
                          {attachment.status === "uploaded"
                            ? "Added"
                            : attachment.status === "failed"
                              ? "Failed"
                              : "Uploading"}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                {editingMessageId !== msg.id && (
                  <div className="message-actions absolute -top-3 right-2 flex items-center gap-1 rounded-lg border border-border/80 bg-card p-0.5 opacity-100 shadow-sm sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.content, msg.id ?? idx)}
                      aria-label="Copy your question"
                      title="Copy question"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {copiedIndex === (msg.id ?? idx)
                        ? <Check size={14} className="text-emerald-500" />
                        : <Copy size={14} />}
                    </button>
                    {msg.id !== undefined && Number.isInteger(Number(msg.id)) && (
                      <button
                        type="button"
                        onClick={() => beginEditingMessage(msg)}
                        aria-label="Edit your question"
                        title="Edit and resend"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={idx}
                className="message-card group relative max-w-3xl break-words rounded-2xl border border-border/70 bg-card/70 p-4 text-foreground sm:p-5"
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              >
                <ReactMarkdown
                  components={{
                    code({
                      inline,
                      className,
                      children,
                    }: {
                      inline?: boolean;
                      className?: string;
                      children?: React.ReactNode;
                    }) {
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
                  {msg.content.replace(/<br\s*\/?>/gi, "  \n")}
                </ReactMarkdown>
                {!!msg.sources?.length && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                    <span className="text-xs font-medium text-muted-foreground">Sources</span>
                    {msg.sources.map((source, sourceIndex) => (
                      <span
                        key={`${source.document_id}-${source.chunk_index}-${sourceIndex}`}
                        title={source.excerpt}
                        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-foreground"
                      >
                        {source.filename} · chunk {source.chunk_index}
                      </span>
                    ))}
                  </div>
                )}
                <motion.button
                  onClick={() => handleCopyMessage(msg.content, msg.id ?? `assistant-${idx}`)}
                  className="absolute top-2 right-2 p-2 rounded-md bg-muted hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  title="Copy message to clipboard"
                >
                  {copiedIndex === (msg.id ?? `assistant-${idx}`) ? (
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
        </div>

        {/* Input */}
        <motion.div
          className="composer-dock w-full shrink-0 px-3 pb-2 pt-1.5 text-foreground sm:px-6 sm:pb-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="composer-panel mx-auto w-full max-w-4xl rounded-2xl border border-border/80 bg-card/90 p-3 shadow-[0_12px_50px_rgba(0,0,0,.18)] backdrop-blur-xl sm:p-3.5"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addAttachments(Array.from(event.dataTransfer.files));
            }}
          >
            {attachments.length > 0 && (
              <AnimatePresence initial={false}>
                {attachments.length > 0 && (
                  <motion.div
                    className="mb-3 flex flex-wrap gap-2"
                    aria-label="Selected attachments"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  >
                    <AnimatePresence initial={false}>
                      {attachments.map((attachment, index) => (
                        <motion.div
                          key={`${attachment.file.name}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.92 }}
                          transition={{ duration: 0.18 }}
                          className="flex max-w-full items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 text-xs shadow-sm"
                        >
                          {attachment.previewUrl ? (
                            <img
                              src={attachment.previewUrl}
                              alt=""
                              className="h-8 w-8 rounded-md object-cover"
                            />
                          ) : (
                            <Paperclip size={14} className="shrink-0 text-primary" />
                          )}
                          <span className="max-w-48 truncate">{attachment.file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            aria-label={`Remove ${attachment.file.name}`}
                            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X size={13} />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            {chatDocuments.length > 0 && (
              <div className="mb-2.5 flex flex-wrap items-center gap-1.5" aria-label="Documents available in this chat">
                <span className="mr-1 text-[11px] font-medium text-muted-foreground">
                  Chat knowledge
                </span>
                {chatDocuments.map((document) => (
                  <span
                    key={document.id}
                    title={`${document.filename} will be used for questions in this chat`}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 py-1 pl-2.5 pr-1 text-[11px] text-foreground"
                  >
                    <Paperclip size={11} className="shrink-0 text-primary" />
                    <span className="max-w-40 truncate">{document.filename}</span>
                    <button
                      type="button"
                      onClick={() =>
                        saveChatDocuments(
                          chatID,
                          chatDocuments.filter((item) => item.id !== document.id)
                        )
                      }
                      aria-label={`Stop using ${document.filename} in this chat`}
                      title="Remove from this chat"
                      className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {attachmentError && (
              <p role="alert" className="mb-2 text-xs text-destructive">{attachmentError}</p>
            )}
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <motion.div className="min-w-0 flex-1">
                <SpellCheckInput
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e)}
                  inputRef={composerInputRef}
                  onPaste={handleComposerPaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full"
                />
              </motion.div>

              <input
                type="file"
                accept=".pdf,.txt,.csv,.docx,.png,.jpg,.jpeg"
                multiple
                className="sr-only"
                id="rag-file-upload"
                onChange={(event) => {
                  if (event.target.files) addAttachments(Array.from(event.target.files));
                  event.target.value = "";
                }}
              />
              <label
                htmlFor="rag-file-upload"
                title="Attach PDF, TXT, CSV, DOCX, or image files"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary"
              >
                <Paperclip size={18} />
                <span className="sr-only">Attach files</span>
              </label>

              <motion.button
                onClick={() => handleSend()}
                disabled={mutation.isPending || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
              >
                <SendHorizonalIcon size={18} className="cursor-pointer" />
              </motion.button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Drop files here or attach up to five files (10 MB each).
            </p>
          </div>
        </motion.div>
      </div>
      {/* Footer */}
      <footer className="w-full shrink-0 border-t border-border/50 bg-background/80 py-1.5 text-center text-[10px] text-muted-foreground/80 backdrop-blur">
        By messaging ChatPaat, you agree to our{' '}
        <Link to="/terms" className="underline hover:text-primary">Terms</Link> and have read our{' '}
        <Link to="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
      </footer>
    </>
  );
}