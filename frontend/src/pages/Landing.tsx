import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Brain,
  Newspaper,
  Calculator,
  Zap,
  Lock,
  LineChart,
  Target,
  ArrowRight,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] },
  }),
};

const features = [
  {
    icon: Brain,
    title: "AI Optimization",
    desc: "Markowitz mean-variance optimization finds the ideal allocation across your stocks, maximizing return per unit of risk.",
  },
  {
    icon: Target,
    title: "Smart Risk Profiling",
    desc: "Scoring engine evaluates age, savings rate, family size, and investment horizon to compute your exact risk tolerance.",
  },
  {
    icon: Newspaper,
    title: "Live Market News",
    desc: "Real-time Indian market news aggregated from RSS, NewsData, and GNews — with AI bullish/bearish sentiment analysis.",
  },
  {
    icon: BarChart3,
    title: "Stock Charts",
    desc: "Historical price charts with hover tooltips, area gradients, and high/low/volume stats for every holding.",
  },
  {
    icon: Calculator,
    title: "SIP Calculator",
    desc: "Calculate your Systematic Investment Plan maturity value, total invested, and estimated returns instantly.",
  },
  {
    icon: LineChart,
    title: "Portfolio History",
    desc: "All past optimization runs saved and grouped by date, so you can track how your strategy evolves over time.",
  },
  {
    icon: Zap,
    title: "Ticker Verification",
    desc: "Stock tickers verified against live market data the moment you type them, blocking invalid entries before optimization.",
  },
  {
    icon: Lock,
    title: "Secure & Private",
    desc: "Full auth with password hashing, per-user data isolation, and persistent risk profile storage in a database.",
  },
];

const steps = [
  {
    num: "01",
    title: "Enter your stocks",
    desc: "Type any NSE/BSE ticker. Verified live, historical data fetched automatically.",
  },
  {
    num: "02",
    title: "Set your risk level",
    desc: "Choose manually, or let AI compute it from your financial profile in seconds.",
  },
  {
    num: "03",
    title: "Get the allocation",
    desc: "Algorithm returns optimal weights with expected return and annualized volatility.",
  },
];

