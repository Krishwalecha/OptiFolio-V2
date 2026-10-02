import React, { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Portal } from "./overlay";

type Kind = "default" | "success" | "error" | "info";
interface Item {
  id: number;
  kind: Kind;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  duration: number;
}
type Opts = Partial<Pick<Item, "description" | "action" | "duration">>;

let items: Item[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(kind: Kind, title: React.ReactNode, o: Opts = {}) {
  const id = ++seq;
  items = [...items.slice(-3), { id, kind, title, duration: o.duration ?? (kind === "error" ? 6000 : 4000), ...o }];
  emit();
  return id;
}

export const toast = Object.assign((title: React.ReactNode, o?: Opts) => push("default", title, o), {
  success: (title: React.ReactNode, o?: Opts) => push("success", title, o),
  error: (title: React.ReactNode, o?: Opts) => push("error", title, o),
  info: (title: React.ReactNode, o?: Opts) => push("info", title, o),
  dismiss,
});

const ICON: Record<Kind, React.ReactNode> = {
  default: null,
  success: <Check size={13} strokeWidth={2.5} />,
  error: <AlertTriangle size={13} />,
  info: <Info size={13} />,
};
const ICON_TONE: Record<Kind, string> = {
  default: "",
  success: "bg-[var(--green-subtle)] text-[var(--green)]",
  error: "bg-[var(--red-subtle)] text-[var(--red)]",
  info: "bg-brand/10 text-brand",
};

const ToastRow: React.FC<{ t: Item }> = ({ t }) => {
  const [paused, setPaused] = React.useState(false);
  React.useEffect(() => {
    if (paused) return;
    const h = window.setTimeout(() => dismiss(t.id), t.duration);
    return () => window.clearTimeout(h);
  }, [t.id, t.duration, paused]);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={t.kind === "error" ? "alert" : "status"}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-popover p-3.5 pr-2.5 shadow-[0_18px_50px_-14px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[var(--hairline)]"
    >
      {ICON[t.kind] && <span className={cn("mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full", ICON_TONE[t.kind])}>{ICON[t.kind]}</span>}
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium leading-snug">{t.title}</div>
        {t.description && <div className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{t.description}</div>}
      </div>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action!.onClick();
            dismiss(t.id);
          }}
          className="h-7 shrink-0 rounded-full bg-foreground px-3 text-[12px] font-medium text-background"
        >
          {t.action.label}
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
        <X size={13} />
      </button>
    </motion.li>
  );
};

export const Toaster: React.FC = () => {
  const list = useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => items,
  );
  return (
    <Portal>
      <ol aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[130] flex w-[min(380px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0">
        <AnimatePresence initial={false}>
          {list.map((t) => (
            <ToastRow key={t.id} t={t} />
          ))}
        </AnimatePresence>
      </ol>
    </Portal>
  );
};
