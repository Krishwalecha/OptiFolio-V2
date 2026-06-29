import type { Article, AnalysisResult, StockSignal, NewsCache } from "./types";
import { CART_KEY, CACHE_TTL_MS, normalizeNseTicker } from "./config";

const API_BASE = import.meta.env.VITE_API_URL;

// ── cart ──────────────────────────────────────────────────────────────────────

export function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function writeCart(tickers: string[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(tickers)); } catch {}
}

// ── cache ─────────────────────────────────────────────────────────────────────

export function readCache(key: string): NewsCache | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p: NewsCache = JSON.parse(raw);
    if (!p.fetchedAt || !Array.isArray(p.articles)) return null;
    return p;
  } catch { return null; }
}

export function writeCache(articles: Article[], key: string) {
  try { localStorage.setItem(key, JSON.stringify({ articles, fetchedAt: Date.now() })); } catch {}
}

export function cacheIsValid(c: NewsCache | null) {
  return !!c && Date.now() - c.fetchedAt < CACHE_TTL_MS;
}

export function cacheAge(c: NewsCache | null) {
  if (!c) return "";
  const m = Math.floor((Date.now() - c.fetchedAt) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

// ── dedup ─────────────────────────────────────────────────────────────────────

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

const jaccard = (a: string, b: string) => {
  const sa = new Set(norm(a).split(" ").filter(Boolean));
  const sb = new Set(norm(b).split(" ").filter(Boolean));
  if (!sa.size || !sb.size) return 0;
  return [...sa].filter((w) => sb.has(w)).length / new Set([...sa, ...sb]).size;
};

export const dedup = (articles: Article[]) => {
  const seen: Article[] = [];
  for (const a of articles) {
    if (!a.title?.trim() || !a.url?.trim()) continue;
    let dup = false;
    try {
      const { hostname, pathname } = new URL(a.url);
      const key = hostname + pathname.replace(/\/$/, "");
      dup = seen.some((s) => {
        try { const u = new URL(s.url); return u.hostname + u.pathname.replace(/\/$/, "") === key; }
        catch { return false; }
      });
    } catch {}
    if (!dup) dup = seen.some((s) => jaccard(s.title, a.title) >= 0.65);
    if (!dup) seen.push(a);
  }
  return seen;
};

// ── news fetching (all via backend — no keys in frontend) ─────────────────────

export async function fetchGeneralNews(): Promise<Article[]> {
  try {
    const res = await fetch(`${API_BASE}/api/news/general`, {
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles ?? []) as Article[];
  } catch { return []; }
}

export async function fetchPortfolioNews(tickers: string[]): Promise<{ articles: Article[]; nameMap: Record<string, string> }> {
  try {
    const params = tickers.join(",");
    const res = await fetch(`${API_BASE}/api/news/portfolio?tickers=${encodeURIComponent(params)}`, {
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return { articles: [], nameMap: {} };
    const data = await res.json();
    return { articles: data.articles ?? [], nameMap: data.nameMap ?? {} };
  } catch { return { articles: [], nameMap: {} }; }
}

// ── AI analysis (via backend) ─────────────────────────────────────────────────

export async function analyzeWithAI(articles: Article[]): Promise<AnalysisResult[]> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return [];
    return ((await res.json()).results ?? []) as AnalysisResult[];
  } catch { return []; }
}

// ── ticker helpers (via backend) ──────────────────────────────────────────────

export async function resolveTickerNames(
  tickers: string[],
): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE}/api/resolveTickerNames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickers }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return Object.fromEntries(tickers.map((t) => [t, t]));
    const data = await res.json();
    return data.names ?? Object.fromEntries(tickers.map((t) => [t, t]));
  } catch { return Object.fromEntries(tickers.map((t) => [t, t])); }
}

