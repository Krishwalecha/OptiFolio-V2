# Migration Plan

## Goal

Transform the current OptiFolio project into a cleaner and more maintainable architecture while preserving existing functionality.

---

## Current Structure

Root directory contains:

- React frontend
- Express backend
- Python optimizer
- Data files
- Generated outputs
- Credentials

---

## Target Structure

OptiFolio/

frontend/
backend/
docs/

---

## Migration Phases

### Phase 1

Repository Foundation

Tasks:

- Create new repository
- Create workspace structure
- Create documentation
- Configure environment templates

---

### Phase 2

Frontend Migration

Tasks:

- Move React application
- Verify build
- Verify routing
- Verify charts

Deliverable:

Frontend runs successfully.

---

### Phase 3

Backend Migration

Tasks:

- Move Express server
- Move optimization services
- Move stock data services

Deliverable:

Backend runs successfully.

---

### Phase 4

Security Cleanup

Tasks:

- Remove credentials
- Remove generated files
- Configure environment variables

Deliverable:

Repository contains no secrets.

---

### Phase 5

Stability Pass

Tasks:

- Fix broken imports
- Fix deployment issues
- Fix API communication
- Fix environment handling

Deliverable:

Application functions locally and in production.

---

### Phase 6

Architecture Cleanup

Tasks:

- Organize frontend by feature
- Organize backend services
- Remove duplicate code

Deliverable:

Maintainable project structure.

---

### Phase 7

Prediction Layer

Tasks:

- XGBoost
- Feature Engineering
- Portfolio Prediction