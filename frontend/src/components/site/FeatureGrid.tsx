import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import example from "@/features/market/example-run.json";
import { Mark, PALETTE } from "@/ui";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.06, ease } }),
};

const Card: React.FC<{
  to: string;
  title: string;
  body: string;
  className?: string;
  i: number;
  children: React.ReactNode;
}> = ({ to, title, body, className = "", i, children }) => (
  <motion.div
    variants={rise}
    custom={i}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-60px" }}
    className={className}
  >
    <Link
      to={to}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card no-underline transition-colors hover:border-foreground/20"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden border-b p-6" style={{ borderColor: "var(--hairline)" }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 80% at 50% 0%, hsl(var(--brand) / 0.12), transparent 70%)" }}
        />
        <div className="relative w-full">{children}</div>
      </div>
      <div className="flex items-start justify-between gap-4 p-6">
        <div>
          <h3 className="text-[16px] font-medium tracking-[-0.02em] text-foreground">{title}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
        </div>
        <ArrowUpRight size={17} className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </Link>
  </motion.div>
);

const row = "flex items-center justify-between border-b py-2.5 text-[13px] last:border-b-0";

const FeatureGrid: React.FC = () => (
  <div className="grid gap-3 md:grid-cols-6">
    <Card
      i={0}
      to="/Optimizer"
      title="Optimizer"
      body="An XGBoost model per stock, scored by how accurate it was in testing, turned into weights for your risk profile. Numbers below are from a real run."
      className="md:col-span-4"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-3 gap-2">
        {[
          ["Expected return", `+${(example.performance.expected_return * 100).toFixed(1)}%`, "var(--green)"],
          ["Volatility", `${(example.performance.annualised_volatility * 100).toFixed(1)}%`, "hsl(var(--foreground))"],
          ["Sharpe", example.performance.sharpe_ratio.toFixed(2), "hsl(var(--brand))"],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-xl border bg-background/60 p-3.5" style={{ borderColor: "var(--hairline)" }}>
            <div className="text-[11.5px] text-muted-foreground">{k}</div>
            <div className="num mt-2 text-[26px] font-medium tracking-[-0.04em]" style={{ color: c }}>
              {v}
            </div>
          </div>
        ))}
        <div className="col-span-3 mt-1 flex h-2 overflow-hidden rounded-full">
          {example.allocation.map((a, i) => (
            <span key={a.ticker} className="border-r-2 border-card last:border-r-0" style={{ width: `${a.weight_pct}%`, background: PALETTE[i] }} />
          ))}
        </div>
      </div>
    </Card>

    <Card
      i={1}
      to="/Optimizer"
      title="Deep analysis"
      body="Bayesian tuning of every stock’s model before training, when you want the extra care."
      className="md:col-span-2"
    >
      <div className="mx-auto max-w-[240px] space-y-2">
        {[
          ["Tuning trials per stock · 60", 100],
          ["Features per stock · 40+", 100],
          ["Hold-out test · last 20%", 20],
        ].map(([k, w]) => (
          <div key={k as string}>
            <div className="mb-1 flex justify-between text-[11.5px] text-muted-foreground">
              <span>{k}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-brand" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>

    <Card i={2} to="/FinancialNews" title="Markets" body="Headlines scored by tone and linked to the stocks they mention." className="md:col-span-2">
      <div className="mx-auto max-w-[260px]">
        {[
          ["HDFCBANK", "Positive", "var(--green)"],
          ["INFY", "Negative", "var(--red)"],
          ["MARUTI", "Neutral", "hsl(var(--muted-foreground))"],
        ].map(([t, s, c]) => (
          <div key={t} className={row} style={{ borderColor: "var(--hairline)" }}>
            <span className="num text-foreground">{t}</span>
            <span style={{ color: c }}>{s}</span>
          </div>
        ))}
      </div>
    </Card>

    <Card i={3} to="/SIPCalculator" title="SIP planner" body="Step-up SIPs, goal planning and five-year fund returns from AMFI." className="md:col-span-2">
      <div className="mx-auto flex h-[110px] max-w-[260px] items-end gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => {
          const invested = 12 + i * 5;
          const gain = Math.round(Math.pow(1.19, i) * 3);
          return (
            <div key={i} className="flex flex-1 flex-col justify-end gap-[2px]" style={{ height: "100%" }}>
              <span className="rounded-sm bg-brand" style={{ height: `${gain}%` }} />
              <span className="rounded-sm bg-foreground/15" style={{ height: `${invested}%` }} />
            </div>
          );
        })}
      </div>
    </Card>

    <Card i={4} to="/Portfolios" title="Portfolios" body="Saved runs priced at the last close, with drift and the trades to rebalance." className="md:col-span-2">
      <div className="mx-auto max-w-[260px]">
        {[
          ["ITC", "Target 26.9%", "Now 22.1%", "Buy 18"],
          ["SUNPHARMA", "Target 12.1%", "Now 16.2%", "Sell 6"],
          ["TCS", "Target 15.8%", "Now 14.9%", "Hold"],
        ].map(([t, a, b, c]) => (
          <div key={t} className={row} style={{ borderColor: "var(--hairline)" }}>
            <span className="text-foreground">{t}</span>
            <span className="text-muted-foreground">{b}</span>
            <span className={c === "Hold" ? "text-muted-foreground" : "text-foreground"}>{c}</span>
          </div>
        ))}
      </div>
    </Card>

    <Card
      i={5}
      to="/Optimizer"
      title="Folio, the assistant"
      body="Answers questions about your result, any metric or SIPs, grounded in your own numbers. Markets and investing only."
      className="md:col-span-6"
    >
      <div className="mx-auto flex max-w-[560px] flex-col gap-2.5">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-[13.5px] text-background">
          Why did TCS get under 5% in my run?
        </div>
        <div className="flex max-w-[88%] gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground/[0.06]">
            <Mark size={13} />
          </span>
          <div className="rounded-2xl rounded-tl-md border bg-background/60 px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground" style={{ borderColor: "var(--hairline)" }}>
            Its model gave TCS the lowest score of your seven stocks: a small predicted return and the weakest accuracy in testing. Weights follow those scores, so it got the least, while INFY scored highest and got the most.
          </div>
        </div>
      </div>
    </Card>
  </div>
);

export default FeatureGrid;
