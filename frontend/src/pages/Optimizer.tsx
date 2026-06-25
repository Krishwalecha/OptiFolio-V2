import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StockInput from "@/components/StockInput";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

const App: React.FC = () => {
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
          <section
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
              padding: "56px 24px 80px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: "40px" }}
            >
              <p className="mono-label" style={{ marginBottom: "6px" }}>
                Portfolio optimizer
              </p>
              <h1
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
                  color: "hsl(var(--foreground))",
                  marginBottom: "10px",
                }}
              >
                Build your portfolio
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  lineHeight: 1.65,
                  maxWidth: "440px",
                }}
              >
                Enter your stock tickers and investment amount. Choose your risk
                profile and let the algorithm find the optimal allocation.
              </p>
            </motion.div>
            <StockInput />
          </section>
        </main>
        <Separator />
        <Footer />
      </div>
    </div>
  );
};

export default App;
