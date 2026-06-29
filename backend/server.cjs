const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    /\.vercel\.app$/,
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(bodyParser.json({ limit: "10mb" }));

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const splitKeys = (envVal) =>
  (envVal || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

const GEMINI_KEYS = splitKeys(process.env.GEMINI_KEYS);
const GROQ_KEYS = splitKeys(process.env.GROQ_KEYS);
const NEWSDATA_KEYS = splitKeys(process.env.NEWSDATA_KEYS);
const GNEWS_KEYS = splitKeys(process.env.GNEWS_KEYS);

let ndKeyIdx = 0;
let gnewsKeyIdx = 0;
let gnewsLastCall = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Per-key backoff tracker ───────────────────────────────────────────────────
const keyBackoff = new Map();
const isResting = (key) => Date.now() < (keyBackoff.get(key) ?? 0);
const restKey = (key, ms = 60_000) => keyBackoff.set(key, Date.now() + ms);
const activeKeys = (pool) => pool.filter((k) => !isResting(k));

// ── JSON array parser helper ──────────────────────────────────────────────────
function extractJsonArray(raw) {
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const s = cleaned.indexOf("["),
    e = cleaned.lastIndexOf("]");
  if (s === -1 || e === -1) return null;
  try {
    return JSON.parse(cleaned.slice(s, e + 1));
  } catch {
    return null;
  }
}

// ── Gemini: race all active keys in parallel per model ────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_KEYS.length) return null;
  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
  ];
  for (const model of models) {
    const keys = activeKeys(GEMINI_KEYS);
    if (!keys.length) continue;
    const tryKey = async (key) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (res.status === 429) {
        restKey(key);
        throw new Error("quota");
      }
      if (!res.ok) {
        restKey(key, 10_000);
        throw new Error(`http_${res.status}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const arr = extractJsonArray(text);
      if (!arr?.length) throw new Error("no_json");
      return arr;
    };
    try {
      return await Promise.any(keys.map(tryKey));
    } catch {
      /* all keys failed for this model, try next */
    }
  }
  return null;
}

// ── Groq: race all active keys in parallel per model ─────────────────────────
async function callGroq(prompt) {
  if (!GROQ_KEYS.length) return null;
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  for (const model of models) {
    const keys = activeKeys(GROQ_KEYS);
    if (!keys.length) continue;
    const maxTok = model.includes("8b") ? 2048 : 4096;
    const tryKey = async (key) => {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Senior Indian equity analyst. Return ONLY valid JSON array, no markdown.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.1,
            max_tokens: maxTok,
          }),
          signal: AbortSignal.timeout(30000),
        },
      );
      if (res.status === 429) {
        restKey(key);
        throw new Error("quota");
      }
      if (!res.ok) {
        restKey(key, 10_000);
        throw new Error(`http_${res.status}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const arr = extractJsonArray(text);
      if (!arr?.length) throw new Error("no_json");
      return arr;
    };
    try {
      return await Promise.any(keys.map(tryKey));
    } catch {
      /* all keys failed for this model, try next */
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════════
// ── CORE: Single optimize endpoint ──────────────────────────────────────────────
// POST /api/optimize
// Body: { tickers: string[], investment: number, risk: string, userId: string }
// ════════════════════════════════════════════════════════════════════════════════
app.post("/api/optimize", (req, res) => {
  const {
    tickers,
    investment,
    risk = "balanced",
    userId,
    deepMode = false,
  } = req.body;

  if (!Array.isArray(tickers) || tickers.length < 2)
    return res.status(400).json({ error: "Provide at least 2 tickers." });
  if (!investment || investment <= 0)
    return res
      .status(400)
      .json({ error: "Provide a valid investment amount." });
  if (!userId) return res.status(400).json({ error: "Sign in to optimize." });

  const validRisk = ["conservative", "balanced", "aggressive"];
  const finalRisk = validRisk.includes(risk?.toLowerCase())
    ? risk.toLowerCase()
    : "balanced";

  const scriptPath = path.join(__dirname, "api", "optimize.py");
  const payload = JSON.stringify({
    tickers,
    investment,
    risk: finalRisk,
    tune: !!deepMode,
  });

  console.log(
    `\n🚀 [optimize] tickers=${tickers.join(",")} risk=${finalRisk} ₹${investment} deepMode=${!!deepMode}`,
  );

  // Spawn: python api/optimize.py  <  payload JSON
  // The script reads stdin, runs the full pipeline, prints one JSON line.
  const py = spawn("python", [scriptPath], {
    cwd: __dirname,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });

  let stdout = "";
  let stderr = "";

  py.stdin.write(payload);
  py.stdin.end();

  py.stdout.on("data", (d) => {
    stdout += d.toString();
  });
  py.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  py.on("close", (code) => {
    if (code !== 0) {
      console.error("[optimize] Python error:\n", stderr.slice(-2000));
      return res
        .status(500)
        .json({ error: "Optimizer failed. Check server logs." });
    }
    try {
      const result = JSON.parse(stdout);
      if (result.error) return res.status(400).json(result);

      return res.status(200).json(result);
    } catch (e) {
      console.error(
        "[optimize] JSON parse failed:",
        e.message,
        "\nstdout:",
        stdout.slice(-500),
      );
      return res.status(500).json({ error: "Invalid optimizer output." });
    }
  });
});

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("Stock Optimize API — v2 streamlined"));

// ── Sign up ───────────────────────────────────────────────────────────────────
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required." });

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
  if (authError) {
    if (authError.message?.toLowerCase().includes("already"))
      return res.status(400).json({ error: "Email already exists." });
    return res.status(500).json({ error: authError.message });
  }

  await supabase
    .from("user_profiles")
    .insert({ id: authData.user.id, name, email });
  return res.status(201).json({ message: "User registered successfully" });
});

