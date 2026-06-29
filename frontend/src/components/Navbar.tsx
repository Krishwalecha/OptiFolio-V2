import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { isLoggedIn, logout, userName, userEmail } = useAuth();
  const location = useLocation();
  const isDark = theme === "dark";
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  // Updated nav structure
  const navTabs = [
    { label: "Home", path: "/" },
    { label: "Optimizer", path: "/Optimizer" },
    { label: "Portfolios", path: "/Portfolios" },
    { label: "News", path: "/FinancialNews" },
    { label: "SIP", path: "/SIPCalculator" },
    { label: "About", path: "/About" },
  ];

  const borderColor = isDark
    ? scrolled
      ? "rgba(255,255,255,0.08)"
      : "rgba(255,255,255,0.06)"
    : scrolled
      ? "rgba(0,0,0,0.08)"
      : "rgba(0,0,0,0.06)";

  const bg = isDark
    ? scrolled
      ? "rgba(9,9,9,0.88)"
      : "rgba(9,9,9,1)"
    : scrolled
      ? "rgba(255,255,255,0.88)"
      : "rgba(255,255,255,1)";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        height: "52px",
        background: bg,
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        borderBottom: `1px solid ${borderColor}`,
        transition: "background 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
      {/* Logo */}
      <Link
        to="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          textDecoration: "none",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
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
            fontSize: "14.5px",
            letterSpacing: "-0.025em",
            color: isDark ? "#f0f0f0" : "#0d0d0d",
            lineHeight: 1,
          }}
        >
          OptiFolio
        </span>
      </Link>

      {/* Center Nav */}
      <nav
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "1px",
        }}
      >
        {navTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="nav-link"
              style={{
                color: isActive
                  ? isDark
                    ? "#f0f0f0"
                    : "#0d0d0d"
                  : isDark
                    ? "rgba(240,240,240,0.48)"
                    : "rgba(13,13,13,0.48)",
                background: isActive
                  ? isDark
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.05)"
                  : "transparent",
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = isDark
                    ? "rgba(240,240,240,0.72)"
                    : "rgba(13,13,13,0.72)";
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = isDark
                    ? "rgba(240,240,240,0.48)"
                    : "rgba(13,13,13,0.48)";
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "7px",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
            background: "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: isDark ? "rgba(240,240,240,0.5)" : "rgba(13,13,13,0.5)",
            transition: "background 0.12s ease, color 0.12s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = isDark
              ? "rgba(255,255,255,0.07)"
              : "rgba(0,0,0,0.05)";
            el.style.color = isDark ? "#f0f0f0" : "#0d0d0d";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = "transparent";
            el.style.color = isDark
              ? "rgba(240,240,240,0.5)"
              : "rgba(13,13,13,0.5)";
          }}
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {!isLoggedIn ? (
          <>
            <Link
              to="/SignIn"
              style={{
                textDecoration: "none",
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                color: isDark ? "rgba(240,240,240,0.5)" : "rgba(13,13,13,0.5)",
                transition: "color 0.12s ease",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = isDark
                  ? "#f0f0f0"
                  : "#0d0d0d";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = isDark
                  ? "rgba(240,240,240,0.5)"
                  : "rgba(13,13,13,0.5)";
              }}
            >
              Sign in
            </Link>
            <Link
              to="/SignUp"
              style={{
                textDecoration: "none",
                padding: "5px 12px",
                borderRadius: "7px",
                fontSize: "13px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                background: isDark ? "#f0f0f0" : "#0d0d0d",
                color: isDark ? "#0d0d0d" : "#f0f0f0",
                transition: "opacity 0.12s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "0.82";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
            >
              Get started
            </Link>
          </>
        ) : (
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: isDark ? "#f0f0f0" : "#0d0d0d",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isDark ? "#0d0d0d" : "#f0f0f0",
                fontSize: "11px",
                fontWeight: 600,
                flexShrink: 0,
                transition: "opacity 0.12s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "0.82";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
            >
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </button>
            {profileOpen && (
              <div
                className="animate-slide-down"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "36px",
                  width: "200px",
                  background: isDark ? "#0f0f0f" : "#fff",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
                  borderRadius: "10px",
                  padding: "6px",
                  boxShadow: isDark
                    ? "0 8px 40px rgba(0,0,0,0.7)"
                    : "0 8px 40px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    padding: "8px 10px 10px",
                    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
                    marginBottom: "6px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      color: isDark ? "#f0f0f0" : "#0d0d0d",
                      marginBottom: "2px",
                    }}
                  >
                    {userName || "User"}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: isDark
                        ? "rgba(240,240,240,0.35)"
                        : "rgba(13,13,13,0.35)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {userEmail}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setProfileOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "13px",
                    letterSpacing: "-0.01em",
                    color: "var(--red)",
                    fontWeight: 400,
                    transition: "background 0.12s ease",
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--red-subtle)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </header>
  );
};

export default Navbar;
