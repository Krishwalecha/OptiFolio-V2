import React, { Suspense, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, LogIn, LogOut, Menu as MenuIcon, Search, Wand2 } from "lucide-react";
import { NAV } from "@/components/app/nav";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { LESSONS } from "@/features/learn/lessons";
import { Avatar, Button, CommandMenu, Kbd, Menu, PageLoader, Pulse, Sheet, ThemeIcon, Wordmark, type Command } from "@/ui";
import { cn } from "@/lib/utils";

function marketStatus(now = new Date()) {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const d = ist.getDay();
  const m = ist.getHours() * 60 + ist.getMinutes();
  const open = d > 0 && d < 6 && m >= 555 && m < 930;
  return { open, label: open ? "NSE open" : "NSE closed", time: ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) };
}

const MarketClock: React.FC = () => {
  const [s, setS] = useState(marketStatus);
  useEffect(() => {
    const t = window.setInterval(() => setS(marketStatus()), 30000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 px-2.5 text-[12px] text-muted-foreground" title="Regular session 09:15 to 15:30 IST, Monday to Friday. Exchange holidays are not accounted for.">
      {s.open ? <Pulse size={8} className="text-[var(--green)]" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
      <span>{s.label}</span>
      <span className="num ml-auto">{s.time} IST</span>
    </div>
  );
};

const NavLinks: React.FC<{ scope: string; onNavigate?: () => void }> = ({ scope, onNavigate }) => {
  const path = useLocation().pathname.toLowerCase();
  return (
    <nav className="space-y-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <div className="px-2.5 pb-1.5 text-[11.5px] text-muted-foreground/80">{g.group}</div>
          <ul className="m-0 list-none space-y-px p-0">
            {g.items.map(({ label, path: to, icon: Icon }) => {
              const t = to.toLowerCase();
              const active = path === t || path.startsWith(t + "/");
              return (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] no-underline transition-colors duration-150",
                      active ? "font-medium text-foreground" : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span layoutId={`nav-${scope}`} className="absolute inset-0 rounded-lg bg-foreground/[0.06]" transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}>
                        <span className="absolute inset-y-2 -left-3 w-[3px] rounded-r-full bg-brand" />
                      </motion.span>
                    )}
                    <Icon size={16} strokeWidth={1.75} className={cn("relative", active && "text-brand")} />
                    <span className="relative">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

const Account: React.FC = () => {
  const { isLoggedIn, userName, userEmail, logout } = useAuth();
  const navigate = useNavigate();
  if (!isLoggedIn)
    return (
      <Link to="/SignIn" className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-muted-foreground no-underline hover:bg-foreground/[0.05] hover:text-foreground">
        <LogIn size={16} strokeWidth={1.75} /> Sign in
      </Link>
    );
  return (
    <Menu
      align="start"
      header={
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{userName || "Investor"}</div>
          <div className="truncate text-[12px] text-muted-foreground">{userEmail}</div>
        </div>
      }
      items={[
        {
          label: "Sign out",
          icon: <LogOut size={15} />,
          danger: true,
          onSelect: () => {
            logout();
            navigate("/");
          },
        },
      ]}
      trigger={(p) => (
        <button type="button" {...p} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.05]">
          <Avatar name={userName || userEmail || "U"} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{userName || "Investor"}</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">{userEmail}</span>
          </span>
        </button>
      )}
    />
  );
};

const SidebarBody: React.FC<{ scope: string; onSearch: () => void; onNavigate?: () => void }> = ({ scope, onSearch, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="flex h-full flex-col px-3 pb-3 pt-4">
      <Link to="/" onClick={onNavigate} className="px-2.5 py-1 no-underline">
        <Wordmark size={20} />
      </Link>
      <button
        type="button"
        onClick={onSearch}
        className="mt-5 flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] text-muted-foreground ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
      >
        <Search size={14} />
        Search
        <span className="ml-auto flex gap-0.5">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="mt-6 flex-1 overflow-y-auto">
        <NavLinks scope={scope} onNavigate={onNavigate} />
      </div>
      <div className="space-y-2 border-t border-[var(--hairline)] pt-3">
        <MarketClock />
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <Account />
          </div>
          <Button variant="ghost" size="sm" icon onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            <ThemeIcon dark={theme === "dark"} size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const AppLayout: React.FC = () => {
  const [search, setSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setDrawer(false), [location.pathname]);

  const commands = useMemo<Command[]>(
    () => [
      { id: "new", label: "New optimization", group: "Actions", icon: <Wand2 />, run: () => navigate("/Optimizer") },
      { id: "theme", label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`, group: "Actions", icon: <ThemeIcon dark={theme === "dark"} />, keywords: "theme appearance", run: toggleTheme },
      ...NAV.flatMap((g) => g.items).map(({ label, path, icon: Icon }) => ({ id: path, label, group: "Go to", icon: <Icon />, run: () => navigate(path) })),
      ...LESSONS.map((l) => ({ id: `l-${l.slug}`, label: l.title, group: "Lessons", icon: <BookOpen />, keywords: "learn lesson", run: () => navigate(`/Learn/${l.slug}`) })),
    ],
    [navigate, theme, toggleTheme],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-[var(--hairline)] bg-background lg:block">
        <SidebarBody scope="rail" onSearch={() => setSearch(true)} />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-[var(--hairline)] bg-background/80 px-3 backdrop-blur-md lg:hidden">
        <Button variant="ghost" icon aria-label="Open navigation" onClick={() => setDrawer(true)}>
          <MenuIcon size={18} />
        </Button>
        <Link to="/" className="no-underline">
          <Wordmark size={18} />
        </Link>
        <Button variant="ghost" icon aria-label="Search" onClick={() => setSearch(true)} className="ml-auto">
          <Search size={17} />
        </Button>
      </header>

      <Sheet open={drawer} onClose={() => setDrawer(false)} side="left" width={272} bare>
        <SidebarBody
          scope="drawer"
          onSearch={() => {
            setDrawer(false);
            setSearch(true);
          }}
          onNavigate={() => setDrawer(false)}
        />
      </Sheet>

      <div className="lg:pl-[240px]">
        <main key={location.pathname} className="page-enter w-full px-4 pb-20 sm:px-6 lg:px-10">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandMenu open={search} onClose={() => setSearch(false)} commands={commands} />
    </div>
  );
};

const AppShell: React.FC<{
  title?: React.ReactNode;
  accent?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  bare?: boolean;
  children: React.ReactNode;
}> = ({ title, accent, description, actions, bare = false, children }) => (
  <>
    {!bare && title && (
      <header className="flex flex-col gap-4 pb-8 pt-8 sm:pt-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[42rem]">
          <h1 className="text-[28px] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[32px]">
            {title}
            {accent && <span className="text-muted-foreground"> {accent}</span>}
          </h1>
          {description && <p className="mt-2.5 max-w-[36rem] text-[14.5px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>
    )}
    {children}
  </>
);

export default AppShell;
