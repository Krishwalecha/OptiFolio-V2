import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// 1 … 4 5 6 … 14: always the first and last page, plus a window around the current one.
function pageItems(page: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const start = Math.max(2, Math.min(page - 1, count - 4));
  const end = Math.min(count - 1, Math.max(page + 1, 5));
  const items: (number | "gap")[] = [1];
  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < count - 1) items.push("gap");
  items.push(count);
  return items;
}

const btn = "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg px-2 text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40";

export const Pagination: React.FC<{ page: number; pageCount: number; onChange: (page: number) => void; className?: string }> = ({ page, pageCount, onChange, className }) => {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button type="button" className={cn(btn, "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground")} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={15} />
        <span className="hidden sm:inline">Previous</span>
      </button>
      {pageItems(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-[13px] text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(btn, "num", p === page ? "bg-foreground/[0.08] font-medium text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground")}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={cn(btn, "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground")} onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight size={15} />
      </button>
    </nav>
  );
};
