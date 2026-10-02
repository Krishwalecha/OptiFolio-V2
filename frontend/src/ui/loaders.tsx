import React from "react";
import { cn } from "@/lib/utils";

type P = { size?: number; className?: string; label?: string };

const wrap = (label: string, size: number, className: string | undefined, children: React.ReactNode) => (
  <span role="status" aria-label={label} className={cn("relative inline-grid shrink-0 place-items-center text-current", className)} style={{ width: size, height: size }}>
    {children}
  </span>
);

export const Ring: React.FC<P> = ({ size = 16, className, label = "Loading" }) =>
  wrap(
    label,
    size,
    className,
    <svg viewBox="0 0 24 24" width={size} height={size} className="ld-spin" fill="none">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>,
  );

export const CircularDots: React.FC<P> = ({ size = 18, className, label = "Loading" }) =>
  wrap(
    label,
    size,
    className,
    <svg viewBox="0 0 24 24" width={size} height={size} className="ld-step">
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={12 + Math.cos(a) * 8.5} cy={12 + Math.sin(a) * 8.5} r="1.9" fill="currentColor" opacity={0.15 + (i / 7) * 0.85} />;
      })}
    </svg>,
  );

export const Dots: React.FC<P> = ({ size = 20, className, label = "Loading" }) =>
  wrap(
    label,
    size,
    className,
    <span className="flex items-center" style={{ gap: size * 0.14 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="ld-dot rounded-full bg-current" style={{ width: size * 0.2, height: size * 0.2, animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>,
  );

export const Blocks: React.FC<P> = ({ size = 18, className, label = "Loading" }) =>
  wrap(
    label,
    size,
    className,
    <span className="grid grid-cols-3" style={{ gap: size * 0.08, width: size, height: size }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="ld-block rounded-[1.5px] bg-current" style={{ animationDelay: `${((i % 3) + Math.floor(i / 3)) * 0.1}s` }} />
      ))}
    </span>,
  );

export const Wave: React.FC<P> = ({ size = 20, className, label = "Loading" }) =>
  wrap(
    label,
    size,
    className,
    <span className="flex h-full items-center" style={{ gap: size * 0.1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="ld-bar rounded-full bg-current" style={{ width: size * 0.1, height: size * 0.7, animationDelay: `${i * 0.1}s` }} />
      ))}
    </span>,
  );

export const Pulse: React.FC<P> = ({ size = 10, className, label = "Live" }) =>
  wrap(
    label,
    size,
    className,
    <>
      <span className="ld-ping absolute inset-0 rounded-full bg-current" />
      <span className="relative rounded-full bg-current" style={{ width: size * 0.6, height: size * 0.6 }} />
    </>,
  );

export const LinearBar: React.FC<{ className?: string }> = ({ className }) => (
  <div role="progressbar" aria-label="Loading" className={cn("relative h-[2px] w-full overflow-hidden rounded-full bg-foreground/[0.07]", className)}>
    <span className="ld-slide absolute inset-y-0 w-1/3 rounded-full bg-brand" />
  </div>
);

export const PageLoader: React.FC<{ label?: string }> = ({ label = "Loading" }) => (
  <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
    <div className="flex flex-col items-center gap-3">
      <Blocks size={20} />
      <span className="text-[12px]">{label}</span>
    </div>
  </div>
);
