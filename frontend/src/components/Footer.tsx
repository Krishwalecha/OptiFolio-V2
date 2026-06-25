import React from "react";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const links = [
    { label: "Dashboard", path: "/" },
    { label: "Portfolios", path: "/Portfolios" },
    { label: "News", path: "/FinancialNews" },
    { label: "SIP", path: "/SIPCalculator" },
    { label: "About", path: "/About" },
  ];

  return (
    <footer
      style={{
        borderTop: "1px solid hsl(var(--border))",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      {/* Wordmark */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="1"
            y="1"
            width="22"
            height="22"
            rx="6"
            fill={isDark ? "#f5f5f5" : "#0d0d0d"}
          />

          <circle
            cx="12"
            cy="12"
            r="6"
            stroke={isDark ? "#0d0d0d" : "#f5f5f5"}
            strokeWidth="1.6"
          />

          <path
            d="M9 13L11.5 10L15 12"
            stroke={isDark ? "#0d0d0d" : "#f5f5f5"}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "-0.02em",
            color: "hsl(var(--foreground))",
          }}
        >
          OptiFolio
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        {links.map((l) => (
          <Link
            key={l.path}
            to={l.path}
            style={{
              textDecoration: "none",
              fontSize: "12.5px",
              color: "hsl(var(--muted-foreground))",
              padding: "3px 8px",
              borderRadius: "5px",
              transition: "color 0.12s ease, background 0.12s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--foreground))";
              (e.currentTarget as HTMLElement).style.background =
                "hsl(var(--secondary))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--muted-foreground))";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Copyright */}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "11px",
          color: "hsl(var(--muted-foreground))",
          letterSpacing: "0.02em",
        }}
      >
        © {year} OptiFolio · Not financial advice
      </span>
    </footer>
  );
};

export default Footer;
