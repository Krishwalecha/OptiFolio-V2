import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, MessageSquare, RotateCcw, X } from "lucide-react";
import { sendMessageWithHistory } from "@/services/chatbotService";
import { Button, Dots, Mark } from "@/ui";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
}

const KEY = "optifolio:chat";
const HIDE_ON = ["/", "/signin", "/signup"];

const SUGGESTIONS: Record<string, string[]> = {
  "/optimizer": ["Explain my last result in plain words", "Why are some stocks at the limit?", "What is the difference between the three profiles?"],
  "/portfolios": ["What does drift mean for my portfolio?", "When should I rebalance?", "How is return since saving calculated?"],
  "/dashboard": ["How is my latest portfolio doing?", "What does the rank correlation of the model mean?", "What should I check before investing?"],
  "/financialnews": ["How is headline tone scored?", "Should news change my allocation?", "What moves Indian markets most?"],
  "/sipcalculator": ["Step-up SIP or a bigger fixed SIP?", "How is tax on equity funds calculated?", "What return is realistic to assume?"],
  "/learn": ["Explain Sharpe ratio simply", "What is diversification, really?", "What is a drawdown?"],
};
const DEFAULT = ["How does OptiFolio pick weights?", "What is a good Sharpe ratio?", "How do SIPs work?"];

function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-medium text-foreground">{p.slice(2, -2)}</strong> : p));
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    out.push(
      <Tag key={out.length} className={cn("my-1.5 space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const l = raw.trim();
    const ol = l.match(/^\d+[.)]\s+(.*)/);
    const ul = l.match(/^[-*•]\s+(.*)/);
    if (ol || ul) {
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((ol || ul)![1]);
      continue;
    }
    flush();
    if (!l) continue;
    const h = l.match(/^#{1,4}\s+(.*)/);
    out.push(
      <p key={out.length} className={cn("my-1.5", h && "font-medium text-foreground")}>
        {inline(h ? h[1] : l)}
      </p>,
    );
  }
  flush();
  return <>{out}</>;
}

export default function FloatingChatbot() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* storage blocked */
    }
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => field.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (HIDE_ON.includes(pathname.toLowerCase())) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history = msgs.filter((m) => !m.failed).slice(-10).map(({ role, content }) => ({ role, content }));
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setBusy(true);
    const r = await sendMessageWithHistory(q, history);
    setMsgs((m) => [...m, { role: "assistant", content: r.message, failed: !r.success }]);
    setBusy(false);
  };

  const key = Object.keys(SUGGESTIONS).find((k) => pathname.toLowerCase().startsWith(k));
  const ideas = key ? SUGGESTIONS[key] : DEFAULT;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(true)}
            aria-label="Ask Folio, the OptiFolio assistant"
            className="fixed bottom-5 right-5 z-[60] flex h-11 items-center gap-2 rounded-full bg-foreground pl-3.5 pr-4 text-[13.5px] font-medium text-background shadow-[0_12px_32px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
          >
            <MessageSquare size={16} /> Ask Folio
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Folio assistant"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-3 z-[60] flex h-[min(620px,calc(100vh-24px))] flex-col overflow-hidden rounded-3xl bg-popover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-[var(--hairline)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]"
          >
            <header className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-foreground/[0.05]">
                <Mark size={16} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[14px] font-medium">Folio</div>
                <div className="text-[11.5px] text-muted-foreground">Markets, investing and OptiFolio. Not advice.</div>
              </div>
              {msgs.length > 0 && (
                <Button variant="ghost" size="sm" icon aria-label="Start over" onClick={() => setMsgs([])}>
                  <RotateCcw size={14} />
                </Button>
              )}
              <Button variant="ghost" size="sm" icon aria-label="Close" onClick={() => setOpen(false)}>
                <X size={16} />
              </Button>
            </header>

            <div ref={list} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {!msgs.length && (
                <div className="pt-2">
                  <p className="mt-0 text-[13.5px] leading-relaxed text-muted-foreground">Ask about your results, a metric, SIPs or how the optimizer works. It can see the page you are on and your latest result.</p>
                  <div className="mt-4 flex flex-col items-start gap-2">
                    {ideas.map((s) => (
                      <button key={s} type="button" onClick={() => send(s)} className="rounded-xl px-3 py-2 text-left text-[13px] ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.04]">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-[13.5px] leading-relaxed text-background">
                    {m.content}
                  </div>
                ) : (
                  <div key={i} className={cn("max-w-[92%] text-[13.5px] leading-relaxed text-foreground/85", m.failed && "text-[var(--red)]")}>
                    <Markdown text={m.content} />
                  </div>
                ),
              )}
              {busy && (
                <div className="flex items-center gap-2 py-1 text-muted-foreground">
                  <Dots size={18} />
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-[var(--hairline)] p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl bg-card p-1.5 pl-3.5 ring-1 ring-inset ring-[var(--hairline)] focus-within:ring-2 focus-within:ring-brand">
                <textarea
                  ref={field}
                  rows={1}
                  value={input}
                  maxLength={1500}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Ask about markets or your portfolio"
                  aria-label="Message"
                  className="max-h-28 min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-[13.5px] outline-none placeholder:text-muted-foreground/70"
                />
                <Button type="submit" variant="primary" size="sm" icon disabled={!input.trim() || busy} aria-label="Send">
                  <ArrowUp size={15} />
                </Button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
