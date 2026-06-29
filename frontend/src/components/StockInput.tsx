import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Plus,
  IndianRupee,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  History,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  optimize,
  OptimizeResult,
  RiskProfile,
} from "@/services/optimizerService";
import ResultsDisplay from "./ResultsDisplay";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.VITE_API_URL as string;
const CART_KEY = "portfolioCart_v1";

function readAndClearCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [""];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      localStorage.removeItem(CART_KEY);
      return parsed.map((t: unknown) => String(t).trim().toUpperCase());
    }
  } catch {
    /* ignore */
  }
  return [""];
}

// risk profile cards
const RISK_PROFILES: Array<{
  value: RiskProfile;
  label: string;
  description: string;
  strategy: string;
  returnRange: string;
  border: string;
  bg: string;
  color: string;
}> = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Capital preservation · lower volatility · stable returns",
    strategy: "Min Volatility",
    returnRange: "8–12% p.a.",
    border: "var(--blue-border)",
    bg: "var(--blue-subtle)",
    color: "var(--blue)",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Equal weight on growth & stability · optimal Sharpe",
    strategy: "Max Sharpe",
    returnRange: "12–18% p.a.",
    border: "var(--green-border)",
    bg: "var(--green-subtle)",
    color: "var(--green)",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Maximum return focus · concentrated high-ML positions",
    strategy: "Aggressive Growth",
    returnRange: "18–25% p.a.",
    border: "var(--red-border)",
    bg: "var(--red-subtle)",
    color: "var(--red)",
  },
];

// auto-mode display metadata — 3 tiers matching backend
const AUTO_PROFILES: Record<
  RiskProfile,
  { label: string; color: string; bg: string; border: string; description: string }
> = {
  conservative: {
    label: "Conservative",
    color: "var(--blue)",
    bg: "var(--blue-subtle)",
    border: "var(--blue-border)",
    description: "Capital preservation first",
  },
  balanced: {
    label: "Balanced",
    color: "var(--green)",
    bg: "var(--green-subtle)",
    border: "var(--green-border)",
    description: "Equal focus on growth & stability",
  },
  aggressive: {
    label: "Aggressive",
    color: "var(--red)",
    bg: "var(--red-subtle)",
    border: "var(--red-border)",
    description: "High risk for substantial returns",
  },
};

// normalize old 6-tier saved profiles to current 3 tiers
function normalizeProfile(profile: string): RiskProfile {
  if (profile === "conservative" || profile === "moderate") return "conservative";
  if (profile === "balanced" || profile === "growth") return "balanced";
  return "aggressive";
}

const SCORE_ITEMS = [
  { key: "ageScore", label: "Age factor", range: "−2 to +4" },
  { key: "savingsScore", label: "Savings rate", range: "−1 to +2" },
  { key: "familyScore", label: "Family size", range: "−1 to +2" },
  { key: "horizonScore", label: "Time horizon", range: "0 to +3" },
  { key: "investmentScore", label: "Investment base", range: "0 to +2" },
  { key: "ratioScore", label: "Invest. ratio", range: "−1 to +1" },
];

interface RiskScoreBreakdown {
  ageScore: number;
  savingsScore: number;
  familyScore: number;
  horizonScore: number;
  investmentScore: number;
  ratioScore: number;
  totalScore: number;
  reasons: string[];
}
interface UserProfile {
  monthlyIncome: number;
  monthlyExpenses: number;
  sideIncome: number;
  age: number;
  familyMembers: number;
  existingInvestments: number;
  investmentHorizon: string;
}
interface SavedRiskProfile {
  breakdown: RiskScoreBreakdown;
  profile: string;
  profileData: UserProfile;
  updatedAt: string;
}

const fieldStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  height: "38px",
  padding: "0 12px",
  background: "hsl(var(--card) / 0.6)",
  backdropFilter: "blur(8px)",
  border: `1px solid ${focused ? "hsl(var(--foreground) / 0.35)" : "hsl(var(--border))"}`,
  borderRadius: "7px",
  fontSize: "14px",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "-0.01em",
  color: "hsl(var(--foreground))",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  boxShadow: focused ? "0 0 0 3px hsl(var(--foreground) / 0.06)" : "none",
});

const FieldLabel: React.FC<{
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}> = ({ children, required, htmlFor }) => (
  <label
    htmlFor={htmlFor}
    style={{
      fontSize: "12.5px",
      fontWeight: 500,
      letterSpacing: "-0.01em",
      color: "hsl(var(--foreground))",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    }}
  >
    {children}
    {required && (
      <span style={{ color: "var(--red)", fontSize: "11px" }}>*</span>
    )}
  </label>
);

interface StockSuggestion {
  ticker: string; // bare ticker e.g. "RELIANCE"
  symbol: string; // with suffix e.g. "RELIANCE.NS"
  name: string; // full company name
  exchange: "NSE" | "BSE";
}

