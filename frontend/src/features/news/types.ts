export type Sentiment = "positive" | "negative" | "neutral" | "pending";
export type FilterType = "all" | "positive" | "negative" | "neutral";
export type NewsMode = "general" | "portfolio";

export interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: string;
  via: "RSS" | "NewsData" | "GNews";
  stocks: string[];
  sentiment: Sentiment;
  sentimentReason: string;
  analyzed: boolean;
}

export interface AnalysisResult {
  id: string;
  stocks: string[];
  sentiment: "positive" | "negative" | "neutral";
  reason: string;
}

export interface StockSignal {
  ticker: string;
  companyName: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalMentions: number;
  bullishPct: number;
  score: number;
  confidence: "low" | "medium" | "high";
  articles: Article[];
  topReason: string;
  trend: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
}

export interface NewsCache {
  articles: Article[];
  fetchedAt: number;
}
