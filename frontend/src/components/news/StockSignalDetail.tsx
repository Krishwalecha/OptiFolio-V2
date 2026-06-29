import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Check, Info, ArrowUpRight } from "lucide-react";
import { TREND_CONFIG, CONFIDENCE_CONFIG, S, Z, toTitleCase } from "@/features/news/config";
import type { Article, StockSignal } from "@/features/news/types";
import ArticleDrawer from "./ArticleDrawer";

export default function StockSignalDetail({
  signal,
  onClose,
  inCart,
  onCartToggle,
}: {
  signal: StockSignal;
  onClose: () => void;
  inCart: boolean;
  onCartToggle: () => void;
}) {
  const tc = TREND_CONFIG[signal.trend];
  const cc = CONFIDENCE_CONFIG[signal.confidence];
  const [articleDrawer, setArticleDrawer] = useState<Article | null>(null);
  const noData = signal.totalMentions === 0;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !articleDrawer) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, articleDrawer]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: Z.signalBackdrop }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(520px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: Z.signalPanel,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid hsl(var(--border))" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "17px", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--foreground))", letterSpacing: "0.03em" }}>
                  {signal.ticker}
                </span>
                <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 8px", borderRadius: "5px", background: noData ? "hsl(var(--secondary))" : tc.bg, border: `1px solid ${noData ? "hsl(var(--border))" : tc.border}`, color: noData ? "hsl(var(--muted-foreground))" : tc.color }}>
                  {noData ? "No Data" : tc.label}
                </span>
                {!noData && (
                  <span style={{ fontSize: "10px", color: cc.color, display: "flex", alignItems: "center", gap: "3px" }}>
                    {cc.icon} {cc.label}
                  </span>
                )}
              </div>
              {signal.companyName !== signal.ticker && (
                <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0, fontWeight: 300 }}>
                  {signal.companyName}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                onClick={onCartToggle}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px", height: "28px", background: inCart ? "var(--green-subtle)" : "hsl(var(--secondary))", border: `1px solid ${inCart ? "var(--green-border)" : "hsl(var(--border))"}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 500, color: inCart ? "var(--green)" : "hsl(var(--muted-foreground))", transition: "all 0.12s" }}
              >
                {inCart ? <><Check size={10} /> In Cart</> : <><ShoppingCart size={10} /> Add</>}
              </button>
              <button
                onClick={onClose}
                style={{ width: "28px", height: "28px", borderRadius: "6px", background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
              </button>
            </div>
          </div>

          {noData ? (
            <div style={{ padding: "10px 12px", background: "hsl(var(--secondary))", borderRadius: "7px", display: "flex", gap: "9px", alignItems: "flex-start" }}>
              <Info size={12} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.5, fontWeight: 300 }}>
                No news articles found for this stock yet.
              </p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "hsl(var(--border))", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
                {[
                  { label: "Bullish", count: signal.bullishCount, color: "var(--green)" },
                  { label: "Bearish", count: signal.bearishCount, color: "var(--red)" },
                  { label: "Neutral", count: signal.neutralCount, color: "var(--amber)" },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ background: "hsl(var(--card))", padding: "10px", textAlign: "center" }}>
                    <p style={{ fontSize: "18px", fontWeight: 400, color, margin: "0 0 2px 0", fontFamily: "'Instrument Serif', Georgia, serif" }}>{count}</p>
                    <p style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", margin: 0, fontWeight: 300 }}>{label}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: "3px", borderRadius: "99px", overflow: "hidden", display: "flex", background: "hsl(var(--border))" }}>
                {signal.bullishCount > 0 && <div style={{ width: `${(signal.bullishCount / signal.totalMentions) * 100}%`, background: "var(--green)" }} />}
                {signal.bearishCount > 0 && <div style={{ width: `${(signal.bearishCount / signal.totalMentions) * 100}%`, background: "var(--red)" }} />}
                {signal.neutralCount > 0 && <div style={{ width: `${(signal.neutralCount / signal.totalMentions) * 100}%`, background: "var(--amber)", opacity: 0.5 }} />}
              </div>
            </>
          )}
        </div>

        {/* Articles */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {signal.articles.length > 0 ? (
            <>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em", color: "hsl(var(--muted-foreground))", marginBottom: "10px", fontWeight: 500 }}>
                Related articles ({signal.articles.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden", background: "hsl(var(--border))" }}>
                {signal.articles.map((article) => {
                  const st = (["positive", "negative", "neutral", "pending"].includes(article.sentiment) ? article.sentiment : "neutral") as keyof typeof S;
                  const cfg = S[st];
                  return (
                    <div
                      key={article.id}
                      onClick={() => setArticleDrawer(article)}
                      style={{ display: "grid", gridTemplateColumns: "2px 1fr", background: "hsl(var(--card))", cursor: "pointer", transition: "background 0.1s" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--card))"; }}
                    >
                      <div style={{ background: cfg.dot }} />
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "3px" }}>
                          <span style={{ fontSize: "10px", color: cfg.color, display: "flex", alignItems: "center", gap: "3px" }}>
                            <cfg.Icon size={9} /> {cfg.label}
                          </span>
                          <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>· {article.source}</span>
                        </div>
                        <p style={{ fontSize: "12.5px", fontWeight: 500, lineHeight: 1.4, color: "hsl(var(--foreground))", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {article.title}
                        </p>
                        {article.sentimentReason && (
                          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: "3px 0 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden", fontWeight: 300 }}>
                            {toTitleCase(article.sentimentReason)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>No articles available.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: "1px solid hsl(var(--border))", display: "flex", gap: "8px" }}>
          <button
            onClick={onCartToggle}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "10px", background: inCart ? "var(--green-subtle)" : "hsl(var(--secondary))", border: `1px solid ${inCart ? "var(--green-border)" : "hsl(var(--border))"}`, borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: 500, color: inCart ? "var(--green)" : "hsl(var(--muted-foreground))", transition: "all 0.12s" }}
          >
            {inCart ? <><Check size={13} /> Remove from Optimizer</> : <><ShoppingCart size={13} /> Add to Optimizer</>}
          </button>
          <a
            href={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(signal.ticker)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "10px 16px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", borderRadius: "7px", textDecoration: "none", fontSize: "13px", fontWeight: 500 }}
          >
            NSE <ArrowUpRight size={12} />
          </a>
        </div>
      </motion.div>

      <AnimatePresence>
        {articleDrawer && (
          <ArticleDrawer
            article={articleDrawer}
            onClose={() => setArticleDrawer(null)}
            backdropZ={Z.nestedArticleBackdrop}
            panelZ={Z.nestedArticlePanel}
          />
        )}
      </AnimatePresence>
    </>
  );
}
