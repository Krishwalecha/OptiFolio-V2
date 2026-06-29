import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { S, Z, toTitleCase } from "@/features/news/config";
import type { Article } from "@/features/news/types";

export default function ArticleDrawer({
  article,
  onClose,
  backdropZ = Z.articleBackdrop,
  panelZ = Z.articlePanel,
}: {
  article: Article | null;
  onClose: () => void;
  backdropZ?: number;
  panelZ?: number;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!article) return null;
  const s = (["positive", "negative", "neutral", "pending"].includes(article.sentiment)
    ? article.sentiment : "neutral") as keyof typeof S;
  const cfg = S[s];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: backdropZ }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(480px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: panelZ,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "7px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: cfg.color, fontWeight: 500 }}>
                <cfg.Icon size={10} /> {cfg.label}
              </span>
              <span style={{ width: "1px", height: "10px", background: "hsl(var(--border))" }} />
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                {article.source} · via {article.via}
              </span>
            </div>
            <h2 style={{ fontSize: "15px", fontWeight: 500, lineHeight: 1.4, color: "hsl(var(--foreground))", margin: 0, letterSpacing: "-0.01em" }}>
              {article.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ flexShrink: 0, width: "28px", height: "28px", borderRadius: "6px", background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {article.sentimentReason && (
            <div style={{ borderLeft: `2px solid ${cfg.color}`, paddingLeft: "12px", marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: cfg.color, marginBottom: "5px", fontWeight: 500 }}>
                Analysis
              </p>
              <p style={{ fontSize: "13px", color: "hsl(var(--foreground))", lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                {toTitleCase(article.sentimentReason)}
              </p>
            </div>
          )}
          {article.description && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "hsl(var(--muted-foreground))", marginBottom: "6px", fontWeight: 500 }}>
                Summary
              </p>
              <p style={{ fontSize: "13.5px", color: "hsl(var(--foreground))", lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
                {article.description}
              </p>
            </div>
          )}
          {article.stocks.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "hsl(var(--muted-foreground))", marginBottom: "8px", fontWeight: 500 }}>
                Mentioned stocks
              </p>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {article.stocks.map((tk) => (
                  <span key={tk} style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", borderRadius: "4px", padding: "2px 7px", fontSize: "11px", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--foreground))" }}>
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "hsl(var(--muted-foreground))", marginBottom: "5px", fontWeight: 500 }}>
              Published
            </p>
            <p style={{ fontSize: "13px", color: "hsl(var(--foreground))", margin: 0, fontWeight: 300 }}>
              {new Date(article.publishedAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid hsl(var(--border))" }}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "10px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", borderRadius: "7px", textDecoration: "none", fontSize: "13px", fontWeight: 500 }}
          >
            Read full article <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
