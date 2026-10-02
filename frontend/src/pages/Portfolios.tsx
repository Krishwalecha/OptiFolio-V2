import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, CircleCheck, Columns2, Download, MoreHorizontal, RefreshCw, Scale, Trash2, Wand2, X } from "lucide-react";
import CompareSheet from "@/components/portfolios/CompareSheet";
import AppShell from "@/components/app/AppShell";
import PriceSheet from "@/components/charts/PriceSheet";
import { useAuth } from "@/context/AuthContext";
import type { PortfolioGroup, PortfolioStock } from "@/features/portfolios/types";
import { exportCSV, reOptimize } from "@/features/portfolios/config";
import { checkRebalance, type RebalanceReport } from "@/services/optimizerService";
import { api } from "@/lib/api";
import { Badge, Button, Card, ConfirmDialog, EmptyState, LineChart, Menu, PALETTE, Skeleton, StackBar, Wave, buttonClass, inr, toast } from "@/ui";
import { cn } from "@/lib/utils";

const signed = (v: number, d = 1, unit = "%") => `${v >= 0 ? "+" : ""}${v.toFixed(d)}${unit}`;
const longDate = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

type Pending = { kind: "stock"; stock: PortfolioStock } | { kind: "session"; id: string; count: number } | null;

const PortfolioCard: React.FC<{
  group: PortfolioGroup;
  open: boolean;
  onToggle: () => void;
  onRemoveStock: (s: PortfolioStock) => void;
  onRemoveSession: () => void;
  onChart: (t: string) => void;
  report: RebalanceReport | null;
  checking: boolean;
  onCheck: () => Promise<void>;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
}> = ({ group, open, onToggle, onRemoveStock, onRemoveSession, onChart, report, checking, onCheck, selecting, selected, onSelect }) => {
  const [err, setErr] = useState<string | null>(null);
  const stocks = [...group.stocks].sort((a, b) => b.allocation - a.allocation);
  const invested = stocks.reduce((s, x) => s + x.investedInr, 0);
  const byTicker = new Map(report?.holdings.map((h) => [h.ticker, h]));

  const check = async () => {
    setErr(null);
    try {
      await onCheck();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not price this portfolio.");
    }
  };

  const trades = report?.holdings.filter((h) => !h.error && h.trade_shares !== 0) ?? [];

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center gap-3 p-5 pr-3">
          {selecting && (
            <button
              type="button"
              onClick={onSelect}
              role="checkbox"
              aria-checked={selected}
              aria-label="Select for comparison"
              className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md ring-1 ring-inset transition-colors", selected ? "bg-brand text-white ring-brand" : "ring-foreground/25 hover:ring-foreground/50")}
            >
              {selected && <Check size={13} strokeWidth={3} />}
            </button>
          )}
          <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform duration-200", !open && "-rotate-90")} />
            <span className="min-w-0">
              <span className="block text-[14.5px] font-medium tracking-[-0.015em]">{longDate(group.date)}</span>
              <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                {stocks.length} stocks{invested ? ` · ${inr(invested)} invested` : ""}
              </span>
            </span>
          </button>
          {report && (report.needs_rebalance ? <Badge tone="warn" icon={<AlertTriangle />}>Drifted</Badge> : <Badge tone="up" icon={<CircleCheck />}>On track</Badge>)}
          <div className="hidden w-40 sm:block">
            <StackBar height={6} items={stocks.map((s, i) => ({ label: s.ticker, value: s.allocation, color: PALETTE[i % PALETTE.length] }))} />
          </div>
          <Menu
            items={[
              { label: "Re-optimize these stocks", icon: <RefreshCw size={14} />, onSelect: () => reOptimize(stocks.map((s) => s.ticker)) },
              { label: "Delete portfolio", icon: <Trash2 size={14} />, danger: true, onSelect: onRemoveSession },
            ]}
            trigger={(p) => (
              <Button variant="ghost" size="sm" icon aria-label="Portfolio actions" {...p}>
                <MoreHorizontal size={16} />
              </Button>
            )}
          />
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
              <div className="border-t border-[var(--hairline)]">
                {report && (
                  <div className="grid grid-cols-2 gap-4 border-b border-[var(--hairline)] p-5 sm:grid-cols-4">
                    <div>
                      <div className="text-[12px] text-muted-foreground">Value today</div>
                      <div className="num mt-1 text-[20px] font-medium tracking-[-0.03em]">{inr(report.total_value)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-muted-foreground">Return</div>
                      <div className={cn("num mt-1 text-[20px] font-medium tracking-[-0.03em]", report.total_pnl_pct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>{signed(report.total_pnl_pct, 2)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-muted-foreground">Invested</div>
                      <div className="num mt-1 text-[20px] font-medium tracking-[-0.03em]">{inr(report.total_invested)}</div>
                    </div>
                    <div>
                      <div className="text-[12px] text-muted-foreground">Largest drift</div>
                      <div className={cn("num mt-1 text-[20px] font-medium tracking-[-0.03em]", report.needs_rebalance && "text-[var(--amber)]")}>{report.max_drift_pp.toFixed(1)} pts</div>
                    </div>
                  </div>
                )}
                {report && (report.curve?.length ?? 0) > 1 && (
                  <div className="rise border-b border-[var(--hairline)] px-5 py-5">
                    <div className="mb-3 text-[13px] font-medium">Since you saved it</div>
                    <LineChart
                      data={report.curve!}
                      x="date"
                      height={200}
                      baseline={0}
                      series={[{ key: "portfolio", label: "This portfolio", color: "hsl(var(--brand))" }]}
                      formatY={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
                      formatX={(d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    />
                  </div>
                )}
                {report && (report.curve?.length ?? 0) <= 1 && (
                  <p className="m-0 border-b border-[var(--hairline)] px-5 py-3 text-[12.5px] text-muted-foreground">Saved today, so there is no price history to chart yet.</p>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13.5px] sm:min-w-[520px]">
                    <thead>
                      <tr className="border-b border-[var(--hairline)] text-left text-[11.5px] text-muted-foreground">
                        <th className="px-4 py-2.5 font-normal sm:px-5">Stock</th>
                        <th className="px-3 py-2.5 text-right font-normal">Target</th>
                        {report && <th className="px-3 py-2.5 text-right font-normal">Now</th>}
                        <th className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">Invested</th>
                        {report && <th className="px-3 py-2.5 text-right font-normal">Return</th>}
                        {report && <th className="hidden px-3 py-2.5 text-right font-normal sm:table-cell">To rebalance</th>}
                        <th className="w-10 px-2 py-2.5 sm:w-12 sm:px-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((s, i) => {
                        const h = byTicker.get(s.ticker);
                        const drifted = h && !h.error && Math.abs(h.drift_pp) >= (report?.threshold_pp ?? 5);
                        return (
                          <tr key={s.ticker} className="group border-b border-[var(--hairline)] last:border-0">
                            <td className="px-4 py-2.5 sm:px-5">
                              <button type="button" onClick={() => onChart(s.ticker)} className="flex items-center gap-2.5 font-medium hover:text-brand">
                                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: PALETTE[i % PALETTE.length] }} />
                                {s.ticker}
                              </button>
                            </td>
                            <td className="num px-3 py-2.5 text-right">{s.allocation.toFixed(1)}%</td>
                            {report && <td className={cn("num px-3 py-2.5 text-right", drifted && "text-[var(--amber)]")}>{h && !h.error ? `${h.current_pct.toFixed(1)}%` : "n/a"}</td>}
                            <td className="num hidden px-3 py-2.5 text-right text-muted-foreground sm:table-cell">{s.investedInr ? inr(s.investedInr) : "n/a"}</td>
                            {report && <td className={cn("num px-3 py-2.5 text-right", h && !h.error && (h.pnl_pct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"))}>{h && !h.error ? signed(h.pnl_pct) : "n/a"}</td>}
                            {report && <td className="num hidden px-3 py-2.5 text-right text-muted-foreground sm:table-cell">{h && !h.error && h.trade_shares ? `${h.trade_shares > 0 ? "Buy" : "Sell"} ${Math.abs(h.trade_shares)}` : "Hold"}</td>}
                            <td className="px-2 py-2.5 text-right sm:px-3">
                              <button type="button" aria-label={`Remove ${s.ticker}`} onClick={() => onRemoveStock(s)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-opacity hover:bg-[var(--red-subtle)] hover:text-[var(--red)] focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0">
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--hairline)] px-5 py-4">
                  {!report ? (
                    <Button variant="secondary" size="sm" onClick={check} disabled={checking}>
                      {checking ? <Wave size={14} /> : <Scale size={13} />}
                      {checking ? "Pricing at last close" : "Check performance and drift"}
                    </Button>
                  ) : (
                    <>
                      <span className="text-[12.5px] text-muted-foreground">
                        {report.needs_rebalance ? `${trades.length} trades bring it back to target.` : `Every holding is within ${report.threshold_pp} points of its target.`} {report.note}
                      </span>
                      <Button variant="ghost" size="sm" onClick={check} loading={checking} className="ml-auto">
                        Refresh
                      </Button>
                    </>
                  )}
                  {err && <span className="text-[12.5px] text-[var(--red)]">{err}</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

const Portfolios: React.FC = () => {
  const { isLoggedIn, userId } = useAuth();
  const [groups, setGroups] = useState<PortfolioGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [chart, setChart] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, RebalanceReport>>({});
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  const runCheck = useCallback(async (id: string) => {
    setChecking((c) => new Set(c).add(id));
    try {
      const rep = await checkRebalance(id);
      setReports((r) => ({ ...r, [id]: rep }));
    } finally {
      setChecking((c) => {
        const n = new Set(c);
        n.delete(id);
        return n;
      });
    }
  }, []);

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)));
  const pair = comparing && groups && picked.length === 2 ? ([groups.find((g) => g.sessionId === picked[0])!, groups.find((g) => g.sessionId === picked[1])!] as [PortfolioGroup, PortfolioGroup]) : null;

  const load = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      const res = await api(`/api/userPortfolios/${userId}`);
      if (!res.ok) throw new Error();
      const { portfolioGroups: raw } = await res.json();
      const loaded: PortfolioGroup[] = (raw ?? [])
        .map((g: { date: string; sessionId?: string; tickers?: Array<string | { ticker: string; allocation: string | number; invested_inr: string | number }> }) => {
          const sessionId = g.sessionId || g.date;
          const stocks: PortfolioStock[] = (g.tickers || []).map((it) => {
            const ticker = typeof it === "string" ? it : it.ticker;
            return {
              ticker,
              dbTicker: ticker,
              allocation: typeof it === "string" ? 0 : Number(it.allocation) || 0,
              investedInr: typeof it === "string" ? 0 : Number(it.invested_inr) || 0,
              sessionId,
            };
          });
          if (stocks.length && !stocks.some((s) => s.allocation)) stocks.forEach((s) => (s.allocation = 100 / stocks.length));
          return { date: g.date, sessionId, stocks };
        })
        .filter((g: PortfolioGroup) => g.stocks.length);
      setGroups(loaded);
      if (loaded[0]) setOpenIds((s) => (s.size ? s : new Set([loaded[0].sessionId])));
    } catch {
      setError("Could not load your portfolios.");
      setGroups([]);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async () => {
    if (!pending || !userId) return;
    setBusy(true);
    try {
      if (pending.kind === "stock") {
        const s = pending.stock;
        const res = await api("/api/deletePortfolio", { method: "POST", body: JSON.stringify({ ticker: s.dbTicker, userId, sessionId: s.sessionId }) });
        if (!res.ok) throw new Error();
        setGroups((prev) => (prev ?? []).map((g) => ({ ...g, stocks: g.stocks.filter((x) => !(x.dbTicker === s.dbTicker && x.sessionId === s.sessionId)) })).filter((g) => g.stocks.length));
        toast(`${s.ticker} removed`);
      } else {
        const res = await api("/api/deleteSession", { method: "POST", body: JSON.stringify({ userId, sessionId: pending.id }) });
        if (!res.ok) throw new Error();
        setGroups((prev) => (prev ?? []).filter((g) => g.sessionId !== pending.id));
        toast("Portfolio deleted");
      }
    } catch {
      toast.error("Delete failed", { description: "Nothing was changed. Try again." });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const toggle = (id: string) =>
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const holdings = (groups ?? []).reduce((s, g) => s + g.stocks.length, 0);

  return (
    <AppShell
      title="Portfolios"
      description={isLoggedIn && groups?.length ? `${groups.length} saved · ${holdings} holdings. Open one to price it at the last close and see what drifted.` : "Saved optimizations, priced on demand."}
      actions={
        isLoggedIn && (
          <>
            {(groups?.length ?? 0) >= 2 && (
              <Button
                variant={selecting ? "secondary" : "ghost"}
                onClick={() => {
                  setSelecting((v) => !v);
                  setPicked([]);
                }}
              >
                <Columns2 size={14} /> {selecting ? "Cancel" : "Compare"}
              </Button>
            )}
            {!!groups?.length && (
              <Button variant="ghost" onClick={() => exportCSV(groups)}>
                <Download size={14} /> Export
              </Button>
            )}
            <Link to="/Optimizer" className={buttonClass("primary", "md")}>
              <Wand2 size={14} /> New optimization
            </Link>
          </>
        )
      }
    >
      {!isLoggedIn ? (
        <EmptyState
          title="Sign in to see your portfolios"
          description="Portfolios you save from the optimizer are kept here with their target weights."
          action={
            <Link to="/SignIn" className={buttonClass("primary", "md")}>
              Sign in
            </Link>
          }
        />
      ) : groups === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex items-center gap-4">
              <div className="flex-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-2 h-3 w-28" />
              </div>
              <Skeleton className="h-1.5 w-40" />
            </Card>
          ))}
        </div>
      ) : error ? (
        <EmptyState title={error} description="Check your connection and try again." action={<Button onClick={load}>Retry</Button>} />
      ) : !groups.length ? (
        <EmptyState
          title="No saved portfolios"
          description="Run the optimizer and press Save. Each saved run shows up here and on your overview."
          action={
            <Link to="/Optimizer" className={buttonClass("primary", "md")}>
              Start an optimization
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {groups.map((g) => (
              <PortfolioCard
                key={g.sessionId}
                group={g}
                open={openIds.has(g.sessionId)}
                onToggle={() => toggle(g.sessionId)}
                onRemoveStock={(stock) => setPending({ kind: "stock", stock })}
                onRemoveSession={() => setPending({ kind: "session", id: g.sessionId, count: g.stocks.length })}
                onChart={setChart}
                report={reports[g.sessionId] ?? null}
                checking={checking.has(g.sessionId)}
                onCheck={() => runCheck(g.sessionId)}
                selecting={selecting}
                selected={picked.includes(g.sessionId)}
                onSelect={() => togglePick(g.sessionId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={confirm}
        loading={busy}
        danger
        title={pending?.kind === "stock" ? `Remove ${pending.stock.ticker}?` : "Delete this portfolio?"}
        description={pending?.kind === "stock" ? "The holding is removed from this saved portfolio. This cannot be undone." : `All ${pending?.kind === "session" ? pending.count : 0} holdings in it are removed. This cannot be undone.`}
        confirmLabel={pending?.kind === "stock" ? "Remove" : "Delete"}
      />
      <PriceSheet ticker={chart} onClose={() => setChart(null)} />
      <CompareSheet pair={pair} reports={reports} checking={checking} onCheck={(id) => runCheck(id).catch(() => toast.error("Could not price that portfolio"))} onClose={() => setComparing(false)} />
      <AnimatePresence>
        {selecting && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-[240px]">
            <div className="flex items-center gap-3 rounded-2xl bg-popover p-2 pl-4 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-[var(--hairline)]">
              <span className="text-[13px]">{picked.length === 2 ? "Two portfolios selected" : `Select ${2 - picked.length} more to compare`}</span>
              <Button variant="primary" size="sm" disabled={picked.length !== 2} onClick={() => setComparing(true)}>
                Compare
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
};

export default Portfolios;
