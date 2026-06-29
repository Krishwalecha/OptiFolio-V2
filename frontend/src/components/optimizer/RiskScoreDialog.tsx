import { Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SCORE_ITEMS, AUTO_PROFILES } from "@/features/optimizer/config";
import type { RiskScoreBreakdown } from "@/features/optimizer/types";
import type { RiskProfile } from "@/services/optimizerService";

interface RiskScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogStage: "analyzing" | "results";
  riskScoreBreakdown: RiskScoreBreakdown | null;
  autoProfile: string;
}

export default function RiskScoreDialog({
  open,
  onOpenChange,
  dialogStage,
  riskScoreBreakdown,
  autoProfile,
}: RiskScoreDialogProps) {
  const autoMeta = autoProfile ? AUTO_PROFILES[autoProfile as RiskProfile] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          maxWidth: "640px",
          maxHeight: "88vh",
          overflowY: "auto",
          background: "hsl(var(--card) / 0.9)",
          backdropFilter: "blur(16px)",
          border: "1px solid hsl(var(--border))",
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        <DialogHeader style={{ marginBottom: "24px" }}>
          <DialogTitle style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            Risk profile analysis
          </DialogTitle>
          <DialogDescription
            style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}
          >
            {dialogStage === "analyzing"
              ? "Analyzing your financial profile…"
              : "Your personalized risk profile recommendation"}
          </DialogDescription>
        </DialogHeader>

        {dialogStage === "analyzing" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "40px 0",
              gap: "14px",
            }}
          >
            <Loader2
              size={28}
              style={{ color: "hsl(var(--muted-foreground))", animation: "spin 0.8s linear infinite" }}
            />
            <p style={{ fontSize: "14px", fontWeight: 500, color: "hsl(var(--foreground))" }}>
              Analyzing your profile…
            </p>
            <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
              Computing optimal risk strategy
            </p>
          </motion.div>
        ) : riskScoreBreakdown && autoMeta ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: "flex", flexDirection: "column", gap: "22px" }}
          >
            <div>
              <p className="mono-label" style={{ marginBottom: "12px" }}>
                Score breakdown
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {SCORE_ITEMS.map((item) => {
                  const s = (riskScoreBreakdown as any)[item.key] ?? 0;
                  return (
                    <div
                      key={item.key}
                      style={{
                        padding: "14px",
                        background: "hsl(var(--secondary) / 0.6)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "10px",
                          color: "hsl(var(--muted-foreground))",
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          marginBottom: "6px",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 600,
                          letterSpacing: "-0.02em",
                          color: s > 0 ? "var(--green)" : s < 0 ? "var(--red)" : "hsl(var(--muted-foreground))",
                          lineHeight: 1,
                        }}
                      >
                        {s > 0 ? "+" : ""}
                        {s}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "hsl(var(--muted-foreground))",
                          marginTop: "3px",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {item.range}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                padding: "18px 22px",
                background: autoMeta.bg,
                border: `1px solid ${autoMeta.border}`,
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div style={{ textAlign: "center", minWidth: "60px" }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "4px",
                  }}
                >
                  Score
                </div>
                <div
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: "2.2rem",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: autoMeta.color,
                  }}
                >
                  {riskScoreBreakdown.totalScore}
                </div>
              </div>
              <div style={{ width: "1px", height: "44px", background: autoMeta.border }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "3px",
                  }}
                >
                  Recommended
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: autoMeta.color,
                    marginBottom: "2px",
                  }}
                >
                  {autoMeta.label}
                </div>
                <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                  {autoMeta.description}
                </div>
              </div>
              <CheckCircle2 size={18} style={{ color: autoMeta.color, flexShrink: 0 }} />
            </div>

            <div>
              <p className="mono-label" style={{ marginBottom: "10px" }}>
                Analysis details
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {riskScoreBreakdown.reasons.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "9px 12px",
                      background: "hsl(var(--secondary) / 0.5)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "7px",
                    }}
                  >
                    <CheckCircle2
                      size={11}
                      style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0, marginTop: "2px" }}
                    />
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: "hsl(var(--foreground))",
                        lineHeight: 1.55,
                        fontWeight: 300,
                      }}
                    >
                      {r}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  color: "hsl(var(--muted-foreground))",
                  letterSpacing: "0.04em",
                }}
              >
                Auto-closes in 15s
              </span>
            </div>
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
