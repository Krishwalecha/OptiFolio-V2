import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  IndianRupee,
  Percent,
  Calendar,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Target,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  Download,
  Bookmark,
  Trash2,
  Plus,
  Calculator,
  History,
  X,
} from "lucide-react";
import { useMF, CATEGORIES, FundData } from "@/context/MFContext";
import FundNavChart from "@/components/charts/FundNavChart";

import type { SavedCalc } from "@/features/sip/types";
import { GOAL_PRESETS, RISK_PROFILES } from "@/features/sip/config";
import { formatINR, readSaved, writeSaved, calcStepUp, downloadPDF } from "@/features/sip/utils";
import BreakdownChart from "@/components/sip/BreakdownChart";
import HybridPanel from "@/components/sip/HybridPanel";
import SavedPanel from "@/components/sip/SavedPanel";

export default function SIPCalculator() {
  const { funds, loading: fundsLoading, error: fundsError } = useMF();

  const [monthly, setMonthly] = useState("10000");
  const [rate, setRate] = useState("12");
  const [years, setYears] = useState("10");
  const [stepUp, setStepUp] = useState("0");
  const [inflation, setInflation] = useState("6");
  const [focused, setFocused] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [showFunds, setShowFunds] = useState(false);
  const [showHybrid, setShowHybrid] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedFund, setSelectedFund] = useState<FundData | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "stepup" | "goal">("basic");
  const [goalTarget, setGoalTarget] = useState("");
  const [riskProfile, setRiskProfile] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedCalc[]>(() => readSaved());
  const [saveLabel, setSaveLabel] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    height: "40px",
    padding: "0 12px",
    background: "hsl(var(--card) / 0.6)",
    backdropFilter: "blur(8px)",
    border: `1px solid ${focused === name ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))"}`,
    borderRadius: "7px",
    fontSize: "14px",
    letterSpacing: "-0.01em",
    color: "hsl(var(--foreground))",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxShadow: focused === name ? "0 0 0 3px hsl(var(--foreground) / 0.06)" : "none",
    boxSizing: "border-box",
  });

  const fieldWrap = (
    id: string,
    label: string,
    icon: React.ReactNode,
    input: React.ReactNode,
    hint?: string,
  ) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "12.5px",
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: "hsl(var(--foreground))",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {icon} {label}
        {hint && (
          <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300, marginLeft: "auto" }}>
            {hint}
          </span>
        )}
      </label>
      {input}
    </div>
  );

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const m = parseFloat(monthly), r = parseFloat(rate), y = parseFloat(years);
    const su = parseFloat(stepUp) || 0, inf = parseFloat(inflation) || 0;
    if (!m || m <= 0) return setError("Enter a valid monthly investment.");
    if (!r || r <= 0 || r > 100) return setError("Enter a valid return rate (0–100%).");
    if (!y || y <= 0) return setError("Enter a valid investment period.");
    if (activeTab === "goal") {
      const gt = parseFloat(goalTarget);
      if (!gt || gt <= 0) return setError("Enter a valid goal target amount.");
      const mr = r / 12 / 100, n = y * 12;
      const reqSIP = gt / (((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr));
      const { maturity, invested } = calcStepUp(m, r, y, su);
      const realMaturity = maturity / Math.pow(1 + inf / 100, y);
      setResult({
        mode: "goal", invested, maturity,
        returns: maturity - invested,
        realMaturity: Math.round(realMaturity),
        requiredSIP: Math.round(reqSIP),
        goalTarget: gt,
        shortfall: Math.max(0, Math.round(gt - maturity)),
        surplus: Math.max(0, Math.round(maturity - gt)),
        years: y,
      });
      return;
    }
    const { maturity, invested } = calcStepUp(m, r, y, su);
    const realMaturity = maturity / Math.pow(1 + inf / 100, y);
    const breakdown: { year: number; invested: number; maturity: number }[] = [];
    for (let yr = 1; yr <= Math.min(y, 30); yr++) {
      const res = calcStepUp(m, r, yr, su);
      breakdown.push({ year: yr, invested: res.invested, maturity: res.maturity });
    }
    setResult({
      mode: "basic", invested, maturity,
      returns: maturity - invested,
      realMaturity: Math.round(realMaturity),
      breakdown,
      multiplier: (maturity / invested).toFixed(2),
      years: y,
    });
  };

  const handleSave = () => {
    if (!result || !saveLabel.trim()) return;
    const newCalc: SavedCalc = {
      id: Date.now().toString(),
      label: saveLabel.trim(),
      mode: activeTab,
      monthly, rate, years, stepUp, inflation, goalTarget,
      lumpsum: "",
      result,
      savedAt: Date.now(),
    };
    const updated = [newCalc, ...saved].slice(0, 10);
    setSaved(updated);
    writeSaved(updated);
    setSaveLabel("");
    setShowSaveInput(false);
  };

  const handleLoad = (c: SavedCalc) => {
    setMonthly(c.monthly);
    setRate(c.rate);
    setYears(c.years);
    setStepUp(c.stepUp);
    setInflation(c.inflation);
    setGoalTarget(c.goalTarget);
    setActiveTab(c.mode as any);
    setResult(c.result);
    setShowSaved(false);
  };

  const handleDelete = (id: string) => {
    const updated = saved.filter((c) => c.id !== id);
    setSaved(updated);
    writeSaved(updated);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "hsl(var(--background))", position: "relative" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        <Navbar />
        <main style={{ flex: 1, padding: "56px 24px 80px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>

            {/* Header */}
            <div style={{ marginBottom: "40px" }}>
              <div style={{ marginBottom: "16px" }}>
                <span className="status-pill">Tool</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                <div>
                  <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", color: "hsl(var(--foreground))", marginBottom: "10px" }}>
                    SIP Calculator
                  </h1>
                  <p style={{ fontSize: "14px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.65 }}>
                    Plan investments with step-up SIP, goal planning.
                  </p>
                </div>
                <button
                  onClick={() => setShowSaved((v) => !v)}
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    background: showSaved ? "hsl(var(--foreground))" : "hsl(var(--card)/0.7)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${showSaved ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: showSaved ? "hsl(var(--background))" : "hsl(var(--foreground))",
                    transition: "all 0.15s",
                  }}
                >
                  <History size={13} />
                  Saved{" "}
                  {saved.length > 0 && (
                    <span style={{ fontSize: "11px", background: showSaved ? "hsl(var(--background)/0.2)" : "hsl(var(--secondary))", borderRadius: "99px", padding: "1px 6px" }}>
                      {saved.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Saved drawer */}
            <AnimatePresence>
              {showSaved && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden", marginBottom: "20px" }}
                >
                  <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "10px", overflow: "hidden", background: "hsl(var(--card)/0.6)", backdropFilter: "blur(8px)" }}>
                    <div style={{ padding: "12px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Bookmark size={13} />
                      <span style={{ fontSize: "13px", fontWeight: 500 }}>Saved Scenarios</span>
                      <button
                        onClick={() => setShowSaved(false)}
                        style={{ marginLeft: "auto", width: "24px", height: "24px", borderRadius: "5px", background: "transparent", border: "1px solid hsl(var(--border))", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <X size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
                      </button>
                    </div>
                    <SavedPanel saved={saved} onLoad={handleLoad} onDelete={handleDelete} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mode tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid hsl(var(--border))", marginBottom: "28px" }}>
              {(["basic", "stepup", "goal"] as const).map((tab) => {
                const labels = { basic: "Basic SIP", stepup: "Step-Up SIP", goal: "Goal Planner" };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setResult(null); setError(""); }}
                    style={{
                      padding: "8px 16px",
                      background: "none",
                      border: "none",
                      borderBottom: active ? "1.5px solid hsl(var(--foreground))" : "1.5px solid transparent",
                      marginBottom: "-1px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      fontWeight: active ? 500 : 400,
                      transition: "color 0.12s ease",
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Risk profile */}
              <div>
                <p style={{ fontSize: "12.5px", fontWeight: 500, marginBottom: "8px", color: "hsl(var(--foreground))" }}>Risk profile</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {RISK_PROFILES.map((rp) => (
                    <button
                      key={rp.key}
                      onClick={() => { setRiskProfile(rp.key); setRate(rp.rate); }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "7px",
                        cursor: "pointer",
                        textAlign: "left",
                        background: riskProfile === rp.key ? "hsl(var(--secondary) / 0.7)" : "hsl(var(--card) / 0.6)",
                        backdropFilter: "blur(8px)",
                        border: `1px solid ${riskProfile === rp.key ? "hsl(var(--foreground) / 0.2)" : "hsl(var(--border))"}`,
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div style={{ fontSize: "12.5px", fontWeight: 500, color: "hsl(var(--foreground))", marginBottom: "2px" }}>{rp.label}</div>
                      <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>{rp.desc}</div>
                      <div style={{ fontSize: "11px", fontWeight: 500, marginTop: "4px", color: "hsl(var(--foreground))" }}>~{rp.rate}% p.a.</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div style={{ background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", borderRadius: "10px", padding: "24px" }}>
                <form onSubmit={calculate} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {activeTab === "goal" && (
                    <>
                      <p style={{ fontSize: "12px", fontWeight: 500, color: "hsl(var(--muted-foreground))", margin: 0 }}>Quick goal presets</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginTop: "-8px" }}>
                        {GOAL_PRESETS.map((g) => (
                          <button
                            key={g.label}
                            type="button"
                            onClick={() => { setGoalTarget(g.target); setYears(g.years); setMonthly(g.monthly); }}
                            style={{ padding: "8px 10px", borderRadius: "6px", cursor: "pointer", textAlign: "left", background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "1px solid hsl(var(--border))", transition: "background 0.12s ease" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--card) / 0.6)")}
                          >
                            <div style={{ fontSize: "14px", marginBottom: "2px" }}>{g.icon}</div>
                            <div style={{ fontSize: "11px", fontWeight: 500, color: "hsl(var(--foreground))" }}>{g.label}</div>
                            <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                              ₹{(parseInt(g.target) / 100000).toFixed(0)}L
                            </div>
                          </button>
                        ))}
                      </div>
                      {fieldWrap(
                        "goalTarget", "Target Amount (₹)", <Target size={12} />,
                        <input
                          id="goalTarget" type="number" placeholder="e.g. 5000000" min="0"
                          value={goalTarget}
                          onChange={(e) => setGoalTarget(e.target.value)}
                          onFocus={() => setFocused("goalTarget")}
                          onBlur={() => setFocused(null)}
                          style={inputStyle("goalTarget")}
                        />,
                      )}
                    </>
                  )}

                  {fieldWrap(
                    "monthly", "Monthly Investment", <IndianRupee size={12} />,
                    <input
                      id="monthly" type="number" placeholder="e.g. 10000" min="0" step="500"
                      value={monthly}
                      onChange={(e) => setMonthly(e.target.value)}
                      onFocus={() => setFocused("monthly")}
                      onBlur={() => setFocused(null)}
                      style={inputStyle("monthly")}
                    />,
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {fieldWrap(
                      "rate", "Expected Return (%)", <Percent size={12} />,
                      <input
                        id="rate" type="number" placeholder="12" min="0" max="100" step="0.5"
                        value={rate}
                        onChange={(e) => { setRate(e.target.value); setRiskProfile(null); }}
                        onFocus={() => setFocused("rate")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("rate")}
                      />,
                    )}
                    {fieldWrap(
                      "years", "Period (years)", <Calendar size={12} />,
                      <input
                        id="years" type="number" placeholder="10" min="1" step="1"
                        value={years}
                        onChange={(e) => setYears(e.target.value)}
                        onFocus={() => setFocused("years")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("years")}
                      />,
                    )}
                  </div>

                  {(activeTab === "stepup" || activeTab === "goal") && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      {fieldWrap(
                        "stepup", "Annual Step-Up (%)", <TrendingUp size={12} />,
                        <input
                          id="stepup" type="number" placeholder="10" min="0" max="50" step="1"
                          value={stepUp}
                          onChange={(e) => setStepUp(e.target.value)}
                          onFocus={() => setFocused("stepup")}
                          onBlur={() => setFocused(null)}
                          style={inputStyle("stepup")}
                        />,
                        "% increase/yr",
                      )}
                      {fieldWrap(
                        "inflation", "Inflation (%)", <Info size={12} />,
                        <input
                          id="inflation" type="number" placeholder="6" min="0" max="20" step="0.5"
                          value={inflation}
                          onChange={(e) => setInflation(e.target.value)}
                          onFocus={() => setFocused("inflation")}
                          onBlur={() => setFocused(null)}
                          style={inputStyle("inflation")}
                        />,
                        "Real value adj.",
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ padding: "10px 14px", background: "var(--red-subtle)", border: "1px solid var(--red-border)", borderRadius: "7px", fontSize: "13px", color: "var(--red)" }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="submit"
                      style={{ flex: 1, height: "40px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "7px", fontSize: "13.5px", fontWeight: 500, letterSpacing: "-0.01em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "opacity 0.12s ease" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.82")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                    >
                      <Calculator size={13} /> Calculate <ArrowRight size={13} />
                    </button>
                    {result && (
                      <button
                        type="button"
                        onClick={() => { setResult(null); setMonthly("10000"); setRate("12"); setYears("10"); setStepUp("0"); setRiskProfile(null); setGoalTarget(""); }}
                        style={{ height: "40px", padding: "0 16px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "7px", fontSize: "13.5px", fontWeight: 400, cursor: "pointer", color: "hsl(var(--muted-foreground))", transition: "background 0.12s ease" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Results */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{ border: "1px solid hsl(var(--border))", borderRadius: "10px", overflow: "hidden", background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)" }}
                  >
                    {/* Result header */}
                    <div style={{ padding: "14px 20px", background: "hsl(var(--secondary) / 0.5)", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <TrendingUp size={14} />
                      <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "-0.01em" }}>
                        {result.mode === "goal" ? "Goal Analysis" : "Projection Summary"}
                      </span>
                      {result.mode === "basic" && (
                        <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                          {result.multiplier}× multiplier
                        </span>
                      )}
                      <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                        {!showSaveInput ? (
                          <button
                            onClick={() => setShowSaveInput(true)}
                            style={{ display: "flex", alignItems: "center", gap: "5px", height: "28px", padding: "0 10px", background: "hsl(var(--card)/0.7)", border: "1px solid hsl(var(--border))", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "hsl(var(--foreground))" }}
                          >
                            <Bookmark size={11} /> Save
                          </button>
                        ) : (
                          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                            <input
                              autoFocus
                              value={saveLabel}
                              onChange={(e) => setSaveLabel(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowSaveInput(false); }}
                              placeholder="Label this scenario…"
                              style={{ height: "28px", padding: "0 8px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", width: "160px" }}
                            />
                            <button
                              onClick={handleSave}
                              disabled={!saveLabel.trim()}
                              style={{ height: "28px", padding: "0 10px", background: "hsl(var(--foreground))", color: "hsl(var(--background))", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 500, opacity: saveLabel.trim() ? 1 : 0.4 }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShowSaveInput(false)}
                              style={{ height: "28px", width: "28px", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <X size={11} style={{ color: "hsl(var(--muted-foreground))" }} />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => downloadPDF({ monthly, rate, years, result, mode: activeTab, stepUp, inflation })}
                          style={{ display: "flex", alignItems: "center", gap: "5px", height: "28px", padding: "0 10px", background: "hsl(var(--card)/0.7)", border: "1px solid hsl(var(--border))", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "hsl(var(--foreground))" }}
                        >
                          <Download size={11} /> Export
                        </button>
                      </div>
                    </div>

                    {result.mode === "goal" && (
                      <div
                        style={{
                          padding: "12px 20px",
                          background: result.shortfall > 0 ? "color-mix(in srgb, #ef4444 8%, transparent)" : "color-mix(in srgb, #22c55e 8%, transparent)",
                          borderBottom: "1px solid hsl(var(--border))",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: 500, color: result.shortfall > 0 ? "#ef4444" : "#22c55e" }}>
                          {result.shortfall > 0 ? "⚠ Shortfall detected" : "✓ Goal achievable"}
                        </div>
                        <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300, marginTop: "2px" }}>
                          {result.shortfall > 0
                            ? `Need ${formatINR(result.requiredSIP)}/mo to reach goal`
                            : `Surplus of ${formatINR(result.surplus)} at maturity`}
                        </div>
                      </div>
                    )}

                    {[
                      { label: "Total invested", value: formatINR(result.invested), color: undefined, bold: false },
                      { label: "Estimated returns", value: formatINR(result.returns), color: "#22c55e", bold: false },
                      { label: "Maturity value", value: formatINR(result.maturity), color: undefined, bold: true },
                      ...(activeTab !== "basic" ? [{ label: `Real value (${inflation}% infl.)`, value: formatINR(result.realMaturity), color: "#f59e0b", bold: false }] : []),
                      ...(result.mode === "goal" ? [{ label: "Required SIP", value: `${formatINR(result.requiredSIP)}/mo`, color: result.shortfall > 0 ? "#ef4444" : "#22c55e", bold: false }] : []),
                    ].map((row, i, arr) => (
                      <div
                        key={row.label}
                        style={{ padding: "16px 20px", borderBottom: i < arr.length - 1 ? "1px solid hsl(var(--border))" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <span style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>{row.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: row.bold ? "16px" : "13.5px", fontWeight: row.bold ? 600 : 400, color: row.color || "hsl(var(--foreground))", letterSpacing: "-0.02em" }}>
                          {row.value}
                        </span>
                      </div>
                    ))}

                    {result.breakdown && <BreakdownChart breakdown={result.breakdown} />}

                    <div style={{ padding: "12px 20px", background: "hsl(var(--secondary) / 0.5)" }}>
                      <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", lineHeight: 1.6, fontWeight: 300, margin: 0 }}>
                        {activeTab === "stepup"
                          ? `Step-up at ${stepUp}%/yr · ${rate}% p.a. · ${years} yrs · ${inflation}% inflation adj.`
                          : `Compounded monthly at ${rate}% p.a. over ${years} years. Actual returns may vary.`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hybrid panel toggle */}
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "10px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setShowHybrid((v) => !v)}
                  style={{ width: "100%", padding: "14px 20px", background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "background 0.12s ease" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--card) / 0.6)")}
                >
                  <Plus size={14} />
                  <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "-0.01em", color: "hsl(var(--foreground))" }}>Lumpsum + SIP (Hybrid)</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>One-time + monthly combo</span>
                  {showHybrid ? <ChevronUp size={14} style={{ color: "hsl(var(--muted-foreground))" }} /> : <ChevronDown size={14} style={{ color: "hsl(var(--muted-foreground))" }} />}
                </button>
                <AnimatePresence>
                  {showHybrid && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
                      <HybridPanel rate={rate} years={years} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Top funds */}
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "10px", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setShowFunds((v) => { if (v) setSelectedFund(null); return !v; })}
                  style={{ width: "100%", padding: "14px 20px", background: "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "background 0.12s ease" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "hsl(var(--card) / 0.6)")}
                >
                  <Sparkles size={14} />
                  <span style={{ fontSize: "13px", fontWeight: 500, letterSpacing: "-0.01em", color: "hsl(var(--foreground))" }}>Top funds by 5Y CAGR</span>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                    {fundsLoading ? "Loading…" : funds.length > 0 ? `${funds.length} funds · Live AMFI data` : "Live AMFI data"}
                  </span>
                  {showFunds ? <ChevronUp size={14} style={{ color: "hsl(var(--muted-foreground))" }} /> : <ChevronDown size={14} style={{ color: "hsl(var(--muted-foreground))" }} />}
                </button>
                <AnimatePresence>
                  {showFunds && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden" }}>
                      <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
                        {fundsLoading && (
                          <div style={{ padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                            <Loader2 size={18} style={{ color: "hsl(var(--muted-foreground))", animation: "spin 0.8s linear infinite" }} />
                            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", fontWeight: 300, margin: 0 }}>Fetching &amp; ranking funds…</p>
                          </div>
                        )}
                        {!fundsLoading && fundsError && (
                          <div style={{ padding: "20px", fontSize: "13px", color: "var(--red)", textAlign: "center" }}>{fundsError}</div>
                        )}
                        {!fundsLoading && !fundsError && funds.length > 0 && (
                          <>
                            {CATEGORIES.map((cat) => {
                              const catFunds = funds.filter((f) => f.category === cat.key);
                              if (!catFunds.length) return null;
                              return (
                                <div key={cat.key}>
                                  <div style={{ padding: "8px 20px", background: "hsl(var(--secondary) / 0.5)", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: cat.color }} />
                                    <span style={{ fontSize: "11.5px", fontWeight: 500, color: "hsl(var(--foreground))" }}>{cat.key}</span>
                                  </div>
                                  {catFunds.map((fund) => {
                                    const isSelected = selectedFund?.schemeCode === fund.schemeCode;
                                    return (
                                      <React.Fragment key={fund.schemeCode}>
                                        <div
                                          style={{ padding: "16px 20px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", background: isSelected ? "hsl(var(--secondary) / 0.7)" : "hsl(var(--card) / 0.6)", backdropFilter: "blur(8px)", cursor: "pointer", transition: "background 0.12s ease", borderLeft: isSelected ? `2px solid ${fund.color}` : "2px solid transparent" }}
                                          onClick={() => { setRate(fund.cagr5y.toFixed(1)); setRiskProfile(null); setSelectedFund((prev) => prev?.schemeCode === fund.schemeCode ? null : fund); }}
                                          onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "hsl(var(--secondary) / 0.7)"; }}
                                          onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "hsl(var(--card) / 0.6)"; }}
                                        >
                                          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                              <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(var(--foreground))", lineHeight: 1.35 }}>{fund.name}</div>
                                              {isSelected && (
                                                <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: "3px", flexShrink: 0, background: `color-mix(in srgb, ${fund.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${fund.color} 30%, transparent)`, color: fund.color, fontWeight: 500 }}>
                                                  chart open ↓
                                                </span>
                                              )}
                                            </div>
                                            <div style={{ fontSize: "15px", fontWeight: 600, color: "hsl(var(--foreground))", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
                                              ₹{fund.latestNav.toFixed(2)}
                                              <span style={{ fontSize: "10px", fontWeight: 300, color: "hsl(var(--muted-foreground))", marginLeft: "5px", letterSpacing: 0 }}>NAV</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "3px", background: `color-mix(in srgb, ${fund.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${fund.color} 25%, transparent)`, color: fund.color, fontWeight: 500 }}>{fund.risk}</span>
                                              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>{fund.horizon} yr horizon</span>
                                            </div>
                                          </div>
                                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            <div style={{ fontSize: "22px", fontWeight: 700, color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{fund.cagr5y.toFixed(1)}%</div>
                                            <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", fontWeight: 300, marginTop: "3px" }}>5Y CAGR</div>
                                          </div>
                                        </div>
                                        <AnimatePresence>
                                          {isSelected && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} style={{ overflow: "hidden", borderBottom: "1px solid hsl(var(--border))" }}>
                                              <FundNavChart fund={fund} onClose={() => setSelectedFund(null)} />
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            <div style={{ padding: "16px 20px", background: "hsl(var(--secondary) / 0.5)", borderTop: "1px solid hsl(var(--border))" }}>
                              <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontWeight: 300, lineHeight: 1.7, margin: 0 }}>
                                Funds discovered live from <strong style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>mfapi.in</strong> using AMFI data. Ranked by actual <strong style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>5-year CAGR</strong>. Data cached 24h.
                              </p>
                              <p style={{ fontSize: "11px", color: "color-mix(in srgb, #f59e0b 80%, hsl(var(--foreground)))", fontWeight: 300, lineHeight: 1.6, margin: "8px 0 0 0" }}>
                                Past returns do not guarantee future performance. Not investment advice.
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        </main>
        <Separator />
        <Footer />
      </div>
    </div>
  );
}
