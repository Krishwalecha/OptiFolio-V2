import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, BookOpen, CircleCheck, Mail, Wand2 } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { useAuth } from "@/context/AuthContext";
import { readLessons, resetLessons } from "@/lib/palette";
import { LESSONS } from "@/features/learn/lessons";
import { CACHE_KEY } from "@/features/news/config";
import { normalizeProfile } from "@/features/optimizer/config";
import { NIFTY, niftyChange, niftyWindow } from "@/features/market/nifty";
import type { Article } from "@/features/news/types";
import { checkRebalance, type RebalanceReport } from "@/services/optimizerService";
import { api } from "@/lib/api";
import { Badge, Button, Card, CardHeader, DitherTerrain, LineChart, Legend, EmptyState, Sheet, Switch, toast, NumberTicker, PALETTE, Progress, Skeleton, Stat, StackBar, buttonClass, inr, Wave } from "@/ui";
import { cn } from "@/lib/utils";

interface Holding {
  ticker: string;
  allocation: number;
  invested_inr: number;
}
interface Session {
  sessionId: string;
  date: string;
  tickers: Holding[];
}
interface RiskProfile {
  profile: string;
  breakdown?: { totalScore: number };
}

const RISK_LABEL: Record<string, string> = { conservative: "Conservative", balanced: "Balanced", aggressive: "Aggressive" };
const signed = (v: number, d = 2) => `${v >= 0 ? "+" : ""}${v.toFixed(d)}%`;
const shortDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function readNews(): { articles: Article[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const More: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground no-underline transition-colors hover:text-foreground">
    {children}
    <ArrowUpRight size={13} />
  </Link>
);

const LivePortfolio: React.FC<{ session: Session }> = ({ session }) => {
  const [report, setReport] = useState<RebalanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setReport(null);
    setError(null);
    checkRebalance(session.sessionId)
      .then((r) => live && setReport(r))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Could not price this portfolio."));
    return () => {
      live = false;
    };
  }, [session.sessionId]);

  const holdings = [...session.tickers].sort((a, b) => b.allocation - a.allocation);
  const invested = holdings.reduce((s, h) => s + h.invested_inr, 0);
  const rows = report ? [...report.holdings].sort((a, b) => b.target_pct - a.target_pct) : null;
  const fresh = !!report && (report.curve?.length ?? 0) <= 1;
  const nifty = fresh ? null : (report?.nifty_return_pct ?? null);
  const beat = report && nifty !== null ? report.total_pnl_pct - nifty : null;

  return (
    <Card padded={false} className="overflow-hidden lg:col-span-3">
      <div className="grid gap-px bg-[var(--hairline)] lg:grid-cols-[1.1fr_1fr]">
        <div className="bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[13px] text-muted-foreground">Latest portfolio · saved {shortDate(session.date)}</div>
            {report &&
              (report.needs_rebalance ? (
                <Badge tone="warn" dot>
                  Rebalance suggested
                </Badge>
              ) : (
                <Badge tone="up" dot>
                  On track
                </Badge>
              ))}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <div className="text-[12px] text-muted-foreground">Value today</div>
              <div className="num mt-1.5 text-[34px] font-medium leading-none tracking-[-0.04em]">
                {report ? <NumberTicker value={report.total_value} format={(v) => inr(v)} /> : error ? inr(invested) : <Skeleton className="h-[34px] w-44" />}
              </div>
            </div>
            {report && (
              <>
                {!fresh && <Stat label="Since saved" value={signed(report.total_pnl_pct)} tone={report.total_pnl_pct >= 0 ? "up" : "down"} />}
                {nifty !== null && <Stat label="Nifty 50, same period" value={signed(nifty)} />}
              </>
            )}
          </div>

          {report && (
            <p className="mb-0 mt-5 text-[13.5px] leading-relaxed text-muted-foreground">
              {fresh && "Saved today, so returns start counting from the next market close. "}
              {beat !== null && (
                <>
                  {beat >= 0 ? "Ahead of" : "Behind"} the Nifty 50 by{" "}
                  <span className={cn("num font-medium", beat >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>{Math.abs(beat).toFixed(2)} points</span>.{" "}
                </>
              )}
              {report.needs_rebalance
                ? `One holding is ${report.max_drift_pp.toFixed(1)} points away from its target weight.`
                : `Every holding is within ${report.threshold_pp} points of its target.`}
            </p>
          )}
          {!report && !error && (
            <div className="mt-5 flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <Wave size={14} /> Pricing {holdings.length} holdings at today’s close
            </div>
          )}
          {error && <p className="mb-0 mt-5 text-[13px] text-[var(--red)]">{error}</p>}
          {report && (report.curve?.length ?? 0) > 1 && (
            <div className="rise mt-5">
              <LineChart
                data={report.curve!}
                x="date"
                height={120}
                baseline={0}
                area={false}
                showAxis={false}
                series={[
                  { key: "portfolio", label: "This portfolio", color: "hsl(var(--brand))" },
                  { key: "nifty50", label: "Nifty 50", color: "hsl(var(--foreground) / 0.45)", dashed: true },
                ]}
                formatY={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                formatX={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              />
              <Legend
                className="mt-2"
                items={[
                  { label: "This portfolio", color: "hsl(var(--brand))" },
                  { label: "Nifty 50", color: "hsl(var(--foreground) / 0.45)", dashed: true },
                ]}
              />
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 flex justify-between text-[11.5px] text-muted-foreground">
              <span>Target weights</span>
              <span className="num">{inr(invested)} invested</span>
            </div>
            <StackBar items={holdings.map((h, i) => ({ label: h.ticker, value: h.allocation, color: PALETTE[i % PALETTE.length] }))} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/Portfolios" className={buttonClass("secondary", "sm")}>
              Review drift
            </Link>
            <Link to="/Optimizer" className={buttonClass("ghost", "sm")}>
              Re-optimize
            </Link>
          </div>
        </div>

        <div className="bg-card p-6 pt-5">
          <div className="grid grid-cols-[1fr_64px_72px] gap-3 border-b border-[var(--hairline)] pb-2.5 text-[11.5px] text-muted-foreground">
            <span>Holding</span>
            <span className="text-right">Weight</span>
            <span className="text-right">Return</span>
          </div>
          {(rows ?? holdings).slice(0, 7).map((h, i) => {
            const r = rows ? (h as RebalanceReport["holdings"][number]) : null;
            const weight = r ? r.current_pct : (h as Holding).allocation;
            return (
              <div key={h.ticker} className="grid grid-cols-[1fr_64px_72px] items-center gap-3 border-b border-[var(--hairline)] py-2.5 text-[13.5px] last:border-0">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate font-medium">{h.ticker}</span>
                  {r && Math.abs(r.drift_pp) >= (report?.threshold_pp ?? 5) && (
                    <Badge tone="warn" className="h-5 px-1.5 text-[10.5px]">
                      {signed(r.drift_pp, 1).replace("%", " pts")}
                    </Badge>
                  )}
                </span>
                <span className="num text-right text-muted-foreground">{weight.toFixed(1)}%</span>
                <span className={cn("num text-right", r ? (r.error ? "text-muted-foreground" : r.pnl_pct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]") : "")}>
                  {r ? r.error ? "n/a" : signed(r.pnl_pct, 1) : error ? "n/a" : <Skeleton className="ml-auto h-3.5 w-12" />}
                </span>
              </div>
            );
          })}
          {holdings.length > 7 && <div className="pt-2.5 text-[12px] text-muted-foreground">and {holdings.length - 7} more</div>}
        </div>
      </div>
    </Card>
  );
};

const MarketCard: React.FC = () => {
  const values = useMemo(() => niftyWindow(260), []);
  const y1 = niftyChange(52);
  const last = NIFTY.weekly[NIFTY.weekly.length - 1];
  return (
    <Card padded={false} className="relative overflow-hidden lg:col-span-2">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6 p-6 pb-0">
        <div>
          <div className="text-[13px] text-muted-foreground">Nifty 50 · weekly close, 5 years</div>
          <div className="num mt-2 text-[28px] font-medium leading-none tracking-[-0.04em]">{last.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="flex gap-6">
          <Stat label="1 year" value={signed(y1 * 100, 1)} tone={y1 >= 0 ? "up" : "down"} />
          <Stat label="5 years" value={signed(niftyChange(260) * 100, 1)} tone="default" />
        </div>
      </div>
      <div className="h-[168px] text-foreground/70">
        <DitherTerrain values={values} pixel={3} />
      </div>
      <div className="flex justify-between border-t border-[var(--hairline)] px-6 py-3 text-[11.5px] text-muted-foreground">
        <span>Data as of {shortDate(NIFTY.as_of)}</span>
        <More to="/FinancialNews">Markets</More>
      </div>
    </Card>
  );
};

const PulseCard: React.FC = () => {
  const news = useMemo(readNews, []);
  const pulse = useMemo(() => {
    const a = (news?.articles || []).filter((x) => x.analyzed);
    const pos = a.filter((x) => x.sentiment === "positive").length;
    const neg = a.filter((x) => x.sentiment === "negative").length;
    return { total: a.length, pos, neg, neu: a.length - pos - neg, top: a.filter((x) => x.sentiment !== "neutral" && x.stocks?.length).slice(0, 3) };
  }, [news]);

  return (
    <Card className="flex flex-col">
      <CardHeader title="Headline sentiment" description={pulse.total ? `${pulse.total} scored articles` : undefined} action={<More to="/FinancialNews">Open</More>} />
      {pulse.total ? (
        <>
          <StackBar
            height={6}
            items={[
              { label: "Bullish", value: pulse.pos, color: "var(--green)" },
              { label: "Neutral", value: pulse.neu, color: "hsl(var(--foreground) / 0.18)" },
              { label: "Bearish", value: pulse.neg, color: "var(--red)" },
            ]}
          />
          <div className="mt-2 flex justify-between text-[11.5px] text-muted-foreground">
            <span className="num">{pulse.pos} bullish</span>
            <span className="num">{pulse.neg} bearish</span>
          </div>
          <div className="mt-3">
            {pulse.top.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block border-t border-[var(--hairline)] py-3 no-underline">
                <span className="flex items-center gap-2 text-[11.5px]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.sentiment === "positive" ? "var(--green)" : "var(--red)" }} />
                  <span className="text-muted-foreground">{a.stocks.slice(0, 2).join(", ")}</span>
                </span>
                <span className="mt-1 line-clamp-2 text-[13px] leading-snug text-foreground">{a.title}</span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <p className="m-0 text-[13.5px] leading-relaxed text-muted-foreground">Headlines are scored when you open Markets. Nothing is cached yet.</p>
          <Link to="/FinancialNews" className={cn(buttonClass("secondary", "sm"), "mt-4 self-start")}>
            Load headlines
          </Link>
        </div>
      )}
    </Card>
  );
};

const LearnCard: React.FC<{ wide?: boolean }> = ({ wide }) => {
  const [read, setRead] = useState<string[]>(readLessons);
  const done = read.filter((s) => LESSONS.some((l) => l.slug === s)).length;
  const next = LESSONS.find((l) => !read.includes(l.slug)) || LESSONS[0];
  return (
    <Card className={cn("flex flex-col", wide && "lg:col-span-3 lg:grid lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-8")}>
      <div>
        <CardHeader
          title="Learning"
          description={
            <>
              {done} of {LESSONS.length} lessons read
              {done > 0 && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      resetLessons();
                      setRead([]);
                    }}
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Reset
                  </button>
                </>
              )}
            </>
          }
          action={<More to="/Learn">All lessons</More>}
        />
        <Progress value={done / LESSONS.length} />
      </div>
      <Link
        to={`/Learn/${next.slug}`}
        className={cn("group mt-5 flex flex-1 flex-col rounded-xl bg-foreground/[0.03] p-4 no-underline ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.05]", wide && "lg:mt-0")}
      >
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <BookOpen size={12} /> Next · {next.minutes} min
        </span>
        <span className="mt-2 text-[14.5px] font-medium tracking-[-0.015em] text-foreground">{next.title}</span>
        <span className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{next.summary}</span>
      </Link>
    </Card>
  );
};

type EmailPrefs = { weekly: boolean; lastSentAt: string | null; configured: boolean; setupNeeded: boolean };

const WeeklyEmailCard: React.FC = () => {
  const [prefs, setPrefs] = useState<EmailPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api("/api/emails/prefs")
      .then((r) => r.json())
      .then(setPrefs)
      .catch(() => setPrefs({ weekly: false, lastSentAt: null, configured: false, setupNeeded: false }));
  }, []);

  const toggle = async (on: boolean) => {
    setBusy(true);
    setPrefs((p) => (p ? { ...p, weekly: on } : p));
    try {
      const r = await api("/api/emails/prefs", { method: "POST", body: JSON.stringify({ weekly: on }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(on ? "Weekly email on" : "Weekly email off", { description: on ? "Arrives every Friday around 6 pm IST." : undefined });
    } catch (e) {
      setPrefs((p) => (p ? { ...p, weekly: !on } : p));
      toast.error("Could not update", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  };

  const openPreview = async () => {
    setLoadingPreview(true);
    try {
      const r = await api("/api/emails/weekly/preview");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPreview(d);
    } catch (e) {
      toast.error("Could not build the preview", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoadingPreview(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const r = await api("/api/emails/weekly/send-me", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Sent", { description: `Check ${d.to}.` });
    } catch (e) {
      toast.error("Could not send", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="lg:col-span-3">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-inset ring-brand/20">
          <Mail size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-medium tracking-[-0.01em]">Weekly email</div>
          <p className="mb-0 mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Every Friday evening: each saved portfolio’s value, this week and since saving against the Nifty 50, best and worst holdings, drift, and headlines about your stocks.
            {prefs?.lastSentAt && ` Last sent ${shortDate(prefs.lastSentAt)}.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={openPreview} loading={loadingPreview}>
            Preview
          </Button>
          {prefs?.configured && (
            <Button variant="secondary" size="sm" onClick={sendNow} loading={sending}>
              Send me one now
            </Button>
          )}
          <div className="ml-1 flex items-center gap-2 text-[12.5px] text-muted-foreground">
            {prefs?.weekly ? "On" : "Off"}
            <Switch checked={!!prefs?.weekly} onChange={toggle} disabled={!prefs || busy} label="Weekly email" />
          </div>
        </div>
      </div>
      <Sheet open={!!preview} onClose={() => setPreview(null)} title={preview?.subject} description="Exactly what arrives in your inbox on Friday." width={680}>
        {preview && <iframe title="Weekly email preview" srcDoc={preview.html} className="h-[75vh] w-full rounded-xl border-0 bg-[#0a0a0a]" sandbox="allow-popups" />}
      </Sheet>
    </Card>
  );
};

const Dashboard: React.FC = () => {
  const { isLoggedIn, userId } = useAuth();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [risk, setRisk] = useState<RiskProfile | null>(null);

  useEffect(() => {
    if (!userId) return;
    api(`/api/userPortfolios/${userId}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.portfolioGroups || []))
      .catch(() => setSessions([]));
    api(`/api/userRiskProfile/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setRisk)
      .catch(() => setRisk(null));
  }, [userId]);

  const latest = sessions?.[0];
  const profile = risk ? RISK_LABEL[normalizeProfile(risk.profile)] : null;
  return (
    <AppShell
      title="Overview"
      description={isLoggedIn ? (profile ? `${profile} risk profile · ${sessions?.length ?? 0} saved portfolios` : "Set a risk profile in the optimizer to tailor allocations.") : undefined}
      actions={
        <Link to="/Optimizer" className={buttonClass("primary", "md")}>
          <Wand2 size={14} /> New optimization
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {!isLoggedIn ? (
          <div className="lg:col-span-3">
            <EmptyState
              title="Sign in to track your portfolios"
              description="Saved portfolios are priced at the latest close and checked for drift from their target weights."
              action={
                <div className="flex gap-2">
                  <Link to="/SignIn" className={buttonClass("primary", "md")}>
                    Sign in
                  </Link>
                  <Link to="/SignUp" className={buttonClass("ghost", "md")}>
                    Create account
                  </Link>
                </div>
              }
            />
          </div>
        ) : sessions === null ? (
          <Card className="lg:col-span-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-6 h-9 w-56" />
            <Skeleton className="mt-8 h-2.5 w-full" />
          </Card>
        ) : latest ? (
          <LivePortfolio session={latest} />
        ) : (
          <div className="lg:col-span-3">
            <EmptyState
              title="No saved portfolio yet"
              description="Run an optimization and save it. It will show up here with its value, return against the Nifty 50, and drift."
              action={
                <Link to="/Optimizer" className={buttonClass("primary", "md")}>
                  Start an optimization
                </Link>
              }
            />
          </div>
        )}

        <MarketCard />
        <PulseCard />

        {isLoggedIn && sessions && sessions.length > 1 && (
          <Card className="lg:col-span-2">
            <CardHeader title="Earlier portfolios" action={<More to="/Portfolios">View all</More>} />
            {sessions.slice(1, 5).map((s) => {
              const total = s.tickers.reduce((a, t) => a + t.invested_inr, 0);
              const sorted = [...s.tickers].sort((a, b) => b.allocation - a.allocation);
              return (
                <div key={s.sessionId} className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-[var(--hairline)] py-3 sm:grid-cols-[120px_1fr_auto]">
                  <span className="text-[13px]">{shortDate(s.date)}</span>
                  <StackBar className="hidden sm:flex" height={6} items={sorted.map((t, i) => ({ label: t.ticker, value: t.allocation, color: PALETTE[i % PALETTE.length] }))} />
                  <span className="num text-right text-[12.5px] text-muted-foreground">
                    {s.tickers.length} stocks · {inr(total)}
                  </span>
                </div>
              );
            })}
          </Card>
        )}
        <LearnCard wide={!(isLoggedIn && sessions && sessions.length > 1)} />
        {isLoggedIn && <WeeklyEmailCard />}
      </div>
    </AppShell>
  );
};

export default Dashboard;
