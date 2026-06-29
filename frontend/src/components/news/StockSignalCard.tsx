import React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  ChevronRight,
  Plus,
  Check,
} from "lucide-react";
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
  const bullW =
    signal.totalMentions > 0
      ? (signal.bullishCount / signal.totalMentions) * 100
      : 0;
  const bearW =
    signal.totalMentions > 0
      ? (signal.bearishCount / signal.totalMentions) * 100
      : 0;
  const neutW = 100 - bullW - bearW;
  const pctColor =
    signal.trend === "strong_buy" || signal.trend === "buy"
      ? "#22c55e"
      : signal.trend === "strong_sell" || signal.trend === "sell"
        ? "#ef4444"
        : "#f59e0b";
  const noData = signal.totalMentions === 0;
  const rankColors = ["#f59e0b", "#94a3b8", "#b45309"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.03, duration: 0.25 }}
      onClick={onClick}
      style={{
        position: "relative",
        background: inCart ? "hsl(var(--card)/0.85)" : "hsl(var(--card)/0.6)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${inCart ? "rgba(34,197,94,0.45)" : "hsl(var(--border))"}`,
        borderTop: `3px solid ${noData ? "hsl(var(--border))" : tc.color}`,
        borderRadius: "14px",
        padding: "18px 18px 16px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        opacity: noData ? 0.55 : 1,
        boxShadow: inCart
          ? `0 0 0 1px rgba(34,197,94,0.2), 0 8px 24px rgba(0,0,0,0.12)`
          : "0 2px 12px rgba(0,0,0,0.06)",
        minHeight: "200px",
      }}
      whileHover={{
        y: -3,
        boxShadow: noData
          ? undefined
          : `0 12px 36px rgba(0,0,0,0.2), 0 0 0 1px ${tc.border}`,
      }}
    >
      {!noData && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at top left, ${tc.bg}, transparent 60%)`,
            pointerEvents: "none",
            borderRadius: "14px",
          }}
        />
      )}

      <button
        onClick={onCartToggle}
        title={inCart ? "Remove from optimizer cart" : "Add to optimizer cart"}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: inCart ? "rgba(34,197,94,0.2)" : "hsl(var(--secondary))",
          border: `1px solid ${inCart ? "rgba(34,197,94,0.5)" : "hsl(var(--border))"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 2,
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        {inCart ? (
          <Check size={12} style={{ color: "#22c55e" }} />
        ) : (
          <Plus size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
        )}
      </button>

      <div style={{ position: "relative", paddingRight: "36px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "3px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 800,
              fontFamily: "monospace",
              color: "hsl(var(--foreground))",
              letterSpacing: "0.05em",
            }}
          >
            {signal.ticker}
          </span>
          {rank < 3 && !noData && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: rankColors[rank],
                background: `${rankColors[rank]}18`,
                border: `1px solid ${rankColors[rank]}40`,
                borderRadius: "4px",
                padding: "1px 5px",
              }}
            >
              #{rank + 1}
            </span>
          )}
        </div>
        {signal.companyName !== signal.ticker && (
          <p
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 400,
              maxWidth: "180px",
            }}
          >
            {signal.companyName}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div>
          {noData ? (
            <p
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              —
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: pctColor,
                  margin: "0 0 2px 0",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                {signal.bullishPct}%
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                Bullish sentiment
              </p>
            </>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "5px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "99px",
              background: noData ? "hsl(var(--secondary))" : tc.bg,
              border: `1px solid ${noData ? "hsl(var(--border))" : tc.border}`,
              color: noData ? "hsl(var(--muted-foreground))" : tc.color,
              whiteSpace: "nowrap",
            }}
          >
            {noData ? "No Data" : tc.label}
          </span>
          {!noData && (
            <span
              title={`Confidence: ${cc.label} (${signal.totalMentions} articles)`}
              style={{
                fontSize: "11px",
                color: cc.color,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{cc.icon}</span>
              <span style={{ fontSize: "10px" }}>{cc.label}</span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            height: "5px",
            borderRadius: "99px",
            background: "hsl(var(--border))",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {!noData && (
            <>
              <div
                style={{
                  width: `${bullW}%`,
                  background: "#22c55e",
                  transition: "width 1s ease",
                }}
              />
              <div
                style={{
                  width: `${bearW}%`,
                  background: "#ef4444",
                  transition: "width 1s ease",
                }}
              />
              <div
                style={{
                  width: `${neutW}%`,
                  background: "#f59e0b",
                  opacity: 0.5,
                  transition: "width 1s ease",
                }}
              />
            </>
          )}
        </div>
        {noData ? (
          <p
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
            }}
          >
            No news found yet
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {signal.bullishCount > 0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "#22c55e",
                  fontWeight: 600,
                  background: "rgba(34,197,94,0.1)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                }}
              >
                <TrendingUp size={9} /> {signal.bullishCount}
              </span>
            )}
            {signal.bearishCount > 0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "#ef4444",
                  fontWeight: 600,
                  background: "rgba(239,68,68,0.1)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                }}
              >
                <TrendingDown size={9} /> {signal.bearishCount}
              </span>
            )}
            {signal.neutralCount > 0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "#f59e0b",
                  fontWeight: 600,
                  background: "rgba(245,158,11,0.1)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                }}
              >
                <Minus size={9} /> {signal.neutralCount}
              </span>
            )}
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                opacity: 0.4,
                fontSize: "10px",
              }}
            >
              <BookOpen size={9} /> {signal.totalMentions}{" "}
              <ChevronRight size={10} />
            </span>
          </div>
        )}
      </div>

      {!noData && signal.topReason && (
        <p
          style={{
            fontSize: "11.5px",
            color: "hsl(var(--muted-foreground))",
            margin: 0,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            borderTop: "1px solid hsl(var(--border))",
            paddingTop: "10px",
          }}
        >
          {toTitleCase(signal.topReason)}
        </p>
      )}
    </motion.div>
  );
}
