import { useCallback, useEffect, useRef, useState } from "react";
import type { Article, NewsMode, Sentiment, StockSignal } from "./types";
import { BATCH, CACHE_KEY, PORTFOLIO_CACHE_KEY, normalizeNseTicker } from "./config";
import { analyzeWithAI, cacheAge, cacheIsValid, computeStockSignals, dedup, fetchGeneralNews, fetchPortfolioNews, fetchUserTickers, nextRefresh, readCache, writeCache } from "./utils";

export function useNewsFeed(userId: string | null, isLoggedIn: boolean) {
  const [mode, setMode] = useState<NewsMode>("general");
  const [articles, setArticles] = useState<Article[]>([]);
  const [fetching, setFetching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [next, setNext] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [signals, setSignals] = useState<StockSignal[]>([]);
  const [holdings, setHoldings] = useState<string[]>([]);
  const run = useRef(0);

  useEffect(() => {
    if (mode === "portfolio" && !holdings.length) return setSignals([]);
    if (articles.some((a) => a.analyzed)) setSignals(computeStockSignals(articles, names, mode === "portfolio" ? holdings : undefined));
  }, [articles, names, mode, holdings]);

  const analyzeAll = useCallback(async (all: Article[], key: string, id: number) => {
    setAnalyzing(true);
    setTotal(all.length);
    setDone(0);
    let final = [...all];
    const found: Record<string, string> = {};
    let n = 0;
    for (let i = 0; i < all.length; i += BATCH) {
      if (run.current !== id) return;
      const batch = all.slice(i, i + BATCH);
      if (i > 0) await new Promise((r) => setTimeout(r, 5000));
      try {
        const { results, names: got } = await analyzeWithAI(batch);
        Object.assign(found, got);
        setNames((p) => ({ ...p, ...got }));
        setArticles((prev) => {
          const next = prev.map((a) => {
            const r = results.find((x) => x.id === a.id);
            if (!r) return batch.some((b) => b.id === a.id) ? { ...a, sentiment: "neutral" as Sentiment, analyzed: true, sentimentReason: "" } : a;
            const ai = (Array.isArray(r.stocks) ? r.stocks : []).map(normalizeNseTicker);
            return {
              ...a,
              stocks: [...new Set([...a.stocks, ...ai])],
              sentiment: (["positive", "negative", "neutral"].includes(r.sentiment) ? r.sentiment : "neutral") as Sentiment,
              sentimentReason: r.reason ?? "",
              analyzed: true,
            };
          });
          final = next;
          return next;
        });
      } catch {
        setArticles((prev) => prev.map((a) => (batch.some((b) => b.id === a.id) && !a.analyzed ? { ...a, sentiment: "neutral" as Sentiment, analyzed: true } : a)));
      }
      n += batch.length;
      setDone(n);
    }
    setAnalyzing(false);
    setArticles((latest) => {
      writeCache(latest.length ? latest : final, key, found);
      return latest;
    });
    setAge("just now");
    setNext(nextRefresh(readCache(key)));
  }, []);

  const reset = () => {
    setFetching(true);
    setAnalyzing(false);
    setError(null);
    setArticles([]);
    setDone(0);
    setTotal(0);
    setAge("");
    setSignals([]);
  };

  const fetchGeneral = useCallback(async () => {
    const id = ++run.current;
    reset();
    setHoldings([]);
    try {
      const clean = dedup(await fetchGeneralNews());
      if (run.current !== id) return;
      if (!clean.length) {
        setError("No headlines came back. The news service may be down.");
        return setFetching(false);
      }
      setArticles(clean);
      setFetching(false);
      await analyzeAll(clean, CACHE_KEY, id);
    } catch {
      if (run.current === id) {
        setError("Could not load headlines. Check your connection and retry.");
        setFetching(false);
      }
    }
  }, [analyzeAll]);

  const fetchPortfolio = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    const id = ++run.current;
    reset();
    try {
      const tickers = await fetchUserTickers(userId);
      if (!tickers.length) {
        setError("You have no saved holdings yet. Save a portfolio from the optimizer first.");
        return setFetching(false);
      }
      setHoldings(tickers);
      const { articles: raw, nameMap } = await fetchPortfolioNews(tickers);
      if (run.current !== id) return;
      setNames(nameMap);
      const clean = dedup(raw);
      if (!clean.length) {
        setError("No recent news for your holdings.");
        return setFetching(false);
      }
      setArticles(clean);
      setFetching(false);
      await analyzeAll(clean, PORTFOLIO_CACHE_KEY, id);
    } catch {
      if (run.current === id) {
        setError("Could not load news for your holdings. Retry in a moment.");
        setFetching(false);
      }
    }
  }, [isLoggedIn, userId, analyzeAll]);

  const loadCached = useCallback(() => {
    const c = readCache(CACHE_KEY);
    if (!cacheIsValid(c)) return false;
    setArticles(c!.articles);
    setNames(c!.names ?? {});
    setAge(cacheAge(c));
    setNext(nextRefresh(c));
    setSignals(computeStockSignals(c!.articles, c!.names ?? {}, undefined));
    return true;
  }, []);

  const switchMode = (m: NewsMode) => {
    if (m === mode || fetching || analyzing) return;
    setMode(m);
    setError(null);
    setArticles([]);
    setSignals([]);
    if (m === "general") {
      if (!loadCached()) fetchGeneral();
    } else fetchPortfolio();
  };

  const refresh = () => (mode === "general" ? (loadCached() ? undefined : fetchGeneral()) : fetchPortfolio());

  useEffect(() => {
    if (!loadCached()) fetchGeneral();
    const iv = window.setInterval(() => {
      const c = readCache(CACHE_KEY);
      setAge(cacheAge(c));
      setNext(nextRefresh(c));
    }, 60000);
    return () => {
      window.clearInterval(iv);
      run.current++;
    };
  }, [loadCached, fetchGeneral]);

  return { mode, switchMode, refresh, articles, fetching, analyzing, done, total, error, age, next, names, signals, holdings };
}
