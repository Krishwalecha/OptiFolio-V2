import React from "react";

const HeroBackdrop: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(55% 60% at 50% -10%, hsl(var(--brand) / 0.3), transparent 70%), radial-gradient(30% 40% at 85% 0%, hsl(var(--brand) / 0.1), transparent 70%)",
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(to right, var(--hairline) 1px, transparent 1px), linear-gradient(to bottom, var(--hairline) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent 80%)",
        WebkitMaskImage: "radial-gradient(70% 60% at 50% 30%, black, transparent 80%)",
      }}
    />
    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background" />
  </div>
);

export default HeroBackdrop;
