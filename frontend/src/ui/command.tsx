import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Portal } from "./overlay";
import { Kbd } from "./primitives";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  hint?: string;
  keywords?: string;
  run: () => void;
}

function score(q: string, text: string) {
  if (!q) return 1;
  const t = text.toLowerCase();
  const i = t.indexOf(q);
  if (i === 0) return 3;
  if (i > 0) return t[i - 1] === " " ? 2.5 : 2;
  let j = 0;
  for (const c of t) if (c === q[j]) j++;
  return j === q.length ? 1 : 0;
}

export const CommandMenu: React.FC<{ open: boolean; onClose: () => void; commands: Command[]; placeholder?: string }> = ({ open, onClose, commands, placeholder = "Search pages, lessons, actions" }) => {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => input.current?.focus());
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    return commands
      .map((c) => ({ c, s: Math.max(score(n, c.label), score(n, c.keywords ?? "") * 0.8) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => (n ? b.s - a.s : 0))
      .map((r) => r.c);
  }, [q, commands]);

  const groups = useMemo(() => {
    const m = new Map<string, Command[]>();
    results.forEach((c) => m.set(c.group, [...(m.get(c.group) ?? []), c]));
    return [...m.entries()];
  }, [results]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (c?: Command) => {
    if (!c) return;
    onClose();
    c.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(results.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Enter") run(results[active]);
    else if (e.key === "Escape") onClose();
    else return;
    e.preventDefault();
  };

  let i = -1;
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[12vh]">
            <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command menu"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-[600px] overflow-hidden rounded-2xl bg-popover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-[var(--hairline)]"
              onKeyDown={onKey}
            >
              <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4">
                <Search size={16} className="shrink-0 text-muted-foreground" />
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={placeholder}
                  role="combobox"
                  aria-expanded="true"
                  aria-controls="cmd-list"
                  aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
                  className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
                />
                <Kbd>esc</Kbd>
              </div>
              <div ref={list} id="cmd-list" role="listbox" className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
                {!results.length && <div className="px-3 py-10 text-center text-[13.5px] text-muted-foreground">Nothing matches “{q}”.</div>}
                {groups.map(([g, cs]) => (
                  <div key={g} className="mb-1 last:mb-0">
                    <div className="px-3 pb-1 pt-2.5 text-[11.5px] font-medium text-muted-foreground">{g}</div>
                    {cs.map((c) => {
                      i++;
                      const idx = i;
                      const on = idx === active;
                      return (
                        <div
                          key={c.id}
                          id={`cmd-${c.id}`}
                          data-i={idx}
                          role="option"
                          aria-selected={on}
                          onMouseMove={() => setActive(idx)}
                          onClick={() => run(c)}
                          className={cn("flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-[13.5px]", on ? "bg-secondary text-foreground" : "text-foreground/85")}
                        >
                          <span className={cn("grid w-4 shrink-0 place-items-center [&>svg]:h-4 [&>svg]:w-4", on ? "text-foreground" : "text-muted-foreground")}>{c.icon}</span>
                          <span className="flex-1 truncate">{c.label}</span>
                          {c.hint && <span className="text-[12px] text-muted-foreground">{c.hint}</span>}
                          {on && <CornerDownLeft size={13} className="text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 border-t border-[var(--hairline)] px-4 py-2.5 text-[11.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <Kbd>↵</Kbd> open
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};