const Landing: React.FC = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "hsl(var(--background))",
        position: "relative",
      }}
    >
      {/* ── Orb Grid Background (light) ── */}
      <div
        className="dark:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(to right, rgba(229,231,235,0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(229,231,235,0.8) 1px, transparent 1px),
            radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.3), transparent),
            radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.3), transparent)
          `,
          backgroundSize: "48px 48px, 48px 48px, 100% 100%, 100% 100%",
        }}
      />
      {/* ── Orb Grid Background (dark) ── */}
      <div
        className="hidden dark:block"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(to right, rgba(71,85,105,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(71,85,105,0.2) 1px, transparent 1px),
            radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.25), transparent),
            radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.2), transparent)
          `,
          backgroundSize: "48px 48px, 48px 48px, 100% 100%, 100% 100%",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <Navbar />

        <main style={{ flex: 1 }}>
          {/* ── Hero ── */}
          <section style={{ padding: "96px 24px 80px" }}>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                maxWidth: "680px",
                margin: "0 auto",
                textAlign: "center",
              }}
            >
              <div style={{ marginBottom: "28px" }}>
                <span className="status-pill">
                  <span className="live-dot" />
                  Portfolio Intelligence
                </span>
              </div>

              <h1
                style={{
                  fontSize: "clamp(2.6rem, 6vw, 4.2rem)",
                  color: "hsl(var(--foreground))",
                  marginBottom: "20px",
                }}
              >
                Invest smarter,{" "}
                <span
                  style={{
                    fontStyle: "italic",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  not harder
                </span>
              </h1>

              <p
                style={{
                  fontSize: "16px",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.7,
                  maxWidth: "480px",
                  margin: "0 auto 40px",
                  fontWeight: 300,
                }}
              >
                Maximize returns while minimizing risk using advanced portfolio
                optimization algorithms. Built for Indian equity markets.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to="/Optimizer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "10px 22px",
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    transition: "opacity 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.82";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                >
                  Start optimizing <ArrowRight size={14} />
                </Link>
                <Link
                  to="/about"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "10px 22px",
                    background: "hsl(var(--card) / 0.6)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                    color: "hsl(var(--muted-foreground))",
                    transition: "background 0.12s ease, color 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "hsl(var(--secondary) / 0.7)";
                    (e.currentTarget as HTMLElement).style.color =
                      "hsl(var(--foreground))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "hsl(var(--card) / 0.6)";
                    (e.currentTarget as HTMLElement).style.color =
                      "hsl(var(--muted-foreground))";
                  }}
                >
                  Learn more
                </Link>
              </div>
            </motion.div>
          </section>

          {/* ── Why OptiFolio — 3 cards ── */}
          <section
            style={{
              borderTop: "1px solid hsl(var(--border))",
              padding: "72px 24px",
            }}
          >
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                style={{ marginBottom: "40px" }}
              >
                <p className="mono-label" style={{ marginBottom: "8px" }}>
                  Why OptiFolio
                </p>
                <h2
                  style={{
                    fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Everything you need to invest intelligently
                </h2>
              </motion.div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {[
                  {
                    icon: TrendingUp,
                    title: "Higher Returns",
                    desc: "Optimize for maximum expected returns based on historical data.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Lower Risk",
                    desc: "Reduce volatility through mathematically-proven diversification.",
                  },
                  {
                    icon: BarChart3,
                    title: "Data-Driven",
                    desc: "Algorithms analyze market patterns to find the optimal split.",
                  },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.div
                      key={f.title}
                      custom={i}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      style={{
                        padding: "28px",
                        background: "hsl(var(--card) / 0.6)",
                        backdropFilter: "blur(8px)",
                        borderRight:
                          i < 2 ? "1px solid hsl(var(--border))" : "none",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "hsl(var(--secondary) / 0.7)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "hsl(var(--card) / 0.6)";
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: "hsl(var(--secondary))",
                          border: "1px solid hsl(var(--border))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "hsl(var(--foreground))",
                          marginBottom: "16px",
                        }}
                      >
                        <Icon size={15} />
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "hsl(var(--foreground))",
                          marginBottom: "8px",
                        }}
                      >
                        {f.title}
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "hsl(var(--muted-foreground))",
                          lineHeight: 1.6,
                          fontWeight: 300,
                        }}
                      >
                        {f.desc}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── How it works ── */}
          <section
            style={{
              borderTop: "1px solid hsl(var(--border))",
              padding: "72px 24px",
            }}
          >
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                style={{ marginBottom: "36px" }}
              >
                <p className="mono-label" style={{ marginBottom: "8px" }}>
                  How it works
                </p>
                <h2
                  style={{
                    fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  Three steps to a smarter portfolio
                </h2>
              </motion.div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {steps.map((s, i) => (
                  <motion.div
                    key={s.num}
                    custom={i}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    style={{
                      padding: "28px 28px 32px",
                      background: "hsl(var(--card) / 0.6)",
                      backdropFilter: "blur(8px)",
                      borderRight:
                        i < steps.length - 1
                          ? "1px solid hsl(var(--border))"
                          : "none",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px",
                        letterSpacing: "0.07em",
                        color: "hsl(var(--muted-foreground))",
                        marginBottom: "18px",
                        fontWeight: 400,
                      }}
                    >
                      {s.num}
                    </p>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        letterSpacing: "-0.015em",
                        color: "hsl(var(--foreground))",
                        marginBottom: "10px",
                      }}
                    >
                      {s.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "hsl(var(--muted-foreground))",
                        lineHeight: 1.6,
                        fontWeight: 300,
                      }}
                    >
                      {s.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Full feature grid ── */}
          <section
            style={{
              borderTop: "1px solid hsl(var(--border))",
              padding: "72px 24px",
            }}
          >
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                style={{ marginBottom: "36px" }}
              >
                <p className="mono-label" style={{ marginBottom: "8px" }}>
                  Everything included
                </p>
                <h2
                  style={{
                    fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  The full toolkit
                </h2>
              </motion.div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {features.map((f, i) => {
                  const Icon = f.icon;
                  const col = i % 4;
                  const row = Math.floor(i / 4);
                  const totalRows = Math.ceil(features.length / 4);
                  return (
                    <motion.div
                      key={f.title}
                      custom={i}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                      variants={fadeUp}
                      style={{
                        padding: "24px",
                        background: "hsl(var(--card) / 0.6)",
                        backdropFilter: "blur(8px)",
                        borderRight:
                          col < 3 ? "1px solid hsl(var(--border))" : "none",
                        borderBottom:
                          row < totalRows - 1
                            ? "1px solid hsl(var(--border))"
                            : "none",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "hsl(var(--secondary) / 0.7)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "hsl(var(--card) / 0.6)";
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "7px",
                          background: "hsl(var(--secondary))",
                          border: "1px solid hsl(var(--border))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "hsl(var(--foreground))",
                          marginBottom: "12px",
                        }}
                      >
                        <Icon size={13} />
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          letterSpacing: "-0.01em",
                          color: "hsl(var(--foreground))",
                          marginBottom: "6px",
                        }}
                      >
                        {f.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "hsl(var(--muted-foreground))",
                          lineHeight: 1.55,
                          fontWeight: 300,
                        }}
                      >
                        {f.desc}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── CTA ── */}
          <section
            style={{
              borderTop: "1px solid hsl(var(--border))",
              padding: "80px 24px",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
            >
              <h2
                style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.025em",
                  color: "hsl(var(--foreground))",
                  marginBottom: "14px",
                }}
              >
                Ready to optimize your portfolio?
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "32px",
                  fontWeight: 300,
                }}
              >
                Create a free account and run your first optimization in
                minutes.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <Link
                  to="/SignUp"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "10px 22px",
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    transition: "opacity 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.82";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                >
                  Get started free <ArrowRight size={14} />
                </Link>
                <Link
                  to="/Optimizer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "10px 22px",
                    background: "hsl(var(--card) / 0.6)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "14px",
                    color: "hsl(var(--muted-foreground))",
                    transition: "background 0.12s ease, color 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "hsl(var(--secondary) / 0.7)";
                    (e.currentTarget as HTMLElement).style.color =
                      "hsl(var(--foreground))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "hsl(var(--card) / 0.6)";
                    (e.currentTarget as HTMLElement).style.color =
                      "hsl(var(--muted-foreground))";
                  }}
                >
                  Try Now
                </Link>
              </div>
            </motion.div>
          </section>
        </main>

        <Separator />
        <Footer />
      </div>
    </div>
  );
};

export default Landing;
