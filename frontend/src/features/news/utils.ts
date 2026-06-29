import type { Article, AnalysisResult, StockSignal, NewsCache } from "./types";
import {
  CART_KEY,
  CACHE_KEY,
  PORTFOLIO_CACHE_KEY,
  CACHE_TTL_MS,
  RSS_FEEDS,
  normalizeNseTicker,
} from "./config";

const API_BASE = import.meta.env.VITE_API_URL;

const NEWSDATA_KEYS = [
  import.meta.env.VITE_NEWSDATA_KEY_1 as string,
  import.meta.env.VITE_NEWSDATA_KEY_2 as string,
  import.meta.env.VITE_NEWSDATA_KEY_3 as string,
].filter(Boolean);
let ndKeyIndex = 0;

const GNEWS_KEYS = [
  import.meta.env.VITE_GNEWS_KEY_1 as string,
  import.meta.env.VITE_GNEWS_KEY_2 as string,
  import.meta.env.VITE_GNEWS_KEY_3 as string,
].filter(Boolean);
let gnewsKeyIndex = 0;
let gnewsLastCall = 0;

const GEMINI_KEYS = [
  import.meta.env.VITE_GEMINI_KEY_1 as string,
  import.meta.env.VITE_GEMINI_KEY_2 as string,
  import.meta.env.VITE_GEMINI_KEY_3 as string,
  import.meta.env.VITE_GEMINI_KEY_4 as string,
].filter(Boolean);
let geminiKeyIndex = 0;

const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_KEY_1 as string,
  import.meta.env.VITE_GROQ_KEY_2 as string,
].filter(Boolean);
let groqKeyIndex = 0;

// cart

export function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(tickers: string[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(tickers));
  } catch {}
}

// cache

export function readCache(key: string): NewsCache | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p: NewsCache = JSON.parse(raw);
    if (!p.fetchedAt || !Array.isArray(p.articles)) return null;
    return p;
  } catch {
    return null;
  }
}

export function writeCache(articles: Article[], key: string) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ articles, fetchedAt: Date.now() }),
    );
  } catch {}
}

export function cacheIsValid(c: NewsCache | null) {
  return !!c && Date.now() - c.fetchedAt < CACHE_TTL_MS;
}

export function cacheAge(c: NewsCache | null) {
  if (!c) return "";
  const ms = Date.now() - c.fetchedAt;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

// string helpers

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

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
        try {
          const u = new URL(s.url);
          return u.hostname + u.pathname.replace(/\/$/, "") === key;
        } catch {
          return false;
        }
      });
    } catch {}
    if (!dup) dup = seen.some((s) => jaccard(s.title, a.title) >= 0.65);
    if (!dup) seen.push(a);
  }
  return seen;
};

export function blank(
  o: Partial<Article> & { id: string; title: string; url: string },
): Article {
  return {
    description: "",
    image: null,
    publishedAt: new Date().toISOString(),
    source: "Unknown",
    via: "RSS",
    stocks: [],
    sentiment: "pending",
    sentimentReason: "",
    analyzed: false,
    ...o,
  };
}

export function parseRssXml(xml: string, label: string): Article[] {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return Array.from(doc.querySelectorAll("item"))
      .slice(0, 30)
      .map((item) => {
        const get = (tag: string) =>
          item.querySelector(tag)?.textContent?.trim() ?? "";
        const title = get("title")
          .replace(/<[^>]*>/g, "")
          .trim();
        const link =
          get("link") || item.querySelector("guid")?.textContent?.trim() || "";
        if (!title || !link) return null;
        const desc = (get("description") || get("summary") || "")
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 500);
        return blank({
          id: `rss::${label}::${link}`,
          title,
          description: desc,
          url: link,
          image: null,
          publishedAt: get("pubDate") || new Date().toISOString(),
          source: label,
          via: "RSS",
        });
      })
      .filter(Boolean) as Article[];
  } catch {
    return [];
  }
}

// fetch

export async function fetchRssViaProxy(feed: {
  url: string;
  label: string;
}): Promise<Article[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/news/rss?url=${encodeURIComponent(feed.url)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    return parseRssXml(await res.text(), feed.label);
  } catch {
    return [];
  }
}

