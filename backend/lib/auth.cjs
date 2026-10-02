const TOKEN_TTL_MS = 60_000;
const verified = new Map();

function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

function makeAuth(supabase) {
  async function resolveUser(token) {
    const hit = verified.get(token);
    if (hit && hit.until > Date.now()) return hit.userId;
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    verified.set(token, { userId: data.user.id, until: Date.now() + TOKEN_TTL_MS });
    if (verified.size > 5000) verified.delete(verified.keys().next().value);
    return data.user.id;
  }

  async function requireAuth(req, res, next) {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: "Sign in required." });
    const userId = await resolveUser(token).catch(() => null);
    if (!userId) return res.status(401).json({ error: "Session expired. Please sign in again." });
    const claimed = req.params.userId || req.body?.userId || req.query.userId;
    if (claimed && claimed !== userId) return res.status(403).json({ error: "Not allowed." });
    req.userId = userId;
    next();
  }

  async function optionalAuth(req, _res, next) {
    const token = bearer(req);
    req.userId = token ? await resolveUser(token).catch(() => null) : null;
    next();
  }

  return { requireAuth, optionalAuth };
}

module.exports = { makeAuth };
