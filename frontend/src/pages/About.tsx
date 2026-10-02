import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { buttonClass } from "@/ui";
import { cn } from "@/lib/utils";

const reveal = { initial: { opacity: 0, y: 12 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } } as const;

const STEPS = [
  {
    t: "Read five years of prices",
    d: "Daily end-of-day prices for every stock you pick, over the last five years.",
  },
  {
    t: "Describe each stock with 40+ features",
    d: "Momentum over several windows, RSI, MACD, ATR, Bollinger bands, volume trends and more, computed day by day.",
  },
  {
    t: "Train and test a model per stock",
    d: "An XGBoost model is trained for each stock on the older 80% of its history, then tested on the most recent 20% it never saw. That test gives each stock an accuracy score: how often the direction was right, and how well predicted and actual returns lined up (IC).",
  },
  {
    t: "Score every stock",
    d: "Each stock’s predicted return is multiplied by the model’s confidence to give a composite score. Stocks with a score at or below zero are left out, and the result tells you why.",
  },
  {
    t: "Weight for your profile",
    d: "Balanced follows the scores. Conservative takes 60% of each weight from low volatility and 40% from the score. Aggressive follows expected return. Stocks with strong 12-month momentum then get a moderate boost, and with four or more stocks the result is blended with an even split (up to half at six or more), which spreads risk across the whole basket. The engine never puts everything in one stock.",
  },
  {
    t: "Turn weights into an order, then check it",
    d: "Weights become whole-share quantities at the last close. Alongside them you get the forecast return, volatility and Sharpe, how the exact mix behaved over the past five years, and where it sits among 15,000 random mixes.",
  },
];

const About: React.FC = () => (
  <div className="flex min-h-screen flex-col bg-background text-foreground">
    <Navbar />
    <main className="flex-1">
      <section className="mx-auto max-w-[1200px] px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[18ch] text-[clamp(2.4rem,5.6vw,4.4rem)] font-medium leading-[1] tracking-[-0.05em]">
          How OptiFolio decides, <span className="text-foreground/40">and how well it works.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="mb-0 mt-6 max-w-[40rem] text-[17px] leading-relaxed text-muted-foreground">
          Everything that goes into an allocation, the numbers we measured, and the places where a simpler approach does as well. No black box.
        </motion.p>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-20">
          <motion.h2 {...reveal} className="text-[24px] font-medium tracking-[-0.03em]">
            The method
          </motion.h2>
          <ol className="m-0 list-none border-t border-[var(--hairline)] p-0">
            {STEPS.map((s, i) => (
              <motion.li key={s.t} {...reveal} className="grid gap-2 border-b border-[var(--hairline)] py-7 sm:grid-cols-[56px_1fr]">
                <span className="num text-[13px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[18px] font-medium tracking-[-0.02em]">{s.t}</h3>
                  <p className="mb-0 mt-2 max-w-[44rem] text-[15px] leading-relaxed text-muted-foreground">{s.d}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-20">
          <motion.h2 {...reveal} className="text-[24px] font-medium tracking-[-0.03em]">
            What we measured
          </motion.h2>
          <div className="space-y-6">
            <motion.dl {...reveal} className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-[var(--hairline)] ring-1 ring-inset ring-[var(--hairline)] sm:grid-cols-4">
              {[
                ["16.1%", "Average 12-month return"],
                ["15.0%", "Even split, same tests"],
                ["59%", "Tests ahead of an even split"],
                ["1,932", "One-year tests"],
              ].map(([v, k]) => (
                <div key={k} className="bg-background p-6">
                  <dd className="num m-0 text-[30px] font-medium leading-none tracking-[-0.045em]">{v}</dd>
                  <dt className="mt-3 text-[13px] text-muted-foreground">{k}</dt>
                </div>
              ))}
            </motion.dl>
            <motion.div {...reveal} className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
              <p className="m-0">
                89 baskets of three to six NSE stocks, drawn at random and never used to tune the method, each started on one of seven dates between September 2022 and September 2025 and held for a year. At every start date the models were retrained on data available then and nothing after it.
              </p>
              <p className="m-0">
                <span className="text-foreground">The honest summary: a small, consistent edge over splitting money evenly.</span> About one point a year on average, ahead in four independent sets of baskets out of four, median 10.7% against 9.6%. The worst tenth of results was slightly deeper (−8.6% against −8.1%), because the method concentrates more than an even split. Changes that failed this test, including longer histories and stronger momentum, were left out.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-20">
          <motion.h2 {...reveal} className="text-[24px] font-medium tracking-[-0.03em]">
            Data and limits
          </motion.h2>
          <motion.ul {...reveal} className="m-0 grid list-none gap-px overflow-hidden rounded-3xl bg-[var(--hairline)] p-0 ring-1 ring-inset ring-[var(--hairline)] sm:grid-cols-2">
            {[
              ["Prices", "End-of-day prices from Yahoo Finance: five years of daily closes for every stock. No intraday data."],
              ["Mutual funds", "NAV history from AMFI via mfapi.in, refreshed daily."],
              ["Headlines", "RSS feeds, NewsData and GNews, scored by a language model. Tone is not a forecast."],
              ["Not advice", "An independent educational project, not a SEBI-registered adviser. Past results do not guarantee future returns."],
            ].map(([k, v]) => (
              <li key={k} className="bg-background p-6">
                <div className="text-[14px] font-medium">{k}</div>
                <p className="mb-0 mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{v}</p>
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 pb-24 pt-8 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-card p-8 ring-1 ring-inset ring-[var(--hairline)] sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-[24px] font-medium tracking-[-0.03em]">Try it on your own stocks.</h2>
            <p className="mb-0 mt-1.5 text-[14.5px] text-muted-foreground">The full result, with every number explained, in about ten seconds.</p>
          </div>
          <Link to="/Optimizer" className={cn(buttonClass("primary", "lg"), "shrink-0")}>
            Open the optimizer <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

export default About;
