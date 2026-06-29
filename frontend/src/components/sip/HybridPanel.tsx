import React, { useState } from "react";
import { formatINR } from "@/features/sip/utils";

export default function HybridPanel({ rate, years }: { rate: string; years: string }) {
  const [lumpsum, setLumpsum] = useState("500000");
  const [sipAmt, setSipAmt] = useState("10000");
  const [focused, setFocused] = useState<string | null>(null);

  const r = parseFloat(rate) || 12;
  const y = parseFloat(years) || 10;
  const ls = parseFloat(lumpsum) || 500000;
  const s = parseFloat(sipAmt) || 10000;

  const annualRate = r / 100;
  const monthlyRate = r / 12 / 100;
  const n = y * 12;

  const lumpsumMaturity = Math.round(ls * Math.pow(1 + annualRate, y));
  const sipMaturity = Math.round(s * (((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate) * (1 + monthlyRate)));
  const totalMaturity = lumpsumMaturity + sipMaturity;
  const totalInvested = ls + s * n;
  const totalReturns = totalMaturity - totalInvested;

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    height: "36px",
    padding: "0 10px",
    background: "hsl(var(--card)/0.6)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${focused === name ? "hsl(var(--foreground)/0.35)" : "hsl(var(--border))"}`,
    borderRadius: "6px",
    fontSize: "13px",
    color: "hsl(var(--foreground))",
    outline: "none",
    transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  });

  const lsPct = totalInvested > 0 ? ((ls / totalInvested) * 100).toFixed(0) : "0";
  const sipPct = totalInvested > 0 ? (((s * n) / totalInvested) * 100).toFixed(0) : "0";

  return (
    <div style={{ padding: "20px", borderTop: "1px solid hsl(var(--border))", display: "flex", flexDirection: "column", gap: "16px" }}>
      <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300, margin: 0, lineHeight: 1.6 }}>
        Combine a one-time lumpsum investment with regular monthly SIP for maximum compounding.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {[
          { id: "ls", label: "Lumpsum Investment (₹)", val: lumpsum, set: setLumpsum, icon: "💰" },
          { id: "sa", label: "Monthly SIP (₹)", val: sipAmt, set: setSipAmt, icon: "📅" },
        ].map((f) => (
          <div key={f.id}>
            <p style={{ fontSize: "11.5px", color: "hsl(var(--foreground))", marginBottom: "6px", fontWeight: 500 }}>
              {f.icon} {f.label}
            </p>
            <input
              type="number"
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              onFocus={() => setFocused(f.id)}
              onBlur={() => setFocused(null)}
              style={inputStyle(f.id)}
            />
          </div>
        ))}
      </div>

      <div style={{ background: "hsl(var(--secondary)/0.4)", borderRadius: "8px", padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>Investment mix</span>
        </div>
        <div style={{ height: "6px", borderRadius: "99px", overflow: "hidden", display: "flex", marginBottom: "8px" }}>
          <div style={{ width: `${lsPct}%`, background: "#8b5cf6", transition: "width 0.5s ease" }} />
          <div style={{ width: `${sipPct}%`, background: "var(--green)", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          {[
            { color: "#8b5cf6", label: `Lumpsum ${lsPct}%`, val: formatINR(ls) },
            { color: "var(--green)", label: `SIP ${sipPct}%`, val: formatINR(s * n) },
          ].map((x) => (
            <div key={x.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: x.color, flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                {x.label} · {x.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { label: "Lumpsum grows to", val: formatINR(lumpsumMaturity), color: "#8b5cf6", bold: false },
          { label: "SIP grows to", val: formatINR(sipMaturity), color: "var(--green)", bold: false },
          { label: "Total maturity", val: formatINR(totalMaturity), color: "hsl(var(--foreground))", bold: true },
        ].map((x) => (
          <div
            key={x.label}
            style={{
              background: "hsl(var(--card)/0.6)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "14px", fontWeight: x.bold ? 700 : 600, color: x.color, margin: "0 0 3px 0", fontFamily: "'JetBrains Mono', monospace" }}>
              {x.val}
            </p>
            <p style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))", margin: 0, fontWeight: 300 }}>
              {x.label}
            </p>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "var(--green-subtle)",
          borderRadius: "7px",
          border: "1px solid var(--green-border)",
        }}
      >
        <span style={{ fontSize: "12.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
          Total invested · Total returns · Multiplier
        </span>
        <span style={{ fontSize: "12.5px", color: "hsl(var(--foreground))", fontWeight: 500, fontFamily: "'JetBrains Mono', monospace" }}>
          {formatINR(totalInvested)} · {formatINR(totalReturns)} · {(totalMaturity / totalInvested).toFixed(2)}×
        </span>
      </div>
    </div>
  );
}
