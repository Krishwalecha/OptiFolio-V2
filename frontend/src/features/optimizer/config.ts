import type React from "react";
import type { RiskProfile } from "@/services/optimizerService";

export const API_BASE = import.meta.env.VITE_API_URL as string;
export const CART_KEY = "portfolioCart_v1";

export const RISK_PROFILES: Array<{
  value: RiskProfile;
  label: string;
  description: string;
  strategy: string;
  returnRange: string;
  border: string;
  bg: string;
  color: string;
}> = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Capital preservation · lower volatility · stable returns",
    strategy: "Min Volatility",
    returnRange: "8–12% p.a.",
    border: "var(--blue-border)",
    bg: "var(--blue-subtle)",
    color: "var(--blue)",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Equal weight on growth & stability · optimal Sharpe",
    strategy: "Max Sharpe",
    returnRange: "12–18% p.a.",
    border: "var(--green-border)",
    bg: "var(--green-subtle)",
    color: "var(--green)",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Maximum return focus · concentrated high-ML positions",
    strategy: "Aggressive Growth",
    returnRange: "18–25% p.a.",
    border: "var(--red-border)",
    bg: "var(--red-subtle)",
    color: "var(--red)",
  },
];

export const AUTO_PROFILES: Record<
  RiskProfile,
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  conservative: {
    label: "Conservative",
    color: "var(--blue)",
    bg: "var(--blue-subtle)",
    border: "var(--blue-border)",
    description: "Capital preservation first",
  },
  balanced: {
    label: "Balanced",
    color: "var(--green)",
    bg: "var(--green-subtle)",
    border: "var(--green-border)",
    description: "Equal focus on growth & stability",
  },
  aggressive: {
    label: "Aggressive",
    color: "var(--red)",
    bg: "var(--red-subtle)",
    border: "var(--red-border)",
    description: "High risk for substantial returns",
  },
};

export const SCORE_ITEMS = [
  { key: "ageScore", label: "Age factor", range: "−2 to +4" },
  { key: "savingsScore", label: "Savings rate", range: "−1 to +2" },
  { key: "familyScore", label: "Family size", range: "−1 to +2" },
  { key: "horizonScore", label: "Time horizon", range: "0 to +3" },
  { key: "investmentScore", label: "Investment base", range: "0 to +2" },
  { key: "ratioScore", label: "Invest. ratio", range: "−1 to +1" },
];

export function normalizeProfile(profile: string): RiskProfile {
  if (profile === "conservative") return "conservative";
  if (profile === "balanced") return "balanced";
  return "aggressive";
}

export function readAndClearCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [""];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      localStorage.removeItem(CART_KEY);
      return parsed.map((t: unknown) => String(t).trim().toUpperCase());
    }
  } catch {
    /* ignore */
  }
  return [""];
}

export const fieldStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  height: "38px",
  padding: "0 12px",
  background: "hsl(var(--card) / 0.6)",
  backdropFilter: "blur(8px)",
  border: `1px solid ${focused ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))"}`,
  borderRadius: "7px",
  fontSize: "14px",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "-0.01em",
  color: "hsl(var(--foreground))",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  boxShadow: focused ? "0 0 0 3px hsl(var(--foreground) / 0.06)" : "none",
});
