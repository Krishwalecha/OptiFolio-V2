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
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!article) return null;
  const s = (
    ["positive", "negative", "neutral", "pending"].includes(article.sentiment)
      ? article.sentiment
      : "neutral"
  ) as keyof typeof S;
  const cfg = S[s];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: backdropZ,
          backdropFilter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: panelZ,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: cfg.color,
                  fontWeight: 500,
                }}
              >
                <cfg.Icon size={10} /> {cfg.label}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                · {article.source} · via {article.via}
              </span>
            </div>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: 1.4,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              {article.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {article.sentimentReason && (
            <div
              style={{
                background: `color-mix(in srgb,${cfg.color} 8%,hsl(var(--card)))`,
                border: `1px solid color-mix(in srgb,${cfg.color} 20%,transparent)`,
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: cfg.color,
                  marginBottom: "5px",
                  fontWeight: 600,
                }}
              >
                AI Analysis
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {toTitleCase(article.sentimentReason)}
              </p>
            </div>
          )}
          {article.description && (
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                Summary
              </p>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.7,
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                {article.description}
              </p>
            </div>
          )}
          {article.stocks.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Mentioned Stocks
              </p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {article.stocks.map((tk) => (
                  <span
                    key={tk}
                    style={{
                      background: "hsl(var(--secondary))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "4px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "hsl(var(--muted-foreground))",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              Published
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              {new Date(article.publishedAt).toLocaleString("en-IN", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid hsl(var(--border))",
          }}
        >
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "10px",
              background: "hsl(var(--foreground))",
              color: "hsl(var(--background))",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Read Full Article <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
