/**
 * server.cjs
 * ──────────
 * Streamlined backend.
 *
 * Stock optimizer: ONE endpoint  →  POST /api/optimize
 * Auth, news, risk-profile routes kept as-is.
 */

const express    = require("express");
const cors       = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const { spawn }  = require("child_process");
const path       = require("path");
require("dotenv").config();

const app  = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const GEMINI_KEYS = [...new Set([
  process.env.GEMINI_KEY,
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_KEY_4,
].filter(Boolean))];

const GROQ_KEYS = [...new Set([
  process.env.GROQ_KEY,
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
].filter(Boolean))];

let geminiKeyIdx = 0;
let groqKeyIdx = 0;
const nextGeminiKey = () => GEMINI_KEYS[geminiKeyIdx++ % GEMINI_KEYS.length];
const nextGroqKey   = () => GROQ_KEYS[groqKeyIdx++   % GROQ_KEYS.length];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── JSON array parser helper ──────────────────────────────────────────────────
function extractJsonArray(raw) {
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const s = cleaned.indexOf("["), e = cleaned.lastIndexOf("]");
  if (s === -1 || e === -1) return null;
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; }
}

// ── Gemini call ───────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_KEYS.length) return null;
  const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash"];
  for (const model of models) {
    for (let i = 0; i < GEMINI_KEYS.length; i++) {
      const key = nextGeminiKey();
      try {
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
          }
        );
        if (res.status === 429) { await sleep(500); continue; }
        if (!res.ok) continue;
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const arr  = extractJsonArray(text);
        if (arr?.length) return arr;
      } catch { /* rotate */ }
    }
  }
  return null;
}

// ── Groq call ─────────────────────────────────────────────────────────────────
async function callGroq(prompt) {
  if (!GROQ_KEYS.length) return null;
  const models = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama-3.1-8b-instant"];
  for (const model of models) {
    const maxTok = model.includes("8b") ? 2048 : 4096;
    for (let i = 0; i < GROQ_KEYS.length; i++) {
      const key = nextGroqKey();
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "Senior Indian equity analyst. Return ONLY valid JSON array, no markdown." },
              { role: "user", content: prompt },
            ],
            temperature: 0.1,
            max_tokens: maxTok,
          }),
        });
        if (res.status === 429) { await sleep(1000); continue; }
        if (!res.ok) break;
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? "";
        const arr  = extractJsonArray(text);
        if (arr?.length) return arr;
        break;
      } catch { /* rotate */ }
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
  const { tickers, investment, risk = "balanced", userId, deepMode = false } = req.body;

  if (!Array.isArray(tickers) || tickers.length < 2)
    return res.status(400).json({ error: "Provide at least 2 tickers." });
  if (!investment || investment <= 0)
    return res.status(400).json({ error: "Provide a valid investment amount." });
  if (!userId)
    return res.status(400).json({ error: "Sign in to optimize." });

  const validRisk = ["conservative", "balanced", "aggressive"];
  const finalRisk = validRisk.includes(risk?.toLowerCase()) ? risk.toLowerCase() : "balanced";

  const scriptPath = path.join(__dirname, "api", "optimize.py");
  const payload    = JSON.stringify({ tickers, investment, risk: finalRisk, tune: !!deepMode });

  console.log(`\n🚀 [optimize] tickers=${tickers.join(",")} risk=${finalRisk} ₹${investment} deepMode=${!!deepMode}`);

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

  py.stdout.on("data", (d) => { stdout += d.toString(); });
  py.stderr.on("data", (d) => { stderr += d.toString(); });

  py.on("close", (code) => {
    if (code !== 0) {
      console.error("[optimize] Python error:\n", stderr.slice(-2000));
      return res.status(500).json({ error: "Optimizer failed. Check server logs." });
    }
    try {
      const result = JSON.parse(stdout);
      if (result.error) return res.status(400).json(result);

      return res.status(200).json(result);
    } catch (e) {
      console.error("[optimize] JSON parse failed:", e.message, "\nstdout:", stdout.slice(-500));
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

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (authError) {
    if (authError.message?.toLowerCase().includes("already"))
      return res.status(400).json({ error: "Email already exists." });
    return res.status(500).json({ error: authError.message });
  }

  await supabase.from("user_profiles").insert({ id: authData.user.id, name, email });
  return res.status(201).json({ message: "User registered successfully" });
});

// ── Sign in ───────────────────────────────────────────────────────────────────
app.post("/api/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "All fields are required." });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: "Invalid email or password" });

  const { data: profile } = await supabase
    .from("user_profiles").select("name").eq("id", data.user.id).single();

  return res.status(200).json({
    message: "Login successful",
    userId:  data.user.id,
    email:   data.user.email,
    name:    profile?.name ?? data.user.user_metadata?.name ?? "",
  });
});

// ── Risk profile (save / load) ────────────────────────────────────────────────
app.get("/api/userRiskProfile/:userId", async (req, res) => {
  const { data, error } = await supabase
    .from("user_risk_profiles").select("*").eq("user_id", req.params.userId).single();
  if (error || !data) return res.status(404).json({ error: "No risk profile found" });
  return res.status(200).json({
    breakdown: {
      ageScore: data.age_score, savingsScore: data.savings_score,
      familyScore: data.family_score, horizonScore: data.horizon_score,
      investmentScore: data.investment_score, ratioScore: data.ratio_score,
      totalScore: data.total_score, reasons: data.reasons,
    },
    profile:     data.recommended_profile,
    profileData: data.profile_data,
    createdAt:   data.created_at,
    updatedAt:   data.updated_at,
  });
});

