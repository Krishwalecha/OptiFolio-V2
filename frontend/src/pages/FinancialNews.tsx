import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Plus, RefreshCw, X } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PriceSheet from "@/components/charts/PriceSheet";
import { useAuth } from "@/context/AuthContext";
import type { Article, FilterType, StockSignal } from "@/features/news/types";
import { readCart, writeCart } from "@/features/news/utils";
import { useNewsFeed } from "@/features/news/useNewsFeed";
import { Badge, Button, Card, CardHeader, EmptyState, LinearBar, Pagination, Segmented, Sheet, Skeleton, StackBar, Tabs, Wave, buttonClass } from "@/ui";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

const TONE: Record<string, { label: string; dot: string }> = {
  positive: { label: "Positive", dot: "var(--green)" },
  negative: { label: "Negative", dot: "var(--red)" },
  neutral: { label: "Neutral", dot: "hsl(var(--muted-foreground))" },
  pending: { label: "Scoring", dot: "hsl(var(--muted-foreground) / 0.4)" },
};

const COVERAGE: Record<StockSignal["trend"], string> = {
  strong_buy: "Mostly positive",
  buy: "Leaning positive",
  hold: "Mixed",
  sell: "Leaning negative",
  strong_sell: "Mostly negative",
};

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!isFinite(m)) return "";
  if (m < 60) return `${Math.max(1, m)}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const StockChip: React.FC<{ t: string; inBasket: boolean; onToggle: (t: string) => void }> = ({ t, inBasket, onToggle }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onToggle(t);
    }}
    title={inBasket ? `Remove ${t} from basket` : `Add ${t} to basket`}
    className={cn("inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium ring-1 ring-inset transition-colors", inBasket ? "bg-brand/10 text-brand ring-brand/30" : "text-muted-foreground ring-[var(--hairline)] hover:text-foreground")}
  >
    {inBasket ? <Check size={11} /> : <Plus size={11} />}
    {t}
  </button>
);

const ArticleRow: React.FC<{ a: Article; basket: string[]; onToggle: (t: string) => void; onOpen: () => void }> = ({ a, basket, onToggle, onOpen }) => (
  <li>
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()} className="group flex cursor-pointer gap-4 border-b border-[var(--hairline)] px-5 py-4 transition-colors hover:bg-foreground/[0.025] focus-visible:bg-foreground/[0.04]">
      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: TONE[a.sentiment].dot }} title={TONE[a.sentiment].label} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium leading-snug text-foreground">{a.title}</div>
        {a.sentimentReason && <p className="mb-0 mt-1 line-clamp-1 text-[12.5px] text-muted-foreground">{a.sentimentReason}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          <span>{a.source}</span>
          <span aria-hidden="true">·</span>
          <span>{ago(a.publishedAt)}</span>
          {a.stocks.map((t) => (
            <StockChip key={t} t={t} inBasket={basket.includes(t)} onToggle={onToggle} />
          ))}
        </div>
      </div>
      {a.image && <img src={a.image} alt="" loading="lazy" className="hidden h-16 w-24 shrink-0 rounded-lg object-cover opacity-90 sm:block" onError={(e) => (e.currentTarget.style.display = "none")} />}
    </div>
  </li>
);

export default function FinancialNews() {
  const { isLoggedIn, userId } = useAuth();
  const feed = useNewsFeed(userId, isLoggedIn);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [open, setOpen] = useState<Article | null>(null);
  const [chart, setChart] = useState<string | null>(null);
  const [basket, setBasket] = useState<string[]>(readCart);

  const toggle = useCallback((t: string) => {
    setBasket((b) => {
      const next = b.includes(t) ? b.filter((x) => x !== t) : [...b, t].slice(0, 15);
      writeCart(next);
      return next;
    });
  }, []);

  const counts = useMemo(() => {
    const c = { positive: 0, negative: 0, neutral: 0, pending: 0 };
    feed.articles.forEach((a) => c[a.sentiment]++);
    return c;
  }, [feed.articles]);
  const shown = filter === "all" ? feed.articles : feed.articles.filter((a) => a.sentiment === filter);
  const [page, setPage] = useState(1);
  const listTop = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageItems = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [filter, feed.mode]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const goTo = (p: number) => {
    setPage(p);
    const top = listTop.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const signals = feed.signals.slice(0, 8);

  return (
    <AppShell
      title="Markets"
      description="Indian market headlines, scored positive or negative by a language model and linked to the stocks they mention. Tone of coverage is not a price forecast."
      actions={
        <>
          {feed.mode === "general" && feed.age ? (
            <span className="text-[12.5px] text-muted-foreground">
              Updated {feed.age}
              {feed.next && ` · next update ${feed.next}`}
            </span>
          ) : (
            feed.mode === "portfolio" && (
              <Button variant="secondary" onClick={feed.refresh} disabled={feed.fetching || feed.analyzing}>
                <RefreshCw size={14} className={cn(feed.fetching && "ld-spin")} /> Refresh
              </Button>
            )
          )}
        </>
      }
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={feed.mode}
          onChange={(m) => (m === "portfolio" && !isLoggedIn ? navigate("/SignIn?next=/FinancialNews") : feed.switchMode(m))}
          options={[
            { value: "general", label: "All headlines" },
            { value: "portfolio", label: "My holdings" },
          ]}
        />
        {feed.analyzing && (
          <div className="flex min-w-[220px] items-center gap-3 text-[12.5px] text-muted-foreground">
            <Wave size={14} className="text-brand" />
            Scoring {feed.done} of {feed.total}
            <LinearBar className="w-24" />
          </div>
        )}
      </div>

      {feed.error ? (
        <EmptyState
          title={feed.error}
          action={
            feed.mode === "portfolio" && feed.error.includes("Save a portfolio") ? (
              <Link to="/Optimizer" className={buttonClass("primary", "md")}>
                Open the optimizer
              </Link>
            ) : (
              <Button onClick={feed.refresh}>Retry</Button>
            )
          }
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
          <Card padded={false} className="overflow-hidden">
            <div ref={listTop} className="scroll-mt-6 px-5 pt-2">
              <Tabs
                value={filter}
                onChange={setFilter}
                className="border-0"
                options={[
                  { value: "all", label: `All ${feed.articles.length || ""}` },
                  { value: "positive", label: `Positive ${counts.positive || ""}` },
                  { value: "negative", label: `Negative ${counts.negative || ""}` },
                  { value: "neutral", label: `Neutral ${counts.neutral || ""}` },
                ]}
              />
            </div>
            <div className="border-t border-[var(--hairline)]">
              {feed.fetching ? (
                <div className="space-y-5 p-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-2/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : shown.length ? (
                <ul className="m-0 list-none p-0">
                  {pageItems.map((a) => (
                    <ArticleRow key={a.id} a={a} basket={basket} onToggle={toggle} onOpen={() => setOpen(a)} />
                  ))}
                </ul>
              ) : null}
              {!feed.fetching && shown.length > PAGE_SIZE && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--hairline)] px-5 py-3 sm:flex-row">
                  <span className="num text-[12.5px] text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, shown.length)} of {shown.length}
                  </span>
                  <Pagination page={page} pageCount={pageCount} onChange={goTo} />
                </div>
              )}
              {feed.fetching || shown.length ? null : (
                <p className="px-5 py-12 text-center text-[13.5px] text-muted-foreground">No {filter} headlines right now.</p>
              )}
            </div>
          </Card>

          <div className="space-y-4 lg:sticky lg:top-6">
            <Card padded={false} className="hidden lg:block">
              <div className="flex items-center justify-between gap-3 p-5 pb-3">
                <div>
                  <div className="text-[14px] font-medium tracking-[-0.01em]">Basket</div>
                  <div className="mt-0.5 text-[12.5px] text-muted-foreground">{basket.length ? `${basket.length} of 15 stocks` : "Stocks you pick from the news"}</div>
                </div>
                {basket.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      writeCart([]);
                      setBasket([]);
                    }}
                    className="text-[12px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              {basket.length ? (
                <div className="flex flex-wrap gap-1.5 px-5">
                  <AnimatePresence initial={false}>
                    {basket.map((t) => (
                      <motion.span
                        key={t}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.18 }}
                        className="inline-flex h-7 items-center gap-1 rounded-lg bg-foreground/[0.06] pl-2.5 pr-1 text-[12.5px] font-medium"
                        title={feed.names[t] ?? t}
                      >
                        {t}
                        <button type="button" aria-label={`Remove ${t}`} onClick={() => toggle(t)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground">
                          <X size={11} />
                        </button>
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="m-0 px-5 text-[13px] leading-relaxed text-muted-foreground">
                  Press <Plus size={12} className="inline -translate-y-px" /> on any stock in a headline or in Most mentioned to add it here.
                </p>
              )}
              <div className="p-5 pt-4">
                <Button variant="primary" className="w-full" disabled={basket.length < 2} onClick={() => navigate("/Optimizer")}>
                  {basket.length < 2 ? `Add ${2 - basket.length} more to optimize` : `Optimize ${basket.length} stocks`}
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader title="Tone of coverage" description={counts.pending ? `${counts.pending} headlines still being scored` : `${counts.positive + counts.negative + counts.neutral} headlines scored`} />
              <StackBar
                height={8}
                items={[
                  { label: "Positive", value: counts.positive, color: "var(--green)" },
                  { label: "Neutral", value: counts.neutral, color: "hsl(var(--foreground) / 0.18)" },
                  { label: "Negative", value: counts.negative, color: "var(--red)" },
                ]}
              />
              <div className="mt-2.5 flex justify-between text-[12px] text-muted-foreground">
                <span className="num">{counts.positive} positive</span>
                <span className="num">{counts.negative} negative</span>
              </div>
            </Card>

            <Card padded={false}>
              <div className="p-5 pb-3">
                <CardHeader className="mb-0" title="Most mentioned" description="Stocks named in at least one scored headline." />
              </div>
              {signals.length ? (
                <ul className="m-0 list-none p-0">
                  {signals.map((s) => {
                    const neg = s.bearishCount;
                    const pos = s.bullishCount;
                    return (
                      <li key={s.ticker} className="flex items-center gap-3 border-t border-[var(--hairline)] px-5 py-3">
                        <button type="button" onClick={() => setChart(s.ticker)} className="min-w-0 flex-1 text-left">
                          <span className="block text-[13.5px] font-medium hover:text-brand">{s.ticker}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">
                            {COVERAGE[s.trend]} · {s.totalMentions} {s.totalMentions === 1 ? "mention" : "mentions"}
                          </span>
                        </button>
                        <span className="flex h-1.5 w-14 overflow-hidden rounded-full bg-foreground/[0.08]" title={`${pos} positive, ${neg} negative`}>
                          <span style={{ width: `${(pos / s.totalMentions) * 100}%`, background: "var(--green)" }} />
                          <span style={{ width: `${(neg / s.totalMentions) * 100}%`, background: "var(--red)", marginLeft: "auto" }} />
                        </span>
                        <Button variant="ghost" size="sm" icon aria-label={basket.includes(s.ticker) ? `Remove ${s.ticker}` : `Add ${s.ticker}`} onClick={() => toggle(s.ticker)}>
                          {basket.includes(s.ticker) ? <Check size={14} className="text-brand" /> : <Plus size={14} />}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="m-0 border-t border-[var(--hairline)] px-5 py-6 text-[13px] text-muted-foreground">{feed.analyzing || feed.fetching ? "Appears once headlines are scored." : "No stocks mentioned yet."}</p>
              )}
            </Card>
          </div>
        </div>
      )}

      <AnimatePresence>
        {basket.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:hidden">
            <div className="flex max-w-full items-center gap-3 rounded-2xl bg-popover p-2 pl-4 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-[var(--hairline)]">
              <span className="shrink-0 text-[13px] font-medium">Basket</span>
              <div className="flex min-w-0 gap-1 overflow-x-auto">
                {basket.map((t) => (
                  <span key={t} className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-foreground/[0.06] pl-2 pr-1 text-[12px] font-medium">
                    {t}
                    <button type="button" aria-label={`Remove ${t}`} onClick={() => toggle(t)} className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-foreground">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <Button variant="primary" size="sm" disabled={basket.length < 2} onClick={() => navigate("/Optimizer")} title={basket.length < 2 ? "Add at least two stocks" : undefined}>
                Optimize {basket.length}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.source}
        description={open ? new Date(open.publishedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : undefined}
        footer={
          open && (
            <a href={open.url} target="_blank" rel="noreferrer noopener" className={cn(buttonClass("primary", "md"), "w-full")}>
              Read at {open.source} <ArrowUpRight size={14} />
            </a>
          )
        }
      >
        {open && (
          <>
            {open.image && <img src={open.image} alt="" className="mb-5 aspect-[16/9] w-full rounded-xl object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />}
            <h3 className="text-[19px] font-medium leading-snug tracking-[-0.02em]">{open.title}</h3>
            {open.description && <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{open.description}</p>}
            <div className="mt-6 rounded-xl bg-foreground/[0.03] p-4 ring-1 ring-inset ring-[var(--hairline)]">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: TONE[open.sentiment].dot }} />
                {TONE[open.sentiment].label} tone
              </div>
              {open.sentimentReason && <p className="mb-0 mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{open.sentimentReason}</p>}
              <p className="mb-0 mt-2 text-[11.5px] text-muted-foreground">Scored by a language model from the headline and summary. It can be wrong.</p>
            </div>
            {open.stocks.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 text-[12.5px] text-muted-foreground">Stocks mentioned</div>
                <div className="flex flex-wrap gap-1.5">
                  {open.stocks.map((t) => (
                    <StockChip key={t} t={t} inBasket={basket.includes(t)} onToggle={toggle} />
                  ))}
                </div>
              </div>
            )}
            {open.via && (
              <div className="mt-6">
                <Badge tone="outline">via {open.via}</Badge>
              </div>
            )}
          </>
        )}
      </Sheet>
      <PriceSheet ticker={chart} name={chart ? feed.names[chart] : undefined} onClose={() => setChart(null)} />
    </AppShell>
  );
}
