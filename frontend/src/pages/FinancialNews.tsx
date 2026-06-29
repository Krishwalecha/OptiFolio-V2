import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  Loader2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Globe,
  Briefcase,
  Sparkles,
  ShoppingCart,
} from "lucide-react";

import type { Article, Sentiment, FilterType, NewsMode, StockSignal } from "@/features/news/types";
import {
  S,
  BATCH,
  toTitleCase,
  CACHE_KEY,
  PORTFOLIO_CACHE_KEY,
  GENERAL_NEWSDATA_QUERIES,
  GENERAL_GNEWS_QUERIES,
  RSS_FEEDS,
  normalizeNseTicker,
} from "@/features/news/config";
import {
  readCart,
  writeCart,
  readCache,
  writeCache,
  cacheIsValid,
  cacheAge,
  dedup,
  fetchRssViaProxy,
  fetchNewsData,
  fetchGNews,
  fetchPortfolioNews,
  resolveTickerNames,
  fetchUserTickers,
  computeStockSignals,
  analyzeWithAI,
} from "@/features/news/utils";

import ArticleDrawer from "@/components/news/ArticleDrawer";
import CartToast from "@/components/news/CartToast";
import CartPanel from "@/components/news/CartPanel";
import MarketIntelligenceOverlay from "@/components/news/MarketIntelligenceOverlay";

export type { Article };

