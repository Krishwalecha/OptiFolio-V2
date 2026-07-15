# Architecture — OptiFolio V2

## Purpose

An AI-powered portfolio optimizer for Indian equities. Users input NSE stocks and a capital amount, and get a data-driven allocation backed by XGBoost return predictions, Modern Portfolio Theory, and Monte Carlo simulation.

---

## Stack

| Layer       | Tech                                                 |
| ----------- | ---------------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui  |
| Backend API | Node.js, Express                                     |
| ML Engine   | Python, XGBoost, pandas, NumPy, scikit-learn, Optuna |
| Database    | Supabase (Postgres + Auth)                           |
| AI / LLMs   | Groq (LLaMA), Gemini API                             |
| Automation  | n8n                                                  |
| News Data   | GNews API                                            |
| Deploy      | Vercel (frontend), Render (backend + ML)             |

---

## High-Level Flow

```
React + TypeScript (Vercel)
        │
        ▼
Express API (Render)  ──────────────────┐
        │                               │
   ┌────┴────┐                    Supabase (Auth + DB)
   ▼         ▼
Python subprocess          n8n workflow
XGBoost + MPT optimizer    │         │
                         Groq      Gemini
                       (chatbot)  (sentiment)
                                    │
                                 GNews API
```

---

## ML Pipeline

1. Fetch 5 years of OHLCV data from Yahoo Finance for chosen NSE stocks
2. Engineer 40+ technical indicators: RSI, MACD, ATR, Bollinger Bands, momentum, volume features
3. Train a per-stock XGBoost model with Optuna HPO (Bayesian, 60 trials, TimeSeriesSplit CV)
4. Blend ML predicted returns with historical mean returns using IC-weighted alpha
5. Run MPT optimization: Max Sharpe, Min Volatility, Aggressive Growth
6. Apply Ledoit-Wolf covariance shrinkage + Monte Carlo simulation (15,000 portfolios)
7. Return allocation with Sharpe, VaR, Sortino, Calmar, max drawdown

---

## AI Features

### AI Chat Assistant

- Built with n8n automation workflow
- Groq (LLaMA) as the LLM backend
- Prompt engineering to keep responses grounded in financial context

### News Sentiment Analysis

- News fetched via GNews API
- Groq and Gemini used for LLM-powered sentiment scoring per stock

---

## Key Design Decisions

- **ML runs as a Python subprocess** per request — stateless, no persistent ML server, easy to scale
- **Render** — ML engine and API on Render; wake-up ping on app load to handle cold starts
- **float32 arrays** for Monte Carlo to reduce peak RAM usage on Render
- **Supabase** handles auth and portfolio history storage

---

## Project Structure

```
OptiFolio-V2/
├── frontend/          # React + TypeScript app
│   └── src/
│       ├── components/
│       ├── pages/
│       └── lib/
├── backend/           # Node.js API + Python ML engine
│   ├── server.cjs     # Express server
│   ├── api/           # Python entry points (optimize.py, etc.)
│   ├── services/      # portfolio_optimizer.py, risk_metrics.py, etc.
│   ├── data/          # OHLCV cache
│   └── config.py      # All constants and hyperparameters
└── docs/
```
