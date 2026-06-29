import { useState, useRef, useEffect } from "react";
import { sendMessageToChatbot } from "@/services/chatbotService";
import { useTheme } from "@/hooks/useTheme";
import { X, Send, MessageSquare } from "lucide-react";

interface Message {
  text: string;
  sender: "user" | "bot";
  error?: boolean;
}

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setMessages((prev) => [...prev, { text: userMessage, sender: "user" }]);
    setInput("");
    setIsLoading(true);
    try {
      const response = await sendMessageToChatbot(userMessage);
      setMessages((prev) => [
        ...prev,
        { text: response.message, sender: "bot", error: !response.success },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          text: "Something went wrong. Please try again.",
          sender: "bot",
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Colors
  const bg = isDark ? "#0a0a0a" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const headerBg = isDark ? "#111" : "#fafafa";
  const chatBg = isDark ? "#0d0d0d" : "#f7f7f7";
  const fg = isDark ? "#f0f0f0" : "#0d0d0d";
  const muted = isDark ? "rgba(240,240,240,0.4)" : "rgba(13,13,13,0.4)";
  const userBubble = isDark ? "#f0f0f0" : "#0d0d0d";
  const userText = isDark ? "#0d0d0d" : "#f0f0f0";
  const botBubble = isDark ? "#1a1a1a" : "#efefef";
  const botText = isDark ? "#e8e8e8" : "#1a1a1a";

  return (
    <>
      {/* ── Trigger button ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: isDark ? "#f0f0f0" : "#0d0d0d",
            color: isDark ? "#0d0d0d" : "#f0f0f0",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isDark
              ? "0 4px 24px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)"
              : "0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)",
            zIndex: 999,
            transition: "opacity 0.15s ease, transform 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "0.8";
            (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          <MessageSquare size={18} />
        </button>
      )}

      {/* ── Chat window ── */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            height: "520px",
            maxHeight: "calc(100vh - 48px)",
            zIndex: 1000,
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: "12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: isDark
              ? "0 16px 64px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)"
              : "0 16px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
            animation: "fade-up 0.25s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${border}`,
              background: headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="22"
                  height="22"
                  rx="6"
                  fill={isDark ? "#f5f5f5" : "#0d0d0d"}
                />

                <circle
                  cx="12"
                  cy="12"
                  r="6"
                  stroke={isDark ? "#0d0d0d" : "#f5f5f5"}
                  strokeWidth="1.6"
                />

                <path
                  d="M9 13L11.5 10L15 12"
                  stroke={isDark ? "#0d0d0d" : "#f5f5f5"}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                    color: fg,
                  }}
                >
                  Investment Assistant
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: muted,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "var(--green)",
                      display: "inline-block",
                      animation: "pulse-dot 2.4s ease-in-out infinite",
                    }}
                  />
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.05)";
                (e.currentTarget as HTMLElement).style.color = fg;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color = muted;
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatboxRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              background: chatBg,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>👋</div>
                <div
                  style={{
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: fg,
                    marginBottom: "6px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  How can I help?
                </div>
                <div
                  style={{ fontSize: "12.5px", color: muted, lineHeight: 1.55 }}
                >
                  Ask me anything about portfolio optimization, investing
                  strategies, or market insights.
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "9px 13px",
                    borderRadius:
                      msg.sender === "user"
                        ? "10px 10px 2px 10px"
                        : "10px 10px 10px 2px",
                    background: msg.sender === "user" ? userBubble : botBubble,
                    color: msg.sender === "user" ? userText : botText,
                    fontSize: "13.5px",
                    lineHeight: 1.55,
                    letterSpacing: "-0.006em",
                    border: msg.error ? "1px solid var(--red-border)" : "none",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: muted,
                  fontSize: "13px",
                }}
              >
                <div className="typing-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px",
              borderTop: `1px solid ${border}`,
              background: bg,
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything…"
              disabled={isLoading}
              style={{
                flex: 1,
                height: "36px",
                padding: "0 12px",
                background: isDark ? "#141414" : "#f7f7f7",
                border: `1px solid ${border}`,
                borderRadius: "8px",
                fontSize: "13.5px",
                color: fg,
                outline: "none",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "-0.006em",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = isDark
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.2)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = border;
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "none",
                background:
                  !input.trim() || isLoading
                    ? isDark
                      ? "#1a1a1a"
                      : "#e8e8e8"
                    : isDark
                      ? "#f0f0f0"
                      : "#0d0d0d",
                color:
                  !input.trim() || isLoading
                    ? muted
                    : isDark
                      ? "#0d0d0d"
                      : "#f0f0f0",
                cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s ease, opacity 0.15s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isLoading)
                  (e.currentTarget as HTMLElement).style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
