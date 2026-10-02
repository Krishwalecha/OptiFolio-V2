const test = require("node:test");
const assert = require("node:assert/strict");
const { validateOptimize, rateLimiter, semaphore, ttlCache } = require("../lib/guard.cjs");
const { makeAuth } = require("../lib/auth.cjs");

test("validateOptimize accepts a normal request and normalises tickers", () => {
  const r = validateOptimize({ tickers: [" tcs", "INFY", "tcs"], investment: "100000", risk: "Aggressive" });
  assert.deepEqual(r.value.tickers, ["TCS", "INFY"]);
  assert.equal(r.value.investment, 100000);
  assert.equal(r.value.risk, "aggressive");
});

test("validateOptimize rejects bad input", () => {
  assert.match(validateOptimize({ tickers: ["TCS"], investment: 1e5 }).error, /at least 2/);
  assert.match(validateOptimize({ tickers: ["TCS", "IN FY"], investment: 1e5 }).error, /Invalid ticker/);
  assert.match(validateOptimize({ tickers: ["TCS", "INFY"], investment: 10 }).error, /between/);
  assert.match(validateOptimize({ tickers: Array.from({ length: 16 }, (_, i) => `S${i}`), investment: 1e5 }).error, /At most 15/);
  assert.match(validateOptimize({ tickers: ["TCS", "INFY"], investment: 1e5, constraints: { minWeight: 0.3, maxWeight: 0.2 } }).error, /cannot exceed/);
  assert.match(validateOptimize({ tickers: ["A", "B", "C"], investment: 1e5, constraints: { maxWeight: 0.2 } }).error, /cannot fully invest/);
});

test("validateOptimize falls back to balanced for unknown risk", () => {
  assert.equal(validateOptimize({ tickers: ["TCS", "INFY"], investment: 1e5, risk: "yolo" }).value.risk, "balanced");
});

function fakeRes() {
  return {
    code: 200,
    body: null,
    headers: {},
    status(c) {
      this.code = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    set(k, v) {
      this.headers[k] = v;
    },
  };
}

test("rateLimiter blocks after max requests per key", () => {
  const rl = rateLimiter({ windowMs: 60_000, max: 2 });
  let passed = 0;
  for (let i = 0; i < 3; i++) {
    const res = fakeRes();
    rl({ userId: "u1" }, res, () => passed++);
    if (i === 2) assert.equal(res.code, 429);
  }
  assert.equal(passed, 2);
  const other = fakeRes();
  rl({ userId: "u2" }, other, () => passed++);
  assert.equal(passed, 3);
});

test("semaphore limits concurrency and rejects when the queue is full", async () => {
  const s = semaphore(1, 1);
  const r1 = await s.acquire();
  const p2 = s.acquire();
  await assert.rejects(s.acquire(), /busy/);
  assert.deepEqual(s.stats(), { active: 1, queued: 1 });
  r1();
  const r2 = await p2;
  assert.deepEqual(s.stats(), { active: 1, queued: 0 });
  r2();
});

test("ttlCache expires entries", async () => {
  const c = ttlCache(20, 10);
  c.set("a", 1);
  assert.equal(c.get("a"), 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(c.get("a"), undefined);
});

function fakeSupabase(valid) {
  return {
    auth: {
      getUser: async (t) => (valid[t] ? { data: { user: { id: valid[t] } }, error: null } : { data: null, error: new Error("bad") }),
    },
  };
}

test("requireAuth rejects missing and invalid tokens", async () => {
  const { requireAuth } = makeAuth(fakeSupabase({ good: "user-1" }));
  const res1 = fakeRes();
  await requireAuth({ headers: {}, params: {}, query: {} }, res1, () => assert.fail("should not pass"));
  assert.equal(res1.code, 401);
  const res2 = fakeRes();
  await requireAuth({ headers: { authorization: "Bearer nope" }, params: {}, query: {} }, res2, () => assert.fail("should not pass"));
  assert.equal(res2.code, 401);
});

test("requireAuth derives the user from the token and blocks impersonation", async () => {
  const { requireAuth } = makeAuth(fakeSupabase({ tok: "user-1" }));
  const req = { headers: { authorization: "Bearer tok" }, params: {}, query: {}, body: {} };
  let ok = false;
  await requireAuth(req, fakeRes(), () => (ok = true));
  assert.equal(ok, true);
  assert.equal(req.userId, "user-1");

  const res = fakeRes();
  await requireAuth({ headers: { authorization: "Bearer tok" }, params: { userId: "user-2" }, query: {}, body: {} }, res, () => assert.fail("impersonation passed"));
  assert.equal(res.code, 403);

  const res2 = fakeRes();
  await requireAuth({ headers: { authorization: "Bearer tok" }, params: {}, query: {}, body: { userId: "user-2" } }, res2, () => assert.fail("impersonation passed"));
  assert.equal(res2.code, 403);
});

test("optionalAuth never blocks", async () => {
  const { optionalAuth } = makeAuth(fakeSupabase({}));
  const req = { headers: { authorization: "Bearer junk" } };
  let passed = false;
  await optionalAuth(req, fakeRes(), () => (passed = true));
  assert.equal(passed, true);
  assert.equal(req.userId, null);
});