// ── Sign in ───────────────────────────────────────────────────────────────────
app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "All fields are required." });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error)
    return res.status(400).json({ error: "Invalid email or password" });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name")
    .eq("id", data.user.id)
    .single();

  return res.status(200).json({
    message: "Login successful",
    userId: data.user.id,
    email: data.user.email,
    name: profile?.name ?? data.user.user_metadata?.name ?? "",
  });
});

// ── Risk profile (save / load) ────────────────────────────────────────────────
app.get("/api/userRiskProfile/:userId", async (req, res) => {
  const { data, error } = await supabase
    .from("user_risk_profiles")
    .select("*")
    .eq("user_id", req.params.userId)
    .single();
  if (error || !data)
    return res.status(404).json({ error: "No risk profile found" });
  return res.status(200).json({
    breakdown: {
      ageScore: data.age_score,
      savingsScore: data.savings_score,
      familyScore: data.family_score,
      horizonScore: data.horizon_score,
      investmentScore: data.investment_score,
      ratioScore: data.ratio_score,
      totalScore: data.total_score,
      reasons: data.reasons,
    },
    profile: data.recommended_profile,
    profileData: data.profile_data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
});

app.post("/api/saveRiskProfile", async (req, res) => {
  const { userId, breakdown, profile, profileData } = req.body;
  if (!userId || !breakdown || !profile)
    return res.status(400).json({ error: "Missing required fields" });

  const { error } = await supabase.from("user_risk_profiles").upsert(
    {
      user_id: userId,
      age_score: breakdown.ageScore,
      savings_score: breakdown.savingsScore,
      family_score: breakdown.familyScore,
      horizon_score: breakdown.horizonScore,
      investment_score: breakdown.investmentScore,
      ratio_score: breakdown.ratioScore,
      total_score: breakdown.totalScore,
      recommended_profile: profile,
      reasons:
        typeof breakdown.reasons === "string"
          ? JSON.parse(breakdown.reasons)
          : breakdown.reasons || {},
      profile_data:
        typeof profileData === "string"
          ? JSON.parse(profileData)
          : profileData || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error)
    return res.status(500).json({ error: "Failed to save: " + error.message });
  return res.status(200).json({ message: "Risk profile saved" });
});

// ── User portfolios ───────────────────────────────────────────────────────────
app.get("/api/userPortfolios/:userId", async (req, res) => {
  const { data, error } = await supabase
    .from("user_portfolios")
    .select(
      "ticker, allocation, invested_inr, created_at, portfolio_session_id",
    )
    .eq("user_id", req.params.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const grouped = (data || []).reduce((acc, row) => {
    const key = row.portfolio_session_id || row.created_at;
    if (!acc[key])
      acc[key] = { sessionId: key, date: row.created_at, tickers: [] };
    acc[key].tickers.push({
      ticker: row.ticker,
      allocation: parseFloat(row.allocation) || 0,
      invested_inr: parseFloat(row.invested_inr) || 0,
    });
    return acc;
  }, {});

  return res.status(200).json({
    portfolioGroups: Object.values(grouped).sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    ),
    totalPortfolios: (data || []).length,
  });
});

app.post("/api/savePortfolio", async (req, res) => {
  const { userId, sessionId, allocation } = req.body;
  if (!userId || !sessionId || !Array.isArray(allocation) || !allocation.length)
    return res
      .status(400)
      .json({ error: "userId, sessionId and allocation required." });

  const now = new Date().toISOString();
  const rows = allocation.map((a) => ({
    user_id: userId,
    ticker: a.ticker,
    allocation: a.weight_pct,
    invested_inr: a.invested_inr ?? 0,
    portfolio_session_id: sessionId,
    created_at: now,
  }));

  const { error } = await supabase
    .from("user_portfolios")
    .upsert(rows, { onConflict: "user_id,portfolio_session_id,ticker" });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ message: "Saved", sessionId });
});

app.post("/api/deleteSession", async (req, res) => {
  const { userId, sessionId } = req.body;
  if (!userId || !sessionId)
    return res.status(400).json({ error: "userId and sessionId required." });
  const { error } = await supabase
    .from("user_portfolios")
    .delete()
    .eq("user_id", userId)
    .eq("portfolio_session_id", sessionId);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ message: "Session deleted" });
});

