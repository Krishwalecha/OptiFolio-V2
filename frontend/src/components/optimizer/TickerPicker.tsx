import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import { API_BASE } from "@/features/optimizer/config";
import { Kbd, Ring } from "@/ui";
import { cn } from "@/lib/utils";

interface Suggestion {
  ticker: string;
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
}

export interface Pick {
  ticker: string;
  name?: string;
}

const POPULAR = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "ITC", "LT", "SUNPHARMA", "BHARTIARTL", "TITAN"];
export const MAX_TICKERS = 15;

const TickerPicker: React.FC<{ value: Pick[]; onChange: (v: Pick[]) => void; invalid?: boolean }> = ({ value, onChange, invalid }) => {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const full = value.length >= MAX_TICKERS;
  const has = (t: string) => value.some((v) => v.ticker === t);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setItems([]);
      return;
    }
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`${API_BASE}/api/searchStocks?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const d = await r.json();
        setItems((d.results ?? []).filter((s: Suggestion) => s.exchange === "NSE" || !(d.results as Suggestion[]).some((o) => o.exchange === "NSE" && o.ticker === s.ticker)));
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted or offline */
      } finally {
        setBusy(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const add = (p: Pick) => {
    const t = p.ticker.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
    if (!t || has(t) || full) return;
    onChange([...value, { ticker: t, name: p.name }]);
    setQ("");
    setItems([]);
    setOpen(false);
    input.current?.focus();
  };

  const remove = (t: string) => onChange(value.filter((v) => v.ticker !== t));

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && items[active]) add({ ticker: items[active].ticker, name: items[active].name });
      else if (/^[A-Za-z0-9&.-]{2,20}$/.test(q.trim())) add({ ticker: q });
    } else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !q && value.length) remove(value[value.length - 1].ticker);
  };

  return (
    <div ref={root} className="relative">
      <div
        onClick={() => input.current?.focus()}
        className={cn(
          "flex min-h-[48px] cursor-text flex-wrap items-center gap-1.5 rounded-xl bg-card p-1.5 pl-3 ring-1 ring-inset transition-shadow focus-within:ring-2 focus-within:ring-brand",
          invalid ? "ring-[var(--red)]" : "ring-[var(--hairline)] hover:ring-foreground/20",
        )}
      >
        <Search size={15} className="shrink-0 text-muted-foreground" />
        <AnimatePresence initial={false}>
          {value.map((v) => (
            <motion.span
              key={v.ticker}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.16 }}
              title={v.name}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-foreground/[0.06] pl-2.5 pr-1 text-[13px] font-medium"
            >
              {v.ticker}
              <button
                type="button"
                aria-label={`Remove ${v.ticker}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(v.ticker);
                }}
                className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              >
                <X size={12} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          ref={input}
          value={q}
          disabled={full}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => items.length && setOpen(true)}
          placeholder={full ? `Limit of ${MAX_TICKERS} stocks reached` : value.length ? "Add another" : "Search by company or ticker"}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Add stocks"
          className="h-8 min-w-[140px] flex-1 bg-transparent px-1.5 text-[14px] outline-none placeholder:text-muted-foreground/70"
        />
        {busy && <Ring size={14} className="mr-2 text-muted-foreground" />}
      </div>

      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="animate-pop absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-auto rounded-xl bg-popover p-1 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[var(--hairline)]">
          {items.map((s, i) => {
            const added = has(s.ticker);
            return (
              <li
                key={s.symbol}
                role="option"
                aria-selected={i === active}
                aria-disabled={added}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (!added) add({ ticker: s.ticker, name: s.name });
                }}
                className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5", i === active && "bg-secondary", added && "cursor-default opacity-50")}
              >
                <span className="w-24 shrink-0 truncate text-[13.5px] font-medium">{s.ticker}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">{added ? "Added" : s.exchange}</span>
              </li>
            );
          })}
          <li className="flex items-center gap-1.5 px-3 pb-1.5 pt-2 text-[11.5px] text-muted-foreground">
            <Kbd>↵</Kbd> to add, <Kbd>⌫</Kbd> removes the last one
          </li>
        </ul>
      )}

      {value.length < 3 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-muted-foreground">Popular</span>
          {POPULAR.filter((t) => !has(t))
            .slice(0, 7)
            .map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => add({ ticker: t })}
                className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-muted-foreground ring-1 ring-inset ring-[var(--hairline)] transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                <Plus size={11} />
                {t}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default TickerPicker;
