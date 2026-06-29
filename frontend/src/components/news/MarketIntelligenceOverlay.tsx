import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Filter,
  ChevronLeft,
  Sparkles,
  ShoppingCart,
  BarChart2,
  ArrowRight,
  Check,
} from "lucide-react";
import { CONFIDENCE_CONFIG } from "@/features/news/config";
import type { StockSignal } from "@/features/news/types";
import StockSignalCard from "./StockSignalCard";
import StockSignalDetail from "./StockSignalDetail";

export default function MarketIntelligenceOverlay({
  signals,
  onClose,
  isPortfolio,
  cart,
  onCartToggle,
  onOpenCart,
}: {
  signals: StockSignal[];
  onClose: () => void;
  isPortfolio: boolean;
  cart: string[];
  onCartToggle: (ticker: string) => void;
  onOpenCart: () => void;
}) {
  const [selectedSignal, setSelectedSignal] = useState<StockSignal | null>(
    null,
  );
  const [trendFilter, setTrendFilter] = useState<
    "all" | "buy" | "sell" | "hold"
  >("all");

  const buys = signals.filter(
    (s) => s.trend === "strong_buy" || s.trend === "buy",
  );
  const sells = signals.filter(
    (s) => s.trend === "strong_sell" || s.trend === "sell",
  );
  const holds = signals.filter((s) => s.trend === "hold");

  const displayed =
    trendFilter === "buy"
      ? buys
      : trendFilter === "sell"
        ? sells
        : trendFilter === "hold"
          ? holds
          : signals;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedSignal) onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, selectedSignal]);

  const totalMentions = signals.reduce((a, s) => a + s.totalMentions, 0);
  const coveredSignals = signals.filter((s) => s.totalMentions > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0 16px",
          borderBottom: "1px solid hsl(var(--border))",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              height: "30px",
              padding: "0 10px",
              background: "hsl(var(--card)/0.7)",
              backdropFilter: "blur(8px)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "12px",
              color: "hsl(var(--muted-foreground))",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--foreground))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--muted-foreground))";
            }}
          >
            <ChevronLeft size={13} /> News
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={14} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "hsl(var(--foreground))",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {isPortfolio ? "Portfolio Intelligence" : "Market Intelligence"}
              </h2>
              <p
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                {totalMentions} mentions · {coveredSignals.length}/
                {signals.length} stocks covered
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: `${buys.length} Buy`,
              color: "#22c55e",
              bg: "rgba(34,197,94,0.1)",
              border: "rgba(34,197,94,0.3)",
            },
            {
              label: `${holds.length} Hold`,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
              border: "rgba(245,158,11,0.3)",
            },
            {
              label: `${sells.length} Sell`,
              color: "#ef4444",
              bg: "rgba(239,68,68,0.1)",
              border: "rgba(239,68,68,0.3)",
            },
          ].map(({ label, color, bg, border }) => (
            <span
              key={label}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "99px",
                background: bg,
                border: `1px solid ${border}`,
                color,
              }}
            >
              {label}
            </span>
          ))}

          <button
            onClick={onOpenCart}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "30px",
              padding: "0 12px",
              background:
                cart.length > 0
                  ? "rgba(34,197,94,0.1)"
                  : "hsl(var(--card)/0.7)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${cart.length > 0 ? "rgba(34,197,94,0.35)" : "hsl(var(--border))"}`,
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "12px",
              color:
                cart.length > 0 ? "#22c55e" : "hsl(var(--muted-foreground))",
              transition: "all 0.12s",
              fontWeight: cart.length > 0 ? 600 : 400,
            }}
          >
            <ShoppingCart size={12} />
            {cart.length > 0 ? `${cart.length} in cart` : "Optimizer Cart"}
            {cart.length > 0 && <ArrowRight size={11} />}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "9px 13px",
          background: "hsl(var(--card)/0.5)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderLeft: "3px solid #f59e0b",
          borderRadius: "8px",
          marginBottom: "12px",
        }}
      >
        <AlertCircle size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <p
          style={{
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
            margin: 0,
            fontWeight: 300,
          }}
        >
          Signals are derived from news sentiment analysis only. Not financial
          advice — always do your own research.
        </p>
      </div>

      {/* Cart info bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: "12px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "8px",
              }}
            >
              <Check size={11} style={{ color: "#22c55e", flexShrink: 0 }} />
              <p
                style={{
                  fontSize: "11.5px",
                  color: "hsl(var(--foreground))",
                  margin: 0,
                }}
              >
                <span style={{ fontWeight: 600, color: "#22c55e" }}>
                  {cart.length} stock{cart.length > 1 ? "s" : ""}
                </span>{" "}
                selected:&nbsp;
                {cart.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {t}{" "}
                  </span>
                ))}
              </p>
              <button
                onClick={onOpenCart}
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  color: "#22c55e",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                View cart <ArrowRight size={10} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confidence legend + filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 500,
            }}
          >
            Confidence:
          </span>
          {Object.entries(CONFIDENCE_CONFIG).map(([key, cfg]) => (
            <span
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: cfg.color,
              }}
            >
              <span>{cfg.icon}</span> {cfg.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Filter size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
          {(
            [
              { key: "all", label: `All (${signals.length})` },
              { key: "buy", label: `Buy (${buys.length})` },
              { key: "hold", label: `Hold (${holds.length})` },
              { key: "sell", label: `Sell (${sells.length})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTrendFilter(key)}
              style={{
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: trendFilter === key ? 600 : 400,
                background:
                  trendFilter === key
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--card)/0.6)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${trendFilter === key ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                color:
                  trendFilter === key
                    ? "hsl(var(--background))"
                    : "hsl(var(--muted-foreground))",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Signal cards grid */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <BarChart2
            size={24}
            style={{
              color: "hsl(var(--muted-foreground))",
              margin: "0 auto 12px",
              display: "block",
              opacity: 0.3,
            }}
          />
          <p
            style={{
              fontSize: "14px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 300,
            }}
          >
            No {trendFilter !== "all" ? trendFilter : ""} signals found.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "14px",
            alignItems: "start",
            paddingBottom: "24px",
          }}
        >
          {displayed.map((signal, i) => (
            <StockSignalCard
              key={signal.ticker}
              signal={signal}
              rank={i}
              onClick={() => setSelectedSignal(signal)}
              inCart={cart.includes(signal.ticker)}
              onCartToggle={(e) => {
                e.stopPropagation();
                onCartToggle(signal.ticker);
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedSignal && (
          <StockSignalDetail
            signal={selectedSignal}
            onClose={() => setSelectedSignal(null)}
            inCart={cart.includes(selectedSignal.ticker)}
            onCartToggle={() => onCartToggle(selectedSignal.ticker)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
