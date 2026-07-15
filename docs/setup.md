# Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase project
- Groq API key
- Gemini API key
- n8n instance (cloud or self-hosted)
- GNews API key

---

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Environment variables:**
```
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Backend (Node.js API)

```bash
cd backend
npm install
cp .env.example .env
node server.cjs
```

**Environment variables:**
```
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
N8N_WEBHOOK_URL=
```

---

## ML Engine (Python)

```bash
cd backend
pip install -r requirements.txt
```

The ML engine runs as a subprocess spawned by the Express server on each `/api/optimize` request — no separate server needed.

**Key config** (`backend/config.py`):
- `OPTUNA_N_TRIALS = 60` — Bayesian HPO trials per stock
- `MONTE_CARLO_SIMS = 15000` — random portfolio simulations
- `CACHE_MAX_AGE_HOURS = 12` — OHLCV cache TTL

---

## n8n (AI Chatbot)

Set up an n8n workflow with:
- Webhook trigger (POST)
- Groq node with your LLM prompt
- Response back to frontend

Point `N8N_WEBHOOK_URL` in backend `.env` to your workflow's webhook URL.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set `VITE_API_URL` to Render backend URL |
| Backend + ML | Render | Free tier: 512MB RAM, spins down after 15 min |

Render cold start is handled by a wake-up ping from the frontend on app load (`/api/health`).
