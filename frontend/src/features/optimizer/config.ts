import type React from "react";
import type { RiskProfile } from "@/services/optimizerService";

export const API_BASE = import.meta.env.VITE_API_URL as string;
export const CART_KEY = "portfolioCart_v1";

export const RISK_PROFILES: Array<{
  value: RiskProfile;
  label: string;
  description: string;
  strategy: string;
  limits: string;
  minWeight: number;
  maxWeight: number;
}> = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Steadier stocks get more: 60% of each weight comes from low volatility, 40% from the model’s score.",
    strategy: "Low volatility + model score",
    limits: "at least 4% per stock",
    minWeight: 4,
    maxWeight: 100,
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Weights follow each stock’s model score: its predicted return times how reliable the model was for it in testing.",
    strategy: "Model score weighted",
    limits: "at least 3% per stock",
    minWeight: 3,
    maxWeight: 100,
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Weights follow expected return, blending the model’s forecast with past returns. The most concentrated profile.",
    strategy: "Expected return weighted",
    limits: "at least 3% per stock",
    minWeight: 3,
    maxWeight: 100,
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
