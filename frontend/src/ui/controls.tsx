import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option<T extends string = string> {
  value: T;
  label: React.ReactNode;
  hint?: React.ReactNode;
}

export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
}: {
  id?: string;
  value: T | null;
  onChange: (v: NoInfer<T>) => void;
  options: Option<NoInfer<T>>[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      return openList();
    }
    if (!open) return;
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") setActive((a) => Math.min(options.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(options.length - 1);
    else if (e.key === "Enter" || e.key === " ") {
      onChange(options[active].value);
      setOpen(false);
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-card px-3.5 text-left text-[14px] ring-1 ring-inset ring-[var(--hairline)] transition-shadow hover:ring-foreground/20 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        <span className={cn("truncate", !current && "text-muted-foreground/70")}>{current?.label ?? placeholder}</span>
        <ChevronDown size={15} className={cn("shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="animate-pop absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-auto rounded-xl bg-popover p-1 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-[var(--hairline)]"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(o.value);
                setOpen(false);
              }}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13.5px]", i === active && "bg-secondary")}
            >
              <span className="min-w-0">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block truncate text-[12px] text-muted-foreground">{o.hint}</span>}
              </span>
              {o.value === value && <Check size={14} className="shrink-0 text-brand" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id?: string; label?: string; disabled?: boolean }> = ({ checked, onChange, id, label, disabled }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45",
      checked ? "bg-brand" : "bg-foreground/15",
    )}
  >
    <motion.span layout transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className={cn("h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]", checked ? "ml-[18px]" : "ml-[2px]")} />
  </button>
);

export const Slider: React.FC<{
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  id?: string;
  label?: string;
  format?: (v: number) => string;
}> = ({ value, min, max, step = 1, onChange, id, label, format }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex h-6 items-center">
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={format ? format(value) : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-input relative w-full"
      />
    </div>
  );
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  layoutId,
}: {
  value: T;
  onChange: (v: NoInfer<T>) => void;
  options: Option<NoInfer<T>>[];
  size?: "sm" | "md";
  className?: string;
  layoutId?: string;
}) {
  const auto = useId();
  const lid = layoutId ?? `seg-${auto}`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
    if (n < 0 || n >= options.length) return;
    e.preventDefault();
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" className={cn("inline-grid auto-cols-fr grid-flow-col rounded-full bg-secondary p-1", className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              size === "sm" ? "h-7 px-3 text-[12.5px]" : "h-8 px-4 text-[13px]",
              on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {on && <motion.span layoutId={lid} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 rounded-full bg-card shadow-[0_1px_3px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-[var(--hairline)]" />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: NoInfer<T>) => void; options: Option<NoInfer<T>>[]; className?: string }) {
  const lid = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ x: 0, w: 0 });
  // Labels can change width after mount (counts arriving, fonts loading), so track the active tab's size.
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector<HTMLElement>(`[data-v="${CSS.escape(value)}"]`);
    if (!el) return;
    const measure = () => setBar({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.length]);
  return (
    <div ref={wrap} role="tablist" className={cn("relative flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[var(--hairline)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            data-v={o.value}
            id={`${lid}-${o.value}`}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn("relative h-10 shrink-0 px-3 text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand", on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {o.label}
          </button>
        );
      })}
      <motion.span className="absolute bottom-0 left-0 h-[2px] rounded-full bg-foreground" animate={{ x: bar.x, width: bar.w }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}
