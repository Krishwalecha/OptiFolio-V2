import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, GitFork, MessageSquare, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductPreview from "@/components/site/ProductPreview";
import HeroBackdrop from "@/components/site/HeroBackdrop";
import FeatureGrid from "@/components/site/FeatureGrid";
import RiskDemo from "@/components/site/RiskDemo";
import CorrelationMatrix from "@/components/site/CorrelationMatrix";
import example from "@/features/market/example-run.json";
import { LESSONS } from "@/features/learn/lessons";
import { PALETTE, StackBar, buttonClass } from "@/ui";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.07, ease } }),
};
const inView = { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "-80px" } } as const;

const perf = example.performance;
const runDate = new Date(example.run_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const H2 = "text-[clamp(2rem,4.4vw,3.4rem)] font-medium leading-[1.02] tracking-[-0.045em]";

const Section: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className, id }) => (
  <section id={id} className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)}>
    {children}
  </section>
);

const Head: React.FC<{ title: React.ReactNode; body?: React.ReactNode }> = ({ title, body }) => (
  <div className="mb-8 flex flex-col justify-between gap-5 md:mb-10 md:flex-row md:items-end md:gap-12">
    <motion.h2 variants={rise} {...inView} className={cn("max-w-[16ch]", H2)}>
      {title}
    </motion.h2>
    {body && (
      <motion.p variants={rise} custom={1} {...inView} className="m-0 max-w-[26rem] text-[15.5px] leading-relaxed text-muted-foreground">
        {body}
      </motion.p>
    )}
  </div>
);

