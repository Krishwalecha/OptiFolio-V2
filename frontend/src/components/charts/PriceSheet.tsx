import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/features/optimizer/config";
import { LineChart, Segmented, Sheet, Skeleton, Stat, inr } from "@/ui";

interface Point {
  date: string;
  close: number;
  high?: number;
  low?: number;
}

const RANGES = { "3M": 63, "1Y": 252, "3Y": 756, "5Y": 1260 } as const;
type Range = keyof typeof RANGES;
const cache = new Map<string, Point[]>();

const PriceSheet: React.FC<{ ticker: string | null; onClose: () => void; name?: string }> = ({ ticker, onClose, name }) => {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [error, setError] = useState(false);
  const [range, setRange] = useState<Range>("1Y");

  useEffect(() => {
    if (!ticker) return;
    const t = ticker.replace(/\.(NS|BO)$/i, "");
    setError(false);
    if (cache.has(t)) return setPoints(cache.get(t)!);
    setPoints(null);
    let live = true;
    fetch(`${API_BASE}/api/stockHistory/${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const p: Point[] = d.points ?? [];
        cache.set(t, p);
        if (live) setPoints(p);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [ticker]);

  const view = useMemo(() => {
    const s = (points ?? []).slice(-RANGES[range]);
    const step = Math.max(1, Math.floor(s.length / 200));
    return s.filter((_, i) => i % step === 0 || i === s.length - 1);
  }, [points, range]);

  const first = view[0]?.close ?? 0;
  const last = view[view.length - 1]?.close ?? 0;
  const ch = first ? last / first - 1 : 0;
  const hi = view.length ? Math.max(...view.map((p) => p.close)) : 0;
  const lo = view.length ? Math.min(...view.map((p) => p.close)) : 0;

  return (
    <Sheet open={!!ticker} onClose={onClose} title={ticker ?? ""} description={name ?? "NSE · end-of-day prices"} width={560}>
      {error ? (
        <p className="text-[13.5px] text-muted-foreground">Price history is not available for this ticker right now.</p>
      ) : !points ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-[260px] w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="num text-[30px] font-medium leading-none tracking-[-0.04em]">{inr(last, 2)}</div>
              <div className={`num mt-2 text-[13px] ${ch >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                {ch >= 0 ? "+" : ""}
                {(ch * 100).toFixed(2)}% over {range}
              </div>
            </div>
            <Segmented size="sm" value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((r) => ({ value: r, label: r }))} />
          </div>
          <div className="mt-6">
            <LineChart
              key={range}
              data={view as unknown as Record<string, number | string>[]}
              x="date"
              series={[{ key: "close", label: "Close", color: ch >= 0 ? "var(--green)" : "var(--red)" }]}
              height={280}
              formatY={(v) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
              formatX={(d) => new Date(d).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
            />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-5">
            <Stat label={`${range} high`} value={inr(hi, 0)} />
            <Stat label={`${range} low`} value={inr(lo, 0)} />
            <Stat label="From high" value={`${hi ? ((last / hi - 1) * 100).toFixed(1) : "0"}%`} tone={last >= hi ? "up" : "down"} />
          </div>
        </>
      )}
    </Sheet>
  );
};

export default PriceSheet;
