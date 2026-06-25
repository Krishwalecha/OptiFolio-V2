import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  IndianRupee,
  Loader2,
  CheckCircle2,
  RefreshCw,
  History,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
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
import { useTheme } from "@/hooks/useTheme";
import ResultsDisplay, { OptimizedAllocation } from "./ResultsDisplay";

export interface StockEntry {
  ticker: string;
  amount: number;
}

interface UserProfile {
  monthlyIncome: number;
  familyMembers: number;
  sideIncome: number;
  age: number;
  investmentHorizon: string;
  existingInvestments: number;
  monthlyExpenses: number;
}
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
interface SavedRiskProfile {
  breakdown: RiskScoreBreakdown;
  profile: string;
  profileData: UserProfile;
  createdAt: string;
  updatedAt: string;
}

// ── Cart key (must match FinancialNews.tsx) ────────────────────────────────
const CART_KEY = "portfolioCart_v1";

// ── All inputs use card/0.6 + blur ──────────────────────────────────────────
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

const Label: React.FC<{
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

const riskProfiles = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Low risk, steady growth",
    border: "var(--blue-border)",
    bg: "var(--blue-subtle)",
    color: "var(--blue)",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Stability-first, modest upside",
    border: "rgba(20,184,166,0.25)",
    bg: "rgba(20,184,166,0.07)",
    color: "#0d9488",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Equal focus on growth & stability",
    border: "var(--green-border)",
    bg: "var(--green-subtle)",
    color: "var(--green)",
  },
  {
    value: "growth",
    label: "Growth",
    description: "Higher returns, moderate risk",
    border: "var(--amber-border)",
    bg: "var(--amber-subtle)",
    color: "var(--amber)",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description: "High risk for substantial returns",
    border: "rgba(234,88,12,0.2)",
    bg: "rgba(234,88,12,0.07)",
    color: "#ea580c",
  },
  {
    value: "very_aggressive",
    label: "Very Aggressive",
    description: "Maximum growth, highest risk",
    border: "var(--red-border)",
    bg: "var(--red-subtle)",
    color: "var(--red)",
  },
];

const scoreItems = [
  { key: "ageScore", label: "Age factor", range: "−2 to +3" },
  { key: "savingsScore", label: "Savings rate", range: "−1 to +2" },
  { key: "familyScore", label: "Family size", range: "−1 to +2" },
  { key: "horizonScore", label: "Time horizon", range: "0 to +2" },
  { key: "investmentScore", label: "Investment base", range: "0 to +2" },
  { key: "ratioScore", label: "Invest. ratio", range: "−1 to +1" },
];

// ── Stock row type ─────────────────────────────────────────────────────────
interface StockRow {
  ticker: string;
  isLoading?: boolean;
  isVerified?: boolean;
}

// ── Read cart from localStorage and clear it (one-time on mount) ───────────
function readAndClearCart(): StockRow[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [{ ticker: "", isLoading: false, isVerified: false }];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Clear immediately so revisiting optimizer starts fresh
      localStorage.removeItem(CART_KEY);
      return parsed.map((ticker: unknown) => ({
        ticker: String(ticker).trim().toUpperCase(),
        isLoading: false,
        isVerified: false,
      }));
    }
  } catch {
    // ignore parse errors
  }
  return [{ ticker: "", isLoading: false, isVerified: false }];
}

