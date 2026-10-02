import React, { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const PALETTE = ["hsl(var(--brand))", "#8b93a7", "#d4a24c", "#4fb3a9", "#c46b8a", "#7f8cff", "#a3a3a3", "#e07a5f", "#6aa84f", "#b58ee0", "#5da9e9", "#c9b458", "#e8a0bf", "#79c2a8", "#9e9e9e"];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(min: number, max: number, count = 4) {
  if (!isFinite(min) || !isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

export interface Series {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

export const LineChart: React.FC<{
  data: Record<string, number | string | null>[];
  x: string;
  series: Series[];
  height?: number;
  area?: boolean;
  formatY?: (v: number) => string;
  formatX?: (v: string) => string;
  baseline?: number;
  className?: string;
  yTicks?: number;
  showAxis?: boolean;
}> = ({ data, x, series, height = 260, area = true, formatY = (v) => v.toLocaleString("en-IN"), formatX = (v) => v, baseline, className, yTicks = 4, showAxis = true }) => {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const padL = showAxis ? 52 : 0;
  const padR = 8;
  const padT = 10;
  const padB = showAxis ? 26 : 4;
  const iw = Math.max(0, w - padL - padR);
  const ih = height - padT - padB;

  const { lo, hi, ticks } = useMemo(() => {
    const vals = data.flatMap((d) => series.map((s) => d[s.key])).filter((v): v is number => typeof v === "number" && isFinite(v));
    if (baseline !== undefined) vals.push(baseline);
    let a = Math.min(...vals);
    let b = Math.max(...vals);
    const pad = (b - a || Math.abs(a) || 1) * 0.08;
    a -= pad;
    b += pad;
    return { lo: a, hi: b, ticks: niceTicks(a, b, yTicks) };
  }, [data, series, baseline, yTicks]);

  const n = data.length;
  const X = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const Y = (v: number) => padT + ih - ((v - lo) / (hi - lo || 1)) * ih;

  const lines = series.map((s, si) => {
    const pts: [number, number][] = [];
    data.forEach((d, i) => typeof d[s.key] === "number" && pts.push([X(i), Y(d[s.key] as number)]));
    return { s, color: s.color ?? PALETTE[si % PALETTE.length], pts };
  });

  const xTicks = useMemo(() => {
    if (n < 2) return [];
    const k = Math.max(2, Math.min(6, Math.floor(iw / 110)));
    return Array.from({ length: k }, (_, j) => Math.round((j / (k - 1)) * (n - 1)));
  }, [n, iw]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left - padL;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / (iw || 1)) * (n - 1)))));
  };

  const hd = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? X(hover) : 0;

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)} style={{ height }}>
      {w > 0 && n > 0 && (
        <svg width={w} height={height} className="block overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.label).join(", ")}>
          <defs>
            {lines.map((l, i) => (
              <linearGradient key={i} id={`${gid}-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={l.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={l.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showAxis &&
            ticks.map((t) => (
              <g key={t}>
                <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="var(--hairline)" />
                <text x={padL - 10} y={Y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground num text-[10.5px]">
                  {formatY(t)}
                </text>
              </g>
            ))}
          {baseline !== undefined && <line x1={padL} x2={w - padR} y1={Y(baseline)} y2={Y(baseline)} stroke="hsl(var(--foreground) / 0.25)" strokeDasharray="3 4" />}
          {showAxis &&
            xTicks.map((i, j) => (
              <text key={i} x={X(i)} y={height - 6} textAnchor={j === 0 ? "start" : j === xTicks.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10.5px]">
                {formatX(String(data[i][x]))}
              </text>
            ))}
          {area && lines[0]?.pts.length > 1 && <path d={`${path(lines[0].pts)}L${lines[0].pts[lines[0].pts.length - 1][0]},${padT + ih}L${lines[0].pts[0][0]},${padT + ih}Z`} fill={`url(#${gid}-0)`} />}
          {lines.map((l, i) => (
            <path key={l.s.key} d={path(l.pts)} fill="none" stroke={l.color} strokeWidth={i === 0 ? 1.75 : 1.4} strokeDasharray={l.s.dashed ? "4 4" : undefined} strokeLinejoin="round" strokeLinecap="round" className="chart-draw" />
          ))}
          {hover !== null && (
            <g>
              <line x1={tipLeft} x2={tipLeft} y1={padT} y2={padT + ih} stroke="hsl(var(--foreground) / 0.2)" />
              {lines.map((l) => {
                const v = data[hover][l.s.key];
                return typeof v === "number" ? <circle key={l.s.key} cx={tipLeft} cy={Y(v)} r={3.5} fill="hsl(var(--card))" stroke={l.color} strokeWidth={2} /> : null;
              })}
            </g>
          )}
        </svg>
      )}
      {hd && (
        <div
          className="pointer-events-none absolute top-1 z-10 min-w-[150px] rounded-xl bg-popover px-3 py-2.5 text-[12px] shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[var(--hairline)]"
          style={{ left: tipLeft > w / 2 ? tipLeft - 12 : tipLeft + 12, transform: tipLeft > w / 2 ? "translateX(-100%)" : undefined }}
        >
          <div className="mb-1.5 text-muted-foreground">{formatX(String(hd[x]))}</div>
          {lines.map((l) =>
            typeof hd[l.s.key] === "number" ? (
              <div key={l.s.key} className="flex items-center justify-between gap-4 py-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  {l.s.label}
                </span>
                <span className="num font-medium">{formatY(hd[l.s.key] as number)}</span>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
};

export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number; color?: string; className?: string }> = ({ values, width = 96, height = 28, color, className }) => {
  if (values.length < 2) return <svg width={width} height={height} className={className} />;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - lo) / (hi - lo || 1)) * (height - 4)] as [number, number]);
  const c = color ?? (values[values.length - 1] >= values[0] ? "var(--green)" : "var(--red)");
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <path d={path(pts)} fill="none" stroke={c} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export const Scatter: React.FC<{
  points: [number, number][];
  highlight?: { point: [number, number]; label: string };
  height?: number;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  xLabel?: string;
  yLabel?: string;
}> = ({ points, highlight, height = 260, formatX = String, formatY = String, xLabel, yLabel }) => {
  const [ref, w] = useWidth<HTMLDivElement>();
  const padL = 48;
  const padB = 34;
  const padT = 12;
  const padR = 12;
  const all = highlight ? [...points, highlight.point] : points;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const px = (x1 - x0) * 0.06 || 0.01;
  const py = (y1 - y0) * 0.08 || 0.01;
  const iw = Math.max(0, w - padL - padR);
  const ih = height - padT - padB;
  const X = (v: number) => padL + ((v - (x0 - px)) / (x1 - x0 + 2 * px)) * iw;
  const Y = (v: number) => padT + ih - ((v - (y0 - py)) / (y1 - y0 + 2 * py)) * ih;
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} className="block" role="img" aria-label="Scatter of simulated portfolios">
          {niceTicks(y0 - py, y1 + py, 4).map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - padR} y1={Y(t)} y2={Y(t)} stroke="var(--hairline)" />
              <text x={padL - 10} y={Y(t)} dy="0.32em" textAnchor="end" className="num fill-muted-foreground text-[10.5px]">
                {formatY(t)}
              </text>
            </g>
          ))}
          {niceTicks(x0 - px, x1 + px, 5).map((t) => (
            <text key={t} x={X(t)} y={padT + ih + 16} textAnchor="middle" className="num fill-muted-foreground text-[10.5px]">
              {formatX(t)}
            </text>
          ))}
          {xLabel && (
            <text x={w - padR} y={height - 2} textAnchor="end" className="fill-muted-foreground text-[10.5px]">
              {xLabel}
            </text>
          )}
          {yLabel && (
            <text x={padL} y={padT - 2} className="fill-muted-foreground text-[10.5px]">
              {yLabel}
            </text>
          )}
          {points.map((p, i) => (
            <circle key={i} cx={X(p[0])} cy={Y(p[1])} r={2} fill="hsl(var(--foreground) / 0.22)" />
          ))}
          {highlight && (
            <g>
              <circle cx={X(highlight.point[0])} cy={Y(highlight.point[1])} r={10} fill="hsl(var(--brand) / 0.15)" />
              <circle cx={X(highlight.point[0])} cy={Y(highlight.point[1])} r={4.5} fill="hsl(var(--brand))" stroke="hsl(var(--card))" strokeWidth={2} />
              <text x={X(highlight.point[0]) + 14} y={Y(highlight.point[1])} dy="0.32em" className="fill-foreground text-[11.5px] font-medium">
                {highlight.label}
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
};

export const Donut: React.FC<{ items: { label: string; value: number; color?: string }[]; size?: number; thickness?: number; center?: React.ReactNode }> = ({ items, size = 180, thickness = 18, center }) => {
  const [hover, setHover] = useState<number | null>(null);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const gap = items.length > 1 ? 2 : 0;
  let acc = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label="Allocation">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth={thickness} />
        {items.map((it, i) => {
          const len = (it.value / total) * c;
          const el = (
            <circle
              key={it.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={it.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={hover === i ? thickness + 4 : thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
              strokeDashoffset={-acc}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              style={{ transition: "stroke-width 150ms" }}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        {hover !== null ? (
          <div>
            <div className="text-[12px] text-muted-foreground">{items[hover].label}</div>
            <div className="num text-[20px] font-medium tracking-[-0.03em]">{((items[hover].value / total) * 100).toFixed(1)}%</div>
          </div>
        ) : (
          center
        )}
      </div>
    </div>
  );
};

export const StackBar: React.FC<{ items: { label: string; value: number; color?: string }[]; height?: number; className?: string }> = ({ items, height = 10, className }) => {
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div className={cn("flex w-full gap-[2px] overflow-hidden rounded-full", className)} style={{ height }}>
      {items.map((it, i) => (
        <div key={it.label} title={`${it.label} ${((it.value / total) * 100).toFixed(1)}%`} className="h-full transition-[flex-grow] duration-700 ease-out first:rounded-l-full last:rounded-r-full" style={{ flexGrow: it.value, flexBasis: 0, background: it.color ?? PALETTE[i % PALETTE.length] }} />
      ))}
    </div>
  );
};

export const BarList: React.FC<{ items: { label: React.ReactNode; value: number; display?: string }[]; signed?: boolean; className?: string }> = ({ items, signed, className }) => {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1e-9);
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((it, i) => {
        const pct = (Math.abs(it.value) / max) * (signed ? 50 : 100);
        const neg = it.value < 0;
        return (
          <div key={i} className="grid grid-cols-[minmax(80px,120px)_1fr_64px] items-center gap-3 text-[12.5px]">
            <span className="truncate text-muted-foreground">{it.label}</span>
            <div className="relative h-2 rounded-full bg-foreground/[0.05]">
              {signed && <span className="absolute inset-y-[-3px] left-1/2 w-px bg-foreground/20" />}
              <span
                className="absolute inset-y-0 rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  left: signed ? (neg ? `${50 - pct}%` : "50%") : 0,
                  background: signed ? (neg ? "var(--red)" : "var(--green)") : "hsl(var(--brand))",
                }}
              />
            </div>
            <span className={cn("num text-right font-medium", signed && (neg ? "text-[var(--red)]" : "text-[var(--green)]"))}>{it.display ?? it.value.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
};

export const Legend: React.FC<{ items: { label: string; color: string; dashed?: boolean }[]; className?: string }> = ({ items, className }) => (
  <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground", className)}>
    {items.map((i) => (
      <span key={i.label} className="flex items-center gap-1.5">
        <span className="h-[2px] w-3.5 rounded-full" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 3px, transparent 3px 5px)` : i.color }} />
        {i.label}
      </span>
    ))}
  </div>
);
