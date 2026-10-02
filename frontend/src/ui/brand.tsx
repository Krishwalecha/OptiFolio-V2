import React from "react";
import { cn } from "@/lib/utils";

export const Mark: React.FC<{ size?: number; className?: string }> = ({ size = 22, className }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("shrink-0 text-brand", className)} aria-hidden="true">
      <defs>
        <linearGradient id={`m-${id}`} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6.5" fill="currentColor" />
      <rect width="24" height="24" rx="6.5" fill={`url(#m-${id})`} />
      <path d="M16.9 7.1A7 7 0 1 0 19 12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="18.6" cy="5.4" r="2.2" fill="#fff" />
    </svg>
  );
};

export const Wordmark: React.FC<{ size?: number; className?: string }> = ({ size = 22, className }) => (
  <span className={cn("inline-flex items-center gap-2.5", className)}>
    <Mark size={size} />
    <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">OptiFolio</span>
  </span>
);

export const FitWordmark: React.FC<{ text?: string; className?: string }> = ({ text = "OptiFolio", className }) => {
  const ref = React.useRef<SVGTextElement>(null);
  const [box, setBox] = React.useState("0 0 1000 220");
  const id = React.useId().replace(/:/g, "");
  React.useLayoutEffect(() => {
    const fit = () => {
      const b = ref.current?.getBBox();
      if (b && b.width) setBox(`${b.x} ${b.y + b.height * 0.14} ${b.width} ${b.height * 0.8}`);
    };
    fit();
    document.fonts?.ready.then(fit);
  }, [text]);
  return (
    <svg viewBox={box} className={cn("block h-auto w-full", className)} role="img" aria-label={text}>
      <defs>
        <linearGradient id={`fade-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text ref={ref} x="0" y="200" fill={`url(#fade-${id})`} style={{ font: "600 240px Geist, system-ui, sans-serif", letterSpacing: "-0.035em" }}>
        {text}
      </text>
    </svg>
  );
};