export default function FinancialNews() {
  const { isLoggedIn, userId } = useAuth();

  const [mode, setMode] = useState<NewsMode>("general");
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isFetching, setIsFetching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [totalToAnalyze, setTotalToAnalyze] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheAgeStr, setCacheAgeStr] = useState("");
  const [userTickers, setUserTickers] = useState<string[]>([]);
  const [tickerNames, setTickerNames] = useState<Record<string, string>>({});
  const [isResolvingNames, setIsResolvingNames] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [stockSignals, setStockSignals] = useState<StockSignal[]>([]);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);

  const [cart, setCart] = useState<string[]>(() => readCart());
  const [showCart, setShowCart] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const cartToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const counts = {
    positive: articles.filter((a) => a.sentiment === "positive").length,
    negative: articles.filter((a) => a.sentiment === "negative").length,
    neutral: articles.filter((a) => a.sentiment === "neutral").length,
    pending: articles.filter((a) => a.sentiment === "pending").length,
  };
  const total = counts.positive + counts.negative + counts.neutral;
  const displayed =
    filter === "all"
      ? articles
      : articles.filter((a) => a.sentiment === filter);
  const pct =
    totalToAnalyze > 0 ? Math.round((analyzedCount / totalToAnalyze) * 100) : 0;

  const handleCartToggle = useCallback((ticker: string) => {
    setCart((prev) => {
      const next = prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker];
      writeCart(next);
      return next;
    });
    if (cartToastTimer.current) clearTimeout(cartToastTimer.current);
    setShowCartToast(true);
    cartToastTimer.current = setTimeout(() => setShowCartToast(false), 4000);
  }, []);

  const handleCartRemove = useCallback((ticker: string) => {
    setCart((prev) => {
      const next = prev.filter((t) => t !== ticker);
      writeCart(next);
      return next;
    });
  }, []);

  const handleCartClear = useCallback(() => {
    setCart([]);
    writeCart([]);
  }, []);

  const handleGoToOptimizer = useCallback(() => {
    writeCart(cart);
    window.location.href = "/Optimizer";
  }, [cart]);

  useEffect(() => {
    if (mode === "portfolio" && portfolioTickers.length === 0) {
      setStockSignals([]);
      return;
    }
    if (articles.some((a) => a.analyzed)) {
      const filterTickers = mode === "portfolio" ? portfolioTickers : undefined;
      setStockSignals(
        computeStockSignals(articles, tickerNames, filterTickers),
      );
    }
  }, [articles, tickerNames, mode, portfolioTickers]);

  const analyzeAll = async (all: Article[], cacheKey: string) => {
    setIsAnalyzing(true);
    setTotalToAnalyze(all.length);
    setAnalyzedCount(0);
    const batches: Article[][] = [];
    for (let i = 0; i < all.length; i += BATCH)
      batches.push(all.slice(i, i + BATCH));
    let done = 0;
    const finalArticles: Article[] = [...all];

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      if (bi > 0) await new Promise((r) => setTimeout(r, 5000));
      try {
        const results = await analyzeWithAI(batch);
        setArticles((prev) => {
          const next = prev.map((article) => {
            const r = results.find((x) => x.id === article.id);
            if (!r)
              return batch.some((b) => b.id === article.id)
                ? {
                    ...article,
                    sentiment: "neutral" as Sentiment,
                    analyzed: true,
                    sentimentReason: "",
                    stocks: article.stocks,
                  }
                : article;
            const normalizedAiStocks = (
              Array.isArray(r.stocks) ? r.stocks : []
            ).map(normalizeNseTicker);
            const mergedStocks = [
              ...new Set([...article.stocks, ...normalizedAiStocks]),
            ];
            return {
              ...article,
              stocks: mergedStocks,
              sentiment: (["positive", "negative", "neutral"].includes(
                r.sentiment,
              )
                ? r.sentiment
                : "neutral") as Sentiment,
              sentimentReason: r.reason ?? "",
              analyzed: true,
            };
          });
          next.forEach((a, i) => {
            finalArticles[i] = a;
          });
          return next;
        });
        done += batch.length;
        setAnalyzedCount(done);
      } catch {
        setArticles((prev) =>
          prev.map((a) =>
            batch.some((b) => b.id === a.id) && !a.analyzed
              ? { ...a, sentiment: "neutral" as Sentiment, analyzed: true }
              : a,
          ),
        );
        done += batch.length;
        setAnalyzedCount(done);
      }
    }
    setIsAnalyzing(false);
    setTimeout(() => {
      setArticles((latest) => {
        writeCache(latest, cacheKey);
        return latest;
      });
    }, 200);
  };

  const fetchGeneral = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsFetching(true);
    setIsAnalyzing(false);
    setError(null);
    setArticles([]);
    setAnalyzedCount(0);
    setTotalToAnalyze(0);
    setCacheAgeStr("");
    setStockSignals([]);
    setShowIntelligence(false);
    setPortfolioTickers([]);

    try {
      const rssPromises = RSS_FEEDS.map((f) => fetchRssViaProxy(f));
      const ndPromises = GENERAL_NEWSDATA_QUERIES.map(
        ({ q, category }, i) =>
          new Promise<Article[]>((resolve) =>
            setTimeout(() => fetchNewsData(q, category).then(resolve), i * 200),
          ),
      );
      const gnewsAll = async () => {
        const all: Article[] = [];
        for (const q of GENERAL_GNEWS_QUERIES) {
          all.push(...(await fetchGNews(q)));
        }
        return all;
      };
      const [rssR, ndR, gnR] = await Promise.all([
        Promise.allSettled(rssPromises).then((rs) =>
          rs
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value),
        ),
        Promise.allSettled(ndPromises).then((rs) =>
          rs
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => (r as PromiseFulfilledResult<Article[]>).value),
        ),
        gnewsAll(),
      ]);
      const pool = [...rssR, ...ndR, ...gnR].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
      const clean = dedup(pool);
      if (!clean.length) {
        setError(
          "No articles retrieved. Check your backend server is running on port 5000.",
        );
        setIsFetching(false);
        return;
      }
      setArticles(clean);
      setLastFetched(new Date());
      setIsFetching(false);
      await analyzeAll(clean, CACHE_KEY);
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setError("Fetch failed. Make sure your backend server is running.");
      setIsFetching(false);
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!isLoggedIn || !userId) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setIsFetching(true);
    setIsAnalyzing(false);
    setError(null);
    setArticles([]);
    setAnalyzedCount(0);
    setTotalToAnalyze(0);
    setCacheAgeStr("");
    setStockSignals([]);
    setShowIntelligence(false);

    try {
      const tickers = await fetchUserTickers(userId);
      if (!tickers.length) {
        setError(
          "No stocks found in your portfolio. Add stocks to your portfolio first.",
        );
        setIsFetching(false);
        return;
      }
      setUserTickers(tickers);
      setPortfolioTickers(tickers);
      setIsResolvingNames(true);
      const nameMap = await resolveTickerNames(tickers);
      setTickerNames(nameMap);
      setIsResolvingNames(false);
      const raw = await fetchPortfolioNews(tickers, nameMap);
      const clean = dedup(raw);
      if (!clean.length) {
        setError("No news found for your portfolio stocks.");
        setIsFetching(false);
        return;
      }
      setArticles(clean);
      setLastFetched(new Date());
      setIsFetching(false);
      await analyzeAll(clean, PORTFOLIO_CACHE_KEY);
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setError("Failed to fetch portfolio news. Please try again.");
      setIsFetching(false);
      setIsResolvingNames(false);
    }
  }, [isLoggedIn, userId]);

  const handleModeSwitch = (newMode: NewsMode) => {
    if (newMode === mode || isFetching || isAnalyzing) return;
    setArticles([]);
    setStockSignals([]);
    setShowIntelligence(false);
    setMode(newMode);
    setFilter("all");
    setError(null);
    if (newMode === "general") {
      setPortfolioTickers([]);
      setUserTickers([]);
      const cache = readCache(CACHE_KEY);
      if (cacheIsValid(cache)) {
        setArticles(cache!.articles);
        setLastFetched(new Date(cache!.fetchedAt));
        setCacheAgeStr(cacheAge(cache));
        setStockSignals(
          computeStockSignals(cache!.articles, tickerNames, undefined),
        );
        return;
      }
      fetchGeneral();
    } else {
      setPortfolioTickers([]);
      fetchPortfolio();
    }
  };

  const handleRefresh = () => {
    setShowIntelligence(false);
    if (mode === "general") fetchGeneral();
    else fetchPortfolio();
  };

  useEffect(() => {
    const cache = readCache(CACHE_KEY);
    if (cacheIsValid(cache)) {
      setArticles(cache!.articles);
      setLastFetched(new Date(cache!.fetchedAt));
      setCacheAgeStr(cacheAge(cache));
      setStockSignals(computeStockSignals(cache!.articles, {}, undefined));
      const iv = setInterval(
        () => setCacheAgeStr(cacheAge(readCache(CACHE_KEY))),
        60000,
      );
      return () => clearInterval(iv);
    } else {
      fetchGeneral();
    }
  }, []);

  const fmt = (iso: string) => {
    try {
      const d = new Date(iso),
        now = new Date();
      const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
      if (diffH < 1)
        return `${Math.floor((now.getTime() - d.getTime()) / 60000)}m ago`;
      if (diffH < 24) return `${diffH}h ago`;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "—";
    }
  };

  const intelligenceReady =
    !isAnalyzing &&
    !isFetching &&
    stockSignals.length > 0 &&
    (mode !== "portfolio" || portfolioTickers.length > 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "hsl(var(--background))",
        position: "relative",
      }}
    >
      <div
        className="dark:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(to right,rgba(229,231,235,0.8) 1px,transparent 1px),linear-gradient(to bottom,rgba(229,231,235,0.8) 1px,transparent 1px),radial-gradient(circle 500px at 20% 100%,rgba(139,92,246,0.3),transparent),radial-gradient(circle 500px at 100% 80%,rgba(59,130,246,0.3),transparent)`,
          backgroundSize: "48px 48px,48px 48px,100% 100%,100% 100%",
        }}
      />
      <div
        className="hidden dark:block"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `linear-gradient(to right,rgba(71,85,105,0.2) 1px,transparent 1px),linear-gradient(to bottom,rgba(71,85,105,0.2) 1px,transparent 1px),radial-gradient(circle 500px at 20% 100%,rgba(139,92,246,0.25),transparent),radial-gradient(circle 500px at 100% 80%,rgba(59,130,246,0.2),transparent)`,
          backgroundSize: "48px 48px,48px 48px,100% 100%,100% 100%",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <Navbar />

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse-dot { 0%,100%{opacity:1}50%{opacity:0.3} }
          @keyframes intel-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,0.12)} }
          .filter-tab:hover { color: hsl(var(--foreground)) !important; }
          .article-row:hover { background: hsl(var(--secondary)/0.8) !important; }
          .mode-btn:hover { opacity: 1 !important; }
          .intel-pulse { animation: intel-pulse 2.8s ease-in-out infinite; }
        `}</style>

        <main style={{ flex: 1 }}>
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "48px 24px 80px",
              position: "relative",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Page Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: "28px",
                }}
              >
                <div>
                  <p
                    style={{
                      marginBottom: "6px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: "hsl(var(--muted-foreground))",
                    }}
                  >
                    Indian markets
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <h1
                      style={{
                        fontSize: "clamp(1.8rem,4vw,2.4rem)",
                        color: "hsl(var(--foreground))",
                        margin: 0,
                        letterSpacing: "-0.03em",
                        fontWeight: 600,
                      }}
                    >
                      Market News
                    </h1>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "99px",
                        padding: "3px 9px",
                        fontSize: "10px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#22c55e",
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "#22c55e",
                          animation: "pulse-dot 2.4s ease-in-out infinite",
                        }}
                      />
                      Live
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "hsl(var(--muted-foreground))",
                      fontWeight: 300,
                      lineHeight: 1.65,
                      maxWidth: "440px",
                      margin: 0,
                    }}
                  >
                    AI-analysed headlines from NSE, BSE and Indian equity
                    markets. Sentiment scored in real time.
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    paddingTop: "4px",
                    flexShrink: 0,
                  }}
                >
                  {cacheAgeStr && !isFetching && !isAnalyzing && (
                    <span
                      style={{
                        fontSize: "11px",
                        color: "hsl(var(--muted-foreground))",
                        fontFamily: "monospace",
                      }}
                    >
                      cached {cacheAgeStr}
                    </span>
                  )}
                  {lastFetched && !cacheAgeStr && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {lastFetched.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {articles.length > 0 && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {articles.length} stories
                    </span>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={isFetching || isAnalyzing}
                    style={{
                      height: "32px",
                      padding: "0 12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "hsl(var(--card)/0.7)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "7px",
                      cursor:
                        isFetching || isAnalyzing ? "not-allowed" : "pointer",
                      fontSize: "13px",
                      color: "hsl(var(--foreground))",
                      opacity: isFetching || isAnalyzing ? 0.45 : 1,
                      transition: "opacity 0.12s",
                    }}
                  >
                    {isFetching ? (
                      <Loader2
                        size={12}
                        style={{ animation: "spin 0.8s linear infinite" }}
                      />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    {isFetching
                      ? "Fetching…"
                      : isAnalyzing
                        ? "Analysing…"
                        : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Controls row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => handleModeSwitch("general")}
                    className="mode-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background:
                        mode === "general"
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--card)/0.7)",
                      backdropFilter: "blur(8px)",
                      border: `1px solid ${mode === "general" ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: mode === "general" ? 500 : 400,
                      color:
                        mode === "general"
                          ? "hsl(var(--background))"
                          : "hsl(var(--muted-foreground))",
                      opacity: mode === "general" ? 1 : 0.75,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <Globe size={12} /> General
                  </button>
                  <button
                    onClick={() => {
                      if (isLoggedIn) handleModeSwitch("portfolio");
                    }}
                    className="mode-btn"
                    title={
                      !isLoggedIn ? "Sign in to view portfolio news" : undefined
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background:
                        mode === "portfolio"
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--card)/0.7)",
                      backdropFilter: "blur(8px)",
                      border: `1px solid ${mode === "portfolio" ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
                      borderRadius: "7px",
                      fontSize: "13px",
                      fontWeight: mode === "portfolio" ? 500 : 400,
                      color:
                        mode === "portfolio"
                          ? "hsl(var(--background))"
                          : "hsl(var(--muted-foreground))",
                      opacity: !isLoggedIn
                        ? 0.4
                        : mode === "portfolio"
                          ? 1
                          : 0.75,
                      cursor: !isLoggedIn ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <Briefcase size={12} /> My Portfolio
                    {!isLoggedIn && (
                      <span style={{ fontSize: "10px", opacity: 0.7 }}>
                        · sign in
                      </span>
                    )}
                  </button>
                </div>

                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  {cart.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setShowCart(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 14px",
                        background: "rgba(34,197,94,0.08)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#22c55e",
                        transition: "all 0.15s",
                      }}
                    >
                      <ShoppingCart size={13} />
                      {cart.length} stock{cart.length > 1 ? "s" : ""} →
                      Optimizer
                    </motion.button>
                  )}

                  <AnimatePresence>
                    {(intelligenceReady || isAnalyzing) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => {
                          if (intelligenceReady) setShowIntelligence((v) => !v);
                        }}
                        disabled={isAnalyzing}
                        className={
                          intelligenceReady && !showIntelligence
                            ? "intel-pulse"
                            : ""
                        }
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "7px 16px",
                          background: showIntelligence
                            ? "hsl(var(--foreground))"
                            : intelligenceReady
                              ? "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(59,130,246,0.1))"
                              : "hsl(var(--card)/0.7)",
                          backdropFilter: "blur(8px)",
                          border: `1px solid ${showIntelligence ? "hsl(var(--foreground))" : intelligenceReady ? "rgba(34,197,94,0.4)" : "hsl(var(--border))"}`,
                          borderRadius: "8px",
                          cursor: intelligenceReady ? "pointer" : "default",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: showIntelligence
                            ? "hsl(var(--background))"
                            : intelligenceReady
                              ? "#22c55e"
                              : "hsl(var(--muted-foreground))",
                          opacity: isAnalyzing ? 0.6 : 1,
                          transition: "all 0.15s",
                        }}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2
                              size={12}
                              style={{
                                animation: "spin 0.8s linear infinite",
                                color: "hsl(var(--muted-foreground))",
                              }}
                            />
                            <span
                              style={{ color: "hsl(var(--muted-foreground))" }}
                            >
                              Building signals… {pct}%
                            </span>
                            <div
                              style={{
                                width: "40px",
                                height: "2px",
                                background: "hsl(var(--border))",
                                borderRadius: "99px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${pct}%`,
                                  background: "#22c55e",
                                  transition: "width 0.4s",
                                }}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            {showIntelligence
                              ? "Back to News"
                              : mode === "portfolio"
                                ? "Portfolio Intelligence"
                                : "Market Intelligence"}
                            {!showIntelligence && stockSignals.length > 0 && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  background: "rgba(34,197,94,0.18)",
                                  border: "1px solid rgba(34,197,94,0.35)",
                                  borderRadius: "99px",
                                  padding: "1px 7px",
                                  color: "#22c55e",
                                  fontWeight: 700,
                                }}
                              >
                                {stockSignals.length}
                              </span>
                            )}
                          </>
                        )}
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Portfolio ticker pills */}
              <AnimatePresence>
                {mode === "portfolio" &&
                  userTickers.length > 0 &&
                  !isFetching && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: "hidden", marginBottom: "16px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                            fontFamily: "monospace",
                          }}
                        >
                          tracking
                        </span>
                        {userTickers.map((ticker) => (
                          <span
                            key={ticker}
                            title={
                              tickerNames[ticker] &&
                              tickerNames[ticker] !== ticker
                                ? tickerNames[ticker]
                                : undefined
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "hsl(var(--secondary))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "4px",
                              padding: "2px 7px",
                              fontSize: "11px",
                              fontWeight: 500,
                              fontFamily: "monospace",
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {ticker}
                            {tickerNames[ticker] &&
                              tickerNames[ticker] !== ticker && (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "hsl(var(--muted-foreground))",
                                    fontWeight: 400,
                                  }}
                                >
                                  ·{" "}
                                  {tickerNames[ticker]
                                    .split(" ")
                                    .slice(0, 2)
                                    .join(" ")}
                                </span>
                              )}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Sentiment summary bar */}
              {articles.length > 0 && !isFetching && total > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      height: "3px",
                      borderRadius: "99px",
                      overflow: "hidden",
                      background: "hsl(var(--border))",
                      display: "flex",
                      marginBottom: "12px",
                    }}
                  >
                    {(["positive", "negative", "neutral"] as const).map((s) => {
                      const p = total > 0 ? (counts[s] / total) * 100 : 0;
                      return (
                        <div
                          key={s}
                          style={{
                            height: "100%",
                            width: `${p}%`,
                            background:
                              s === "positive"
                                ? "#22c55e"
                                : s === "negative"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "24px",
                    }}
                  >
                    {(["positive", "negative", "neutral"] as const).map((s) => {
                      const cfg = S[s];
                      const p =
                        total > 0 ? Math.round((counts[s] / total) * 100) : 0;
                      const active = filter === s;
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setFilter((f) => (f === s ? "all" : s))
                          }
                          className="filter-tab"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            opacity: filter !== "all" && !active ? 0.3 : 1,
                            transition: "opacity 0.12s",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: cfg.dot,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: "12px",
                              color: active
                                ? cfg.color
                                : "hsl(var(--muted-foreground))",
                            }}
                          >
                            {cfg.label}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "hsl(var(--foreground))",
                            }}
                          >
                            {counts[s]}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "hsl(var(--muted-foreground))",
                            }}
                          >
                            {p}%
                          </span>
                        </button>
                      );
                    })}
                    {isAnalyzing && (
                      <div
                        style={{
                          marginLeft: "auto",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Loader2
                          size={10}
                          style={{
                            color: "hsl(var(--muted-foreground))",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <div
                          style={{
                            width: "60px",
                            height: "2px",
                            background: "hsl(var(--border))",
                            borderRadius: "99px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: "hsl(var(--foreground))",
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "hsl(var(--muted-foreground))",
                          }}
                        >
                          {analyzedCount}/{totalToAnalyze}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter tab bar */}
              {articles.length > 0 && !isFetching && (
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    borderBottom: "1px solid hsl(var(--border))",
                    marginBottom: 0,
                  }}
                >
                  {(
                    ["all", "positive", "negative", "neutral"] as FilterType[]
                  ).map((key) => {
                    const labels = {
                      all: "All",
                      positive: "Bullish",
                      negative: "Bearish",
                      neutral: "Neutral",
                    };
                    const active = filter === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className="filter-tab"
                        style={{
                          padding: "8px 16px",
                          background: "none",
                          border: "none",
                          borderBottom: active
                            ? "1.5px solid hsl(var(--foreground))"
                            : "1.5px solid transparent",
                          marginBottom: "-1px",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: active
                            ? "hsl(var(--foreground))"
                            : "hsl(var(--muted-foreground))",
                          fontWeight: active ? 500 : 400,
                          transition: "color 0.12s",
                        }}
                      >
                        {labels[key]}
                        {key !== "all" && (
                          <span style={{ marginLeft: "5px", opacity: 0.45 }}>
                            {counts[key as keyof typeof counts]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Banners */}
            {mode === "portfolio" && !isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: "32px 0",
                  padding: "20px 24px",
                  background: "hsl(var(--card)/0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "hsl(var(--secondary))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Briefcase
                    size={14}
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 500,
                      color: "hsl(var(--foreground))",
                      margin: "0 0 3px 0",
                    }}
                  >
                    Sign in to see portfolio news
                  </p>
                  <p
                    style={{
                      fontSize: "12.5px",
                      color: "hsl(var(--muted-foreground))",
                      margin: 0,
                      fontWeight: 300,
                    }}
                  >
                    Get AI-analysed news specifically for the stocks in your
                    portfolio.
                  </p>
                </div>
                <a
                  href="/SignIn"
                  style={{
                    flexShrink: 0,
                    padding: "7px 16px",
                    background: "hsl(var(--foreground))",
                    color: "hsl(var(--background))",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Sign in
                </a>
              </motion.div>
            )}

            {error && (
              <div
                style={{
                  margin: "20px 0",
                  padding: "12px 16px",
                  background: "hsl(var(--card)/0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <AlertCircle
                  size={13}
                  style={{ color: "#dc2626", flexShrink: 0, marginTop: "1px" }}
                />
                <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            {(isFetching || (isAnalyzing && articles.length === 0)) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "80px 24px",
                  gap: "12px",
                }}
              >
                <Loader2
                  size={16}
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: "13.5px",
                    color: "hsl(var(--muted-foreground))",
                    fontWeight: 300,
                  }}
                >
                  {isResolvingNames
                    ? "Resolving company names…"
                    : isFetching
                      ? mode === "portfolio"
                        ? `Fetching news for ${userTickers.length} portfolio stocks…`
                        : "Fetching latest market news…"
                      : `Analysing ${totalToAnalyze} articles (${pct}%)…`}
                </span>
              </div>
            )}

            {/* Content: News grid OR Intelligence overlay */}
            <div style={{ position: "relative" }}>
              {!isFetching && (mode === "general" || isLoggedIn) && (
                <div
                  style={{
                    opacity: showIntelligence ? 0 : 1,
                    pointerEvents: showIntelligence ? "none" : "auto",
                    transition: "opacity 0.18s ease",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      border:
                        articles.length > 0
                          ? "1px solid hsl(var(--border))"
                          : "none",
                      borderRadius: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <AnimatePresence mode="popLayout">
                      {displayed.length > 0
                        ? displayed.map((article, idx) => {
                            const s = (
                              [
                                "positive",
                                "negative",
                                "neutral",
                                "pending",
                              ].includes(article.sentiment)
                                ? article.sentiment
                                : "neutral"
                            ) as keyof typeof S;
                            const cfg = S[s];
                            const isPend = s === "pending";
                            const isRight = idx % 2 === 1;
                            return (
                              <motion.div
                                key={article.id}
                                layout
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.15,
                                  delay: Math.min(idx * 0.006, 0.1),
                                }}
                              >
                                <div
                                  className="article-row"
                                  onClick={() => setSelectedArticle(article)}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "3px 1fr auto",
                                    borderBottom:
                                      "1px solid hsl(var(--border))",
                                    borderLeft: isRight
                                      ? "1px solid hsl(var(--border))"
                                      : "none",
                                    height: "100%",
                                    background: "hsl(var(--card)/0.6)",
                                    backdropFilter: "blur(8px)",
                                    cursor: "pointer",
                                    transition: "background 0.12s",
                                  }}
                                >
                                  <div
                                    style={{
                                      background: article.analyzed
                                        ? cfg.dot
                                        : "transparent",
                                      transition: "background 0.3s",
                                    }}
                                  />
                                  <div
                                    style={{
                                      padding: "14px 16px 14px 14px",
                                      minWidth: 0,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        marginBottom: "5px",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "3px",
                                          fontSize: "11px",
                                          color: cfg.color,
                                          fontWeight: 500,
                                        }}
                                      >
                                        <cfg.Icon
                                          size={9}
                                          style={
                                            isPend
                                              ? {
                                                  animation:
                                                    "spin 0.8s linear infinite",
                                                }
                                              : {}
                                          }
                                        />
                                        {cfg.label}
                                      </span>
                                      <span
                                        style={{
                                          width: "1px",
                                          height: "10px",
                                          background: "hsl(var(--border))",
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "hsl(var(--muted-foreground))",
                                          fontWeight: 300,
                                        }}
                                      >
                                        {article.source}
                                      </span>
                                      {article.stocks.slice(0, 2).map((tk) => (
                                        <span
                                          key={tk}
                                          style={{
                                            background: "hsl(var(--secondary))",
                                            border:
                                              "1px solid hsl(var(--border))",
                                            borderRadius: "3px",
                                            padding: "1px 5px",
                                            fontSize: "10px",
                                            fontFamily: "monospace",
                                            color: "hsl(var(--foreground))",
                                            fontWeight: 500,
                                          }}
                                        >
                                          {tk}
                                        </span>
                                      ))}
                                      {article.stocks.length > 2 && (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            color:
                                              "hsl(var(--muted-foreground))",
                                          }}
                                        >
                                          +{article.stocks.length - 2}
                                        </span>
                                      )}
                                    </div>
                                    <h3
                                      style={{
                                        fontSize: "13.5px",
                                        fontWeight: 500,
                                        letterSpacing: "-0.01em",
                                        lineHeight: 1.45,
                                        color: "hsl(var(--foreground))",
                                        margin: "0 0 5px 0",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {article.title}
                                    </h3>
                                    {article.sentimentReason && !isPend && (
                                      <p
                                        style={{
                                          fontSize: "11.5px",
                                          color: "hsl(var(--muted-foreground))",
                                          lineHeight: 1.5,
                                          margin: 0,
                                          fontWeight: 400,
                                          display: "-webkit-box",
                                          WebkitLineClamp: 1,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {toTitleCase(article.sentimentReason)}
                                      </p>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      justifyContent: "space-between",
                                      padding: "14px 14px 14px 0",
                                      minWidth: "60px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        color: "hsl(var(--muted-foreground))",
                                        fontWeight: 300,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {fmt(article.publishedAt)}
                                    </span>
                                    <a
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "hsl(var(--foreground))",
                                        textDecoration: "none",
                                        opacity: 0.25,
                                        transition: "opacity 0.12s",
                                      }}
                                      onMouseEnter={(e) => {
                                        (
                                          e.currentTarget as HTMLElement
                                        ).style.opacity = "1";
                                      }}
                                      onMouseLeave={(e) => {
                                        (
                                          e.currentTarget as HTMLElement
                                        ).style.opacity = "0.25";
                                      }}
                                    >
                                      Read <ExternalLink size={10} />
                                    </a>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })
                        : !isFetching &&
                          articles.length > 0 && (
                            <div
                              style={{
                                gridColumn: "1/-1",
                                textAlign: "center",
                                padding: "48px 24px",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: "14px",
                                  color: "hsl(var(--muted-foreground))",
                                  marginBottom: "16px",
                                  fontWeight: 300,
                                }}
                              >
                                No {filter} articles right now.
                              </p>
                              <button
                                onClick={() => setFilter("all")}
                                style={{
                                  padding: "7px 16px",
                                  background: "hsl(var(--card)/0.7)",
                                  backdropFilter: "blur(8px)",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "7px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  color: "hsl(var(--foreground))",
                                }}
                              >
                                Show all
                              </button>
                            </div>
                          )}
                    </AnimatePresence>
                  </div>
                  {!isFetching && articles.length === 0 && !error && (
                    <div style={{ textAlign: "center", padding: "80px 24px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "hsl(var(--muted-foreground))",
                          fontWeight: 300,
                        }}
                      >
                        Loading articles…
                      </p>
                    </div>
                  )}
                </div>
              )}

              <AnimatePresence>
                {showIntelligence && (
                  <MarketIntelligenceOverlay
                    signals={stockSignals}
                    onClose={() => setShowIntelligence(false)}
                    isPortfolio={mode === "portfolio"}
                    cart={cart}
                    onCartToggle={handleCartToggle}
                    onOpenCart={() => setShowCart(true)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </main>

        <Separator />
        <Footer />
      </div>

      <AnimatePresence>
        {selectedArticle && (
          <ArticleDrawer
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCart && (
          <CartPanel
            cart={cart}
            signals={stockSignals}
            onRemove={handleCartRemove}
            onClear={handleCartClear}
            onGoToOptimizer={handleGoToOptimizer}
            onClose={() => setShowCart(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCartToast && cart.length > 0 && !showCart && (
          <CartToast
            cartCount={cart.length}
            onGoToOptimizer={handleGoToOptimizer}
            onDismiss={() => setShowCartToast(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
