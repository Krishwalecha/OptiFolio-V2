import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  Brain,
  BarChart3,
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
    title: "AI Portfolio Optimization",
    desc: "Markowitz mean-variance optimization computes the ideal allocation across your stocks, maximizing return per unit of risk.",
  },
  {
    icon: Target,
    title: "Smart Risk Profiling",
    desc: "Our scoring engine evaluates age, savings rate, family size, horizon, and assets to compute your exact risk tolerance.",
  },
  {
    icon: Newspaper,
    title: "Live Financial News",
    desc: "Real-time Indian market news from RSS, NewsData, and GNews — with AI bullish/bearish/neutral sentiment classification.",
  },
  {
    icon: BarChart3,
    title: "Interactive Stock Charts",
    desc: "Historical price charts with hover tooltips, gradient fills, and high/low/volume stats for every portfolio holding.",
  },
  {
    icon: Calculator,
    title: "SIP Calculator",
    desc: "Calculate maturity value, total invested, and estimated returns on any Systematic Investment Plan instantly.",
  },
  {
    icon: LineChart,
    title: "Portfolio History",
    desc: "All past optimization runs saved and grouped by date — track how your strategy evolves over time.",
  },
  {
    icon: Zap,
    title: "Real-Time Verification",
    desc: "Stock tickers verified against live market data the moment you type them, blocking invalid entries before they reach optimization.",
  },
  {
    icon: Lock,
    title: "Secure Authentication",
    desc: "Full sign-up/sign-in with password hashing, per-user data isolation, and persistent risk profile storage.",
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

const About: React.FC = () => {
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

      {/* All content sits above the background */}
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
          <section
            style={{
              padding: "88px 24px 80px",
              maxWidth: "1100px",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: "24px" }}
            >
              <span className="status-pill">About OptiFolio</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.48,
                delay: 0.06,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                fontSize: "clamp(2rem, 5vw, 3.2rem)",
                color: "hsl(var(--foreground))",
                marginBottom: "20px",
              }}
            >
              Your portfolio,{" "}
              <span
                style={{
                  fontStyle: "italic",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                mathematically optimized
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.48, delay: 0.12 }}
              style={{
                fontSize: "15px",
                color: "hsl(var(--muted-foreground))",
                lineHeight: 1.72,
                maxWidth: "520px",
                margin: "0 auto",
                fontWeight: 300,
              }}
            >
              OptiFolio applies modern portfolio theory to the Indian stock
              market, helping you construct a data-driven, risk-aware investment
              strategy — whether you're a first-time investor or a seasoned
              trader.
            </motion.p>
          </section>

          {/* ── How it works ── */}
          <section style={{ padding: "64px 24px", borderTop: "1px solid hsl(var(--border))" }}>
            <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
              <p className="mono-label" style={{ marginBottom: "36px" }}>
                How it works
              </p>

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

          {/* ── Features ── */}
          <section style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <div
            style={{
              padding: "72px 24px",
              maxWidth: "1100px",
              margin: "0 auto",
            }}
          >
            <p className="mono-label" style={{ marginBottom: "36px" }}>
              Everything included
            </p>

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
                const isRightCol = col === 3;
                const isLastRow = row === totalRows - 1;
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
                      borderRight: !isRightCol
                        ? "1px solid hsl(var(--border))"
                        : "none",
                      borderBottom: !isLastRow
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
                    <h4
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 500,
                        letterSpacing: "-0.015em",
                        color: "hsl(var(--foreground))",
                        marginBottom: "8px",
                      }}
                    >
                      {f.title}
                    </h4>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "hsl(var(--muted-foreground))",
                        lineHeight: 1.6,
                        fontWeight: 300,
                      }}
                    >
                      {f.desc}
                    </p>
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
              padding: "72px 24px",
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
                  fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                  color: "hsl(var(--foreground))",
                  marginBottom: "14px",
                }}
              >
                Ready to optimize?
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "32px",
                  fontWeight: 300,
                }}
              >
                Create a free account and run your first optimization in
                minutes.
              </p>
              <a
                href="/SignUp"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 20px",
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "13.5px",
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  transition: "opacity 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.8";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
              >
                Get started free
                <ArrowRight size={14} />
              </a>
            </motion.div>
          </section>
        </main>

        <Separator />
        <Footer />
      </div>
    </div>
  );
};

export default About;
