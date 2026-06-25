const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { createClient } = require("@supabase/supabase-js");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const BASE_DIR = __dirname;
const USER_REQUESTS_FILE = path.join(BASE_DIR, "userRequests.json");
const RESULTS_FILE = path.join(BASE_DIR, "stock_analysis_result.json");

// ─── SUPABASE CLIENT (service-role key — backend only, never expose to frontend) ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── AI KEYS ──────────────────────────────────────────────────────────────────
const GEMINI_KEYS = [
  process.env.GEMINI_KEY,
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
  process.env.GEMINI_KEY_4,
]
  .filter(Boolean)
  .filter((key, index, arr) => arr.indexOf(key) === index);

const GROQ_KEYS = [
  process.env.GROQ_KEY,
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
]
  .filter(Boolean)
  .filter((key, index, arr) => arr.indexOf(key) === index);

let geminiKeyIndex = 0;
let groqKeyIndex = 0;

// ─── HELPER: sleep ────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── HELPER: parse JSON array from raw text ───────────────────────────────────
function extractJsonArray(rawText) {
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ─── GEMINI CALL ──────────────────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_KEYS.length) {
    console.warn("[Gemini] No API keys configured — skipping");
    return null;
  }

  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
  ];

  for (const model of models) {
    for (let attempt = 0; attempt < GEMINI_KEYS.length; attempt++) {
      const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
      geminiKeyIndex++;

      try {
        console.log(
          `[Gemini] Trying ${model} with key #${((geminiKeyIndex - 1) % GEMINI_KEYS.length) + 1}`,
        );

        const response = await fetch(
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

        if (response.status === 429) {
          console.warn(
            `[Gemini] Key #${((geminiKeyIndex - 1) % GEMINI_KEYS.length) + 1} rate limited on ${model}, rotating...`,
          );
          await sleep(500);
          continue;
        }

        if (!response.ok) {
          const errBody = await response.text();
          console.warn(
            `[Gemini] ${model} HTTP ${response.status}: ${errBody.slice(0, 200)}`,
          );
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        if (!rawText) {
          const reason = data?.candidates?.[0]?.finishReason ?? "unknown";
          console.warn(
            `[Gemini] ${model} empty response. Finish reason: ${reason}`,
          );
          continue;
        }

        const results = extractJsonArray(rawText);
        if (results && results.length > 0) {
          console.log(`✅ [Gemini/${model}] parsed ${results.length} results`);
          return results;
        }

        console.warn(`[Gemini] ${model} unparseable: ${rawText.slice(0, 120)}`);
      } catch (e) {
        console.warn(`[Gemini] ${model} threw: ${e.message}`);
      }
    }
  }

  console.warn("[Gemini] All keys exhausted — falling back to Groq");
  return null;
}

// ─── GROQ CALL ────────────────────────────────────────────────────────────────
async function callGroq(prompt) {
  if (!GROQ_KEYS.length) {
    console.warn("[Groq] No API keys configured — skipping");
    return null;
  }

  const models = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "llama-3.1-8b-instant",
  ];

  for (const model of models) {
    const maxTokens = model.includes("8b") ? 2048 : 4096;

    for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
      const key = GROQ_KEYS[groqKeyIndex % GROQ_KEYS.length];
      groqKeyIndex++;

      try {
        console.log(
          `[Groq] Trying ${model} with key #${((groqKeyIndex - 1) % GROQ_KEYS.length) + 1}`,
        );

        const response = await fetch(
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
                    "You are a senior Indian equity research analyst. Return ONLY a valid JSON array. No markdown, no explanation, no code fences. Every string value must be properly escaped. The array must be complete and valid JSON.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.1,
              max_tokens: maxTokens,
            }),
          },
        );

        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("retry-after") || "0",
            10,
          );
          console.warn(
            `[Groq] Key #${((groqKeyIndex - 1) % GROQ_KEYS.length) + 1} rate limited on ${model}, rotating...`,
          );
          if (retryAfter > 30) break;
          await sleep(retryAfter > 0 ? retryAfter * 1000 : 1000);
          continue;
        }

        if (response.status === 400) {
          const err = await response.text();
          if (err.includes("decommissioned") || err.includes("deprecated"))
            break;
          break;
        }

        if (!response.ok) break;

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content ?? "";
        if (!rawText) break;

        const finishReason = data.choices?.[0]?.finish_reason;
        if (finishReason === "length") {
          const partial = repairTruncatedArray(rawText);
          if (partial && partial.length > 0) {
            console.log(
              `✅ [Groq/${model}] parsed ${partial.length} results (repaired)`,
            );
            return partial;
          }
          break;
        }

        const results = extractJsonArray(rawText);
        if (results && results.length > 0) {
          console.log(`✅ [Groq/${model}] parsed ${results.length} results`);
          return results;
        }

        break;
      } catch (e) {
        console.warn(`[Groq] ${model} threw: ${e.message}`);
      }
    }
  }

  console.warn("[Groq] All keys exhausted");
  return null;
}

