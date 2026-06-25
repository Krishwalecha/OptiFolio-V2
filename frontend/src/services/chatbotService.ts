const WEBHOOK_URL = "http://localhost:5678/webhook/investing-chat";

interface ChatbotResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface WebhookPayload {
  message: string;
  timestamp: string;
  userId?: string;
}

interface WebhookResponse {
  output?: string;
  message?: string;
  [key: string]: any;
}

export async function sendMessageToChatbot(
  userMessage: string,
): Promise<ChatbotResponse> {
  try {
    const payload: WebhookPayload = {
      message: userMessage,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WebhookResponse = await response.json();

    return {
      success: true,
      message: data.output || data.message || "No response from chatbot",
      data: data,
    };
  } catch (error) {
    console.error("Chatbot API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      message:
        "Sorry, I could not connect to the chatbot. Please make sure n8n is running.",
      error: errorMessage,
    };
  }
}

export async function sendMessageWithHistory(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
): Promise<ChatbotResponse> {
  try {
    const payload = {
      message: userMessage,
      timestamp: new Date().toISOString(),
      history: conversationHistory,
    };

    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WebhookResponse = await response.json();

    return {
      success: true,
      message: data.output || data.message || "No response from chatbot",
      data: data,
    };
  } catch (error) {
    console.error("Chatbot API Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      success: false,
      message:
        "Sorry, I could not connect to the chatbot. Please make sure n8n is running.",
      error: errorMessage,
    };
  }
}