const STEPS = [
  {
    t: "Pick your stocks",
    d: "Search any NSE company by name or ticker. Two to fifteen stocks.",
    ui: (
      <div className="flex flex-wrap gap-1.5">
        {["RELIANCE", "HDFCBANK", "TCS", "ITC"].map((t) => (
          <span key={t} className="inline-flex h-7 items-center rounded-lg bg-foreground/[0.06] px-2.5 text-[12px] font-medium">
            {t}
          </span>
        ))}
        <span className="inline-flex h-7 items-center rounded-lg border border-dashed border-foreground/20 px-2.5 text-[12px] text-muted-foreground">+ Add</span>
      </div>
    ),
  },
  {
    t: "Set your risk",
    d: "Choose a profile, or answer six questions and let the score decide.",
    ui: (
      <div className="grid grid-cols-3 gap-1 rounded-full bg-foreground/[0.06] p-1 text-center text-[12px]">
        <span className="truncate rounded-full py-1.5 text-muted-foreground">Conservative</span>
        <span className="rounded-full bg-card py-1.5 font-medium shadow-sm ring-1 ring-inset ring-[var(--hairline)]">Balanced</span>
        <span className="truncate rounded-full py-1.5 text-muted-foreground">Aggressive</span>
      </div>
    ),
  },
  {
    t: "Get exact shares",
    d: "Weights, whole-share counts and rupee amounts, with the expected return and the risk behind them.",
    ui: (
      <div className="space-y-2">
        {example.allocation.slice(0, 3).map((a, i) => (
          <div key={a.ticker} className="flex items-center gap-2.5 text-[12px]">
            <span className="w-[76px] font-medium">{a.ticker}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
              <span className="block h-full rounded-full" style={{ width: `${a.weight_pct * 4}%`, background: PALETTE[i] }} />
            </span>
            <span className="num w-10 text-right">{a.weight_pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    ),
  },
];

const METRICS = [
  { k: "Sharpe ratio", v: perf.sharpe_ratio.toFixed(2), d: "Expected return above the risk-free rate, per unit of risk.", slug: "sharpe-ratio" },
  { k: "Worst fall", v: `${(perf.max_drawdown * 100).toFixed(1)}%`, d: "The deepest drop from a peak this exact mix went through in five years.", slug: "drawdown" },
  { k: "Volatility", v: `${(perf.annualised_volatility * 100).toFixed(1)}%`, d: "How far a typical year swings around the expected return.", slug: "value-at-risk" },
  { k: "Beta", v: perf.beta.toFixed(2), d: "How much the portfolio moves when the Nifty 50 moves 1%.", slug: "beta" },
];

const HEADLINES = [
  { t: "INFY", h: "Infosys wins multi-year deal from a European bank", s: "pos" },
  { t: "ADANIPORTS", h: "Regulator fines port operator over disclosure lapse", s: "neg" },
  { t: "MARUTI", h: "Monthly dispatches in line with street estimates", s: "neu" },
  { t: "LT", h: "L&T bags an ultra-mega order in the Middle East", s: "pos" },
];

const Landing: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <Navbar />

    <main className="flex-1 overflow-x-clip">
      <div className="relative -mt-16 pt-16">
        <HeroBackdrop />
        <Section className="relative pb-14 pt-20 text-center sm:pb-16 sm:pt-28">
          <motion.h1 variants={rise} custom={0} initial="hidden" animate="show" className="mx-auto max-w-[15ch] text-balance text-[clamp(2.6rem,5.4vw,4.6rem)] font-medium leading-[1] tracking-[-0.05em] md:max-w-none">
            <span className="md:block md:whitespace-nowrap">Portfolio construction, </span>
            <span className="text-foreground/40 md:block md:whitespace-nowrap">engineered for Indian markets.</span>
          </motion.h1>
          <motion.p variants={rise} custom={1} initial="hidden" animate="show" className="mx-auto mt-7 max-w-[36rem] text-[17px] leading-relaxed text-muted-foreground sm:text-[18px]">
            OptiFolio turns a list of NSE stocks into exact share quantities, then shows its work: the return to expect, the risk you take on, and what the model thinks of each stock.
          </motion.p>
          <motion.div variants={rise} custom={2} initial="hidden" animate="show" className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/Optimizer" className={cn(buttonClass("primary", "lg"), "w-full sm:w-auto")}>
              Start optimizing <ArrowRight size={15} />
            </Link>
            <a href="#how" className={cn(buttonClass("ghost", "lg"), "w-full sm:w-auto")}>
              See how it works
            </a>
          </motion.div>
        </Section>
      </div>

      <Section>
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease }} className="relative overflow-hidden rounded-[28px] bg-[#0b0c10] px-3 pt-8 ring-1 ring-inset ring-white/10 sm:px-10 sm:pt-14 [mask-image:linear-gradient(to_bottom,black_82%,transparent)]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(58,88,255,0.5), transparent 70%), radial-gradient(35% 40% at 88% 18%, rgba(123,147,255,0.2), transparent 70%)" }} />
          <div className="relative mx-auto max-w-[1120px]">
            <ProductPreview />
          </div>
        </motion.div>
        <p className="mb-0 mt-4 text-center text-[12.5px] text-muted-foreground">A real result from {runDate}: seven large caps, ₹2.5 lakh, balanced profile.</p>
      </Section>

      <Section className="py-8 sm:py-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <span className="text-[13px] text-muted-foreground">Built on well-tested quantitative methods</span>
          <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-3 text-[15px] font-medium tracking-[-0.015em] text-foreground/65">
            {["XGBoost per stock", "40+ technical features", "Hold-out testing", "Ledoit-Wolf shrinkage", "Monte Carlo"].map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </Section>

      <Section className="relative isolate py-10 sm:py-14">
        <div aria-hidden="true" className="glow -left-72 top-24" />
        <Head title="See how risk changes the allocation." body="The same eight stocks under each profile, straight from the optimizer. More appetite tilts harder toward the best forecasts." />
        <motion.div variants={rise} {...inView}>
          <RiskDemo />
        </motion.div>
      </Section>

      <Section className="relative isolate py-10 sm:py-14">
        <div aria-hidden="true" className="glow -right-64 top-0" />
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div>
            <motion.h2 variants={rise} {...inView} className={cn("max-w-[14ch]", H2)}>
              Diversify by the numbers, <span className="text-foreground/40">not by gut feel.</span>
            </motion.h2>
            <motion.p variants={rise} custom={1} {...inView} className="mb-0 mt-6 max-w-md text-[15.5px] leading-relaxed text-muted-foreground">
              Banks move with banks and IT moves with IT. OptiFolio measures how every pair of your stocks has moved together, then spreads money where those risks offset. These are real five-year correlations; hover any pair.
            </motion.p>
            <motion.div variants={rise} custom={2} {...inView}>
              <Link to="/Learn/diversification" className={cn(buttonClass("secondary", "md"), "mt-8")}>
                Why this matters <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
          <motion.div variants={rise} {...inView} className="rounded-3xl bg-card p-5 ring-1 ring-inset ring-[var(--hairline)] sm:p-8">
            <CorrelationMatrix />
          </motion.div>
        </div>
      </Section>

      <Section id="how" className="relative isolate scroll-mt-20 py-10 sm:py-14">
        <div aria-hidden="true" className="gridlines" />
        <div aria-hidden="true" className="glow left-1/2 top-1/3 -translate-x-1/2 opacity-70" />
        <Head title="How an optimization works" body="A standard run takes 5 to 20 seconds. Deep analysis tunes every stock’s model first and takes a few minutes." />
        <div className="grid gap-4 md:grid-cols-3 [&>*]:min-w-0">
          {STEPS.map((s, i) => (
            <motion.div key={s.t} variants={rise} custom={i} {...inView} className="flex flex-col rounded-3xl bg-card p-6 ring-1 ring-inset ring-[var(--hairline)] sm:p-7">
              <div className="flex h-[104px] items-center rounded-2xl bg-foreground/[0.03] px-5 ring-1 ring-inset ring-[var(--hairline)]">
                <div className="w-full">{s.ui}</div>
              </div>
              <div className="num mt-8 text-[12px] text-muted-foreground">0{i + 1}</div>
              <h3 className="mt-1.5 text-[19px] font-medium tracking-[-0.025em]">{s.t}</h3>
              <p className="mb-0 mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="relative isolate py-10 sm:py-14">
        <div aria-hidden="true" className="glow -left-80 bottom-0" />
        <Head title="Everything else you need to invest" body="Research, optimize, plan and track, without jumping between five apps." />
        <FeatureGrid />
      </Section>

      <section className="dotfield relative my-4 overflow-hidden border-y border-white/10 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <motion.h2 variants={rise} {...inView} className="max-w-[11ch] text-[clamp(2.4rem,5.6vw,4.4rem)] font-medium leading-[0.98] tracking-[-0.05em]">
              Every number, explained in plain English
            </motion.h2>
            <motion.p variants={rise} custom={1} {...inView} className="mb-0 mt-6 max-w-md text-[16px] leading-relaxed text-white/75">
              Each metric in a result has a one-line explanation and a short lesson behind it, so you know what you own and why. These values come from the run above.
            </motion.p>
            <motion.div variants={rise} custom={2} {...inView}>
              <Link to="/Learn" className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-medium text-black no-underline transition-opacity hover:opacity-90">
                Browse {LESSONS.length} lessons <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {METRICS.map((x, i) => (
              <motion.div key={x.k} variants={rise} custom={i} {...inView}>
                <Link to={`/Learn/${x.slug}`} className="group flex h-full flex-col rounded-2xl bg-white/[0.08] p-6 text-white no-underline ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors hover:bg-white/[0.14]">
                  <div className="flex items-center justify-between text-[13.5px] text-white/70">
                    {x.k}
                    <ArrowUpRight size={15} className="opacity-50 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="num mt-7 text-[48px] font-medium leading-none tracking-[-0.05em]">{x.v}</div>
                  <p className="mb-0 mt-4 text-[14px] leading-relaxed text-white/70">{x.d}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Section className="py-10 sm:py-14">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <motion.div variants={rise} {...inView} className="order-2 overflow-hidden rounded-3xl bg-card ring-1 ring-inset ring-[var(--hairline)] lg:order-1">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
              <span className="text-[14px] font-medium">Headline tone</span>
              <span className="text-[12px] text-muted-foreground">Example of the Markets view</span>
            </div>
            {HEADLINES.map((s) => {
              const Icon = s.s === "pos" ? TrendingUp : s.s === "neg" ? TrendingDown : Minus;
              const color = s.s === "pos" ? "var(--green)" : s.s === "neg" ? "var(--red)" : "hsl(var(--muted-foreground))";
              return (
                <div key={s.t} className="flex items-center gap-4 border-b border-[var(--hairline)] px-6 py-4 last:border-b-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-muted-foreground">{s.t}</div>
                    <div className="truncate text-[14px]">{s.h}</div>
                  </div>
                  <span className="shrink-0 text-[12.5px] font-medium" style={{ color }}>
                    {s.s === "pos" ? "Positive" : s.s === "neg" ? "Negative" : "Neutral"}
                  </span>
                </div>
              );
            })}
          </motion.div>
          <div className="order-1 lg:order-2">
            <motion.h2 variants={rise} {...inView} className={cn("max-w-[15ch]", H2)}>
              News, scored for the stocks you care about
            </motion.h2>
            <motion.p variants={rise} custom={1} {...inView} className="mb-0 mt-6 max-w-md text-[15.5px] leading-relaxed text-muted-foreground">
              Indian market headlines are scored positive, negative or neutral by a language model and linked to the companies they mention. Add any stock to a basket and send it to the optimizer.
            </motion.p>
            <motion.div variants={rise} custom={2} {...inView}>
              <Link to="/FinancialNews" className={cn(buttonClass("secondary", "md"), "mt-8")}>
                Open Markets <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="py-10 sm:py-14">
        <motion.h2 variants={rise} {...inView} className={cn("mx-auto mb-10 max-w-[20ch] text-center", H2)}>
          A community and a curriculum for new investors
        </motion.h2>
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div variants={rise} {...inView} className="min-w-0">
            <Link to="/Community" className="group flex h-full flex-col overflow-hidden rounded-3xl bg-card no-underline ring-1 ring-inset ring-[var(--hairline)] transition-shadow hover:ring-foreground/20">
              <div className="bg-foreground/[0.03] p-6 sm:p-8">
                <div className="rounded-2xl bg-card p-5 ring-1 ring-inset ring-[var(--hairline)]">
                  <div className="flex items-center justify-between">
                    <div className="text-[13.5px] font-medium text-foreground">Balanced · {example.allocation.length} stocks</div>
                    <span className="text-[12px] text-muted-foreground">Shared portfolio</span>
                  </div>
                  <StackBar className="mt-4" height={8} items={example.allocation.map((a, i) => ({ label: a.ticker, value: a.weight_pct, color: PALETTE[i] }))} />
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
                    {example.allocation.slice(0, 4).map((a) => (
                      <span key={a.ticker}>
                        {a.ticker} {a.weight_pct.toFixed(0)}%
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-4 border-t border-[var(--hairline)] pt-3 text-[12.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare size={13} /> Discuss
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <GitFork size={13} /> Fork into optimizer
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-end justify-between gap-4 p-6 sm:p-8">
                <div>
                  <h3 className="text-[20px] font-medium tracking-[-0.03em] text-foreground">Community</h3>
                  <p className="mb-0 mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted-foreground">Share an optimized portfolio, talk through the trade-offs, and fork someone else’s idea into your own run.</p>
                </div>
                <ArrowUpRight size={20} className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          </motion.div>

          <motion.div variants={rise} custom={1} {...inView} className="min-w-0">
            <Link to="/Learn" className="group flex h-full flex-col overflow-hidden rounded-3xl bg-card no-underline ring-1 ring-inset ring-[var(--hairline)] transition-shadow hover:ring-foreground/20">
              <div className="space-y-2 bg-foreground/[0.03] p-6 sm:p-8">
                {LESSONS.slice(0, 3).map((l, i) => (
                  <div key={l.slug} className="flex items-center gap-4 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-inset ring-[var(--hairline)]" style={{ opacity: 1 - i * 0.15 }}>
                    <span className="num text-[12px] text-muted-foreground">0{i + 1}</span>
                    <span className="flex-1 truncate text-[14px] text-foreground">{l.title}</span>
                    <span className="text-[12px] text-muted-foreground">{l.minutes} min</span>
                  </div>
                ))}
              </div>
              <div className="flex items-end justify-between gap-4 p-6 sm:p-8">
                <div>
                  <h3 className="text-[20px] font-medium tracking-[-0.03em] text-foreground">Learn</h3>
                  <p className="mb-0 mt-2 max-w-sm text-[14.5px] leading-relaxed text-muted-foreground">Short, clear lessons, from what a share is to reading every number on a result page.</p>
                </div>
                <ArrowUpRight size={20} className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
              </div>
            </Link>
          </motion.div>
        </div>
      </Section>

      <Section className="pb-16 pt-6 sm:pb-20">
        <motion.div variants={rise} {...inView} className="cta-cobalt relative overflow-hidden rounded-[28px] px-6 py-20 text-center ring-1 ring-inset ring-white/10 sm:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(70%_70%_at_50%_30%,black,transparent)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-[14ch] text-[clamp(2.3rem,6vw,4.4rem)] font-medium leading-[1] tracking-[-0.05em] text-white">Build your first optimized portfolio.</h2>
            <p className="mx-auto mb-0 mt-5 max-w-md text-[15.5px] text-white/65">Free to use. Sign up takes an email and a password.</p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/SignUp" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-medium text-black no-underline transition-opacity hover:opacity-90">
                Create free account <ArrowRight size={15} />
              </Link>
              <Link to="/Optimizer" className="inline-flex h-12 items-center rounded-full px-7 text-[15px] text-white no-underline ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/10">
                Try the optimizer
              </Link>
            </div>
          </div>
        </motion.div>
      </Section>
    </main>

    <Footer />
  </div>
);

export default Landing;
