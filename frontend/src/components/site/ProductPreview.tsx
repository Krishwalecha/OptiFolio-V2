import React, { useEffect, useRef, useState } from "react";
import { Download, Search } from "lucide-react";
import { NAV } from "@/components/app/nav";
import example from "@/features/market/example-run.json";
import { Mark, PALETTE } from "@/ui";

const W = 1180;
const H = 640;
const line = "var(--hairline)";
const muted = "hsl(var(--muted-foreground))";
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const alloc = example.allocation;
const invested = alloc.reduce((s, a) => s + a.invested_inr, 0);
const perf = example.performance;
const hi = example.constraints.max_weight * 100;

const Box: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ background: "hsl(var(--card))", boxShadow: `inset 0 0 0 1px ${line}`, borderRadius: 16, ...style }}>{children}</div>
);

function Frontier() {
  const w = 300;
  const h = 120;
  const f = example.frontier;
  const xs = f.points.map((p) => p[0]).concat(f.chosen[0]);
  const ys = f.points.map((p) => p[1]).concat(f.chosen[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const X = (v: number) => ((v - x0) / (x1 - x0 || 1)) * (w - 8) + 4;
  const Y = (v: number) => h - 4 - ((v - y0) / (y1 - y0 || 1)) * (h - 8);
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {f.points.map((p, i) => (
        <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={1.7} fill="hsl(var(--foreground) / 0.22)" />
      ))}
      <circle cx={X(f.chosen[0])} cy={Y(f.chosen[1])} r={9} fill="hsl(var(--brand) / 0.18)" />
      <circle cx={X(f.chosen[0])} cy={Y(f.chosen[1])} r={4} fill="hsl(var(--brand))" stroke="hsl(var(--card))" strokeWidth={2} />
      <text x={X(f.chosen[0]) - 12} y={Y(f.chosen[1]) + 4} textAnchor="end" style={{ fontSize: 11, fontWeight: 500, fill: "hsl(var(--foreground))" }}>
        Yours
      </text>
    </svg>
  );
}

function Screen() {
  return (
    <div style={{ width: W, height: H, display: "flex", overflow: "hidden", borderRadius: 18, background: "hsl(var(--background))", color: "hsl(var(--foreground))", textAlign: "left", fontFamily: "Geist, sans-serif", boxShadow: "0 0 0 1px hsl(var(--foreground) / 0.1), 0 50px 100px -30px rgba(0,0,0,0.6)" }}>
      <aside style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${line}`, padding: "18px 12px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 10px" }}>
          <Mark size={19} />
          <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.03em" }}>OptiFolio</span>
        </div>
        <div style={{ marginTop: 18, height: 34, display: "flex", alignItems: "center", gap: 8, padding: "0 11px", boxShadow: `inset 0 0 0 1px ${line}`, borderRadius: 9, fontSize: 12.5, color: muted }}>
          <Search size={13} /> Search
          <span style={{ marginLeft: "auto", fontSize: 10.5 }}>Ctrl K</span>
        </div>
        {NAV.map((g) => (
          <div key={g.group} style={{ marginTop: 22 }}>
            <div style={{ fontSize: 11, color: muted, padding: "0 10px 6px" }}>{g.group}</div>
            {g.items.map(({ label, icon: Icon, path }) => {
              const active = path === "/Optimizer";
              return (
                <div key={label} style={{ height: 34, display: "flex", alignItems: "center", gap: 10, padding: "0 10px", borderRadius: 9, fontSize: 13, color: active ? "hsl(var(--foreground))" : muted, fontWeight: active ? 500 : 400, background: active ? "hsl(var(--foreground) / 0.06)" : "transparent" }}>
                  <Icon size={15} strokeWidth={1.75} color={active ? "hsl(var(--brand))" : undefined} />
                  {label}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: "auto", borderTop: `1px solid ${line}`, padding: "12px 10px 4px", display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: muted }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--green)" }} /> NSE open
          <span style={{ marginLeft: "auto" }}>10:24 IST</span>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "30px 34px", minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1 }}>Your allocation</div>
            <div style={{ marginTop: 9, fontSize: 12.5, color: muted }}>Balanced · Model score weighted · 7 stocks</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ height: 32, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 99, boxShadow: `inset 0 0 0 1px ${line}`, fontSize: 12, color: muted }}>
              <Download size={12} /> CSV
            </span>
            <span style={{ height: 32, display: "inline-flex", alignItems: "center", padding: "0 14px", borderRadius: 99, background: "hsl(var(--foreground))", color: "hsl(var(--background))", fontSize: 12, fontWeight: 500 }}>Save portfolio</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 12, marginTop: 22 }}>
          <Box style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 11.5, color: muted }}>Invested across {alloc.length} stocks</div>
                <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.045em", marginTop: 6, lineHeight: 1 }}>{inr(invested)}</div>
              </div>
              <div style={{ fontSize: 11.5, color: muted, textAlign: "right" }}>
                Cash left <span style={{ color: "hsl(var(--foreground))" }}>{inr(example.investment - invested)}</span>
                <br />
                Limits {Math.round(example.constraints.min_weight * 100)}–{Math.round(hi)}% per stock
              </div>
            </div>
            <div style={{ display: "flex", gap: 2, height: 10, margin: "0 20px", borderRadius: 99, overflow: "hidden" }}>
              {alloc.map((a, i) => (
                <span key={a.ticker} style={{ flexGrow: a.weight_pct, flexBasis: 0, background: PALETTE[i] }} />
              ))}
            </div>
            <div style={{ marginTop: 14, borderTop: `1px solid ${line}` }}>
              {alloc.map((a, i) => (
                <div key={a.ticker} style={{ display: "grid", gridTemplateColumns: "1fr 150px 52px 92px", alignItems: "center", gap: 10, padding: "8.5px 20px", borderBottom: i < alloc.length - 1 ? `1px solid ${line}` : "none", fontSize: 12.5 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: PALETTE[i] }} />
                    {a.ticker}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 40, fontWeight: 500 }}>{a.weight_pct.toFixed(1)}%</span>
                    <span style={{ flex: 1, height: 5, borderRadius: 99, background: "hsl(var(--foreground) / 0.06)", overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(a.weight_pct / hi) * 100}%`, background: PALETTE[i], borderRadius: 99 }} />
                    </span>
                  </span>
                  <span style={{ textAlign: "right" }}>{a.shares}</span>
                  <span style={{ textAlign: "right", color: muted }}>{inr(a.invested_inr)}</span>
                </div>
              ))}
            </div>
          </Box>

          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <Box style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Forecast, next 12 months</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
                {[
                  ["Expected", `${(perf.expected_return * 100).toFixed(1)}%`],
                  ["Volatility", `${(perf.annualised_volatility * 100).toFixed(1)}%`],
                  ["Sharpe", perf.sharpe_ratio.toFixed(2)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: muted }}>{k}</div>
                    <div style={{ fontSize: 21, fontWeight: 500, letterSpacing: "-0.04em", marginTop: 5 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Box>
            <Box style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Where this mix sits</div>
                <div style={{ fontSize: 11, color: muted }}>vs {example.frontier.n.toLocaleString("en-IN")} random mixes</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <Frontier />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 10.5, color: muted }}>
                <span>Lower risk</span>
                <span>Higher risk</span>
              </div>
            </Box>
            <Box style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Risk</div>
                <span style={{ fontSize: 10.5, color: muted }}>this mix</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
                {[
                  ["Volatility", `${(example.performance.annualised_volatility * 100).toFixed(1)}%`],
                  ["Worst fall", `${(example.performance.max_drawdown * 100).toFixed(1)}%`],
                  ["Beta", example.performance.beta.toFixed(2)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: muted }}>{k}</div>
                    <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.03em", marginTop: 4 }}>{v}</div>
                  </div>
                ))}
              </div>
            </Box>
          </div>
        </div>
      </main>
    </div>
  );
}

const ProductPreview: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full" style={{ height: H * scale }} aria-label="OptiFolio results screen showing a real optimization" role="img">
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: W }}>
        <Screen />
      </div>
    </div>
  );
};

export default ProductPreview;
