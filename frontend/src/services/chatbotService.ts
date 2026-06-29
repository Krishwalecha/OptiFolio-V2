const API_BASE = import.meta.env.VITE_API_URL;

interface ChatbotResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

async function postToChat(payload: object): Promise<ChatbotResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

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
      message: "Sorry, I could not connect to the chatbot.",
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
