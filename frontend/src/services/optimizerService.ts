import { api } from "@/lib/api";

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface AllocationItem {
  ticker: string;
  weight_pct: number;
  price_inr: number;
  shares: number;
  invested_inr: number;
}

export interface Performance {
  expected_return: number;
  annualised_volatility: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  var_95: number;
  beta: number;
  // advanced
  annualised_return_hist: number;
  volatility_hist?: number;
  sharpe_hist?: number;
  calmar_ratio: number;
  omega_ratio: number;
  tail_ratio: number;
  hit_rate: number;
  var_99: number;
  cvar_95: number;
  drawdown_duration_d: number;
  n_days: number;
}

export interface ChartDataMap {
  [ticker: string]: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

export interface DroppedStock {
  ticker: string;
  predicted_return_pct: number;
  composite_score: number;
  ic: number;
  dir_accuracy: number;
  reason: string;
}

export interface OptimizeResult {
  risk_profile: RiskProfile;
  strategy: string;
  investment: number;
  candidates: string[];
  allocation: AllocationItem[];
  performance: Performance;
  scores: Record<
    string,
    {
      predicted_return: number;
      predicted_month?: number;
      composite_score: number;
      dir_accuracy: number;
      ic: number;
      ml_alpha?: number;
      market_percentile?: number;
    }
  >;
  chart_data: ChartDataMap;
  dropped_stocks: DroppedStock[];
  constraints?: { min_weight: number; max_weight: number };
  model?: ModelInfo;
  frontier?: Frontier;
  cached?: boolean;
  elapsed_ms?: number;
  core?: { ticker: string; weight: number } | null;
}

export interface ModelInfo {
  version: string;
  as_of: string;
  horizon_days: number;
  universe_size: number;
  oos_ic: number;
  oos_ic_tstat: number;
  oos_spread_hit_rate: number;
  oos_months: number;
  ml_active: boolean;
  ic_used?: number;
  deep: boolean;
}

export interface Frontier {
  simulated: [number, number][];
  chosen: [number, number];
  n_simulated: number;
}

export interface Constraints {
  minWeight?: number;
  maxWeight?: number;
  core?: number;
}

export interface RebalanceHolding {
  ticker: string;
  target_pct: number;
  buy_price: number;
  price: number;
  shares_est: number;
  invested_inr: number;
  value_inr: number;
  pnl_inr: number;
  pnl_pct: number;
  current_pct: number;
  drift_pp: number;
  trade_shares: number;
  error?: string;
}

export interface RebalanceReport {
  saved_at: string;
  as_of: string;
  holdings: RebalanceHolding[];
  total_invested: number;
  total_value: number;
  total_pnl_pct: number;
  max_drift_pp: number;
  needs_rebalance: boolean;
  threshold_pp: number;
  note: string;
  nifty_return_pct?: number | null;
  curve?: Array<{ date: string; portfolio: number; nifty50?: number }>;
}

export async function checkRebalance(sessionId: string): Promise<RebalanceReport> {
  const res = await api(`/api/rebalance/${encodeURIComponent(sessionId)}`);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);
  return data as RebalanceReport;
}

export interface OptimizeRequest {
  tickers: string[];
  investment: number;
  risk: RiskProfile;
  userId?: string;
  deepMode?: boolean;
  constraints?: Constraints;
}

export async function savePortfolio(userId: string, sessionId: string, allocation: AllocationItem[]): Promise<void> {
  const res = await api("/api/savePortfolio", {
    method: "POST",
    body: JSON.stringify({ userId, sessionId, allocation }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error ?? `Server error ${res.status}`);
}

export async function optimize(req: OptimizeRequest): Promise<OptimizeResult> {
  const res = await api("/api/optimize", {
    method: "POST",
    body: JSON.stringify(req),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Server error ${res.status}`);
  }

  return data as OptimizeResult;
}
