# RecoverIQ - AI Revenue Recovery Orchestrator

RecoverIQ detects revenue at risk, diagnoses the likely cause, predicts recovery probability, determines the appropriate recovery intervention, validates that intervention against merchant-defined policies and guardrails, executes an allowed recovery workflow, verifies the resulting payment outcome, and records the complete audit trail.

## Architecture

This project is structured as a monorepo using npm workspaces:

- `frontend`: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- `backend`: Node.js, Express, TypeScript, Drizzle ORM.
- `ml`: Python, FastAPI, scikit-learn, pandas.
- `shared`: Shared TypeScript types and enums.

## Prerequisites

- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (or Supabase)

## Environment Variables

Copy `.env.example` to `.env` in the root directory (or in respective workspaces) and update the values.
- For backend, create `backend/.env` containing `DATABASE_URL` for Drizzle to connect.

## Installation & Setup

1. **Install NPM dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database:**
   ```bash
   cd backend
   npm run db:generate
   npm run db:push
   ```
   *(Ensure your Supabase/PostgreSQL is running and `DATABASE_URL` is set in `backend/.env`)*

3. **Setup ML Service:**
   ```bash
   cd ml
   python -m venv venv
   # Activate venv:
   # Windows: .\venv\Scripts\activate
   # Mac/Linux: source venv/bin/activate
   pip install -r requirements.txt
   ```

## Running the Project Locally

Run backend and frontend from the root directory:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

Run ML service (in a separate terminal):
```bash
# Terminal 3: ML Service
cd ml
.\venv\Scripts\activate  # or source venv/bin/activate
uvicorn main:app --reload --port 8000
```

## Work in Progress
This is Stage 1 foundation. The ML logic, Razorpay APIs, and actual AI implementations are stubbed and will be implemented in the next stage.
