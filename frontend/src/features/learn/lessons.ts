export type Track = "foundations" | "results" | "engine";

export interface Lesson {
  slug: string;
  track: Track;
  title: string;
  minutes: number;
  summary: string;
  body: { heading?: string; text: string }[];
  takeaway: string;
  formula?: string;
}

export const TRACKS: Record<Track, { title: string; description: string }> = {
  foundations: {
    title: "Foundations",
    description: "The ideas every investor should know before buying a single share.",
  },
  results: {
    title: "Reading your results",
    description: "What each number in an OptiFolio result means, and when to worry.",
  },
  engine: {
    title: "How OptiFolio works",
    description: "The models and maths behind every allocation, without the jargon.",
  },
};

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-a-stock",
    track: "foundations",
    title: "What a stock really is",
    minutes: 4,
    summary: "A share is a small slice of ownership in a real business, not a lottery ticket.",
    body: [
      { text: "When you buy one share of a company listed on the NSE or BSE, you own a tiny fraction of that business: its factories, brands, cash and future profits. The share price moves as investors change their view of what those future profits are worth." },
      { heading: "Why prices move", text: "In the short run, prices react to news, interest rates and sentiment. Over years, they tend to follow earnings. A company that grows profits steadily usually sees its share price follow, even if the path is noisy." },
      { heading: "Returns come from two places", text: "Price appreciation, when the share becomes worth more, and dividends, when the company pays out part of its profit. Many Indian large caps pay modest dividends, so most long-term return comes from growth." },
    ],
    takeaway: "Think of every stock as a business you partly own. Judge it by the business, not by yesterday's price move.",
  },
  {
    slug: "risk-and-return",
    track: "foundations",
    title: "Risk, return and why they travel together",
    minutes: 5,
    summary: "Higher expected return almost always means accepting bigger swings along the way.",
    body: [
      { text: "Risk in investing usually means volatility: how much a price moves up and down around its average. A fixed deposit barely moves. A small-cap stock can move 5% in a day." },
      { heading: "The trade-off", text: "Investors demand extra return for holding things that swing more. That is why equities have historically beaten bonds over long periods, and also why they can fall 30% in a bad year." },
      { heading: "Your risk tolerance", text: "The right level of risk depends on your age, income stability, dependants and how long until you need the money. OptiFolio's Smart AI profile turns those answers into a conservative, balanced or aggressive setting." },
    ],
    takeaway: "You cannot remove risk from equity investing. You can choose how much to take and get paid fairly for it.",
  },
  {
    slug: "diversification",
    track: "foundations",
    title: "Diversification, the only free lunch",
    minutes: 5,
    summary: "Combining stocks that do not move together lowers risk without giving up return.",
    body: [
      { text: "If you own two stocks that always rise and fall together, owning both is barely safer than owning one. If they move independently, a bad month for one is often offset by the other." },
      { heading: "Correlation is the key", text: "Correlation measures how closely two assets move together, from -1 to +1. TCS and Infosys are highly correlated because they sell similar services. HDFC Bank and ITC much less so." },
      { heading: "What the optimizer does", text: "OptiFolio measures the correlation between every pair of your stocks and weights them so that their ups and downs partly cancel. That is why it may give a strong stock a smaller weight than you expect." },
    ],
    takeaway: "Five stocks from one sector is concentration, not diversification.",
  },
  {
    slug: "efficient-frontier",
    track: "foundations",
    title: "The efficient frontier",
    minutes: 6,
    summary: "For any level of risk, there is one mix of your stocks that earns the most.",
    body: [
      { text: "Take any set of stocks and imagine every possible way to split your money between them. Plot each portfolio by its risk and expected return and you get a cloud of points." },
      { heading: "The upper edge", text: "The upper-left edge of that cloud is the efficient frontier. Every portfolio on it earns the highest return possible for its level of risk. Anything below it is leaving return on the table." },
      { heading: "Choosing a point", text: "A conservative investor picks a point low on the frontier; an aggressive one picks higher. The maximum Sharpe portfolio sits where return per unit of risk is greatest." },
    ],
    takeaway: "Optimization does not predict the future. It finds the best trade-off given what history and the models tell us.",
  },
  {
    slug: "sip-basics",
    track: "foundations",
    title: "SIPs and the power of compounding",
    minutes: 4,
    summary: "Investing a fixed amount every month turns time into your biggest advantage.",
    body: [
      { text: "A Systematic Investment Plan invests the same amount on a fixed date each month, usually into a mutual fund. You buy more units when prices are low and fewer when they are high." },
      { heading: "Compounding", text: "Returns earn returns. ₹10,000 a month at 12% a year becomes about ₹23 lakh in 10 years, of which only ₹12 lakh is money you put in." },
      { heading: "Step-up SIPs", text: "Raising your SIP by a small percentage each year, in line with salary growth, can dramatically increase the final corpus. Try it in the SIP planner." },
    ],
    takeaway: "Starting early matters more than starting big.",
  },
  {
    slug: "volatility",
    track: "results",
    title: "Volatility",
    minutes: 3,
    summary: "The typical size of your portfolio's yearly swings.",
    formula: "σ_annual = σ_daily × √252",
    body: [
      { text: "Annualised volatility is the standard deviation of daily returns, scaled to a year. A volatility of 12% means that in a typical year, returns land within about 12 percentage points of the average." },
      { heading: "Rules of thumb", text: "Below 12% is calm for an equity portfolio. 12% to 20% is normal for a diversified basket of Indian large caps. Above 25% expect some stomach-churning months." },
    ],
    takeaway: "Volatility is not loss, but it is the discomfort you must be able to sit through.",
  },
  {
    slug: "sharpe-ratio",
    track: "results",
    title: "Sharpe ratio",
    minutes: 4,
    summary: "How much return you earn for each unit of risk you take.",
    formula: "Sharpe = (Return − Risk-free rate) ÷ Volatility",
    body: [
      { text: "The Sharpe ratio subtracts what you could earn risk-free, such as a government bond, from the portfolio's return, then divides by volatility. It answers: was the extra risk worth it?" },
      { heading: "Reading it", text: "Below 0.5 is weak. Around 1 is good. Above 1.5 is excellent and rare over long periods. OptiFolio's balanced profile targets the maximum Sharpe point on the frontier." },
    ],
    takeaway: "Compare portfolios by Sharpe, not by raw return alone.",
  },
  {
    slug: "sortino-ratio",
    track: "results",
    title: "Sortino ratio",
    minutes: 3,
    summary: "Like Sharpe, but only counts the swings that hurt.",
    body: [
      { text: "Volatility treats a sudden 5% gain the same as a 5% loss. Sortino only penalises downside volatility, which is closer to how investors actually feel risk." },
      { heading: "Reading it", text: "A Sortino well above the Sharpe ratio means most of the portfolio's volatility comes from upside moves. That is a good sign." },
    ],
    takeaway: "Sortino tells you whether the bumps are mostly up or mostly down.",
  },
  {
    slug: "drawdown",
    track: "results",
    title: "Maximum drawdown",
    minutes: 3,
    summary: "The worst fall from a peak before the portfolio recovered.",
    body: [
      { text: "If a portfolio rose to ₹12 lakh, fell to ₹9 lakh, then recovered, its drawdown was 25%. Maximum drawdown is the largest such fall over the data period." },
      { heading: "Why it matters", text: "Drawdown is the number that makes people sell at the bottom. Ask yourself honestly whether you could watch your portfolio drop by this much without panicking." },
      { heading: "Drawdown duration", text: "OptiFolio also reports how many days the portfolio stayed below its previous peak. Long durations test patience as much as deep drawdowns test nerve." },
    ],
    takeaway: "If the max drawdown would make you sell, choose a more conservative profile.",
  },
  {
    slug: "value-at-risk",
    track: "results",
    title: "Value at Risk and CVaR",
    minutes: 4,
    summary: "A realistic estimate of a bad day, and of how bad the worst days get.",
    body: [
      { text: "VaR at 95% says: on 95 out of 100 trading days, your daily loss should not exceed this percentage. A VaR of 1.9% on ₹10 lakh means most days you lose less than ₹19,000." },
      { heading: "CVaR", text: "Conditional VaR, or expected shortfall, averages the losses on the worst 5% of days. It describes what happens when things do go wrong, which VaR alone does not." },
    ],
    takeaway: "VaR sets expectations for normal bad days. CVaR prepares you for the rare terrible ones.",
  },
  {
    slug: "beta",
    track: "results",
    title: "Beta against the Nifty 50",
    minutes: 3,
    summary: "How strongly your portfolio moves with the market.",
    body: [
      { text: "A beta of 1 means the portfolio tends to move one-for-one with the Nifty 50. A beta of 0.8 means it typically moves 8% when the index moves 10%." },
      { heading: "Defensive or aggressive", text: "Low-beta portfolios cushion market falls but lag in rallies. High-beta portfolios amplify both. Neither is better; it depends on your goal." },
    ],
    takeaway: "Beta tells you how much of your ride is simply the market's ride.",
  },
  {
    slug: "calmar-omega",
    track: "results",
    title: "Calmar, Omega and tail ratios",
    minutes: 4,
    summary: "Three advanced lenses on the shape of your returns.",
    body: [
      { heading: "Calmar ratio", text: "Annual return divided by maximum drawdown. Above 1 means the portfolio earns more per year than its worst historical fall." },
      { heading: "Omega ratio", text: "Probability-weighted gains divided by probability-weighted losses. Above 1 means gains outweigh losses across the whole distribution." },
      { heading: "Tail ratio", text: "The size of the best 5% of days relative to the worst 5%. Above 1 means your good days are bigger than your bad days." },
    ],
    takeaway: "These ratios reward portfolios whose upside is fatter than their downside.",
  },
  {
    slug: "how-the-model-works",
    track: "engine",
    title: "How the machine-learning model works",
    minutes: 6,
    summary: "XGBoost forecasts each stock's return from forty technical signals.",
    body: [
      { text: "For every stock, OptiFolio downloads five years of daily prices and volume and computes around forty indicators: momentum, RSI, MACD, Bollinger Bands, ATR, volume trends and more." },
      { heading: "Training", text: "An XGBoost model learns how those indicators relate to future returns, using time-series cross-validation so it is always tested on data it has never seen." },
      { heading: "Judging the model", text: "Each model is scored by information coefficient (how well its predictions rank actual returns) and directional accuracy (how often it gets up versus down right). Stocks with weak or negative signals can be dropped." },
      { heading: "Deep analysis", text: "Turning on deep analysis runs Optuna, a Bayesian search over model settings, for about sixty trials per stock. It is slower and usually improves the scores." },
    ],
    takeaway: "The model does not know the future. It finds patterns that held historically and tells you how reliable they were.",
  },
  {
    slug: "how-the-optimizer-works",
    track: "engine",
    title: "How the optimizer builds your allocation",
    minutes: 6,
    summary: "Model forecasts meet modern portfolio theory and 15,000 simulations.",
    body: [
      { text: "The optimizer blends each stock's ML forecast with its historical return, trusting the model more when its information coefficient is higher." },
      { heading: "Measuring risk properly", text: "It estimates how every pair of stocks moves together using Ledoit-Wolf shrinkage, a technique that makes the covariance matrix stable even with limited data." },
      { heading: "Finding the weights", text: "Depending on your profile it solves for minimum volatility, maximum Sharpe or aggressive growth, and checks the answer against 15,000 randomly simulated portfolios." },
      { heading: "From weights to shares", text: "Finally it converts percentages into whole share counts at current prices, so the result is something you can actually buy." },
    ],
    takeaway: "Every number in your result traces back to data, a model score or a constraint you chose.",
  },
];

export const lessonBySlug = (slug: string) => LESSONS.find((l) => l.slug === slug);