app.post("/api/deletePortfolio", async (req, res) => {
  const { ticker, userId, sessionId } = req.body;
  if (!ticker || !userId)
    return res.status(400).json({ error: "Ticker and userId required." });

  let query = supabase
    .from("user_portfolios")
    .delete()
    .eq("user_id", userId)
    .eq("ticker", ticker);
  if (sessionId) query = query.eq("portfolio_session_id", sessionId);
  const { data, error } = await query.select();

  if (error) return res.status(500).json({ error: error.message });
  if (!data?.length) return res.status(404).json({ error: "Not found." });
  return res.status(200).json({ message: "Deleted" });
});

// ── News analysis (Gemini → Groq fallback) ───────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  const { articles } = req.body;
  if (!articles || !Array.isArray(articles))
    return res.status(400).json({ error: "articles array required" });

  const idMap = {};
  const compressed = articles.map((a, i) => {
    const id = `A${i}`;
    idMap[id] = a.id;
    return {
      id,
      title: a.title,
      desc: (a.description || "").slice(0, 180).trim(),
    };
  });

  const prompt = `Indian equity analyst. Analyze ${compressed.length} NSE/BSE news articles.

STOCKS: Full names — "Reliance Industries","HDFC Bank","Tata Motors","Infosys","SBI","Bajaj Finance","Nifty 50","Sensex","Nifty Bank","Nifty IT","Rupee/INR","FII Flows". IPO = name the company. No stock = [].

SENTIMENT: positive=price UP (earnings beat, new order, dividend, buyback, upgrade, IPO listing, guidance raise). negative=price DOWN (earnings miss, crash, FII selling, oil spike, SEBI fine, downgrade, fraud). neutral=no signal.

ARTICLES:
${compressed.map((a) => `[${a.id}] ${a.title}${a.desc ? " | " + a.desc : ""}`).join("\n")}

Return ONLY valid JSON array:
[{"id":"A0","stocks":["Company Name"],"sentiment":"positive|negative|neutral","reason":"<15 words"}]`;

  let results = await callGemini(prompt);
  if (!results) results = await callGroq(prompt);
  if (!results)
    return res.status(500).json({ error: "AI analysis unavailable" });

  return res.status(200).json({
    results: results
      .filter((r) => r?.id)
      .map((r) => ({
        id: idMap[String(r.id)] ?? String(r.id),
        stocks: Array.isArray(r.stocks)
          ? r.stocks.filter((s) => typeof s === "string")
          : [],
        sentiment: ["positive", "negative", "neutral"].includes(r.sentiment)
          ? r.sentiment
          : "neutral",
        reason: String(r.reason || "").slice(0, 120),
      })),
  });
});