interface StockSearchInputProps {
  value: string;
  name: string;
  onChange: (ticker: string, name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  slotKey: string;
}

const StockSearchInput: React.FC<StockSearchInputProps> = ({
  value,
  name,
  onChange,
  onRemove,
  canRemove,
  slotKey,
}) => {
  const [inputVal, setInputVal] = useState(value);
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Sync if parent changes value externally (e.g. cart load)
  useEffect(() => {
    setInputVal(value);
  }, [value]);

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([]);
      setShowDrop(false);
      return;
    }
    setSearching(true);
    try {
      const r = await fetch(
        `${API_BASE}/api/searchStocks?q=${encodeURIComponent(q)}`,
      );
      const d = await r.json();
      setSuggestions(d.results ?? []);
      setShowDrop((d.results ?? []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setInputVal(v);
    onChange(v, ""); // keep parent in sync while typing
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 280);
  };

  const handleSelect = (s: StockSuggestion) => {
    setInputVal(s.ticker);
    onChange(s.ticker, s.name);
    setSuggestions([]);
    setShowDrop(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowDrop(false);
  };

  const borderColor = focused
    ? "hsl(var(--foreground) / 0.35)"
    : "hsl(var(--border))";

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>
      {/* Input row */}
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        <Search
          size={13}
          style={{
            position: "absolute",
            left: "10px",
            color: "hsl(var(--muted-foreground))",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        />
        <input
          id={slotKey}
          type="text"
          autoComplete="off"
          placeholder="Search stock — name or ticker"
          value={inputVal}
          onChange={handleInput}
          onFocus={() => {
            setFocused(true);
            if (suggestions.length) setShowDrop(true);
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            height: "38px",
            paddingLeft: "30px",
            paddingRight: searching ? "30px" : "10px",
            background: "hsl(var(--card) / 0.6)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${borderColor}`,
            borderRadius: showDrop ? "7px 7px 0 0" : "7px",
            fontSize: "13.5px",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.03em",
            color: "hsl(var(--foreground))",
            outline: "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            boxShadow: focused
              ? "0 0 0 3px hsl(var(--foreground) / 0.06)"
              : "none",
          }}
        />
        {searching && (
          <Loader2
            size={11}
            style={{
              position: "absolute",
              right: "10px",
              color: "hsl(var(--muted-foreground))",
              animation: "spin 0.8s linear infinite",
            }}
          />
        )}
      </div>

      {/* Company name tag shown after a selection */}
      {name && !showDrop && (
        <div style={{ marginTop: "3px", paddingLeft: "30px" }}>
          <span
            style={{
              fontSize: "11px",
              color: "hsl(var(--muted-foreground))",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              letterSpacing: "-0.01em",
            }}
          >
            {name}
          </span>
        </div>
      )}

      {/* Dropdown */}
      {showDrop && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "hsl(var(--card) / 0.97)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${borderColor}`,
            borderTop: "none",
            borderRadius: "0 0 7px 7px",
            boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
            overflow: "hidden",
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.symbol}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                borderTop:
                  i > 0 ? "1px solid hsl(var(--border) / 0.5)" : "none",
                textAlign: "left",
                transition: "background 0.1s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "hsl(var(--secondary) / 0.7)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "hsl(var(--foreground))",
                    letterSpacing: "0.02em",
                  }}
                >
                  {s.ticker}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {s.name}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background:
                    s.exchange === "NSE"
                      ? "var(--blue-subtle)"
                      : "hsl(var(--muted) / 0.5)",
                  color:
                    s.exchange === "NSE"
                      ? "var(--blue)"
                      : "hsl(var(--muted-foreground))",
                  flexShrink: 0,
                  border:
                    s.exchange === "NSE"
                      ? "1px solid var(--blue-border)"
                      : "1px solid hsl(var(--border))",
                }}
              >
                {s.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StockInput: React.FC = () => {
  const { toast } = useToast();
  const { isLoggedIn, userId } = useAuth();

  // state
  const [tickers, setTickers] = useState<string[]>(readAndClearCart);
  const [tickerNames, setTickerNames] = useState<Record<number, string>>({});
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const [profileMode, setProfileMode] = useState<"manual" | "auto">("manual");
  const [manualRisk, setManualRisk] = useState<RiskProfile>("balanced");

  const [userProfile, setUserProfile] = useState<UserProfile>({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    sideIncome: 0,
    age: 0,
    familyMembers: 1,
    existingInvestments: 0,
    investmentHorizon: "medium",
  });
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [dialogStage, setDialogStage] = useState<"analyzing" | "results">(
    "analyzing",
  );
  const [riskScoreBreakdown, setRiskScoreBreakdown] =
    useState<RiskScoreBreakdown | null>(null);
  const [autoProfile, setAutoProfile] = useState("");
  const [savedProfile, setSavedProfile] = useState<SavedRiskProfile | null>(
    null,
  );
  const [hasLoadedSaved, setHasLoadedSaved] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(false);
  const [acceptedSaved, setAcceptedSaved] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [isLoading]);

  useEffect(() => {
    if (showRiskDialog && dialogStage === "results") {
      const t = setTimeout(() => setShowRiskDialog(false), 15000);
      return () => clearTimeout(t);
    }
  }, [showRiskDialog, dialogStage]);

  useEffect(() => {
    if (isLoggedIn && userId && profileMode === "auto" && !hasLoadedSaved)
      loadSavedProfile();
  }, [isLoggedIn, userId, profileMode, hasLoadedSaved]);

  const loadSavedProfile = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch(`${API_BASE}/api/userRiskProfile/${userId}`);
      if (res.ok) {
        const raw: SavedRiskProfile = await res.json();
        const data = { ...raw, profile: normalizeProfile(raw.profile) };
        setSavedProfile(data);
        setHasLoadedSaved(true);
        setShowSavedAlert(true);
        setUserProfile(data.profileData);
        setRiskScoreBreakdown(data.breakdown);
        setAutoProfile(data.profile);
        toast({
          title: "Saved profile found",
          description: `Previous: ${AUTO_PROFILES[data.profile as RiskProfile].label}`,
        });
      } else {
        setHasLoadedSaved(true);
      }
    } catch {
      setHasLoadedSaved(true);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const saveProfileToDb = async (
    breakdown: RiskScoreBreakdown,
    profile: string,
    profileData: UserProfile,
  ) => {
    try {
      await fetch(`${API_BASE}/api/saveRiskProfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, breakdown, profile, profileData }),
      });
    } catch {
      /* non-blocking */
    }
  };

  const calculateAutoProfile = (): {
    profile: string;
    breakdown: RiskScoreBreakdown;
  } => {
    let score = 0;
    const reasons: string[] = [];
    const {
      age,
      monthlyIncome,
      monthlyExpenses,
      sideIncome,
      familyMembers,
      existingInvestments,
      investmentHorizon,
    } = userProfile;

    let ageScore = 0;
    if (age < 25) {
      ageScore = 4;
      reasons.push(`Young age (${age}) — maximum growth runway (+4)`);
    } else if (age < 35) {
      ageScore = 3;
      reasons.push(`Age ${age} — peak earning years, long horizon (+3)`);
    } else if (age < 45) {
      ageScore = 2;
      reasons.push(`Age ${age} — still 20+ years to retirement (+2)`);
    } else if (age < 55) {
      ageScore = 1;
      reasons.push(`Age ${age} — approaching mid-life, some caution (+1)`);
    } else if (age < 60) {
      ageScore = -1;
      reasons.push(`Age ${age} — capital preservation starts mattering (−1)`);
    } else {
      ageScore = -2;
      reasons.push(
        `Age ${age} — retirement proximity, conservative approach (−2)`,
      );
    }
    score += ageScore;

    const totalIncome = monthlyIncome + sideIncome;
    const savingsRate =
      totalIncome > 0 ? (totalIncome - monthlyExpenses) / totalIncome : 0;
    const surplus = totalIncome - monthlyExpenses;
    let savingsScore = 0;
    if (savingsRate > 0.4 && surplus >= 15000) {
      savingsScore = 2;
      reasons.push(
        `High savings rate (${(savingsRate * 100).toFixed(1)}%) + strong surplus (+2)`,
      );
    } else if (savingsRate > 0.25 && surplus >= 10000) {
      savingsScore = 1;
      reasons.push(
        `Good savings rate (${(savingsRate * 100).toFixed(1)}%) supports growth (+1)`,
      );
    } else if (savingsRate > 0.15) {
      savingsScore = 0;
      reasons.push(`Moderate savings rate — balanced approach (0)`);
    } else {
      savingsScore = -1;
      reasons.push(`Low savings rate — conservative strategy (−1)`);
    }
    score += savingsScore;

    let familyScore = 0;
    if (familyMembers === 1) {
      familyScore = 2;
      reasons.push(`Single — maximum risk flexibility (+2)`);
    } else if (familyMembers === 2) {
      familyScore = 1;
      reasons.push(`Small family permits moderate risk (+1)`);
    } else if (familyMembers <= 4) {
      familyScore = 0;
      reasons.push(`Family of ${familyMembers} — balanced strategy (0)`);
    } else {
      familyScore = -1;
      reasons.push(`Large family — stability prioritised (−1)`);
    }
    score += familyScore;

    let horizonScore = 0;
    if (investmentHorizon === "very_long") {
      horizonScore = 3;
      reasons.push(`Very long-term horizon — max equity exposure (+3)`);
    } else if (investmentHorizon === "long") {
      horizonScore = 2;
      reasons.push(`Long-term horizon (+2)`);
    } else if (investmentHorizon === "medium") {
      horizonScore = 1;
      reasons.push(`Medium-term horizon (+1)`);
    } else {
      horizonScore = 0;
      reasons.push(`Short-term horizon — stability required (0)`);
    }
    score += horizonScore;

    let investmentScore = 0;
    if (existingInvestments > totalIncome * 12) {
      investmentScore = 2;
      reasons.push(`Strong investment base (+2)`);
    } else if (existingInvestments > totalIncome * 6) {
      investmentScore = 1;
      reasons.push(`Moderate investment base (+1)`);
    } else {
      investmentScore = 0;
      reasons.push(`Building investment base (0)`);
    }
    score += investmentScore;

    const ratio =
      totalAmount > 0 && totalIncome > 0 ? totalAmount / (totalIncome * 12) : 0;
    let ratioScore = 0;
    if (ratio < 0.1) {
      ratioScore = 1;
      reasons.push(`Small investment relative to income (+1)`);
    } else if (ratio > 0.5) {
      ratioScore = -1;
      reasons.push(`Large investment portion — careful approach (−1)`);
    } else {
      ratioScore = 0;
      reasons.push(`Proportionate investment (0)`);
    }
    score += ratioScore;

    // score range: −5 (very conservative) to +14 (very aggressive)
    const profile: RiskProfile =
      score >= 9 ? "aggressive" : score >= 2 ? "balanced" : "conservative";

    return {
      profile,
      breakdown: {
        ageScore,
        savingsScore,
        familyScore,
        horizonScore,
        investmentScore,
        ratioScore,
        totalScore: score,
        reasons,
      },
    };
  };

  const handleTickerChange = (index: number, ticker: string, name: string) => {
    const ns = [...tickers];
    ns[index] = ticker.toUpperCase();
    setTickers(ns);
    setTickerNames((prev) => ({ ...prev, [index]: name }));
  };
  const addTicker = () => setTickers((p) => [...p, ""]);
  const removeTicker = (i: number) => {
    if (tickers.length > 1) {
      setTickers(tickers.filter((_, idx) => idx !== i));
      setTickerNames((prev) => {
        const next: Record<number, string> = {};
        Object.entries(prev).forEach(([k, v]) => {
          const ki = Number(k);
          if (ki < i) next[ki] = v;
          else if (ki > i) next[ki - 1] = v;
        });
        return next;
      });
    }
  };

  const handleSubmit = async () => {
    const uid = userId || localStorage.getItem("userId");
    if (!isLoggedIn || !uid)
      return toast({
        title: "Sign in required",
        description: "Please sign in to optimize.",
        variant: "destructive",
      });

    const clean = tickers.map((t) => t.trim()).filter(Boolean);
    if (clean.length < 2)
      return toast({
        title: "Need at least 2 tickers",
        description: "Add more stocks.",
        variant: "destructive",
      });
    if (totalAmount <= 0)
      return toast({
        title: "Invalid amount",
        description: "Enter a valid investment amount.",
        variant: "destructive",
      });

    // Validate auto profile fields
    if (profileMode === "auto" && !acceptedSaved) {
      const { monthlyIncome, age, familyMembers, monthlyExpenses } =
        userProfile;
      if (!monthlyIncome || !age || !familyMembers || monthlyExpenses == null)
        return toast({
          title: "Incomplete profile",
          description: "Fill in all required fields.",
          variant: "destructive",
        });
    }

    setIsLoading(true);
    setResult(null);

    try {
      let finalProfile: RiskProfile;
      let breakdown: RiskScoreBreakdown | null = null;

      if (profileMode === "auto") {
        if (acceptedSaved && savedProfile) {
          finalProfile = normalizeProfile(savedProfile.profile);
          breakdown = savedProfile.breakdown;
        } else {
          setShowRiskDialog(true);
          setDialogStage("analyzing");
          await new Promise((r) => setTimeout(r, 1800));
          const calc = calculateAutoProfile();
          finalProfile = calc.profile;
          breakdown = calc.breakdown;
          setRiskScoreBreakdown(breakdown);
          setAutoProfile(finalProfile);
          setDialogStage("results");
          saveProfileToDb(breakdown, finalProfile, userProfile);
        }
      } else {
        finalProfile = manualRisk;
      }

      const res = await optimize({
        tickers: clean,
        investment: totalAmount,
        risk: finalProfile,
        userId: uid,
        deepMode,
      });
      setResult(res);

      const profMeta = AUTO_PROFILES[finalProfile];
      toast({
        title: "Portfolio optimized ✓",
        description: `${res.allocation.length} stocks · ${profMeta.label}`,
      });
      setAcceptedSaved(false);
    } catch (err: any) {
      toast({
        title: "Optimization failed",
        description: err.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = isLoggedIn && (userId || localStorage.getItem("userId"));

  const autoMeta = autoProfile ? AUTO_PROFILES[autoProfile as RiskProfile] : null;
  const savedMeta = savedProfile ? AUTO_PROFILES[savedProfile.profile as RiskProfile] : null;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Risk Analysis Dialog ── */}
      <Dialog open={showRiskDialog} onOpenChange={setShowRiskDialog}>
        <DialogContent
          style={{
            maxWidth: "640px",
            maxHeight: "88vh",
            overflowY: "auto",
            background: "hsl(var(--card) / 0.9)",
            backdropFilter: "blur(16px)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <DialogHeader style={{ marginBottom: "24px" }}>
            <DialogTitle
              style={{
                fontSize: "17px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              Risk profile analysis
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: "13px",
                color: "hsl(var(--muted-foreground))",
                fontWeight: 300,
              }}
            >
              {dialogStage === "analyzing"
                ? "Analyzing your financial profile…"
                : "Your personalized risk profile recommendation"}
            </DialogDescription>
          </DialogHeader>

          {dialogStage === "analyzing" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 0",
                gap: "14px",
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
                  fontWeight: 500,
                  color: "hsl(var(--foreground))",
                }}
              >
                Analyzing your profile…
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                }}
              >
                Computing optimal risk strategy
              </p>
            </motion.div>
          ) : riskScoreBreakdown && autoMeta ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "flex", flexDirection: "column", gap: "22px" }}
            >
              {/* Score grid */}
              <div>
                <p className="mono-label" style={{ marginBottom: "12px" }}>
                  Score breakdown
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                  }}
                >
                  {SCORE_ITEMS.map((item) => {
                    const s = (riskScoreBreakdown as any)[item.key] ?? 0;
                    return (
                      <div
                        key={item.key}
                        style={{
                          padding: "14px",
                          background: "hsl(var(--secondary) / 0.6)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            color: "hsl(var(--muted-foreground))",
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            marginBottom: "6px",
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: "22px",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color:
                              s > 0
                                ? "var(--green)"
                                : s < 0
                                  ? "var(--red)"
                                  : "hsl(var(--muted-foreground))",
                            lineHeight: 1,
                          }}
                        >
                          {s > 0 ? "+" : ""}
                          {s}
                        </div>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "hsl(var(--muted-foreground))",
                            marginTop: "3px",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {item.range}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommended profile card */}
              <div
                style={{
                  padding: "18px 22px",
                  background: autoMeta.bg,
                  border: `1px solid ${autoMeta.border}`,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                }}
              >
                <div style={{ textAlign: "center", minWidth: "60px" }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "4px",
                    }}
                  >
                    Score
                  </div>
                  <div
                    style={{
                      fontFamily: "'Instrument Serif', Georgia, serif",
                      fontSize: "2.2rem",
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                      color: autoMeta.color,
                    }}
                  >
                    {riskScoreBreakdown.totalScore}
                  </div>
                </div>
                <div
                  style={{
                    width: "1px",
                    height: "44px",
                    background: autoMeta.border,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "hsl(var(--muted-foreground))",
                      marginBottom: "3px",
                    }}
                  >
                    Recommended
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: autoMeta.color,
                      marginBottom: "2px",
                    }}
                  >
                    {autoMeta.label}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: 300,
                    }}
                  >
                    {autoMeta.description}
                  </div>
                </div>
                <CheckCircle2
                  size={18}
                  style={{ color: autoMeta.color, flexShrink: 0 }}
                />
              </div>

              {/* Reasons list */}
              <div>
                <p className="mono-label" style={{ marginBottom: "10px" }}>
                  Analysis details
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  {riskScoreBreakdown.reasons.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "9px 12px",
                        background: "hsl(var(--secondary) / 0.5)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "7px",
                      }}
                    >
                      <CheckCircle2
                        size={11}
                        style={{
                          color: "hsl(var(--muted-foreground))",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12.5px",
                          color: "hsl(var(--foreground))",
                          lineHeight: 1.55,
                          fontWeight: 300,
                        }}
                      >
                        {r}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "hsl(var(--muted-foreground))",
                    letterSpacing: "0.04em",
                  }}
                >
                  Auto-closes in 15s
                </span>
              </div>
            </motion.div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Main form ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          style={{
            background: "hsl(var(--card) / 0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "24px 28px",
              borderBottom: "1px solid hsl(var(--border))",
              background: "hsl(var(--secondary) / 0.5)",
            }}
          >
            <p className="mono-label" style={{ marginBottom: "4px" }}>
              Portfolio optimizer
            </p>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "hsl(var(--foreground))",
                margin: 0,
              }}
            >
              Configure your investment
            </h2>
          </div>

          <div
            style={{
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "36px",
            }}
          >
            {/* ── Risk Profile ── */}
            <div>
              <p className="mono-label" style={{ marginBottom: "16px" }}>
                Risk profile
              </p>

              {/* Mode toggle */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  padding: "3px",
                  background: "hsl(var(--muted) / 0.6)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  width: "fit-content",
                }}
              >
                {(
                  [
                    ["manual", "Manual"],
                    ["auto", "Smart AI"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProfileMode(key)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: profileMode === key ? 500 : 400,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "-0.01em",
                      background:
                        profileMode === key
                          ? "hsl(var(--background) / 0.8)"
                          : "transparent",
                      color:
                        profileMode === key
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--muted-foreground))",
                      transition: "all 0.15s ease",
                      boxShadow:
                        profileMode === key
                          ? "0 1px 3px hsl(var(--foreground) / 0.08)"
                          : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Manual mode — 3 profile cards */}
              {profileMode === "manual" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                  }}
                >
                  {RISK_PROFILES.map((profile) => {
                    const sel = manualRisk === profile.value;
                    return (
                      <motion.button
                        key={profile.value}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setManualRisk(profile.value)}
                        style={{
                          padding: "16px",
                          borderRadius: "8px",
                          textAlign: "left",
                          cursor: "pointer",
                          background: sel
                            ? profile.bg
                            : "hsl(var(--card) / 0.4)",
                          backdropFilter: "blur(8px)",
                          border: `1px solid ${sel ? profile.border : "hsl(var(--border))"}`,
                          outline: sel ? `3px solid ${profile.border}` : "none",
                          outlineOffset: "2px",
                          transition: "all 0.15s ease",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: 600,
                              letterSpacing: "-0.01em",
                              color: sel
                                ? profile.color
                                : "hsl(var(--foreground))",
                            }}
                          >
                            {profile.label}
                          </span>
                          {sel && (
                            <CheckCircle2
                              size={13}
                              style={{ color: profile.color, flexShrink: 0 }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "hsl(var(--muted-foreground))",
                            fontWeight: 300,
                            lineHeight: 1.45,
                            marginBottom: "10px",
                          }}
                        >
                          {profile.description}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "5px",
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "10px",
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: sel
                                ? profile.border
                                : "hsl(var(--muted) / 0.4)",
                              color: sel
                                ? profile.color
                                : "hsl(var(--muted-foreground))",
                            }}
                          >
                            {profile.returnRange}
                          </div>
                          <div
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: "10px",
                              letterSpacing: "0.04em",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              background: "hsl(var(--muted) / 0.25)",
                              color: "hsl(var(--muted-foreground))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          >
                            {profile.strategy}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Auto / Smart AI mode */}
              {profileMode === "auto" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* Saved profile alert */}
                  {showSavedAlert && savedProfile && savedMeta && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: "18px",
                        background: "hsl(var(--secondary) / 0.5)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        <History
                          size={15}
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "13.5px",
                              fontWeight: 500,
                              letterSpacing: "-0.01em",
                              color: "hsl(var(--foreground))",
                              marginBottom: "3px",
                            }}
                          >
                            Saved risk profile
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "hsl(var(--muted-foreground))",
                              fontWeight: 300,
                              marginBottom: "14px",
                            }}
                          >
                            Last calculated{" "}
                            {new Date(
                              savedProfile.updatedAt,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 12px",
                              background: savedMeta.bg,
                              border: `1px solid ${savedMeta.border}`,
                              borderRadius: "7px",
                              marginBottom: "12px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: savedMeta.color,
                              }}
                            >
                              {savedMeta.label}
                            </span>
                            <span
                              style={{
                                width: "1px",
                                height: "12px",
                                background: savedMeta.border,
                              }}
                            />
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: "11px",
                                color: savedMeta.color,
                              }}
                            >
                              Score: {savedProfile.breakdown.totalScore}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setAcceptedSaved(true);
                                setShowSavedAlert(false);
                                setAutoProfile(savedProfile.profile);
                                setRiskScoreBreakdown(savedProfile.breakdown);
                                setUserProfile(savedProfile.profileData);
                                toast({
                                  title: "Profile applied",
                                  description: `Using ${savedMeta.label}`,
                                });
                              }}
                              style={{
                                flex: 1,
                                height: "34px",
                                background: "hsl(var(--foreground))",
                                color: "hsl(var(--background))",
                                border: "none",
                                borderRadius: "7px",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              Continue with this
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAcceptedSaved(false);
                                setShowSavedAlert(false);
                              }}
                              style={{
                                height: "34px",
                                padding: "0 14px",
                                background: "transparent",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "7px",
                                fontSize: "13px",
                                cursor: "pointer",
                                color: "hsl(var(--muted-foreground))",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontFamily: "'Inter', sans-serif",
                              }}
                            >
                              <RefreshCw size={11} /> Recalculate
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Loading saved profile */}
                  {isLoadingSaved && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "18px",
                        background: "hsl(var(--card) / 0.4)",
                        backdropFilter: "blur(8px)",
                        border: "1px dashed hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    >
                      <Loader2
                        size={14}
                        style={{
                          animation: "spin 0.8s linear infinite",
                          color: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 300,
                        }}
                      >
                        Loading your saved profile…
                      </span>
                    </div>
                  )}

                  {/* Questionnaire — shown when no saved profile accepted */}
                  {!isLoadingSaved && !showSavedAlert && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "hsl(var(--secondary) / 0.5)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "13px",
                            color: "hsl(var(--muted-foreground))",
                            fontWeight: 300,
                            lineHeight: 1.6,
                          }}
                        >
                          Answer a few questions and we'll compute your optimal
                          risk profile automatically.
                        </p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "14px",
                        }}
                      >
                        {[
                          {
                            id: "monthlyIncome",
                            label: "Monthly income (₹)",
                            key: "monthlyIncome",
                            required: true,
                            placeholder: "e.g. 50000",
                          },
                          {
                            id: "monthlyExpenses",
                            label: "Monthly expenses (₹)",
                            key: "monthlyExpenses",
                            required: true,
                            placeholder: "e.g. 30000",
                          },
                          {
                            id: "sideIncome",
                            label: "Side income (₹)",
                            key: "sideIncome",
                            required: false,
                            placeholder: "e.g. 10000",
                          },
                          {
                            id: "age",
                            label: "Age",
                            key: "age",
                            required: true,
                            placeholder: "e.g. 28",
                          },
                          {
                            id: "familyMembers",
                            label: "Family size",
                            key: "familyMembers",
                            required: true,
                            placeholder: "e.g. 3",
                          },
                          {
                            id: "existingInvestments",
                            label: "Current investments (₹)",
                            key: "existingInvestments",
                            required: false,
                            placeholder: "e.g. 100000",
                          },
                        ].map((f) => (
                          <div
                            key={f.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            <FieldLabel htmlFor={f.id} required={f.required}>
                              {f.label}
                            </FieldLabel>
                            <input
                              id={f.id}
                              type="number"
                              placeholder={f.placeholder}
                              value={(userProfile as any)[f.key] || ""}
                              onChange={(e) =>
                                setUserProfile({
                                  ...userProfile,
                                  [f.key]: Number(e.target.value),
                                })
                              }
                              onFocus={() => setFocused(f.id)}
                              onBlur={() => setFocused(null)}
                              style={fieldStyle(focused === f.id)}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Investment horizon */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <FieldLabel required>Investment timeline</FieldLabel>
                        <Select
                          value={userProfile.investmentHorizon}
                          onValueChange={(v) =>
                            setUserProfile({
                              ...userProfile,
                              investmentHorizon: v,
                            })
                          }
                        >
                          <SelectTrigger
                            style={{
                              height: "38px",
                              background: "hsl(var(--card) / 0.6)",
                              backdropFilter: "blur(8px)",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "7px",
                              fontSize: "14px",
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">
                              Short term (less than 3 years)
                            </SelectItem>
                            <SelectItem value="medium">
                              Medium term (3–7 years)
                            </SelectItem>
                            <SelectItem value="long">
                              Long term (7–15 years)
                            </SelectItem>
                            <SelectItem value="very_long">
                              Very long term (15+ years)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Stock selection ── */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <p className="mono-label">Stock selection</p>
                <span
                  style={{
                    fontSize: "11px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                  }}
                >
                  Type a name or ticker → pick from suggestions
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <AnimatePresence>
                  {tickers.map((ticker, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ delay: index * 0.04 }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <StockSearchInput
                        slotKey={`t-${index}`}
                        value={ticker}
                        name={tickerNames[index] ?? ""}
                        onChange={(t, n) => handleTickerChange(index, t, n)}
                        onRemove={() => removeTicker(index)}
                        canRemove={tickers.length > 1}
                      />
                      <button
                        type="button"
                        onClick={() => removeTicker(index)}
                        disabled={tickers.length === 1}
                        style={{
                          width: "32px",
                          height: "38px",
                          borderRadius: "6px",
                          background: "transparent",
                          border: "1px solid hsl(var(--border))",
                          cursor:
                            tickers.length === 1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "hsl(var(--muted-foreground))",
                          opacity: tickers.length === 1 ? 0.4 : 1,
                          transition: "background 0.12s ease",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (tickers.length > 1)
                            (e.currentTarget as HTMLElement).style.background =
                              "var(--red-subtle)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <X size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={addTicker}
                style={{
                  width: "100%",
                  height: "36px",
                  background: "transparent",
                  border: "1px dashed hsl(var(--border))",
                  borderRadius: "7px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "13px",
                  color: "hsl(var(--muted-foreground))",
                  transition: "background 0.12s ease, border-color 0.12s ease",
                  fontFamily: "'Inter', sans-serif",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "hsl(var(--secondary) / 0.7)";
                  (e.currentTarget as HTMLElement).style.borderStyle = "solid";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                  (e.currentTarget as HTMLElement).style.borderStyle = "dashed";
                }}
              >
                <Plus size={13} /> Add another stock
              </button>
            </div>

            {/* ── Investment amount ── */}
            <div>
              <p className="mono-label" style={{ marginBottom: "14px" }}>
                Investment amount
              </p>
              <div style={{ position: "relative" }}>
                <IndianRupee
                  size={14}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Total investment amount"
                  value={totalAmount === 0 ? "" : totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                  onFocus={() => setFocused("amount")}
                  onBlur={() => setFocused(null)}
                  style={{
                    ...fieldStyle(focused === "amount"),
                    paddingLeft: "32px",
                    height: "42px",
                    fontSize: "15px",
                  }}
                />
              </div>
              <AnimatePresence>
                {totalAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ marginTop: "8px" }}
                  >
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        color: "hsl(var(--muted-foreground))",
                        letterSpacing: "0.02em",
                      }}
                    >
                      ₹{totalAmount.toLocaleString("en-IN")}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Deep mode toggle ── */}
          <div style={{ padding: "0 28px 14px" }}>
            <button
              type="button"
              onClick={() => setDeepMode((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                background: deepMode
                  ? "var(--amber-subtle)"
                  : "hsl(var(--secondary) / 0.4)",
                border: `1px solid ${deepMode ? "var(--amber-border)" : "hsl(var(--border))"}`,
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                {/* pill toggle */}
                <div
                  style={{
                    width: "32px",
                    height: "18px",
                    borderRadius: "9px",
                    position: "relative",
                    background: deepMode ? "var(--amber)" : "hsl(var(--muted))",
                    transition: "background 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: deepMode ? "16px" : "2px",
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.15s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 500,
                      color: deepMode
                        ? "var(--amber)"
                        : "hsl(var(--foreground))",
                    }}
                  >
                    Deep analysis
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: 300,
                      marginTop: "1px",
                    }}
                  >
                    {deepMode
                      ? "Optuna tunes XGBoost per stock · ~2–3 mins"
                      : "Default XGBoost params · ~15–30s"}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.05em",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: deepMode
                    ? "var(--amber-subtle)"
                    : "hsl(var(--muted) / 0.5)",
                  color: deepMode
                    ? "var(--amber)"
                    : "hsl(var(--muted-foreground))",
                  border: `1px solid ${deepMode ? "var(--amber-border)" : "transparent"}`,
                }}
              >
                {deepMode ? "ON" : "OFF"}
              </div>
            </button>
            {deepMode && (
              <p
                style={{
                  fontSize: "11px",
                  color: "hsl(var(--muted-foreground))",
                  fontWeight: 300,
                  margin: "8px 2px 0",
                  lineHeight: 1.5,
                }}
              >
                Runs Bayesian HPO (Optuna) to find optimal XGBoost
                hyperparameters per stock. Produces better IC and direction
                accuracy at the cost of wait time. Standard mode trains with
                sensible defaults and is sufficient for most use cases.
              </p>
            )}
          </div>

          {/* ── Submit ── */}
          <div style={{ padding: "0 28px 28px" }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !canSubmit}
              style={{
                width: "100%",
                height: "42px",
                background:
                  isLoading || !canSubmit
                    ? "hsl(var(--muted) / 0.6)"
                    : "hsl(var(--foreground))",
                color:
                  isLoading || !canSubmit
                    ? "hsl(var(--muted-foreground))"
                    : "hsl(var(--background))",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                transition: "opacity 0.12s ease, background 0.15s ease",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!isLoading)
                  (e.currentTarget as HTMLElement).style.opacity = "0.82";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.opacity = "1";
              }}
            >
              {isLoading ? (
                <>
                  <Loader2
                    size={14}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />{" "}
                  Optimizing…{" "}
                  {elapsed > 0 && (
                    <span style={{ opacity: 0.6, fontSize: "12px" }}>
                      ({elapsed}s)
                    </span>
                  )}
                </>
              ) : !canSubmit ? (
                "Sign in to optimize"
              ) : (
                <>
                  Optimize portfolio <ArrowRight size={13} />
                </>
              )}
            </button>
            {isLoading &&
              (() => {
                const steps = deepMode
                  ? [
                      { until: 8, label: "Fetching market data" },
                      { until: 15, label: "Engineering technical features" },
                      {
                        until: 120,
                        label:
                          "Optuna HPO — tuning XGBoost per stock (this takes 2–3 mins)",
                      },
                      { until: 150, label: "Training final optimized models" },
                      { until: 170, label: "Running MPT optimization" },
                      {
                        until: Infinity,
                        label: "Finalizing portfolio allocation",
                      },
                    ]
                  : [
                      { until: 6, label: "Fetching market data" },
                      { until: 10, label: "Engineering technical features" },
                      { until: 25, label: "Training XGBoost models" },
                      { until: 35, label: "Running MPT optimization" },
                      {
                        until: Infinity,
                        label: "Finalizing portfolio allocation",
                      },
                    ];
                const current = steps.find((s) => elapsed < s.until)!;
                const next = steps[steps.indexOf(current) + 1];
                return (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "14px 16px",
                      background: "hsl(var(--secondary) / 0.5)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: next ? "10px" : "0",
                      }}
                    >
                      <Loader2
                        size={12}
                        style={{
                          color: "hsl(var(--muted-foreground))",
                          animation: "spin 0.8s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        {current.label}
                      </span>
                    </div>
                    {next && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          paddingLeft: "22px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                            fontWeight: 300,
                          }}
                        >
                          Next: {next.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        </div>
      </motion.div>

      {/* ── Results ── */}
      <AnimatePresence>
        {!isLoading && result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.15 }}
            style={{ marginTop: "32px" }}
          >
            <ResultsDisplay result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StockInput;
