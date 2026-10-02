import data from "./nifty-weekly.json";

export const NIFTY = data as { symbol: string; as_of: string; start: string; weekly: number[]; dates: string[] };

export function niftyWindow(weeks: number) {
  return NIFTY.weekly.slice(-weeks);
}

export function niftyChange(weeks: number) {
  const w = NIFTY.weekly;
  const a = w[Math.max(0, w.length - 1 - weeks)];
  const b = w[w.length - 1];
  return b / a - 1;
}

export function niftyCagr() {
  const w = NIFTY.weekly;
  const years = (new Date(NIFTY.as_of).getTime() - new Date(NIFTY.start).getTime()) / (365.25 * 864e5);
  return Math.pow(w[w.length - 1] / w[0], 1 / years) - 1;
}