export async function resolveStockNames(
  names: string[],
): Promise<Record<string, { ticker: string; companyName: string }>> {
  try {
    const res = await fetch(`${API_BASE}/api/resolveStockNames`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.result ?? {};
  } catch { return {}; }
}

export async function fetchUserTickers(userId: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/userPortfolios/${userId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tickers = new Set<string>();
    for (const group of data.portfolioGroups ?? [])
      for (const item of group.tickers ?? []) {
        const ticker = typeof item === "string" ? item : item.ticker;
        if (ticker) tickers.add(ticker.trim().toUpperCase());
      }
    return [...tickers];
  } catch { return []; }
}

// ── stock signals ─────────────────────────────────────────────────────────────

export function computeStockSignals(
  articles: Article[],
  tickerNameMap: Record<string, string> = {},
  portfolioTickers?: string[],
): StockSignal[] {
  const analyzed = articles.filter((a) => a.analyzed && a.sentiment !== "pending");

  const map = new Map<string, { bull: Article[]; bear: Article[]; neutral: Article[] }>();

  const SKIP = new Set([
    "NSE","BSE","NIFTY","NIFTY50","SENSEX","BANKNIFTY","FINNIFTY",
    "MIDCAP","SMALLCAP","LARGECAP","NIFTY100","NIFTY200","NIFTY500",
    "RBI","SEBI","IRDAI","AMFI","NPCI","NCLT","SAT","FII","DII",
    "FPI","QIB","HNI","NRI","PMS","GDP","GNP","INR","USD","EUR",
    "GBP","IMF","WTO","WB","ADB","CPI","WPI","IIP","PMI","REPO",
    "CRR","SLR","MCLR","IPO","FPO","OFS","NFO","ETF","MF","SIP",
    "STP","SWP","EBITDA","PAT","PBT","EPS","ROE","ROA","ROCE",
    "NAV","PE","PB","EV","CAGR","IRR","NPV","FCF","CAPEX","OPEX",
    "FY","Q1","Q2","Q3","Q4","YOY","QOQ","MOM","YTD","CEO","CFO",
    "CTO","COO","MD","CMD","ED","DIN","KMP","NDA","BJP","INC",
    "AAP","UPA","PMO","GOI","MPC","CCI","IT","AI","RE","AM","PM",
    "IN","US","UK","EU","AND","OR","THE","FOR","NEW","OLD","TOP",
    "LOW","HIGH","BUY","SELL","HOLD","LONG","SHORT","JUNIORBEES",
    "NIFTYBEES","BANKBEES","LIQUIDBEES",
  ]);

  for (const article of analyzed) {
    for (const rawTicker of article.stocks) {
      const ticker = normalizeNseTicker(rawTicker);
      if (!ticker || ticker.length < 2 || ticker.length > 40) continue;
      if (SKIP.has(ticker)) continue;
      if (portfolioTickers && !portfolioTickers.includes(ticker)) continue;
      if (!map.has(ticker)) map.set(ticker, { bull: [], bear: [], neutral: [] });
      const entry = map.get(ticker)!;
      if (article.sentiment === "positive") entry.bull.push(article);
      else if (article.sentiment === "negative") entry.bear.push(article);
      else entry.neutral.push(article);
    }
  }

  if (portfolioTickers) {
    for (const ticker of portfolioTickers) {
      const t = normalizeNseTicker(ticker);
      if (!SKIP.has(t) && !map.has(t)) map.set(t, { bull: [], bear: [], neutral: [] });
    }
  }

  const signals: StockSignal[] = [];

  for (const [ticker, { bull, bear, neutral }] of map.entries()) {
    const totalMentions = bull.length + bear.length + neutral.length;
    const confidence: "low" | "medium" | "high" =
      totalMentions >= 6 ? "high" : totalMentions >= 3 ? "medium" : "low";
    const bullishPct = totalMentions > 0 ? Math.round((bull.length / totalMentions) * 100) : 0;
    const smoothedBull = bull.length + 0.5;
    const smoothedBear = bear.length + 0.5;
    const smoothedTotal = totalMentions + 1;
    const rawScore = (smoothedBull - smoothedBear) / smoothedTotal;
    const maxScore = confidence === "high" ? 1.0 : confidence === "medium" ? 0.65 : 0.35;
    const score = Math.max(-maxScore, Math.min(maxScore, rawScore));

    let trend: StockSignal["trend"];
    if (score >= 0.55) trend = "strong_buy";
    else if (score >= 0.2) trend = "buy";
    else if (score >= -0.2) trend = "hold";
    else if (score >= -0.55) trend = "sell";
    else trend = "strong_sell";

    const primaryArticles =
      trend === "strong_buy" || trend === "buy" ? bull
      : trend === "strong_sell" || trend === "sell" ? bear
      : neutral;

    const topReason =
      primaryArticles[0]?.sentimentReason ||
      bull[0]?.sentimentReason ||
      neutral[0]?.sentimentReason ||
      bear[0]?.sentimentReason ||
      "Market activity detected";

    signals.push({
      ticker,
      companyName: tickerNameMap[ticker] ?? ticker,
      bullishCount: bull.length,
      bearishCount: bear.length,
      neutralCount: neutral.length,
      totalMentions,
      bullishPct,
      score,
      confidence,
      trend,
      topReason,
      articles: [...bull, ...bear, ...neutral].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    });
  }

  return signals.sort((a, b) => b.score - a.score || b.totalMentions - a.totalMentions);
}

export { CACHE_KEY, PORTFOLIO_CACHE_KEY } from "./config";
