import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";

export const CART_KEY = "portfolioCart_v1";
export const CACHE_KEY = "financialNews_general_cache_v2";
export const PORTFOLIO_CACHE_KEY = "financialNews_portfolio_cache_v2";
export const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export function normalizeNseTicker(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}


export const S = {
  positive: {
    label: "Bullish",
    Icon: TrendingUp,
    color: "var(--green)",
    dot: "var(--green)",
  },
  negative: {
    label: "Bearish",
    Icon: TrendingDown,
    color: "var(--red)",
    dot: "var(--red)",
  },
  neutral: { label: "Neutral", Icon: Minus, color: "var(--amber)", dot: "var(--amber)" },
  pending: {
    label: "Analyzing",
    Icon: Loader2,
    color: "hsl(var(--muted-foreground))",
    dot: "hsl(var(--muted-foreground))",
  },
};

export const TREND_CONFIG = {
  strong_buy: {
    label: "Strong Buy",
    color: "var(--green)",
    bg: "var(--green-subtle)",
    border: "var(--green-border)",
  },
  buy: {
    label: "Buy",
    color: "var(--green)",
    bg: "var(--green-subtle)",
    border: "var(--green-border)",
  },
  hold: {
    label: "Hold",
    color: "var(--amber)",
    bg: "var(--amber-subtle)",
    border: "var(--amber-border)",
  },
  sell: {
    label: "Sell",
    color: "var(--red)",
    bg: "var(--red-subtle)",
    border: "var(--red-border)",
  },
  strong_sell: {
    label: "Strong Sell",
    color: "var(--red)",
    bg: "var(--red-subtle)",
    border: "var(--red-border)",
  },
};

export const CONFIDENCE_CONFIG = {
  low: { label: "Low data", color: "hsl(var(--muted-foreground))", icon: "◌" },
  medium: { label: "Medium data", color: "var(--amber)", icon: "◑" },
  high: { label: "High data", color: "var(--green)", icon: "●" },
};

export const BATCH = 12;

export const toTitleCase = (s: string) =>
  s.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );

export const Z = {
  articleBackdrop: 50,
  articlePanel: 51,
  signalBackdrop: 52,
  signalPanel: 53,
  nestedArticleBackdrop: 54,
  nestedArticlePanel: 55,
  cartToast: 60,
};