// ── News RSS proxy ────────────────────────────────────────────────────────────
app.get("/api/news/rss", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
        Accept: "application/rss+xml, */*",
      },
    });
    if (!r.ok)
      return res.status(r.status).json({ error: `Upstream ${r.status}` });
    res.set("Content-Type", "application/xml");
    res.send(await r.text());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Stock history (5Y OHLCV for charts) ──────────────────────────────────────
app.get("/api/stockHistory/:ticker", (req, res) => {
  const ticker = (req.params.ticker || "").trim().toUpperCase();
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const scriptPath = path.join(__dirname, "api", "stock_history.py");
  const py = spawn("python", [scriptPath], {
    cwd: __dirname,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });

  let stdout = "",
    stderr = "";
  py.stdin.write(ticker);
  py.stdin.end();
  py.stdout.on("data", (d) => {
    stdout += d.toString();
  });
  py.stderr.on("data", (d) => {
    stderr += d.toString();
  });
  py.on("close", (code) => {
    try {
      const result = JSON.parse(stdout);
      if (result.error) return res.status(404).json(result);
      return res.json(result);
    } catch {
      console.error("[stockHistory] parse error:", stderr.slice(-500));
      return res.status(500).json({ error: "Failed to fetch history" });
    }
  });
});

// ── Stock search (autocomplete) ───────────────────────────────────────────────
app.get("/api/searchStocks", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q || q.length < 1) return res.json({ results: [] });

  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=IN&quotesCount=12&newsCount=0`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!r.ok) return res.json({ results: [] });
    const d = await r.json();

    const results = (d?.quotes ?? [])
      .filter(
        (q) =>
          q.quoteType === "EQUITY" &&
          (q.exchange === "NSI" ||
            q.exchange === "BSE" ||
            (q.symbol || "").endsWith(".NS") ||
            (q.symbol || "").endsWith(".BO")),
      )
      .slice(0, 8)
      .map((q) => ({
        ticker: (q.symbol || "").replace(/\.(NS|BO)$/i, ""),
        symbol: q.symbol,
        name: (q.longname || q.shortname || q.symbol || "").trim(),
        exchange:
          q.exchange === "NSI" || (q.symbol || "").endsWith(".NS")
            ? "NSE"
            : "BSE",
      }));

    return res.json({ results });
  } catch (e) {
    return res.json({ results: [] });
  }
});

// ── Ticker name resolver (used by news page) ──────────────────────────────────
app.post("/api/resolveTickerNames", async (req, res) => {
  const { tickers } = req.body;
  if (!Array.isArray(tickers) || !tickers.length)
    return res.status(400).json({ error: "tickers array required" });

  const names = {};
  const CONCURRENCY = 4;
  const chunks = [];
  for (let i = 0; i < tickers.length; i += CONCURRENCY)
    chunks.push(tickers.slice(i, i + CONCURRENCY));

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (ticker) => {
        const upper = ticker.trim().toUpperCase();
        try {
          for (const sym of [`${upper}.NS`, `${upper}.BO`, upper]) {
            const r = await fetch(
              `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&lang=en-US&region=IN&quotesCount=1&newsCount=0`,
              {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(5000),
              },
            );
            if (!r.ok) continue;
            const d = await r.json();
            const match = (d?.quotes ?? []).find(
              (q) => q.longname || q.shortname,
            );
            if (match) {
              names[upper] = (match.longname || match.shortname).trim();
              break;
            }
          }
          if (!names[upper]) names[upper] = upper;
        } catch {
          names[upper] = upper;
        }
      }),
    );
    if (chunks.indexOf(chunk) < chunks.length - 1) await sleep(300);
  }

  return res.status(200).json({ names });
});

// ── Company name → NSE ticker resolver ───────────────────────────────────────
app.post("/api/resolveStockNames", async (req, res) => {
  const { names } = req.body;
  if (!Array.isArray(names) || !names.length)
    return res.status(400).json({ error: "names array required" });

  const result = {};
  const CONCURRENCY = 5;
  const chunks = [];
  for (let i = 0; i < names.length; i += CONCURRENCY)
    chunks.push(names.slice(i, i + CONCURRENCY));

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (name) => {
        const key = name.trim().toUpperCase();
        try {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(name + " India NSE")}&lang=en-US&region=IN&quotesCount=5&newsCount=0`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(6000),
            },
          );
          if (!r.ok) return;
          const d = await r.json();
          const match = (d?.quotes ?? []).find(
            (q) =>
              q.quoteType === "EQUITY" &&
              (q.exchange === "NSI" || (q.symbol || "").endsWith(".NS")),
          );
          if (match) {
            const ticker = (match.symbol || "").replace(/\.NS$/i, "");
            const companyName = (
              match.longname ||
              match.shortname ||
              ticker
            ).trim();
            result[key] = { ticker, companyName };
          }
        } catch {
          /* skip */
        }
      }),
    );
    if (chunks.indexOf(chunk) < chunks.length - 1) await sleep(200);
  }

  return res.status(200).json({ result });
});

