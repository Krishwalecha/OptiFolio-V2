import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AllocationReason, MlTrust } from "@/features/charts/stockChartUtils";

interface StockChartModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticker: string;
  allocation: number;
  summary: string;
  reason: AllocationReason;
  trustLevel: MlTrust;
  trusted: boolean;
  strengths: string[];
  concerns: string[];
  vol: number | null;
  maxDd: number | null;
  t90: number | null;
  t30: number | null;
}

export default function StockChartModal({
  open, onOpenChange, ticker, allocation, summary,
  reason, trustLevel, trusted, strengths, concerns,
  vol, maxDd, t90, t30,
}: StockChartModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: "640px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <DialogHeader
          style={{
            padding: "28px 24px",
            borderBottom: "1px solid hsl(var(--border))",
            background: "hsl(var(--secondary) / 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <DialogTitle
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                margin: 0,
              }}
            >
              {ticker}
            </DialogTitle>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.05em",
                padding: "2px 7px",
                borderRadius: "4px",
                background: trustLevel === "strong" ? "var(--green-subtle)" : trustLevel === "partial" ? "hsl(var(--amber) / 0.12)" : "hsl(var(--muted) / 0.5)",
                color: trustLevel === "strong" ? "var(--green)" : trustLevel === "partial" ? "var(--amber)" : "hsl(var(--muted-foreground))",
                border: `1px solid ${trustLevel === "strong" ? "var(--green-border)" : trustLevel === "partial" ? "var(--amber-border)" : "hsl(var(--border))"}`,
              }}
            >
              {trustLevel === "strong" ? "ML" : trustLevel === "partial" ? "ML (weak signal)" : "HIST"}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "hsl(var(--muted-foreground))", marginLeft: "auto" }}>
              {allocation.toFixed(1)}% allocation
            </span>
          </div>
          <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.5, margin: "8px 0 0" }}>
            {summary}
          </p>
        </DialogHeader>

        <div style={{ overflowY: "auto", maxHeight: "70vh" }}>
          {/* ML metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid hsl(var(--border))" }}>
            {[
              {
                label: "ML Forecast",
                value: `${reason.predictedReturn >= 0 ? "+" : ""}${(reason.predictedReturn * 100).toFixed(1)}%`,
                desc: "Annualised return prediction",
                color: reason.predictedReturn >= 0.1 ? "var(--green)" : reason.predictedReturn >= 0 ? "var(--amber)" : "var(--red)",
                dim: !trusted,
              },
              {
                label: "IC",
                value: reason.ic > 0 ? `+${reason.ic.toFixed(3)}` : reason.ic.toFixed(3),
                desc: "Spearman rank correlation",
                color: reason.ic >= 0.05 ? "var(--green)" : reason.ic > 0 ? "var(--amber)" : "var(--red)",
                dim: false,
              },
              {
                label: "Dir. Accuracy",
                value: `${(reason.dirAccuracy * 100).toFixed(1)}%`,
                desc: reason.dirAccuracy >= 0.5 ? "% correct up/down calls" : "Below random chance",
                color: reason.dirAccuracy >= 0.55 ? "var(--green)" : reason.dirAccuracy >= 0.5 ? "var(--amber)" : "var(--red)",
                dim: false,
              },
              {
                label: "Composite Score",
                value: reason.compositeScore.toFixed(3),
                desc: "Return × confidence",
                color: reason.compositeScore >= 0.15 ? "var(--green)" : reason.compositeScore >= 0.05 ? "var(--amber)" : "var(--red)",
                dim: false,
              },
            ].map((m, i) => (
              <div key={m.label} style={{ padding: "14px 16px", borderRight: i < 3 ? "1px solid hsl(var(--border))" : "none", opacity: m.dim ? 0.45 : 1 }}>
                <div className="mono-label" style={{ marginBottom: "6px" }}>{m.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: m.color, marginBottom: "4px" }}>{m.value}</div>
                <div style={{ fontSize: "10.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {/* Strengths / Concerns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid hsl(var(--border))" }}>
            {[
              { title: "Strengths", color: "var(--green)", items: strengths, icon: "✓" as const },
              { title: "Concerns",  color: "var(--red)",   items: concerns,  icon: "✗" as const },
            ].map((col, ci) => (
              <div key={col.title} style={{ padding: "16px 20px", borderRight: ci === 0 ? "1px solid hsl(var(--border))" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: col.color }} />
                  <span className="mono-label" style={{ color: col.color }}>{col.title}</span>
                </div>
                {col.items.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontStyle: "italic", fontWeight: 300, margin: 0 }}>
                    None detected
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {col.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                        <span style={{ color: col.color, fontSize: "9px", marginTop: "2px", flexShrink: 0, fontWeight: 700 }}>{col.icon}</span>
                        <span style={{ fontSize: "12px", color: "hsl(var(--foreground) / 0.8)", fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Computed stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {[
              {
                label: "Ann. Volatility",
                value: vol != null ? `${vol.toFixed(1)}%` : "—",
                color: vol != null && vol > 35 ? "var(--red)" : vol != null && vol > 22 ? "var(--amber)" : "var(--green)",
              },
              {
                label: "Max Drawdown",
                value: maxDd != null ? `−${maxDd.toFixed(1)}%` : "—",
                color: maxDd != null && maxDd > 40 ? "var(--red)" : maxDd != null && maxDd > 20 ? "var(--amber)" : "var(--green)",
              },
              {
                label: "90d Trend",
                value: t90 != null ? `${t90 >= 0 ? "+" : ""}${t90.toFixed(1)}%` : "—",
                color: t90 != null && t90 >= 0 ? "var(--green)" : "var(--red)",
              },
              {
                label: "30d Trend",
                value: t30 != null ? `${t30 >= 0 ? "+" : ""}${t30.toFixed(1)}%` : "—",
                color: t30 != null && t30 >= 0 ? "var(--green)" : "var(--red)",
              },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: "14px 16px", textAlign: "center", borderRight: i < 3 ? "1px solid hsl(var(--border))" : "none" }}>
                <div className="mono-label" style={{ marginBottom: "6px" }}>{s.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 600, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