export async function fetchNewsData(
  q: string,
  category: string,
): Promise<Article[]> {
  const key = NEWSDATA_KEYS[ndKeyIndex % NEWSDATA_KEYS.length];
  ndKeyIndex++;

  try {
    const res = await fetch(
      `https://newsdata.io/api/1/latest?apikey=${key}&q=${encodeURIComponent(q)}&country=in&language=en&category=${category}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await res.json();

    if (data.status === "error" && data.code === "RateLimitExceeded") {
      for (let i = 1; i < NEWSDATA_KEYS.length; i++) {
        const fallbackKey =
          NEWSDATA_KEYS[(ndKeyIndex + i) % NEWSDATA_KEYS.length];
        try {
          const r2 = await fetch(
            `https://newsdata.io/api/1/latest?apikey=${fallbackKey}&q=${encodeURIComponent(q)}&country=in&language=en&category=${category}`,
            { signal: AbortSignal.timeout(10000) },
          );
          const d2 = await r2.json();
          if (d2.status === "success" && Array.isArray(d2.results))
            return d2.results
              .filter((r: any) => r.link && r.title)
              .map((r: any) =>
                blank({
                  id: `nd::${r.article_id ?? r.link}`,
                  title: r.title,
                  description: (r.description ?? r.content ?? "").slice(0, 500),
                  url: r.link,
                  image: null,
                  publishedAt: r.pubDate ?? new Date().toISOString(),
                  source: r.source_name ?? "NewsData",
                  via: "NewsData",
                }),
              );
        } catch {
          continue;
        }
      }
      return [];
    }

    if (data.status === "success" && Array.isArray(data.results))
      return data.results
        .filter((r: any) => r.link && r.title)
        .map((r: any) =>
          blank({
            id: `nd::${r.article_id ?? r.link}`,
            title: r.title,
            description: (r.description ?? r.content ?? "").slice(0, 500),
            url: r.link,
            image: null,
            publishedAt: r.pubDate ?? new Date().toISOString(),
            source: r.source_name ?? "NewsData",
            via: "NewsData",
          }),
        );
  } catch {}
  return [];
}

export async function fetchGNews(q: string): Promise<Article[]> {
  const wait = Math.max(0, 1200 - (Date.now() - gnewsLastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  gnewsLastCall = Date.now();

  const key = GNEWS_KEYS[gnewsKeyIndex % GNEWS_KEYS.length];
  gnewsKeyIndex++;

  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&country=in&max=10&sortby=publishedAt&apikey=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const data = await res.json();
    if (res.status === 429 || !Array.isArray(data.articles)) return [];
    return data.articles
      .filter((a: any) => a.url && a.title)
      .map((a: any) =>
        blank({
          id: `gn::${a.url}`,
          title: a.title,
          description: a.description ?? "",
          url: a.url,
          image: null,
          publishedAt: a.publishedAt,
          source: a.source?.name ?? "GNews",
          via: "GNews",
        }),
      );
  } catch {
    return [];
  }
}

// AI

function buildAnalysisPrompt(articles: Article[]): string {
  const items = articles
    .map(
      (a) =>
        `ID: ${a.id}\nTitle: ${a.title}\nDescription: ${a.description ?? ""}`,
    )
    .join("\n\n");
  return `You are a financial news analyst specializing in Indian stock markets (NSE/BSE).

For each article below, return a JSON array where each element has:
- "id": the article ID (exact string)
- "stocks": array of NSE ticker symbols mentioned (e.g. ["RELIANCE","TCS"])
- "sentiment": "positive", "negative", or "neutral" (for Indian equity markets)
- "reason": one concise sentence explaining the sentiment

Respond ONLY with a valid JSON array. No markdown, no explanation.

Articles:
${items}`;
}

function parseAIJsonResponse(text: string): AnalysisResult[] {
  try {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return [];
  }
}

export async function analyzeWithGemini(
  articles: Article[],
): Promise<AnalysisResult[]> {
  if (!GEMINI_KEYS.length) return [];

  for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
    const key = GEMINI_KEYS[(geminiKeyIndex + attempt) % GEMINI_KEYS.length];
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: buildAnalysisPrompt(articles) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const result = parseAIJsonResponse(text);
      if (result.length > 0) {
        geminiKeyIndex = (geminiKeyIndex + attempt + 1) % GEMINI_KEYS.length;
        return result;
      }
    } catch {
      continue;
    }
  }
  return [];
}

