import { Loader2 } from "lucide-react";

interface OptimizeProgressProps {
  elapsed: number;
  deepMode: boolean;
}

export default function OptimizeProgress({ elapsed, deepMode }: OptimizeProgressProps) {
  const steps = deepMode
    ? [
        { until: 8, label: "Fetching market data" },
        { until: 15, label: "Engineering technical features" },
        { until: 120, label: "Optuna HPO — tuning XGBoost per stock (this takes 2–3 mins)" },
        { until: 150, label: "Training final optimized models" },
        { until: 170, label: "Running MPT optimization" },
        { until: Infinity, label: "Finalizing portfolio allocation" },
      ]
    : [
        { until: 6, label: "Fetching market data" },
        { until: 10, label: "Engineering technical features" },
        { until: 25, label: "Training XGBoost models" },
        { until: 35, label: "Running MPT optimization" },
        { until: Infinity, label: "Finalizing portfolio allocation" },
      ];

  const current = steps.find((s) => elapsed < s.until)!;
  const next = steps[steps.indexOf(current) + 1];

  return (
    <div
      style={{
        marginTop: "14px",
        padding: "14px 16px",
        background: "hsl(var(--secondary) / 0.5)",
        backdropFilter: "blur(8px)",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: next ? "10px" : "0",
        }}
      >
        <Loader2
          size={12}
          style={{
            color: "hsl(var(--muted-foreground))",
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "13px", fontWeight: 500, color: "hsl(var(--foreground))" }}>
          {current.label}
        </span>
      </div>
      {next && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "22px" }}>
          <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
            Next: {next.label}
          </span>
        </div>
      )}
    </div>
  );
}
