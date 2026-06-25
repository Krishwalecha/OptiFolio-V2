import React from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StockInput from "@/components/StockInput";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

const Index: React.FC = () => {
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
          {/* HeroSection has its own bg-gradient-hero class — that's fine, it sits on top of the orb bg */}
          <HeroSection />

          <div style={{ height: "1px", background: "hsl(var(--border))" }} />

          <section
            style={{
              padding: "64px 24px",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ marginBottom: "40px" }}
            >
              <p className="mono-label" style={{ marginBottom: "8px" }}>
                Portfolio optimizer
              </p>
              <h2
                style={{
                  fontSize: "clamp(1.6rem, 3vw, 2rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "hsl(var(--foreground))",
                  marginBottom: "8px",
                }}
              >
                Build your portfolio
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  maxWidth: "480px",
                  lineHeight: 1.65,
                }}
              >
                Enter your stock tickers and investment amount. Our algorithm
                optimizes the allocation for maximum returns with minimal risk.
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

export default Index;
