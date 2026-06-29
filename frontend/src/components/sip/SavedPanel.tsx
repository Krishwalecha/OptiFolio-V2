import { Bookmark, Trash2 } from "lucide-react";
import { formatINR } from "@/features/sip/utils";
import type { SavedCalc } from "@/features/sip/types";

export default function SavedPanel({
  saved,
  onLoad,
  onDelete,
}: {
  saved: SavedCalc[];
  onLoad: (c: SavedCalc) => void;
  onDelete: (id: string) => void;
}) {
  if (saved.length === 0) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <Bookmark
          size={24}
          style={{ color: "hsl(var(--muted-foreground))", margin: "0 auto 10px", display: "block", opacity: 0.3 }}
        />
        <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontWeight: 300, margin: 0 }}>
          No saved calculations yet.
        </p>
        <p style={{ fontSize: "11.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300, marginTop: "6px" }}>
          Calculate and click "Save" to bookmark scenarios.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {saved.map((c, i) => (
        <div
          key={c.id}
          style={{
            padding: "14px 20px",
            borderBottom: i < saved.length - 1 ? "1px solid hsl(var(--border))" : "none",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "hsl(var(--foreground))" }}>
                {c.label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  background: "hsl(var(--secondary))",
                  color: "hsl(var(--muted-foreground))",
                  border: "1px solid hsl(var(--border))",
                }}
              >
                {c.mode}
              </span>
            </div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                ₹{Number(c.monthly).toLocaleString("en-IN")}/mo · {c.rate}% · {c.years}yr
              </span>
              {c.result?.maturity && (
                <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: 500 }}>
                  → {formatINR(c.result.maturity)}
                </span>
              )}
            </div>
            <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>
              {new Date(c.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <button
              onClick={() => onLoad(c)}
              style={{
                height: "30px",
                padding: "0 12px",
                background: "hsl(var(--foreground))",
                color: "hsl(var(--background))",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Load
            </button>
            <button
              onClick={() => onDelete(c.id)}
              style={{
                width: "30px",
                height: "30px",
                background: "transparent",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--red-subtle)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <Trash2 size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
