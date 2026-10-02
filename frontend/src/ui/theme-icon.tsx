import React, { useId } from "react";
import { cn } from "@/lib/utils";

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

export const ThemeIcon: React.FC<{ dark: boolean; size?: number; className?: string }> = ({ dark, size = 16, className }) => {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={cn("theme-icon", dark && "is-dark", className)}>
      <mask id={id}>
        <rect width="24" height="24" fill="white" />
        <circle className="ti-cut" cx="17" cy="7" r="6.5" fill="black" />
      </mask>
      <g mask={`url(#${id})`}>
        <circle className="ti-core" cx="12" cy="12" r="4.5" fill="currentColor" />
      </g>
      <g className="ti-rays" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {RAYS.map((d) => (
          <line key={d} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${d} 12 12)`} />
        ))}
      </g>
    </svg>
  );
};