app.post("/api/saveRiskProfile", async (req, res) => {
  const { userId, breakdown, profile, profileData } = req.body;
  if (!userId || !breakdown || !profile)
    return res.status(400).json({ error: "Missing required fields" });

  const { error } = await supabase.from("user_risk_profiles").upsert({
    user_id: userId,
    age_score: breakdown.ageScore, savings_score: breakdown.savingsScore,
    family_score: breakdown.familyScore, horizon_score: breakdown.horizonScore,
    investment_score: breakdown.investmentScore, ratio_score: breakdown.ratioScore,
    total_score: breakdown.totalScore,
    recommended_profile: profile,
    reasons: typeof breakdown.reasons === "string" ? JSON.parse(breakdown.reasons) : breakdown.reasons || {},
    profile_data: typeof profileData === "string" ? JSON.parse(profileData) : profileData || {},
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return res.status(500).json({ error: "Failed to save: " + error.message });
  return res.status(200).json({ message: "Risk profile saved" });
});

// ── User portfolios ───────────────────────────────────────────────────────────
app.get("/api/userPortfolios/:userId", async (req, res) => {
  const { data, error } = await supabase
    .from("user_portfolios")
    .select("ticker, allocation, invested_inr, created_at, portfolio_session_id")
    .eq("user_id", req.params.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const grouped = (data || []).reduce((acc, row) => {
    const key = row.portfolio_session_id || row.created_at;
    if (!acc[key]) acc[key] = { sessionId: key, date: row.created_at, tickers: [] };
    acc[key].tickers.push({ ticker: row.ticker, allocation: parseFloat(row.allocation) || 0, invested_inr: parseFloat(row.invested_inr) || 0 });
    return acc;
  }, {});

  return res.status(200).json({
    portfolioGroups: Object.values(grouped).sort((a, b) => new Date(b.date) - new Date(a.date)),
    totalPortfolios: (data || []).length,
  });
});

app.post("/api/savePortfolio", async (req, res) => {
  const { userId, sessionId, allocation } = req.body;
  if (!userId || !sessionId || !Array.isArray(allocation) || !allocation.length)
    return res.status(400).json({ error: "userId, sessionId and allocation required." });

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
  if (!userId || !sessionId) return res.status(400).json({ error: "userId and sessionId required." });
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
  if (!ticker || !userId) return res.status(400).json({ error: "Ticker and userId required." });

  let query = supabase.from("user_portfolios").delete().eq("user_id", userId).eq("ticker", ticker);
  if (sessionId) query = query.eq("portfolio_session_id", sessionId);
  const { data, error } = await query.select();

  if (error)  return res.status(500).json({ error: error.message });
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
    return { id, title: a.title, desc: (a.description || "").slice(0, 180).trim() };
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
  if (!results) return res.status(500).json({ error: "AI analysis unavailable" });

  return res.status(200).json({
    results: results.filter((r) => r?.id).map((r) => ({
      id:        idMap[String(r.id)] ?? String(r.id),
      stocks:    Array.isArray(r.stocks) ? r.stocks.filter((s) => typeof s === "string") : [],
      sentiment: ["positive", "negative", "neutral"].includes(r.sentiment) ? r.sentiment : "neutral",
      reason:    String(r.reason || "").slice(0, 120),
    })),
  });
});

// ── News RSS proxy ────────────────────────────────────────────────────────────
app.get("/api/news/rss", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)", Accept: "application/rss+xml, */*" },
    });
    if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
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

  let stdout = "", stderr = "";
  py.stdin.write(ticker);
  py.stdin.end();
  py.stdout.on("data", (d) => { stdout += d.toString(); });
  py.stderr.on("data", (d) => { stderr += d.toString(); });
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
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) }
    );
    if (!r.ok) return res.json({ results: [] });
    const d = await r.json();

    const results = (d?.quotes ?? [])
      .filter((q) =>
        q.quoteType === "EQUITY" &&
        (q.exchange === "NSI" || q.exchange === "BSE" ||
         (q.symbol || "").endsWith(".NS") || (q.symbol || "").endsWith(".BO"))
      )
      .slice(0, 8)
      .map((q) => ({
        ticker:   (q.symbol || "").replace(/\.(NS|BO)$/i, ""),
        symbol:   q.symbol,
        name:     (q.longname || q.shortname || q.symbol || "").trim(),
        exchange: q.exchange === "NSI" || (q.symbol || "").endsWith(".NS") ? "NSE" : "BSE",
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
  for (let i = 0; i < tickers.length; i += CONCURRENCY) chunks.push(tickers.slice(i, i + CONCURRENCY));

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (ticker) => {
      const upper = ticker.trim().toUpperCase();
      try {
        for (const sym of [`${upper}.NS`, `${upper}.BO`, upper]) {
          const r = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&lang=en-US&region=IN&quotesCount=1&newsCount=0`,
            { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) }
          );
          if (!r.ok) continue;
          const d = await r.json();
          const match = (d?.quotes ?? []).find((q) => q.longname || q.shortname);
          if (match) { names[upper] = (match.longname || match.shortname).trim(); break; }
        }
        if (!names[upper]) names[upper] = upper;
      } catch { names[upper] = upper; }
    }));
    if (chunks.indexOf(chunk) < chunks.length - 1) await sleep(300);
  }

  return res.status(200).json({ names });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`🔑 Gemini keys: ${GEMINI_KEYS.length}  |  Groq keys: ${GROQ_KEYS.length}`);
  console.log(`📊 Optimizer: POST /api/optimize`);
});

process.on("SIGINT", () => process.exit(0));
