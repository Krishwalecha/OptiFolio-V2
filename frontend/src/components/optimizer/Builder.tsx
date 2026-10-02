import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, IndianRupee, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { optimize, savePortfolio, type Constraints, type OptimizeResult, type RiskProfile } from "@/services/optimizerService";
import { RISK_PROFILES, normalizeProfile, readAndClearCart } from "@/features/optimizer/config";
import { scoreRisk } from "@/features/optimizer/riskScore";
import type { SavedRiskProfile, UserProfile } from "@/features/optimizer/types";
import { api } from "@/lib/api";
import { Badge, Blocks, Button, Card, Field, Input, LinearBar, Segmented, Select, Skeleton, Slider, Switch, buttonClass, compactInr, inr, toast } from "@/ui";
import { checkSectors } from "@/features/market/sectors";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import TickerPicker, { type Pick } from "./TickerPicker";
import Results from "./Results";

const AMOUNTS = [25000, 100000, 500000, 1000000];
const EMPTY_PROFILE: UserProfile = { monthlyIncome: 0, monthlyExpenses: 0, sideIncome: 0, age: 0, familyMembers: 1, existingInvestments: 0, investmentHorizon: "medium" };

const PIPELINE = [
  "Loading five years of prices for your stocks",
  "Building 40+ technical features for each stock",
  "Training an XGBoost model per stock and testing it on held-out data",
  "Scoring each stock by predicted return and measured accuracy",
  "Weighting for your risk profile, then adjusting for momentum and basket size",
  "Turning weights into whole shares and measuring the risk",
];

