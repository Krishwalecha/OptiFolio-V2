import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type FundData = {
  schemeCode: number;
  name: string;
  category: string;
  color: string;
  risk: string;
  horizon: string;
  cagr5y: number;
  latestNav: number;
};

interface MFContextType {
  funds: FundData[];
  loading: boolean;
  error: string | null;
}

const MIN_CAGR = 5; // discard funds below this 5Y CAGR
const CANDIDATES = 10; // search results to consider per category
const HISTORY_POOL = 6; // full-history fetches per category (topN + buffer)
const CACHE_KEY = "mf_funds_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const CATEGORIES = [
  {
    key: "Large Cap",
    query: "Large Cap Direct Growth",
    color: "#3b82f6",
    risk: "Low-Med",
    horizon: "5+",
    topN: 2,
  },
  {
    key: "Flexi Cap",
    query: "Flexi Cap Direct Growth",
    color: "#8b5cf6",
    risk: "Medium",
    horizon: "5+",
    topN: 2,
  },
  {
    key: "Mid Cap",
    query: "Mid Cap Direct Growth",
    color: "#f59e0b",
    risk: "Med-High",
    horizon: "7+",
    topN: 2,
  },
  {
    key: "Small Cap",
    query: "Small Cap Direct Growth",
    color: "#ef4444",
    risk: "High",
    horizon: "10+",
    topN: 2,
  },
  {
    key: "Hybrid",
    query: "Balanced Advantage Direct Growth",
    color: "#22c55e",
    risk: "Low-Med",
    horizon: "3+",
    topN: 1,
  },
  {
    key: "ELSS",
    query: "ELSS Tax Saver Direct Growth",
    color: "#06b6d4",
    risk: "Medium",
    horizon: "3+ (lock-in)",
    topN: 2,
  },
];

// ── Cache helpers ─────────────────────────────────────────────────────────────
interface CacheEntry {
  funds: FundData[];
  fetchedAt: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CacheEntry = JSON.parse(raw);
    if (!parsed.fetchedAt || !Array.isArray(parsed.funds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(funds: FundData[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ funds, fetchedAt: Date.now() }),
    );
  } catch {
    /* storage full — skip silently */
  }
}

function cacheIsValid(entry: CacheEntry | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

// ── CAGR calculation ──────────────────────────────────────────────────────────
function calcCAGR(
  history: { date: string; nav: string }[],
  yrs: number,
): number | null {
  if (history.length < 2) return null;
  const latest = parseFloat(history[0].nav);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - yrs);

  const past = history.find((d) => {
    const parts = d.date.split("-").map(Number);
    // API returns DD-MM-YYYY
    const [day, mon, yr] = parts;
    return new Date(yr, mon - 1, day) <= cutoff;
  });

  if (!past) return null;
  const pastNav = parseFloat(past.nav);
  if (!pastNav || !latest || isNaN(pastNav) || isNaN(latest)) return null;
  const cagr = (Math.pow(latest / pastNav, 1 / yrs) - 1) * 100;
  // Sanity-check: reject obviously wrong values
  if (!isFinite(cagr) || cagr < 0 || cagr > 100) return null;
  return cagr;
}