export async function analyzeWithGroq(
  articles: Article[],
): Promise<AnalysisResult[]> {
  if (!GROQ_KEYS.length) return [];
  const key = GROQ_KEYS[groqKeyIndex % GROQ_KEYS.length];
  groqKeyIndex++;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: buildAnalysisPrompt(articles) }],
        temperature: 0.1,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return parseAIJsonResponse(text);
  } catch {
    return [];
  }
}

export async function analyzeWithAI(
  articles: Article[],
): Promise<AnalysisResult[]> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles }),
      signal: AbortSignal.timeout(120000),
    });
    if (!res.ok) return [];
    return ((await res.json()).results ?? []) as AnalysisResult[];
  } catch {
    return [];
  }
}

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
  } catch {
    return Object.fromEntries(tickers.map((t) => [t, t]));
  }
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
  } catch {
    return [];
  }
}

export async function fetchPortfolioNews(
  tickers: string[],
  nameMap: Record<string, string>,
): Promise<Article[]> {
  const DELAY = 350;

  const ndPromises = tickers.map(
    (ticker, i) =>
      new Promise<Article[]>((resolve) =>
        setTimeout(async () => {
          const name = nameMap[ticker] ?? ticker;
          const queries = [
            `"${name}" NSE India`,
            `${name} stock earnings results`,
            `${ticker} NSE shares`,
          ];
          const results: Article[] = [];
          for (const q of queries.slice(0, 2)) {
            const r = await fetchNewsData(q, "business");
            results.push(...r);
          }
          const tagged = results.map((a) => ({
            ...a,
            stocks: a.stocks.includes(ticker)
              ? a.stocks
              : [...a.stocks, ticker],
          }));
          resolve(tagged);
        }, i * DELAY),
      ),
  );

  const gnewsPromises = tickers.map(async (ticker, i) => {
    await new Promise((r) => setTimeout(r, i * 1400));
    const name = nameMap[ticker] ?? ticker;
    const shortName = name.split(/\s+/).slice(0, 2).join(" ");
    const arts = await fetchGNews(`${shortName} NSE India share`);
    return arts.map((a) => ({
      ...a,
      stocks: a.stocks.includes(ticker) ? a.stocks : [...a.stocks, ticker],
    }));
  });

  const rssArticles = (
    await Promise.allSettled(RSS_FEEDS.map((f) => fetchRssViaProxy(f)))
  )
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value);

  const taggedRss = rssArticles
    .map((article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const mentionedTickers: string[] = [];
      for (const ticker of tickers) {
        const name = (nameMap[ticker] ?? ticker).toLowerCase();
        if (
          text.includes(ticker.toLowerCase()) ||
          text.includes(name) ||
          (name.split(/\s+/)[0].length > 3 &&
            text.includes(name.split(/\s+/)[0]))
        ) {
          mentionedTickers.push(ticker);
        }
      }
      if (!mentionedTickers.length) return null;
      return {
        ...article,
        stocks: [...new Set([...article.stocks, ...mentionedTickers])],
      };
    })
    .filter(Boolean) as Article[];

  const [ndResults, gnewsResults] = await Promise.all([
    Promise.allSettled(ndPromises).then((rs) =>
      rs
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value),
    ),
    Promise.allSettled(gnewsPromises).then((rs) =>
      rs
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value),
    ),
  ]);

  return [...ndResults, ...gnewsResults, ...taggedRss].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

// signals

