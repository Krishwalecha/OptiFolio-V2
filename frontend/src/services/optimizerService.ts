const API_BASE = import.meta.env.VITE_API_URL as string;

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
    { predicted_return: number; composite_score: number; dir_accuracy: number; ic: number }
  >;
  chart_data: ChartDataMap;
  dropped_stocks: DroppedStock[];
}

export interface OptimizeRequest {
  tickers: string[];
  investment: number;
  risk: RiskProfile;
  userId: string;
  deepMode?: boolean;
}

export async function optimize(req: OptimizeRequest): Promise<OptimizeResult> {
  const res = await fetch(`${API_BASE}/api/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Server error ${res.status}`);
  }

  return data as OptimizeResult;
}