// ── Clean fund name ───────────────────────────────────────────────────────────
function cleanName(raw: string): string {
  return raw
    .replace(/[-–]\s*Direct Plan\s*[-–]\s*Growth/gi, "")
    .replace(/[-–]\s*Direct\s*[-–]\s*Growth/gi, "")
    .replace(/Direct Plan\s*[-–]\s*Growth/gi, "")
    .replace(/Direct Plan Growth|Direct Growth/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Core fetch logic ──────────────────────────────────────────────────────────
async function fetchAllFunds(): Promise<FundData[]> {
  // ── Step 1: search all categories in parallel ──────────────────────────────
  const searchResults = await Promise.all(
    CATEGORIES.map(async (cat) => {
      try {
        const res = await fetch(
          `https://api.mfapi.in/mf/search?q=${encodeURIComponent(cat.query)}`,
        );
        const json: { schemeCode: number; schemeName: string }[] =
          await res.json();
        const filtered = (json || [])
          .filter(
            (f) =>
              /direct/i.test(f.schemeName) &&
              /growth/i.test(f.schemeName) &&
              !/idcw|dividend|bonus|regular/i.test(f.schemeName),
          )
          .slice(0, CANDIDATES);
        return { cat, schemes: filtered };
      } catch {
        return { cat, schemes: [] };
      }
    }),
  );

  const candidates = searchResults.flatMap((r) =>
    r.schemes.map((s) => ({
      cat: r.cat,
      schemeCode: s.schemeCode,
      schemeName: s.schemeName,
    })),
  );

  // ── Step 2: /latest for all candidates in parallel (tiny payloads, fast) ──
  const withNav = await Promise.all(
    candidates.map(async (c) => {
      try {
        const res = await fetch(
          `https://api.mfapi.in/mf/${c.schemeCode}/latest`,
        );
        const j = await res.json();
        if (j.status !== "SUCCESS" || !j.data?.length) return null;
        const nav = parseFloat(j.data[0].nav);
        if (!nav || isNaN(nav)) return null;
        return { ...c, latestNav: nav };
      } catch {
        return null;
      }
    }),
  );

  // ── Step 3: per category, pick top HISTORY_POOL by NAV desc as history candidates ──
  //           (NAV magnitude is a rough proxy for fund age — older = more history)
  const historyQueue: NonNullable<(typeof withNav)[0]>[] = [];
  for (const cat of CATEGORIES) {
    const pool = withNav
      .filter(
        (f): f is NonNullable<typeof f> => f !== null && f.cat.key === cat.key,
      )
      .sort((a, b) => b.latestNav - a.latestNav)
      .slice(0, HISTORY_POOL);
    historyQueue.push(...pool);
  }

  // ── Step 4: fetch full history for queue, compute 5Y CAGR, enforce MIN_CAGR ──
  const results = await Promise.all(
    historyQueue.map(async (c) => {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${c.schemeCode}`);
        const j = await res.json();
        if (j.status !== "SUCCESS" || !j.data?.length) return null;

        const history: { date: string; nav: string }[] = j.data;
        const cagr5y = calcCAGR(history, 5);

        // Hard gates: must have 5Y history AND CAGR >= MIN_CAGR
        if (cagr5y === null || cagr5y < MIN_CAGR) return null;

        return {
          schemeCode: c.schemeCode,
          name: cleanName(c.schemeName),
          category: c.cat.key,
          color: c.cat.color,
          risk: c.cat.risk,
          horizon: c.cat.horizon,
          cagr5y,
          latestNav: c.latestNav,
        } as FundData;
      } catch {
        return null;
      }
    }),
  );

  // ── Step 5: per category, rank survivors by CAGR desc, keep topN ──────────
  const valid = results.filter((f): f is FundData => f !== null);
  const final: FundData[] = [];
  for (const cat of CATEGORIES) {
    const catFunds = valid
      .filter((f) => f.category === cat.key)
      .sort((a, b) => b.cagr5y - a.cagr5y)
      .slice(0, cat.topN);
    final.push(...catFunds);
  }
  return final;
}

// ── Context ───────────────────────────────────────────────────────────────────
const MFContext = createContext<MFContextType>({
  funds: [],
  loading: true,
  error: null,
});
export const useMF = () => useContext(MFContext);

// ── Provider — mount this at app root so fetch starts on "/" ─────────────────
export const MFProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [funds, setFunds] = useState<FundData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Check cache first
    const cached = readCache();
    if (cacheIsValid(cached)) {
      setFunds(cached!.funds);
      setLoading(false);
      return;
    }

    // Cache stale or missing — fetch fresh
    fetchAllFunds()
      .then((data) => {
        setFunds(data);
        writeCache(data);
        setLoading(false);
      })
      .catch(() => {
        // Try serving stale cache rather than nothing
        const stale = readCache();
        if (stale && stale.funds.length > 0) {
          setFunds(stale.funds);
        } else {
          setError("Failed to load mutual fund data.");
        }
        setLoading(false);
      });
  }, []);

  return (
    <MFContext.Provider value={{ funds, loading, error }}>
      {children}
    </MFContext.Provider>
  );
};