// ─── HELPER: repair truncated JSON array ─────────────────────────────────────
function repairTruncatedArray(rawText) {
  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const start = cleaned.indexOf("[");
    if (start === -1) return null;
    const content = cleaned.slice(start + 1);
    const results = [];
    let depth = 0,
      inStr = false,
      escape = false,
      objStart = -1;
    for (let i = 0; i < content.length; i++) {
      const ch = content[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\" && inStr) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (ch === "{") {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === "}") {
        depth--;
        if (depth === 0 && objStart !== -1) {
          try {
            const obj = JSON.parse(content.slice(objStart, i + 1));
            if (obj.id && obj.sentiment) results.push(obj);
          } catch {
            /* skip */
          }
          objStart = -1;
        }
      }
    }
    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

// ─── ANALYZE ROUTE ────────────────────────────────────────────────────────────
app.post("/api/analyze", async (req, res) => {
  const { articles } = req.body;
  if (!articles || !Array.isArray(articles))
    return res.status(400).json({ error: "articles array required" });

  const idMap = {};
  const compressed = articles.map((a, i) => {
    const shortId = `A${i}`;
    idMap[shortId] = a.id;
    const desc = (a.description || "")
      .slice(0, 180)
      .replace(/\s+/g, " ")
      .trim();
    return { shortId, title: a.title, desc };
  });

  const prompt = `Indian equity analyst. Analyze ${compressed.length} NSE/BSE news articles.

STOCKS: Full names only — "Reliance Industries","HDFC Bank","Tata Motors","Infosys","SBI","Bajaj Finance","Nifty 50","Sensex","Nifty Bank","Nifty IT","Rupee/INR","FII Flows". IPO = name the company. No stock = [].

SENTIMENT:
positive = price UP: earnings beat, new order, dividend, buyback, upgrade, IPO listing, PLI benefit, guidance raise, fundraise
negative = price DOWN: earnings miss, crash, FII selling, oil spike, SEBI fine, mgmt exit, downgrade, rupee fall, fraud
neutral = no signal: mock session, AGM date, name change, routine filing, general commentary

RULES (non-negotiable):
- crash/fall = negative
- FII sold/outflows = negative
- Oil price rise = negative (airlines/paints/OMCs)
- Beat estimates = positive
- IPO oversubscribed = positive
- NEVER lazy-neutral when a clear signal exists

ARTICLES:
${compressed.map((a) => `[${a.shortId}] ${a.title}${a.desc ? " | " + a.desc : ""}`).join("\n")}

Return ONLY valid JSON array, nothing else:
[{"id":"A0","stocks":["Company Name"],"sentiment":"positive|negative|neutral","reason":"<15 words on why price moves>"}]`;

  console.log(`\n📊 Analyzing batch of ${articles.length} articles...`);
  let results = await callGemini(prompt);
  if (!results) {
    console.log("[Fallback] Gemini failed, trying Groq...");
    results = await callGroq(prompt);
  }
  if (!results)
    return res.status(500).json({ error: "Both Gemini and Groq failed" });

  const cleaned = results
    .filter((r) => r && r.id)
    .map((r) => ({
      id: idMap[String(r.id)] ?? String(r.id),
      stocks: Array.isArray(r.stocks)
        ? r.stocks.filter((s) => typeof s === "string" && s.trim().length > 0)
        : [],
      sentiment: ["positive", "negative", "neutral"].includes(r.sentiment)
        ? r.sentiment
        : "neutral",
      reason: String(r.reason || "").slice(0, 120),
    }));

  return res.status(200).json({ results: cleaned });
});

// ─── NEWS PROXY ROUTE ─────────────────────────────────────────────────────────
app.get("/api/news/rss", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });
  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!response.ok)
      return res
        .status(response.status)
        .json({ error: `Upstream ${response.status}` });
    const xml = await response.text();
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── ROOT ─────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("Welcome to Stock Optimize API"));

