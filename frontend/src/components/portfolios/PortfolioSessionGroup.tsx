import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import type { PortfolioGroup, PortfolioStock } from "@/features/portfolios/types";
import { fmtDate, reOptimize } from "@/features/portfolios/config";
import AllocationBar from "./AllocationBar";
import StockCard from "./StockCard";

interface PortfolioSessionGroupProps {
  group: PortfolioGroup;
  index: number;
  defaultExpanded: boolean;
  onDelete: (stock: PortfolioStock) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function PortfolioSessionGroup({
  group,
  index,
  defaultExpanded,
  onDelete,
  onDeleteSession,
}: PortfolioSessionGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [headerHovered, setHeaderHovered] = useState(false);
  const totalInvested = group.stocks.reduce((s, st) => s + st.investedInr, 0);
  const hasAmounts = totalInvested > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      style={{
        border: "1px solid hsl(var(--border))",
        borderRadius: "10px",
        overflow: "hidden",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Session header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "15px 20px",
          background: headerHovered
            ? "hsl(var(--secondary) / 0.6)"
            : "hsl(var(--card) / 0.5)",
          cursor: "pointer",
          transition: "background 0.12s ease",
          borderBottom: expanded ? "1px solid hsl(var(--border))" : "none",
        }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={() => setHeaderHovered(true)}
        onMouseLeave={() => setHeaderHovered(false)}
      >
        <div style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        <span
          style={{
            fontSize: "13.5px",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "hsl(var(--foreground))",
            flex: 1,
          }}
        >
          {fmtDate(group.date)}
        </span>

        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
            letterSpacing: "0.04em",
            padding: "2px 8px",
            background: "hsl(var(--secondary) / 0.6)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "5px",
          }}
        >
          {group.stocks.length} {group.stocks.length === 1 ? "stock" : "stocks"}
        </span>

        {hasAmounts && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "hsl(var(--muted-foreground))", letterSpacing: "0.02em" }}>
            ₹{totalInvested >= 100000
              ? `${(totalInvested / 100000).toFixed(1)}L`
              : totalInvested >= 1000
              ? `${(totalInvested / 1000).toFixed(1)}K`
              : totalInvested.toFixed(0)}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            reOptimize(group.stocks.map((s) => s.ticker));
          }}
          title="Re-run optimizer with these tickers"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            background: "transparent",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            fontSize: "12px",
            color: "hsl(var(--muted-foreground))",
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.12s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "hsl(var(--secondary) / 0.7)";
            el.style.color = "hsl(var(--foreground))";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <RefreshCw size={11} /> Re-optimize
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSession(group.sessionId);
          }}
          title="Delete this session"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            background: "transparent",
            border: "1px solid hsl(var(--border))",
            borderRadius: "6px",
            cursor: "pointer",
            color: "hsl(var(--muted-foreground))",
            transition: "all 0.12s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "var(--red-subtle)";
            el.style.borderColor = "var(--red-border)";
            el.style.color = "var(--red)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "transparent";
            el.style.borderColor = "hsl(var(--border))";
            el.style.color = "hsl(var(--muted-foreground))";
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Collapsible body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "20px 24px 24px",
                background: "hsl(var(--card) / 0.3)",
              }}
            >
              <AllocationBar stocks={group.stocks} />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "12px",
                  marginTop: "20px",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {group.stocks.map((stock, si) => (
                    <StockCard
                      key={`${group.date}-${stock.ticker}`}
                      stock={stock}
                      index={si}
                      onDelete={onDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
