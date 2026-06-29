import { useState } from "react";
import { formatINR } from "@/features/sip/utils";

export default function BreakdownChart({
  breakdown,
}: {
  breakdown: { year: number; invested: number; maturity: number }[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = breakdown[breakdown.length - 1]?.maturity || 1;
  const show = breakdown.filter(
    (_, i) =>
      i % Math.ceil(breakdown.length / 10) === 0 || i === breakdown.length - 1,
  );
  const hd = hovered !== null ? show[hovered] : null;

  return (
    <div style={{ padding: "20px 24px", borderTop: "1px solid hsl(var(--border))" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          minHeight: "18px",
        }}
      >
        <p style={{ fontSize: "12.5px", fontWeight: 500, color: "hsl(var(--foreground))", margin: 0 }}>
          Growth projection
        </p>
        {hd ? (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
              Yr {hd.year}
            </span>
            <span style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))" }}>
              Invested: <strong style={{ color: "hsl(var(--foreground))" }}>{formatINR(hd.invested)}</strong>
            </span>
            <span style={{ fontSize: "10.5px", color: "var(--green)" }}>
              Returns: <strong>{formatINR(hd.maturity - hd.invested)}</strong>
            </span>
            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "hsl(var(--foreground))" }}>
              = {formatINR(hd.maturity)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
            hover a bar
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "100px" }}>
        {show.map((d, i) => {
          const matH = (d.maturity / max) * 90;
          const invH = (d.invested / max) * 90;
          const isHov = hovered === i;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: "100px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ width: "100%", height: "90px", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: `${matH}px`,
                    background: isHov
                      ? "color-mix(in srgb, var(--green) 30%, transparent)"
                      : "color-mix(in srgb, var(--green) 15%, transparent)",
                    borderRadius: "3px 3px 0 0",
                    border: isHov
                      ? "1px solid color-mix(in srgb, var(--green) 50%, transparent)"
                      : "1px solid color-mix(in srgb, var(--green) 20%, transparent)",
                    transition: "background 0.1s ease, border-color 0.1s ease",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    width: "100%",
                    height: `${invH}px`,
                    background: isHov ? "hsl(var(--muted-foreground) / 0.2)" : "hsl(var(--secondary))",
                    transition: "background 0.1s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "9px",
                  lineHeight: "10px",
                  marginTop: "2px",
                  transition: "color 0.1s",
                  color: isHov ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                {d.year}y
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
        {[
          { c: "hsl(var(--secondary))", b: "hsl(var(--border))", l: "Invested" },
          { c: "color-mix(in srgb, var(--green) 22%, transparent)", b: "color-mix(in srgb, var(--green) 38%, transparent)", l: "Returns" },
        ].map((x) => (
          <div key={x.l} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: x.c, border: `1px solid ${x.b}` }} />
            <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
