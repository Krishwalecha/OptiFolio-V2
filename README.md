# OptiFolio

AI-powered portfolio optimizer for Indian equities. Input stocks, set your risk profile, get an allocation backed by XGBoost return predictions and Modern Portfolio Theory.

**Live → [optifolio-app.vercel.app](https://optifolio-app.vercel.app)**

---

## What it does

1. Loads ten years of daily prices for your NSE stocks, a 30-stock reference market and the Nifty 50
2. Engineers about 60 features per stock (trend, momentum, oscillators, volatility, volume flow, relative strength, beta), ranked across stocks each day
3. Trains one pooled XGBoost model that ranks stocks by expected return over the next month, with no look-ahead
4. Measures the model's out-of-sample skill over the last 36 months and uses its forecasts only in proportion to that skill (Grinold's fundamental law, with a 50% haircut)
5. Optimises with Ledoit-Wolf covariance: minimum variance, maximum Sharpe or mean-variance utility depending on your risk profile, within your own weight limits
6. Returns shares, weights, 15 risk metrics, the efficient frontier and a one-year backtest against the Nifty 50 and equal weight

Also includes market news with AI sentiment scoring, a SIP planner, saved portfolios with rebalance alerts, a community feed, a learning curriculum and a context-aware AI assistant.

The model and its benchmark are documented in [docs/model.md](docs/model.md). Over 60 non-overlapping monthly walk-forward tests on ten years of data it reached a mean information coefficient of 0.072 (t = 2.85). In a separate five-year test its top-ranked stocks beat its bottom-ranked ones by 1.5% a month, while the previous per-stock model showed no spread.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend API | Node.js, Express |
| ML Engine | Python, XGBoost, pandas, NumPy, scikit-learn, SciPy |
| Database | Supabase (Postgres + Auth) |
| AI | Groq, Gemini |
| Deploy | Vercel (frontend), Render (backend + ML) |

---

## Local setup

```bash
# Frontend
cd frontend
npm install
cp .env.example .env        # set VITE_API_URL
npm run dev

# Backend
cd backend
npm install
cp .env.example .env        # set Supabase and Groq keys
node server.cjs

# ML engine (Python 3.10+)
cd backend
pip install -r requirements.txt
```

---

## Architecture

```
React + TypeScript (Vercel)
        │
        ▼
Express API (Render)
        │
   ┌────┴────┐
   ▼         ▼
Supabase   Python subprocess
           XGBoost + MPT optimizer
```

The ML engine runs as a spawned Python subprocess per request, behind a concurrency limit, a per-user rate limit and a short result cache. A warm-up job precomputes the day's model-skill estimate when the server starts. Every user-data endpoint verifies the Supabase session token server-side.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
npm test          # Node API guards + Python optimiser tests
```

Community features use the `community_posts`, `community_likes` and `community_comments` tables in Supabase.

---

> For educational and research purposes. Not financial advice.
