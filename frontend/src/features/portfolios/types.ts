export interface PortfolioStock {
  ticker: string;
  dbTicker: string;
  allocation: number;
  investedInr: number;
  sessionId: string;
}

export interface PortfolioGroup {
  date: string;
  sessionId: string;
  stocks: PortfolioStock[];
}
