# Migration Plan — Completed

All migration phases are done. This file is kept for reference.

## What was done

- Monorepo restructured into `frontend/` + `backend/` + `docs/`
- Python ML engine integrated as subprocess (XGBoost, Optuna, MPT)
- Supabase auth + portfolio history wired up
- n8n + Groq + Gemini integrated for AI features
- GNews API added for news sentiment
- Render deployment with RAM optimizations (float32, gc.collect, del statements)
- Vercel deployment for frontend
- Health endpoint + wake-up ping added for Render cold start handling
- All secrets moved to environment variables

## Current state

Production is live at [optifolio-app.vercel.app](https://optifolio-app.vercel.app).
See `architecture.md` for the current stack.
