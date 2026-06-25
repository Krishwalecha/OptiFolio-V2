import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface StockChartProps {
  ticker: string;
  allocation: number;
}
interface StockEntry {
  time: string;
  price: number;
  volume: number;
}
interface StockInfo {
  ticker: string;
  data: StockEntry[];
  currentPrice: number;
  change: number;
  averageVolume: number;
}

const StockChart: React.FC<StockChartProps> = ({ ticker, allocation }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [hasError, setHasError] = useState(false);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: "",
    price: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const mod = await import(`../../stock_data/${ticker}_data.json`);
        const s = mod.default;
        if (!s.data || s.data.length === 0) {
          setHasError(true);
          setStockInfo(null);
          return;
        }
        const data = s.data.map((e: any) => ({
          time: e.Date,
          price: e.Close,
          volume: e.Volume,
        }));
        const cur = data[data.length - 1].price;
        const chg = ((cur - data[0].price) / data[0].price) * 100;
        setHasError(false);
        setStockInfo({
          ticker,
          data,
          currentPrice: cur,
          change: parseFloat(chg.toFixed(2)),
          averageVolume: s.average_volume || 0,
        });
      } catch {
        setHasError(true);
        setStockInfo(null);
      }
    };
    load();
  }, [ticker]);

  useEffect(() => {
    if (!svgRef.current || !stockInfo) return;
    const svg = svgRef.current;
    svg
      .querySelectorAll("path, circle, line, rect, defs")
      .forEach((el) => el.remove());
    const { data } = stockInfo;
    const W = 400,
      H = 160,
      P = 20,
      cW = W - 2 * P,
      cH = H - 2 * P;
    const minP = Math.min(...data.map((d) => d.price)) * 0.96;
    const maxP = Math.max(...data.map((d) => d.price)) * 1.04;
    const isPos = stockInfo.change >= 0;
    const lineColor = isPos ? "#22c55e" : "#ef4444";
    const x = (i: number) => P + (i / (data.length - 1)) * cW;
    const y = (p: number) => P + cH - ((p - minP) / (maxP - minP)) * cH;
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const grad = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient",
    );
    grad.setAttribute("id", `g-${ticker}`);
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
    let areaD = `M ${x(0)} ${y(data[0].price)}`;
    data.forEach((pt, i) => {
      if (i > 0) areaD += ` L ${x(i)} ${y(pt.price)}`;
    });
    areaD += ` L ${x(data.length - 1)} ${P + cH} L ${P} ${P + cH} Z`;
    const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
    area.setAttribute("d", areaD);
    area.setAttribute("fill", `url(#g-${ticker})`);
    svg.appendChild(area);
    let lineD = `M ${x(0)} ${y(data[0].price)}`;
    data.forEach((pt, i) => {
      if (i > 0) lineD += ` L ${x(i)} ${y(pt.price)}`;
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
    data.forEach((pt, i) => {
      const px = x(i),
        py = y(pt.price),
        hw = cW / data.length;
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
        dot.setAttribute("id", "hover-dot");
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
        vl.setAttribute("id", "hover-line");
        svg.appendChild(vl);
        setTooltip({
          visible: true,
          x: px,
          y: py,
          date: pt.time,
          price: pt.price,
        });
      });
      hit.addEventListener("mouseleave", () => {
        svg.querySelector("#hover-dot")?.remove();
        svg.querySelector("#hover-line")?.remove();
        setTooltip((prev) => ({ ...prev, visible: false }));
      });
      svg.appendChild(hit);
    });
  }, [stockInfo, isDark, ticker]);

  if (hasError || !stockInfo) {
    return (
      <div
        style={{
          background: "hsl(var(--card) / 0.6)",
          backdropFilter: "blur(8px)",
          border: "1px solid var(--red-border)",
          borderRadius: "10px",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "180px",
          gap: "12px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "var(--red-subtle)",
            border: "1px solid var(--red-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle size={16} style={{ color: "var(--red)" }} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: "var(--red)",
              marginBottom: "4px",
            }}
          >
            {ticker}
          </div>
          <div
            style={{
              fontSize: "12.5px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 300,
            }}
          >
            No market data available
          </div>
        </div>
      </div>
    );
  }

  const isPos = stockInfo.change >= 0;
  const lineColor = isPos ? "var(--green)" : "var(--red)";
  const high = Math.max(...stockInfo.data.map((d) => d.price));
  const low = Math.min(...stockInfo.data.map((d) => d.price));

  return (
    <div
      style={{
        background: "hsl(var(--card) / 0.6)",
        backdropFilter: "blur(8px)",
        border: "1px solid hsl(var(--border))",
        borderRadius: "10px",
        overflow: "hidden",
        transition:
          "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "hsl(var(--secondary) / 0.7)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "hsl(var(--muted-foreground) / 0.22)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 4px 20px hsl(var(--foreground) / 0.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "hsl(var(--card) / 0.6)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "hsl(var(--border))";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
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
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                color: "hsl(var(--foreground))",
              }}
            >
              {ticker}
            </span>
            {isPos ? (
              <TrendingUp size={13} style={{ color: "var(--green)" }} />
            ) : (
              <TrendingDown size={13} style={{ color: "var(--red)" }} />
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
              ₹{stockInfo.currentPrice.toLocaleString("en-IN")}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: lineColor,
              }}
            >
              {isPos ? "+" : ""}
              {stockInfo.change.toFixed(2)}%
            </span>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            padding: "6px 10px",
            borderRadius: "7px",
            background: "hsl(var(--secondary) / 0.5)",
            border: "1px solid hsl(var(--border))",
          }}
        >
          <div className="mono-label" style={{ marginBottom: "2px" }}>
            Allocation
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "14px",
              fontWeight: 500,
              color: "hsl(var(--foreground))",
            }}
          >
            {allocation.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: "relative", background: "transparent" }}>
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
              ₹{tooltip.price.toLocaleString("en-IN")}
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderTop: "1px solid hsl(var(--border))",
        }}
      >
        {[
          {
            label: "High",
            value: `₹${high.toLocaleString("en-IN")}`,
            color: "var(--green)",
          },
          {
            label: "Low",
            value: `₹${low.toLocaleString("en-IN")}`,
            color: "var(--red)",
          },
          {
            label: "Avg Vol",
            value: `${(stockInfo.averageVolume / 1000).toFixed(0)}K`,
            color: "var(--amber)",
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            style={{
              padding: "12px 16px",
              textAlign: "center",
              borderRight: i < 2 ? "1px solid hsl(var(--border))" : "none",
            }}
          >
            <div className="mono-label" style={{ marginBottom: "4px" }}>
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
    </div>
  );
};

export default StockChart;
