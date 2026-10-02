import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowDownRight, ArrowUpToLine, Check, ChevronDown, Download, Info, Layers, MoveHorizontal, RotateCcw, TrendingUp } from "lucide-react";
import type { OptimizeResult } from "@/services/optimizerService";
import { RISK_PROFILES } from "@/features/optimizer/config";
import { Badge, BarList, Button, Card, CardHeader, LineChart, NumberTicker, PALETTE, Scatter, Segmented, StackBar, Tooltip, buttonClass, inr } from "@/ui";
import { cn } from "@/lib/utils";

const p1 = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const sp = (v: number, d = 1) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(d)}%`;
const month = (s: { predicted_month?: number; predicted_return: number }) => s.predicted_month ?? s.predicted_return / 12;
const ordinal = (n: number) => n + (["th", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th");
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function downloadCsv(r: OptimizeResult) {
  const rows = [["Ticker", "Weight %", "Shares", "Price INR", "Amount INR"], ...r.allocation.map((a) => [a.ticker, a.weight_pct.toFixed(2), a.shares, a.price_inr.toFixed(2), a.invested_inr.toFixed(2)])];
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: `optifolio-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

const Metric: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: "up" | "down" }> = ({ label, value, hint, tone }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
      {label}
      {hint && (
        <Tooltip content={hint}>
          <button type="button" aria-label={`About ${label}`} className="text-muted-foreground/70 hover:text-foreground">
            <Info size={12} />
          </button>
        </Tooltip>
      )}
    </div>
    <div className={cn("num mt-1.5 text-[22px] font-medium leading-none tracking-[-0.03em]", tone === "up" && "text-[var(--green)]", tone === "down" && "text-[var(--red)]")}>{value}</div>
  </div>
);

