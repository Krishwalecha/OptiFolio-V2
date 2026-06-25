import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { TrendingUp, TrendingDown, Loader2, X } from "lucide-react";
import { FundData } from "@/context/MFContext";

interface NavEntry {
  date: string;
  nav: number;
}
interface FundNavChartProps {
  fund: FundData;
  onClose: () => void;
}

const NAV_CACHE_TTL = 24 * 60 * 60 * 1000;

function readNavCache(schemeCode: number): NavEntry[] | null {
  try {
    const raw = localStorage.getItem(`mf_nav_${schemeCode}`);
    if (!raw) return null;
    const { data, fetchedAt } = JSON.parse(raw);
    if (Date.now() - fetchedAt > NAV_CACHE_TTL) return null;
    return data as NavEntry[];
  } catch {
    return null;
  }
}
function writeNavCache(schemeCode: number, data: NavEntry[]) {
  try {
    localStorage.setItem(
      `mf_nav_${schemeCode}`,
      JSON.stringify({ data, fetchedAt: Date.now() }),
    );
  } catch {}
}
function parseNavDate(s: string): Date {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const FundNavChart: React.FC<FundNavChartProps> = ({ fund, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [history, setHistory] = useState<NavEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: "",
    nav: 0,
  });
  const [range, setRange] = useState<"1Y" | "3Y" | "5Y">("1Y");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setHistory([]);
    const cached = readNavCache(fund.schemeCode);
    if (cached) {
      setHistory(cached);
      setLoading(false);
      return;
    }
    fetch(`https://api.mfapi.in/mf/${fund.schemeCode}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.status !== "SUCCESS" || !j.data?.length) {
          setError(true);
          setLoading(false);
          return;
        }
        const entries: NavEntry[] = (j.data as { date: string; nav: string }[])
          .map((d) => ({ date: d.date, nav: parseFloat(d.nav) }))
          .filter((d) => !isNaN(d.nav))
          .reverse();
        writeNavCache(fund.schemeCode, entries);
        setHistory(entries);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fund.schemeCode]);

  const data = React.useMemo(() => {
    if (!history.length) return [];
    const cutoff = new Date();
    cutoff.setFullYear(
      cutoff.getFullYear() - (range === "1Y" ? 1 : range === "3Y" ? 3 : 5),
    );
    return history.filter((d) => parseNavDate(d.date) >= cutoff);
  }, [history, range]);

  const currentNav = data.length ? data[data.length - 1].nav : fund.latestNav;
  const firstNav = data.length ? data[0].nav : fund.latestNav;
  const changePct = data.length
    ? ((currentNav - firstNav) / firstNav) * 100
    : 0;
  const isPos = changePct >= 0;
  const lineColor = isPos ? "#22c55e" : "#ef4444";
  const high = data.length ? Math.max(...data.map((d) => d.nav)) : 0;
  const low = data.length ? Math.min(...data.map((d) => d.nav)) : 0;

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const svg = svgRef.current;
    svg
      .querySelectorAll("path, circle, line, rect, defs")
      .forEach((el) => el.remove());
    const W = 400,
      H = 160,
      P = 20,
      cW = W - 2 * P,
      cH = H - 2 * P;
    const minP = Math.min(...data.map((d) => d.nav)) * 0.96;
    const maxP = Math.max(...data.map((d) => d.nav)) * 1.04;
    const x = (i: number) => P + (i / (data.length - 1)) * cW;
    const y = (p: number) => P + cH - ((p - minP) / (maxP - minP)) * cH;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient",
    );
    grad.setAttribute("id", `gnav-${fund.schemeCode}`);
    grad.setAttribute("x1", "0%");
    grad.setAttribute("y1", "0%");
    grad.setAttribute("x2", "0%");
    grad.setAttribute("y2", "100%");
    const s1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s1.setAttribute("offset", "0%");
    s1.setAttribute("stop-color", lineColor);
    s1.setAttribute("stop-opacity", "0.15");
    const s2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    s2.setAttribute("offset", "100%");
    s2.setAttribute("stop-color", lineColor);
    s2.setAttribute("stop-opacity", "0.02");
    grad.appendChild(s1);
    grad.appendChild(s2);
    defs.appendChild(grad);
    svg.appendChild(defs);
    let areaD = `M ${x(0)} ${y(data[0].nav)}`;
    data.forEach((pt, i) => {
      if (i > 0) areaD += ` L ${x(i)} ${y(pt.nav)}`;
    });
    areaD += ` L ${x(data.length - 1)} ${P + cH} L ${P} ${P + cH} Z`;
    const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
    area.setAttribute("d", areaD);
    area.setAttribute("fill", `url(#gnav-${fund.schemeCode})`);
    svg.appendChild(area);
    let lineD = `M ${x(0)} ${y(data[0].nav)}`;
    data.forEach((pt, i) => {
      if (i > 0) lineD += ` L ${x(i)} ${y(pt.nav)}`;
    });
    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    line.setAttribute("d", lineD);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", lineColor);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);
    for (let i = 0; i <= 3; i++) {
      const gl = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const ly = P + (i / 3) * cH;
      gl.setAttribute("x1", P.toString());
      gl.setAttribute("x2", (P + cW).toString());
      gl.setAttribute("y1", ly.toString());
      gl.setAttribute("y2", ly.toString());
      gl.setAttribute(
        "stroke",
        isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      );
      gl.setAttribute("stroke-dasharray", "3,3");
      svg.appendChild(gl);
    }
    const step = Math.max(1, Math.floor(data.length / 80));
    const sampled = data.filter(
      (_, i) => i % step === 0 || i === data.length - 1,
    );
    sampled.forEach((pt) => {
      const px = x(data.indexOf(pt)),
        py = y(pt.nav),
        hw = cW / sampled.length;
      const hit = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      hit.setAttribute("x", (px - hw / 2).toString());
      hit.setAttribute("y", "0");
      hit.setAttribute("width", hw.toString());
      hit.setAttribute("height", H.toString());
      hit.setAttribute("fill", "transparent");
      hit.addEventListener("mouseenter", () => {
        const dot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        dot.setAttribute("cx", px.toString());
        dot.setAttribute("cy", py.toString());
        dot.setAttribute("r", "3.5");
        dot.setAttribute("fill", lineColor);
        dot.setAttribute("stroke", isDark ? "#0a0a0a" : "#fff");
        dot.setAttribute("stroke-width", "2");
        dot.setAttribute("id", "nav-hover-dot");
        svg.appendChild(dot);
        const vl = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        vl.setAttribute("x1", px.toString());
        vl.setAttribute("x2", px.toString());
        vl.setAttribute("y1", P.toString());
        vl.setAttribute("y2", (P + cH).toString());
        vl.setAttribute(
          "stroke",
          isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        );
        vl.setAttribute("stroke-dasharray", "3,3");
        vl.setAttribute("id", "nav-hover-line");
        svg.appendChild(vl);
        setTooltip({ visible: true, x: px, y: py, date: pt.date, nav: pt.nav });
      });
      hit.addEventListener("mouseleave", () => {
        svg.querySelector("#nav-hover-dot")?.remove();
        svg.querySelector("#nav-hover-line")?.remove();
        setTooltip((prev) => ({ ...prev, visible: false }));
      });
      svg.appendChild(hit);
    });
  }, [data, isDark, fund.schemeCode, lineColor]);

  return (
    <div
      style={{
        background: "hsl(var(--card) / 0.6)",
        backdropFilter: "blur(8px)",
        border: "1px solid hsl(var(--border))",
        borderRadius: "10px",
        overflow: "hidden",
        transition: "background 0.15s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid hsl(var(--border))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "hsl(var(--foreground))",
              }}
            >
              {fund.name}
            </span>
            {isPos ? (
              <TrendingUp
                size={13}
                style={{ color: "#22c55e", flexShrink: 0 }}
              />
            ) : (
              <TrendingDown
                size={13}
                style={{ color: "#ef4444", flexShrink: 0 }}
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "15px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "hsl(var(--foreground))",
              }}
            >
              ₹{currentNav.toFixed(2)}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: isPos ? "#22c55e" : "#ef4444",
              }}
            >
              {isPos ? "+" : ""}
              {changePct.toFixed(2)}% ({range})
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "flex",
              borderRadius: "6px",
              border: "1px solid hsl(var(--border))",
              overflow: "hidden",
            }}
          >
            {(["1Y", "3Y", "5Y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: range === r ? 500 : 400,
                  background:
                    range === r ? "hsl(var(--foreground))" : "transparent",
                  color:
                    range === r
                      ? "hsl(var(--background))"
                      : "hsl(var(--muted-foreground))",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.12s ease, color 0.12s ease",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "hsl(var(--muted-foreground))",
              transition: "background 0.12s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "hsl(var(--secondary) / 0.7)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ position: "relative", background: "transparent" }}>
        {loading && (
          <div
            style={{
              height: "180px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Loader2
              size={16}
              style={{
                color: "hsl(var(--muted-foreground))",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                color: "hsl(var(--muted-foreground))",
                fontWeight: 300,
              }}
            >
              Loading NAV history…
            </span>
          </div>
        )}
        {error && !loading && (
          <div
            style={{
              height: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            Failed to load chart data.
          </div>
        )}
        {!loading && !error && (
          <>
            <svg
              ref={svgRef}
              style={{ width: "100%", height: "180px", display: "block" }}
              viewBox="0 0 400 160"
              preserveAspectRatio="xMidYMid meet"
            />
            {tooltip.visible && (
              <div
                style={{
                  position: "absolute",
                  left: `${tooltip.x}px`,
                  top: `${Math.max(8, tooltip.y - 52)}px`,
                  transform: "translateX(-50%)",
                  background: "hsl(var(--popover) / 0.9)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "7px",
                  padding: "6px 10px",
                  pointerEvents: "none",
                  zIndex: 10,
                  boxShadow: "0 4px 16px hsl(var(--foreground) / 0.08)",
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "2px",
                  }}
                >
                  {tooltip.date}
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "hsl(var(--foreground))",
                  }}
                >
                  ₹{tooltip.nav.toFixed(2)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats row */}
      {!loading && !error && data.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid hsl(var(--border))",
          }}
        >
          {[
            { label: "High", value: `₹${high.toFixed(2)}`, color: "#22c55e" },
            { label: "Low", value: `₹${low.toFixed(2)}`, color: "#ef4444" },
            { label: "Category", value: fund.category, color: fund.color },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: "12px 16px",
                textAlign: "center",
                borderRight: i < 2 ? "1px solid hsl(var(--border))" : "none",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "4px",
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: stat.color,
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid hsl(var(--border))",
          background: "hsl(var(--secondary) / 0.5)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            padding: "1px 6px",
            borderRadius: "3px",
            background: `color-mix(in srgb, ${fund.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${fund.color} 25%, transparent)`,
            color: fund.color,
            fontWeight: 500,
          }}
        >
          {fund.risk}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
            fontWeight: 300,
          }}
        >
          {fund.horizon} yr horizon
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
            fontWeight: 300,
            marginLeft: "auto",
          }}
        >
          5Y CAGR:{" "}
          <strong
            style={{
              color: "#22c55e",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {fund.cagr5y.toFixed(1)}%
          </strong>
        </span>
      </div>
    </div>
  );
};

export default FundNavChart;
