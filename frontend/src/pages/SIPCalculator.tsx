import React, { useMemo, useState } from "react";
import { Bookmark, ChevronRight, Download, Trash2 } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import FundSheet from "@/components/charts/FundSheet";
import { CATEGORIES, useMF, type FundData } from "@/context/MFContext";
import type { SavedCalc } from "@/features/sip/types";
import { GOAL_PRESETS, RISK_PROFILES } from "@/features/sip/config";
import { downloadPDF, readSaved, requiredSip, sipSeries, writeSaved } from "@/features/sip/utils";
import { Badge, Button, Card, CardHeader, Dialog, EmptyState, Input, Legend, LineChart, NumberTicker, Segmented, Sheet, Skeleton, Slider, StackBar, Tabs, compactInr, inr, toast } from "@/ui";
import { cn } from "@/lib/utils";

type Mode = "sip" | "stepup" | "lumpsum" | "goal";

const NumField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  format?: (v: number) => string;
}> = ({ label, value, onChange, min, max, step, prefix, suffix, format }) => (
  <div>
    <div className="mb-2 flex items-center justify-between gap-4">
      <label className="text-[13px] text-muted-foreground">{label}</label>
      <div className="flex h-8 items-center gap-1 rounded-lg bg-foreground/[0.04] px-2.5 ring-1 ring-inset ring-[var(--hairline)] focus-within:ring-2 focus-within:ring-brand">
        {prefix && <span className="text-[13px] text-muted-foreground">{prefix}</span>}
        <input
          aria-label={label}
          inputMode="decimal"
          value={value ? value.toLocaleString("en-IN") : "0"}
          onChange={(e) => {
            const v = Number(e.target.value.replace(/[^\d.]/g, ""));
            if (!isNaN(v)) onChange(Math.min(max * 10, v));
          }}
          className="num w-[92px] bg-transparent text-right text-[13.5px] font-medium outline-none"
        />
        {suffix && <span className="text-[13px] text-muted-foreground">{suffix}</span>}
      </div>
    </div>
    <Slider value={Math.min(Math.max(value, min), max)} min={min} max={max} step={step} onChange={onChange} label={label} format={format} />
  </div>
);

