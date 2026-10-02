import { api } from "@/lib/api";

interface ChatbotResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

function portfolioContext(): unknown {
  try {
    const raw = sessionStorage.getItem("optifolio:lastResult");
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

async function postToChat(payload: object): Promise<ChatbotResponse> {
  try {
    const context = portfolioContext();
    payload = { ...payload, page: window.location.pathname };
    if (context) payload = { ...payload, context };
    const response = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      return { success: false, message: "You're sending messages quickly. Please wait a moment and try again." };
    }
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    return {
      success: true,
      message: data.output || data.message || "No response from chatbot",
      data,
    };
  } catch (error) {
    return {
      success: false,
      message: "I could not reach the assistant. Check your connection and try again.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendMessageToChatbot(userMessage: string): Promise<ChatbotResponse> {
  return postToChat({ message: userMessage, timestamp: new Date().toISOString() });
}

export async function sendMessageWithHistory(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<ChatbotResponse> {
  return postToChat({
    message: userMessage,
    timestamp: new Date().toISOString(),
    history: conversationHistory,
  });
}
