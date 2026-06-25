import React from "react";
import { TrendingUp, ShieldCheck, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

const HeroSection: React.FC = () => {
  const features = [
    {
      icon: <TrendingUp size={15} />,
      title: "Higher Returns",
      description:
        "Optimize allocation for maximum expected returns based on historical performance data.",
    },
    {
      icon: <ShieldCheck size={15} />,
      title: "Lower Risk",
      description:
        "Reduce volatility through smart diversification driven by modern portfolio theory.",
    },
    {
      icon: <BarChart3 size={15} />,
      title: "Data-Driven",
      description:
        "Algorithms analyze historical price data to find the mathematically optimal split.",
    },
  ];

  return (
    <section style={{ padding: "80px 24px 72px", position: "relative" }}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <motion.div variants={item} style={{ marginBottom: "28px" }}>
          <span className="status-pill">
            <span className="live-dot" />
            Smart Portfolio Optimization
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          style={{
            fontSize: "clamp(2.4rem, 6vw, 4rem)",
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
        </motion.h1>

        <motion.p
          variants={item}
          style={{
            fontSize: "15px",
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.7,
            maxWidth: "480px",
            margin: "0 auto 52px",
            fontWeight: 300,
          }}
        >
          Maximize returns while minimizing risk using advanced portfolio
          optimization algorithms. Enter your stocks and get an AI-powered
          allocation in seconds.
        </motion.p>

        {/* Feature cards — translucent to match rest of app */}
        <motion.div
          variants={item}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "10px",
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              style={{
                padding: "20px",
                background: "hsl(var(--card) / 0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                textAlign: "left",
                cursor: "default",
                transition:
                  "background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "hsl(var(--secondary) / 0.7)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "hsl(var(--muted-foreground) / 0.25)";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 20px hsl(var(--foreground) / 0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "hsl(var(--card) / 0.6)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "hsl(var(--border))";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "7px",
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--foreground))",
                  marginBottom: "14px",
                }}
              >
                {f.icon}
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
                  fontSize: "12.5px",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.55,
                  fontWeight: 300,
                }}
              >
                {f.description}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
