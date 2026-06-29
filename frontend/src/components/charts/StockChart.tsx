import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { TrendingUp, TrendingDown, AlertCircle, ArrowUpRight } from "lucide-react";
import {
  type ChartPoint,
  type AllocationReason,
  computeAnnVol,
  computeTrend,
  computeMaxDD,
  mlTrustLevel,
  isMlTrusted,
  allocationSummary,
  modalAnalysis,
} from "@/features/charts/stockChartUtils";
import StockChartModal from "./StockChartModal";

export type { ChartPoint };

interface StockChartProps {
  ticker: string;
  allocation: number;
  investedInr?: number;
  chartData?: ChartPoint[];
  reason?: AllocationReason;
}

const API_BASE = import.meta.env.VITE_API_URL as string;

const StockChart: React.FC<StockChartProps> = ({ ticker, allocation, investedInr, chartData, reason }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, date: "", price: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [fetchedData, setFetchedData] = useState<ChartPoint[] | null>(null);

  useEffect(() => {
    if (chartData !== undefined || !ticker) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/stockHistory/${encodeURIComponent(ticker)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (!cancelled) setFetchedData(d.points ?? []); })
      .catch(() => { if (!cancelled) setFetchedData([]); });
    return () => { cancelled = true; };
  }, [ticker, chartData]);

  const isLoadingData = chartData === undefined && fetchedData === null;
  const data = chartData ?? fetchedData ?? [];
  const hasData = data.length > 0;

  const currentPrice = hasData ? data[data.length - 1].close : 0;
  const startPrice = hasData ? data[0].close : 0;
  const change = hasData ? ((currentPrice - startPrice) / startPrice) * 100 : 0;
  const isPos = change >= 0;
  const lineColor = isPos ? "#22c55e" : "#ef4444";
  const lineColorVar = isPos ? "var(--green)" : "var(--red)";
  const high = hasData ? Math.max(...data.map((d) => d.close)) : 0;
  const low = hasData ? Math.min(...data.map((d) => d.close)) : 0;
  const avgVol = hasData ? data.reduce((s, d) => s + d.volume, 0) / data.length : 0;

  const vol   = useMemo(() => computeAnnVol(data), [data]);
  const t90   = useMemo(() => computeTrend(data, 90), [data]);
  const t30   = useMemo(() => computeTrend(data, 30), [data]);
  const maxDd = useMemo(() => computeMaxDD(data), [data]);

  const trusted    = reason ? isMlTrusted(reason.ic, reason.dirAccuracy) : false;
  const trustLevel = reason ? mlTrustLevel(reason.ic, reason.dirAccuracy) : "hist" as const;
  const summary    = useMemo(() => (reason ? allocationSummary(reason, change) : ""), [reason, change]);
  const { strengths, concerns } = useMemo(
    () => reason ? modalAnalysis(reason, allocation, change, vol, t90, t30, maxDd) : { strengths: [], concerns: [] },
    [reason, allocation, change, vol, t90, t30, maxDd],
  );

  useEffect(() => {
    if (!svgRef.current || !hasData) return;
    const svg = svgRef.current;
    svg.querySelectorAll("path, circle, line, rect, defs").forEach((el) => el.remove());

    const W = 400, H = 160, P = 20, cW = W - 2 * P, cH = H - 2 * P;
    const prices = data.map((d) => d.close);
    const minP = Math.min(...prices) * 0.97;
    const maxP = Math.max(...prices) * 1.03;
    const xPos = (i: number) => P + (i / (data.length - 1)) * cW;
    const yPos = (p: number) => P + cH - ((p - minP) / (maxP - minP)) * cH;

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
    grad.setAttribute("id", `g-${ticker}`);
    grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "0%"); grad.setAttribute("y2", "100%");
    const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", lineColor); s1.setAttribute("stop-opacity", "0.15");
    const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", lineColor); s2.setAttribute("stop-opacity", "0.02");
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

    let areaD = `M ${xPos(0)} ${yPos(data[0].close)}`;
    data.forEach((pt, i) => { if (i > 0) areaD += ` L ${xPos(i)} ${yPos(pt.close)}`; });
    areaD += ` L ${xPos(data.length - 1)} ${P + cH} L ${P} ${P + cH} Z`;
    const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
    area.setAttribute("d", areaD); area.setAttribute("fill", `url(#g-${ticker})`);
    svg.appendChild(area);

    let lineD = `M ${xPos(0)} ${yPos(data[0].close)}`;
    data.forEach((pt, i) => { if (i > 0) lineD += ` L ${xPos(i)} ${yPos(pt.close)}`; });
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", lineD); line.setAttribute("fill", "none");
    line.setAttribute("stroke", lineColor); line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-linecap", "round"); line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);

    for (let i = 0; i <= 3; i++) {
      const gl = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const ly = P + (i / 3) * cH;
      gl.setAttribute("x1", P.toString()); gl.setAttribute("x2", (P + cW).toString());
      gl.setAttribute("y1", ly.toString()); gl.setAttribute("y2", ly.toString());
      gl.setAttribute("stroke", isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)");
      gl.setAttribute("stroke-dasharray", "3,3");
      svg.appendChild(gl);
    }

    data.forEach((pt, i) => {
      const px = xPos(i), py = yPos(pt.close), hw = cW / data.length;
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      hit.setAttribute("x", (px - hw / 2).toString()); hit.setAttribute("y", "0");
      hit.setAttribute("width", hw.toString()); hit.setAttribute("height", H.toString());
      hit.setAttribute("fill", "transparent");
      hit.addEventListener("mouseenter", () => {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", px.toString()); dot.setAttribute("cy", py.toString());
        dot.setAttribute("r", "3.5"); dot.setAttribute("fill", lineColor);
        dot.setAttribute("stroke", isDark ? "#0a0a0a" : "#fff"); dot.setAttribute("stroke-width", "2");
        dot.setAttribute("id", "hover-dot"); svg.appendChild(dot);
        const vl = document.createElementNS("http://www.w3.org/2000/svg", "line");
        vl.setAttribute("x1", px.toString()); vl.setAttribute("x2", px.toString());
        vl.setAttribute("y1", P.toString()); vl.setAttribute("y2", (P + cH).toString());
        vl.setAttribute("stroke", isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)");
        vl.setAttribute("stroke-dasharray", "3,3"); vl.setAttribute("id", "hover-line");
        svg.appendChild(vl);
        setTooltip({ visible: true, x: px, y: py, date: pt.date, price: pt.close });
      });
      hit.addEventListener("mouseleave", () => {
        svg.querySelector("#hover-dot")?.remove();
        svg.querySelector("#hover-line")?.remove();
        setTooltip((p) => ({ ...p, visible: false }));
      });
      svg.appendChild(hit);
    });
  }, [data, isDark, ticker, hasData]);

  if (isLoadingData) {
    return (
      <div style={{ background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "10px", minHeight: "360px", display: "flex", flexDirection: "column", padding: "20px", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ width: "72px", height: "14px", borderRadius: "4px", background: "hsl(var(--muted)/0.4)", animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ width: "48px", height: "12px", borderRadius: "4px", background: "hsl(var(--muted)/0.3)", animation: "pulse 1.4s ease-in-out infinite" }} />
        </div>
        <div style={{ flex: 1, minHeight: "200px", borderRadius: "6px", background: "hsl(var(--muted)/0.15)", animation: "pulse 1.4s ease-in-out infinite" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          {[80, 64, 72].map((w, i) => (
            <div key={i} style={{ width: `${w}px`, height: "10px", borderRadius: "4px", background: "hsl(var(--muted)/0.3)", animation: "pulse 1.4s ease-in-out infinite" }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div style={{ background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px solid var(--red-border)", borderRadius: "10px", padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "360px", gap: "12px", textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--red-subtle)", border: "1px solid var(--red-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlertCircle size={16} style={{ color: "var(--red)" }} />
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, letterSpacing: "0.04em", color: "var(--red)", marginBottom: "4px" }}>{ticker}</div>
          <div style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>No chart data available</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{ background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column", height: "100%", transition: "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease" }}
        onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "hsl(var(--secondary) / 0.7)"; el.style.borderColor = "hsl(var(--muted-foreground) / 0.22)"; el.style.boxShadow = "0 4px 20px hsl(var(--foreground) / 0.05)"; }}
        onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "hsl(var(--card) / 0.6)"; el.style.borderColor = "hsl(var(--border))"; el.style.boxShadow = "none"; }}
      >
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, letterSpacing: "0.04em", color: "hsl(var(--foreground))" }}>{ticker}</span>
              {isPos ? <TrendingUp size={12} style={{ color: "var(--green)" }} /> : <TrendingDown size={12} style={{ color: "var(--red)" }} />}
              {reason && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", letterSpacing: "0.05em", padding: "2px 6px", borderRadius: "4px", background: trustLevel === "strong" ? "var(--green-subtle)" : trustLevel === "partial" ? "hsl(var(--amber) / 0.12)" : "hsl(var(--muted) / 0.5)", color: trustLevel === "strong" ? "var(--green)" : trustLevel === "partial" ? "var(--amber)" : "hsl(var(--muted-foreground))", border: `1px solid ${trustLevel === "strong" ? "var(--green-border)" : trustLevel === "partial" ? "var(--amber-border)" : "hsl(var(--border))"}` }}>
                  {trustLevel === "strong" ? "ML" : trustLevel === "partial" ? "ML~" : "HIST"}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 500, letterSpacing: "-0.01em", color: "hsl(var(--foreground))" }}>₹{currentPrice.toLocaleString("en-IN")}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: lineColorVar }}>{isPos ? "+" : ""}{change.toFixed(2)}%</span>
            </div>
          </div>
          <div style={{ textAlign: "right", padding: "5px 10px", borderRadius: "7px", background: "hsl(var(--secondary) / 0.5)", border: "1px solid hsl(var(--border))" }}>
            <div className="mono-label" style={{ marginBottom: "2px" }}>Allocation</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, color: "hsl(var(--foreground))" }}>{allocation.toFixed(1)}%</div>
            {investedInr != null && investedInr > 0 && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>
                ₹{investedInr >= 100000 ? `${(investedInr / 100000).toFixed(1)}L` : investedInr >= 1000 ? `${(investedInr / 1000).toFixed(1)}K` : investedInr.toFixed(0)}
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg ref={svgRef} style={{ width: "100%", height: "160px", display: "block" }} viewBox="0 0 400 160" preserveAspectRatio="xMidYMid meet" />
          {tooltip.visible && (
            <div style={{ position: "absolute", left: `${tooltip.x}px`, top: `${Math.max(8, tooltip.y - 48)}px`, transform: "translateX(-50%)", background: "hsl(var(--popover) / 0.9)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "7px", padding: "5px 10px", pointerEvents: "none", zIndex: 10, boxShadow: "0 4px 16px hsl(var(--foreground) / 0.08)", whiteSpace: "nowrap" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "hsl(var(--muted-foreground))", marginBottom: "1px" }}>{tooltip.date}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 500, color: "hsl(var(--foreground))" }}>₹{tooltip.price.toLocaleString("en-IN")}</div>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid hsl(var(--border))", flexShrink: 0 }}>
          {[
            { label: "High",    value: `₹${high.toLocaleString("en-IN")}`,  color: "var(--green)" },
            { label: "Low",     value: `₹${low.toLocaleString("en-IN")}`,   color: "var(--red)"   },
            { label: "Avg Vol", value: `${(avgVol / 1000).toFixed(0)}K`,    color: "var(--amber)" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "10px 14px", textAlign: "center", borderRight: i < 2 ? "1px solid hsl(var(--border))" : "none" }}>
              <div className="mono-label" style={{ marginBottom: "3px" }}>{s.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Analysis summary */}
        {reason && (
          <div style={{ borderTop: "1px solid hsl(var(--border))", padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", justifyContent: "space-between" }}>
              <p style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.5, margin: 0, flex: 1 }}>{summary}</p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, padding: "3px 8px", background: "hsl(var(--secondary) / 0.6)", border: "1px solid hsl(var(--border))", borderRadius: "5px", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: "9.5px", letterSpacing: "0.04em", color: "hsl(var(--muted-foreground))", transition: "all 0.15s ease", whiteSpace: "nowrap" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "hsl(var(--foreground))"; el.style.borderColor = "hsl(var(--muted-foreground) / 0.4)"; el.style.background = "hsl(var(--secondary))"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "hsl(var(--muted-foreground))"; el.style.borderColor = "hsl(var(--border))"; el.style.background = "hsl(var(--secondary) / 0.6)"; }}
              >
                Analysis <ArrowUpRight size={9} />
              </button>
            </div>
          </div>
        )}
      </div>

      {reason && (
        <StockChartModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          ticker={ticker}
          allocation={allocation}
          summary={summary}
          reason={reason}
          trustLevel={trustLevel}
          trusted={trusted}
          strengths={strengths}
          concerns={concerns}
          vol={vol}
          maxDd={maxDd}
          t90={t90}
          t30={t30}
        />
      )}
    </>
  );
};

export default StockChart;
