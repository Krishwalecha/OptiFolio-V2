import React, { useState } from "react";
import StockChart, { ChartPoint } from "./charts/StockChart";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, PieChart, ShieldCheck, ChevronDown, XCircle, Plus, CheckCircle2, Loader2 } from "lucide-react";
import { OptimizeResult, DroppedStock } from "@/services/optimizerService";

interface ResultsDisplayProps {
  result: OptimizeResult;
  onSave?: () => void;
  isSaving?: boolean;
  saved?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
};

const RISK_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  conservative: { label: "Conservative", color: "var(--blue)",  bg: "var(--blue-subtle)",  border: "var(--blue-border)"  },
  balanced:     { label: "Balanced",     color: "var(--green)", bg: "var(--green-subtle)", border: "var(--green-border)" },
  aggressive:   { label: "Aggressive",   color: "var(--red)",   bg: "var(--red-subtle)",   border: "var(--red-border)"   },
};

type ChartPeriod = "1Y" | "3Y" | "5Y";

function filterByPeriod(data: ChartPoint[], period: ChartPeriod): ChartPoint[] {
  if (!data.length) return data;
  const now = new Date();
  const years = period === "1Y" ? 1 : period === "3Y" ? 3 : 5;
  const cutoff = new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
  return data.filter((d) => new Date(d.date) >= cutoff);
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, onSave, isSaving, saved }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("5Y");
  const { allocation, performance, risk_profile, strategy, investment, chart_data, dropped_stocks } = result;

  if (!allocation?.length) {
    return (
      <div style={{
        textAlign: "center", padding: "64px 24px",
        background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)",
        border: "1px dashed hsl(var(--border))", borderRadius: "10px",
      }}>
        <PieChart size={32} style={{ margin: "0 auto 16px", color: "hsl(var(--muted-foreground))", opacity: 0.4 }} />
        <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))" }}>
          No allocation data.
        </p>
      </div>
    );
  }

  const totalInvested = allocation.reduce((s, a) => s + a.invested_inr, 0);
  const riskMeta = RISK_META[risk_profile] ?? RISK_META.balanced;
  const retPct   = (performance.expected_return * 100).toFixed(2);
  const volPct   = (performance.annualised_volatility * 100).toFixed(2);
  const sortedAlloc = [...allocation].sort((a, b) => b.weight_pct - a.weight_pct);

  const metrics = [
    {
      label: "Total invested",
      value: `₹${totalInvested.toLocaleString("en-IN")}`,
      sub:   `${allocation.length} stocks · ${strategy}`,
      color: "hsl(var(--foreground))",
    },
    {
      label: "Expected return",
      value: `${retPct}%`,
      sub:   `≈ ₹${(totalInvested * performance.expected_return).toLocaleString("en-IN", { maximumFractionDigits: 0 })} gain`,
      color: Number(retPct) >= 0 ? "var(--green)" : "var(--red)",
      icon:  <TrendingUp size={13} />,
    },
    {
      label: "Volatility (ann.)",
      value: `${volPct}%`,
      sub:   `Sharpe ${performance.sharpe_ratio.toFixed(2)}  ·  Max DD ${(performance.max_drawdown * 100).toFixed(1)}%`,
      color: "var(--blue)",
      icon:  <TrendingDown size={13} />,
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={{ maxWidth: "1100px", margin: "0 auto" }}>

      {/* ── Summary card ── */}
      <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp}
        style={{
          background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)",
          border: "1px solid hsl(var(--border))", borderRadius: "10px",
          overflow: "hidden", marginBottom: "32px",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--secondary) / 0.5)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p className="mono-label" style={{ marginBottom: "2px" }}>Optimization result</p>
            <h2 style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.02em", color: "hsl(var(--foreground))", margin: 0 }}>
              Portfolio Summary
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Risk badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "99px",
              background: riskMeta.bg, border: `1px solid ${riskMeta.border}`,
            }}>
              <ShieldCheck size={12} style={{ color: riskMeta.color }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", letterSpacing: "0.05em", textTransform: "uppercase", color: riskMeta.color }}>
                {riskMeta.label}
              </span>
            </div>

            {/* Add to portfolio */}
            {onSave && (
              saved ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "hsl(var(--card) / 0.6)", border: "1px solid hsl(var(--border))", borderRadius: "7px", fontSize: "13px", color: "hsl(var(--muted-foreground))" }}>
                  <CheckCircle2 size={13} style={{ color: "#22c55e" }} /> Saved
                </div>
              ) : (
                <button
                  disabled={isSaving}
                  onClick={onSave}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 14px", background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))", border: "none", borderRadius: "7px",
                    fontSize: "13px", fontWeight: 500, cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1, fontFamily: "'Inter', sans-serif",
                    transition: "opacity 0.12s ease",
                  }}
                >
                  {isSaving ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Plus size={13} />}
                  Add to portfolio
                </button>
              )
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderBottom: "1px solid hsl(var(--border))" }}>
          {metrics.map((m, i) => (
            <div key={m.label} style={{ padding: "24px", borderRight: i < metrics.length - 1 ? "1px solid hsl(var(--border))" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px" }}>
                {m.icon && <span style={{ color: m.color }}>{m.icon}</span>}
                <span className="mono-label">{m.label}</span>
              </div>
              <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "2rem", letterSpacing: "-0.03em", lineHeight: 1, color: m.color, marginBottom: "6px" }}>
                {m.value}
              </div>
              <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Allocation breakdown */}
        <div style={{ padding: "24px" }}>
          <p className="mono-label" style={{ marginBottom: "20px" }}>Allocation breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {sortedAlloc.map((item, i) => (
              <motion.div key={item.ticker} custom={i} initial="hidden" animate="show" variants={fadeUp}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, letterSpacing: "0.02em", color: "hsl(var(--foreground))" }}>
                      {item.ticker}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                      {item.weight_pct.toFixed(1)}%
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>
                      {item.shares} shares @ ₹{item.price_inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}>
                    ₹{Math.round(item.invested_inr).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="progress-track">
                  <motion.div className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${item.weight_pct}%` }}
                    transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </motion.div>

      {/* ── Advanced Information ── */}
      <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp} style={{ marginBottom: "12px" }}>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{
            width: "100%", padding: "14px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)",
            border: "1px solid hsl(var(--border))", borderRadius: showAdvanced ? "10px 10px 0 0" : "10px",
            cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--card) / 0.6)"; }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="mono-label">Advanced information</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "hsl(var(--muted) / 0.5)", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
              {performance.n_days} trading days
            </span>
          </div>
          <ChevronDown size={14} style={{ color: "hsl(var(--muted-foreground))", transition: "transform 0.2s ease", transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)",
                border: "1px solid hsl(var(--border))", borderTop: "none",
                borderRadius: "0 0 10px 10px", padding: "24px",
              }}>
                {/* Historical return */}
                <div style={{ marginBottom: "8px", padding: "12px 16px", background: "hsl(var(--secondary) / 0.5)", borderRadius: "8px", border: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="mono-label" style={{ marginBottom: "3px" }}>Historical annualised return</div>
                    <div style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>Actual CAGR of this portfolio over the data period (backward-looking)</div>
                  </div>
                  <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "1.6rem", letterSpacing: "-0.03em", color: (performance.annualised_return_hist ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                    {((performance.annualised_return_hist ?? 0) * 100).toFixed(2)}%
                  </div>
                </div>

                {/* Core risk stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "8px" }}>
                  {[
                    {
                      label: "Sharpe Ratio",
                      value: performance.sharpe_ratio.toFixed(2),
                      desc: "Return per unit of risk. Above 1 = good.",
                      color: performance.sharpe_ratio >= 1 ? "var(--green)" : performance.sharpe_ratio >= 0 ? "var(--amber)" : "var(--red)",
                    },
                    {
                      label: "Sortino Ratio",
                      value: performance.sortino_ratio.toFixed(2),
                      desc: "Like Sharpe but only penalises downside risk.",
                      color: performance.sortino_ratio >= 1 ? "var(--green)" : performance.sortino_ratio >= 0 ? "var(--amber)" : "var(--red)",
                    },
                    {
                      label: "Max Drawdown",
                      value: `${(performance.max_drawdown * 100).toFixed(1)}%`,
                      desc: "Worst peak-to-trough drop historically.",
                      color: "var(--red)",
                    },
                    {
                      label: "VaR (95%)",
                      value: `${(performance.var_95 * 100).toFixed(1)}%`,
                      desc: "Daily loss limit on 95% of days.",
                      color: "var(--amber)",
                    },
                  ].map((m) => (
                    <div key={m.label} style={{
                      padding: "14px 16px", background: "hsl(var(--secondary) / 0.5)", backdropFilter: "blur(8px)",
                      border: "1px solid hsl(var(--border))", borderRadius: "8px",
                    }}>
                      <div className="mono-label" style={{ marginBottom: "6px" }}>{m.label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 600, color: m.color, marginBottom: "5px", letterSpacing: "-0.01em" }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.45 }}>
                        {m.desc}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Metric grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[
                    {
                      label: "Calmar Ratio",
                      value: performance.calmar_ratio.toFixed(2),
                      desc: "Annualised return ÷ max drawdown. Higher = better recovery from crashes.",
                      color: performance.calmar_ratio >= 1 ? "var(--green)" : performance.calmar_ratio >= 0.5 ? "var(--amber)" : "var(--red)",
                    },
                    {
                      label: "Omega Ratio",
                      value: performance.omega_ratio > 999 ? "∞" : performance.omega_ratio.toFixed(2),
                      desc: "Probability-weighted gains vs losses. Above 1 = more gains than losses.",
                      color: performance.omega_ratio >= 1.5 ? "var(--green)" : performance.omega_ratio >= 1 ? "var(--amber)" : "var(--red)",
                    },
                    {
                      label: "Tail Ratio",
                      value: performance.tail_ratio.toFixed(2),
                      desc: "95th pct gain ÷ 5th pct loss. >1 means upside tail is fatter than downside.",
                      color: performance.tail_ratio >= 1 ? "var(--green)" : "var(--red)",
                    },
                    {
                      label: "Hit Rate",
                      value: `${(performance.hit_rate * 100).toFixed(1)}%`,
                      desc: "% of trading days with a positive return.",
                      color: performance.hit_rate >= 0.54 ? "var(--green)" : performance.hit_rate >= 0.5 ? "var(--amber)" : "var(--red)",
                    },
                    {
                      label: "CVaR (95%)",
                      value: `${(performance.cvar_95 * 100).toFixed(1)}%`,
                      desc: "Average daily loss on the worst 5% of days (expected shortfall).",
                      color: "var(--red)",
                    },
                    {
                      label: "VaR (99%)",
                      value: `${(performance.var_99 * 100).toFixed(1)}%`,
                      desc: "On 99% of days, your daily loss won't exceed this.",
                      color: "var(--amber)",
                    },
                    {
                      label: "Beta (Nifty 50)",
                      value: performance.beta ? performance.beta.toFixed(2) : "—",
                      desc: "Sensitivity to Nifty 50 moves. 1 = moves with market, <1 = defensive.",
                      color: performance.beta && performance.beta < 1 ? "var(--green)" : performance.beta && performance.beta > 1.3 ? "var(--red)" : "var(--amber)",
                    },
                    {
                      label: "DD Duration",
                      value: `${performance.drawdown_duration_d}d`,
                      desc: "Longest number of consecutive days the portfolio stayed below its peak.",
                      color: performance.drawdown_duration_d < 90 ? "var(--green)" : performance.drawdown_duration_d < 250 ? "var(--amber)" : "var(--red)",
                    },
                    {
                      label: "Data window",
                      value: `${Math.round(performance.n_days / 252 * 10) / 10}y`,
                      desc: `${performance.n_days} trading days of historical data used in analysis.`,
                      color: "hsl(var(--muted-foreground))",
                    },
                  ].map((m) => (
                    <div key={m.label} style={{
                      padding: "14px 16px", background: "hsl(var(--secondary) / 0.5)", backdropFilter: "blur(8px)",
                      border: "1px solid hsl(var(--border))", borderRadius: "8px",
                    }}>
                      <div className="mono-label" style={{ marginBottom: "6px" }}>{m.label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px", fontWeight: 600, color: m.color, marginBottom: "5px", letterSpacing: "-0.01em" }}>
                        {m.value}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.45 }}>
                        {m.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Stock charts ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <p className="mono-label">Individual performance · {chartPeriod}</p>
          <div style={{ display: "flex", gap: "4px" }}>
            {(["1Y", "3Y", "5Y"] as ChartPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setChartPeriod(p)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.04em",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${chartPeriod === p ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))"}`,
                  background: chartPeriod === p ? "hsl(var(--secondary))" : "transparent",
                  color: chartPeriod === p ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", alignItems: "stretch" }}>
          {sortedAlloc.map((stock, i) => {
            const score = result.scores?.[stock.ticker];
            return (
              <motion.div key={stock.ticker} custom={i} initial="hidden" animate="show" variants={fadeUp} style={{ display: "flex", flexDirection: "column" }}>
                <StockChart
                  key={`${stock.ticker}-${chartPeriod}`}
                  ticker={stock.ticker}
                  allocation={stock.weight_pct}
                  chartData={filterByPeriod((chart_data?.[stock.ticker] ?? []) as ChartPoint[], chartPeriod)}
                  reason={score ? {
                    predictedReturn: score.predicted_return,
                    compositeScore: score.composite_score,
                    dirAccuracy: score.dir_accuracy,
                    ic: score.ic ?? 0,
                  } : undefined}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Dropped stocks ── */}
      {dropped_stocks?.length > 0 && (
        <motion.div custom={3} initial="hidden" animate="show" variants={fadeUp} style={{ marginTop: "32px" }}>
          <p className="mono-label" style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <XCircle size={13} style={{ color: "var(--red)" }} />
            Not selected · {dropped_stocks.length} stock{dropped_stocks.length > 1 ? "s" : ""} excluded
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {dropped_stocks.map((s: DroppedStock) => (
              <div key={s.ticker} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px",
                background: "hsl(var(--card) / 0.4)", backdropFilter: "blur(8px)",
                border: "1px solid hsl(var(--border))", borderRadius: "8px",
                gap: "16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: "13px",
                    fontWeight: 500, letterSpacing: "0.02em",
                    color: "hsl(var(--muted-foreground))",
                    textDecoration: "line-through", flexShrink: 0,
                  }}>{s.ticker}</span>
                  <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300, minWidth: 0 }}>
                    {s.reason}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "16px", flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: s.predicted_return_pct < 0 ? "var(--red)" : "hsl(var(--muted-foreground))" }}>
                      {s.predicted_return_pct > 0 ? "+" : ""}{s.predicted_return_pct.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>predicted</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
                      {s.ic > 0 ? "+" : ""}{s.ic.toFixed(3)}
                    </div>
                    <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>IC</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ResultsDisplay;
