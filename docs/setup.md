# Setup Guide

## Prerequisites

- Node.js 18+
- Python 3.10+
- A Supabase project
- Groq API keys and Gemini API keys (comma-separated lists; more keys give more headroom)
- NewsData and GNews API keys

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
GROQ_KEYS=key1,key2
GEMINI_KEYS=key1,key2
NEWSDATA_KEYS=
GNEWS_KEYS=
```

---

## ML Engine (Python)

```bash
cd backend
pip install -r requirements.txt
```

The ML engine runs as a subprocess spawned by the Express server on each `/api/optimize` request — no separate server needed.

**Key config** (`backend/config.py`):
- `MODEL_V2` — horizon, target and skill-check windows for the pooled model
- `MONTE_CARLO_SIMS = 15000` — random portfolio simulations
- `CACHE_MAX_AGE_HOURS = 12` — OHLCV cache TTL

---

## AI assistant and headline scoring

Both call Groq and Gemini directly from the API; no workflow tool is needed. Add keys to `GROQ_KEYS` and `GEMINI_KEYS`. A key that hits its quota rests only for the model that ran out; a rejected key rests for an hour.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set `VITE_API_URL` to Render backend URL |
| Backend + ML | Render | Free tier: 512MB RAM, spins down after 15 min |

Render cold start is handled by a wake-up ping from the frontend on app load (`/api/health`).
