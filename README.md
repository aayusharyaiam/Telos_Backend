# Telos AtomQuest — Backend

Express REST API with Prisma ORM on PostgreSQL (Supabase). See [Full Documentation](../Telos_AtomQuest_Documentation.md) for complete features.

## Quick Start

```powershell
npm install
npx prisma generate
npm run dev                    # http://localhost:3000
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@telos.demo | Demo@1234 |
| Manager | manager@telos.demo | Demo@1234 |
| Admin | admin@telos.demo | Demo@1234 |

## Tests

```powershell
npm test    # 14 unit tests
```

## Docker

```powershell
docker compose up -d    # http://localhost:3000/health
```

## Key Endpoints

| Route | Purpose |
|-------|---------|
| `/api/v1/auth` | Sync, getMe, updateMe |
| `/api/v1/goal-sheets` | CRUD + submit/approve/return/unlock/diff |
| `/api/v1/checkins` | CRUD + complete + evidence upload |
| `/api/v1/reports` | Analytics, achievement reports (JSON/CSV/XLSX) |
| `/api/v1/shared-goals` | CRUD + push to recipients |
| `/api/v1/admin` | Thrust areas, escalation rules, email logs |

## Middleware Chain

```
authenticate → authorize → validate → checkNotLocked → auditLogger → controller → errorHandler
```

## Stack

- Node.js + Express
- Prisma + Supabase Postgres
- Firebase Admin SDK (auth)
- Resend (email)
- Zod (validation)
- xlsx (export)
- node-cron (escalations)
- Teams webhook (notifications)

See [Full Documentation](../Telos_AtomQuest_Documentation.md) for architecture, schema, and feature details.