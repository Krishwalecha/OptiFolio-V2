import React, { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { markLessonRead, readLessons } from "@/lib/palette";
import { LESSONS, TRACKS, lessonBySlug } from "@/features/learn/lessons";
import { buttonClass } from "@/ui";
import { cn } from "@/lib/utils";

const Lesson: React.FC = () => {
  const { slug = "" } = useParams();
  const lesson = lessonBySlug(slug);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (lessonBySlug(slug)) markLessonRead(slug);
  }, [slug]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  if (!lesson) return <Navigate to="/Learn" replace />;

  const trackLessons = LESSONS.filter((l) => l.track === lesson.track);
  const read = readLessons();
  const idx = LESSONS.findIndex((l) => l.slug === slug);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];

  return (
    <AppShell bare>
      <div className="fixed inset-x-0 top-0 z-[60] h-[2px]">
        <div className="h-full bg-brand transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="grid items-start gap-12 pb-12 pt-10 sm:pt-14 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 max-w-[780px]">
          <Link to="/Learn" className="inline-flex items-center gap-2 text-[14px] text-muted-foreground no-underline hover:text-foreground">
            <ArrowLeft size={14} /> All lessons
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10"
          >
            <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
              <span>{TRACKS[lesson.track].title}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
              <span>{lesson.minutes} min read</span>
            </div>
            <h1 className="mt-4 text-[clamp(2.2rem,5.4vw,3.4rem)] font-medium leading-[1.04] tracking-[-0.045em]">{lesson.title}</h1>
            <p className="mt-5 text-[19px] leading-relaxed text-muted-foreground">{lesson.summary}</p>
          </motion.header>

          {lesson.formula && (
            <div className="num mt-10 rounded-2xl bg-card px-6 py-5 text-[15px] text-foreground ring-1 ring-inset ring-[var(--hairline)]">
              {lesson.formula}
            </div>
          )}

          <div className="mt-10 space-y-8">
            {lesson.body.map((b, i) => (
              <section key={i}>
                {b.heading && <h2 className="mb-3 text-[20px] font-medium tracking-[-0.025em]">{b.heading}</h2>}
                <p className="text-[17px] leading-[1.75] text-foreground/85">{b.text}</p>
              </section>
            ))}
          </div>

          <aside className="mt-12 border-l-2 border-brand pl-6">
            <div className="text-[13px] font-medium text-brand">Key takeaway</div>
            <p className="mt-2 text-[19px] font-medium leading-snug tracking-[-0.02em]">{lesson.takeaway}</p>
          </aside>

          <div className="mt-16 flex flex-col items-start justify-between gap-4 rounded-2xl bg-card p-6 ring-1 ring-inset ring-[var(--hairline)] sm:flex-row sm:items-center xl:hidden">
            <div>
              <div className="text-[15px] font-medium">Try it on your own stocks</div>
              <div className="mt-1 text-[14px] text-muted-foreground">Every metric in this lesson appears in your optimization result.</div>
            </div>
            <Link to="/Optimizer" className={buttonClass("primary", "md", "shrink-0")}>
              Open optimizer
            </Link>
          </div>

          <nav className="mt-10 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link to={`/Learn/${prev.slug}`} className="rounded-2xl p-5 no-underline ring-1 ring-inset ring-[var(--hairline)] transition-shadow hover:ring-foreground/20">
                <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <ArrowLeft size={13} /> Previous
                </div>
                <div className="mt-1.5 text-[15px] font-medium text-foreground">{prev.title}</div>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/Learn/${next.slug}`} className="rounded-2xl p-5 text-right no-underline ring-1 ring-inset ring-[var(--hairline)] transition-shadow hover:ring-foreground/20">
                <div className="flex items-center justify-end gap-1.5 text-[13px] text-muted-foreground">
                  Next <ArrowRight size={13} />
                </div>
                <div className="mt-1.5 text-[15px] font-medium text-foreground">{next.title}</div>
              </Link>
            )}
          </nav>
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-8 space-y-4">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-inset ring-[var(--hairline)]">
              <div className="text-[12px] text-muted-foreground">In this track</div>
              <div className="mt-1 text-[14.5px] font-medium tracking-[-0.01em]">{TRACKS[lesson.track].title}</div>
              <ol className="m-0 mt-4 list-none space-y-1 p-0">
                {trackLessons.map((l) => {
                  const current = l.slug === slug;
                  const done = read.includes(l.slug);
                  return (
                    <li key={l.slug}>
                      <Link
                        to={`/Learn/${l.slug}`}
                        aria-current={current ? "page" : undefined}
                        className={cn("flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[13px] leading-snug no-underline transition-colors", current ? "bg-foreground/[0.06] font-medium text-foreground" : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground")}
                      >
                        <span className={cn("mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full ring-1 ring-inset", done ? "bg-brand text-white ring-brand" : "ring-foreground/25")}>{done && <Check size={10} strokeWidth={3} />}</span>
                        <span className="min-w-0 flex-1">{l.title}</span>
                        <span className="num shrink-0 text-[11.5px] text-muted-foreground">{l.minutes}m</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="rounded-2xl bg-card p-5 ring-1 ring-inset ring-[var(--hairline)]">
              <div className="flex items-baseline justify-between text-[12px] text-muted-foreground">
                <span>Reading progress</span>
                <span className="num font-medium text-foreground">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            <div className="rounded-2xl bg-card p-5 ring-1 ring-inset ring-[var(--hairline)]">
              <div className="text-[14px] font-medium">Try it on your own stocks</div>
              <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">Every metric in this lesson appears in your optimization result.</div>
              <Link to="/Optimizer" className={buttonClass("primary", "sm", "mt-4")}>
                Open optimizer
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
};

export default Lesson;
