import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Check, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL;
const SignUp: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const passMatch =
    form.password && form.confirm && form.password === form.confirm;
  const passMismatch = form.confirm && form.password !== form.confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.confirm)
      return setError("All fields are required.");
    if (form.password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirm)
      return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign up failed.");
      } else {
        setSuccess(true);
        setTimeout(() => navigate("/SignIn"), 1800);
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

  const label = (text: string) => (
    <label
      style={{
        fontSize: "12.5px",
        fontWeight: 500,
        letterSpacing: "-0.01em",
        color: "hsl(var(--foreground))",
      }}
    >
      {text}
    </label>
  );

  if (success)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "hsl(var(--background))",
          position: "relative",
        }}
      >
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
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          style={{ textAlign: "center", position: "relative", zIndex: 1 }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "var(--green-subtle)",
              border: "1px solid var(--green-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "var(--green)",
            }}
          >
            <Check size={20} />
          </div>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              marginBottom: "8px",
              color: "hsl(var(--foreground))",
            }}
          >
            Account created
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "hsl(var(--muted-foreground))",
              fontWeight: 300,
            }}
          >
            Redirecting you to sign in…
          </p>
        </motion.div>
      </div>
    );

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
            to="/SignIn"
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
            Sign in instead →
          </Link>
        </div>

        {/* Main layout */}
        <div style={{ flex: 1, display: "flex" }}>
          {/* ── Left: form ── */}
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
                  Create account
                </h1>
                <p
                  style={{
                    fontSize: "14px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                  }}
                >
                  Start optimizing your portfolio today.
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
                  {label("Full name")}
                  <input
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                    disabled={loading}
                    style={fieldStyle("name")}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {label("Email")}
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
                  {label("Password")}
                  <div style={{ position: "relative" }}>
                    <input
                      name="password"
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 6 characters"
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
                      onClick={() => setShowPass((v) => !v)}
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
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {form.password && (
                    <div
                      style={{ display: "flex", gap: "4px", marginTop: "2px" }}
                    >
                      {[6, 9, 12].map((threshold, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: "2px",
                            borderRadius: "99px",
                            background:
                              form.password.length >= threshold
                                ? i === 0
                                  ? "var(--red)"
                                  : i === 1
                                    ? "var(--amber)"
                                    : "var(--green)"
                                : "hsl(var(--muted))",
                            transition: "background 0.2s ease",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {label("Confirm password")}
                  <div style={{ position: "relative" }}>
                    <input
                      name="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={form.confirm}
                      onChange={handleChange}
                      onFocus={() => setFocused("confirm")}
                      onBlur={() => setFocused(null)}
                      disabled={loading}
                      style={{
                        ...fieldStyle("confirm"),
                        paddingRight: "40px",
                        borderColor: passMismatch
                          ? "var(--red-border)"
                          : passMatch
                            ? "var(--green-border)"
                            : fieldStyle("confirm").borderColor,
                      }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
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
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {passMatch && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "var(--green)",
                      }}
                    >
                      <Check size={12} /> Passwords match
                    </div>
                  )}
                  {passMismatch && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "var(--red)",
                      }}
                    >
                      <X size={12} /> Passwords don't match
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
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
                    "Creating account…"
                  ) : (
                    <>
                      {" "}
                      Create account <ArrowRight size={13} />{" "}
                    </>
                  )}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  marginTop: "24px",
                  fontSize: "11.5px",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.6,
                }}
              >
                By creating an account you agree to our Terms of Service.
              </p>
            </motion.div>
          </div>

          {/* ── Right illustration panel ── */}
          <div
            style={{
              flex: 1,
              display: "none",
              position: "relative",
              overflow: "hidden",
              borderLeft: "1px solid hsl(var(--border))",
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
                  width: "100%",
                  maxWidth: "320px",
                  marginBottom: "40px",
                }}
              >
                {[
                  {
                    num: "01",
                    title: "Enter stocks",
                    desc: "Any NSE / BSE ticker, verified live.",
                    color: "rgba(139,92,246,0.7)",
                  },
                  {
                    num: "02",
                    title: "Set risk profile",
                    desc: "Manual or AI-computed from your data.",
                    color: "rgba(59,130,246,0.7)",
                  },
                  {
                    num: "03",
                    title: "Get allocation",
                    desc: "Optimal weights, return & volatility.",
                    color: "rgba(34,197,94,0.7)",
                  },
                ].map((step, i) => (
                  <div key={step.num} style={{ display: "flex", gap: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${step.color} 40%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "9px",
                            color: step.color,
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {step.num}
                        </span>
                      </div>
                      {i < 2 && (
                        <div
                          style={{
                            width: "1px",
                            height: "36px",
                            background: "hsl(var(--border))",
                            margin: "4px 0",
                          }}
                        />
                      )}
                    </div>
                    <div style={{ paddingTop: "4px", flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13.5px",
                          fontWeight: 500,
                          color: "hsl(var(--foreground))",
                          marginBottom: "4px",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {step.title}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 300,
                          lineHeight: 1.55,
                          marginBottom: i < 2 ? "8px" : "0",
                        }}
                      >
                        {step.desc}
                      </div>
                    </div>
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
                  Free to start,{" "}
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    instant results
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
                  Join thousands of investors building smarter portfolios with
                  data-driven allocation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
