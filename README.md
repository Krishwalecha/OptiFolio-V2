# OptiFolio

AI-powered portfolio optimizer for Indian equities. Input stocks, set your risk profile, get an allocation backed by XGBoost return predictions and Modern Portfolio Theory.

**Live → [optifolio-app.vercel.app](https://optifolio-app.vercel.app)**

---

## What it does

1. Fetches 5 years of OHLCV data from Yahoo Finance for your chosen NSE stocks
2. Engineers ~40 technical features (RSI, MACD, ATR, Bollinger Bands, momentum, etc.)
3. Trains a per-stock XGBoost model to predict forward returns, evaluated by IC and directional accuracy
4. Runs MPT optimization (Max Sharpe, Min Volatility, Aggressive Growth) with Ledoit-Wolf covariance shrinkage and Monte Carlo simulation
5. Blends ML predictions with historical returns using IC-weighted alpha
6. Returns allocation with shares, weights, Sharpe ratio, VaR, max drawdown, Sortino, Calmar, and more

Also includes financial news with AI-driven stock impact detection, a SIP calculator, portfolio history, and an AI assistant (Groq via n8n).

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend API | Node.js, Express |
| ML Engine | Python, XGBoost, pandas, NumPy, scikit-learn, Optuna |
| Database | Supabase (Postgres + Auth) |
| AI | Groq (LLaMA), Gemini, n8n |
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
cp .env.example .env        # set Supabase, n8n keys
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

The ML engine runs as a spawned Python subprocess per optimization request — no persistent ML server, stateless and easy to scale.

---

> For educational and research purposes. Not financial advice.