const Allocation: React.FC<{ r: OptimizeResult }> = ({ r }) => {
  const hi = (r.constraints?.max_weight ?? 1) * 100;
  const lo = (r.constraints?.min_weight ?? 0) * 100;
  const invested = r.allocation.reduce((s, a) => s + a.invested_inr, 0);
  const cash = r.investment - invested;
  const capped = r.allocation.filter((a) => a.weight_pct >= hi - 0.15).length;
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="p-6 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[13px] text-muted-foreground">Invested across {r.allocation.length} stocks</div>
            <div className="num mt-1.5 text-[32px] font-medium leading-none tracking-[-0.04em]">
              <NumberTicker value={invested} format={(v) => inr(v)} />
            </div>
          </div>
          <div className="text-right text-[12.5px] text-muted-foreground">
            <div>
              Cash left <span className="num text-foreground">{inr(cash)}</span>
            </div>
            <div className="mt-0.5">
              {hi >= 99 ? (
                <>
                  Minimum <span className="num text-foreground">{lo.toFixed(0)}%</span> per stock
                </>
              ) : (
                <>
                  Limits <span className="num text-foreground">{lo.toFixed(0)}–{hi.toFixed(0)}%</span> per stock
                </>
              )}
            </div>
          </div>
        </div>
        <StackBar className="mt-5" height={12} items={r.allocation.map((a, i) => ({ label: a.ticker, value: a.weight_pct, color: PALETTE[i % PALETTE.length] }))} />
        {capped > 1 && (
          <p className="mb-0 mt-3 text-[12.5px] leading-relaxed text-muted-foreground">
            {capped} stocks sit at the {hi.toFixed(0)}% limit. The optimizer wanted more in them than your limit allows, so the rest is spread over the others. Raise the maximum in advanced settings to see the unconstrained view.
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px] sm:min-w-[560px]">
          <thead>
            <tr className="border-y border-[var(--hairline)] text-left text-[11.5px] text-muted-foreground">
              <th className="px-4 py-2.5 font-normal sm:px-6">Stock</th>
              <th className="px-3 py-2.5 font-normal">Weight</th>
              <th className="px-3 py-2.5 text-right font-normal">Shares</th>
              <th className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">Price</th>
              <th className="px-4 py-2.5 text-right font-normal sm:px-6">Amount</th>
            </tr>
          </thead>
          <tbody>
            {r.allocation.map((a, i) => {
              const s = r.scores?.[a.ticker];
              const pctl = s?.market_percentile;
              return (
                <tr key={a.ticker} className="border-b border-[var(--hairline)] transition-colors last:border-0 hover:bg-foreground/[0.025]">
                  <td className="px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="font-medium">{a.ticker}</span>
                      {r.core && a.ticker === r.core.ticker && <Badge tone="brand" icon={<Layers />} className="h-5 px-1.5 text-[10.5px]">Nifty 50 core</Badge>}
                      {a.weight_pct >= hi - 0.15 && <Badge tone="outline" icon={<ArrowUpToLine />} className="h-5 px-1.5 text-[10.5px]">at limit</Badge>}
                    </div>
                    {pctl !== undefined && r.model?.ml_active && <div className="mt-0.5 pl-5 text-[11.5px] text-muted-foreground">Model ranks it {ordinal(Math.max(1, Math.round((1 - pctl) * (r.model.universe_size - 1)) + 1))} of {r.model.universe_size}</div>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="num w-12 font-medium">{a.weight_pct.toFixed(1)}%</span>
                      <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-foreground/[0.06] sm:block">
                        <span className="block h-full rounded-full" style={{ width: `${(a.weight_pct / Math.max(1, hi >= 99 ? Math.max(...r.allocation.map((x) => x.weight_pct)) : hi)) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                      </span>
                    </div>
                  </td>
                  <td className="num px-3 py-3 text-right">{a.shares}</td>
                  <td className="num hidden px-3 py-3 text-right text-muted-foreground sm:table-cell">{inr(a.price_inr, 2)}</td>
                  <td className="num px-4 py-3 text-right sm:px-6">{inr(a.invested_inr)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const riskLevel = (vol: number) =>
  vol < 0.14 ? { label: "Low", step: 1, color: "var(--green)" } : vol < 0.2 ? { label: "Moderate", step: 2, color: "var(--amber)" } : { label: "High", step: 3, color: "var(--red)" };

const Tile: React.FC<{ icon: React.ReactNode; label: string; hint?: string; children: React.ReactNode; sub: React.ReactNode }> = ({ icon, label, hint, children, sub }) => (
  <div className="min-w-0 bg-card p-5 sm:p-6">
    <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-foreground/[0.05] text-foreground/80 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      {label}
      {hint && (
        <Tooltip content={hint}>
          <button type="button" aria-label={`About ${label}`} className="text-muted-foreground/70 hover:text-foreground">
            <Info size={12} />
          </button>
        </Tooltip>
      )}
    </div>
    <div className="mt-4">{children}</div>
    <div className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{sub}</div>
  </div>
);

const Highlights: React.FC<{ r: OptimizeResult }> = ({ r }) => {
  const [more, setMore] = useState(false);
  const p = r.performance;
  const invested = r.allocation.reduce((s, a) => s + a.invested_inr, 0) || r.investment;
  const years = Math.round((p.n_days / 252) * 10) / 10;
  const risk = riskLevel(p.annualised_volatility);
  const lo = p.expected_return - p.annualised_volatility;
  const hi = p.expected_return + p.annualised_volatility;
  const a = Math.min(lo, -0.05) - 0.03;
  const b = Math.max(hi, 0.05) + 0.03;
  const x = (v: number) => `${((v - a) / (b - a)) * 100}%`;
  const big = "num text-[30px] font-medium leading-none tracking-[-0.045em]";
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid grid-cols-1 gap-px bg-[var(--hairline)] sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={<TrendingUp />} label="Expected return" hint="Forecast for the next 12 months: market-implied return for each stock, tilted by the model's forecast in proportion to its measured skill. An estimate, not a promise." sub={<>About <span className="num text-foreground">{inr(Math.abs(p.expected_return) * invested)}</span> {p.expected_return >= 0 ? "gain" : "loss"} on {inr(invested)} in 12 months</>}>
          <div className={cn(big, p.expected_return >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
            <NumberTicker value={p.expected_return * 100} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`} />
          </div>
        </Tile>
        <Tile icon={<Activity />} label="Risk level" hint="From forecast volatility, the typical yearly swing. Under 14% is low, 14 to 20% moderate, above 20% high." sub={<>Volatility <span className="num text-foreground">{p1(p.annualised_volatility)}</span> a year</>}>
          <div className="flex items-end justify-between gap-3">
            <div className={big} style={{ color: risk.color }}>
              {risk.label}
            </div>
            <div className="mb-1 flex gap-1" aria-hidden>
              {[1, 2, 3].map((i) => (
                <span key={i} className="h-2 w-5 rounded-full" style={{ background: i <= risk.step ? risk.color : "hsl(var(--foreground) / 0.08)" }} />
              ))}
            </div>
          </div>
        </Tile>
        <Tile icon={<MoveHorizontal />} label="Likely range" hint="Expected return plus or minus one volatility. Roughly two years in three land inside it; the rest land outside, either way." sub="Two years in three, next 12 months">
          <div className="num text-[22px] font-medium leading-[30px] tracking-[-0.03em]">
            <span className={lo >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>{sp(lo)}</span>
            <span className="mx-1.5 text-muted-foreground">to</span>
            <span className={hi >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>{sp(hi)}</span>
          </div>
          <div className="relative mt-3 h-1.5 rounded-full bg-foreground/[0.06]" aria-hidden>
            <span className="absolute inset-y-0 rounded-full bg-brand/35" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />
            <span className="absolute -inset-y-1 w-px bg-foreground/35" style={{ left: x(0) }} />
            <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-card" style={{ left: x(p.expected_return) }} />
          </div>
        </Tile>
        <Tile icon={<ArrowDownRight />} label="Worst fall" hint={`Largest peak-to-trough drop of this exact mix over the past ${years} years. It took ${p.drawdown_duration_d} trading days to recover or is still recovering.`} sub={<>About <span className="num text-foreground">{inr(Math.abs(p.max_drawdown) * invested)}</span> at the bottom, past {years} years</>}>
          <div className={cn(big, "text-[var(--red)]")}>{p1(p.max_drawdown)}</div>
        </Tile>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[var(--hairline)] p-5 sm:grid-cols-4 sm:p-6">
        <Metric label="Sharpe" value={p.sharpe_ratio.toFixed(2)} hint="Expected return above the risk-free rate, per unit of volatility." />
        <Metric label="Past return a year" value={sp(p.annualised_return_hist)} tone={p.annualised_return_hist >= 0 ? "up" : "down"} hint={`What this exact mix returned a year on average over the past ${years} years. Hindsight.`} />
        <Metric label="Beta" value={p.beta ? p.beta.toFixed(2) : "n/a"} hint="Sensitivity to the market. Below 1 means it moved less than the market." />
        <Metric label="Sortino" value={p.sortino_ratio.toFixed(2)} hint="Like Sharpe but only counts downside swings." />
      </div>
      <div className="border-t border-[var(--hairline)] px-5 py-3 sm:px-6">
        <button type="button" onClick={() => setMore((v) => !v)} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground" aria-expanded={more}>
          {more ? "Fewer" : "More"} risk measures <ChevronDown size={13} className={cn("transition-transform", more && "rotate-180")} />
        </button>
        {more && (
          <div className="rise grid grid-cols-2 gap-x-4 gap-y-5 pb-3 pt-4 sm:grid-cols-4">
            <Metric label="Historical volatility" value={p.volatility_hist !== undefined ? p1(p.volatility_hist) : "n/a"} />
            <Metric label="Historical Sharpe" value={p.sharpe_hist !== undefined ? p.sharpe_hist.toFixed(2) : "n/a"} />
            <Metric label="Calmar" value={p.calmar_ratio.toFixed(2)} hint="Yearly return divided by the worst fall." />
            <Metric label="Up days" value={p1(p.hit_rate)} />
            <Metric label="1-day VaR 95%" value={p1(p.var_95, 2)} hint="On 1 day in 20 the loss was at least this large." />
            <Metric label="1-day CVaR 95%" value={p1(p.cvar_95, 2)} hint="Average loss on those worst 1-in-20 days." />
            <Metric label="Tail ratio" value={p.tail_ratio.toFixed(2)} hint="Size of the best days compared with the worst days." />
          </div>
        )}
      </div>
    </Card>
  );
};

const FrontierCard: React.FC<{ r: OptimizeResult }> = ({ r }) => {
  const f = r.frontier;
  if (!f) return null;
  return (
    <Card>
      <CardHeader title="Where this mix sits" description={`Your allocation against ${f.n_simulated.toLocaleString("en-IN")} random mixes of the same stocks within the same limits.`} />
      <Scatter points={f.simulated} highlight={{ point: f.chosen, label: "Yours" }} height={240} formatX={(v) => `${(v * 100).toFixed(0)}%`} formatY={(v) => `${(v * 100).toFixed(0)}%`} xLabel="Volatility" yLabel="Expected return" />
    </Card>
  );
};

const StockModelCard: React.FC<{ r: OptimizeResult }> = ({ r }) => {
  const rows = r.allocation.map((a) => ({ t: a.ticker, w: a.weight_pct, s: r.scores?.[a.ticker] })).filter((x) => x.s);
  if (!rows.length) return null;
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="p-6 pb-4">
        <CardHeader
          className="mb-0"
          title="What the model thinks"
          description="An XGBoost model was trained for each stock on five years of prices and tested on the most recent fifth of that history, which it never saw while training."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px] sm:min-w-[560px]">
          <thead>
            <tr className="border-y border-[var(--hairline)] text-left text-[11.5px] text-muted-foreground">
              <th className="px-4 py-2.5 font-normal sm:px-6">Stock</th>
              <th className="px-3 py-2.5 text-right font-normal">
                <Tooltip content="The model’s forecast for the next 21 trading days, about one month. It is what the model actually predicts; it is not scaled up to a year.">
                  <span className="cursor-help">Next month</span>
                </Tooltip>
              </th>
              <th className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">
                <Tooltip content="Share of test days where the model got the direction right. 50% is a coin flip.">
                  <span className="cursor-help">Direction right</span>
                </Tooltip>
              </th>
              <th className="px-3 py-2.5 text-right font-normal">
                <Tooltip content="Rank correlation between predicted and actual returns on the test period. Above 0 means some skill.">
                  <span className="cursor-help">IC</span>
                </Tooltip>
              </th>
              <th className="px-4 py-2.5 text-right font-normal sm:px-6">
                <Tooltip content="Predicted return times the model’s confidence. The weights follow this score.">
                  <span className="cursor-help">Score</span>
                </Tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, s }) => (
              <tr key={t} className="border-b border-[var(--hairline)] transition-colors last:border-0 hover:bg-foreground/[0.025]">
                <td className="px-4 py-3 font-medium sm:px-6">{t}</td>
                <td className={cn("num px-3 py-3 text-right", month(s!) >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>{sp(month(s!))}</td>
                <td className="num hidden px-3 py-3 text-right sm:table-cell">{p1(s!.dir_accuracy, 0)}</td>
                <td className={cn("num px-3 py-3 text-right", s!.ic > 0 ? "text-foreground" : "text-muted-foreground")}>{s!.ic.toFixed(3)}</td>
                <td className="num px-4 py-3 text-right font-medium sm:px-6">{s!.composite_score.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-0 border-t border-[var(--hairline)] px-6 py-3 text-[12px] leading-relaxed text-muted-foreground">Forecasts come from past price patterns. A well-scored stock can still fall.</p>
    </Card>
  );
};

const ModelCard: React.FC<{ r: OptimizeResult }> = ({ r }) => {
  const m = r.model;
  if (!m) return <StockModelCard r={r} />;
  const alphas = Object.entries(r.scores ?? {})
    .map(([t, s]) => ({ label: t, value: (s.ml_alpha ?? 0) * 100, display: sp(s.ml_alpha ?? 0) }))
    .sort((a, b) => b.value - a.value);
  return (
    <Card>
      <CardHeader title="The return model" description={`Trained on ${m.universe_size} large NSE stocks, predicting which will outperform over the next ${Math.round(m.horizon_days / 21)} month. Data as of ${fmtDate(m.as_of)}.`} action={m.ml_active ? <Badge tone="up" dot>In use</Badge> : <Badge>Switched off</Badge>} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Rank correlation" value={m.oos_ic.toFixed(3)} hint="Out-of-sample information coefficient: how well predicted ranks matched realised ranks. 0 is a coin flip; above 0.05 is useful in practice." />
        <Metric label="t-statistic" value={m.oos_ic_tstat.toFixed(2)} hint="Above about 2 means the skill is unlikely to be luck." />
        <Metric label="Right months" value={p1(m.oos_spread_hit_rate, 0)} hint="Share of months where the model's top half beat its bottom half." />
        <Metric label="Months tested" value={m.oos_months} />
      </div>
      <p className="mb-0 mt-5 text-[13px] leading-relaxed text-muted-foreground">
        {m.ml_active
          ? `The edge is real but small, so forecasts only nudge weights: the measured correlation is halved to ${(m.ic_used ?? m.oos_ic / 2).toFixed(3)} before use, and each stock's tilt is capped at ±10% a year.`
          : "The model has not shown reliable skill recently, so weights come from risk and market-implied returns alone."}
      </p>
      {m.ml_active && alphas.length > 0 && (
        <div className="mt-5 border-t border-[var(--hairline)] pt-5">
          <div className="mb-3 text-[12px] text-muted-foreground">Model tilt on expected return, per year. Weights also depend on how each stock moves with the others, so a stock with a negative tilt can still get a large weight if it steadies the mix.</div>
          <BarList items={alphas} signed />
        </div>
      )}
    </Card>
  );
};

const PriceCard: React.FC<{ r: OptimizeResult }> = ({ r }) => {
  const tickers = r.allocation.map((a) => a.ticker).filter((t) => r.chart_data?.[t]?.length);
  const [sel, setSel] = useState(tickers[0]);
  const [range, setRange] = useState<"1Y" | "3Y" | "5Y">("1Y");
  const data = useMemo(() => {
    const d = r.chart_data?.[sel] ?? [];
    const n = { "1Y": 252, "3Y": 756, "5Y": 1260 }[range];
    const slice = d.slice(-n);
    const step = Math.max(1, Math.floor(slice.length / 180));
    return slice.filter((_, i) => i % step === 0 || i === slice.length - 1).map((p) => ({ date: p.date, close: p.close }));
  }, [r.chart_data, sel, range]);
  if (!tickers.length) return null;
  const ch = data.length > 1 ? data[data.length - 1].close / data[0].close - 1 : 0;
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-medium">Price history</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num text-[22px] font-medium tracking-[-0.03em]">{data.length ? inr(data[data.length - 1].close, 2) : ""}</span>
            <span className={cn("num text-[13px]", ch >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>
              {sp(ch)} in {range}
            </span>
          </div>
        </div>
        <Segmented size="sm" value={range} onChange={setRange} options={(["1Y", "3Y", "5Y"] as const).map((v) => ({ value: v, label: v }))} />
      </div>
      <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1">
        {tickers.map((t) => (
          <button key={t} type="button" onClick={() => setSel(t)} className={cn("h-8 shrink-0 rounded-lg px-3 text-[12.5px] transition-colors", t === sel ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>
      <LineChart
        key={sel + range}
        data={data}
        x="date"
        series={[{ key: "close", label: sel, color: ch >= 0 ? "var(--green)" : "var(--red)" }]}
        height={240}
        formatY={(v) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
        formatX={(d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
      />
    </Card>
  );
};

const Results: React.FC<{ result: OptimizeResult; onSave?: () => void; saveLabel?: string; isSaving?: boolean; saved?: boolean; onReset?: () => void }> = ({ result: r, onSave, saveLabel, isSaving, saved, onReset }) => {
  const prof = RISK_PROFILES.find((p) => p.value === r.risk_profile);
  return (
    <section aria-label="Optimization result" className="stagger space-y-4">
      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[22px] font-medium tracking-[-0.03em]">Your allocation</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {prof?.label} · {prof?.strategy}
            {r.elapsed_ms ? ` · computed in ${(r.elapsed_ms / 1000).toFixed(1)}s` : ""}
            {r.cached ? " · from today’s cache" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw size={13} /> Edit inputs
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => downloadCsv(r)}>
            <Download size={13} /> CSV
          </Button>
          {onSave &&
            (saved ? (
              <Link to="/Portfolios" className={buttonClass("secondary", "sm")}>
                <Check size={13} className="text-[var(--green)]" /> Saved, view portfolios
              </Link>
            ) : (
              <Button variant="primary" size="sm" onClick={onSave} loading={isSaving}>
                {saveLabel ?? "Save portfolio"}
              </Button>
            ))}
        </div>
      </div>

      <Highlights r={r} />
      <Allocation r={r} />
      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <FrontierCard r={r} />
        <PriceCard r={r} />
      </div>
      <ModelCard r={r} />

      {r.dropped_stocks.length > 0 && (
        <Card>
          <CardHeader title="Left out" description="These were in your list but are not in the allocation." />
          <ul className="m-0 list-none p-0">
            {r.dropped_stocks.map((d) => (
              <li key={d.ticker} className="flex flex-col gap-1 border-t border-[var(--hairline)] py-3 sm:flex-row sm:gap-6">
                <span className="w-28 shrink-0 text-[13.5px] font-medium">{d.ticker}</span>
                <span className="text-[13px] leading-relaxed text-muted-foreground">{d.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Educational tool, not investment advice. Past performance and model forecasts do not guarantee future returns. Prices are end-of-day from Yahoo Finance.
      </p>
    </section>
  );
};

export default Results;
