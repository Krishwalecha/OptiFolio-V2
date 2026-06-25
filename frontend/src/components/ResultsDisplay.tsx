import React from "react";
import { StockEntry } from "./StockInput";
import StockChart from "./StockChart";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PieChart } from "lucide-react";

interface ResultsDisplayProps {
  stocks: StockEntry[] | null;
  optimizedAllocation?: OptimizedAllocation[] | null;
  riskMetric?: number;
  expectedReturn?: number;
}

export interface OptimizedAllocation {
  ticker: string;
  percentage: number;
  amount: number;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  stocks,
  optimizedAllocation = null,
  riskMetric = 0.25,
  expectedReturn = 8.4,
}) => {
  if (!stocks || stocks.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 24px",
          background: "hsl(var(--card) / 0.6)",
          backdropFilter: "blur(8px)",
          border: "1px dashed hsl(var(--border))",
          borderRadius: "10px",
        }}
      >
        <PieChart
          size={32}
          style={{
            margin: "0 auto 16px",
            color: "hsl(var(--muted-foreground))",
            opacity: 0.4,
          }}
        />
        <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))" }}>
          Add stocks and optimize to see results.
        </p>
      </div>
    );
  }

  const displayData =
    optimizedAllocation ||
    stocks.map((s) => ({
      ticker: s.ticker,
      percentage:
        (s.amount / stocks.reduce((sum, x) => sum + x.amount, 0)) * 100,
      amount: s.amount,
    }));

  const totalAmount = displayData.reduce((sum, s) => sum + s.amount, 0);
  const sortedData = [...displayData].sort(
    (a, b) => b.percentage - a.percentage,
  );

  const metrics = [
    {
      label: "Total invested",
      value: `₹${totalAmount.toLocaleString("en-IN")}`,
      sub: `${displayData.length} ${displayData.length === 1 ? "stock" : "stocks"}`,
      color: "hsl(var(--foreground))",
    },
    {
      label: "Expected return",
      value: `${expectedReturn.toFixed(2)}%`,
      sub: `≈ ₹${((totalAmount * expectedReturn) / 100).toLocaleString("en-IN")} gain`,
      color: "var(--green)",
      icon: <TrendingUp size={13} />,
    },
    {
      label: "Risk (volatility)",
      value: `${riskMetric.toFixed(2)}%`,
      sub: "Lower is better",
      color: "var(--blue)",
      icon: <TrendingDown size={13} />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: "1100px", margin: "0 auto" }}
    >
      {/* ── Summary card ── */}
      <motion.div
        custom={0}
        initial="hidden"
        animate="show"
        variants={fadeUp}
        style={{
          background: "hsl(var(--card) / 0.6)",
          backdropFilter: "blur(8px)",
          border: "1px solid hsl(var(--border))",
          borderRadius: "10px",
          overflow: "hidden",
          marginBottom: "32px",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid hsl(var(--border))",
            background: "hsl(var(--secondary) / 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p className="mono-label" style={{ marginBottom: "2px" }}>
              Optimization result
            </p>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Portfolio Summary
            </h2>
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "hsl(var(--muted-foreground))",
              background: "hsl(var(--muted) / 0.5)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "99px",
              padding: "3px 10px",
            }}
          >
            {displayData.length} {displayData.length === 1 ? "stock" : "stocks"}
          </span>
        </div>

        {/* Metrics row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          {metrics.map((m, i) => (
            <div
              key={m.label}
              style={{
                padding: "24px",
                borderRight:
                  i < metrics.length - 1
                    ? "1px solid hsl(var(--border))"
                    : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: "10px",
                }}
              >
                {m.icon && <span style={{ color: m.color }}>{m.icon}</span>}
                <span className="mono-label">{m.label}</span>
              </div>
              <div
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: "2rem",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  color: m.color,
                  marginBottom: "6px",
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                }}
              >
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Allocation breakdown */}
        <div style={{ padding: "24px" }}>
          <p className="mono-label" style={{ marginBottom: "20px" }}>
            Allocation breakdown
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {sortedData.map((item, i) => (
              <motion.div
                key={item.ticker}
                custom={i}
                initial="hidden"
                animate="show"
                variants={fadeUp}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "13px",
                        fontWeight: 500,
                        letterSpacing: "0.02em",
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      {item.ticker}
                    </span>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "13px",
                      color: "hsl(var(--foreground))",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{
                      duration: 0.9,
                      delay: 0.15 + i * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stock charts ── */}
      <div>
        <div style={{ marginBottom: "20px" }}>
          <p className="mono-label">Individual performance</p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          {sortedData.map((stock, i) => (
            <motion.div
              key={stock.ticker}
              custom={i}
              initial="hidden"
              animate="show"
              variants={fadeUp}
            >
              <StockChart ticker={stock.ticker} allocation={stock.percentage} />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsDisplay;
