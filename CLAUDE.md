# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Samaanai is a personal finance and nutrition tracking application with:
- **Backend**: Django REST Framework API deployed on Google Cloud Run
- **Frontend**: React (Vite) SPA with Material UI
- **Database**: PostgreSQL
- **Auth**: JWT via djangorestframework-simplejwt + Google OAuth via social-auth-app-django
- **Finance Integration**: Plaid API for bank account/transaction/investment data

## Common Commands

### Development (Docker)
```bash
# Start all services
docker-compose up --build

# HTTPS development (required for OAuth with Chase/other banks)
./scripts/dev-https.sh
```

### Development (Manual)
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver

# Frontend
cd frontend
npm install
npm start  # runs Vite dev server on localhost:3000
```

### Testing
```bash
# Backend (from backend/)
pytest                           # run all tests with coverage
pytest apps/users/tests/         # run specific app tests
pytest -k "test_name"            # run specific test

# Frontend (from frontend/)
npm test                         # run Jest tests
npm run test:coverage            # with coverage

# Cypress E2E (from frontend/)
npx cypress open
```

### Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## Architecture

### Backend Structure (`backend/`)
```
samaanai/          # Django project settings
  settings.py      # Config with env-based switching (development/production)
  urls.py          # Root URL routing
apps/
  users/           # User auth, Google OAuth, JWT tokens
    pipeline.py    # Social auth pipeline for OAuth token generation
    views.py       # Registration, login, profile, WebAuthn
  finance/         # Plaid integration, transactions, accounts, holdings
    services.py    # Plaid API service layer
    views.py       # API endpoints (dashboard, accounts, transactions, holdings)
    models.py      # Institution, Account, Transaction, Holding, etc.
    fields.py      # Encrypted field for Plaid access tokens
  notifications/   # Email notifications via SendGrid
```

### Frontend Structure (`frontend/src/`)
```
App.jsx            # Main routing and auth context
apps/
  finance/
    components/    # Finance UI components (Dashboard, TransactionList, etc.)
    pages/         # Page-level components
    services/      # API client functions
common/            # Shared utilities and components
pages/             # Auth pages (Login, Register, etc.)
```

### Key Integration Points
- API base URL: `VITE_API_URL` env var (defaults to `http://localhost:8000`)
- Auth flow: JWT tokens stored in localStorage, auto-refresh on 401
- Plaid Link: Frontend initiates link, backend exchanges public_token for access_token
- Plaid access tokens are encrypted at rest using `PLAID_ENCRYPTION_KEY` (Fernet)

## Environment Configuration

Key environment variables (see `env.template` for full list):
- `SECRET_KEY`, `DB_PASSWORD` - Required for all environments
- `PLAID_CLIENT_ID`, `PLAID_SECRET_SANDBOX`, `PLAID_ENV` - Plaid integration
- `PLAID_ENCRYPTION_KEY` - Fernet key for encrypting Plaid tokens (required in production)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `SENDGRID_API_KEY` - Email notifications
- `ENVIRONMENT` - `development` or `production`

## API Endpoints

- Auth: `/api/users/`, `/api/token/`, `/api/auth/social/`
- Finance: `/api/finance/dashboard/`, `/api/finance/accounts/`, `/api/finance/transactions/`, `/api/finance/holdings/`
- Notifications: `/api/notifications/`
- Health: `/health/`, `/ping/`

Load up context prompt:
take a look at the app and architecture. Understand deeply how it works inside and out. Ask me any questions if there are things you don't understand. This will be the basis for the rest of our conversation.

Tool use summaries:
After completing a task that involves tool use, provide a quick summary of the work you've done

Adjust eagerness down:
Do not jump into implementation or change files unless clearly instructed to make changed. When the user's intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action. Only proceed with edits, modifications, or implementations when the user explicitly requests them.

Adjust eagerness up:
By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing. Try to infer the user's intent about whether a tool call (e.g. file edit or read) is intended or not, and act accordingly.

Use parallel tool calls:
If you intend to call multiple tools and there are no dependencies
between the tool calls, make all of the independent tool calls in
parallel. Prioritize calling tools simultaneously whenever the
actions can be done in parallel rather than sequentially. For
example, when reading 3 files, run 3 tool calls in parallel to read
all 3 files into context at the same time. Maximize use of parallel
tool calls where possible to increase speed and efficiency.
However, if some tool calls depend on previous calls to inform
dependent values like the parameters, do not call these tools in
parallel and instead call them sequentially. Never use placeholders
or guess missing parameters in tool calls.

Reduce hallucinations:
Never speculate about code you have not opened. If the user
references a specific file, you MUST read the file before
answering. Make sure to investigate and read relevant files BEFORE
answering questions about the codebase. Never make any claims about
code before investigating unless you are certain of the correct
answer - give grounded and hallucination-free answers2