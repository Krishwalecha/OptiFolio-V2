import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const SignIn: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password)
      return setError("All fields are required.");
    setLoading(true);
    try {
      const res = await fetch("https://stock-optimize.vercel.app/api/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
      } else if (data.userId && data.email && data.name) {
        login(data.userId, data.email, data.name);
        setTimeout(() => navigate("/"), 300);
      } else {
        setError("Invalid response from server.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    height: "40px",
    padding: "0 12px",
    background: "hsl(var(--card) / 0.6)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${focused === name ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))"}`,
    borderRadius: "7px",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "-0.01em",
    color: "hsl(var(--foreground))",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxShadow:
      focused === name ? "0 0 0 3px hsl(var(--foreground) / 0.06)" : "none",
  });

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
          backgroundImage: `linear-gradient(to right, rgba(229,231,235,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,231,235,0.8) 1px, transparent 1px), radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.3), transparent), radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.3), transparent)`,
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
          backgroundImage: `linear-gradient(to right, rgba(71,85,105,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(71,85,105,0.2) 1px, transparent 1px), radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.25), transparent), radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.2), transparent)`,
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
        {/* Top bar */}
        <div
          style={{
            height: "52px",
            borderBottom: "1px solid hsl(var(--border))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "hsl(var(--background) / 0.8)",
            backdropFilter: "blur(12px)",
          }}
        >
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
          <Link
            to="/SignUp"
            style={{
              fontSize: "13px",
              color: "hsl(var(--muted-foreground))",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--foreground))";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color =
                "hsl(var(--muted-foreground))";
            }}
          >
            Create account →
          </Link>
        </div>

        {/* Main layout */}
        <div style={{ flex: 1, display: "flex" }}>
          {/* ── Left illustration panel ── */}
          <div
            style={{
              flex: 1,
              display: "none",
              position: "relative",
              overflow: "hidden",
              borderRight: "1px solid hsl(var(--border))",
            }}
            className="md-flex"
          >
            <style>{`.md-flex { display: none; } @media (min-width: 768px) { .md-flex { display: flex !important; } }`}</style>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "280px",
                  height: "280px",
                  marginBottom: "40px",
                }}
              >
                <svg
                  viewBox="0 0 280 280"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <circle
                    cx="140"
                    cy="140"
                    r="100"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="28"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="100"
                    fill="none"
                    stroke="rgba(139,92,246,0.7)"
                    strokeWidth="28"
                    strokeDasharray="200 428"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="100"
                    fill="none"
                    stroke="rgba(59,130,246,0.6)"
                    strokeWidth="28"
                    strokeDasharray="130 428"
                    strokeDashoffset="-200"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="140"
                    cy="140"
                    r="100"
                    fill="none"
                    stroke="rgba(34,197,94,0.6)"
                    strokeWidth="28"
                    strokeDasharray="98 428"
                    strokeDashoffset="-330"
                    strokeLinecap="round"
                  />
                  <text
                    x="140"
                    y="132"
                    textAnchor="middle"
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontSize: "28px",
                      fill: "hsl(var(--foreground))",
                    }}
                  >
                    +12.4%
                  </text>
                  <text
                    x="140"
                    y="155"
                    textAnchor="middle"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  >
                    expected return
                  </text>
                </svg>
                {[
                  {
                    label: "RELIANCE",
                    pct: "+2.3%",
                    color: "rgba(34,197,94,0.15)",
                    border: "rgba(34,197,94,0.3)",
                    text: "#22c55e",
                    top: "8%",
                    left: "-18%",
                  },
                  {
                    label: "TCS",
                    pct: "+1.7%",
                    color: "rgba(139,92,246,0.12)",
                    border: "rgba(139,92,246,0.3)",
                    text: "#8b5cf6",
                    top: "60%",
                    left: "-22%",
                  },
                  {
                    label: "INFY",
                    pct: "-0.4%",
                    color: "rgba(239,68,68,0.1)",
                    border: "rgba(239,68,68,0.25)",
                    text: "#ef4444",
                    top: "15%",
                    right: "-18%",
                  },
                  {
                    label: "HDFC",
                    pct: "+3.1%",
                    color: "rgba(59,130,246,0.12)",
                    border: "rgba(59,130,246,0.3)",
                    text: "#3b82f6",
                    top: "68%",
                    right: "-20%",
                  },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    style={{
                      position: "absolute",
                      top: chip.top,
                      left: chip.left,
                      right: (chip as any).right,
                      padding: "6px 10px",
                      background: chip.color,
                      border: `1px solid ${chip.border}`,
                      borderRadius: "7px",
                      backdropFilter: "blur(8px)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: "hsl(var(--foreground))",
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {chip.label}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 500,
                        color: chip.text,
                      }}
                    >
                      {chip.pct}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "center", maxWidth: "280px" }}>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontSize: "1.6rem",
                    fontWeight: 400,
                    letterSpacing: "-0.02em",
                    color: "hsl(var(--foreground))",
                    marginBottom: "10px",
                  }}
                >
                  Your money,{" "}
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    optimized
                  </span>
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "hsl(var(--muted-foreground))",
                    lineHeight: 1.65,
                    fontWeight: 300,
                  }}
                >
                  Modern portfolio theory applied to Indian equity markets. Get
                  the best allocation in seconds.
                </p>
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "28px" }}>
                {[
                  ["rgba(139,92,246,0.7)", "47%"],
                  ["rgba(59,130,246,0.6)", "30%"],
                  ["rgba(34,197,94,0.6)", "23%"],
                ].map(([color, label]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "11px",
                        color: "hsl(var(--muted-foreground))",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: form ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "40px 24px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: "100%", maxWidth: "360px" }}
            >
              <div style={{ marginBottom: "32px" }}>
                <h1
                  style={{
                    fontSize: "1.8rem",
                    color: "hsl(var(--foreground))",
                    marginBottom: "8px",
                  }}
                >
                  Welcome back
                </h1>
                <p
                  style={{
                    fontSize: "14px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                  }}
                >
                  Sign in to access your portfolio.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    disabled={loading}
                    style={fieldStyle("email")}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={form.password}
                      onChange={handleChange}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      disabled={loading}
                      style={{
                        ...fieldStyle("password"),
                        paddingRight: "40px",
                      }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "hsl(var(--muted-foreground))",
                        display: "flex",
                        alignItems: "center",
                        padding: 0,
                      }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        padding: "10px 14px",
                        background: "var(--red-subtle)",
                        border: "1px solid var(--red-border)",
                        borderRadius: "7px",
                        fontSize: "13px",
                        color: "var(--red)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    height: "40px",
                    background: loading
                      ? "hsl(var(--muted))"
                      : "hsl(var(--foreground))",
                    color: loading
                      ? "hsl(var(--muted-foreground))"
                      : "hsl(var(--background))",
                    border: "none",
                    borderRadius: "7px",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "opacity 0.12s ease, background 0.15s ease",
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading)
                      (e.currentTarget as HTMLElement).style.opacity = "0.82";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                >
                  {loading ? (
                    "Signing in…"
                  ) : (
                    <>
                      {" "}
                      Sign in <ArrowRight size={13} />{" "}
                    </>
                  )}
                </button>
              </form>

              <div
                style={{
                  margin: "24px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "hsl(var(--border))",
                  }}
                />
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "hsl(var(--muted-foreground))",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  or
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "hsl(var(--border))",
                  }}
                />
              </div>

              <Link
                to="/SignUp"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "40px",
                  background: "hsl(var(--card) / 0.6)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "7px",
                  fontSize: "13.5px",
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  color: "hsl(var(--foreground))",
                  textDecoration: "none",
                  transition: "background 0.12s ease, border-color 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "hsl(var(--secondary) / 0.7)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "hsl(var(--muted-foreground) / 0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "hsl(var(--card) / 0.6)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "hsl(var(--border))";
                }}
              >
                Create a new account
              </Link>

              <p
                style={{
                  textAlign: "center",
                  marginTop: "24px",
                  fontSize: "11.5px",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.6,
                }}
              >
                By signing in you agree to our Terms of Service.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
