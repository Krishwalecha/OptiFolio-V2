import React from "react";
import type { PortfolioGroup } from "@/features/portfolios/types";
import type { RebalanceReport } from "@/services/optimizerService";
import { checkSectors } from "@/features/market/sectors";
import { Button, PALETTE, Sheet, StackBar, Wave, inr } from "@/ui";
import { cn } from "@/lib/utils";

const short = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const signed = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const CompareSheet: React.FC<{
  pair: [PortfolioGroup, PortfolioGroup] | null;
  reports: Record<string, RebalanceReport>;
  checking: Set<string>;
  onCheck: (id: string) => void;
  onClose: () => void;
}> = ({ pair, reports, checking, onCheck, onClose }) => {
  if (!pair) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const [a, b] = new Date(pair[0].date) <= new Date(pair[1].date) ? pair : [pair[1], pair[0]];
  const tickers = [...new Set([...a.stocks, ...b.stocks].map((s) => s.ticker))].sort(
    (x, y) => Math.max(...[a, b].map((g) => g.stocks.find((s) => s.ticker === y)?.allocation ?? 0)) - Math.max(...[a, b].map((g) => g.stocks.find((s) => s.ticker === x)?.allocation ?? 0)),
  );
  const color = new Map(tickers.map((t, i) => [t, PALETTE[i % PALETTE.length]]));
  const side = (g: PortfolioGroup) => {
    const w = Object.fromEntries(g.stocks.map((s) => [s.ticker, s.allocation]));
    const sec = checkSectors(g.stocks.map((s) => s.ticker), w);
    const top = [...g.stocks].sort((x, y) => y.allocation - x.allocation)[0];
    return { w, sec, top, invested: g.stocks.reduce((s, x) => s + x.investedInr, 0), rep: reports[g.sessionId] };
  };
  const L = side(a);
  const R = side(b);
  const both = [
    { g: a, d: L },
    { g: b, d: R },
  ];

  return (
    <Sheet open onClose={onClose} title="Compare portfolios" description={`${short(a.date)} and ${short(b.date)}`} width={760}>
      <div className="grid grid-cols-2 gap-4">
        {both.map(({ g, d }) => (
          <div key={g.sessionId} className="rounded-2xl bg-foreground/[0.03] p-4 ring-1 ring-inset ring-[var(--hairline)]">
            <div className="text-[13px] font-medium">{short(g.date)}</div>
            <StackBar className="mt-3" height={8} items={[...g.stocks].sort((x, y) => y.allocation - x.allocation).map((s) => ({ label: s.ticker, value: s.allocation, color: color.get(s.ticker) }))} />
            <dl className="m-0 mt-4 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Stocks</dt>
                <dd className="num m-0">{g.stocks.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Invested</dt>
                <dd className="num m-0">{d.invested ? inr(d.invested) : "n/a"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Largest holding</dt>
                <dd className="num m-0">
                  {d.top?.ticker} {d.top?.allocation.toFixed(1)}%
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sectors</dt>
                <dd className="num m-0">{d.sec.counts.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Since saved</dt>
                <dd className="m-0">
                  {d.rep ? (
                    <span className={cn("num font-medium", d.rep.total_pnl_pct >= 0 ? "text-[var(--green)]" : "text-[var(--red)]")}>{signed(d.rep.total_pnl_pct)}</span>
                  ) : checking.has(g.sessionId) ? (
                    <Wave size={14} className="text-muted-foreground" />
                  ) : (
                    <Button variant="ghost" size="sm" className="-my-1 h-6 px-2 text-[12px]" onClick={() => onCheck(g.sessionId)}>
                      Check
                    </Button>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-6 text-[13px] font-medium">Weights</div>
      <table className="mt-2 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-left text-[11.5px] text-muted-foreground">
            <th className="py-2 font-normal">Stock</th>
            <th className="py-2 text-right font-normal">{short(a.date)}</th>
            <th className="py-2 text-right font-normal">{short(b.date)}</th>
            <th className="py-2 text-right font-normal">Change</th>
          </tr>
        </thead>
        <tbody>
          {tickers.map((t) => {
            const x = L.w[t] ?? 0;
            const y = R.w[t] ?? 0;
            return (
              <tr key={t} className="border-b border-[var(--hairline)] last:border-0">
                <td className="py-2">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: color.get(t) }} />
                    {t}
                  </span>
                </td>
                <td className="num py-2 text-right">{x ? `${x.toFixed(1)}%` : "–"}</td>
                <td className="num py-2 text-right">{y ? `${y.toFixed(1)}%` : "–"}</td>
                <td className={cn("num py-2 text-right", y - x > 0.05 ? "text-[var(--green)]" : y - x < -0.05 ? "text-[var(--red)]" : "text-muted-foreground")}>{Math.abs(y - x) < 0.05 ? "same" : `${y - x > 0 ? "+" : ""}${(y - x).toFixed(1)} pts`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-6 text-[13px] font-medium">Sector mix</div>
      <div className="mt-2 grid grid-cols-2 gap-4">
        {both.map(({ g, d }) => (
          <ul key={g.sessionId} className="m-0 list-none space-y-1.5 p-0 text-[12.5px]">
            {d.sec.counts.map(([s, v]) => (
              <li key={s} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{s}</span>
                <span className="num">{v.toFixed(1)}%</span>
              </li>
            ))}
            {d.sec.unknown.length > 0 && (
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Unclassified</span>
                <span className="num">{d.sec.unknown.join(", ")}</span>
              </li>
            )}
          </ul>
        ))}
      </div>
    </Sheet>
  );
};

export default CompareSheet;
