# Architecture — OptiFolio V2

## Purpose

A portfolio optimizer for Indian equities that shows its work. Users enter NSE stocks and an amount, and get whole-share quantities, the risk they take on, the return model's measured track record, and a one-year out-of-sample test of the method.

---

## Stack

| Layer       | Tech                                                                  |
| ----------- | --------------------------------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite, Tailwind CSS, framer-motion, own UI kit (`src/ui`) |
| Backend API | Node.js, Express 5                                                    |
| ML engine   | Python, XGBoost, pandas, NumPy, SciPy, scikit-learn                   |
| Database    | Supabase (Postgres + Auth), JWT verified server-side                  |
| AI / LLMs   | Groq and Gemini, called directly from the API with per-model key backoff |
| Data        | Yahoo Finance (prices), AMFI via mfapi.in (fund NAVs), RSS, NewsData, GNews |
| Deploy      | Vercel (frontend), Render (backend + ML)                              |

---

## High-level flow

```
React + TypeScript (Vercel)
        │
        ▼
Express API (Render) ─────────────── Supabase (Auth + DB)
   │            │
   ▼            ▼
Python        Groq / Gemini
subprocesses  (assistant, headline scoring)
optimize_v1.py, rebalance.py, stock_history.py
```

---

## Optimization pipeline

See [model.md](model.md) for the measured results.

1. Load ten years of daily prices for the user's stocks plus a 30-stock reference universe.
2. Pooled XGBoost model ranks stocks for the next 21 trading days. Its out-of-sample skill (IC, t-statistic, spread hit rate) is measured walk-forward and cached daily.
3. Expected returns: CAPM prior (rf + β × 6%) blended 70/30 with history, plus a Grinold alpha tilt using half the measured IC, capped, and switched off when t < 1.5.
4. Ledoit-Wolf covariance.
5. SLSQP optimization within per-stock limits: minimum variance, max Sharpe, or mean-variance utility. Max Sharpe and utility are resampled over 48 forecast draws and averaged.
6. Whole-share allocation, full risk metrics, a one-year backtest with point-in-time weights, and a random-portfolio frontier.

---

## AI features

### Assistant ("Folio")

- `/api/chat`: Groq first (`openai/gpt-oss-120b`, then `20b`), Gemini as backup.
- A detailed system prompt describes every OptiFolio feature and the method, and restricts answers to markets, investing, personal finance and OptiFolio. Off-topic questions get a short, friendly redirect.
- Context is assembled server-side: today's model skill, the page the user is on, their latest optimization result, and (when signed in) their saved portfolios and risk profile read from Supabase.

### Headline scoring

- `/api/analyze`: Gemini first, Groq as backup. Returns tone (positive, negative, neutral), the companies mentioned and a one-line reason.
- Key rest is tracked per key and model, so one model's quota running out does not bench a key for the others. Rejected keys rest for an hour.

---

## Key design decisions

- **ML runs as Python subprocesses** per request, behind a semaphore and a daily result cache. A warm-up job precomputes the day's skill estimate.
- **Auth**: every user route checks the Supabase JWT and uses the token's user id, never one from the request body.
- **No component library**: the UI kit in `frontend/src/ui` (buttons, fields, overlays, toasts, command menu, SVG charts, loaders, dithered canvases) is written for this app.

---

## Project structure

```
OptiFolio-V2/
├── frontend/
│   └── src/
│       ├── ui/            # design system and charts
│       ├── components/    # app shell, optimizer, charts, site
│       ├── features/      # domain logic per area
│       ├── pages/
│       └── lib/
├── backend/
│   ├── server.cjs         # Express API
│   ├── lib/               # auth and request guards
│   ├── api/               # Python entry points
│   ├── services/          # features, per-stock XGBoost, optimiser, risk metrics
│   ├── sql/               # one-time Supabase migrations
│   └── config.py
└── docs/
```
