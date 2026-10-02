import React, { useEffect, useMemo, useState } from "react";
import type { FundData } from "@/context/MFContext";
import { Badge, Button, LineChart, Segmented, Sheet, Skeleton, Stat } from "@/ui";

type Pt = { date: string; nav: number };
const RANGES = { "1Y": 1, "3Y": 3, "5Y": 5 } as const;
type Range = keyof typeof RANGES;
const cache = new Map<number, Pt[]>();

const iso = (d: string) => {
  const [dd, mm, yy] = d.split("-");
  return `${yy}-${mm}-${dd}`;
};

const FundSheet: React.FC<{ fund: FundData | null; onClose: () => void; onUseRate: (r: number) => void }> = ({ fund, onClose, onUseRate }) => {
  const [hist, setHist] = useState<Pt[] | null>(null);
  const [err, setErr] = useState(false);
  const [range, setRange] = useState<Range>("3Y");

  useEffect(() => {
    if (!fund) return;
    setErr(false);
    if (cache.has(fund.schemeCode)) return setHist(cache.get(fund.schemeCode)!);
    setHist(null);
    let live = true;
    fetch(`https://api.mfapi.in/mf/${fund.schemeCode}`)
      .then((r) => r.json())
      .then((j) => {
        const pts: Pt[] = (j.data as { date: string; nav: string }[]).map((d) => ({ date: iso(d.date), nav: parseFloat(d.nav) })).filter((d) => !isNaN(d.nav)).reverse();
        cache.set(fund.schemeCode, pts);
        if (live) setHist(pts);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
    };
  }, [fund]);

  const view = useMemo(() => {
    if (!hist) return [];
    const cut = new Date();
    cut.setFullYear(cut.getFullYear() - RANGES[range]);
    const s = hist.filter((p) => new Date(p.date) >= cut);
    const step = Math.max(1, Math.floor(s.length / 200));
    return s.filter((_, i) => i % step === 0 || i === s.length - 1);
  }, [hist, range]);

  const ch = view.length > 1 ? view[view.length - 1].nav / view[0].nav - 1 : 0;

  return (
    <Sheet
      open={!!fund}
      onClose={onClose}
      title={fund?.name}
      description={fund ? `${fund.category} · direct growth plan` : undefined}
      width={560}
      footer={
        fund && (
          <Button variant="primary" className="w-full" onClick={() => onUseRate(fund.cagr5y)}>
            Use its {fund.cagr5y.toFixed(1)}% five-year return in the planner
          </Button>
        )
      }
    >
      {fund && (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge tone="outline">{fund.risk} risk</Badge>
            <Badge tone="outline">{fund.horizon} years suggested</Badge>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Stat label="NAV" value={`₹${fund.latestNav.toFixed(2)}`} />
            <Stat label="5-year return" value={`${fund.cagr5y.toFixed(1)}%`} sub="a year" tone="up" />
            <Stat label={`${range} change`} value={`${ch >= 0 ? "+" : ""}${(ch * 100).toFixed(1)}%`} tone={ch >= 0 ? "up" : "down"} />
          </div>
          <div className="mb-4 mt-8 flex justify-end">
            <Segmented size="sm" value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((r) => ({ value: r, label: r }))} />
          </div>
          {err ? (
            <p className="text-[13px] text-muted-foreground">NAV history could not be loaded from AMFI right now.</p>
          ) : !hist ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <LineChart
              key={range}
              data={view}
              x="date"
              series={[{ key: "nav", label: "NAV", color: ch >= 0 ? "var(--green)" : "var(--red)" }]}
              height={260}
              formatY={(v) => `₹${v.toFixed(0)}`}
              formatX={(d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
            />
          )}
          <p className="mt-6 text-[12px] leading-relaxed text-muted-foreground">NAV history from AMFI via mfapi.in. Past returns do not predict future returns.</p>
        </>
      )}
    </Sheet>
  );
};

export default FundSheet;
