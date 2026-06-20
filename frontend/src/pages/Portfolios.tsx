import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Trash2, AlertCircle, Loader2 } from "lucide-react";
import StockChart from "@/components/StockChart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Plus, X } from "lucide-react";
import { useRef } from "react";

interface PortfolioStock {
  ticker: string;
  dbTicker: string; // raw ticker as stored in DB — used for deletes
  allocation: number;
  filePath: string;
}

interface PortfolioGroup {
  date: string;
  stocks: PortfolioStock[];
}
interface ApiTicker {
  ticker: string;
  allocation: number;
}

const fmtDate = (s: string) => {
  const d = new Date(s),
    t = new Date(),
    y = new Date(t);
  y.setDate(y.getDate() - 1);
  [d, t, y].forEach((x) => x.setHours(0, 0, 0, 0));
  if (d.getTime() === t.getTime()) return "Today";
  if (d.getTime() === y.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const API_BASE = import.meta.env.VITE_API_URL;

const Portfolios: React.FC = () => {
  const { isLoggedIn, userId, userName } = useAuth();
  const [groups, setGroups] = useState<PortfolioGroup[]>([]);
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{
    ticker: string;
    filePath: string;
  } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const loadPortfolios = async () => {
    if (!isLoggedIn || !userId) {
      setError("Please sign in to view your portfolios.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/userPortfolios/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const { portfolioGroups: raw } = await res.json();
      if (!raw?.length) {
        setGroups([]);
        setIsLoading(false);
        return;
      }

      const mods = import.meta.glob("../../stock_data/*_data.json");
      const loaded: PortfolioGroup[] = [];

      for (const group of raw) {
        const stocks: PortfolioStock[] = [];
        for (const item of group.tickers) {
          const tickerStr: string =
            typeof item === "string" ? item : item.ticker;
          const allocation: number =
            typeof item === "string" ? 0 : parseFloat(item.allocation) || 0;
          for (const modPath in mods) {
            const file = modPath.split("/").pop() || "";
            if (file.split("_")[0].toUpperCase() === tickerStr.toUpperCase()) {
              try {
                const m: any = await mods[modPath]();
                stocks.push({
                  ticker: m?.default?.ticker || tickerStr,
                  dbTicker: tickerStr, // always the raw DB value
                  allocation,
                  filePath: modPath,
                });
                break;
              } catch {}
            }
          }
        }
        if (stocks.length) {
          const totalAlloc = stocks.reduce((s, st) => s + st.allocation, 0);
          if (totalAlloc === 0) {
            const even = 100 / stocks.length;
            stocks.forEach((s) => {
              s.allocation = even;
            });
          }
          loaded.push({ date: group.date, stocks });
        }
      }
      setGroups(loaded);
    } catch {
      setError("Failed to load portfolios. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const exportCSV = () => {
    const rows = [["Date", "Ticker", "Allocation (%)"]];
    groups.forEach((g) =>
      g.stocks.forEach((s) =>
        rows.push([g.date, s.ticker, s.allocation.toFixed(2)]),
      ),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddStock = async () => {
    if (!newTicker.trim() || !userId) return;
    setIsAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`${API_BASE}/api/addPortfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: newTicker.trim().toUpperCase(),
          userId,
        }),
      });
      if (!res.ok) throw new Error("Failed to add stock");
      setAddOpen(false);
      setNewTicker("");
      await loadPortfolios();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsAdding(false);
    }
  };
  useEffect(() => {
    loadPortfolios();
  }, [isLoggedIn, userId]);

  const handleDeleteConfirm = async () => {
    if (!toDelete || !userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/deletePortfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: toDelete.ticker, userId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setGroups((prev) =>
        prev
          .map((g) => ({
            ...g,
            stocks: g.stocks.filter((s) => s.ticker !== toDelete.ticker),
          }))
          .filter((g) => g.stocks.length > 0),
      );
    } catch (err) {
      alert(
        `Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setDeleteOpen(false);
      setToDelete(null);
    }
  };

  const totalHoldings = groups.reduce((s, g) => s + g.stocks.length, 0);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading)
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
          <main
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <Loader2
              size={28}
              style={{
                color: "hsl(var(--muted-foreground))",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p
              style={{
                fontSize: "14px",
                color: "hsl(var(--muted-foreground))",
                fontWeight: 300,
              }}
            >
              Loading portfolios…
            </p>
          </main>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <Separator />
          <Footer />
        </div>
      </div>
    );

  // ── Error / not signed in ─────────────────────────────────────────────────
  if (!isLoggedIn || error)
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
          <main
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <div
              style={{
                maxWidth: "360px",
                width: "100%",
                padding: "24px",
                background: "hsl(var(--card) / 0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
              }}
            >
              <AlertCircle
                size={16}
                style={{ color: "var(--red)", flexShrink: 0, marginTop: "1px" }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                {error || "Please sign in to view your portfolios."}
              </p>
            </div>
          </main>
          <Separator />
          <Footer />
        </div>
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
              padding: "56px 24px",
              maxWidth: "1100px",
              margin: "0 auto",
            }}
          >
            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: "48px" }}
            >
              <p className="mono-label" style={{ marginBottom: "6px" }}>
                Your portfolios
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <h1
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                      fontWeight: 400,
                      letterSpacing: "-0.03em",
                      color: "hsl(var(--foreground))",
                      marginBottom: "6px",
                    }}
                  >
                    {userName ? `${userName}'s` : "Your"} portfolios
                  </h1>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: 300,
                    }}
                  >
                    {totalHoldings}{" "}
                    {totalHoldings === 1 ? "holding" : "holdings"} across{" "}
                    {groups.length}{" "}
                    {groups.length === 1 ? "session" : "sessions"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => (window.location.href = "/Optimizer")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      background: "hsl(var(--foreground))",
                      color: "hsl(var(--background))",
                      border: "none",
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      transition: "opacity 0.12s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.8")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <Plus size={13} /> Add stock
                  </button>
                  {groups.length > 0 && (
                    <button
                      onClick={exportCSV}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        background: "transparent",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "7px",
                        fontSize: "13px",
                        fontWeight: 400,
                        cursor: "pointer",
                        color: "hsl(var(--muted-foreground))",
                        fontFamily: "'Inter', sans-serif",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "hsl(var(--muted)/0.3)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <Download size={13} /> Export CSV
                    </button>
                  )}
                </div>
              </div>

              {/* ── Allocation summary bar ── */}
              {groups.length > 0 &&
                (() => {
                  const all = groups.flatMap((g) => g.stocks);
                  const total = all.reduce((s, st) => s + st.allocation, 0);
                  const colors = [
                    "#8b5cf6",
                    "#3b82f6",
                    "#10b981",
                    "#f59e0b",
                    "#ef4444",
                    "#ec4899",
                    "#06b6d4",
                    "#84cc16",
                  ];
                  return (
                    <div style={{ marginTop: "24px" }}>
                      <p
                        style={{
                          fontSize: "11px",
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "hsl(var(--muted-foreground))",
                          letterSpacing: "0.06em",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                        }}
                      >
                        Allocation across all holdings
                      </p>
                      <div
                        style={{
                          display: "flex",
                          height: "8px",
                          borderRadius: "99px",
                          overflow: "hidden",
                          gap: "1px",
                        }}
                      >
                        {all.map((st, i) => (
                          <div
                            key={`${st.ticker}-${i}`}
                            title={`${st.ticker} — ${((st.allocation / total) * 100).toFixed(1)}%`}
                            style={{
                              flex: st.allocation,
                              background: colors[i % colors.length],
                              transition: "flex 0.4s ease",
                            }}
                          />
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px 18px",
                          marginTop: "10px",
                        }}
                      >
                        {all.map((st, i) => (
                          <div
                            key={`${st.ticker}-leg-${i}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <div
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "2px",
                                background: colors[i % colors.length],
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: "12px",
                                color: "hsl(var(--muted-foreground))",
                                fontWeight: 300,
                              }}
                            >
                              {st.ticker}{" "}
                              <span
                                style={{
                                  fontFamily: "'JetBrains Mono', monospace",
                                  fontSize: "11px",
                                }}
                              >
                                {((st.allocation / total) * 100).toFixed(1)}%
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
            </motion.div>

            {/* Empty state */}
            {groups.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  textAlign: "center",
                  padding: "64px 24px",
                  background: "hsl(var(--card) / 0.6)",
                  backdropFilter: "blur(8px)",
                  border: "1px dashed hsl(var(--border))",
                  borderRadius: "10px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: "hsl(var(--muted-foreground))",
                    marginBottom: "16px",
                    fontWeight: 300,
                  }}
                >
                  No portfolios yet. Start by optimizing your first portfolio.
                </p>
                <a
                  href="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    borderRadius: "7px",
                    textDecoration: "none",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    transition: "opacity 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                >
                  Optimize portfolio
                </a>
              </motion.div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "48px",
                }}
              >
                <AnimatePresence mode="popLayout">
                  {groups.map((group, gi) => (
                    <motion.div
                      key={group.date}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4, delay: gi * 0.06 }}
                    >
                      {/* Date header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "20px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            letterSpacing: "-0.01em",
                            color: "hsl(var(--foreground))",
                          }}
                        >
                          {fmtDate(group.date)}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: "1px",
                            background: "hsl(var(--border))",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {group.stocks.length}{" "}
                          {group.stocks.length === 1 ? "stock" : "stocks"}
                        </span>
                      </div>

                      {/* Stocks grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "12px",
                        }}
                      >
                        <AnimatePresence mode="popLayout">
                          {group.stocks.map((stock, si) => (
                            <motion.div
                              key={`${group.date}-${stock.ticker}`}
                              initial={{ opacity: 0, scale: 0.96 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.94 }}
                              transition={{ duration: 0.3, delay: si * 0.04 }}
                              style={{ position: "relative" }}
                              onMouseEnter={() =>
                                setHoveredStock(`${group.date}-${stock.ticker}`)
                              }
                              onMouseLeave={() => setHoveredStock(null)}
                            >
                              <StockChart
                                ticker={stock.ticker}
                                allocation={stock.allocation}
                              />
                              <AnimatePresence>
                                {hoveredStock ===
                                  `${group.date}-${stock.ticker}` && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      background: "rgba(0,0,0,0.55)",
                                      backdropFilter: "blur(4px)",
                                      borderRadius: "10px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      zIndex: 10,
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        setToDelete({
                                          ticker: stock.dbTicker,
                                          filePath: stock.filePath,
                                        });
                                        setDeleteOpen(true);
                                      }}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "8px 16px",
                                        background: "#ef4444",
                                        border: "none",
                                        borderRadius: "7px",
                                        fontSize: "13px",
                                        fontWeight: 500,
                                        color: "#fff",
                                        cursor: "pointer",
                                        fontFamily: "'Inter', sans-serif",
                                        transition: "opacity 0.12s ease",
                                      }}
                                      onMouseEnter={(e) =>
                                        (e.currentTarget.style.opacity = "0.85")
                                      }
                                      onMouseLeave={(e) =>
                                        (e.currentTarget.style.opacity = "1")
                                      }
                                    >
                                      <Trash2 size={13} />
                                      Delete
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </main>

        <Separator />
        <Footer />

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent
            style={{
              background: "hsl(var(--card) / 0.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "380px",
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  letterSpacing: "-0.015em",
                }}
              >
                Delete {toDelete?.ticker}?
              </AlertDialogTitle>
              <AlertDialogDescription
                style={{
                  fontSize: "13.5px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  lineHeight: 1.6,
                }}
              >
                This permanently removes the portfolio data and cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter
              style={{
                marginTop: "20px",
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <AlertDialogCancel
                style={{
                  height: "36px",
                  padding: "0 14px",
                  background: "transparent",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "7px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "hsl(var(--muted-foreground))",
                  transition: "background 0.12s ease",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  color: "#fff",
                  fontFamily: "'Inter', sans-serif",
                  transition: "opacity 0.12s ease",
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* ── Add Stock Modal ── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => {
              setAddOpen(false);
              setAddError(null);
              setNewTicker("");
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                padding: "24px",
                width: "100%",
                maxWidth: "340px",
                boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Add stock
                </h2>
                <button
                  onClick={() => {
                    setAddOpen(false);
                    setAddError(null);
                    setNewTicker("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "hsl(var(--muted-foreground))",
                    padding: "2px",
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <input
                autoFocus
                placeholder="Ticker symbol — e.g. AAPL"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleAddStock()}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "7px",
                  fontSize: "13px",
                  color: "hsl(var(--foreground))",
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none",
                  boxSizing: "border-box",
                  marginBottom: addError ? "8px" : "16px",
                }}
              />
              {addError && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#ef4444",
                    marginBottom: "12px",
                    fontWeight: 300,
                  }}
                >
                  {addError}
                </p>
              )}
              <button
                onClick={handleAddStock}
                disabled={isAdding || !newTicker.trim()}
                style={{
                  width: "100%",
                  padding: "9px",
                  background: "hsl(var(--foreground))",
                  color: "hsl(var(--background))",
                  border: "none",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor:
                    isAdding || !newTicker.trim() ? "not-allowed" : "pointer",
                  opacity: isAdding || !newTicker.trim() ? 0.5 : 1,
                  fontFamily: "'Inter', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "opacity 0.12s ease",
                }}
              >
                {isAdding ? (
                  <Loader2
                    size={13}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                ) : (
                  <Plus size={13} />
                )}
                {isAdding ? "Adding…" : "Add stock"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Portfolios;
