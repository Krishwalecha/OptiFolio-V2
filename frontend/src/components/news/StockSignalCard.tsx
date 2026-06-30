import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ChevronRight, Plus, Check } from "lucide-react";
import { TREND_CONFIG, CONFIDENCE_CONFIG, toTitleCase } from "@/features/news/config";
import type { StockSignal } from "@/features/news/types";

export default function StockSignalCard({
  signal,
  rank,
  onClick,
  inCart,
  onCartToggle,
}: {
  signal: StockSignal;
  rank: number;
  onClick: () => void;
  inCart: boolean;
  onCartToggle: (e: React.MouseEvent) => void;
}) {
  const tc = TREND_CONFIG[signal.trend];
  const cc = CONFIDENCE_CONFIG[signal.confidence];
  const bullW = signal.totalMentions > 0 ? (signal.bullishCount / signal.totalMentions) * 100 : 0;
  const bearW = signal.totalMentions > 0 ? (signal.bearishCount / signal.totalMentions) * 100 : 0;
  const neutW = 100 - bullW - bearW;
  const noData = signal.totalMentions === 0;
  const pctColor =
    signal.trend === "strong_buy" || signal.trend === "buy" ? "var(--green)"
    : signal.trend === "strong_sell" || signal.trend === "sell" ? "var(--red)"
    : "var(--amber)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: rank * 0.02, duration: 0.2 }}
      onClick={onClick}
      style={{
        background: "hsl(var(--card))",
        padding: "16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        opacity: noData ? 0.5 : 1,
        position: "relative",
        transition: "background 0.12s",
        minHeight: "200px",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary))"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--card))"; }}
    >
      {/* Cart button */}
      <button
        onClick={onCartToggle}
        title={inCart ? "Remove from optimizer" : "Add to optimizer"}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          width: "24px",
          height: "24px",
          borderRadius: "6px",
          background: inCart ? "var(--green-subtle)" : "transparent",
          border: `1px solid ${inCart ? "var(--green-border)" : "hsl(var(--border))"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.12s",
        }}
      >
        {inCart
          ? <Check size={10} style={{ color: "var(--green)" }} />
          : <Plus size={10} style={{ color: "hsl(var(--muted-foreground))" }} />}
      </button>

      {/* Ticker + name — always same height */}
      <div style={{ paddingRight: "32px", minHeight: "34px" }}>
        <span style={{
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.04em",
          color: "hsl(var(--foreground))",
        }}>
          {signal.companyName !== signal.ticker ? signal.companyName : signal.ticker}
        </span>
        <p style={{
          fontSize: "11px",
          color: "hsl(var(--muted-foreground))",
          margin: "2px 0 0",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 300,
          minHeight: "16px",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.04em",
        }}>
          {signal.companyName !== signal.ticker ? signal.ticker : ""}
        </p>
      </div>

      {/* Score row */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          {noData ? (
            <p style={{ fontSize: "28px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1, fontFamily: "'Instrument Serif', Georgia, serif" }}>—</p>
          ) : (
            <>
              <p style={{
                fontSize: "30px",
                fontWeight: 400,
                fontFamily: "'Instrument Serif', Georgia, serif",
                color: pctColor,
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}>
                {signal.bullishPct}%
              </p>
              <p style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0", fontWeight: 300 }}>
                bullish
              </p>
            </>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          <span style={{
            fontSize: "11px",
            fontWeight: 500,
            padding: "3px 8px",
            borderRadius: "5px",
            background: noData ? "hsl(var(--secondary))" : tc.bg,
            border: `1px solid ${noData ? "hsl(var(--border))" : tc.border}`,
            color: noData ? "hsl(var(--muted-foreground))" : tc.color,
            whiteSpace: "nowrap",
          }}>
            {noData ? "No Data" : tc.label}
          </span>
          {!noData && (
            <span style={{ fontSize: "10px", color: cc.color, display: "flex", alignItems: "center", gap: "3px" }}>
              {cc.icon} <span style={{ fontWeight: 300 }}>{cc.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Sentiment bar */}
      <div>
        <div style={{ height: "3px", borderRadius: "99px", background: "hsl(var(--border))", overflow: "hidden", display: "flex" }}>
          {!noData && (
            <>
              <div style={{ width: `${bullW}%`, background: "var(--green)", transition: "width 0.8s ease" }} />
              <div style={{ width: `${bearW}%`, background: "var(--red)", transition: "width 0.8s ease" }} />
              <div style={{ width: `${neutW}%`, background: "var(--amber)", opacity: 0.4, transition: "width 0.8s ease" }} />
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
          {!noData && (
            <>
              {signal.bullishCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--green)" }}>
                  <TrendingUp size={9} /> {signal.bullishCount}
                </span>
              )}
              {signal.bearishCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--red)" }}>
                  <TrendingDown size={9} /> {signal.bearishCount}
                </span>
              )}
              {signal.neutralCount > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "10px", color: "var(--amber)" }}>
                  <Minus size={9} /> {signal.neutralCount}
                </span>
              )}
            </>
          )}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "2px", fontSize: "10px", color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>
            {noData ? "No news" : `${signal.totalMentions} articles`} <ChevronRight size={9} />
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Top reason */}
      {!noData && signal.topReason && (
        <p style={{
          fontSize: "11px",
          color: "hsl(var(--muted-foreground))",
          margin: 0,
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          borderTop: "1px solid hsl(var(--border))",
          paddingTop: "10px",
          fontWeight: 300,
        }}>
          {toTitleCase(signal.topReason)}
        </p>
      )}
    </motion.div>
  );
}
