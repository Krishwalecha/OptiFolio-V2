import React from "react";
import { Link } from "react-router-dom";
import { FitWordmark, Mark } from "@/ui";

const COLS = [
  {
    title: "Product",
    links: [
      ["Optimizer", "/Optimizer"],
      ["Portfolios", "/Portfolios"],
      ["Markets", "/FinancialNews"],
      ["SIP planner", "/SIPCalculator"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["Method", "/About"],
      ["Lessons", "/Learn"],
      ["Community", "/Community"],
    ],
  },
];

const Footer: React.FC = () => (
  <footer className="mt-auto border-t border-[var(--hairline)]">
    <div className="mx-auto max-w-[1200px] px-5 pt-14 sm:px-8">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Mark size={22} />
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
            A portfolio optimizer for NSE stocks that shows its work. Built as an independent project; not a registered investment adviser, and nothing here is a recommendation to buy or sell.
          </p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <div className="text-[12.5px] text-muted-foreground">{c.title}</div>
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {c.links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="text-[13.5px] text-foreground/85 no-underline transition-colors hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-14 flex flex-col justify-between gap-2 text-[12px] text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} OptiFolio. End-of-day data from Yahoo Finance and AMFI.</span>
      </div>
      <div className="mt-12 w-full select-none text-foreground" aria-hidden="true">
        <FitWordmark />
      </div>
    </div>
  </footer>
);

export default Footer;
