# Architecture Overview

## Project Name

OptiFolio V2

---

## Purpose

A portfolio optimization platform that helps users analyze stocks and generate portfolio allocation recommendations.

---

# Current Technology Stack

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Shadcn UI

---

## Backend

- Node.js
- Express

---

## Database

- Supabase

Used for:

- Authentication
- User data

---

## Optimization Layer

Python

Current services:

- stockOptimizer.py
- stockInfo.py

Responsibilities:

- Stock analysis
- Portfolio allocation
- Risk calculations

---

## External Services

### Supabase

Authentication

### Google Sheets

Stock data collection pipeline

---

# High Level Flow

User -> React Frontend -> Express Backend -> Python Optimization Service -> Portfolio Results

---

# Planned V2 Structure

Frontend -> Backend API -> Optimization Services -> Data Layer -> Clear separation of responsibilities.

---

# Future Improvements

- Environment-based configuration
- Feature-based frontend structure
- Service-based backend structure
- Prediction module integration