export function computeStockSignals(
  articles: Article[],
  tickerNameMap: Record<string, string> = {},
  portfolioTickers?: string[],
): StockSignal[] {
  const analyzed = articles.filter(
    (a) => a.analyzed && a.sentiment !== "pending",
  );

  const map = new Map<
    string,
    { bull: Article[]; bear: Article[]; neutral: Article[] }
  >();

  const SKIP = new Set([
    "NSE", "BSE", "NIFTY", "NIFTY50", "SENSEX", "BANKNIFTY", "FINNIFTY",
    "MIDCAP", "SMALLCAP", "LARGECAP", "NIFTY100", "NIFTY200", "NIFTY500",
    "RBI", "SEBI", "IRDAI", "AMFI", "NPCI", "NCLT", "SAT", "FII", "DII",
    "FPI", "QIB", "HNI", "NRI", "PMS", "GDP", "GNP", "INR", "USD", "EUR",
    "GBP", "IMF", "WTO", "WB", "ADB", "CPI", "WPI", "IIP", "PMI", "REPO",
    "CRR", "SLR", "MCLR", "IPO", "FPO", "OFS", "NFO", "ETF", "MF", "SIP",
    "STP", "SWP", "EBITDA", "PAT", "PBT", "EPS", "ROE", "ROA", "ROCE",
    "NAV", "PE", "PB", "EV", "CAGR", "IRR", "NPV", "FCF", "CAPEX", "OPEX",
    "FY", "Q1", "Q2", "Q3", "Q4", "YOY", "QOQ", "MOM", "YTD", "CEO", "CFO",
    "CTO", "COO", "MD", "CMD", "ED", "DIN", "KMP", "NDA", "BJP", "INC",
    "AAP", "UPA", "PMO", "GOI", "MPC", "CCI", "IT", "AI", "RE", "AM", "PM",
    "IN", "US", "UK", "EU", "AND", "OR", "THE", "FOR", "NEW", "OLD", "TOP",
    "LOW", "HIGH", "BUY", "SELL", "HOLD", "LONG", "SHORT", "JUNIORBEES",
    "NIFTYBEES", "BANKBEES", "LIQUIDBEES",
  ]);

  for (const article of analyzed) {
    for (const rawTicker of article.stocks) {
      const ticker = normalizeNseTicker(rawTicker);
      if (!ticker || ticker.length < 2 || ticker.length > 20) continue;
      if (!/^[A-Z][A-Z0-9&-]{1,19}$/.test(ticker)) continue;
      if (SKIP.has(ticker)) continue;
      if (portfolioTickers && !portfolioTickers.includes(ticker)) continue;

      if (!map.has(ticker))
        map.set(ticker, { bull: [], bear: [], neutral: [] });
      const entry = map.get(ticker)!;
      if (article.sentiment === "positive") entry.bull.push(article);
      else if (article.sentiment === "negative") entry.bear.push(article);
      else entry.neutral.push(article);
    }
  }

  if (portfolioTickers) {
    for (const ticker of portfolioTickers) {
      const t = normalizeNseTicker(ticker);
      if (!SKIP.has(t) && !map.has(t)) {
        map.set(t, { bull: [], bear: [], neutral: [] });
      }
    }
  }

  const signals: StockSignal[] = [];

  for (const [ticker, { bull, bear, neutral }] of map.entries()) {
    const totalMentions = bull.length + bear.length + neutral.length;
    const confidence: "low" | "medium" | "high" =
      totalMentions >= 6 ? "high" : totalMentions >= 3 ? "medium" : "low";
    const bullishPct =
      totalMentions > 0 ? Math.round((bull.length / totalMentions) * 100) : 0;
    const smoothedBull = bull.length + 0.5;
    const smoothedBear = bear.length + 0.5;
    const smoothedTotal = totalMentions + 1;
    const rawScore = (smoothedBull - smoothedBear) / smoothedTotal;
    const maxScore =
      confidence === "high" ? 1.0 : confidence === "medium" ? 0.65 : 0.35;
    const score = Math.max(-maxScore, Math.min(maxScore, rawScore));

    let trend: StockSignal["trend"];
    if (score >= 0.55) trend = "strong_buy";
    else if (score >= 0.2) trend = "buy";
    else if (score >= -0.2) trend = "hold";
    else if (score >= -0.55) trend = "sell";
    else trend = "strong_sell";

    const primaryArticles =
      trend === "strong_buy" || trend === "buy"
        ? bull
        : trend === "strong_sell" || trend === "sell"
          ? bear
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
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    });
  }

  return signals.sort(
    (a, b) => b.score - a.score || b.totalMentions - a.totalMentions,
  );
}

export { CACHE_KEY, PORTFOLIO_CACHE_KEY };
