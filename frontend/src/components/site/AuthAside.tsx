import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { NIFTY } from "@/features/market/nifty";
import { DitherTerrain, Wordmark } from "@/ui";

export const AuthLayout: React.FC<{ title: string; subtitle: React.ReactNode; children: React.ReactNode }> = ({ title, subtitle, children }) => {
  const values = useMemo(() => NIFTY.weekly.slice(-156), []);
  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="no-underline" aria-label="OptiFolio home">
            <Wordmark size={20} />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground no-underline hover:text-foreground">
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="text-[28px] font-medium leading-tight tracking-[-0.035em]">{title}</h1>
          <p className="mb-8 mt-2 text-[14px] text-muted-foreground">{subtitle}</p>
          {children}
        </div>
        <p className="m-0 text-center text-[11.5px] text-muted-foreground">An educational tool. Not investment advice.</p>
      </div>

      <aside className="relative m-3 hidden flex-col overflow-hidden rounded-3xl bg-card ring-1 ring-inset ring-[var(--hairline)] lg:flex">
        <div className="p-10">
          <p className="m-0 max-w-[26ch] text-[26px] font-medium leading-[1.15] tracking-[-0.035em]">Every result shows what the model thinks of each stock, and how much risk the mix carries.</p>
          <dl className="m-0 mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              ["40+", "features per stock"],
              ["15,000", "simulated mixes"],
              ["5 yrs", "of daily prices"],
            ].map(([v, k]) => (
              <div key={k}>
                <dd className="num m-0 text-[26px] font-medium leading-none tracking-[-0.04em]">{v}</dd>
                <dt className="mt-2 text-[12px] text-muted-foreground">{k}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="mt-auto h-[46%] text-foreground/60">
          <DitherTerrain values={values} pixel={4} />
        </div>
        <div className="absolute bottom-4 left-10 text-[11.5px] text-muted-foreground">Nifty 50, last three years</div>
      </aside>
    </div>
  );
};

export function safeNext(search: string) {
  const n = new URLSearchParams(search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/Dashboard";
}