const Section: React.FC<{ n: number; title: string; description?: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ n, title, description, children, aside }) => (
  <section className="grid gap-4 border-t border-[var(--hairline)] py-7 first:border-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-8">
    <div>
      <div className="flex items-center gap-2.5">
        <span className="num grid h-5 w-5 place-items-center rounded-full bg-foreground/[0.07] text-[11px] font-medium">{n}</span>
        <h2 className="text-[14.5px] font-medium tracking-[-0.015em]">{title}</h2>
      </div>
      {description && <p className="mb-0 mt-1.5 pl-[30px] text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
      {aside}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-4 py-2 text-[13px]">
    <span className="text-muted-foreground">{k}</span>
    <span className="min-w-0 truncate text-right font-medium">{v}</span>
  </div>
);

const RunStatus: React.FC<{ elapsed: number; deep: boolean }> = ({ elapsed, deep }) => (
  <div className="mt-4 rounded-xl bg-foreground/[0.03] p-4 ring-1 ring-inset ring-[var(--hairline)]" aria-live="polite">
    <div className="flex items-center gap-2.5 text-[13px] font-medium">
      <Blocks size={14} className="text-brand" />
      Running
      <span className="num ml-auto text-muted-foreground">{elapsed}s</span>
    </div>
    <LinearBar className="mt-3" />
    <ul className="m-0 mt-3 list-none space-y-1.5 p-0 text-[12px] leading-snug text-muted-foreground">
      {PIPELINE.map((s) => (
        <li key={s} className="flex gap-2">
          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          {s}
        </li>
      ))}
    </ul>
    <p className="mb-0 mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
      {deep ? "Deep analysis tunes every model and usually takes 2 to 4 minutes." : "Usually 5 to 20 seconds."}
    </p>
  </div>
);

const SAMPLES = [
  { name: "Large caps", tickers: ["RELIANCE", "HDFCBANK", "INFY", "ITC", "LT", "SUNPHARMA"] },
  { name: "Banks & IT", tickers: ["HDFCBANK", "ICICIBANK", "KOTAKBANK", "TCS", "INFY", "HCLTECH"] },
  { name: "Defence & PSU", tickers: ["HAL", "BEL", "MAZDOCK", "SBIN", "NTPC", "POWERGRID"] },
  { name: "Consumer & pharma", tickers: ["HINDUNILVR", "TITAN", "ASIANPAINT", "SUNPHARMA", "CIPLA", "DRREDDY"] },
];

const Builder: React.FC = () => {
  const { isLoggedIn, userId } = useAuth();
  const navigate = useNavigate();
  const [picks, setPicks] = useState<Pick[]>(() => readAndClearCart().filter(Boolean).map((t) => ({ ticker: t })));
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<"choose" | "questionnaire">("choose");
  const [risk, setRisk] = useState<RiskProfile>("balanced");
  const [answers, setAnswers] = useState<UserProfile>(EMPTY_PROFILE);
  const [saved, setSaved] = useState<SavedRiskProfile | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [minW, setMinW] = useState("");
  const [maxW, setMaxW] = useState("");
  const [deep, setDeep] = useState(false);
  const [core, setCore] = useState(0);
  const sectors = useMemo(() => checkSectors(picks.map((p) => p.ticker)), [picks]);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return setElapsed(0);
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!isLoggedIn || !userId || mode !== "questionnaire" || saved) return;
    api(`/api/userRiskProfile/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((raw: SavedRiskProfile | null) => {
        if (!raw) return;
        setSaved({ ...raw, profile: normalizeProfile(raw.profile) });
        if (raw.profileData) setAnswers(raw.profileData);
      })
      .catch(() => {});
  }, [isLoggedIn, userId, mode, saved]);

  const complete = answers.age > 0 && answers.monthlyIncome > 0 && answers.familyMembers > 0;
  const scored = useMemo(() => (complete ? scoreRisk(answers, amount) : null), [answers, amount, complete]);
  const profile: RiskProfile = mode === "questionnaire" && scored ? scored.profile : risk;
  const meta = RISK_PROFILES.find((p) => p.value === profile)!;
  const lim = { lo: meta.minWeight, hi: meta.maxWeight };

  const errors = {
    stocks: picks.length < 2 ? "Add at least two stocks." : null,
    amount: amount < 1000 ? "Enter at least ₹1,000." : null,
    profile: mode === "questionnaire" && !complete ? "Fill in age, income and household size." : null,
    limits:
      (minW && (Number(minW) < 0 || Number(minW) > 50)) || (maxW && (Number(maxW) < 5 || Number(maxW) > 100))
        ? "Minimum must be 0–50% and maximum 5–100%."
        : minW && maxW && Number(minW) >= Number(maxW)
          ? "Minimum must be below maximum."
          : minW && Number(minW) * picks.length > 100
            ? `A ${minW}% minimum across ${picks.length} stocks is over 100%.`
            : null,
  };
  const firstError = Object.values(errors).find(Boolean);

  const run = async () => {
    setTouched(true);
    if (firstError) return toast.error("Check your inputs", { description: firstError });
    setRunning(true);
    setResult(null);
    try {
      if (isLoggedIn && mode === "questionnaire" && scored) api("/api/saveRiskProfile", { method: "POST", body: JSON.stringify({ userId, breakdown: scored.breakdown, profile: scored.profile, profileData: answers }) }).catch(() => {});
      const constraints: Constraints = {};
      if (minW.trim()) constraints.minWeight = Number(minW) / 100;
      if (maxW.trim()) constraints.maxWeight = Number(maxW) / 100;
      if (core > 0) constraints.core = core / 100;
      const res = await optimize({ tickers: picks.map((p) => p.ticker), investment: amount, risk: profile, userId: userId ?? undefined, deepMode: isLoggedIn && deep, constraints });
      setResult(res);
      setSavedId(null);
      try {
        sessionStorage.setItem(
          "optifolio:lastResult",
          JSON.stringify({
            risk_profile: res.risk_profile,
            strategy: res.strategy,
            investment: res.investment,
            allocation: res.allocation.map((a) => ({ ticker: a.ticker, weight_pct: a.weight_pct, shares: a.shares })),
            performance: res.performance,
            model: res.model,
            scores: res.scores,
            dropped: res.dropped_stocks.map((d) => ({ ticker: d.ticker, reason: d.reason })),
          }),
        );
      } catch {
        /* storage blocked */
      }
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      toast.error("Optimization failed", { description: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setRunning(false);
    }
  };

  const save = async () => {
    if (!result) return;
    if (!userId) {
      try {
        localStorage.setItem("portfolioCart_v1", JSON.stringify(result.allocation.map((a) => a.ticker)));
      } catch {
        /* storage blocked */
      }
      navigate("/SignIn?next=/Optimizer");
      return;
    }
    setSaving(true);
    try {
      const sid = `${userId}_${Date.now()}`;
      await savePortfolio(userId, sid, result.allocation);
      setSavedId(sid);
      toast.success("Saved to portfolios", { description: `${result.allocation.length} holdings. Track its drift from Overview.` });
    } catch (e) {
      toast.error("Could not save", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const num = (k: keyof UserProfile) => ({
    value: answers[k] ? String(answers[k]) : "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setAnswers({ ...answers, [k]: Number(e.target.value) || 0 }),
    inputMode: "numeric" as const,
    type: "number",
    min: 0,
  });

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
        <Card className="p-6 sm:p-8">
          <Section n={1} title="Stocks" description="Two to fifteen NSE stocks. Mixing sectors gives the optimizer more to work with.">
            <TickerPicker value={picks} onChange={setPicks} invalid={touched && !!errors.stocks} />
            {touched && errors.stocks && <p className="mb-0 mt-2 text-[12px] text-[var(--red)]">{errors.stocks}</p>}
            {picks.length === 0 && (
              <div className="rise mt-4">
                <div className="mb-2 text-[12px] text-muted-foreground">Or start from a sample</div>
                <div className="grid gap-2 sm:grid-cols-2 [&>*]:min-w-0">
                  {SAMPLES.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setPicks(b.tickers.map((ticker) => ({ ticker })))}
                      className="group min-w-0 rounded-xl p-3 text-left ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.03] hover:ring-foreground/20"
                    >
                      <span className="flex items-center justify-between text-[13px] font-medium">
                        {b.name}
                        <Plus size={13} className="text-muted-foreground transition-colors group-hover:text-foreground" />
                      </span>
                      <span className="mt-1 block truncate text-[11.5px] text-muted-foreground">{b.tickers.join(" · ")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {picks.length >= 2 && (sectors.dominant || sectors.counts.length === 1) && (
              <div className="rise mt-3 rounded-xl bg-[var(--amber-subtle)] p-3.5 ring-1 ring-inset ring-[var(--amber-border)]">
                <p className="m-0 text-[12.5px] leading-relaxed">
                  <span className="font-medium">
                    {(() => {
                      const known = picks.length - sectors.unknown.length;
                      const sec = sectors.dominant?.sector ?? sectors.counts[0][0];
                      const n = sectors.dominant?.count ?? known;
                      if (n === known) return known === 2 ? `Both your stocks are ${sec}.` : `All ${known} of your stocks are ${sec}.`;
                      return `${n} of your ${known} stocks are ${sec}.`;
                    })()}
                  </span>{" "}
                  <span className="text-muted-foreground">Stocks in one sector tend to fall together. Adding a different sector usually lowers risk more than any weighting can.</span>
                </p>
                {sectors.suggestions.length > 0 && picks.length < 15 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {sectors.suggestions.map((s) => (
                      <button
                        key={s.ticker}
                        type="button"
                        onClick={() => setPicks([...picks, { ticker: s.ticker }])}
                        className="inline-flex h-7 items-center gap-1 rounded-full bg-card px-2.5 text-[12px] ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.05]"
                      >
                        <Plus size={11} />
                        <span className="font-medium">{s.ticker}</span>
                        <span className="text-muted-foreground">{s.sector}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {picks.length >= 2 && sectors.counts.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sectors.counts.map(([sec, n]) => (
                  <span key={sec} className="inline-flex h-6 items-center rounded-full bg-foreground/[0.05] px-2.5 text-[11.5px] text-muted-foreground">
                    {sec} · {n}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section n={2} title="Amount" description="Whole shares only, so a little may stay as cash.">
            <Input
              inputSize="lg"
              prefix={<IndianRupee size={15} />}
              inputMode="numeric"
              placeholder="1,00,000"
              value={amount ? amount.toLocaleString("en-IN") : ""}
              onChange={(e) => setAmount(Math.min(1e10, Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
              aria-invalid={touched && !!errors.amount}
              aria-label="Investment amount in rupees"
              className="num"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(a)}
                  className={cn("h-7 rounded-full px-3 text-[12px] ring-1 ring-inset transition-colors", amount === a ? "bg-foreground text-background ring-foreground" : "text-muted-foreground ring-[var(--hairline)] hover:text-foreground")}
                >
                  {compactInr(a).replace(".00", "")}
                </button>
              ))}
            </div>
          </Section>

          <Section
            n={3}
            title="Risk"
            description="Decides how the optimizer trades return against volatility."
            aside={
              <div className="mt-3 pl-[30px]">
                <Segmented
                  size="sm"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "choose", label: "Choose" },
                    { value: "questionnaire", label: "Ask me" },
                  ]}
                />
              </div>
            }
          >
            {mode === "choose" ? (
              <div role="radiogroup" aria-label="Risk profile" className="grid gap-2">
                {RISK_PROFILES.map((p) => {
                  const on = risk === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setRisk(p.value)}
                      className={cn("flex items-start gap-3.5 rounded-xl p-4 text-left ring-1 ring-inset transition-[box-shadow,background] duration-150", on ? "bg-brand/[0.06] ring-2 ring-brand" : "ring-[var(--hairline)] hover:bg-foreground/[0.02] hover:ring-foreground/20")}
                    >
                      <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1 ring-inset", on ? "bg-brand ring-brand" : "ring-foreground/25")}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="text-[14px] font-medium">{p.label}</span>
                          <span className="text-[12px] text-muted-foreground">
                            {p.strategy} · {p.limits}
                          </span>
                        </span>
                        <span className="mt-1 block text-[12.5px] leading-relaxed text-muted-foreground">{p.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                {saved && <p className="mb-4 mt-0 text-[12.5px] text-muted-foreground">Filled in from your answers on {new Date(saved.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. Edit anything that changed.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Age" required>{(id) => <Input id={id} placeholder="28" {...num("age")} />}</Field>
                  <Field label="People in your household" required>{(id) => <Input id={id} placeholder="3" {...num("familyMembers")} />}</Field>
                  <Field label="Monthly income" required>{(id) => <Input id={id} prefix="₹" placeholder="80,000" {...num("monthlyIncome")} />}</Field>
                  <Field label="Monthly expenses">{(id) => <Input id={id} prefix="₹" placeholder="45,000" {...num("monthlyExpenses")} />}</Field>
                  <Field label="Other monthly income">{(id) => <Input id={id} prefix="₹" placeholder="0" {...num("sideIncome")} />}</Field>
                  <Field label="Already invested">{(id) => <Input id={id} prefix="₹" placeholder="2,00,000" {...num("existingInvestments")} />}</Field>
                  <Field label="When will you need this money?" className="sm:col-span-2">
                    {(id) => (
                      <Select
                        id={id}
                        value={answers.investmentHorizon}
                        onChange={(v) => setAnswers({ ...answers, investmentHorizon: v })}
                        options={[
                          { value: "short", label: "Within 3 years" },
                          { value: "medium", label: "In 3 to 7 years" },
                          { value: "long", label: "In 7 to 15 years" },
                          { value: "very_long", label: "After 15 years" },
                        ]}
                      />
                    )}
                  </Field>
                </div>
                <AnimatePresence mode="wait">
                  {scored ? (
                    <motion.div key={scored.profile} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-5 rounded-xl bg-foreground/[0.03] p-4 ring-1 ring-inset ring-[var(--hairline)]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13px]">
                          Your answers point to <span className="font-medium">{meta.label}</span>
                        </span>
                        <Badge tone="outline" className="num">
                          score {scored.breakdown.totalScore}
                        </Badge>
                      </div>
                      <ul className="m-0 mt-2.5 list-none space-y-1 p-0 text-[12px] text-muted-foreground">
                        {scored.breakdown.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </motion.div>
                  ) : (
                    touched && errors.profile && <p className="mb-0 mt-3 text-[12px] text-[var(--red)]">{errors.profile}</p>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Section>

          <section className="grid gap-4 border-t border-[var(--hairline)] pt-7 md:grid-cols-[200px_1fr] md:gap-8">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-foreground/[0.07] text-muted-foreground">
                  <SlidersHorizontal size={11} />
                </span>
                <h2 className="text-[14.5px] font-medium tracking-[-0.015em]">Advanced</h2>
              </div>
              <p className="mb-0 mt-1.5 pl-[30px] text-[12.5px] leading-relaxed text-muted-foreground">Optional. The defaults suit most runs.</p>
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setAdvanced((v) => !v)}
                aria-expanded={advanced}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-left ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.02]"
              >
                <span className="min-w-0 truncate text-[13px] text-muted-foreground">
                  <span className="num">Min {minW || lim.lo}%</span>
                  {" · "}
                  <span className="num">{maxW ? `max ${maxW}%` : "no cap"}</span>
                  {" · "}
                  Nifty core {core ? <span className="num">{core}%</span> : "off"}
                  {" · "}
                  {isLoggedIn && deep ? "Deep analysis" : "Standard analysis"}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                  {advanced ? "Hide" : "Customize"}
                  <ChevronDown size={14} className={cn("transition-transform duration-200", advanced && "rotate-180")} />
                </span>
              </button>

              {advanced && (
                <div className="rise mt-3 divide-y divide-[var(--hairline)] rounded-xl ring-1 ring-inset ring-[var(--hairline)]">
                  <div className="grid gap-3.5 p-4">
                    <div>
                      <div className="text-[13.5px] font-medium">Weight per stock</div>
                      <p className="mb-0 mt-1 text-[12.5px] leading-relaxed text-muted-foreground">Every stock gets at least the minimum. A cap stops any single stock from dominating.</p>
                    </div>
                    <div className="max-w-[420px]">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Minimum" hint={`Default ${lim.lo}%`}>
                          {(id) => <Input id={id} type="number" min={0} max={50} suffix="%" placeholder={String(lim.lo)} value={minW} onChange={(e) => setMinW(e.target.value)} />}
                        </Field>
                        <Field label="Maximum" hint="Empty for no cap">
                          {(id) => <Input id={id} type="number" min={5} max={100} suffix="%" placeholder="No cap" value={maxW} onChange={(e) => setMaxW(e.target.value)} />}
                        </Field>
                      </div>
                      {errors.limits && <p className="mb-0 mt-2 text-[12px] text-[var(--red)]">{errors.limits}</p>}
                    </div>
                  </div>

                  <div className="grid gap-3.5 p-4">
                    <div>
                      <div className="text-[13.5px] font-medium">Nifty 50 core</div>
                      <p className="mb-0 mt-1 text-[12.5px] leading-relaxed text-muted-foreground">Put part of the money in NIFTYBEES, a Nifty 50 index fund, and optimize the rest across your stocks. Keeps bad years closer to the index, at the cost of some upside.</p>
                    </div>
                    <div className="max-w-[420px]">
                      <div className="mb-2 flex items-baseline justify-between text-[12.5px]">
                        <span className="text-muted-foreground">In NIFTYBEES</span>
                        <span className="num font-medium">{core ? `${core}%` : "Off"}</span>
                      </div>
                      <Slider value={core} min={0} max={80} step={10} onChange={setCore} label="Nifty 50 core" format={(v) => (v ? `${v}% in NIFTYBEES` : "Off")} />
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-6 p-4">
                    <div>
                      <div className="text-[13.5px] font-medium">Deep analysis</div>
                      <p className="mb-0 mt-1 text-[12.5px] leading-relaxed text-muted-foreground">Tunes each stock’s model with Bayesian search before training. Can sharpen forecasts, takes 2 to 4 minutes. Limited to 3 runs an hour.</p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {isLoggedIn ? (
                        <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-muted-foreground">
                          {deep ? "On" : "Off"}
                          <Switch checked={deep} onChange={setDeep} label="Deep analysis" />
                        </label>
                      ) : (
                        <Link to="/SignIn?next=/Optimizer" className={buttonClass("secondary", "sm")}>
                          Sign in to use
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Below lg the summary card sits under the whole form, so keep the run button reachable while scrolling. */}
          <div className="pointer-events-none sticky bottom-5 z-30 mt-6 flex lg:hidden">
            <Button variant="brand" size="lg" className="pointer-events-auto rounded-full shadow-[0_12px_32px_-10px_rgba(0,0,0,0.5)]" onClick={run} loading={running}>
              {running ? "Optimizing" : picks.length ? `Optimize ${picks.length} ${picks.length === 1 ? "stock" : "stocks"}` : "Optimize"}
              {!running && <ArrowRight size={15} />}
            </Button>
          </div>
        </Card>

        <aside className="lg:sticky lg:top-6">
          <Card>
            <div className="text-[14px] font-medium">Summary</div>
            <div className="mt-3 divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
              <Row k="Stocks" v={picks.length ? <span title={picks.map((p) => p.ticker).join(", ")}>{picks.length}</span> : <span className="text-muted-foreground">None yet</span>} />
              <Row k="Amount" v={amount ? <span className="num">{inr(amount)}</span> : <span className="text-muted-foreground">Not set</span>} />
              <Row k="Profile" v={mode === "questionnaire" && !scored ? <span className="text-muted-foreground">Answer to see</span> : meta.label} />
              <Row k="Per stock" v={<span className="num">{maxW ? `${minW || lim.lo}–${maxW}%` : `min ${minW || lim.lo}%`}</span>} />
              {core > 0 && <Row k="Nifty core" v={<span className="num">{core}%</span>} />}
              <Row k="Mode" v={isLoggedIn && deep ? "Deep" : "Standard"} />
            </div>
            <Button variant="brand" size="lg" className="mt-5 w-full" onClick={run} loading={running}>
              {running ? "Optimizing" : "Optimize"}
              {!running && <ArrowRight size={15} />}
            </Button>
            {!isLoggedIn && !running && (
              <p className="mb-0 mt-2.5 text-center text-[12px] leading-relaxed text-muted-foreground">
                No account needed.{" "}
                <Link to="/SignIn?next=/Optimizer" className="text-foreground underline-offset-4 hover:underline">
                  Sign in
                </Link>{" "}
                to save results and run deep analysis.
              </p>
            )}
            {touched && firstError && !running && <p className="mb-0 mt-3 text-[12px] text-[var(--red)]">{firstError}</p>}
            {running && <RunStatus elapsed={elapsed} deep={deep} />}
          </Card>
        </aside>
      </div>

      <div ref={resultsRef} className="scroll-mt-6">
        {running && (
          <div className="mt-10 space-y-4" aria-hidden="true">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Card>
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="mt-3 h-8 w-52" />
              <Skeleton className="mt-6 h-3 w-full" />
              <div className="mt-6 space-y-3">
                {Array.from({ length: Math.min(Math.max(picks.length, 3), 7) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-6 h-36 w-full" />
              </Card>
              <Card>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-6 h-36 w-full" />
              </Card>
            </div>
          </div>
        )}
        <AnimatePresence>
          {result && !running && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="mt-10">
              <Results result={result} onSave={save} saveLabel={isLoggedIn ? undefined : "Sign in to save"} isSaving={saving} saved={!!savedId} onReset={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Builder;
