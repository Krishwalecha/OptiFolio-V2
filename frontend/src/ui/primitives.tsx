import React, { forwardRef, useId } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const BTN_BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-[background,color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:bg-foreground/85",
  brand: "bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-10px_hsl(var(--brand)/0.9)] hover:brightness-110",
  secondary: "bg-card text-foreground ring-1 ring-inset ring-[var(--hairline)] hover:bg-secondary",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger: "bg-[var(--red)] text-white hover:brightness-110",
  link: "h-auto rounded-md px-0 text-brand underline-offset-4 hover:underline",
};

const BTN_SIZE: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12.5px]",
  md: "h-9 px-4 text-[13.5px]",
  lg: "h-11 px-6 text-[14.5px]",
};

const ICON_SIZE: Record<Size, string> = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-11 w-11" };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  icon?: boolean;
  asChild?: never;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BTN_BASE, BTN_VARIANT[variant], variant !== "link" && (icon ? cn(ICON_SIZE[size], "px-0") : BTN_SIZE[size]), className)}
      {...rest}
    >
      {loading && <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export const buttonClass = (variant: ButtonVariant = "secondary", size: Size = "md", className?: string) =>
  cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], "no-underline", className);

export const Field: React.FC<{
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: (id: string) => React.ReactNode;
}> = ({ label, hint, error, required, className, children }) => {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-[12.5px] font-medium text-foreground">
          {label}
          {required && <span className="ml-0.5 text-[var(--red)]">*</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p role="alert" className="text-[12px] text-[var(--red)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};

const INPUT_BASE =
  "w-full rounded-xl bg-card text-[14px] text-foreground ring-1 ring-inset ring-[var(--hairline)] transition-[box-shadow,background] duration-150 placeholder:text-muted-foreground/70 hover:ring-foreground/20 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 aria-[invalid=true]:ring-[var(--red)]";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inputSize?: Size;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ prefix, suffix, inputSize = "md", className, ...rest }, ref) => {
  const h = inputSize === "lg" ? "h-12 text-[15px]" : inputSize === "sm" ? "h-8 text-[13px]" : "h-10";
  if (!prefix && !suffix) return <input ref={ref} className={cn(INPUT_BASE, h, "px-3.5", className)} {...rest} />;
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>}
      <input ref={ref} className={cn(INPUT_BASE, h, prefix ? "pl-9" : "pl-3.5", suffix ? "pr-10" : "pr-3.5", className)} {...rest} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{suffix}</span>}
    </div>
  );
});
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cn(INPUT_BASE, "min-h-[96px] resize-y px-3.5 py-2.5 leading-relaxed", className)} {...rest} />
));
Textarea.displayName = "Textarea";

type Tone = "neutral" | "brand" | "up" | "down" | "warn" | "outline";
const TONE: Record<Tone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  brand: "bg-brand/10 text-brand",
  up: "bg-[var(--green-subtle)] text-[var(--green)]",
  down: "bg-[var(--red-subtle)] text-[var(--red)]",
  warn: "bg-[var(--amber-subtle)] text-[var(--amber)]",
  outline: "text-muted-foreground ring-1 ring-inset ring-[var(--hairline)]",
};

export const Badge: React.FC<{ tone?: Tone; dot?: boolean; icon?: React.ReactNode; className?: string; children: React.ReactNode }> = ({ tone = "neutral", dot, icon, className, children }) => (
  <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0", TONE[tone], className)}>
    {icon}
    {dot && !icon && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {children}
  </span>
);

export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 font-sans text-[11px] text-muted-foreground ring-1 ring-inset ring-[var(--hairline)]", className)}>{children}</kbd>
);

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <Loader2 size={size} className={cn("animate-spin text-muted-foreground", className)} aria-label="Loading" />
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <div className={cn("skeleton rounded-lg", className)} aria-hidden="true" />;

