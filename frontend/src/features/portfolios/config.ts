import type { PortfolioGroup } from "./types";

export const API_BASE = import.meta.env.VITE_API_URL as string;

export const CART_KEY = "portfolioCart_v1";

export const COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
];

export function fmtDate(s: string): string {
  const d = new Date(s);
  const t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  const tDay = new Date(t); tDay.setHours(0, 0, 0, 0);
  const yDay = new Date(y); yDay.setHours(0, 0, 0, 0);
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (dDay.getTime() === tDay.getTime()) return `Today · ${timeStr}`;
  if (dDay.getTime() === yDay.getTime()) return `Yesterday · ${timeStr}`;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function exportCSV(groups: PortfolioGroup[]): void {
  const rows = [["Date", "Ticker", "Allocation (%)"]];
  groups.forEach((g) => g.stocks.forEach((s) => rows.push([g.date, s.ticker, s.allocation.toFixed(2)])));
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "portfolio.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function reOptimize(tickers: string[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(tickers));
  window.location.href = "/Optimizer";
}