// ─── SIGN UP ──────────────────────────────────────────────────────────────────
// Uses Supabase Auth — password hashing is handled by Supabase automatically.
// We also insert a row in public.user_profiles with the display name.
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "All fields are required." });

  // 1. Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification for local dev
      user_metadata: { name },
    });

  if (authError) {
    // Supabase returns "already registered" style errors here
    if (authError.message?.toLowerCase().includes("already")) {
      return res.status(400).json({ error: "Email already exists." });
    }
    return res.status(500).json({ error: authError.message });
  }

  const userId = authData.user.id;

  // 2. Insert into public.user_profiles (created in SQL setup below)
  const { error: profileError } = await supabase
    .from("user_profiles")
    .insert({ id: userId, name, email });

  if (profileError) {
    // Non-fatal — auth user already created, just log it
    console.error("❌ user_profiles insert failed:", profileError.message);
  }

  return res.status(201).json({ message: "User registered successfully" });
});

// ─── SIGN IN ──────────────────────────────────────────────────────────────────
// Signs the user in via Supabase Auth and returns userId + name from profile.
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

  const userId = data.user.id;

  // Fetch display name from user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name")
    .eq("id", userId)
    .single();

  const name = profile?.name ?? data.user.user_metadata?.name ?? "";

  return res.status(200).json({
    message: "Login successful",
    userId,
    email: data.user.email,
    name,
  });
});

// ─── GET USER RISK PROFILE ────────────────────────────────────────────────────
app.get("/api/userRiskProfile/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "User ID is required." });

  const { data, error } = await supabase
    .from("user_risk_profiles")
    .select("*")
    .eq("user_id", userId)
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

// ─── SAVE USER RISK PROFILE ───────────────────────────────────────────────────
app.post("/api/saveRiskProfile", async (req, res) => {
  const { userId, breakdown, profile, profileData } = req.body;
  if (!userId || !breakdown || !profile)
    return res.status(400).json({ error: "Missing required fields" });

  const upsertPayload = {
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
  };

  const { error } = await supabase
    .from("user_risk_profiles")
    .upsert(upsertPayload, { onConflict: "user_id" });

  if (error)
    return res
      .status(500)
      .json({ error: "Failed to save risk profile: " + error.message });

  return res.status(200).json({ message: "Risk profile saved successfully" });
});

// ─── STOCK PYTHON EXECUTE ─────────────────────────────────────────────────────
app.post("/api/updateStock", (req, res) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: "Ticker required" });

  const normalizedTicker = ticker.trim().toUpperCase();
  console.log("Updating stock:", normalizedTicker);

  const py = spawn("python", [
    path.join(__dirname, "stockinfo.py"),
    normalizedTicker,
  ]);
  py.stdout.on("data", (data) => console.log("PYTHON:", data.toString()));
  py.stderr.on("data", (data) =>
    console.error("PYTHON ERROR:", data.toString()),
  );
  py.on("close", () => {
    try {
      const filePath = path.join(
        __dirname,
        "stock_data",
        `${normalizedTicker}_data.json`,
      );
      if (!fs.existsSync(filePath))
        return res.json({ ticker: normalizedTicker, data: [] });
      res.json(JSON.parse(fs.readFileSync(filePath, "utf8")));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to read stock data" });
    }
  });
});

// ─── STORE USER REQUESTS ──────────────────────────────────────────────────────
app.post("/api/storeUserRequest", async (req, res) => {
  const { stocks, totalAmount, riskProfile, userId } = req.body;
  if (!stocks || !totalAmount)
    return res
      .status(400)
      .json({ error: "Stocks and totalAmount are required." });
  if (!userId)
    return res
      .status(400)
      .json({ error: "User ID is required. Please sign in." });

  const validProfiles = [
    "conservative",
    "moderate",
    "balanced",
    "growth",
    "aggressive",
    "very_aggressive",
  ];
  const finalRiskProfile = validProfiles.includes(riskProfile)
    ? riskProfile
    : "balanced";
  const portfolioSessionId = `${userId}_${Date.now()}`;

  // ── Persist to userRequests.json (unchanged) ──
  let requests = [];
  try {
    if (fs.existsSync(USER_REQUESTS_FILE)) {
      const raw = fs.readFileSync(USER_REQUESTS_FILE, "utf8");
      requests = JSON.parse(raw);
    }
  } catch {
    requests = [];
  }

  requests.push({
    userId,
    stocks,
    totalAmount,
    riskProfile: finalRiskProfile,
    timestamp: new Date().toISOString(),
    sessionId: portfolioSessionId,
  });
  fs.writeFileSync(USER_REQUESTS_FILE, JSON.stringify(requests, null, 2));

  // ── Upsert tickers into user_portfolios ──
  const tickers = stocks.map((s) => s.ticker.trim().toUpperCase());

  const rows = tickers.map((ticker) => ({
    user_id: userId,
    ticker,
    portfolio_session_id: portfolioSessionId,
    allocation: 0,
    created_at: new Date().toISOString(),
  }));

  // onConflict targets the unique constraint (user_id, ticker)
  const { error } = await supabase
    .from("user_portfolios")
    .upsert(rows, { onConflict: "user_id,ticker" });

  if (error)
    return res
      .status(500)
      .json({ error: "Failed to store portfolios: " + error.message });

  return res.status(200).json({
    message: "Request stored successfully",
    riskProfile: finalRiskProfile,
    sessionId: portfolioSessionId,
  });
});

