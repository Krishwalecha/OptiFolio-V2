import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { LESSONS, TRACKS, Track } from "@/features/learn/lessons";
import { readLessons, resetLessons } from "@/lib/palette";
import { ConfirmDialog, Input, Progress, toast } from "@/ui";

const order: Track[] = ["foundations", "results", "engine"];

const Learn: React.FC = () => {
  const [q, setQ] = useState("");
  const total = LESSONS.reduce((s, l) => s + l.minutes, 0);
  const [read, setRead] = useState<string[]>(readLessons);
  const [confirm, setConfirm] = useState(false);
  const done = LESSONS.filter((l) => read.includes(l.slug)).length;

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return LESSONS;
    return LESSONS.filter((l) => `${l.title} ${l.summary}`.toLowerCase().includes(t));
  }, [q]);

  return (
    <AppShell
      title="Learn"
      description={`${LESSONS.length} short lessons, about ${total} minutes in total. Start with the foundations, or jump to any metric you saw in a result.`}
    >
      <div className="mb-14 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-md">
          <Input inputSize="lg" prefix={<Search size={16} />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons, e.g. Sharpe" aria-label="Search lessons" />
        </div>
        <div className="w-full max-w-[240px]">
          <div className="mb-2 flex justify-between text-[12.5px] text-muted-foreground">
            <span>Your progress</span>
            <span className="flex items-center gap-2">
              <span className="num">
                {done} of {LESSONS.length}
              </span>
              {done > 0 && (
                <button type="button" onClick={() => setConfirm(true)} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Reset
                </button>
              )}
            </span>
          </div>
          <Progress value={done / LESSONS.length} />
        </div>
        <ConfirmDialog
          open={confirm}
          onClose={() => setConfirm(false)}
          title="Reset your progress?"
          description={`All ${done} read ${done === 1 ? "lesson goes" : "lessons go"} back to unread. This only affects this browser.`}
          confirmLabel="Reset progress"
          onConfirm={() => {
            resetLessons();
            setRead([]);
            setConfirm(false);
            toast("Learning progress reset");
          }}
        />
      </div>

      <div className="space-y-16">
        {order.map((track, ti) => {
          const items = filtered.filter((l) => l.track === track);
          if (!items.length) return null;
          return (
            <section key={track} className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-16">
              <div>
                <div className="num text-[12px] text-muted-foreground">0{ti + 1}</div>
                <h2 className="mt-2 text-[22px] font-medium tracking-[-0.03em]">{TRACKS[track].title}</h2>
                <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-muted-foreground">{TRACKS[track].description}</p>
              </div>
              <ol className="m-0 list-none border-t border-[var(--hairline)] p-0">
                {items.map((l, i) => (
                  <motion.li
                    key={l.slug}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      to={`/Learn/${l.slug}`}
                      className="group grid grid-cols-[1fr_auto] items-center gap-6 border-b border-[var(--hairline)] py-6 no-underline sm:grid-cols-[48px_1fr_auto]"
                    >
                      <span className="num hidden text-[13px] text-muted-foreground sm:block">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="block text-[18px] font-medium tracking-[-0.025em] text-foreground transition-colors group-hover:text-brand">
                          {l.title}
                        </span>
                        <span className="mt-1 block text-[14.5px] leading-relaxed text-muted-foreground">{l.summary}</span>
                      </span>
                      <span className="flex items-center gap-4 text-[13px] text-muted-foreground">
                        {read.includes(l.slug) && <span className="hidden text-[12px] text-[var(--green)] sm:inline">Read</span>}
                        <span className="hidden sm:inline">{l.minutes} min</span>
                        <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ol>
            </section>
          );
        })}
        {!filtered.length && <p className="text-[15px] text-muted-foreground">No lessons match “{q}”.</p>}
      </div>
    </AppShell>
  );
};

export default Learn;
