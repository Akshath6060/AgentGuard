# AgentGuard

AgentGuard is an AI payment-governance console for monitoring autonomous agents, enforcing spending policies, reviewing risky transactions, and maintaining an auditable decision history.

The repository currently contains a functional React demonstration powered by mock data. A production backend is planned; its domain model, API surface, security requirements, and delivery phases are documented in [FRONTEND_BACKEND_AUDIT.md](./FRONTEND_BACKEND_AUDIT.md).

## Current status

| Area | Status |
| --- | --- |
| Frontend | React/Vite demo implemented |
| Backend | Planned, not yet implemented |
| Authentication | Simulated in the frontend |
| Data persistence | Mock in-memory data |
| Payment integrations | UI demonstration only |

> This project is currently a prototype. Do not use it to authorize or process real payments.

## Features

- Overview dashboard with spend, risk, and activity metrics
- Agent creation, configuration, limits, and permissions
- Transaction monitoring and detailed risk analysis
- Human approval and rejection workflow
- Policy creation and management
- Risk center and audit-log views
- Developer API-key and integration screens
- Workspace and payment-provider settings

## Technology

- React 19
- Vite 8
- JavaScript and JSX
- Oxlint
- Plain React state and mock data

## Repository structure

```text
AgentGuard/
├── frontend/                    React application
│   ├── public/                  Static assets
│   ├── src/
│   │   ├── assets/              Frontend assets
│   │   ├── components/          Shared UI components
│   │   ├── pages/               Application screens
│   │   ├── App.jsx              Root state and page flow
│   │   ├── data.js              Mock application data
│   │   ├── index.css            Global styling
│   │   └── main.jsx             Application entry point
│   ├── AgentGuard dashboard mockups/
│   ├── package.json
│   └── vite.config.js
├── FRONTEND_BACKEND_AUDIT.md    Backend planning and API report
├── README.md
└── .gitignore
```

The future backend should live in a root-level `backend/` directory so frontend and backend code remain independently installable and deployable.

## Getting started

### Prerequisites

- Node.js
- npm

### Install and run

```bash
git clone <repository-url>
cd AgentGuard/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The demo accepts any sign-in credentials. The two-factor code is prefilled, and either sample workspace can be selected.

## Available scripts

Run these commands from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `frontend/dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint checks |

## Environment variables

No environment variables are required for the current frontend demo.

When backend configuration is introduced, commit only example files such as `.env.example`. Real `.env` files, credentials, API keys, local databases, dependencies, caches, and build output are excluded by `.gitignore`.

## Backend planning

The backend planning report covers:

- Recommended domain models
- Transaction, decision, approval, and payment states
- Proposed REST API endpoints
- Authorization response contracts
- Authentication and workspace isolation
- Security, compliance, idempotency, and audit requirements
- A phased implementation plan and acceptance scenarios

Read [FRONTEND_BACKEND_AUDIT.md](./FRONTEND_BACKEND_AUDIT.md) before implementing the backend.

## Before committing

```bash
cd frontend
npm run lint
npm run build
```

Generated dependencies and build artifacts are ignored and should not be committed.

## Design source

The original dashboard design canvas and support files are stored in `frontend/AgentGuard dashboard mockups/`.
