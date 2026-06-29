import { useState } from "react";
import type { PortfolioStock } from "@/features/portfolios/types";
import { COLORS } from "@/features/portfolios/config";

interface AllocationBarProps {
  stocks: PortfolioStock[];
}

export default function AllocationBar({ stocks }: AllocationBarProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = stocks.reduce((s, st) => s + st.allocation, 0) || 1;

  return (
    <div style={{ marginTop: "14px" }}>
      <div
        style={{
          display: "flex",
          height: "6px",
          borderRadius: "99px",
          overflow: "hidden",
          gap: "1px",
        }}
      >
        {stocks.map((st, i) => (
          <div
            key={`${st.ticker}-${i}`}
            title={`${st.ticker} — ${((st.allocation / total) * 100).toFixed(1)}%`}
            onMouseEnter={() => setHovered(st.ticker)}
            onMouseLeave={() => setHovered(null)}
            style={{
              flex: st.allocation,
              background: COLORS[i % COLORS.length],
              transition: "flex 0.4s ease, opacity 0.15s ease",
              opacity: hovered && hovered !== st.ticker ? 0.35 : 1,
              cursor: "default",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginTop: "8px" }}>
        {stocks.map((st, i) => (
          <div
            key={`${st.ticker}-leg-${i}`}
            style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "default" }}
            onMouseEnter={() => setHovered(st.ticker)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "2px",
                background: COLORS[i % COLORS.length],
                flexShrink: 0,
                opacity: hovered && hovered !== st.ticker ? 0.35 : 1,
                transition: "opacity 0.15s ease",
              }}
            />
            <span
              style={{
                fontSize: "11.5px",
                color: hovered === st.ticker ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                fontWeight: hovered === st.ticker ? 500 : 300,
                transition: "color 0.15s ease",
              }}
            >
              {st.ticker}{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10.5px" }}>
                {((st.allocation / total) * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
