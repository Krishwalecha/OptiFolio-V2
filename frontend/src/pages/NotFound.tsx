import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(var(--background))",
        padding: "24px",
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

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "48px",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="6" fill="hsl(var(--foreground))" />
            <path
              d="M5 15L9 9.5L13 12L17 6.5"
              stroke="hsl(var(--background))"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
            }}
          >
            OptiFolio
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ textAlign: "center", maxWidth: "340px" }}
        >
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "clamp(5rem, 15vw, 8rem)",
              fontWeight: 400,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: "hsl(var(--muted-foreground) / 0.15)",
              marginBottom: "24px",
              userSelect: "none",
            }}
          >
            404
          </div>

          <h1
            style={{
              fontSize: "18px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "hsl(var(--foreground))",
              marginBottom: "10px",
            }}
          >
            Page not found
          </h1>

          <p
            style={{
              fontSize: "14px",
              color: "hsl(var(--muted-foreground))",
              marginBottom: "32px",
              lineHeight: 1.6,
              fontWeight: 300,
            }}
          >
            The page at{" "}
            <code
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "12px",
                background: "hsl(var(--card) / 0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                padding: "1px 5px",
              }}
            >
              {location.pathname}
            </code>{" "}
            doesn't exist.
          </p>

          <Link
            to="/"
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
            Back to dashboard
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