// ── News: RSS feeds & query lists ────────────────────────────────────────────
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

const GENERAL_ND_QUERIES = [
  { q: "Sensex Nifty India", category: "business" },
  { q: "NSE BSE stock market India", category: "business" },
  { q: "India economy RBI rate", category: "business" },
  { q: "India IPO listing 2025", category: "business" },
  { q: "India earnings quarterly results profit", category: "business" },
  { q: "FII FPI India investment", category: "business" },
  { q: "Reliance TCS Infosys results", category: "business" },
  { q: "India banking HDFC ICICI SBI", category: "business" },
  { q: "India pharma auto sector stock", category: "business" },
  { q: "Adani Tata Mahindra shares", category: "business" },
  { q: "SEBI regulation India market", category: "business" },
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

// ── News: helpers ─────────────────────────────────────────────────────────────
function parseRssXml(xml, label) {
  const articles = [];
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null && articles.length < 30) {
    const item = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(
        item,
      );
      if (!r) return "";
      let v = r[1].trim();
      v = v
        .replace(/^<!\[CDATA\[/, "")
        .replace(/\]\]>$/, "")
        .trim();
      return v;
    };
    const decodeEntities = (s) =>
      s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/]]>/g, "")
        .replace(/\[\[.*?\]\]/g, "")
        .trim();
    const title = decodeEntities(
      get("title")
        .replace(/<[^>]*>/g, "")
        .trim(),
    );
    const link = get("link") || get("guid");
    if (!title || !link) continue;
    const desc = decodeEntities(
      (get("description") || get("summary") || "")
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    ).slice(0, 500);
    articles.push({
      id: `rss::${label}::${link}`,
      title,
      description: desc,
      url: link,
      image: null,
      publishedAt: get("pubDate") || new Date().toISOString(),
      source: label,
      via: "RSS",
      stocks: [],
      sentiment: "pending",
      sentimentReason: "",
      analyzed: false,
    });
  }
  return articles;
}

