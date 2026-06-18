# Setup Guide

## Prerequisites

### Frontend

- Node.js
- npm

### Backend

- Node.js

### Optimization Services

- Python 3.10+

---

# Frontend Setup

Navigate:

frontend/

Install:

npm install

Run:

npm run dev

---

# Backend Setup

Navigate:

backend/

Install dependencies:

npm install

Run:

node server.cjs

---

# Environment Variables

Frontend:

VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

Backend:

PORT=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

---

# Development Workflow

1. Start backend
2. Start frontend
3. Verify Supabase connection
4. Verify optimizer functionality

---

# Migration Notes

Current migration focuses on:

- Structure cleanup
- Security improvements
- Repository organization

Feature development is postponed until migration is complete.