const StockInput: React.FC = () => {
  const { toast } = useToast();
  const { theme } = useTheme();
  const { isLoggedIn, userId } = useAuth();

  // ── Pre-fill from cart OR start with one empty row ──────────────────────
  const [stocks, setStocks] = useState<StockRow[]>(readAndClearCart);

  const [totalAmount, setTotalAmount] = useState(0);
  const [submittedStocks, setSubmittedStocks] = useState<StockEntry[] | null>(
    null,
  );
  const [optimizedAllocation, setOptimizedAllocation] = useState<
    OptimizedAllocation[] | null
  >(null);
  const [riskMetric, setRiskMetric] = useState(0.25);
  const [expectedReturn, setExpectedReturn] = useState(8.4);
  const [isLoading, setIsLoading] = useState(false);
  const [sentTickers, setSentTickers] = useState<Set<string>>(new Set());
  const [profileMode, setProfileMode] = useState<"auto" | "manual">("manual");
  const [selectedRiskProfile, setSelectedRiskProfile] = useState("balanced");
  const [userProfile, setUserProfile] = useState<UserProfile>({
    monthlyIncome: null as any,
    familyMembers: null as any,
    sideIncome: null as any,
    age: null as any,
    investmentHorizon: "medium",
    existingInvestments: null as any,
    monthlyExpenses: null as any,
  });
  const [showRiskDialog, setShowRiskDialog] = useState(false);
  const [dialogStage, setDialogStage] = useState<"analyzing" | "results">(
    "analyzing",
  );
  const [riskScoreBreakdown, setRiskScoreBreakdown] =
    useState<RiskScoreBreakdown | null>(null);
  const [selectedProfileFromAuto, setSelectedProfileFromAuto] = useState("");
  const [savedProfile, setSavedProfile] = useState<SavedRiskProfile | null>(
    null,
  );
  const [hasLoadedSavedProfile, setHasLoadedSavedProfile] = useState(false);
  const [isLoadingSavedProfile, setIsLoadingSavedProfile] = useState(false);
  const [showSavedProfileAlert, setShowSavedProfileAlert] = useState(false);
  const [acceptedSavedProfile, setAcceptedSavedProfile] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (
      isLoggedIn &&
      userId &&
      profileMode === "auto" &&
      !hasLoadedSavedProfile
    )
      loadSavedRiskProfile();
  }, [isLoggedIn, userId, profileMode, hasLoadedSavedProfile]);

  useEffect(() => {
    if (showRiskDialog && dialogStage === "results") {
      const t = setTimeout(() => setShowRiskDialog(false), 15000);
      return () => clearTimeout(t);
    }
  }, [showRiskDialog, dialogStage]);

  const loadSavedRiskProfile = async () => {
    setIsLoadingSavedProfile(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/userRiskProfile/${userId}`,
      );
      if (res.ok) {
        const data: SavedRiskProfile = await res.json();
        setSavedProfile(data);
        setHasLoadedSavedProfile(true);
        setShowSavedProfileAlert(true);
        setUserProfile(data.profileData);
        setRiskScoreBreakdown(data.breakdown);
        setSelectedProfileFromAuto(data.profile);
        toast({
          title: "Profile found",
          description: `Previous risk profile: ${riskProfiles.find((p) => p.value === data.profile)?.label}`,
        });
      } else if (res.status === 404) {
        setHasLoadedSavedProfile(true);
      } else throw new Error();
    } catch {
      setHasLoadedSavedProfile(true);
    } finally {
      setIsLoadingSavedProfile(false);
    }
  };

  const saveRiskProfileToDatabase = async (
    breakdown: RiskScoreBreakdown,
    profile: string,
    profileData: UserProfile,
  ) => {
    try {
      const res = await fetch("http://localhost:5000/api/saveRiskProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, breakdown, profile, profileData }),
      });
      if (res.ok) {
        const r = await res.json();
        if (r.isUpdate) toast({ title: "Profile updated" });
      }
    } catch {}
  };

  const calculateAutoRiskProfile = (): {
    profile: string;
    breakdown: RiskScoreBreakdown;
  } => {
    let score = 0;
    const reasons: string[] = [];
    const age = userProfile.age ?? 30,
      monthlyIncome = userProfile.monthlyIncome ?? 0,
      monthlyExpenses = userProfile.monthlyExpenses ?? 0,
      sideIncome = userProfile.sideIncome ?? 0,
      familyMembers = userProfile.familyMembers ?? 1,
      existingInvestments = userProfile.existingInvestments ?? 0;

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
    const absoluteSavings = totalIncome - monthlyExpenses;
    let savingsScore = 0;
    if (savingsRate > 0.4 && absoluteSavings >= 15000) {
      savingsScore = 2;
      reasons.push(
        `High savings rate (${(savingsRate * 100).toFixed(1)}%) + strong surplus (+2)`,
      );
    } else if (savingsRate > 0.25 && absoluteSavings >= 10000) {
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
    if (userProfile.investmentHorizon === "very_long") {
      horizonScore = 3;
      reasons.push(`Very long-term horizon — max equity exposure (+3)`);
    } else if (userProfile.investmentHorizon === "long") {
      horizonScore = 2;
      reasons.push(`Long-term horizon (+2)`);
    } else if (userProfile.investmentHorizon === "medium") {
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

    const ratio = totalAmount / (totalIncome * 12 || 1);
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

    const profile =
      score >= 16
        ? "very_aggressive"
        : score >= 11
          ? "aggressive"
          : score >= 6
            ? "growth"
            : score >= 2
              ? "balanced"
              : score >= -1
                ? "moderate"
                : "conservative";

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

  const handleTickerChange = (index: number, value: string) => {
    const ns = [...stocks];
    ns[index] = {
      ...ns[index],
      ticker: value.toUpperCase(),
      isVerified: false,
    };
    setStocks(ns);
  };

  const sendToBackend = async (ticker: string, index: number) => {
    const t = ticker.trim().toUpperCase();
    if (sentTickers.has(t)) return true;
    setStocks((prev) => {
      const ns = [...prev];
      ns[index] = { ...ns[index], isLoading: true };
      return ns;
    });
    try {
      const res = await fetch("http://localhost:5000/api/updateStock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: t }),
      });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Invalid response");
      }
      if (res.ok && result.data?.length > 0) {
        setSentTickers((prev) => new Set(prev).add(t));
        setStocks((prev) => {
          const ns = [...prev];
          ns[index] = { ...ns[index], isLoading: false, isVerified: true };
          return ns;
        });
        toast({
          title: "Stock verified",
          description: `${t} added successfully.`,
        });
        return true;
      }
      setStocks((prev) => {
        const ns = [...prev];
        ns[index] = { ...ns[index], isLoading: false, isVerified: false };
        return ns;
      });
      toast({
        title: "Invalid ticker",
        description: `${t} has no market data.`,
        variant: "destructive",
      });
      return false;
    } catch {
      setStocks((prev) => {
        const ns = [...prev];
        ns[index] = { ...ns[index], isLoading: false, isVerified: false };
        return ns;
      });
      toast({
        title: "Connection error",
        description: "Could not connect to server.",
        variant: "destructive",
      });
      return false;
    }
  };

  const addStockField = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setStocks((prev) => [
      ...prev,
      { ticker: "", isLoading: false, isVerified: false },
    ]);
  };

  const removeStockField = (index: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    if (stocks.length === 1) return;
    setStocks(stocks.filter((_, i) => i !== index));
  };

  const fetchOptimizationResults = async (currentUserId: string) => {
    const res = await fetch("http://localhost:5000/api/optimizationResults");
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const alloc = data.allocation as Record<string, number>;
    const total = Object.values(alloc).reduce((s: number, v: any) => s + v, 0);
    const mapped: OptimizedAllocation[] = Object.entries(alloc).map(
      ([ticker, amount]: [string, any]) => ({
        ticker,
        amount,
        percentage: (amount / total) * 100,
      }),
    );
    setOptimizedAllocation(mapped);
    setRiskMetric(data.portfolio_metrics.annualized_risk);
    setExpectedReturn(data.portfolio_metrics.expected_annual_return);
    setSubmittedStocks(
      Object.entries(alloc).map(([ticker, amount]: [string, any]) => ({
        ticker,
        amount,
      })),
    );
    try {
      await fetch("http://localhost:5000/api/saveAllocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          allocations: mapped.map(({ ticker, percentage }) => ({
            ticker,
            percentage,
          })),
        }),
      });
    } catch {
      console.warn("Could not save allocations");
    }
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const storedUserId = localStorage.getItem("userId");
    const currentUserId = userId || storedUserId;
    if (!isLoggedIn || !currentUserId) {
      toast({
        title: "Sign in required",
        description: "Please sign in to optimize.",
        variant: "destructive",
      });
      return;
    }
    if (stocks.some((s) => !s.ticker)) {
      toast({
        title: "Missing tickers",
        description: "Fill in all stock tickers.",
        variant: "destructive",
      });
      return;
    }
    if (totalAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a valid investment amount.",
        variant: "destructive",
      });
      return;
    }
    if (profileMode === "auto" && !acceptedSavedProfile) {
      const p = userProfile;
      if (
        !p.monthlyIncome ||
        p.monthlyIncome <= 0 ||
        p.monthlyExpenses == null ||
        p.monthlyExpenses < 0 ||
        !p.age ||
        p.age <= 0 ||
        !p.familyMembers ||
        p.familyMembers <= 0
      ) {
        toast({
          title: "Incomplete profile",
          description: "Fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    }
    setIsLoading(true);
    try {
      for (let i = 0; i < stocks.length; i++) {
        if (stocks[i].ticker && !stocks[i].isVerified) {
          const ok = await sendToBackend(stocks[i].ticker, i);
          if (!ok) {
            setIsLoading(false);
            return;
          }
        }
      }
      setSubmittedStocks(
        stocks.map((s) => ({
          ticker: s.ticker,
          amount: totalAmount / stocks.length,
        })),
      );
      let finalProfile: string;
      let breakdown: RiskScoreBreakdown | null = null;
      if (profileMode === "auto") {
        if (acceptedSavedProfile && savedProfile) {
          finalProfile = savedProfile.profile;
          breakdown = savedProfile.breakdown;
          setRiskScoreBreakdown(breakdown);
          setSelectedProfileFromAuto(finalProfile);
        } else if (
          savedProfile &&
          showSavedProfileAlert &&
          !acceptedSavedProfile
        ) {
          toast({
            title: "Confirm profile",
            description: "Choose 'Continue' or 'Recalculate'.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        } else {
          setShowRiskDialog(true);
          setDialogStage("analyzing");
          await new Promise((r) => setTimeout(r, 2000));
          const result = calculateAutoRiskProfile();
          finalProfile = result.profile;
          breakdown = result.breakdown;
          setRiskScoreBreakdown(breakdown);
          setSelectedProfileFromAuto(finalProfile);
          await saveRiskProfileToDatabase(breakdown, finalProfile, userProfile);
          setDialogStage("results");
        }
      } else {
        finalProfile = selectedRiskProfile;
      }
      const storeRes = await fetch(
        "http://localhost:5000/api/storeUserRequest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stocks: stocks.map((s) => ({ ticker: s.ticker })),
            totalAmount,
            riskProfile: finalProfile,
            userId: currentUserId,
          }),
        },
      );
      if (!storeRes.ok) throw new Error("Store failed");
      const runRes = await fetch("http://localhost:5000/api/runOptimizer", {
        method: "POST",
      });
      if (!runRes.ok) throw new Error("Optimizer failed");
      await fetchOptimizationResults(currentUserId);
      toast({
        title: "Portfolio optimized",
        description: `${stocks.length} stocks · ${riskProfiles.find((p) => p.value === finalProfile)?.label} profile`,
      });
      setAcceptedSavedProfile(false);
    } catch {
      toast({
        title: "Optimization failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Risk Analysis Dialog ── */}
      <Dialog open={showRiskDialog} onOpenChange={setShowRiskDialog}>
        <DialogContent
          style={{
            maxWidth: "680px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "hsl(var(--card) / 0.85)",
            backdropFilter: "blur(16px)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <DialogHeader style={{ marginBottom: "24px" }}>
            <DialogTitle
              style={{
                fontSize: "18px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "hsl(var(--foreground))",
              }}
            >
              Risk profile analysis
            </DialogTitle>
            <DialogDescription
              style={{
                fontSize: "13.5px",
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
                padding: "40px 24px",
                gap: "16px",
              }}
            >
              <Loader2
                size={32}
                style={{
                  color: "hsl(var(--muted-foreground))",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p
                style={{
                  fontSize: "15px",
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
                Calculating optimal risk strategy
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {riskScoreBreakdown && (
                <>
                  <div>
                    <p className="mono-label" style={{ marginBottom: "14px" }}>
                      Score breakdown
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                      }}
                    >
                      {scoreItems.map((item) => {
                        const score =
                          (riskScoreBreakdown as any)[item.key] || 0;
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
                                fontSize: "11px",
                                color: "hsl(var(--muted-foreground))",
                                fontFamily: "'JetBrains Mono', monospace",
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                marginBottom: "8px",
                              }}
                            >
                              {item.label}
                            </div>
                            <div
                              style={{
                                fontSize: "24px",
                                fontWeight: 600,
                                letterSpacing: "-0.02em",
                                color:
                                  score > 0
                                    ? "var(--green)"
                                    : score < 0
                                      ? "var(--red)"
                                      : "hsl(var(--muted-foreground))",
                                lineHeight: 1,
                              }}
                            >
                              {score > 0 ? "+" : ""}
                              {score}
                            </div>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "hsl(var(--muted-foreground))",
                                marginTop: "4px",
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
                  {selectedProfileFromAuto &&
                    (() => {
                      const prof = riskProfiles.find(
                        (p) => p.value === selectedProfileFromAuto,
                      );
                      return (
                        <div
                          style={{
                            padding: "20px 24px",
                            background: prof?.bg,
                            border: `1px solid ${prof?.border}`,
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "20px",
                          }}
                        >
                          <div
                            style={{ textAlign: "center", minWidth: "64px" }}
                          >
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
                                fontFamily:
                                  "'Instrument Serif', Georgia, serif",
                                fontSize: "2.5rem",
                                lineHeight: 1,
                                letterSpacing: "-0.04em",
                                color: prof?.color,
                              }}
                            >
                              {riskScoreBreakdown.totalScore}
                            </div>
                          </div>
                          <div
                            style={{
                              width: "1px",
                              height: "48px",
                              background: prof?.border,
                            }}
                          />
                          <div>
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
                              Recommended profile
                            </div>
                            <div
                              style={{
                                fontSize: "18px",
                                fontWeight: 600,
                                letterSpacing: "-0.02em",
                                color: prof?.color,
                                marginBottom: "2px",
                              }}
                            >
                              {prof?.label}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "hsl(var(--muted-foreground))",
                                fontWeight: 300,
                              }}
                            >
                              {prof?.description}
                            </div>
                          </div>
                          <div style={{ marginLeft: "auto" }}>
                            <CheckCircle2
                              size={20}
                              style={{ color: prof?.color }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  <div>
                    <p className="mono-label" style={{ marginBottom: "12px" }}>
                      Analysis details
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {riskScoreBreakdown.reasons.map((reason, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                            padding: "10px 14px",
                            background: "hsl(var(--secondary) / 0.5)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "7px",
                          }}
                        >
                          <CheckCircle2
                            size={12}
                            style={{
                              color: "hsl(var(--muted-foreground))",
                              flexShrink: 0,
                              marginTop: "2px",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              color: "hsl(var(--foreground))",
                              lineHeight: 1.55,
                              fontWeight: 300,
                            }}
                          >
                            {reason}
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
                </>
              )}
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Main Form ── */}
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
          {/* Form header */}
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
                {[
                  { key: "manual", label: "Manual" },
                  { key: "auto", label: "Smart AI" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setProfileMode(key as "auto" | "manual")}
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

              {profileMode === "manual" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "8px",
                  }}
                >
                  {riskProfiles.map((profile) => {
                    const isSelected = selectedRiskProfile === profile.value;
                    return (
                      <motion.button
                        key={profile.value}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedRiskProfile(profile.value);
                        }}
                        style={{
                          padding: "14px",
                          borderRadius: "8px",
                          textAlign: "left",
                          cursor: "pointer",
                          background: isSelected
                            ? profile.bg
                            : "hsl(var(--card) / 0.4)",
                          backdropFilter: "blur(8px)",
                          border: `1px solid ${isSelected ? profile.border : "hsl(var(--border))"}`,
                          outline: isSelected
                            ? `3px solid ${profile.border}`
                            : "none",
                          outlineOffset: "2px",
                          transition: "all 0.15s ease",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            letterSpacing: "-0.01em",
                            color: isSelected
                              ? profile.color
                              : "hsl(var(--foreground))",
                            marginBottom: "4px",
                          }}
                        >
                          {profile.label}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "hsl(var(--muted-foreground))",
                            fontWeight: 300,
                            lineHeight: 1.45,
                          }}
                        >
                          {profile.description}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {profileMode === "auto" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {showSavedProfileAlert &&
                    savedProfile &&
                    (() => {
                      const prof = riskProfiles.find(
                        (p) => p.value === savedProfile.profile,
                      );
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            padding: "20px",
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
                              gap: "14px",
                            }}
                          >
                            <History
                              size={16}
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
                                  marginBottom: "4px",
                                }}
                              >
                                Saved risk profile
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "hsl(var(--muted-foreground))",
                                  fontWeight: 300,
                                  marginBottom: "16px",
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
                                  gap: "10px",
                                  padding: "10px 14px",
                                  background: prof?.bg,
                                  border: `1px solid ${prof?.border}`,
                                  borderRadius: "7px",
                                  marginBottom: "14px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    letterSpacing: "-0.015em",
                                    color: prof?.color,
                                  }}
                                >
                                  {prof?.label}
                                </div>
                                <div
                                  style={{
                                    width: "1px",
                                    height: "14px",
                                    background: prof?.border,
                                  }}
                                />
                                <div
                                  style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: "11px",
                                    color: prof?.color,
                                  }}
                                >
                                  Score: {savedProfile.breakdown.totalScore}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                  marginBottom: "16px",
                                }}
                              >
                                {[
                                  {
                                    label: "Age",
                                    score: savedProfile.breakdown.ageScore,
                                  },
                                  {
                                    label: "Savings",
                                    score: savedProfile.breakdown.savingsScore,
                                  },
                                  {
                                    label: "Family",
                                    score: savedProfile.breakdown.familyScore,
                                  },
                                  {
                                    label: "Horizon",
                                    score: savedProfile.breakdown.horizonScore,
                                  },
                                  {
                                    label: "Invest.",
                                    score:
                                      savedProfile.breakdown.investmentScore,
                                  },
                                  {
                                    label: "Ratio",
                                    score: savedProfile.breakdown.ratioScore,
                                  },
                                ].map((item) => (
                                  <div
                                    key={item.label}
                                    style={{
                                      padding: "4px 8px",
                                      background: "hsl(var(--card) / 0.5)",
                                      backdropFilter: "blur(8px)",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "5px",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: "10px",
                                        color: "hsl(var(--muted-foreground))",
                                        letterSpacing: "0.04em",
                                        textTransform: "uppercase",
                                      }}
                                    >
                                      {item.label}
                                    </span>
                                    <span
                                      style={{
                                        fontFamily:
                                          "'JetBrains Mono', monospace",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color:
                                          item.score > 0
                                            ? "var(--green)"
                                            : item.score < 0
                                              ? "var(--red)"
                                              : "hsl(var(--muted-foreground))",
                                      }}
                                    >
                                      {item.score > 0 ? "+" : ""}
                                      {item.score}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAcceptedSavedProfile(true);
                                    setShowSavedProfileAlert(false);
                                    if (savedProfile) {
                                      setSelectedProfileFromAuto(
                                        savedProfile.profile,
                                      );
                                      setRiskScoreBreakdown(
                                        savedProfile.breakdown,
                                      );
                                      setUserProfile(savedProfile.profileData);
                                    }
                                    toast({
                                      title: "Profile applied",
                                      description: `Using ${prof?.label} profile.`,
                                    });
                                  }}
                                  style={{
                                    flex: 1,
                                    height: "36px",
                                    background: "hsl(var(--foreground))",
                                    color: "hsl(var(--background))",
                                    border: "none",
                                    borderRadius: "7px",
                                    fontSize: "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px",
                                    transition: "opacity 0.12s ease",
                                    fontFamily: "'Inter', sans-serif",
                                  }}
                                  onMouseEnter={(e) => {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.opacity = "0.82";
                                  }}
                                  onMouseLeave={(e) => {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.opacity = "1";
                                  }}
                                >
                                  Continue with this
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAcceptedSavedProfile(false);
                                    setShowSavedProfileAlert(false);
                                  }}
                                  style={{
                                    height: "36px",
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
                                    transition: "background 0.12s ease",
                                    fontFamily: "'Inter', sans-serif",
                                  }}
                                  onMouseEnter={(e) => {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.background =
                                      "hsl(var(--secondary) / 0.7)";
                                  }}
                                  onMouseLeave={(e) => {
                                    (
                                      e.currentTarget as HTMLElement
                                    ).style.background = "transparent";
                                  }}
                                >
                                  <RefreshCw size={12} /> Recalculate
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })()}
                  {isLoadingSavedProfile && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "20px",
                        background: "hsl(var(--card) / 0.4)",
                        backdropFilter: "blur(8px)",
                        border: "1px dashed hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    >
                      <Loader2
                        size={16}
                        style={{
                          animation: "spin 0.8s linear infinite",
                          color: "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13.5px",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 300,
                        }}
                      >
                        Loading your saved profile…
                      </span>
                    </div>
                  )}
                  {!isLoadingSavedProfile && !showSavedProfileAlert && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 16px",
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
                          Answer a few questions and we'll compute the optimal
                          risk profile for you.
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
                            <Label htmlFor={f.id} required={f.required}>
                              {f.label}
                            </Label>
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
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <Label required>Investment timeline</Label>
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

            {/* ── Stock Selection ── */}
            <div>
              <p className="mono-label" style={{ marginBottom: "14px" }}>
                Stock selection
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <AnimatePresence>
                  {stocks.map((stock, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ delay: index * 0.04 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div style={{ flex: 1, position: "relative" }}>
                        <input
                          type="text"
                          placeholder="Ticker — e.g. RELIANCE, TCS, INFY"
                          value={stock.ticker}
                          onChange={(e) =>
                            handleTickerChange(index, e.target.value)
                          }
                          disabled={stock.isLoading}
                          onFocus={() => setFocused(`ticker-${index}`)}
                          onBlur={() => setFocused(null)}
                          style={{
                            ...fieldStyle(focused === `ticker-${index}`),
                            paddingRight: "40px",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "13.5px",
                            letterSpacing: "0.03em",
                            borderColor: stock.isVerified
                              ? "var(--green-border)"
                              : focused === `ticker-${index}`
                                ? "hsl(var(--foreground) / 0.35)"
                                : "hsl(var(--border))",
                            background: stock.isVerified
                              ? "var(--green-subtle)"
                              : "hsl(var(--card) / 0.6)",
                            opacity: stock.isLoading ? 0.6 : 1,
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                        >
                          {stock.isLoading && (
                            <Loader2
                              size={13}
                              style={{
                                color: "hsl(var(--muted-foreground))",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                          )}
                          {stock.isVerified && !stock.isLoading && (
                            <CheckCircle2
                              size={13}
                              style={{ color: "var(--green)" }}
                            />
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => removeStockField(index, e)}
                        disabled={stocks.length === 1 || stock.isLoading}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          background: "transparent",
                          border: "1px solid hsl(var(--border))",
                          cursor:
                            stocks.length === 1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "hsl(var(--muted-foreground))",
                          opacity: stocks.length === 1 ? 0.4 : 1,
                          transition: "background 0.12s ease",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (stocks.length > 1)
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
                onClick={(e) => addStockField(e)}
                disabled={stocks.some((s) => s.isLoading)}
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

            {/* ── Investment Amount ── */}
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
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
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
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "11px",
                        color: "hsl(var(--muted-foreground))",
                        opacity: 0.5,
                      }}
                    >
                      ·{" "}
                      {stocks.length > 1
                        ? `÷ ${stocks.length} stocks`
                        : "1 stock"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Submit ── */}
          <div style={{ padding: "0 28px 28px" }}>
            <button
              type="button"
              onClick={(e) => handleSubmit(e)}
              disabled={
                isLoading ||
                stocks.some((s) => s.isLoading) ||
                (!isLoggedIn && !localStorage.getItem("userId"))
              }
              style={{
                width: "100%",
                height: "42px",
                background:
                  isLoading ||
                  stocks.some((s) => s.isLoading) ||
                  (!isLoggedIn && !localStorage.getItem("userId"))
                    ? "hsl(var(--muted) / 0.6)"
                    : "hsl(var(--foreground))",
                color:
                  isLoading ||
                  stocks.some((s) => s.isLoading) ||
                  (!isLoggedIn && !localStorage.getItem("userId"))
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
                  Optimizing portfolio…
                </>
              ) : !isLoggedIn && !localStorage.getItem("userId") ? (
                "Sign in to optimize"
              ) : (
                <>
                  Optimize portfolio <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Results ── */}
      <AnimatePresence>
        {!isLoading && submittedStocks && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.15 }}
            style={{ marginTop: "32px" }}
          >
            <ResultsDisplay
              stocks={submittedStocks}
              optimizedAllocation={optimizedAllocation}
              riskMetric={riskMetric}
              expectedReturn={expectedReturn}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StockInput;
