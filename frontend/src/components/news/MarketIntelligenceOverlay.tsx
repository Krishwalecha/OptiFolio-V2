import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, ShoppingCart, BarChart2 } from "lucide-react";
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
  const [selectedSignal, setSelectedSignal] = useState<StockSignal | null>(null);
  const [trendFilter, setTrendFilter] = useState<"all" | "buy" | "sell" | "hold">("all");

  const buys  = signals.filter((s) => s.trend === "strong_buy" || s.trend === "buy");
  const sells = signals.filter((s) => s.trend === "strong_sell" || s.trend === "sell");
  const holds = signals.filter((s) => s.trend === "hold");

  const displayed =
    trendFilter === "buy"  ? buys  :
    trendFilter === "sell" ? sells :
    trendFilter === "hold" ? holds : signals;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !selectedSignal) onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, selectedSignal]);

  const totalMentions   = signals.reduce((a, s) => a + s.totalMentions, 0);
  const coveredSignals  = signals.filter((s) => s.totalMentions > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0 16px",
          borderBottom: "1px solid hsl(var(--border))",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              height: "30px",
              padding: "0 10px",
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "12px",
              color: "hsl(var(--muted-foreground))",
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"; }}
          >
            <ChevronLeft size={13} /> News
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <Sparkles size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
              <h2 style={{ fontSize: "15px", fontWeight: 500, margin: 0, letterSpacing: "-0.02em", color: "hsl(var(--foreground))" }}>
                {isPortfolio ? "Portfolio Intelligence" : "Market Intelligence"}
              </h2>
            </div>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0", fontWeight: 300 }}>
              {totalMentions} mentions · {coveredSignals.length}/{signals.length} stocks covered
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Buy/Hold/Sell counts — only show non-zero */}
          {buys.length > 0 && <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--green)" }}>{buys.length} Buy</span>}
          {holds.length > 0 && <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--amber)" }}>{holds.length} Hold</span>}
          {sells.length > 0 && <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--red)" }}>{sells.length} Sell</span>}

          {(buys.length > 0 || holds.length > 0 || sells.length > 0) && (
            <div style={{ width: "1px", height: "16px", background: "hsl(var(--border))" }} />
          )}

          <button
            onClick={onOpenCart}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "30px",
              padding: "0 12px",
              background: cart.length > 0 ? "hsl(var(--secondary))" : "transparent",
              border: "1px solid hsl(var(--border))",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "12px",
              color: cart.length > 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              transition: "all 0.12s",
            }}
          >
            <ShoppingCart size={12} />
            {cart.length > 0 ? `${cart.length} in cart` : "Cart"}
          </button>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300, marginBottom: "16px" }}>
        Signals derived from news sentiment only — not financial advice.
      </p>

      {/* ── Filter row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {/* Confidence legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span className="mono-label">Confidence</span>
          {Object.entries(CONFIDENCE_CONFIG).map(([key, cfg]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: cfg.color }}>
              {cfg.icon} {cfg.label}
            </span>
          ))}
        </div>

        {/* Trend filter tabs */}
        <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid hsl(var(--border))" }}>
          {([
            { key: "all",  label: `All (${signals.length})` },
            { key: "buy",  label: `Buy (${buys.length})` },
            { key: "hold", label: `Hold (${holds.length})` },
            { key: "sell", label: `Sell (${sells.length})` },
          ] as const).map(({ key, label }) => {
            const active = trendFilter === key;
            return (
              <button
                key={key}
                onClick={() => setTrendFilter(key)}
                style={{
                  padding: "6px 14px",
                  background: "none",
                  border: "none",
                  borderBottom: active ? "1.5px solid hsl(var(--foreground))" : "1.5px solid transparent",
                  marginBottom: "-1px",
                  cursor: "pointer",
                  fontSize: "12.5px",
                  color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  fontWeight: active ? 500 : 400,
                  transition: "color 0.12s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Signal cards grid ── */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 24px" }}>
          <BarChart2 size={22} style={{ color: "hsl(var(--muted-foreground))", margin: "0 auto 10px", display: "block", opacity: 0.3 }} />
          <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
            No {trendFilter !== "all" ? trendFilter : ""} signals found.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: (() => {
              const n = displayed.length;
              if (n <= 3) return `repeat(${n}, minmax(260px, 1fr))`;
              const cols = n % 3 === 1 ? 2 : 3;
              return `repeat(${cols}, minmax(260px, 1fr))`;
            })(),
            gap: "1px",
            background: "hsl(var(--border))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "32px",
          }}
        >
          {displayed.map((signal, i) => (
            <StockSignalCard
              key={signal.ticker}
              signal={signal}
              rank={i}
              onClick={() => setSelectedSignal(signal)}
              inCart={cart.includes(signal.ticker)}
              onCartToggle={(e) => { e.stopPropagation(); onCartToggle(signal.ticker); }}
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
