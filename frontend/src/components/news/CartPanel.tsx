import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, Trash2, Zap, ArrowRight } from "lucide-react";
import { TREND_CONFIG, Z } from "@/features/news/config";
import type { StockSignal } from "@/features/news/types";

export default function CartPanel({
  cart,
  signals,
  onRemove,
  onClear,
  onGoToOptimizer,
  onClose,
}: {
  cart: string[];
  signals: StockSignal[];
  onRemove: (ticker: string) => void;
  onClear: () => void;
  onGoToOptimizer: () => void;
  onClose: () => void;
}) {
  const signalMap = Object.fromEntries(signals.map((s) => [s.ticker, s]));

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: Z.signalBackdrop,
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
          width: "min(380px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: Z.signalPanel,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShoppingCart size={15} style={{ color: "var(--green)" }} />
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                margin: 0,
                color: "hsl(var(--foreground))",
              }}
            >
              Optimizer Cart
            </h2>
            <span
              style={{
                fontSize: "11px",
                background: "var(--green-subtle)",
                border: "1px solid var(--green-border)",
                color: "var(--green)",
                borderRadius: "99px",
                padding: "1px 7px",
                fontWeight: 500,
              }}
            >
              {cart.length}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {cart.length > 0 && (
              <button
                onClick={onClear}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  background: "transparent",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <Trash2 size={10} /> Clear
              </button>
            )}
            <button
              onClick={onClose}
              style={{
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
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <ShoppingCart
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
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                }}
              >
                No stocks added yet.
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  marginTop: "6px",
                }}
              >
                Click + on any signal card to add stocks.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <AnimatePresence>
                {cart.map((ticker) => {
                  const sig = signalMap[ticker];
                  const tc = sig ? TREND_CONFIG[sig.trend] : TREND_CONFIG.hold;
                  return (
                    <motion.div
                      key={ticker}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        background: "hsl(var(--card)/0.6)",
                        border: "1px solid hsl(var(--border))",
                        borderLeft: `3px solid ${sig ? tc.color : "hsl(var(--border))"}`,
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 500,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {ticker}
                          </span>
                          {sig && (
                            <span
                              style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "99px",
                                background: tc.bg,
                                border: `1px solid ${tc.border}`,
                                color: tc.color,
                                fontWeight: 600,
                              }}
                            >
                              {tc.label}
                            </span>
                          )}
                        </div>
                        {sig && sig.companyName !== sig.ticker && (
                          <p
                            style={{
                              fontSize: "11px",
                              color: "hsl(var(--muted-foreground))",
                              margin: "2px 0 0",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sig.companyName}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(ticker)}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          background: "transparent",
                          border: "1px solid hsl(var(--border))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--red-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <X
                          size={10}
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px",
            borderTop: "1px solid hsl(var(--border))",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
              textAlign: "center",
            }}
          >
            Tickers will be pre-filled in the optimizer
          </p>
          <button
            onClick={onGoToOptimizer}
            disabled={cart.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "11px",
              background:
                cart.length === 0
                  ? "hsl(var(--muted)/0.6)"
                  : "hsl(var(--foreground))",
              color:
                cart.length === 0
                  ? "hsl(var(--muted-foreground))"
                  : "hsl(var(--background))",
              border: "none",
              borderRadius: "8px",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 600,
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => {
              if (cart.length > 0)
                (e.currentTarget as HTMLElement).style.opacity = "0.82";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            <Zap size={14} /> Go to Optimizer ({cart.length} stocks){" "}
            <ArrowRight size={13} />
          </button>
        </div>
      </motion.div>
    </>
  );
}