export const Divider: React.FC<{ className?: string; vertical?: boolean }> = ({ className, vertical }) => (
  <div role="separator" className={cn(vertical ? "w-px self-stretch" : "h-px w-full", "bg-[var(--hairline)]", className)} />
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; padded?: boolean }> = ({ interactive, padded = true, className, ...rest }) => (
  <div
    className={cn(
      "rounded-2xl bg-card ring-1 ring-inset ring-[var(--hairline)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
      padded && "p-5",
      interactive && "transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_12px_32px_-18px_rgba(0,0,0,0.35)] hover:ring-foreground/15",
      className,
    )}
    {...rest}
  />
);

export const CardHeader: React.FC<{ title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({ title, description, action, className }) => (
  <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
    <div className="min-w-0">
      <h3 className="text-[14px] font-medium tracking-[-0.01em] text-foreground">{title}</h3>
      {description && <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const Stat: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "up" | "down" | "brand" | "default";
  size?: "md" | "lg";
  className?: string;
}> = ({ label, value, sub, tone = "default", size = "md", className }) => (
  <div className={cn("min-w-0", className)}>
    <div className="text-[12px] text-muted-foreground">{label}</div>
    <div
      className={cn(
        "num mt-1.5 truncate font-medium leading-none tracking-[-0.04em]",
        size === "lg" ? "text-[30px]" : "text-[22px]",
        tone === "up" && "text-[var(--green)]",
        tone === "down" && "text-[var(--red)]",
        tone === "brand" && "text-brand",
      )}
    >
      {value}
    </div>
    {sub && <div className="mt-1.5 text-[12px] text-muted-foreground">{sub}</div>}
  </div>
);

export const Meter: React.FC<{ value: number; segments?: number; tone?: string; className?: string; label?: string }> = ({ value, segments = 24, tone = "hsl(var(--brand))", className, label }) => {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <div className={cn("flex gap-[3px]", className)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className="h-5 flex-1 rounded-[2px] transition-colors duration-500" style={{ background: i < filled ? tone : "hsl(var(--foreground) / 0.08)", transitionDelay: `${i * 12}ms` }} />
      ))}
    </div>
  );
};

export const Progress: React.FC<{ value: number; className?: string; tone?: string }> = ({ value, className, tone = "hsl(var(--brand))" }) => (
  <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]", className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: tone }} />
  </div>
);

const AVATAR_HUES = [229, 190, 158, 32, 350, 265, 205, 12];

export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

export const Avatar: React.FC<{ name: string; size?: number; anonymous?: boolean; className?: string }> = ({ name, size = 32, anonymous, className }) => {
  if (anonymous)
    return (
      <span
        className={cn("inline-grid shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-muted-foreground ring-1 ring-inset ring-[var(--hairline)]", className)}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5c2.5-1.3 5.5-2 9-2s6.5.7 9 2" />
          <path d="M5 10v2.2a3 3 0 0 0 3 3h1.2a2 2 0 0 0 1.9-1.4l.4-1.2a.5.5 0 0 1 1 0l.4 1.2a2 2 0 0 0 1.9 1.4H16a3 3 0 0 0 3-3V10" />
          <path d="M6 19c1.8-1.2 3.8-1.8 6-1.8s4.2.6 6 1.8" />
        </svg>
      </span>
    );
  const hue = AVATAR_HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_HUES.length];
  return (
    <span
      className={cn("inline-grid shrink-0 select-none place-items-center rounded-full font-semibold tracking-[-0.02em]", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `hsl(${hue} 70% 55% / 0.16)`,
        color: `hsl(${hue} 75% 62%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 70% 60% / 0.28)`,
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string }> = ({ icon, title, description, action, className }) => (
  <div className={cn("flex flex-col items-center rounded-2xl px-6 py-14 text-center border border-dashed border-[var(--hairline)]", className)}>
    {icon && <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-secondary text-muted-foreground">{icon}</div>}
    <div className="text-[15px] font-medium tracking-[-0.01em]">{title}</div>
    {description && <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const Shimmer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => <span className={cn("text-shimmer", className)}>{children}</span>;
