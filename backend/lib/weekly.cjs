const crypto = require("crypto");

// Colours mirror the app's dark theme tokens in frontend/src/index.css.
const C = {
  bg: "#0a0a0a",
  card: "#161616",
  inner: "#1c1c1c",
  line: "rgba(255,255,255,0.08)",
  text: "#f5f5f5",
  muted: "#9e9e9e",
  brand: "#5a78ff",
  green: "#3dd68c",
  red: "#ff6369",
  amber: "#ffb224",
};
const FONT = "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const inr = (v) => "₹" + Math.round(Number(v) || 0).toLocaleString("en-IN");
const pct = (v, d = 2) => (v == null ? "n/a" : `${v >= 0 ? "+" : ""}${Number(v).toFixed(d)}%`);
const tone = (v) => (v == null ? C.muted : v >= 0 ? C.green : C.red);
const day = (s) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function unsubToken(userId, secret) {
  return crypto.createHmac("sha256", secret).update(`unsub:${userId}`).digest("hex").slice(0, 32);
}

function istNow(d = new Date()) {
  return new Date(d.getTime() + 330 * 60000);
}

// Friday 18:00 IST of the current week, as a UTC Date.
function thisFridayEvening(now = new Date()) {
  const ist = istNow(now);
  const back = (ist.getUTCDay() - 5 + 7) % 7;
  const fri = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - back, 18, 0));
  return new Date(fri.getTime() - 330 * 60000);
}

