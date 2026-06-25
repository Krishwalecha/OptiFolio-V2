import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Globe,
  Briefcase,
  X,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Filter,
  ChevronLeft,
  Info,
  BarChart2,
  Activity,
  Zap,
  ShieldAlert,
  ShoppingCart,
  Plus,
  Check,
  Trash2,
  ArrowRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Sentiment = "positive" | "negative" | "neutral" | "pending";
type FilterType = "all" | "positive" | "negative" | "neutral";
type NewsMode = "general" | "portfolio";

export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
  via: "RSS" | "NewsData" | "GNews";
  stocks: string[];
  sentiment: Sentiment;
  sentimentReason: string;
  analyzed: boolean;
}

interface AnalysisResult {
  id: string;
  stocks: string[];
  sentiment: "positive" | "negative" | "neutral";
  reason: string;
}

interface StockSignal {
  ticker: string;
  companyName: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalMentions: number;
  bullishPct: number;
  score: number;
  confidence: "low" | "medium" | "high";
  articles: Article[];
  topReason: string;
  trend: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
}

// ── Portfolio Cart ─────────────────────────────────────────────────────────
const CART_KEY = "portfolioCart_v1";

function readCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(tickers: string[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(tickers));
  } catch {}
}

// ── NSE Ticker Normalization ───────────────────────────────────────────────
// Maps common aliases/short names → canonical NSE ticker symbols
const NSE_ALIAS_MAP: Record<string, string> = {
  // Banking
  SBI: "SBIN",
  "STATE BANK": "SBIN",
  "STATE BANK OF INDIA": "SBIN",
  HDFC: "HDFCBANK",
  "HDFC BANK": "HDFCBANK",
  ICICI: "ICICIBANK",
  "ICICI BANK": "ICICIBANK",
  AXIS: "AXISBANK",
  "AXIS BANK": "AXISBANK",
  KOTAK: "KOTAKBANK",
  "KOTAK BANK": "KOTAKBANK",
  "KOTAK MAHINDRA": "KOTAKBANK",
  PNB: "PNB",
  BOB: "BANKBARODA",
  "BANK OF BARODA": "BANKBARODA",
  CANARA: "CANARABANK",
  "CANARA BANK": "CANARABANK",
  INDUSIND: "INDUSINDBK",
  "INDUSIND BANK": "INDUSINDBK",
  YES: "YESBANK",
  "YES BANK": "YESBANK",
  BANDHAN: "BANDHANBNK",
  "BANDHAN BANK": "BANDHANBNK",
  FEDERAL: "FEDERALBNK",
  "FEDERAL BANK": "FEDERALBNK",
  IDFCFIRST: "IDFCFIRSTB",
  "IDFC FIRST": "IDFCFIRSTB",
  "IDFC FIRST BANK": "IDFCFIRSTB",
  RBL: "RBLBANK",
  "RBL BANK": "RBLBANK",
  // FMCG
  NESTLE: "NESTLEINDIA",
  "NESTLE INDIA": "NESTLEINDIA",
  HUL: "HINDUNILVR",
  "HINDUSTAN UNILEVER": "HINDUNILVR",
  "HINDUSTAN LEVER": "HINDUNILVR",
  ITC: "ITC",
  DABUR: "DABUR",
  MARICO: "MARICO",
  GODREJ: "GODREJCP",
  "GODREJ CONSUMER": "GODREJCP",
  "GODREJ INDUSTRIES": "GODREJIND",
  BRITANNIA: "BRITANNIA",
  COLGATE: "COLPAL",
  "COLGATE PALMOLIVE": "COLPAL",
  "PROCTER GAMBLE": "PGHH",
  "P&G": "PGHH",
  EMAMI: "EMAMILTD",
  VARUN: "VBL",
  "VARUN BEVERAGES": "VBL",
  // IT / Tech
  TCS: "TCS",
  INFOSYS: "INFY",
  INFY: "INFY",
  WIPRO: "WIPRO",
  HCLTECH: "HCLTECH",
  "HCL TECH": "HCLTECH",
  "HCL TECHNOLOGIES": "HCLTECH",
  TECHM: "TECHM",
  "TECH MAHINDRA": "TECHM",
  MPHASIS: "MPHASIS",
  LTIMINDTREE: "LTIM",
  "LTI MINDTREE": "LTIM",
  "L&T INFOTECH": "LTIM",
  PERSISTENT: "PERSISTENT",
  COFORGE: "COFORGE",
  OFSS: "OFSS",
  "ORACLE FINANCIAL": "OFSS",
  HEXAWARE: "HEXAWARE",
  CYIENT: "CYIENT",
  // Auto
  MARUTI: "MARUTI",
  "MARUTI SUZUKI": "MARUTI",
  TATA: "TATAMOTORS",
  "TATA MOTORS": "TATAMOTORS",
  MAHINDRA: "M&M",
  "M&M": "M&M",
  "MAHINDRA & MAHINDRA": "M&M",
  "MAHINDRA AND MAHINDRA": "M&M",
  BAJAJ: "BAJAJ-AUTO",
  "BAJAJ AUTO": "BAJAJ-AUTO",
  HERO: "HEROMOTOCO",
  "HERO MOTOCORP": "HEROMOTOCO",
  "HERO HONDA": "HEROMOTOCO",
  EICHER: "EICHERMOT",
  "EICHER MOTORS": "EICHERMOT",
  "ROYAL ENFIELD": "EICHERMOT",
  ASHOK: "ASHOKLEY",
  "ASHOK LEYLAND": "ASHOKLEY",
  TVS: "TVSMOTOR",
  "TVS MOTOR": "TVSMOTOR",
  BOSCH: "BOSCHLTD",
  // Oil & Gas / Energy
  RELIANCE: "RELIANCE",
  RIL: "RELIANCE",
  ONGC: "ONGC",
  "OIL AND NATURAL GAS": "ONGC",
  IOC: "IOC",
  "INDIAN OIL": "IOC",
  BPCL: "BPCL",
  "BHARAT PETROLEUM": "BPCL",
  HPCL: "HPCL",
  "HINDUSTAN PETROLEUM": "HPCL",
  "TATA POWER": "TATAPOWER",
  NTPC: "NTPC",
  POWERGRID: "POWERGRID",
  "POWER GRID": "POWERGRID",
  ADANI: "ADANIENT",
  "ADANI ENT": "ADANIENT",
  "ADANI ENTERPRISES": "ADANIENT",
  "ADANI PORTS": "ADANIPORTS",
  "ADANI GREEN": "ADANIGREEN",
  "ADANI POWER": "ADANIPOWER",
  "ADANI TOTAL GAS": "ATGL",
  "ADANI WILMAR": "AWL",
  GAIL: "GAIL",
  // Pharma
  "SUN PHARMA": "SUNPHARMA",
  SUNPHARMA: "SUNPHARMA",
  "DR REDDY": "DRREDDY",
  "DR. REDDY": "DRREDDY",
  "DR REDDYS": "DRREDDY",
  CIPLA: "CIPLA",
  DIVI: "DIVISLAB",
  "DIVI LAB": "DIVISLAB",
  "DIVI LABORATORIES": "DIVISLAB",
  BIOCON: "BIOCON",
  LUPIN: "LUPIN",
  TORRENT: "TORNTPHARM",
  "TORRENT PHARMA": "TORNTPHARM",
  AUROBINDO: "AUROPHARMA",
  ZYDUS: "ZYDUSLIFE",
  "ZYDUS LIFESCIENCES": "ZYDUSLIFE",
  Abbott: "ABBOTINDIA",
  ALKEM: "ALKEM",
  // Finance / NBFC
  BAJAJFIN: "BAJFINANCE",
  "BAJAJ FINANCE": "BAJFINANCE",
  "BAJAJ FINSERV": "BAJAJFINSV",
  BAJAJFINSV: "BAJAJFINSV",
  "MUTHOOT FINANCE": "MUTHOOTFIN",
  MUTHOOT: "MUTHOOTFIN",
  CHOLAFIN: "CHOLAFIN",
  "CHOLAMANDALAM FINANCE": "CHOLAFIN",
  SHRIRAM: "SHRIRAMFIN",
  "SHRIRAM FINANCE": "SHRIRAMFIN",
  LIC: "LICI",
  "LIC INDIA": "LICI",
  "HDFC LIFE": "HDFCLIFE",
  "SBI LIFE": "SBILIFE",
  "ICICI PRUDENTIAL": "ICICIPRULI",
  "MAX FINANCIAL": "MFSL",
  // Metals / Mining
  TATASTEEL: "TATASTEEL",
  "TATA STEEL": "TATASTEEL",
  JSWSTEEL: "JSWSTEEL",
  "JSW STEEL": "JSWSTEEL",
  HINDALCO: "HINDALCO",
  VEDANTA: "VEDL",
  SAIL: "SAIL",
  NMDC: "NMDC",
  "NATIONAL MINERAL": "NMDC",
  WELSPUN: "WELSPUNIND",
  APL: "APLAPOLLO",
  "APL APOLLO": "APLAPOLLO",
  // Cement
  ULTRATECH: "ULTRACEMCO",
  "ULTRATECH CEMENT": "ULTRACEMCO",
  AMBUJA: "AMBUJACEM",
  "AMBUJA CEMENT": "AMBUJACEM",
  "ACC CEMENT": "ACC",
  ACC: "ACC",
  SHREECEM: "SHREECEM",
  "SHREE CEMENT": "SHREECEM",
  JKCEMENT: "JKCEMENT",
  "JK CEMENT": "JKCEMENT",
  // Telecom
  AIRTEL: "BHARTIARTL",
  "BHARTI AIRTEL": "BHARTIARTL",
  JIO: "RELIANCE",
  "VODAFONE IDEA": "IDEA",
  IDEA: "IDEA",
  // Infra / Real Estate
  "L&T": "LT",
  "LARSEN & TOUBRO": "LT",
  "LARSEN AND TOUBRO": "LT",
  LT: "LT",
  DLF: "DLF",
  GODREJPROP: "GODREJPROP",
  "GODREJ PROPERTIES": "GODREJPROP",
  PRESTIGE: "PRESTIGE",
  SOBHA: "SOBHA",
  "BRIGADE GROUP": "BRIGADE",
  BRIGADE: "BRIGADE",
  // Consumer / Retail
  TITAN: "TITAN",
  TRENT: "TRENT",
  NYKAA: "FSN",
  "NYKAA FSN": "FSN",
  ZOMATO: "ETERNAL",
  SWIGGY: "SWIGGY",
  PAYTM: "PAYTM",
  "ONE 97": "PAYTM",
  POLICYBAZAAR: "POLICYBZR",
  DMART: "DMART",
  "AVENUE SUPERMARTS": "DMART",
  TATACONSUM: "TATACONSUM",
  "TATA CONSUMER": "TATACONSUM",
  // Others
  ASIAN: "ASIANPAINT",
  "ASIAN PAINTS": "ASIANPAINT",
  PIDILITE: "PIDILITIND",
  SIEMENS: "SIEMENS",
  ABB: "ABB",
  HAVELLS: "HAVELLS",
  VOLTAS: "VOLTAS",
  CROMPTON: "CROMPTON",
  BLUEDART: "BLUEDART",
  CONCOR: "CONCOR",
  "CONTAINER CORP": "CONCOR",
  IRCTC: "IRCTC",
  "INDIAN RAILWAY": "IRCTC",
  ZEEL: "ZEEL",
  "ZEE ENT": "ZEEL",
  "ZEE ENTERTAINMENT": "ZEEL",
  SUNTV: "SUNTV",
  "SUN TV": "SUNTV",
  INDIGO: "INDIGO",
  "INTERGLOBE AVIATION": "INDIGO",
  SPICEJET: "SPICEJET",
  MCDOWELL: "MCDOWELL-N",
  "UNITED SPIRITS": "MCDOWELL-N",
  UBL: "UBL",
  "UNITED BREWERIES": "UBL",
  PAGEIND: "PAGEIND",
  "PAGE INDUSTRIES": "PAGEIND",
  DIXON: "DIXON",
  AMBER: "AMBER",
  KAYNES: "KAYNES",
  JYOTHY: "JYOTHYLAB",
  "JYOTHY LABS": "JYOTHYLAB",
};