function dedupArticles(articles) {
  const seen = [];
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
    if (!dup) {
      const norm = (s) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .trim();
      const wa = new Set(
        norm(a.title)
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
      dup = seen.some((s) => {
        const ws = new Set(
          norm(s.title)
            .split(/\s+/)
            .filter((w) => w.length > 3),
        );
        const inter = [...wa].filter((w) => ws.has(w)).length;
        const union = new Set([...wa, ...ws]).size;
        return union > 0 && inter / union >= 0.65;
      });
    }
    if (!dup) seen.push(a);
  }
  return seen;
}

async function fetchRssFeeds() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async ({ url, label }) => {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/rss+xml, */*",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return [];
      return parseRssXml(await r.text(), label);
    }),
  );
  return results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

async function fetchNewsDataServer(q, category) {
  if (!NEWSDATA_KEYS.length) return [];
  for (let i = 0; i < NEWSDATA_KEYS.length; i++) {
    const key = NEWSDATA_KEYS[(ndKeyIdx + i) % NEWSDATA_KEYS.length];
    try {
      const r = await fetch(
        `https://newsdata.io/api/1/latest?apikey=${key}&q=${encodeURIComponent(q)}&country=in&language=en&category=${category}`,
        { signal: AbortSignal.timeout(10000) },
      );
      const d = await r.json();
      if (d.status === "error" && d.code === "RateLimitExceeded") continue;
      if (d.status === "success" && Array.isArray(d.results)) {
        ndKeyIdx = (ndKeyIdx + i + 1) % NEWSDATA_KEYS.length;
        return d.results
          .filter((x) => x.link && x.title)
          .map((x) => ({
            id: `nd::${x.article_id ?? x.link}`,
            title: x.title,
            description: (x.description ?? x.content ?? "").slice(0, 500),
            url: x.link,
            image: null,
            publishedAt: x.pubDate ?? new Date().toISOString(),
            source: x.source_name ?? "NewsData",
            via: "NewsData",
            stocks: [],
            sentiment: "pending",
            sentimentReason: "",
            analyzed: false,
          }));
      }
      break;
    } catch {
      continue;
    }
  }
  return [];
}

async function fetchGNewsServer(q) {
  if (!GNEWS_KEYS.length) return [];
  const wait = Math.max(0, 1200 - (Date.now() - gnewsLastCall));
  if (wait > 0) await sleep(wait);
  gnewsLastCall = Date.now();
  const key = GNEWS_KEYS[gnewsKeyIdx % GNEWS_KEYS.length];
  gnewsKeyIdx++;
  try {
    const r = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&country=in&max=10&sortby=publishedAt&apikey=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const d = await r.json();
    if (r.status === 429 || !Array.isArray(d.articles)) return [];
    return d.articles
      .filter((a) => a.url && a.title)
      .map((a) => ({
        id: `gn::${a.url}`,
        title: a.title,
        description: a.description ?? "",
        url: a.url,
        image: null,
        publishedAt: a.publishedAt,
        source: a.source?.name ?? "GNews",
        via: "GNews",
        stocks: [],
        sentiment: "pending",
        sentimentReason: "",
        analyzed: false,
      }));
  } catch {
    return [];
  }
}

// ── GET /api/news/general ─────────────────────────────────────────────────────
app.get("/api/news/general", async (req, res) => {
  try {
    const [rssArticles, ndResults] = await Promise.all([
      fetchRssFeeds(),
      Promise.allSettled(
        GENERAL_ND_QUERIES.map(
          ({ q, category }, i) =>
            new Promise((resolve) =>
              setTimeout(
                () => fetchNewsDataServer(q, category).then(resolve),
                i * 200,
              ),
            ),
        ),
      ).then((rs) =>
        rs.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      ),
    ]);

    const gnArticles = [];
    for (const q of GENERAL_GNEWS_QUERIES)
      gnArticles.push(...(await fetchGNewsServer(q)));

    const all = [...rssArticles, ...ndResults, ...gnArticles].sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
    );

    return res.json({ articles: dedupArticles(all) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/news/portfolio?tickers=TCS,INFY,RELIANCE ────────────────────────
app.get("/api/news/portfolio", async (req, res) => {
  const raw = req.query.tickers || "";
  const tickers = (Array.isArray(raw) ? raw : raw.split(","))
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (!tickers.length)
    return res.status(400).json({ error: "tickers query param required" });

  // Resolve company names server-side
  const nameMap = {};
  const CONCURRENCY = 4;
  for (let i = 0; i < tickers.length; i += CONCURRENCY) {
    await Promise.all(
      tickers.slice(i, i + CONCURRENCY).map(async (ticker) => {
        try {
          for (const sym of [`${ticker}.NS`, `${ticker}.BO`, ticker]) {
            const r = await fetch(
              `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&lang=en-US&region=IN&quotesCount=1&newsCount=0`,
              {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(5000),
              },
            );
            if (!r.ok) continue;
            const d = await r.json();
            const match = (d?.quotes ?? []).find(
              (q) => q.longname || q.shortname,
            );
            if (match) {
              nameMap[ticker] = (match.longname || match.shortname).trim();
              break;
            }
          }
          if (!nameMap[ticker]) nameMap[ticker] = ticker;
        } catch {
          nameMap[ticker] = ticker;
        }
      }),
    );
    if (i + CONCURRENCY < tickers.length) await sleep(300);
  }

  const DELAY = 350;

  const ndPromises = tickers.map(
    (ticker, i) =>
      new Promise((resolve) =>
        setTimeout(async () => {
          const name = nameMap[ticker] ?? ticker;
          const results = [];
          for (const q of [
            `"${name}" NSE India`,
            `${name} stock earnings results`,
          ]) {
            results.push(...(await fetchNewsDataServer(q, "business")));
          }
          resolve(
            results.map((a) => ({
              ...a,
              stocks: a.stocks.includes(ticker)
                ? a.stocks
                : [...a.stocks, ticker],
            })),
          );
        }, i * DELAY),
      ),
  );

  const gnewsPromises = tickers.map(async (ticker, i) => {
    await sleep(i * 1400);
    const name = nameMap[ticker] ?? ticker;
    const shortName = name.split(/\s+/).slice(0, 2).join(" ");
    const arts = await fetchGNewsServer(`${shortName} NSE India share`);
    return arts.map((a) => ({
      ...a,
      stocks: a.stocks.includes(ticker) ? a.stocks : [...a.stocks, ticker],
    }));
  });

  const rssRaw = await fetchRssFeeds();
  const taggedRss = rssRaw
    .map((article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const mentioned = tickers.filter((ticker) => {
        const name = (nameMap[ticker] ?? ticker).toLowerCase();
        return (
          text.includes(ticker.toLowerCase()) ||
          text.includes(name) ||
          (name.split(/\s+/)[0].length > 3 &&
            text.includes(name.split(/\s+/)[0]))
        );
      });
      if (!mentioned.length) return null;
      return {
        ...article,
        stocks: [...new Set([...article.stocks, ...mentioned])],
      };
    })
    .filter(Boolean);

  const [ndResults, gnewsResults] = await Promise.all([
    Promise.allSettled(ndPromises).then((rs) =>
      rs.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
    ),
    Promise.allSettled(gnewsPromises).then((rs) =>
      rs.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
    ),
  ]);

  const all = [...ndResults, ...gnewsResults, ...taggedRss].sort(
    (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt),
  );

  return res.json({ articles: dedupArticles(all), nameMap });
});

// ── Chatbot proxy (keeps n8n URL + secret server-side) ───────────────────────
app.post("/api/chat", async (req, res) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const secret     = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookUrl) return res.status(503).json({ error: "Chatbot not configured" });

  try {
    const headers = { "Content-Type": "application/json" };
    if (secret) headers["x-api-key"] = secret;

    const r = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Chatbot unavailable" });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(
    `🔑 Gemini: ${GEMINI_KEYS.length}  Groq: ${GROQ_KEYS.length}  NewsData: ${NEWSDATA_KEYS.length}  GNews: ${GNEWS_KEYS.length}`,
  );
  console.log(`📊 Optimizer: POST /api/optimize`);
});

process.on("SIGINT", () => process.exit(0));