if (!fs.existsSync(path.join(BASE_DIR, "stock_data"))) {
  fs.mkdirSync(path.join(BASE_DIR, "stock_data"), { recursive: true });
}

// ─── SAVE ALLOCATIONS ────────────────────────────────────────────────────────
app.post("/api/saveAllocations", async (req, res) => {
  const { userId, allocations } = req.body;
  if (!userId || !Array.isArray(allocations) || allocations.length === 0)
    return res
      .status(400)
      .json({ error: "userId and allocations array required" });

  // Build update promises — one per ticker
  const updates = allocations.map(({ ticker, percentage }) =>
    supabase
      .from("user_portfolios")
      .update({ allocation: parseFloat(percentage) || 0 })
      .eq("user_id", userId)
      .eq("ticker", ticker.trim().toUpperCase()),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed)
    return res
      .status(500)
      .json({ error: "Failed to save allocations: " + failed.error.message });

  return res.status(200).json({ message: "Allocations saved" });
});

// ─── RUN PYTHON OPTIMIZER ─────────────────────────────────────────────────────
app.post("/api/runOptimizer", (req, res) => {
  const scriptPath = path.join(BASE_DIR, "stockOptimizer.py");
  if (!fs.existsSync(scriptPath))
    return res.status(404).json({ error: "Optimizer script not found" });

  exec(`python "${scriptPath}"`, { cwd: BASE_DIR }, (err, stdout, stderr) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Failed to run optimizer: " + stderr });
    res
      .status(200)
      .json({ message: "Optimizer ran successfully", output: stdout });
  });
});

// ─── OPTIMIZATION RESULTS ─────────────────────────────────────────────────────
app.get("/api/optimizationResults", (req, res) => {
  if (!fs.existsSync(RESULTS_FILE))
    return res.status(404).json({ error: "No optimization results found." });

  fs.readFile(RESULTS_FILE, "utf8", (err, data) => {
    if (err)
      return res
        .status(500)
        .json({ error: "Failed to read results: " + err.message });
    try {
      res.status(200).json(JSON.parse(data));
    } catch {
      res.status(500).json({ error: "Failed to parse results" });
    }
  });
});

// ─── GET USER PORTFOLIOS ──────────────────────────────────────────────────────
app.get("/api/userPortfolios/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "User ID is required." });

  const { data, error } = await supabase
    .from("user_portfolios")
    .select("ticker, allocation, created_at, portfolio_session_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error)
    return res
      .status(500)
      .json({ error: "Failed to fetch portfolios: " + error.message });

  // Group by date
  const groupedPortfolios = (data || []).reduce((acc, row) => {
    const dateKey = row.created_at.slice(0, 10); // "YYYY-MM-DD"
    if (!acc[dateKey]) acc[dateKey] = { date: dateKey, tickers: [] };
    acc[dateKey].tickers.push({
      ticker: row.ticker,
      allocation: parseFloat(row.allocation) || 0,
    });
    return acc;
  }, {});

  return res.status(200).json({
    portfolioGroups: Object.values(groupedPortfolios).sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    ),
    totalPortfolios: (data || []).length,
  });
});

