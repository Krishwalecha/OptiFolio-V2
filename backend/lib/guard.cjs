const TICKER_RE = /^[A-Z0-9&-]{1,20}(\.(NS|BO))?$/;
const RISKS = new Set(["conservative", "balanced", "aggressive"]);

function validateOptimize(body) {
  const { tickers, investment, risk = "balanced", deepMode = false, constraints = {} } = body || {};
  if (!Array.isArray(tickers)) return { error: "tickers must be a list." };
  const clean = [...new Set(tickers.map((t) => String(t).trim().toUpperCase()).filter(Boolean))];
  if (clean.length < 2) return { error: "Provide at least 2 tickers." };
  if (clean.length > 15) return { error: "At most 15 tickers per optimization." };
  const bad = clean.find((t) => !TICKER_RE.test(t));
  if (bad) return { error: `Invalid ticker: ${bad}` };

  const amt = Number(investment);
  if (!Number.isFinite(amt) || amt < 1000 || amt > 1e10)
    return { error: "Investment must be between ₹1,000 and ₹1,000 crore." };

  const r = String(risk).toLowerCase();
  const out = { tickers: clean, investment: amt, risk: RISKS.has(r) ? r : "balanced", deepMode: !!deepMode, constraints: {} };

  if (constraints && typeof constraints === "object") {
    const mn = constraints.minWeight;
    const mx = constraints.maxWeight;
    if (mn != null) {
      const v = Number(mn);
      if (!Number.isFinite(v) || v < 0 || v > 0.5) return { error: "Minimum weight must be between 0% and 50%." };
      out.constraints.minWeight = v;
    }
    if (mx != null) {
      const v = Number(mx);
      if (!Number.isFinite(v) || v < 0.05 || v > 1) return { error: "Maximum weight must be between 5% and 100%." };
      out.constraints.maxWeight = v;
    }
    if (constraints.core != null) {
      const v = Number(constraints.core);
      if (!Number.isFinite(v) || v < 0 || v > 0.8) return { error: "Nifty core must be between 0% and 80%." };
      if (v > 0) out.constraints.core = v;
    }
    const { minWeight: a, maxWeight: b } = out.constraints;
    if (a != null && b != null && a > b) return { error: "Minimum weight cannot exceed maximum weight." };
    if (b != null && b * clean.length < 1)
      return { error: `A ${Math.round(b * 100)}% cap cannot fully invest across ${clean.length} stocks.` };
  }
  return { value: out };
}

function rateLimiter({ windowMs, max, key = (req) => req.userId || req.ip }) {
  const hits = new Map();
  return (req, res, next) => {
    const k = key(req);
    const now = Date.now();
    const arr = (hits.get(k) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      const retry = Math.ceil((windowMs - (now - arr[0])) / 1000);
      res.set("Retry-After", String(retry));
      return res.status(429).json({ error: `Too many requests. Try again in ${retry}s.` });
    }
    arr.push(now);
    hits.set(k, arr);
    if (hits.size > 10000) hits.delete(hits.keys().next().value);
    next();
  };
}

function semaphore(limit, maxQueue) {
  let active = 0;
  const queue = [];
  const release = () => {
    active--;
    const next = queue.shift();
    if (next) {
      active++;
      next();
    }
  };
  return {
    acquire() {
      if (active < limit) {
        active++;
        return Promise.resolve(release);
      }
      if (queue.length >= maxQueue) return Promise.reject(new Error("busy"));
      return new Promise((resolve) => queue.push(() => resolve(release)));
    },
    stats: () => ({ active, queued: queue.length }),
  };
}

function ttlCache(ttlMs, maxEntries) {
  const m = new Map();
  return {
    get(k) {
      const e = m.get(k);
      if (!e) return undefined;
      if (e.until < Date.now()) {
        m.delete(k);
        return undefined;
      }
      return e.v;
    },
    set(k, v) {
      m.set(k, { v, until: Date.now() + ttlMs });
      if (m.size > maxEntries) m.delete(m.keys().next().value);
    },
  };
}

module.exports = { validateOptimize, rateLimiter, semaphore, ttlCache, TICKER_RE };
