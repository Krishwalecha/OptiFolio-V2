import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { Trash2, AlertCircle, Loader2, Plus, Download } from "lucide-react";
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
import type { PortfolioGroup, PortfolioStock } from "@/features/portfolios/types";
import { API_BASE, exportCSV } from "@/features/portfolios/config";
import PortfolioSessionGroup from "@/components/portfolios/PortfolioSessionGroup";

const PageBackground: React.FC = () => (
  <>
    <div
      className="dark:hidden"
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(to right, rgba(229,231,235,0.8) 1px, transparent 1px), linear-gradient(to bottom, rgba(229,231,235,0.8) 1px, transparent 1px), radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.3), transparent), radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.3), transparent)`,
        backgroundSize: "48px 48px, 48px 48px, 100% 100%, 100% 100%",
      }}
    />
    <div
      className="hidden dark:block"
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(to right, rgba(71,85,105,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(71,85,105,0.2) 1px, transparent 1px), radial-gradient(circle 500px at 20% 100%, rgba(139,92,246,0.25), transparent), radial-gradient(circle 500px at 100% 80%, rgba(59,130,246,0.2), transparent)`,
        backgroundSize: "48px 48px, 48px 48px, 100% 100%, 100% 100%",
      }}
    />
  </>
);

const Portfolios: React.FC = () => {
  const { isLoggedIn, userId, userName } = useAuth();
  const [groups, setGroups] = useState<PortfolioGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PortfolioStock | null>(null);
  const [deleteSessionOpen, setDeleteSessionOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

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
      if (!raw?.length) { setGroups([]); return; }

      const loaded: PortfolioGroup[] = raw.map((group: any) => {
        const stocks: PortfolioStock[] = (group.tickers || []).map((item: any) => {
          const tickerStr: string = typeof item === "string" ? item : item.ticker;
          const allocation: number = typeof item === "string" ? 0 : parseFloat(item.allocation) || 0;
          const investedInr: number = typeof item === "string" ? 0 : parseFloat(item.invested_inr) || 0;
          return { ticker: tickerStr, dbTicker: tickerStr, allocation, investedInr, sessionId: group.sessionId || group.date };
        });
        const totalAlloc = stocks.reduce((s, st) => s + st.allocation, 0);
        if (totalAlloc === 0) {
          const even = 100 / stocks.length;
          stocks.forEach((s) => { s.allocation = even; });
        }
        return { date: group.date, sessionId: group.sessionId || group.date, stocks };
      }).filter((g: PortfolioGroup) => g.stocks.length > 0);

      setGroups(loaded);
    } catch {
      setError("Failed to load portfolios. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPortfolios(); }, [isLoggedIn, userId]);

  const handleDeleteConfirm = async () => {
    if (!toDelete || !userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/deletePortfolio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: toDelete.dbTicker, userId, sessionId: toDelete.sessionId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          stocks: g.stocks.filter((s) => !(s.dbTicker === toDelete.dbTicker && s.sessionId === toDelete.sessionId)),
        })).filter((g) => g.stocks.length > 0),
      );
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleteOpen(false);
      setToDelete(null);
    }
  };

  const handleDeleteRequest = (stock: PortfolioStock) => {
    setToDelete(stock);
    setDeleteOpen(true);
  };

  const handleDeleteSessionRequest = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteSessionOpen(true);
  };

  const handleDeleteSessionConfirm = async () => {
    if (!sessionToDelete || !userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/deleteSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sessionId: sessionToDelete }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setGroups((prev) => prev.filter((g) => g.sessionId !== sessionToDelete));
    } catch (err) {
      alert(`Failed to delete session: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleteSessionOpen(false);
      setSessionToDelete(null);
    }
  };

  const totalHoldings = groups.reduce((s, g) => s + g.stocks.length, 0);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading)
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(var(--background))", position: "relative" }}>
        <PageBackground />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
          <Navbar />
          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
            <Loader2 size={28} style={{ color: "hsl(var(--muted-foreground))", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>Loading portfolios…</p>
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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(var(--background))", position: "relative" }}>
        <PageBackground />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
          <Navbar />
          <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
            <div style={{ maxWidth: "360px", width: "100%", padding: "24px", background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "10px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <AlertCircle size={16} style={{ color: "var(--red)", flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.6 }}>
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(var(--background))", position: "relative" }}>
      <PageBackground />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        <Navbar />

        <main style={{ flex: 1 }}>
          <section style={{ padding: "56px 24px", maxWidth: "1100px", margin: "0 auto" }}>

            {/* Page header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: "48px" }}
            >
              <p className="mono-label" style={{ marginBottom: "6px" }}>Your portfolios</p>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
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
                  <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                    {totalHoldings} {totalHoldings === 1 ? "holding" : "holdings"} across{" "}
                    {groups.length} {groups.length === 1 ? "session" : "sessions"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => (window.location.href = "/Optimizer")}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "8px 14px", background: "hsl(var(--foreground))",
                      color: "hsl(var(--background))", border: "none",
                      borderRadius: "7px", fontSize: "13px", fontWeight: 500,
                      cursor: "pointer", fontFamily: "'Inter', sans-serif",
                      transition: "opacity 0.12s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <Plus size={13} /> New optimization
                  </button>
                  {groups.length > 0 && (
                    <button
                      onClick={() => exportCSV(groups)}
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "8px 14px", background: "transparent",
                        border: "1px solid hsl(var(--border))", borderRadius: "7px",
                        fontSize: "13px", fontWeight: 400, cursor: "pointer",
                        color: "hsl(var(--muted-foreground))", fontFamily: "'Inter', sans-serif",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--muted)/0.3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <Download size={13} /> Export CSV
                    </button>
                  )}
                </div>
              </div>

            </motion.div>

            {/* Empty state */}
            {groups.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", padding: "64px 24px", background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px dashed hsl(var(--border))", borderRadius: "10px" }}
              >
                <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))", marginBottom: "16px", fontWeight: 300 }}>
                  No portfolios yet. Start by optimizing your first portfolio.
                </p>
                <a
                  href="/"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", borderRadius: "7px", textDecoration: "none", fontSize: "13.5px", fontWeight: 500, transition: "opacity 0.12s ease" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                >
                  Optimize portfolio
                </a>
              </motion.div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <AnimatePresence mode="popLayout">
                  {groups.map((group, gi) => (
                    <PortfolioSessionGroup
                      key={group.sessionId}
                      group={group}
                      index={gi}
                      defaultExpanded={gi === 0}
                      onDelete={handleDeleteRequest}
                      onDeleteSession={handleDeleteSessionRequest}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </main>

        <Separator />
        <Footer />

        {/* Delete session confirm dialog */}
        <AlertDialog open={deleteSessionOpen} onOpenChange={setDeleteSessionOpen}>
          <AlertDialogContent
            style={{
              background: "hsl(var(--card) / 0.8)", backdropFilter: "blur(12px)",
              border: "1px solid hsl(var(--border))", borderRadius: "10px",
              padding: "24px", maxWidth: "380px",
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "-0.015em" }}>
                Delete this session?
              </AlertDialogTitle>
              <AlertDialogDescription style={{ fontSize: "13.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.6 }}>
                All {groups.find((g) => g.sessionId === sessionToDelete)?.stocks.length ?? 0} holdings in this session will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <AlertDialogCancel style={{ height: "36px", padding: "0 14px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "7px", fontSize: "13px", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontFamily: "'Inter', sans-serif" }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSessionConfirm}
                style={{ height: "36px", padding: "0 14px", background: "#ef4444", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#fff", fontFamily: "'Inter', sans-serif" }}
              >
                <Trash2 size={12} style={{ marginRight: "5px" }} /> Delete session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirm dialog */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent
            style={{
              background: "hsl(var(--card) / 0.8)", backdropFilter: "blur(12px)",
              border: "1px solid hsl(var(--border))", borderRadius: "10px",
              padding: "24px", maxWidth: "380px",
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle style={{ fontSize: "15px", fontWeight: 500, letterSpacing: "-0.015em" }}>
                Remove {toDelete?.ticker}?
              </AlertDialogTitle>
              <AlertDialogDescription style={{ fontSize: "13.5px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.6 }}>
                This permanently removes the holding from your portfolio and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <AlertDialogCancel
                style={{ height: "36px", padding: "0 14px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "7px", fontSize: "13px", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                style={{ height: "36px", padding: "0 14px", background: "#ef4444", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#fff", fontFamily: "'Inter', sans-serif" }}
              >
                <Trash2 size={12} style={{ marginRight: "5px" }} /> Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Portfolios;
