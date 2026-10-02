import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu as MenuIcon, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Button, ThemeIcon, Wordmark, buttonClass } from "@/ui";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Optimizer", path: "/Optimizer" },
  { label: "Method", path: "/About" },
  { label: "Markets", path: "/FinancialNews" },
  { label: "SIP planner", path: "/SIPCalculator" },
  { label: "Learn", path: "/Learn" },
];
const MORE = [
  { label: "Portfolios", path: "/Portfolios" },
  { label: "Community", path: "/Community" },
];
const EASE = [0.22, 1, 0.36, 1] as const;

const Navbar: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const shell = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !shell.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  const isActive = (p: string) => pathname.toLowerCase() === p.toLowerCase() || pathname.toLowerCase().startsWith(p.toLowerCase() + "/");

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center px-3 sm:px-5">
      <div
        ref={shell}
        className={cn(
          "relative mx-auto w-full transition-[max-width,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled || open ? "max-w-[920px]" : "max-w-[1200px]",
        )}
      >
        <div
          className={cn(
            "flex h-12 items-center gap-2 rounded-full pl-4 pr-1.5 ring-1 ring-inset transition-[background-color,box-shadow,--tw-ring-color] duration-500",
            scrolled || open
              ? "bg-background/75 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.35)] ring-[var(--hairline)] backdrop-blur-xl backdrop-saturate-150"
              : "bg-transparent ring-transparent",
          )}
        >
          <Link to="/" className="mr-2 shrink-0 no-underline" aria-label="OptiFolio home">
            <Wordmark size={20} />
          </Link>

          <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Main" onMouseLeave={() => setHover(null)}>
            {LINKS.map((l) => {
              const active = isActive(l.path);
              return (
                <Link
                  key={l.path}
                  to={l.path}
                  onMouseEnter={() => setHover(l.path)}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative rounded-full px-3.5 py-1.5 text-[13.5px] no-underline transition-colors duration-200", active || hover === l.path ? "text-foreground" : "text-muted-foreground")}
                >
                  {hover === l.path && <motion.span layoutId="nav-hover" className="absolute inset-0 rounded-full bg-foreground/[0.06]" transition={{ duration: 0.3, ease: EASE }} />}
                  <span className="relative">{l.label}</span>
                  {active && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand" />}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" icon className="rounded-full" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              <ThemeIcon dark={theme === "dark"} size={16} />
            </Button>
            {isLoggedIn ? (
              <Link to="/Dashboard" className={cn(buttonClass("primary", "sm"), "hidden rounded-full pl-4 pr-3 sm:inline-flex")}>
                Open app <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/SignIn" className="hidden rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground no-underline transition-colors hover:text-foreground sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/SignUp" className={cn(buttonClass("primary", "sm"), "hidden rounded-full pl-4 pr-3 sm:inline-flex")}>
                  Get started <ArrowRight size={14} />
                </Link>
              </>
            )}
            <Button variant="ghost" icon className="rounded-full md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? <X size={18} /> : <MenuIcon size={18} />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="absolute inset-x-0 top-[calc(100%+8px)] origin-top rounded-3xl bg-popover p-2 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-[var(--hairline)] md:hidden"
            >
              <nav className="flex flex-col" aria-label="Mobile">
                {[...LINKS, ...MORE].map((l, i) => (
                  <motion.div key={l.path} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i, duration: 0.2 }}>
                    <Link
                      to={l.path}
                      className={cn(
                        "flex h-11 items-center justify-between rounded-2xl px-4 text-[15px] no-underline transition-colors hover:bg-foreground/[0.05]",
                        isActive(l.path) ? "font-medium text-foreground" : "text-foreground/85",
                      )}
                    >
                      {l.label}
                      {isActive(l.path) && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="mt-2 grid gap-2 border-t border-[var(--hairline)] p-2 pt-3">
                {isLoggedIn ? (
                  <Link to="/Dashboard" className={cn(buttonClass("primary", "lg"), "rounded-full")}>
                    Open app <ArrowRight size={15} />
                  </Link>
                ) : (
                  <>
                    <Link to="/SignUp" className={cn(buttonClass("primary", "lg"), "rounded-full")}>
                      Get started <ArrowRight size={15} />
                    </Link>
                    <Link to="/SignIn" className={cn(buttonClass("secondary", "lg"), "rounded-full")}>
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
