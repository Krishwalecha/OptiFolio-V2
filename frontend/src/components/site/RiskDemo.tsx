import React, { useState } from "react";
import { motion } from "framer-motion";
import demo from "@/features/market/landing-demo.json";
import { NumberTicker, PALETTE, Segmented } from "@/ui";

type Profile = "conservative" | "balanced" | "aggressive";
const LABEL: Record<Profile, string> = { conservative: "Conservative", balanced: "Balanced", aggressive: "Aggressive" };
const STRATEGY: Record<Profile, string> = { conservative: "Low volatility + model score", balanced: "Model score weighted", aggressive: "Expected return weighted" };
const runDate = new Date(demo.as_of).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const colorOf = Object.fromEntries(demo.stocks.map((t, i) => [t, PALETTE[i % PALETTE.length]]));

const Metric: React.FC<{ label: string; value: number; suffix?: string; decimals?: number; tone?: string; note?: string }> = ({ label, value, suffix = "", decimals = 1, tone, note }) => (
  <div className="border-t border-[var(--hairline)] pt-4">
    <div className="text-[12.5px] text-muted-foreground">{label}</div>
    <div className="num mt-2 text-[clamp(1.9rem,3.2vw,2.5rem)] font-medium leading-none tracking-[-0.045em]" style={{ color: tone }}>
      <NumberTicker value={value} duration={600} format={(v) => `${v.toFixed(decimals)}${suffix}`} />
    </div>
    {note && <div className="mt-1.5 text-[11.5px] text-muted-foreground">{note}</div>}
  </div>
);

const RiskDemo: React.FC = () => {
  const [p, setP] = useState<Profile>("balanced");
  const d = demo.profiles[p];

  return (
    <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-inset ring-[var(--hairline)]">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="border-b border-[var(--hairline)] p-6 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={p}
              onChange={setP}
              layoutId="risk-demo"
              options={(Object.keys(LABEL) as Profile[]).map((k) => ({ value: k, label: LABEL[k] }))}
            />
            <span className="text-[12px] text-muted-foreground">Real run · {runDate}</span>
          </div>

          <div className="mt-8 flex h-3.5 gap-[2px] overflow-hidden rounded-full">
            {demo.stocks.map((t) => {
              const w = d.alloc.find((a) => a[0] === t)?.[1] ?? 0;
              return <motion.span key={t} animate={{ flexGrow: Number(w) }} initial={false} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="h-full basis-0" style={{ background: colorOf[t] }} />;
            })}
          </div>

          <ul className="m-0 mt-6 grid list-none gap-x-8 gap-y-2.5 p-0 sm:grid-cols-2">
            {d.alloc.map(([t, w]) => (
              <motion.li layout key={t as string} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-2.5 text-[13.5px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: colorOf[t as string] }} />
                <span className="font-medium">{t}</span>
                <span className="mx-1 h-px flex-1 bg-[var(--hairline)]" />
                <span className="num tabular-nums">{Number(w).toFixed(1)}%</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col p-6 sm:p-10">
          <div className="text-[12.5px] text-muted-foreground">Strategy</div>
          <div className="mt-1 text-[20px] font-medium tracking-[-0.03em]">{STRATEGY[p]}</div>
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-7">
            <Metric label="Expected return" value={d.ret} suffix="%" tone="var(--green)" note="forecast, a year" />
            <Metric label="Volatility" value={d.vol} suffix="%" note="forecast, a year" />
            <Metric label="Sharpe" value={d.sharpe} decimals={2} tone="hsl(var(--brand))" note="return per unit of risk" />
            <Metric label="Worst fall" value={d.dd} suffix="%" tone="var(--red)" note="this mix, past 5 years" />
          </div>
          <p className="mb-0 mt-auto pt-8 text-[12px] leading-relaxed text-muted-foreground">Eight large caps, ₹10 lakh. Returns are estimates, not promises; the worst fall is what this exact mix actually went through.</p>
        </div>
      </div>
    </div>
  );
};

export default RiskDemo;