/**
 * Normalise a ticker string that may be an alias to its canonical NSE symbol.
 * Tries: exact map match → uppercase passthrough (already valid).
 */
function normalizeNseTicker(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (NSE_ALIAS_MAP[upper]) return NSE_ALIAS_MAP[upper];
  // Try matching the start of known full names
  for (const [alias, canonical] of Object.entries(NSE_ALIAS_MAP)) {
    if (upper === alias.toUpperCase()) return canonical;
  }
  return upper; // Return as-is if no mapping found
}

// ── Cache ──────────────────────────────────────────────────────────────────
const CACHE_KEY = "financialNews_general_cache_v2";
const PORTFOLIO_CACHE_KEY = "financialNews_portfolio_cache_v2";
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;
interface NewsCache {
  articles: Article[];
  fetchedAt: number;
}

function readCache(key: string): NewsCache | null {
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
function writeCache(articles: Article[], key: string) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ articles, fetchedAt: Date.now() }),
    );
  } catch {}
}
function cacheIsValid(c: NewsCache | null) {
  return !!c && Date.now() - c.fetchedAt < CACHE_TTL_MS;
}
function cacheAge(c: NewsCache | null) {
  if (!c) return "";
  const ms = Date.now() - c.fetchedAt;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

// ── Config ─────────────────────────────────────────────────────────────────
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

// ── Multi-AI Analysis (Gemini + Groq parallel with fallback) ───────────────
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

const GENERAL_NEWSDATA_QUERIES = [
  { q: "Sensex Nifty India", category: "business" },
  { q: "NSE BSE stock market India", category: "business" },
  { q: "India economy RBI rate", category: "business" },
  { q: "India IPO listing 2025", category: "business" },
  { q: "India earnings quarterly results profit", category: "business" },
  { q: "India startup funding raise", category: "business" },
  { q: "FII FPI India investment", category: "business" },
  { q: "India GDP growth exports", category: "business" },
  { q: "Reliance TCS Infosys results", category: "business" },
  { q: "India banking HDFC ICICI SBI", category: "business" },
  { q: "India pharma auto sector stock", category: "business" },
  { q: "Adani Tata Mahindra shares", category: "business" },
  { q: "India crude oil commodity market", category: "business" },
  { q: "SEBI regulation India market", category: "business" },
  { q: "India mutual fund SIP investment", category: "business" },
  { q: "NSE BSE midcap smallcap India", category: "business" },
];
const GENERAL_GNEWS_QUERIES = [
  "Sensex Nifty stock India",
  "India IPO shares listing",
  "India company earnings results",
  "Indian economy investment",
  "India stock market today",
  "BSE NSE trading session India",
  "India IT sector stocks",
  "India banking finance stocks",
];
const RSS_FEEDS = [
  {
    url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021573.cms",
    label: "ET Markets",
  },
  {
    url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
    label: "ET Stocks",
  },
  { url: "https://www.livemint.com/rss/markets", label: "Livemint" },
  {
    url: "https://economictimes.indiatimes.com/industry/rssfeeds/13358374.cms",
    label: "ET Industry",
  },
  {
    url: "https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms",
    label: "ET Wealth",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
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

const dedup = (articles: Article[]) => {
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

function blank(
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

function parseRssXml(xml: string, label: string): Article[] {
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

async function fetchRssViaProxy(feed: {
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

async function fetchNewsData(q: string, category: string): Promise<Article[]> {
  // Pick the next key in rotation (spreads load across keys)
  const key = NEWSDATA_KEYS[ndKeyIndex % NEWSDATA_KEYS.length];
  ndKeyIndex++;

  try {
    const res = await fetch(
      `https://newsdata.io/api/1/latest?apikey=${key}&q=${encodeURIComponent(q)}&country=in&language=en&category=${category}`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await res.json();

    // If this key is rate-limited, fall back to the next available key
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

async function fetchGNews(q: string): Promise<Article[]> {
  const wait = Math.max(0, 1200 - (Date.now() - gnewsLastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  gnewsLastCall = Date.now();

  const key = GNEWS_KEYS[gnewsKeyIndex % GNEWS_KEYS.length]; // ← add this
  gnewsKeyIndex++; // ← add this

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

// ── AI helpers ─────────────────────────────────────────────────────────────

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
    // Try extracting JSON array from partial response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return [];
  }
}

async function analyzeWithGemini(
  articles: Article[],
): Promise<AnalysisResult[]> {
  if (!GEMINI_KEYS.length) return [];

  // Try each key with backoff instead of just one
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
        // Wait before trying next key
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

async function analyzeWithGroq(articles: Article[]): Promise<AnalysisResult[]> {
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

async function analyzeWithAI(articles: Article[]): Promise<AnalysisResult[]> {
  // Skip frontend AI calls entirely — go straight to backend
  // Backend has proper retry logic and key rotation
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

async function resolveTickerNames(
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

async function fetchUserTickers(userId: string): Promise<string[]> {
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

async function fetchPortfolioNews(
  tickers: string[],
  nameMap: Record<string, string>,
): Promise<Article[]> {
  const tickerAliases: Record<string, string> = {};
  for (const ticker of tickers) {
    const name = nameMap[ticker] ?? ticker;
    tickerAliases[ticker.toLowerCase()] = ticker;
    const firstWord = name.split(/\s+/)[0].toLowerCase();
    if (firstWord.length > 3) tickerAliases[firstWord] = ticker;
  }

  const allResults: Article[] = [];
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

// ── Stock Signal Computation ───────────────────────────────────────────────
function computeStockSignals(
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
    "NSE",
    "BSE",
    "NIFTY",
    "NIFTY50",
    "SENSEX",
    "BANKNIFTY",
    "FINNIFTY",
    "MIDCAP",
    "SMALLCAP",
    "LARGECAP",
    "NIFTY100",
    "NIFTY200",
    "NIFTY500",
    "RBI",
    "SEBI",
    "IRDAI",
    "AMFI",
    "NPCI",
    "NCLT",
    "SAT",
    "FII",
    "DII",
    "FPI",
    "QIB",
    "HNI",
    "NRI",
    "PMS",
    "GDP",
    "GNP",
    "INR",
    "USD",
    "EUR",
    "GBP",
    "IMF",
    "WTO",
    "WB",
    "ADB",
    "CPI",
    "WPI",
    "IIP",
    "PMI",
    "REPO",
    "CRR",
    "SLR",
    "MCLR",
    "IPO",
    "FPO",
    "OFS",
    "NFO",
    "ETF",
    "MF",
    "SIP",
    "STP",
    "SWP",
    "EBITDA",
    "PAT",
    "PBT",
    "EPS",
    "ROE",
    "ROA",
    "ROCE",
    "NAV",
    "PE",
    "PB",
    "EV",
    "CAGR",
    "IRR",
    "NPV",
    "FCF",
    "CAPEX",
    "OPEX",
    "FY",
    "Q1",
    "Q2",
    "Q3",
    "Q4",
    "YOY",
    "QOQ",
    "MOM",
    "YTD",
    "CEO",
    "CFO",
    "CTO",
    "COO",
    "MD",
    "CMD",
    "ED",
    "DIN",
    "KMP",
    "NDA",
    "BJP",
    "INC",
    "AAP",
    "UPA",
    "PMO",
    "GOI",
    "MPC",
    "CCI",
    "IT",
    "AI",
    "RE",
    "AM",
    "PM",
    "IN",
    "US",
    "UK",
    "EU",
    "AND",
    "OR",
    "THE",
    "FOR",
    "NEW",
    "OLD",
    "TOP",
    "LOW",
    "HIGH",
    "BUY",
    "SELL",
    "HOLD",
    "LONG",
    "SHORT",
    "JUNIORBEES",
    "NIFTYBEES",
    "BANKBEES",
    "LIQUIDBEES",
  ]);

  for (const article of analyzed) {
    for (const rawTicker of article.stocks) {
      // Normalize the ticker to its proper NSE symbol
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

// ── Visual config ──────────────────────────────────────────────────────────
const S = {
  positive: {
    label: "Bullish",
    Icon: TrendingUp,
    color: "#22c55e",
    dot: "#22c55e",
  },
  negative: {
    label: "Bearish",
    Icon: TrendingDown,
    color: "#ef4444",
    dot: "#ef4444",
  },
  neutral: { label: "Neutral", Icon: Minus, color: "#f59e0b", dot: "#f59e0b" },
  pending: {
    label: "Analyzing",
    Icon: Loader2,
    color: "hsl(var(--muted-foreground))",
    dot: "hsl(var(--muted-foreground))",
  },
};

const TREND_CONFIG = {
  strong_buy: {
    label: "Strong Buy",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.12)",
    border: "rgba(22,163,74,0.35)",
  },
  buy: {
    label: "Buy",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
  },
  hold: {
    label: "Hold",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.30)",
  },
  sell: {
    label: "Sell",
    color: "#f97316",
    bg: "rgba(249,115,22,0.10)",
    border: "rgba(249,115,22,0.30)",
  },
  strong_sell: {
    label: "Strong Sell",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
  },
};

const CONFIDENCE_CONFIG = {
  low: { label: "Low data", color: "hsl(var(--muted-foreground))", icon: "◌" },
  medium: { label: "Medium data", color: "#f59e0b", icon: "◑" },
  high: { label: "High data", color: "#22c55e", icon: "●" },
};

const BATCH = 12;
const toTitleCase = (s: string) =>
  s.replace(
    /\w\S*/g,
    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );

const Z = {
  articleBackdrop: 50,
  articlePanel: 51,
  signalBackdrop: 52,
  signalPanel: 53,
  nestedArticleBackdrop: 54,
  nestedArticlePanel: 55,
  cartToast: 60,
};

// ── Portfolio Cart Toast ───────────────────────────────────────────────────
function CartToast({
  cartCount,
  onGoToOptimizer,
  onDismiss,
}: {
  cartCount: number;
  onGoToOptimizer: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: Z.cartToast,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        background: "hsl(var(--foreground))",
        color: "hsl(var(--background))",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        fontSize: "13px",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      <ShoppingCart size={14} />
      <span>
        {cartCount} stock{cartCount > 1 ? "s" : ""} in cart
      </span>
      <button
        onClick={onGoToOptimizer}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 12px",
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "none",
          borderRadius: "7px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Go to Optimizer <ArrowRight size={11} />
      </button>
      <button
        onClick={onDismiss}
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "4px",
          background: "rgba(255,255,255,0.12)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--background))",
        }}
      >
        <X size={10} />
      </button>
    </motion.div>
  );
}

// ── Article Drawer ─────────────────────────────────────────────────────────
function ArticleDrawer({
  article,
  onClose,
  backdropZ = Z.articleBackdrop,
  panelZ = Z.articlePanel,
}: {
  article: Article | null;
  onClose: () => void;
  backdropZ?: number;
  panelZ?: number;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!article) return null;
  const s = (
    ["positive", "negative", "neutral", "pending"].includes(article.sentiment)
      ? article.sentiment
      : "neutral"
  ) as keyof typeof S;
  const cfg = S[s];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: backdropZ,
          backdropFilter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: panelZ,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: cfg.color,
                  fontWeight: 500,
                }}
              >
                <cfg.Icon size={10} /> {cfg.label}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                · {article.source} · via {article.via}
              </span>
            </div>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                lineHeight: 1.4,
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              {article.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {article.sentimentReason && (
            <div
              style={{
                background: `color-mix(in srgb,${cfg.color} 8%,hsl(var(--card)))`,
                border: `1px solid color-mix(in srgb,${cfg.color} 20%,transparent)`,
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: cfg.color,
                  marginBottom: "5px",
                  fontWeight: 600,
                }}
              >
                AI Analysis
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {toTitleCase(article.sentimentReason)}
              </p>
            </div>
          )}
          {article.description && (
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "6px",
                  fontWeight: 600,
                }}
              >
                Summary
              </p>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.7,
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                {article.description}
              </p>
            </div>
          )}
          {article.stocks.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "8px",
                  fontWeight: 600,
                }}
              >
                Mentioned Stocks
              </p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {article.stocks.map((tk) => (
                  <span
                    key={tk}
                    style={{
                      background: "hsl(var(--secondary))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "4px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {tk}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p
              style={{
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "hsl(var(--muted-foreground))",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              Published
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              {new Date(article.publishedAt).toLocaleString("en-IN", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>

        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid hsl(var(--border))",
          }}
        >
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              width: "100%",
              padding: "10px",
              background: "hsl(var(--foreground))",
              color: "hsl(var(--background))",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Read Full Article <ExternalLink size={12} />
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Stock Signal Card (with cart button) ──────────────────────────────────
function StockSignalCard({
  signal,
  rank,
  onClick,
  inCart,
  onCartToggle,
}: {
  signal: StockSignal;
  rank: number;
  onClick: () => void;
  inCart: boolean;
  onCartToggle: (e: React.MouseEvent) => void;
}) {
  const tc = TREND_CONFIG[signal.trend];
  const cc = CONFIDENCE_CONFIG[signal.confidence];
  const bullW =
    signal.totalMentions > 0
      ? (signal.bullishCount / signal.totalMentions) * 100
      : 0;
  const bearW =
    signal.totalMentions > 0
      ? (signal.bearishCount / signal.totalMentions) * 100
      : 0;
  const neutW = 100 - bullW - bearW;
  const pctColor =
    signal.trend === "strong_buy" || signal.trend === "buy"
      ? "#22c55e"
      : signal.trend === "strong_sell" || signal.trend === "sell"
        ? "#ef4444"
        : "#f59e0b";
  const noData = signal.totalMentions === 0;
  const rankColors = ["#f59e0b", "#94a3b8", "#b45309"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.03, duration: 0.25 }}
      onClick={onClick}
      style={{
        position: "relative",
        background: inCart ? "hsl(var(--card)/0.85)" : "hsl(var(--card)/0.6)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${inCart ? "rgba(34,197,94,0.45)" : "hsl(var(--border))"}`,
        borderTop: `3px solid ${noData ? "hsl(var(--border))" : tc.color}`,
        borderRadius: "14px",
        padding: "18px 18px 16px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        opacity: noData ? 0.55 : 1,
        boxShadow: inCart
          ? `0 0 0 1px rgba(34,197,94,0.2), 0 8px 24px rgba(0,0,0,0.12)`
          : "0 2px 12px rgba(0,0,0,0.06)",
        minHeight: "200px",
      }}
      whileHover={{
        y: -3,
        boxShadow: noData
          ? undefined
          : `0 12px 36px rgba(0,0,0,0.2), 0 0 0 1px ${tc.border}`,
      }}
    >
      {/* Gradient bg */}
      {!noData && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at top left, ${tc.bg}, transparent 60%)`,
            pointerEvents: "none",
            borderRadius: "14px",
          }}
        />
      )}

      {/* Cart button */}
      <button
        onClick={onCartToggle}
        title={inCart ? "Remove from optimizer cart" : "Add to optimizer cart"}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          width: "28px",
          height: "28px",
          borderRadius: "8px",
          background: inCart ? "rgba(34,197,94,0.2)" : "hsl(var(--secondary))",
          border: `1px solid ${inCart ? "rgba(34,197,94,0.5)" : "hsl(var(--border))"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 2,
          transition: "all 0.15s",
          flexShrink: 0,
        }}
      >
        {inCart ? (
          <Check size={12} style={{ color: "#22c55e" }} />
        ) : (
          <Plus size={12} style={{ color: "hsl(var(--muted-foreground))" }} />
        )}
      </button>

      {/* Top row: ticker + rank + company */}
      <div style={{ position: "relative", paddingRight: "36px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "3px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 800,
              fontFamily: "monospace",
              color: "hsl(var(--foreground))",
              letterSpacing: "0.05em",
            }}
          >
            {signal.ticker}
          </span>
          {rank < 3 && !noData && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                color: rankColors[rank],
                background: `${rankColors[rank]}18`,
                border: `1px solid ${rankColors[rank]}40`,
                borderRadius: "4px",
                padding: "1px 5px",
              }}
            >
              #{rank + 1}
            </span>
          )}
        </div>
        {signal.companyName !== signal.ticker && (
          <p
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: 400,
              maxWidth: "180px",
            }}
          >
            {signal.companyName}
          </p>
        )}
      </div>

      {/* Middle: big % + trend badge */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        <div>
          {noData ? (
            <p
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "hsl(var(--muted-foreground))",
                margin: 0,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              —
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  color: pctColor,
                  margin: "0 0 2px 0",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                {signal.bullishPct}%
              </p>
              <p
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                Bullish sentiment
              </p>
            </>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "5px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "99px",
              background: noData ? "hsl(var(--secondary))" : tc.bg,
              border: `1px solid ${noData ? "hsl(var(--border))" : tc.border}`,
              color: noData ? "hsl(var(--muted-foreground))" : tc.color,
              whiteSpace: "nowrap",
            }}
          >
            {noData ? "No Data" : tc.label}
          </span>
          {!noData && (
            <span
              title={`Confidence: ${cc.label} (${signal.totalMentions} articles)`}
              style={{
                fontSize: "11px",
                color: cc.color,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{cc.icon}</span>
              <span style={{ fontSize: "10px" }}>{cc.label}</span>
            </span>
          )}
        </div>
      </div>

      {/* Sentiment bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            height: "5px",
            borderRadius: "99px",
            background: "hsl(var(--border))",
            overflow: "hidden",
            display: "flex",
          }}
        >
          {!noData && (
            <>
              <div
                style={{
                  width: `${bullW}%`,
                  background: "#22c55e",
                  transition: "width 1s ease",
                }}
              />
              <div
                style={{
                  width: `${bearW}%`,
                  background: "#ef4444",
                  transition: "width 1s ease",
                }}
              />
              <div
                style={{
                  width: `${neutW}%`,
                  background: "#f59e0b",
                  opacity: 0.5,
                  transition: "width 1s ease",
                }}
              />
            </>
          )}
        </div>
        {/* Count pills */}
        {noData ? (
          <p
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
            }}
          >
            No news found yet
          </p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {signal.bullishCount > 0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "#22c55e",
                  fontWeight: 600,
                  background: "rgba(34,197,94,0.1)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                }}
              >
                <TrendingUp size={9} /> {signal.bullishCount}
              </span>
            )}
            {signal.bearishCount > 0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "#ef4444",
                  fontWeight: 600,
                  background: "rgba(239,68,68,0.1)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                }}
              >
                <TrendingDown size={9} /> {signal.bearishCount}
              </span>
            )}
            {signal.neutralCount > 0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "11px",
                  color: "#f59e0b",
                  fontWeight: 600,
                  background: "rgba(245,158,11,0.1)",
                  borderRadius: "5px",
                  padding: "2px 7px",
                }}
              >
                <Minus size={9} /> {signal.neutralCount}
              </span>
            )}
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: "3px",
                opacity: 0.4,
                fontSize: "10px",
              }}
            >
              <BookOpen size={9} /> {signal.totalMentions}{" "}
              <ChevronRight size={10} />
            </span>
          </div>
        )}
      </div>

      {/* Top reason */}
      {!noData && signal.topReason && (
        <p
          style={{
            fontSize: "11.5px",
            color: "hsl(var(--muted-foreground))",
            margin: 0,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            borderTop: "1px solid hsl(var(--border))",
            paddingTop: "10px",
          }}
        >
          {toTitleCase(signal.topReason)}
        </p>
      )}
    </motion.div>
  );
}

// ── Stock Signal Detail Panel ──────────────────────────────────────────────
function StockSignalDetail({
  signal,
  onClose,
  inCart,
  onCartToggle,
}: {
  signal: StockSignal;
  onClose: () => void;
  inCart: boolean;
  onCartToggle: () => void;
}) {
  const tc = TREND_CONFIG[signal.trend];
  const cc = CONFIDENCE_CONFIG[signal.confidence];
  const [articleDrawer, setArticleDrawer] = useState<Article | null>(null);
  const noData = signal.totalMentions === 0;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !articleDrawer) onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, articleDrawer]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: Z.signalBackdrop,
          backdropFilter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: Z.signalPanel,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {signal.ticker}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "2px 9px",
                    borderRadius: "99px",
                    background: tc.bg,
                    border: `1px solid ${tc.border}`,
                    color: tc.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {noData ? "No Data" : tc.label}
                </span>
                {!noData && (
                  <span
                    title={`Data confidence: ${cc.label}`}
                    style={{
                      fontSize: "11px",
                      color: cc.color,
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    {cc.icon}{" "}
                    <span style={{ fontSize: "10px" }}>{cc.label}</span>
                  </span>
                )}
              </div>
              {signal.companyName !== signal.ticker && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "hsl(var(--muted-foreground))",
                    margin: 0,
                  }}
                >
                  {signal.companyName}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {/* Add to cart button */}
              <button
                onClick={onCartToggle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  height: "28px",
                  background: inCart
                    ? "rgba(34,197,94,0.12)"
                    : "hsl(var(--secondary))",
                  border: `1px solid ${inCart ? "rgba(34,197,94,0.4)" : "hsl(var(--border))"}`,
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: inCart ? "#22c55e" : "hsl(var(--muted-foreground))",
                  transition: "all 0.15s",
                }}
              >
                {inCart ? (
                  <>
                    <Check size={10} /> In Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart size={10} /> Add
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X
                  size={13}
                  style={{ color: "hsl(var(--muted-foreground))" }}
                />
              </button>
            </div>
          </div>

          {noData ? (
            <div
              style={{
                padding: "12px",
                background: "hsl(var(--secondary))",
                borderRadius: "8px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <Info
                size={13}
                style={{
                  color: "hsl(var(--muted-foreground))",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              />
              <p
                style={{
                  fontSize: "12.5px",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                No news articles were found for this stock yet.
              </p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                {[
                  {
                    label: "Bullish",
                    count: signal.bullishCount,
                    color: "#22c55e",
                  },
                  {
                    label: "Bearish",
                    count: signal.bearishCount,
                    color: "#ef4444",
                  },
                  {
                    label: "Neutral",
                    count: signal.neutralCount,
                    color: "#f59e0b",
                  },
                ].map(({ label, count, color }) => (
                  <div
                    key={label}
                    style={{
                      background: "hsl(var(--secondary))",
                      borderRadius: "8px",
                      padding: "10px",
                      textAlign: "center",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color,
                        margin: "0 0 2px 0",
                      }}
                    >
                      {count}
                    </p>
                    <p
                      style={{
                        fontSize: "10px",
                        color: "hsl(var(--muted-foreground))",
                        margin: 0,
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
              <div
                style={{
                  height: "4px",
                  borderRadius: "99px",
                  overflow: "hidden",
                  display: "flex",
                  background: "hsl(var(--border))",
                }}
              >
                {signal.bullishCount > 0 && (
                  <div
                    style={{
                      width: `${(signal.bullishCount / signal.totalMentions) * 100}%`,
                      background: "#22c55e",
                    }}
                  />
                )}
                {signal.bearishCount > 0 && (
                  <div
                    style={{
                      width: `${(signal.bearishCount / signal.totalMentions) * 100}%`,
                      background: "#ef4444",
                    }}
                  />
                )}
                {signal.neutralCount > 0 && (
                  <div
                    style={{
                      width: `${(signal.neutralCount / signal.totalMentions) * 100}%`,
                      background: "#f59e0b",
                      opacity: 0.6,
                    }}
                  />
                )}
              </div>
              {signal.confidence === "low" && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "8px 12px",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: "6px",
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <ShieldAlert
                    size={12}
                    style={{
                      color: "#f59e0b",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: "hsl(var(--muted-foreground))",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Only {signal.totalMentions} article
                    {signal.totalMentions > 1 ? "s" : ""} found — signal may not
                    be reliable.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Articles list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {signal.articles.length > 0 ? (
            <>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "10px",
                  fontWeight: 600,
                }}
              >
                Related Articles ({signal.articles.length})
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {signal.articles.map((article) => {
                  const st = (
                    ["positive", "negative", "neutral", "pending"].includes(
                      article.sentiment,
                    )
                      ? article.sentiment
                      : "neutral"
                  ) as keyof typeof S;
                  const cfg = S[st];
                  return (
                    <div
                      key={article.id}
                      onClick={() => setArticleDrawer(article)}
                      style={{
                        padding: "10px 12px",
                        background: "hsl(var(--card)/0.6)",
                        border: "1px solid hsl(var(--border))",
                        borderLeft: `3px solid ${cfg.dot}`,
                        borderRadius: "7px",
                        cursor: "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "hsl(var(--secondary))")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          "hsl(var(--card)/0.6)")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            color: cfg.color,
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <cfg.Icon size={9} /> {cfg.label}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        >
                          · {article.source}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 500,
                          lineHeight: 1.4,
                          color: "hsl(var(--foreground))",
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {article.title}
                      </p>
                      {article.sentimentReason && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                            margin: "4px 0 0",
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {toTitleCase(article.sentimentReason)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Activity
                size={24}
                style={{
                  color: "hsl(var(--muted-foreground))",
                  margin: "0 auto 12px",
                  display: "block",
                  opacity: 0.4,
                }}
              />
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                }}
              >
                No articles available for this stock yet.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid hsl(var(--border))",
            display: "flex",
            gap: "8px",
          }}
        >
          <button
            onClick={onCartToggle}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px",
              background: inCart
                ? "rgba(34,197,94,0.12)"
                : "hsl(var(--secondary))",
              border: `1px solid ${inCart ? "rgba(34,197,94,0.35)" : "hsl(var(--border))"}`,
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
              color: inCart ? "#22c55e" : "hsl(var(--muted-foreground))",
              transition: "all 0.15s",
            }}
          >
            {inCart ? (
              <>
                <Check size={13} /> Remove from Optimizer
              </>
            ) : (
              <>
                <ShoppingCart size={13} /> Add to Optimizer
              </>
            )}
          </button>
          <a
            href={`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(signal.ticker)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px 16px",
              background: "hsl(var(--foreground))",
              color: "hsl(var(--background))",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            NSE <ArrowUpRight size={13} />
          </a>
        </div>
      </motion.div>

      <AnimatePresence>
        {articleDrawer && (
          <ArticleDrawer
            article={articleDrawer}
            onClose={() => setArticleDrawer(null)}
            backdropZ={Z.nestedArticleBackdrop}
            panelZ={Z.nestedArticlePanel}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Cart Panel ─────────────────────────────────────────────────────────────
function CartPanel({
  cart,
  signals,
  onRemove,
  onClear,
  onGoToOptimizer,
  onClose,
}: {
  cart: string[];
  signals: StockSignal[];
  onRemove: (ticker: string) => void;
  onClear: () => void;
  onGoToOptimizer: () => void;
  onClose: () => void;
}) {
  const signalMap = Object.fromEntries(signals.map((s) => [s.ticker, s]));
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: Z.signalBackdrop,
          backdropFilter: "blur(4px)",
        }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(380px,95vw)",
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--border))",
          zIndex: Z.signalPanel,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShoppingCart size={15} style={{ color: "#22c55e" }} />
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                margin: 0,
                color: "hsl(var(--foreground))",
              }}
            >
              Optimizer Cart
            </h2>
            <span
              style={{
                fontSize: "11px",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#22c55e",
                borderRadius: "99px",
                padding: "1px 7px",
                fontWeight: 700,
              }}
            >
              {cart.length}
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {cart.length > 0 && (
              <button
                onClick={onClear}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  background: "transparent",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                <Trash2 size={10} /> Clear
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "hsl(var(--secondary))",
                border: "1px solid hsl(var(--border))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={13} style={{ color: "hsl(var(--muted-foreground))" }} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <ShoppingCart
                size={24}
                style={{
                  color: "hsl(var(--muted-foreground))",
                  margin: "0 auto 12px",
                  display: "block",
                  opacity: 0.3,
                }}
              />
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                }}
              >
                No stocks added yet.
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  marginTop: "6px",
                }}
              >
                Click + on any signal card to add stocks.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {cart.map((ticker) => {
                const sig = signalMap[ticker];
                const tc = sig ? TREND_CONFIG[sig.trend] : TREND_CONFIG.hold;
                return (
                  <motion.div
                    key={ticker}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      background: "hsl(var(--card)/0.6)",
                      border: "1px solid hsl(var(--border))",
                      borderLeft: `3px solid ${sig ? tc.color : "hsl(var(--border))"}`,
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            fontFamily: "monospace",
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          {ticker}
                        </span>
                        {sig && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              borderRadius: "99px",
                              background: tc.bg,
                              border: `1px solid ${tc.border}`,
                              color: tc.color,
                              fontWeight: 600,
                            }}
                          >
                            {tc.label}
                          </span>
                        )}
                      </div>
                      {sig && sig.companyName !== sig.ticker && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                            margin: "2px 0 0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sig.companyName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(ticker)}
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "5px",
                        background: "transparent",
                        border: "1px solid hsl(var(--border))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--red-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                      }}
                    >
                      <X
                        size={10}
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px",
            borderTop: "1px solid hsl(var(--border))",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              margin: 0,
              textAlign: "center",
            }}
          >
            Tickers will be pre-filled in the optimizer
          </p>
          <button
            onClick={onGoToOptimizer}
            disabled={cart.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              padding: "11px",
              background:
                cart.length === 0
                  ? "hsl(var(--muted)/0.6)"
                  : "hsl(var(--foreground))",
              color:
                cart.length === 0
                  ? "hsl(var(--muted-foreground))"
                  : "hsl(var(--background))",
              border: "none",
              borderRadius: "8px",
              cursor: cart.length === 0 ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 600,
              transition: "opacity 0.12s",
            }}
            onMouseEnter={(e) => {
              if (cart.length > 0)
                (e.currentTarget as HTMLElement).style.opacity = "0.82";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            <Zap size={14} /> Go to Optimizer ({cart.length} stocks){" "}
            <ArrowRight size={13} />
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Market Intelligence Overlay ────────────────────────────────────────────
function MarketIntelligenceOverlay({
  signals,
  onClose,
  isPortfolio,
  cart,
  onCartToggle,
  onOpenCart,
}: {
  signals: StockSignal[];
  onClose: () => void;
  isPortfolio: boolean;
  cart: string[];
  onCartToggle: (ticker: string) => void;
  onOpenCart: () => void;
}) {
  const [selectedSignal, setSelectedSignal] = useState<StockSignal | null>(
    null,
  );
  const [trendFilter, setTrendFilter] = useState<
    "all" | "buy" | "sell" | "hold"
  >("all");

  const buys = signals.filter(
    (s) => s.trend === "strong_buy" || s.trend === "buy",
  );
  const sells = signals.filter(
    (s) => s.trend === "strong_sell" || s.trend === "sell",
  );
  const holds = signals.filter((s) => s.trend === "hold");

  const displayed =
    trendFilter === "buy"
      ? buys
      : trendFilter === "sell"
        ? sells
        : trendFilter === "hold"
          ? holds
          : signals;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedSignal) onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose, selectedSignal]);

  const totalMentions = signals.reduce((a, s) => a + s.totalMentions, 0);
  const coveredSignals = signals.filter((s) => s.totalMentions > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0 16px",
          borderBottom: "1px solid hsl(var(--border))",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              height: "30px",
              padding: "0 10px",
              background: "hsl(var(--card)/0.7)",
              backdropFilter: "blur(8px)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "12px",
              color: "hsl(var(--muted-foreground))",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--foreground))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--muted-foreground))";
            }}
          >
            <ChevronLeft size={13} /> News
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={14} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "hsl(var(--foreground))",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {isPortfolio ? "Portfolio Intelligence" : "Market Intelligence"}
              </h2>
              <p
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                  margin: 0,
                  fontWeight: 300,
                }}
              >
                {totalMentions} mentions · {coveredSignals.length}/
                {signals.length} stocks covered
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: `${buys.length} Buy`,
              color: "#22c55e",
              bg: "rgba(34,197,94,0.1)",
              border: "rgba(34,197,94,0.3)",
            },
            {
              label: `${holds.length} Hold`,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
              border: "rgba(245,158,11,0.3)",
            },
            {
              label: `${sells.length} Sell`,
              color: "#ef4444",
              bg: "rgba(239,68,68,0.1)",
              border: "rgba(239,68,68,0.3)",
            },
          ].map(({ label, color, bg, border }) => (
            <span
              key={label}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "99px",
                background: bg,
                border: `1px solid ${border}`,
                color,
              }}
            >
              {label}
            </span>
          ))}

          {/* Cart button */}
          <button
            onClick={onOpenCart}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "30px",
              padding: "0 12px",
              background:
                cart.length > 0
                  ? "rgba(34,197,94,0.1)"
                  : "hsl(var(--card)/0.7)",
              backdropFilter: "blur(8px)",
              border: `1px solid ${cart.length > 0 ? "rgba(34,197,94,0.35)" : "hsl(var(--border))"}`,
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "12px",
              color:
                cart.length > 0 ? "#22c55e" : "hsl(var(--muted-foreground))",
              transition: "all 0.12s",
              fontWeight: cart.length > 0 ? 600 : 400,
            }}
          >
            <ShoppingCart size={12} />
            {cart.length > 0 ? `${cart.length} in cart` : "Optimizer Cart"}
            {cart.length > 0 && <ArrowRight size={11} />}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          padding: "9px 13px",
          background: "hsl(var(--card)/0.5)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderLeft: "3px solid #f59e0b",
          borderRadius: "8px",
          marginBottom: "12px",
        }}
      >
        <AlertCircle size={11} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <p
          style={{
            fontSize: "11px",
            color: "hsl(var(--muted-foreground))",
            margin: 0,
            fontWeight: 300,
          }}
        >
          Signals are derived from news sentiment analysis only. Not financial
          advice — always do your own research.
        </p>
      </div>

      {/* Cart info if stocks selected */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: "12px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                background: "rgba(34,197,94,0.07)",
                border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "8px",
              }}
            >
              <Check size={11} style={{ color: "#22c55e", flexShrink: 0 }} />
              <p
                style={{
                  fontSize: "11.5px",
                  color: "hsl(var(--foreground))",
                  margin: 0,
                }}
              >
                <span style={{ fontWeight: 600, color: "#22c55e" }}>
                  {cart.length} stock{cart.length > 1 ? "s" : ""}
                </span>{" "}
                selected:&nbsp;
                {cart.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {t}{" "}
                  </span>
                ))}
              </p>
              <button
                onClick={onOpenCart}
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  color: "#22c55e",
                  fontWeight: 600,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  whiteSpace: "nowrap",
                }}
              >
                View cart <ArrowRight size={10} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confidence legend + filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 500,
            }}
          >
            Confidence:
          </span>
          {Object.entries(CONFIDENCE_CONFIG).map(([key, cfg]) => (
            <span
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: cfg.color,
              }}
            >
              <span>{cfg.icon}</span> {cfg.label}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Filter size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
          {(
            [
              { key: "all", label: `All (${signals.length})` },
              { key: "buy", label: `Buy (${buys.length})` },
              { key: "hold", label: `Hold (${holds.length})` },
              { key: "sell", label: `Sell (${sells.length})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTrendFilter(key)}
              style={{
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: trendFilter === key ? 600 : 400,
                background:
                  trendFilter === key
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--card)/0.6)",
                backdropFilter: "blur(8px)",
                border: `1px solid ${trendFilter === key ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                color:
                  trendFilter === key
                    ? "hsl(var(--background))"
                    : "hsl(var(--muted-foreground))",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Signal cards grid */}
      {displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <BarChart2
            size={24}
            style={{
              color: "hsl(var(--muted-foreground))",
              margin: "0 auto 12px",
              display: "block",
              opacity: 0.3,
            }}
          />
          <p
            style={{
              fontSize: "14px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 300,
            }}
          >
            No {trendFilter !== "all" ? trendFilter : ""} signals found.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "14px",
            alignItems: "start",
            paddingBottom: "24px",
          }}
        >
          {" "}
          {displayed.map((signal, i) => (
            <StockSignalCard
              key={signal.ticker}
              signal={signal}
              rank={i}
              onClick={() => setSelectedSignal(signal)}
              inCart={cart.includes(signal.ticker)}
              onCartToggle={(e) => {
                e.stopPropagation();
                onCartToggle(signal.ticker);
              }}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedSignal && (
          <StockSignalDetail
            signal={selectedSignal}
            onClose={() => setSelectedSignal(null)}
            inCart={cart.includes(selectedSignal.ticker)}
            onCartToggle={() => onCartToggle(selectedSignal.ticker)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function FinancialNews() {
  const { isLoggedIn, userId } = useAuth();

  const [mode, setMode] = useState<NewsMode>("general");
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [totalToAnalyze, setTotalToAnalyze] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheAgeStr, setCacheAgeStr] = useState("");
  const [userTickers, setUserTickers] = useState<string[]>([]);
  const [tickerNames, setTickerNames] = useState<Record<string, string>>({});
  const [isResolvingNames, setIsResolvingNames] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [stockSignals, setStockSignals] = useState<StockSignal[]>([]);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);

  // Cart state
  const [cart, setCart] = useState<string[]>(() => readCart());
  const [showCart, setShowCart] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const cartToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const counts = {
    positive: articles.filter((a) => a.sentiment === "positive").length,
    negative: articles.filter((a) => a.sentiment === "negative").length,
    neutral: articles.filter((a) => a.sentiment === "neutral").length,
    pending: articles.filter((a) => a.sentiment === "pending").length,
  };
  const total = counts.positive + counts.negative + counts.neutral;
  const displayed =
    filter === "all"
      ? articles
      : articles.filter((a) => a.sentiment === filter);
  const pct =
    totalToAnalyze > 0 ? Math.round((analyzedCount / totalToAnalyze) * 100) : 0;

  // Cart handlers
  const handleCartToggle = useCallback((ticker: string) => {
    setCart((prev) => {
      const next = prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      writeCart(next);
      return next;
    });
    // Show toast briefly
    if (cartToastTimer.current) clearTimeout(cartToastTimer.current);
    setShowCartToast(true);
    cartToastTimer.current = setTimeout(() => setShowCartToast(false), 4000);
  }, []);

  const handleCartRemove = useCallback((ticker: string) => {
    setCart((prev) => {
      const next = prev.filter((t) => t !== ticker);
      writeCart(next);
      return next;
    });
  }, []);

  const handleCartClear = useCallback(() => {
    setCart([]);
    writeCart([]);
  }, []);

  const handleGoToOptimizer = useCallback(() => {
    // Store cart in localStorage so StockInput can read it
    writeCart(cart);
    window.location.href = "/Optimizer";
  }, [cart]);

  // Recompute signals whenever articles or ticker names change
  useEffect(() => {
    if (mode === "portfolio" && portfolioTickers.length === 0) {
      setStockSignals([]);
      return;
    }
    if (articles.some((a) => a.analyzed)) {
      const filterTickers = mode === "portfolio" ? portfolioTickers : undefined;
      setStockSignals(
        computeStockSignals(articles, tickerNames, filterTickers),
      );
    }
  }, [articles, tickerNames, mode, portfolioTickers]);

  const analyzeAll = async (all: Article[], cacheKey: string) => {
    setIsAnalyzing(true);
    setTotalToAnalyze(all.length);
    setAnalyzedCount(0);
    const batches: Article[][] = [];
    for (let i = 0; i < all.length; i += BATCH)
      batches.push(all.slice(i, i + BATCH));
    let done = 0;
    const finalArticles: Article[] = [...all];

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      if (bi > 0) await new Promise((r) => setTimeout(r, 5000));
      try {
        const results = await analyzeWithAI(batch);
        setArticles((prev) => {
          const next = prev.map((article) => {
            const r = results.find((x) => x.id === article.id);
            if (!r)
              return batch.some((b) => b.id === article.id)
                ? {
                    ...article,
                    sentiment: "neutral" as Sentiment,
                    analyzed: true,
                    sentimentReason: "",
                    stocks: article.stocks,
                  }
                : article;
            // Normalize AI-extracted stocks using the alias map
            const normalizedAiStocks = (
              Array.isArray(r.stocks) ? r.stocks : []
            ).map(normalizeNseTicker);
            const mergedStocks = [
              ...new Set([...article.stocks, ...normalizedAiStocks]),
            ];
            return {
              ...article,
              stocks: mergedStocks,
              sentiment: (["positive", "negative", "neutral"].includes(
                r.sentiment,
              )
                ? r.sentiment
                : "neutral") as Sentiment,
              sentimentReason: r.reason ?? "",
              analyzed: true,
            };
          });
          next.forEach((a, i) => {
            finalArticles[i] = a;
          });
          return next;
        });
        done += batch.length;
        setAnalyzedCount(done);
      } catch {
        setArticles((prev) =>
          prev.map((a) =>
            batch.some((b) => b.id === a.id) && !a.analyzed
              ? { ...a, sentiment: "neutral" as Sentiment, analyzed: true }
              : a,
          ),
        );
        done += batch.length;
        setAnalyzedCount(done);
      }
    }
    setIsAnalyzing(false);
    setTimeout(() => {
      setArticles((latest) => {
        writeCache(latest, cacheKey);
        return latest;
      });
    }, 200);
  };

  const fetchGeneral = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsFetching(true);
    setIsAnalyzing(false);
    setError(null);
    setArticles([]);
    setAnalyzedCount(0);
    setTotalToAnalyze(0);
    setCacheAgeStr("");
    setStockSignals([]);
    setShowIntelligence(false);
    setPortfolioTickers([]);

    try {
      const rssPromises = RSS_FEEDS.map((f) => fetchRssViaProxy(f));
      const ndPromises = GENERAL_NEWSDATA_QUERIES.map(
        ({ q, category }, i) =>
          new Promise<Article[]>((resolve) =>
            setTimeout(() => fetchNewsData(q, category).then(resolve), i * 200),
          ),
      );
      const gnewsAll = async () => {
        const all: Article[] = [];
        for (const q of GENERAL_GNEWS_QUERIES) {
          all.push(...(await fetchGNews(q)));
        }
        return all;
      };
      const [rssR, ndR, gnR] = await Promise.all([
        Promise.allSettled(rssPromises).then((rs) =>
          rs
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value),
        ),
        Promise.allSettled(ndPromises).then((rs) =>
          rs
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value),
        ),
        gnewsAll(),
      ]);
      const pool = [...rssR, ...ndR, ...gnR].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      const clean = dedup(pool);
      if (!clean.length) {
        setError(
          "No articles retrieved. Check your backend server is running on port 5000.",
        );
        setIsFetching(false);
        return;
      }
      setArticles(clean);
      setLastFetched(new Date());
      setIsFetching(false);
      await analyzeAll(clean, CACHE_KEY);
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setError("Fetch failed. Make sure your backend server is running.");
      setIsFetching(false);
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsFetching(true);
    setIsAnalyzing(false);
    setError(null);
    setArticles([]);
    setAnalyzedCount(0);
    setTotalToAnalyze(0);
    setCacheAgeStr("");
    setStockSignals([]);
    setShowIntelligence(false);

    try {
      const tickers = await fetchUserTickers(userId);
      if (!tickers.length) {
        setError(
          "No stocks found in your portfolio. Add stocks to your portfolio first.",
        );
        setIsFetching(false);
        return;
      }
      setUserTickers(tickers);
      setPortfolioTickers(tickers);
      setIsResolvingNames(true);
      const nameMap = await resolveTickerNames(tickers);
      setTickerNames(nameMap);
      setIsResolvingNames(false);
      const raw = await fetchPortfolioNews(tickers, nameMap);
      const clean = dedup(raw);
      if (!clean.length) {
        setError("No news found for your portfolio stocks.");
        setIsFetching(false);
        return;
      }
      setArticles(clean);
      setLastFetched(new Date());
      setIsFetching(false);
      await analyzeAll(clean, PORTFOLIO_CACHE_KEY);
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setError("Failed to fetch portfolio news. Please try again.");
      setIsFetching(false);
      setIsResolvingNames(false);
    }
  }, [isLoggedIn, userId]);

  const handleModeSwitch = (newMode: NewsMode) => {
    if (newMode === mode || isFetching || isAnalyzing) return;
    setArticles([]);
    setStockSignals([]);
    setShowIntelligence(false);
    setMode(newMode);
    setFilter("all");
    setError(null);
    if (newMode === "general") {
      setPortfolioTickers([]);
      setUserTickers([]);
      const cache = readCache(CACHE_KEY);
      if (cacheIsValid(cache)) {
        setArticles(cache!.articles);
        setLastFetched(new Date(cache!.fetchedAt));
        setCacheAgeStr(cacheAge(cache));
        setStockSignals(
          computeStockSignals(cache!.articles, tickerNames, undefined),
        );
        return;
      }
      fetchGeneral();
    } else {
      setPortfolioTickers([]);
      fetchPortfolio();
    }
  };

  const handleRefresh = () => {
    setShowIntelligence(false);
    if (mode === "general") fetchGeneral();
    else fetchPortfolio();
  };

  useEffect(() => {
    const cache = readCache(CACHE_KEY);
    if (cacheIsValid(cache)) {
      setArticles(cache!.articles);
      setLastFetched(new Date(cache!.fetchedAt));
      setCacheAgeStr(cacheAge(cache));
      setStockSignals(computeStockSignals(cache!.articles, {}, undefined));
      const iv = setInterval(
        () => setCacheAgeStr(cacheAge(readCache(CACHE_KEY))),
        60000,
      );
      return () => clearInterval(iv);
    } else {
      fetchGeneral();
    }
  }, []);

  const fmt = (iso: string) => {
    try {
      const d = new Date(iso),
        now = new Date();
      const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
      if (diffH < 1)
        return `${Math.floor((now.getTime() - d.getTime()) / 60000)}m ago`;
      if (diffH < 24) return `${diffH}h ago`;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "—";
    }
  };

  const intelligenceReady =
    !isAnalyzing &&
    !isFetching &&
    stockSignals.length > 0 &&
    (mode !== "portfolio" || portfolioTickers.length > 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "hsl(var(--background))",
        position: "relative",
      }}
    >
      {/* Grid backgrounds */}
      <div
        className="dark:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(to right,rgba(229,231,235,0.8) 1px,transparent 1px),linear-gradient(to bottom,rgba(229,231,235,0.8) 1px,transparent 1px),radial-gradient(circle 500px at 20% 100%,rgba(139,92,246,0.3),transparent),radial-gradient(circle 500px at 100% 80%,rgba(59,130,246,0.3),transparent)`,
          backgroundSize: "48px 48px,48px 48px,100% 100%,100% 100%",
        }}
      />
      <div
        className="hidden dark:block"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(to right,rgba(71,85,105,0.2) 1px,transparent 1px),linear-gradient(to bottom,rgba(71,85,105,0.2) 1px,transparent 1px),radial-gradient(circle 500px at 20% 100%,rgba(139,92,246,0.25),transparent),radial-gradient(circle 500px at 100% 80%,rgba(59,130,246,0.2),transparent)`,
          backgroundSize: "48px 48px,48px 48px,100% 100%,100% 100%",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <Navbar />

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.3} }
          @keyframes intel-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,0.12)} }
          .filter-tab:hover { color: hsl(var(--foreground)) !important; }
          .article-row:hover { background: hsl(var(--secondary)/0.8) !important; }
          .mode-btn:hover { opacity: 1 !important; }
          .intel-pulse { animation: intel-pulse 2.8s ease-in-out infinite; }
        `}</style>

        <main style={{ flex: 1 }}>
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "48px 24px 80px",
              position: "relative",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Page Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "28px",
                }}
              >
                <div>
                  <p
                    style={{
                      marginBottom: "6px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Indian markets
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h1
                      style={{
                        fontSize: "clamp(1.8rem,4vw,2.4rem)",
                        color: "hsl(var(--foreground))",
                        margin: 0,
                        letterSpacing: "-0.03em",
                        fontWeight: 600,
                      }}
                    >
                      Market News
                    </h1>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "99px",
                        padding: "3px 9px",
                        fontSize: "10px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#22c55e",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "#22c55e",
                          animation: "pulse-dot 2.4s ease-in-out infinite",
                        }}
                      />
                      Live
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: 300,
                      lineHeight: 1.65,
                      maxWidth: "440px",
                      margin: 0,
                    }}
                  >
                    AI-analysed headlines from NSE, BSE and Indian equity
                    markets. Sentiment scored in real time.
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    paddingTop: "4px",
                    flexShrink: 0,
                  }}
                >
                  {cacheAgeStr && !isFetching && !isAnalyzing && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "hsl(var(--muted-foreground))",
                        fontFamily: "monospace",
                      }}
                    >
                      cached {cacheAgeStr}
                    </span>
                  )}
                  {lastFetched && !cacheAgeStr && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {lastFetched.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {articles.length > 0 && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {articles.length} stories
                    </span>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={isFetching || isAnalyzing}
                    style={{
                      height: "32px",
                      padding: "0 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "hsl(var(--card)/0.7)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "7px",
                      cursor:
                        isFetching || isAnalyzing ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      color: "hsl(var(--foreground))",
                      opacity: isFetching || isAnalyzing ? 0.45 : 1,
                      transition: "opacity 0.12s",
                    }}
                  >
                    {isFetching ? (
                      <Loader2
                        size={12}
                        style={{ animation: "spin 0.8s linear infinite" }}
                      />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {isFetching
                      ? "Fetching…"
                      : isAnalyzing
                        ? "Analysing…"
                        : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Controls row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleModeSwitch("general")}
                    className="mode-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background:
                        mode === "general"
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--card)/0.7)",
                      backdropFilter: "blur(8px)",
                      border: `1px solid ${mode === "general" ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: mode === "general" ? 500 : 400,
                      color:
                        mode === "general"
                          ? "hsl(var(--background))"
                          : "hsl(var(--muted-foreground))",
                      opacity: mode === "general" ? 1 : 0.75,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <Globe size={12} /> General
                  </button>
                  <button
                    onClick={() => {
                      if (isLoggedIn) handleModeSwitch("portfolio");
                    }}
                    className="mode-btn"
                    title={
                      !isLoggedIn ? "Sign in to view portfolio news" : undefined
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background:
                        mode === "portfolio"
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--card)/0.7)",
                      backdropFilter: "blur(8px)",
                      border: `1px solid ${mode === "portfolio" ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: mode === "portfolio" ? 500 : 400,
                      color:
                        mode === "portfolio"
                          ? "hsl(var(--background))"
                          : "hsl(var(--muted-foreground))",
                      opacity: !isLoggedIn
                        ? 0.4
                        : mode === "portfolio"
                          ? 1
                          : 0.75,
                      cursor: !isLoggedIn ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <Briefcase size={12} /> My Portfolio
                    {!isLoggedIn && (
                      <span style={{ fontSize: "10px", opacity: 0.7 }}>
                        · sign in
                      </span>
                    )}
                  </button>
                </div>

                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  {/* Cart button in top controls */}
                  {cart.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setShowCart(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        background: "rgba(34,197,94,0.08)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#22c55e",
                        transition: "all 0.15s",
                      }}
                    >
                      <ShoppingCart size={13} />
                      {cart.length} stock{cart.length > 1 ? "s" : ""} →
                      Optimizer
                    </motion.button>
                  )}

                  {/* Market Intelligence button */}
                  <AnimatePresence>
                    {(intelligenceReady || isAnalyzing) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => {
                          if (intelligenceReady) setShowIntelligence((v) => !v);
                        }}
                        disabled={isAnalyzing}
                        className={
                          intelligenceReady && !showIntelligence
                            ? "intel-pulse"
                            : ""
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "7px 16px",
                          background: showIntelligence
                            ? "hsl(var(--foreground))"
                            : intelligenceReady
                              ? "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(59,130,246,0.1))"
                              : "hsl(var(--card)/0.7)",
                          backdropFilter: "blur(8px)",
                          border: `1px solid ${showIntelligence ? "hsl(var(--foreground))" : intelligenceReady ? "rgba(34,197,94,0.4)" : "hsl(var(--border))"}`,
                          borderRadius: "8px",
                          cursor: intelligenceReady ? "pointer" : "default",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: showIntelligence
                            ? "hsl(var(--background))"
                            : intelligenceReady
                              ? "#22c55e"
                              : "hsl(var(--muted-foreground))",
                          opacity: isAnalyzing ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2
                              size={12}
                              style={{
                                animation: "spin 0.8s linear infinite",
                                color: "hsl(var(--muted-foreground))",
                              }}
                            />
                            <span
                              style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                              Building signals… {pct}%
                            </span>
                            <div
                              style={{
                                width: "40px",
                                height: "2px",
                                background: "hsl(var(--border))",
                                borderRadius: "99px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: "#22c55e",
                                  transition: "width 0.4s",
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            {showIntelligence
                              ? "Back to News"
                              : mode === "portfolio"
                                ? "Portfolio Intelligence"
                                : "Market Intelligence"}
                            {!showIntelligence && stockSignals.length > 0 && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  background: "rgba(34,197,94,0.18)",
                                  border: "1px solid rgba(34,197,94,0.35)",
                                  borderRadius: "99px",
                                  padding: "1px 7px",
                                  color: "#22c55e",
                                  fontWeight: 700,
                                }}
                              >
                                {stockSignals.length}
                              </span>
                            )}
                          </>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Portfolio ticker pills */}
              <AnimatePresence>
                {mode === "portfolio" &&
                  userTickers.length > 0 &&
                  !isFetching && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden", marginBottom: "16px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                            fontFamily: "monospace",
                          }}
                        >
                          tracking
                        </span>
                        {userTickers.map((ticker) => (
                          <span
                            key={ticker}
                            title={
                              tickerNames[ticker] &&
                              tickerNames[ticker] !== ticker
                                ? tickerNames[ticker]
                                : undefined
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "hsl(var(--secondary))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "4px",
                              padding: "2px 7px",
                              fontSize: "11px",
                              fontWeight: 500,
                              fontFamily: "monospace",
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {ticker}
                            {tickerNames[ticker] &&
                              tickerNames[ticker] !== ticker && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "hsl(var(--muted-foreground))",
                                    fontWeight: 400,
                                  }}
                                >
                                  ·{" "}
                                  {tickerNames[ticker]
                                    .split(" ")
                                    .slice(0, 2)
                                    .join(" ")}
                                </span>
                              )}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Sentiment summary bar */}
              {articles.length > 0 && !isFetching && total > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      height: "3px",
                      borderRadius: "99px",
                      overflow: "hidden",
                      background: "hsl(var(--border))",
                      display: "flex",
                      marginBottom: "12px",
                    }}
                  >
                    {(["positive", "negative", "neutral"] as const).map((s) => {
                      const p = total > 0 ? (counts[s] / total) * 100 : 0;
                      return (
                        <div
                          key={s}
                          style={{
                            height: "100%",
                            width: `${p}%`,
                            background:
                              s === "positive"
                                ? "#22c55e"
                                : s === "negative"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    {(["positive", "negative", "neutral"] as const).map((s) => {
                      const cfg = S[s];
                      const p =
                        total > 0 ? Math.round((counts[s] / total) * 100) : 0;
                      const active = filter === s;
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setFilter((f) => (f === s ? "all" : s))
                          }
                          className="filter-tab"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            opacity: filter !== "all" && !active ? 0.3 : 1,
                            transition: "opacity 0.12s",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: cfg.dot,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "12px",
                              color: active
                                ? cfg.color
                                : "hsl(var(--muted-foreground))",
                            }}
                          >
                            {cfg.label}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {counts[s]}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "hsl(var(--muted-foreground))",
                            }}
                          >
                            {p}%
                          </span>
                        </button>
                      );
                    })}
                    {isAnalyzing && (
                      <div
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Loader2
                          size={10}
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <div
                          style={{
                            width: "60px",
                            height: "2px",
                            background: "hsl(var(--border))",
                            borderRadius: "99px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: "hsl(var(--foreground))",
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        >
                          {analyzedCount}/{totalToAnalyze}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter tab bar */}
              {articles.length > 0 && !isFetching && (
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    borderBottom: "1px solid hsl(var(--border))",
                    marginBottom: 0,
                  }}
                >
                  {(
                    ["all", "positive", "negative", "neutral"] as FilterType[]
                  ).map((key) => {
                    const labels = {
                      all: "All",
                      positive: "Bullish",
                      negative: "Bearish",
                      neutral: "Neutral",
                    };
                    const active = filter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className="filter-tab"
                        style={{
                          padding: "8px 16px",
                          background: "none",
                          border: "none",
                          borderBottom: active
                            ? "1.5px solid hsl(var(--foreground))"
                            : "1.5px solid transparent",
                          marginBottom: "-1px",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: active
                            ? "hsl(var(--foreground))"
                            : "hsl(var(--muted-foreground))",
                          fontWeight: active ? 500 : 400,
                          transition: "color 0.12s",
                        }}
                      >
                        {labels[key]}
                        {key !== "all" && (
                          <span style={{ marginLeft: "5px", opacity: 0.45 }}>
                            {counts[key as keyof typeof counts]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Banners */}
            {mode === "portfolio" && !isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: "32px 0",
                  padding: "20px 24px",
                  background: "hsl(var(--card)/0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "hsl(var(--secondary))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Briefcase
                    size={14}
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 500,
                      color: "hsl(var(--foreground))",
                      margin: "0 0 3px 0",
                    }}
                  >
                    Sign in to see portfolio news
                  </p>
                  <p
                    style={{
                      fontSize: "12.5px",
                      color: "hsl(var(--muted-foreground))",
                      margin: 0,
                      fontWeight: 300,
                    }}
                  >
                    Get AI-analysed news specifically for the stocks in your
                    portfolio.
                  </p>
                </div>
                <a
                  href="/SignIn"
                  style={{
                    flexShrink: 0,
                    padding: "7px 16px",
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Sign in
                </a>
              </motion.div>
            )}

            {error && (
              <div
                style={{
                  margin: "20px 0",
                  padding: "12px 16px",
                  background: "hsl(var(--card)/0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <AlertCircle
                  size={13}
                  style={{ color: "#dc2626", flexShrink: 0, marginTop: "1px" }}
                />
                <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            {(isFetching || (isAnalyzing && articles.length === 0)) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px 24px",
                  gap: "12px",
                }}
              >
                <Loader2
                  size={16}
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: "13.5px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                  }}
                >
                  {isResolvingNames
                    ? "Resolving company names…"
                    : isFetching
                      ? mode === "portfolio"
                        ? `Fetching news for ${userTickers.length} portfolio stocks…`
                        : "Fetching latest market news…"
                      : `Analysing ${totalToAnalyze} articles (${pct}%)…`}
                </span>
              </div>
            )}

            {/* Content: News grid OR Intelligence overlay */}
            <div style={{ position: "relative" }}>
              {!isFetching && (mode === "general" || isLoggedIn) && (
                <div
                  style={{
                    opacity: showIntelligence ? 0 : 1,
                    pointerEvents: showIntelligence ? "none" : "auto",
                    transition: "opacity 0.18s ease",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      border:
                        articles.length > 0
                          ? "1px solid hsl(var(--border))"
                          : "none",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                      {displayed.length > 0
                        ? displayed.map((article, idx) => {
                            const s = (
                              [
                                "positive",
                                "negative",
                                "neutral",
                                "pending",
                              ].includes(article.sentiment)
                                ? article.sentiment
                                : "neutral"
                            ) as keyof typeof S;
                            const cfg = S[s];
                            const isPend = s === "pending";
                            const isRight = idx % 2 === 1;
                            return (
                              <motion.div
                                key={article.id}
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.15,
                                  delay: Math.min(idx * 0.006, 0.1),
                                }}
                              >
                                <div
                                  className="article-row"
                                  onClick={() => setSelectedArticle(article)}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "3px 1fr auto",
                                    borderBottom:
                                      "1px solid hsl(var(--border))",
                                    borderLeft: isRight
                                      ? "1px solid hsl(var(--border))"
                                      : "none",
                                    height: "100%",
                                    background: "hsl(var(--card)/0.6)",
                                    backdropFilter: "blur(8px)",
                                    cursor: "pointer",
                                    transition: "background 0.12s",
                                  }}
                                >
                                  <div
                                    style={{
                                      background: article.analyzed
                                        ? cfg.dot
                                        : "transparent",
                                      transition: "background 0.3s",
                                    }}
                                  />
                                  <div
                                    style={{
                                      padding: "14px 16px 14px 14px",
                                      minWidth: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        marginBottom: "5px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                          fontSize: "11px",
                                          color: cfg.color,
                                          fontWeight: 500,
                                        }}
                                      >
                                        <cfg.Icon
                                          size={9}
                                          style={
                                            isPend
                                              ? {
                                                  animation:
                                                    "spin 0.8s linear infinite",
                                                }
                                              : {}
                                          }
                                        />
                                        {cfg.label}
                                      </span>
                                      <span
                                        style={{
                                          width: "1px",
                                          height: "10px",
                                          background: "hsl(var(--border))",
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "hsl(var(--muted-foreground))",
                                          fontWeight: 300,
                                        }}
                                      >
                                        {article.source}
                                      </span>
                                      {article.stocks.slice(0, 2).map((tk) => (
                                        <span
                                          key={tk}
                                          style={{
                                            background: "hsl(var(--secondary))",
                                            border:
                                              "1px solid hsl(var(--border))",
                                            borderRadius: "3px",
                                            padding: "1px 5px",
                                            fontSize: "10px",
                                            fontFamily: "monospace",
                                            color: "hsl(var(--foreground))",
                                            fontWeight: 500,
                                          }}
                                        >
                                          {tk}
                                        </span>
                                      ))}
                                      {article.stocks.length > 2 && (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            color:
                                              "hsl(var(--muted-foreground))",
                                          }}
                                        >
                                          +{article.stocks.length - 2}
                                        </span>
                                      )}
                                    </div>
                                    <h3
                                      style={{
                                        fontSize: "13.5px",
                                        fontWeight: 500,
                                        letterSpacing: "-0.01em",
                                        lineHeight: 1.45,
                                        color: "hsl(var(--foreground))",
                                        margin: "0 0 5px 0",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {article.title}
                                    </h3>
                                    {article.sentimentReason && !isPend && (
                                      <p
                                        style={{
                                          fontSize: "11.5px",
                                          color: "hsl(var(--muted-foreground))",
                                          lineHeight: 1.5,
                                          margin: 0,
                                          fontWeight: 400,
                                          display: "-webkit-box",
                                          WebkitLineClamp: 1,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {toTitleCase(article.sentimentReason)}
                                      </p>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      justifyContent: "space-between",
                                      padding: "14px 14px 14px 0",
                                      minWidth: "60px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        color: "hsl(var(--muted-foreground))",
                                        fontWeight: 300,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {fmt(article.publishedAt)}
                                    </span>
                                    <a
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "hsl(var(--foreground))",
                                        textDecoration: "none",
                                        opacity: 0.25,
                                        transition: "opacity 0.12s",
                                      }}
                                      onMouseEnter={(e) => {
                                        (
                                          e.currentTarget as HTMLElement
                                        ).style.opacity = "1";
                                      }}
                                      onMouseLeave={(e) => {
                                        (
                                          e.currentTarget as HTMLElement
                                        ).style.opacity = "0.25";
                                      }}
                                    >
                                      Read <ExternalLink size={10} />
                                    </a>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })
                        : !isFetching &&
                          articles.length > 0 && (
                            <div
                              style={{
                                gridColumn: "1/-1",
                                textAlign: "center",
                                padding: "48px 24px",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "hsl(var(--muted-foreground))",
                                  marginBottom: "16px",
                                  fontWeight: 300,
                                }}
                              >
                                No {filter} articles right now.
                              </p>
                              <button
                                onClick={() => setFilter("all")}
                                style={{
                                  padding: "7px 16px",
                                  background: "hsl(var(--card)/0.7)",
                                  backdropFilter: "blur(8px)",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "7px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  color: "hsl(var(--foreground))",
                                }}
                              >
                                Show all
                              </button>
                            </div>
                          )}
                    </AnimatePresence>
                  </div>
                  {!isFetching && articles.length === 0 && !error && (
                    <div style={{ textAlign: "center", padding: "80px 24px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 300,
                        }}
                      >
                        Loading articles…
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Intelligence overlay */}
              <AnimatePresence>
                {showIntelligence && (
                  <MarketIntelligenceOverlay
                    signals={stockSignals}
                    onClose={() => setShowIntelligence(false)}
                    isPortfolio={mode === "portfolio"}
                    cart={cart}
                    onCartToggle={handleCartToggle}
                    onOpenCart={() => setShowCart(true)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <Separator />
        <Footer />
      </div>

      {/* Top-level ArticleDrawer */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleDrawer
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
            backdropZ={Z.articleBackdrop}
            panelZ={Z.articlePanel}
          />
        )}
      </AnimatePresence>

      {/* Cart Panel */}
      <AnimatePresence>
        {showCart && (
          <CartPanel
            cart={cart}
            signals={stockSignals}
            onRemove={handleCartRemove}
            onClear={handleCartClear}
            onGoToOptimizer={handleGoToOptimizer}
            onClose={() => setShowCart(false)}
          />
        )}
      </AnimatePresence>

      {/* Cart Toast */}
      <AnimatePresence>
        {showCartToast && cart.length > 0 && !showCart && (
          <CartToast
            cartCount={cart.length}
            onGoToOptimizer={handleGoToOptimizer}
            onDismiss={() => setShowCartToast(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
