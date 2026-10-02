import React, { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./primitives";

const EASE = [0.22, 1, 0.36, 1] as const;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
};

let locks = 0;
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks++;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      locks--;
      if (!locks) document.body.style.overflow = prev;
    };
  }, [active]);
}

function useFocusTrap(open: boolean, ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el)?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, ref, onClose]);
}

export const Dialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  hideClose?: boolean;
}> = ({ open, onClose, title, description, children, footer, size = "md", hideClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  const did = useId();
  useScrollLock(open);
  useFocusTrap(open, ref, onClose);
  const w = { sm: "max-w-[400px]", md: "max-w-[520px]", lg: "max-w-[720px]", xl: "max-w-[960px]" }[size];
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
            <motion.div
              className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? tid : undefined}
              aria-describedby={description ? did : undefined}
              tabIndex={-1}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.26, ease: EASE }}
              className={cn(
                "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-popover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] ring-1 ring-inset ring-[var(--hairline)] focus:outline-none sm:rounded-3xl",
                w,
              )}
            >
              {(title || !hideClose) && (
                <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
                  <div className="min-w-0">
                    {title && (
                      <h2 id={tid} className="text-[17px] font-medium tracking-[-0.02em]">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p id={did} className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                  {!hideClose && (
                    <Button variant="ghost" size="sm" icon onClick={onClose} aria-label="Close" className="-mr-2 -mt-1">
                      <X size={16} />
                    </Button>
                  )}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-2">{children}</div>
              {footer && <div className="flex flex-col-reverse gap-2 border-t border-[var(--hairline)] px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}> = ({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", danger, loading }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    size="sm"
    hideClose
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading} data-autofocus>
          {confirmLabel}
        </Button>
      </>
    }
  />
);

export const Sheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  side?: "right" | "left";
  width?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  bare?: boolean;
}> = ({ open, onClose, title, description, side = "right", width = 480, children, footer, bare }) => {
  const ref = useRef<HTMLDivElement>(null);
  const tid = useId();
  useScrollLock(open);
  useFocusTrap(open, ref, onClose);
  const from = side === "right" ? "100%" : "-100%";
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100]">
            <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.aside
              ref={ref}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? tid : undefined}
              tabIndex={-1}
              initial={{ x: from }}
              animate={{ x: 0 }}
              exit={{ x: from }}
              transition={{ duration: 0.32, ease: EASE }}
              style={{ width: `min(${width}px, 100vw)` }}
              className={cn(
                "absolute inset-y-0 flex flex-col bg-popover shadow-[0_0_60px_-10px_rgba(0,0,0,0.5)] focus:outline-none",
                side === "right" ? "right-0 border-l" : "left-0 border-r",
                "border-[var(--hairline)]",
              )}
            >
              {bare ? (
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] px-6 py-5">
                    <div className="min-w-0">
                      {title && (
                        <h2 id={tid} className="text-[16px] font-medium tracking-[-0.02em]">
                          {title}
                        </h2>
                      )}
                      {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
                    </div>
                    <Button variant="ghost" size="sm" icon onClick={onClose} aria-label="Close" className="-mr-2">
                      <X size={16} />
                    </Button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
                  {footer && <div className="border-t border-[var(--hairline)] px-6 py-4">{footer}</div>}
                </>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export const Tooltip: React.FC<{ content: React.ReactNode; children: React.ReactElement; side?: "top" | "bottom" }> = ({ content, children, side = "top" }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchor = useRef<HTMLElement | null>(null);
  const id = useId();
  const timer = useRef<number>();
  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = anchor.current?.getBoundingClientRect();
      if (r) setPos({ x: r.left + r.width / 2, y: side === "top" ? r.top : r.bottom });
      setOpen(true);
    }, 180);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const child = cloneElement(children, {
    ref: (n: HTMLElement) => (anchor.current = n),
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
    "aria-describedby": open ? id : undefined,
  });
  return (
    <>
      {child}
      <Portal>
        <AnimatePresence>
          {open && (
            <motion.div
              id={id}
              role="tooltip"
              initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ left: pos.x, top: pos.y }}
              className={cn(
                "pointer-events-none fixed z-[120] max-w-[260px] -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[12px] leading-snug text-background shadow-lg",
                side === "top" ? "-translate-y-[calc(100%+8px)]" : "translate-y-2",
              )}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
};

export interface MenuItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onSelect: () => void;
  danger?: boolean;
}

export const Menu: React.FC<{
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  header?: React.ReactNode;
}> = ({ trigger, items, align = "end", header }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; up: boolean } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const place = useCallback(() => {
    const r = root.current?.getBoundingClientRect();
    if (!r) return;
    const need = 16 + items.length * 38 + (header ? 64 : 0);
    const up = window.innerHeight - r.bottom < need && r.top > window.innerHeight - r.bottom;
    const x = align === "end" ? { right: window.innerWidth - r.right } : { left: r.left };
    setPos(up ? { ...x, bottom: window.innerHeight - r.top + 6, up } : { ...x, top: r.bottom + 6, up });
  }, [align, items.length, header]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node) && close();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, close, place]);

  useLayoutEffect(() => {
    if (open) list.current?.querySelectorAll<HTMLElement>("[role=menuitem]")[active]?.focus();
  }, [open, active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") setActive((a) => (a + 1) % items.length);
    else if (e.key === "ArrowUp") setActive((a) => (a - 1 + items.length) % items.length);
    else if (e.key === "Tab") close();
    else return;
    e.preventDefault();
  };

  return (
    <div ref={root} className="relative">
      {trigger({
        onClick: () => {
          setActive(0);
          place();
          setOpen((v) => !v);
        },
        "aria-expanded": open,
        "aria-haspopup": "menu",
      })}
      <Portal>
      <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={list}
            role="menu"
            onKeyDown={onKey}
            initial={{ opacity: 0, y: pos.up ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: pos.up ? 4 : -4 }}
            transition={{ duration: 0.16, ease: EASE }}
            style={{ top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, transformOrigin: `${align === "end" ? "right" : "left"} ${pos.up ? "bottom" : "top"}` }}
            className="fixed z-[110] min-w-[220px] rounded-2xl bg-popover p-1.5 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[var(--hairline)]"
          >
            {header && <div className="mb-1 border-b border-[var(--hairline)] px-2.5 pb-2.5 pt-1.5">{header}</div>}
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                tabIndex={i === active ? 0 : -1}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  close();
                  it.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] outline-none",
                  i === active && "bg-secondary",
                  it.danger ? "text-[var(--red)]" : "text-foreground",
                )}
              >
                {it.icon}
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
};
