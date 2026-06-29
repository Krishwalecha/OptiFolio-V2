export interface ChartPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AllocationReason {
  predictedReturn: number;
  compositeScore: number;
  dirAccuracy: number;
  ic: number;
}

export type MlTrust = "strong" | "partial" | "hist";

export function computeAnnVol(data: ChartPoint[]): number | null {
  if (data.length < 10) return null;
  const rets = data.slice(1).map((d, i) => Math.log(d.close / data[i].close));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const v = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
  return Math.sqrt(v * 252) * 100;
}

export function computeTrend(data: ChartPoint[], days: number): number | null {
  if (data.length < days + 1) return null;
  const last = data[data.length - 1].close;
  const ago = data[Math.max(0, data.length - days)].close;
  return ((last - ago) / ago) * 100;
}

export function computeMaxDD(data: ChartPoint[]): number | null {
  if (data.length < 2) return null;
  let peak = data[0].close, maxDd = 0;
  for (const pt of data) {
    if (pt.close > peak) peak = pt.close;
    const dd = (peak - pt.close) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd * 100;
}

export function mlTrustLevel(ic: number, dirAcc: number): MlTrust {
  if (ic > 0.05 && dirAcc >= 0.5) return "strong";
  if (ic > -0.1) return "partial";
  return "hist";
}

export function isMlTrusted(ic: number, dirAcc: number): boolean {
  return mlTrustLevel(ic, dirAcc) !== "hist";
}

export function allocationSummary(reason: AllocationReason, change: number): string {
  const level = mlTrustLevel(reason.ic, reason.dirAccuracy);
  const pr = (reason.predictedReturn * 100).toFixed(1);
  const da = (reason.dirAccuracy * 100).toFixed(0);
  if (level === "strong")
    return `Strong ML signal — IC ${reason.ic.toFixed(3)}, ${da}% directional accuracy. Predicted return ${pr}% drives allocation.`;
  if (level === "partial")
    return `Weak ML signal (IC ${reason.ic.toFixed(3)}) — blended with historical returns. Predicted ${pr}% annual return.`;
  return `No ML signal (IC ${reason.ic.toFixed(3)}) — allocated from 5Y historical returns${change < -10 ? ` despite recent ${change.toFixed(0)}% decline` : ""}.`;
}

export function modalAnalysis(
  reason: AllocationReason,
  allocation: number,
  change: number,
  vol: number | null,
  t90: number | null,
  t30: number | null,
  maxDd: number | null,
): { strengths: string[]; concerns: string[] } {
  const trusted = isMlTrusted(reason.ic, reason.dirAccuracy);
  const pr = reason.predictedReturn * 100;
  const s: string[] = [];
  const c: string[] = [];

  if (trusted) {
    if (pr >= 15) s.push(`Strong ML predicted return: +${pr.toFixed(1)}% annualised`);
    else if (pr >= 5) s.push(`Positive ML predicted return: +${pr.toFixed(1)}% annualised`);
    if (reason.dirAccuracy >= 0.57)
      s.push(`High direction accuracy: ${(reason.dirAccuracy * 100).toFixed(1)}% correct up/down calls`);
    if (reason.ic >= 0.05)
      s.push(`Solid IC ${reason.ic.toFixed(3)} — predictions correlate with actual returns`);
  } else {
    if (reason.dirAccuracy < 0.5)
      c.push(`Direction accuracy ${(reason.dirAccuracy * 100).toFixed(1)}% is below random chance — ML prediction ignored`);
    else
      c.push(`IC ≤ 0 — model predictions uncorrelated with actual returns — ML ignored`);
  }

  if (change >= 20) s.push(`Strong gain over this period: +${change.toFixed(1)}%`);
  else if (change >= 5) s.push(`Positive trend over this period: +${change.toFixed(1)}%`);
  else if (change <= -20) c.push(`Steep decline this period: ${change.toFixed(1)}% — recovery bet`);
  else if (change < -5) c.push(`Negative trend over this period: ${change.toFixed(1)}%`);

  if (t90 !== null && t90 >= 10) s.push(`Recent momentum: +${t90.toFixed(1)}% over last 90 days`);
  if (t90 !== null && t90 <= -10) c.push(`Recent weakness: ${t90.toFixed(1)}% over last 90 days`);
  if (t30 !== null && t30 >= 7) s.push(`Short-term strength: +${t30.toFixed(1)}% over last 30 days`);
  if (t30 !== null && t30 <= -7) c.push(`Short-term weakness: ${t30.toFixed(1)}% over last 30 days`);

  if (vol !== null && vol < 18) s.push(`Low volatility: ${vol.toFixed(1)}% annualised`);
  if (vol !== null && vol > 38) c.push(`High volatility: ${vol.toFixed(1)}% annualised`);
  else if (vol !== null && vol > 27) c.push(`Elevated volatility: ${vol.toFixed(1)}% annualised`);

  if (maxDd !== null && maxDd < 12) s.push(`Mild drawdown: −${maxDd.toFixed(1)}% peak-to-trough`);
  if (maxDd !== null && maxDd > 40) c.push(`Severe drawdown: −${maxDd.toFixed(1)}% peak-to-trough`);
  else if (maxDd !== null && maxDd > 25) c.push(`Significant drawdown: −${maxDd.toFixed(1)}% peak-to-trough`);

  if (allocation >= 35 && !trusted && change < -10)
    c.push(`${allocation.toFixed(0)}% concentrated in declining stock based on historical returns alone`);
  if (allocation <= 3.5)
    c.push(`Minimum floor weight (${allocation.toFixed(0)}%) — lowest rank among picks`);
  else if (allocation >= 35)
    s.push(`Top return rank → maximum weight allocation (${allocation.toFixed(0)}%)`);

  return { strengths: s.slice(0, 5), concerns: c.slice(0, 5) };
}
