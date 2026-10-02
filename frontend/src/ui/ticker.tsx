import React, { useEffect, useRef, useState } from "react";

const reduce = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(reduce() ? target : 0);
  const from = useRef(0);
  useEffect(() => {
    if (reduce() || !isFinite(target)) return setV(target);
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 4);
      setV(a + (target - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export const NumberTicker: React.FC<{ value: number; format?: (v: number) => string; className?: string; duration?: number }> = ({ value, format = (v) => v.toFixed(0), className, duration }) => {
  const v = useCountUp(value, duration);
  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden="true">{format(v)}</span>
    </span>
  );
};

export const inr = (v: number, digits = 0) => "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
export const pct = (v: number, digits = 1, signed = false) => `${signed && v > 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;
export const compactInr = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return inr(v);
};
