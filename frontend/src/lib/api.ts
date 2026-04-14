import axios, { AxiosError } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:7004";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Utility function for handling errors
function handleError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError;
    throw new Error(
      axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message
    );
  } else if (err instanceof Error) {
    throw new Error(err.message);
  }
  throw new Error("An unknown error occurred!");
}

// 🔹 Prompt GPT
export async function promptGPT(data: { chat_id: string; content: string }, token: string) {
  try {
    const response = await api.post("/prompt_gpt/", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Get messages of a chat
export async function getChatMessages(chatId: string, token: string) {
  if (!chatId) return [];
  try {
    const response = await api.get(`/get_chat_messages/${chatId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Get all chats for a user
export async function getChatsByUserId(userId: number) {
  try {
    const response = await api.get(`/api/data/chat/by-user-id/${userId}`);
    return response.data.data || [];
  } catch (err: unknown) {
    console.error("Error fetching chats:", err);
    return [];
  }
}

// 🔹 Delete chat
export async function deleteChat(chatId: string, token: string) {
  try {
    const response = await api.delete(`/delete_chat/${chatId}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Get all chats with pagination
export async function getAllChats(
  token: string,
  skip: number = 0,
  limit: number = 50,
  search: string = ""
) {
  try {
    const response = await api.get("/api/chats/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { skip, limit, search },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Update chat title
export async function updateChatTitle(
  chatId: string,
  title: string,
  token: string
) {
  try {
    const response = await api.put(`/api/chats/${chatId}/`, { title }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Get chat messages with pagination
export async function getChatMessagesPaginated(
  chatId: string,
  token: string,
  skip: number = 0,
  limit: number = 100
) {
  try {
    const response = await api.get(`/api/chats/${chatId}/messages/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { skip, limit },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Export all chats
export async function exportAllChats(token: string) {
  try {
    const response = await api.get("/api/export/chats/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Get chat history for table view (combines profile + export data)
export async function getChatHistoryTable(token: string) {
  try {
    // Fetch user profile
    const profileResponse = await api.get("/api/profile/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const userProfile = profileResponse.data;

    // Fetch all chats and messages
    const chatsResponse = await api.get("/api/export/chats/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const exportData = chatsResponse.data;

    // Transform data into table rows
    const chatHistoryRows: any[] = [];

    if (exportData.chats && Array.isArray(exportData.chats)) {
      for (const chat of exportData.chats) {
        if (chat.messages && Array.isArray(chat.messages)) {
          // Process messages: create rows only for assistant responses, paired with user questions
          for (let i = 0; i < chat.messages.length; i++) {
            const message = chat.messages[i];
            
            // Only create rows for assistant messages (responses)
            if (message.role === "assistant" && message.content && message.content.trim()) {
              // Find the immediately preceding user message
              let userQuestion = "";
              for (let j = i - 1; j >= 0; j--) {
                if (chat.messages[j].role === "user" && chat.messages[j].content) {
                  userQuestion = chat.messages[j].content;
                  break;
                }
              }

              // Only add if we have a question
              if (userQuestion) {
                chatHistoryRows.push({
                  userId: userProfile.id,
                  userName: userProfile.username,
                  userEmail: userProfile.email,
                  role: userProfile.role || "user",
                  timestamp: message.created_at,
                  chatId: chat.id,
                  chatTitle: chat.title || "Untitled",
                  question: userQuestion,
                  response: message.content,
                  messageRole: message.role,
                  messageId: `${chat.id}-${message.created_at}`,
                });
              }
            }
          }
        }
      }
    }

    // Sort by timestamp descending
    chatHistoryRows.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    console.log(`📊 [getChatHistoryTable] Transformed ${chatHistoryRows.length} rows from export data`);

    return {
      total: chatHistoryRows.length,
      data: chatHistoryRows,
    };
  } catch (err: unknown) {
    handleError(err);
  }
}

// ======================= Profile Management =======================

// 🔹 Upload profile image
export async function uploadProfileImage(
  file: File,
  token: string
) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await axios.post(
      `${BASE_URL}/api/profile/upload-image/`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}


// 🔹 Get user profile
export async function getUserProfile(token: string) {
  try {
    const response = await api.get("/api/profile/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Update user profile
export async function updateUserProfile(
  data: {
    first_name?: string;
    last_name?: string;
    email?: string;
  },
  token: string
) {
  try {
    const response = await api.put("/api/profile/", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Change password
export async function changePassword(
  data: {
    old_password: string;
    new_password: string;
  },
  token: string
) {
  try {
    const response = await api.post("/api/profile/change-password/", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}

// 🔹 Delete account
export async function deleteAccount(token: string) {
  try {
    const response = await api.delete("/api/profile/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (err: unknown) {
    handleError(err);
  }
}