function createWeekly({ supabase, runPython, newsFor, appUrl, apiUrl, secret, resendKey, from }) {
  const configured = () => !!resendKey();

  async function emailOf(userId) {
    const { data } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }));
    return data?.user?.email || null;
  }

  async function nameOf(userId) {
    const { data } = await supabase.from("user_profiles").select("name").eq("id", userId).maybeSingle();
    if (data?.name?.trim()) return data.name.trim();
    const { data: u } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }));
    return u?.user?.user_metadata?.name || "";
  }

  async function gather(userId) {
    const { data, error } = await supabase
      .from("user_portfolios")
      .select("ticker, allocation, invested_inr, created_at, portfolio_session_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const groups = new Map();
    for (const r of data || []) {
      const k = r.portfolio_session_id || r.created_at;
      if (!groups.has(k)) groups.set(k, { sessionId: k, date: r.created_at, rows: [] });
      groups.get(k).rows.push(r);
    }
    const sessions = [...groups.values()].slice(0, 3);
    const reports = [];
    for (const g of sessions) {
      const out = await runPython(
        "rebalance.py",
        { savedAt: g.date, holdings: g.rows.map((r) => ({ ticker: r.ticker, allocation: parseFloat(r.allocation) || 0, invested_inr: parseFloat(r.invested_inr) || 0 })) },
        90 * 1000,
      );
      if (out.status === 200) reports.push({ ...g, report: out.body });
    }
    const tickers = [...new Set(reports.flatMap((r) => (r.report.holdings || []).map((h) => h.ticker)))];
    return { reports, headlines: newsFor(tickers).slice(0, 4), totalPortfolios: groups.size };
  }

  const metric = (label, value, color = C.text) => `
    <td valign="top" style="padding:0 16px 0 0;">
      <div style="font:400 12px/1.3 ${FONT};color:${C.muted};">${label}</div>
      <div style="font:500 18px/1.2 ${MONO};color:${color};letter-spacing:-0.02em;margin-top:6px;">${value}</div>
    </td>`;

  function portfolioCard(p) {
    const r = p.report;
    const w = r.week || {};
    const hs = Object.entries(w.holdings || {}).sort((a, b) => b[1] - a[1]);
    const best = hs[0];
    const worst = hs[hs.length - 1];
    const fresh = (r.curve || []).length <= 1;
    const trades = (r.holdings || []).filter((h) => h.trade_shares && Math.abs(h.drift_pp || 0) >= (r.threshold_pp || 5));
    const rows = (r.holdings || [])
      .slice()
      .sort((a, b) => b.target_pct - a.target_pct)
      .map(
        (h) => `
        <tr>
          <td style="padding:9px 0;border-top:1px solid ${C.line};font:500 13px/1.3 ${FONT};color:${C.text};">${esc(h.ticker)}</td>
          <td align="right" style="padding:9px 0;border-top:1px solid ${C.line};font:400 13px/1.3 ${MONO};color:${C.muted};">${Number(h.target_pct).toFixed(1)}%</td>
          <td align="right" style="padding:9px 0;border-top:1px solid ${C.line};font:400 13px/1.3 ${MONO};color:${tone(w.holdings?.[h.ticker])};">${pct(w.holdings?.[h.ticker], 1)}</td>
          <td align="right" style="padding:9px 0;border-top:1px solid ${C.line};font:400 13px/1.3 ${MONO};color:${tone(h.pnl_pct)};">${pct(h.pnl_pct, 1)}</td>
        </tr>`,
      )
      .join("");
    return `
    <tr><td style="padding:0 0 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:20px;">
        <tr><td style="padding:24px 24px 8px;">
          <div style="font:400 12px/1.3 ${FONT};color:${C.muted};">Saved ${day(p.date)} · ${(r.holdings || []).length} stocks</div>
          <div style="font:500 28px/1.1 ${MONO};color:${C.text};letter-spacing:-0.04em;margin-top:8px;">${inr(r.total_value)}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;"><tr>
            ${metric("This week", pct(w.portfolio_pct), tone(w.portfolio_pct))}
            ${metric("Nifty 50, this week", pct(w.nifty_pct), C.muted)}
            ${fresh ? "" : metric("Since saved", pct(r.total_pnl_pct), tone(r.total_pnl_pct))}
            ${fresh || r.nifty_return_pct == null ? "" : metric("Nifty, same period", pct(r.nifty_return_pct), C.muted)}
          </tr></table>
          ${
            best && worst && hs.length > 1
              ? `<div style="margin-top:18px;font:400 13px/1.6 ${FONT};color:${C.muted};">Best this week <span style="color:${C.text};font-weight:500;">${esc(best[0])}</span> <span style="color:${tone(best[1])};font-family:${MONO};">${pct(best[1], 1)}</span> · Worst <span style="color:${C.text};font-weight:500;">${esc(worst[0])}</span> <span style="color:${tone(worst[1])};font-family:${MONO};">${pct(worst[1], 1)}</span></div>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:8px 24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;font:400 11px/1.3 ${FONT};color:${C.muted};">Stock</td>
              <td align="right" style="padding:6px 0;font:400 11px/1.3 ${FONT};color:${C.muted};">Target</td>
              <td align="right" style="padding:6px 0;font:400 11px/1.3 ${FONT};color:${C.muted};">Week</td>
              <td align="right" style="padding:6px 0;font:400 11px/1.3 ${FONT};color:${C.muted};">Since saved</td>
            </tr>${rows}
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 22px;">
          <div style="background:${r.needs_rebalance ? "rgba(255,178,36,0.09)" : C.inner};border:1px solid ${r.needs_rebalance ? "rgba(255,178,36,0.26)" : C.line};border-radius:12px;padding:12px 14px;font:400 13px/1.55 ${FONT};color:${C.text};">
            ${
              r.needs_rebalance
                ? `<span style="color:${C.amber};font-weight:500;">Rebalance suggested.</span> ${trades
                    .slice(0, 4)
                    .map((h) => `${h.trade_shares > 0 ? "Buy" : "Sell"} ${Math.abs(h.trade_shares)} ${esc(h.ticker)}`)
                    .join(", ")} to get back to target.`
                : `<span style="color:${C.green};font-weight:500;">On track.</span> Every holding is within ${r.threshold_pp || 5} points of its target.`
            }
          </div>
        </td></tr>
      </table>
    </td></tr>`;
  }

  function render({ name, reports, headlines, totalPortfolios }, userId) {
    const now = istNow();
    const w = reports[0]?.report?.week;
    const range = w ? `${day(w.from)} – ${day(w.to)}` : day(now);
    const total = reports.reduce((s, p) => s + (p.report.total_value || 0), 0);
    const change = reports.reduce((s, p) => s + (p.report.week?.value_change_inr || 0), 0);
    const base = total - change;
    const weekPct = base ? (change / base) * 100 : 0;
    const nifty = w?.nifty_pct;
    const unsub = `${apiUrl()}/api/emails/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId, secret())}`;
    const first = (name || "").split(" ")[0];

    const summary = reports.length
      ? `Across your ${reports.length === 1 ? "portfolio" : `latest ${reports.length} portfolios`} you ${change >= 0 ? "gained" : "lost"} ${inr(Math.abs(change))} this week (${pct(weekPct)}), against ${pct(nifty)} for the Nifty 50.`
      : "You have no saved portfolios yet. Run the optimizer and save one to see it here every Friday.";

    const news = headlines.length
      ? `
      <tr><td style="padding:8px 0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.line};border-radius:20px;">
          <tr><td style="padding:22px 24px 6px;font:500 14px/1.3 ${FONT};color:${C.text};">In the news for your stocks</td></tr>
          ${headlines
            .map(
              (h) => `
          <tr><td style="padding:10px 24px;border-top:1px solid ${C.line};">
            <a href="${esc(h.url)}" style="font:500 13.5px/1.45 ${FONT};color:${C.text};text-decoration:none;">${esc(h.title)}</a>
            <div style="margin-top:4px;font:400 12px/1.4 ${FONT};color:${C.muted};"><span style="color:${h.sentiment === "positive" ? C.green : h.sentiment === "negative" ? C.red : C.amber};">●</span> ${esc(h.source)} · ${esc(h.stocks.join(", "))}</div>
          </td></tr>`,
            )
            .join("")}
          <tr><td style="padding:6px 24px 18px;"></td></tr>
        </table>
      </td></tr>`
      : "";

    const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
<title>Your OptiFolio week</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;">${esc(summary)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
    <tr><td style="padding:0 4px 28px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:26px;height:26px;background:${C.brand};border-radius:7px;" align="center" valign="middle">
          <div style="width:10px;height:10px;border:3px solid #ffffff;border-radius:50%;"></div>
        </td>
        <td style="padding-left:10px;font:600 16px/1 ${FONT};color:${C.text};letter-spacing:-0.03em;">OptiFolio</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 4px 24px;">
      <div style="font:400 13px/1.3 ${MONO};color:${C.muted};">Your week · ${esc(range)}</div>
      <div style="font:500 30px/1.15 ${FONT};color:${C.text};letter-spacing:-0.035em;margin-top:10px;">${first ? `${esc(first)}, here` : "Here"} is how your portfolios did.</div>
      <div style="font:400 15px/1.6 ${FONT};color:${C.muted};margin-top:12px;">${esc(summary)}</div>
      ${
        reports.length
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr>
        ${metric("Total value", inr(total))}
        ${metric("This week", pct(weekPct), tone(weekPct))}
        ${metric("Nifty 50", pct(nifty), C.muted)}
      </tr></table>`
          : ""
      }
    </td></tr>
    ${reports.map(portfolioCard).join("")}
    ${totalPortfolios > reports.length ? `<tr><td style="padding:0 4px 16px;font:400 12.5px/1.5 ${FONT};color:${C.muted};">Showing your ${reports.length} most recent of ${totalPortfolios} saved portfolios.</td></tr>` : ""}
    ${news}
    <tr><td style="padding:8px 4px 28px;">
      <a href="${appUrl()}/Dashboard" style="display:inline-block;background:${C.brand};color:#ffffff;font:500 14px/1 ${FONT};text-decoration:none;padding:13px 22px;border-radius:999px;">Open OptiFolio →</a>
    </td></tr>
    <tr><td style="padding:20px 4px 0;border-top:1px solid ${C.line};font:400 12px/1.6 ${FONT};color:${C.muted};">
      Prices are end-of-day closes. Share counts are estimated from the close on the day each portfolio was saved. Educational tool, not investment advice.<br>
      You get this because you turned on the weekly email in OptiFolio. <a href="${unsub}" style="color:${C.muted};text-decoration:underline;">Unsubscribe</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;

    const text = [
      `Your OptiFolio week · ${range}`,
      "",
      summary,
      "",
      ...reports.map((p) => `Saved ${day(p.date)}: ${inr(p.report.total_value)} · week ${pct(p.report.week?.portfolio_pct)} · since saved ${pct(p.report.total_pnl_pct)}${p.report.needs_rebalance ? " · rebalance suggested" : ""}`),
      "",
      `Open OptiFolio: ${appUrl()}/Dashboard`,
      `Unsubscribe: ${unsub}`,
    ].join("\n");

    const subject = reports.length ? `Your week: ${pct(weekPct)} · Nifty ${pct(nifty)}` : "Your OptiFolio week";
    return { subject, html, text };
  }

  async function build(userId) {
    const [data, name] = await Promise.all([gather(userId), nameOf(userId)]);
    return render({ ...data, name }, userId);
  }

  async function send(userId) {
    if (!configured()) throw new Error("RESEND_API_KEY is not set");
    const to = await emailOf(userId);
    if (!to) throw new Error("No email address on this account.");
    const mail = await build(userId);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: from(), to, subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`Email provider error ${r.status}: ${(await r.text()).slice(0, 200)}`);
    await supabase.from("email_prefs").upsert({ user_id: userId, last_sent_at: new Date().toISOString() }, { onConflict: "user_id" });
    return { to };
  }

  let running = false;
  async function sendDue(force = false) {
    if (running || !configured()) return { sent: 0, failed: 0, skipped: true };
    running = true;
    let sent = 0;
    let failed = 0;
    try {
      const cutoff = thisFridayEvening();
      const now = Date.now();
      if (!force && (now < cutoff.getTime() || now > cutoff.getTime() + 24 * 60 * 60 * 1000)) return { sent, failed };
      const { data, error } = await supabase.from("email_prefs").select("user_id, last_sent_at").eq("weekly", true);
      if (error) throw new Error(error.message);
      for (const p of data || []) {
        if (!force && p.last_sent_at && new Date(p.last_sent_at) >= cutoff) continue;
        try {
          await send(p.user_id);
          sent++;
        } catch (e) {
          failed++;
          console.error("[weekly] send failed", p.user_id.slice(0, 8), e.message);
        }
      }
      return { sent, failed };
    } finally {
      running = false;
    }
  }

  function schedule() {
    const tick = () =>
      sendDue()
        .then((r) => r.sent + r.failed > 0 && console.log(`[weekly] sent ${r.sent}, failed ${r.failed}`))
        .catch((e) => console.error("[weekly]", e.message));
    setTimeout(tick, 60 * 1000);
    setInterval(tick, 15 * 60 * 1000);
  }

  return { build, send, sendDue, schedule, configured, verify: (u, t) => !!u && !!t && t === unsubToken(u, secret()) };
}

module.exports = { createWeekly };