export default function SIPCalculator() {
  const { funds, loading, error } = useMF();
  const [mode, setMode] = useState<Mode>("sip");
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);
  const [stepUp, setStepUp] = useState(10);
  const [lump, setLump] = useState(200000);
  const [inflation, setInflation] = useState(6);
  const [goal, setGoal] = useState(5000000);
  const [fund, setFund] = useState<FundData | null>(null);
  const [saved, setSaved] = useState<SavedCalc[]>(readSaved);
  const [showSaved, setShowSaved] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);

  const su = mode === "stepup" || mode === "goal" ? stepUp : 0;
  const ls = mode === "lumpsum" ? lump : 0;
  const series = useMemo(() => sipSeries(monthly, rate, years, su, ls), [monthly, rate, years, su, ls]);
  const end = series[series.length - 1];
  const gains = end.value - end.invested;
  const real = end.value / Math.pow(1 + inflation / 100, years);
  const need = mode === "goal" ? requiredSip(goal, rate, years, su) : 0;
  const result = {
    invested: end.invested,
    maturity: end.value,
    returns: gains,
    realMaturity: Math.round(real),
  };

  const save = () => {
    const label = naming;
    setNaming(null);
    if (!label?.trim()) return;
    const next: SavedCalc[] = [
      {
        id: String(Date.now()),
        label: label.trim(),
        mode,
        monthly: String(monthly),
        rate: String(rate),
        years: String(years),
        stepUp: String(stepUp),
        inflation: String(inflation),
        goalTarget: String(goal),
        lumpsum: String(lump),
        result,
        savedAt: Date.now(),
      },
      ...saved,
    ].slice(0, 10);
    setSaved(next);
    writeSaved(next);
    toast.success("Scenario saved", { description: "Kept in this browser." });
  };

  const load = (c: SavedCalc) => {
    setMode((["sip", "stepup", "lumpsum", "goal"].includes(c.mode) ? c.mode : c.mode === "basic" ? "sip" : "sip") as Mode);
    setMonthly(Number(c.monthly) || 0);
    setRate(Number(c.rate) || 12);
    setYears(Number(c.years) || 10);
    setStepUp(Number(c.stepUp) || 0);
    setInflation(Number(c.inflation) || 6);
    setGoal(Number(c.goalTarget) || 5000000);
    setLump(Number(c.lumpsum) || 0);
    setShowSaved(false);
  };

  const remove = (id: string) => {
    const next = saved.filter((c) => c.id !== id);
    setSaved(next);
    writeSaved(next);
  };

  const [cat, setCat] = useState<string>("All");
  const shown = CATEGORIES.flatMap((c) => funds.filter((f) => f.category === c.key)).filter((f) => cat === "All" || f.category === cat);

  return (
    <AppShell
      title="SIP planner"
      description="Project a monthly investment, see what inflation does to it, or work backwards from a goal. Everything updates as you type."
      actions={
        <Button variant="ghost" onClick={() => setShowSaved(true)}>
          <Bookmark size={14} /> Saved{saved.length ? ` · ${saved.length}` : ""}
        </Button>
      }
    >
      <Tabs
        className="mb-6"
        value={mode}
        onChange={setMode}
        options={[
          { value: "sip", label: "Monthly SIP" },
          { value: "stepup", label: "Step-up SIP" },
          { value: "lumpsum", label: "Lumpsum + SIP" },
          { value: "goal", label: "Goal" },
        ]}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[360px_1fr] [&>*]:min-w-0">
        <Card className="space-y-7 p-6 lg:sticky lg:top-6">
          <div className="-mb-2 text-[13px] font-medium">Your plan</div>
          {mode === "goal" && (
            <>
              <NumField label="Goal amount" value={goal} onChange={setGoal} min={100000} max={100000000} step={100000} prefix="₹" />
              <div className="-mt-3 flex flex-wrap gap-1.5">
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => {
                      setGoal(Number(g.target));
                      setYears(Number(g.years));
                    }}
                    className="h-7 rounded-full px-2.5 text-[12px] text-muted-foreground ring-1 ring-inset ring-[var(--hairline)] hover:text-foreground"
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {mode === "lumpsum" && <NumField label="One-time investment" value={lump} onChange={setLump} min={0} max={10000000} step={10000} prefix="₹" />}
          <NumField label={mode === "goal" ? "You can invest monthly" : "Monthly investment"} value={monthly} onChange={setMonthly} min={500} max={200000} step={500} prefix="₹" />
          <NumField label="Years" value={years} onChange={(v) => setYears(Math.max(1, Math.round(v)))} min={1} max={40} step={1} suffix="yrs" />
          <div>
            <NumField label="Return assumed" value={rate} onChange={setRate} min={4} max={20} step={0.5} suffix="%" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {RISK_PROFILES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setRate(Number(p.rate))}
                  title={p.desc}
                  className={cn(
                    "h-7 rounded-full px-2.5 text-[12px] ring-1 ring-inset transition-colors",
                    rate === Number(p.rate) ? "bg-foreground text-background ring-foreground" : "text-muted-foreground ring-[var(--hairline)] hover:text-foreground",
                  )}
                >
                  {p.label} {p.rate}%
                </button>
              ))}
            </div>
          </div>
          {(mode === "stepup" || mode === "goal") && <NumField label="Raise the SIP each year by" value={stepUp} onChange={setStepUp} min={0} max={30} step={1} suffix="%" />}
          <NumField label="Inflation" value={inflation} onChange={setInflation} min={0} max={12} step={0.5} suffix="%" />
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="text-[13px] text-muted-foreground">In {years} years</div>
                <div className="num mt-1.5 text-[38px] font-medium leading-none tracking-[-0.045em]">
                  <NumberTicker value={end.value} duration={500} format={(v) => inr(v)} />
                </div>
                <div className="mt-2 text-[13px] text-muted-foreground">
                  Worth <span className="num text-foreground">{inr(real)}</span> in today’s money at {inflation}% inflation
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setNaming(`${inr(monthly)} a month for ${years} years`)}>
                  <Bookmark size={13} /> Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    downloadPDF({
                      monthly: String(monthly),
                      rate: String(rate),
                      years: String(years),
                      result,
                      mode,
                      stepUp: String(su),
                      inflation: String(inflation),
                    })
                  }
                >
                  <Download size={13} /> Report
                </Button>
              </div>
            </div>

            {mode === "goal" && (
              <div
                className={cn(
                  "mt-5 rounded-xl p-4 text-[13.5px] ring-1 ring-inset",
                  end.value >= goal ? "bg-[var(--green-subtle)] ring-[var(--green-border)]" : "bg-[var(--amber-subtle)] ring-[var(--amber-border)]",
                )}
              >
                {end.value >= goal ? (
                  <>
                    On track: you reach {compactInr(goal)} with <span className="num font-medium">{inr(end.value - goal)}</span> to spare.
                  </>
                ) : (
                  <>
                    Short by <span className="num font-medium">{inr(goal - end.value)}</span>. Start at <span className="num font-medium">{inr(need)}</span> a month
                    {su ? `, rising ${su}% a year,` : ""} to reach {compactInr(goal)}.
                  </>
                )}
              </div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-5">
              <div>
                <div className="text-[12px] text-muted-foreground">You put in</div>
                <div className="num mt-1 text-[18px] font-medium tracking-[-0.03em]">{inr(end.invested)}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground">Growth</div>
                <div className="num mt-1 text-[18px] font-medium tracking-[-0.03em] text-[var(--green)]">{inr(gains)}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground">Multiple</div>
                <div className="num mt-1 text-[18px] font-medium tracking-[-0.03em]">{(end.value / Math.max(1, end.invested)).toFixed(2)}×</div>
              </div>
            </div>
            <StackBar
              className="mt-5"
              height={8}
              items={[
                {
                  label: "Invested",
                  value: end.invested,
                  color: "hsl(var(--foreground) / 0.3)",
                },
                {
                  label: "Growth",
                  value: Math.max(0, gains),
                  color: "hsl(var(--brand))",
                },
              ]}
            />

            <div className="mt-8">
              <LineChart
                data={series}
                x="year"
                height={260}
                series={[
                  { key: "value", label: "Value", color: "hsl(var(--brand))" },
                  {
                    key: "invested",
                    label: "Invested",
                    color: "hsl(var(--muted-foreground))",
                    dashed: true,
                  },
                ]}
                formatY={compactInr}
                formatX={(y) => `Year ${y}`}
              />
              <Legend
                className="mt-3"
                items={[
                  { label: "Value", color: "hsl(var(--brand))" },
                  {
                    label: "Invested",
                    color: "hsl(var(--muted-foreground))",
                    dashed: true,
                  },
                ]}
              />
            </div>
            <p className="mb-0 mt-5 text-[12px] leading-relaxed text-muted-foreground">
              Assumes a steady {rate}% a year, compounded monthly. Real markets move unevenly; equity funds have had losing years.
            </p>
          </Card>
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[40rem]">
            <h2 className="text-[20px] font-medium tracking-[-0.025em]">Funds with the best five-year record</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
              Direct growth plans, ranked by five-year annual return within each category. Pick one to see it and use its return in your plan.
            </p>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <Segmented
              size="sm"
              layoutId="sip-cat"
              value={cat}
              onChange={setCat}
              options={["All", ...CATEGORIES.map((c) => c.key)].map((v) => ({
                value: v,
                label: v.replace(" Cap", ""),
              }))}
            />
          </div>
        </div>
        <Card padded={false}>
          {loading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error || !funds.length ? (
            <p className="p-6 text-[13px] text-muted-foreground">{error ?? "No funds available right now."}</p>
          ) : (
            <>
            {/* Phones: name, category and return only; NAV and history are in the sheet opened on tap. */}
            <ul className="m-0 list-none p-0 sm:hidden">
              {shown.map((f) => (
                <li key={`${f.category}-${f.schemeCode}`} className="border-b border-[var(--hairline)] last:border-0">
                  <button type="button" onClick={() => setFund(f)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-foreground/[0.04]">
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[13.5px] font-medium leading-snug">{f.name}</span>
                      <span className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
                        {f.category}
                        <span aria-hidden="true">·</span>
                        <span className="num font-medium text-[var(--green)]">{f.cagr5y.toFixed(1)}% a year</span>
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-[var(--hairline)] text-left text-[11.5px] text-muted-foreground">
                    <th className="px-6 py-2.5 font-normal">Fund</th>
                    <th className="px-3 py-2.5 font-normal">Category</th>
                    <th className="px-3 py-2.5 text-right font-normal">NAV</th>
                    <th className="px-6 py-2.5 text-right font-normal">5y a year</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((f) => (
                    <tr key={`${f.category}-${f.schemeCode}`} onClick={() => setFund(f)} className="cursor-pointer border-b border-[var(--hairline)] transition-colors last:border-0 hover:bg-foreground/[0.03]">
                      <td className="max-w-[320px] truncate px-6 py-3 font-medium">{f.name}</td>
                      <td className="px-3 py-3">
                        <Badge tone="outline">{f.category}</Badge>
                      </td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">₹{f.latestNav.toFixed(2)}</td>
                      <td className="num px-6 py-3 text-right font-medium text-[var(--green)]">{f.cagr5y.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          <p className="m-0 border-t border-[var(--hairline)] px-6 py-3 text-[12px] text-muted-foreground">
            Source: AMFI via mfapi.in, refreshed daily. Ranking by past return has known survivorship bias; it is a starting point, not a pick.
          </p>
        </Card>
      </section>

      <FundSheet
        fund={fund}
        onClose={() => setFund(null)}
        onUseRate={(r) => {
          setRate(Math.round(r * 2) / 2);
          setFund(null);
          toast(`Using ${(Math.round(r * 2) / 2).toFixed(1)}% a year`);
        }}
      />

      <Dialog
        open={naming !== null}
        onClose={() => setNaming(null)}
        title="Save this scenario"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNaming(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={!naming?.trim()}>
              Save
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input data-autofocus aria-label="Scenario name" value={naming ?? ""} onChange={(e) => setNaming(e.target.value)} maxLength={60} />
        </form>
      </Dialog>

      <Sheet open={showSaved} onClose={() => setShowSaved(false)} title="Saved scenarios" description="Stored in this browser only." width={420}>
        {!saved.length ? (
          <EmptyState title="Nothing saved yet" description="Press Save on a projection to keep it here." />
        ) : (
          <ul className="m-0 list-none p-0">
            {saved.map((c) => (
              <li key={c.id} className="group flex items-center gap-3 border-b border-[var(--hairline)] py-3 last:border-0">
                <button type="button" onClick={() => load(c)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13.5px] font-medium">{c.label}</span>
                  <span className="num block text-[12px] text-muted-foreground">
                    {inr(Number(c.monthly))}/mo · {c.rate}% · {c.years} yrs → {c.result?.maturity ? compactInr(c.result.maturity) : "n/a"}
                  </span>
                </button>
                <Button variant="ghost" size="sm" icon aria-label={`Delete ${c.label}`} onClick={() => remove(c.id)}>
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </AppShell>
  );
}