// ─── DELETE PORTFOLIO ─────────────────────────────────────────────────────────
app.post("/api/deletePortfolio", async (req, res) => {
  const { ticker, userId } = req.body;
  if (!ticker || !userId)
    return res.status(400).json({ error: "Ticker and User ID are required." });

  const { data, error } = await supabase
    .from("user_portfolios")
    .delete()
    .eq("user_id", userId)
    .eq("ticker", ticker)
    .select(); // returns deleted rows so we can check count

  if (error)
    return res
      .status(500)
      .json({ error: "Failed to delete portfolio: " + error.message });
  if (!data || data.length === 0)
    return res
      .status(404)
      .json({ error: "Portfolio not found for this user." });

  // Clean up local JSON file if it exists
  const filePath = path.join(
    BASE_DIR,
    "src",
    "components",
    `${ticker}_data.json`,
  );
  if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});

  return res.json({ message: "Portfolio deleted successfully" });
});

// ─── GET RISK PROFILES (static, no DB needed) ────────────────────────────────
app.get("/api/riskProfiles", (req, res) => {
  res.status(200).json({
    profiles: [
      {
        value: "conservative",
        label: "Conservative",
        description: "Low risk, stable returns",
        returnRange: [0.05, 0.08],
        riskRange: [0.05, 0.09],
      },
      {
        value: "moderate",
        label: "Moderate",
        description: "Stability-first, modest upside",
        returnRange: [0.08, 0.11],
        riskRange: [0.09, 0.13],
      },
      {
        value: "balanced",
        label: "Balanced",
        description: "Equal focus on risk and return",
        returnRange: [0.11, 0.14],
        riskRange: [0.13, 0.17],
      },
      {
        value: "growth",
        label: "Growth",
        description: "Moderate risk for higher returns",
        returnRange: [0.14, 0.18],
        riskRange: [0.17, 0.22],
      },
      {
        value: "aggressive",
        label: "Aggressive",
        description: "High risk, high return potential",
        returnRange: [0.18, 0.22],
        riskRange: [0.22, 0.27],
      },
      {
        value: "very_aggressive",
        label: "Very Aggressive",
        description: "Maximum return focus, highest risk",
        returnRange: [0.22, 0.25],
        riskRange: [0.27, 0.3],
      },
    ],
  });
});

app.post("/api/resolveTickerNames", async (req, res) => {
  const { tickers } = req.body;
  if (!Array.isArray(tickers) || tickers.length === 0)
    return res.status(400).json({ error: "tickers array required" });

  const names = {};

  // Process in parallel with a concurrency limit of 4 to avoid hammering Yahoo
  const CONCURRENCY = 4;
  const chunks = [];
  for (let i = 0; i < tickers.length; i += CONCURRENCY)
    chunks.push(tickers.slice(i, i + CONCURRENCY));

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async (ticker) => {
        const upper = ticker.trim().toUpperCase();
        try {
          // Yahoo Finance quote search — append .NS for NSE, try .BO (BSE) as fallback
          const trySymbols = [`${upper}.NS`, `${upper}.BO`, upper];
          let resolved = null;

          for (const sym of trySymbols) {
            const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(sym)}&lang=en-US&region=IN&quotesCount=1&newsCount=0`;
            const response = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; StockOptimize/1.0)",
                Accept: "application/json",
              },
              signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) continue;
            const data = await response.json();
            const quotes = data?.quotes ?? [];

            // Find the best match — prefer exact symbol match
            const match =
              quotes.find(
                (q) =>
                  q.symbol === sym &&
                  q.longname &&
                  q.longname.trim().length > 0,
              ) ||
              quotes.find((q) => q.longname && q.longname.trim().length > 0);

            if (match?.longname) {
              // Clean up common Yahoo suffixes like "Limited" abbreviations
              resolved = match.longname.replace(/\s+/g, " ").trim();
              break;
            }

            // shortname fallback
            const shortMatch =
              quotes.find((q) => q.symbol === sym && q.shortname) ||
              quotes.find((q) => q.shortname);
            if (shortMatch?.shortname) {
              resolved = shortMatch.shortname.trim();
              break;
            }
          }

          names[upper] = resolved ?? upper; // fallback to raw ticker
        } catch {
          names[upper] = upper; // on any error, fall back to ticker
        }
      }),
    );

    // Small delay between chunks to be polite to Yahoo
    if (chunks.indexOf(chunk) < chunks.length - 1)
      await new Promise((r) => setTimeout(r, 300));
  }

  return res.status(200).json({ names });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`🔑 Gemini keys loaded: ${GEMINI_KEYS.length}`);
  console.log(`🔑 Groq keys loaded: ${GROQ_KEYS.length}`);
  console.log(
    `🤖 AI: Gemini (${GEMINI_KEYS.length} keys) → Groq (${GROQ_KEYS.length} keys fallback)`,
  );
});

process.on("SIGINT", () => process.exit(0));
