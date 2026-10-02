import React, { useState } from "react";
import { motion } from "framer-motion";
import demo from "@/features/market/landing-demo.json";

const { tickers: T, matrix: M, start, end } = demo.corr;
const SHORT: Record<string, string> = { HINDUNILVR: "HUL", SUNPHARMA: "SUNP", RELIANCE: "RELI", HDFCBANK: "HDFC", ICICIBANK: "ICIC" };
const yr = (s: string) => new Date(s).getFullYear();

const describe = (v: number) => (v >= 0.6 ? "move closely together" : v >= 0.4 ? "often move together" : v >= 0.25 ? "are loosely linked" : "mostly move independently");

const CorrelationMatrix: React.FC = () => {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const cell = hover && hover[0] !== hover[1] ? hover : null;

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `76px repeat(${T.length}, minmax(0,1fr))` }} onMouseLeave={() => setHover(null)}>
        <span />
        {T.map((t, j) => (
          <span key={t} className="truncate pb-1.5 text-center text-[9.5px] text-muted-foreground transition-opacity" style={{ opacity: hover && hover[1] === j ? 1 : 0.6 }}>
            {SHORT[t] ?? t.slice(0, 4)}
          </span>
        ))}
        {T.map((row, i) => (
          <React.Fragment key={row}>
            <span className="truncate pr-2 text-right text-[10.5px] text-muted-foreground transition-opacity" style={{ alignSelf: "center", opacity: hover && hover[0] === i ? 1 : 0.6 }}>
              {row}
            </span>
            {T.map((col, j) => {
              const v = M[i][j];
              const lit = hover && (hover[0] === i || hover[1] === j);
              return (
                <motion.span
                  key={col}
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (i + j) * 0.025, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={() => setHover([i, j])}
                  className="aspect-square rounded-[4px] transition-[outline,filter] duration-150"
                  style={{
                    background: i === j ? "hsl(var(--foreground) / 0.12)" : `hsl(var(--brand) / ${Math.max(0.06, Math.min(1, (v - 0.1) * 1.6))})`,
                    outline: hover && hover[0] === i && hover[1] === j ? "2px solid hsl(var(--foreground))" : "none",
                    filter: hover && !lit ? "saturate(0.6) opacity(0.55)" : "none",
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-5 flex min-h-[40px] items-start justify-between gap-4 border-t border-[var(--hairline)] pt-3 text-[12.5px]">
        <span className="text-muted-foreground">{cell ? `${T[cell[0]]} and ${T[cell[1]]} ${describe(M[cell[0]][cell[1]])}` : `Daily return correlations, ${yr(start)} to ${yr(end)}. Hover any cell.`}</span>
        <span className="num shrink-0 font-medium">{cell ? `ρ ${M[cell[0]][cell[1]].toFixed(2)}` : ""}</span>
      </div>
    </div>
  );
};

export default CorrelationMatrix;
