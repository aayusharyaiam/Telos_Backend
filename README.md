# Telos AtomQuest

Full-stack goal setting and performance tracking portal. Employee goal-sheet creation → manager approval → quarterly check-ins → shared goals → notifications → admin controls → audit logs → escalations.

## Quick Start

### 1. Environment

**Backend `.env`:** All values provided in the submission. Key variables:

```txt
DATABASE_URL, DIRECT_URL          # Supabase Postgres
FIREBASE_PROJECT_ID, *_EMAIL, *_PRIVATE_KEY  # Firebase Admin
RESEND_API_KEY, RESEND_FROM_EMAIL # Configured — emails active
FRONTEND_URL=http://localhost:5173
PORT=3000
```

**Frontend `.env`:** Firebase config values provided in the submission.

### 2. Install & Run

```powershell
# Backend
cd Telos_Backend
npm install
npx.cmd prisma generate
npm run dev                    # http://localhost:3000

# Frontend (separate terminal)
cd Telos_Frontend
npm install
npm run dev                    # http://localhost:5173/login
```

### 3. Seed Demo Data

```powershell
cd Telos_Backend
npm run seed:all
```

### 4. Demo Accounts

| Role | Email | Password |
|---|---|---|
| Employee | employee@telos.demo | Demo@1234 |
| Manager | manager@telos.demo | Demo@1234 |
| Admin | admin@telos.demo | Demo@1234 |

### 5. Verify

```powershell
cd Telos_Backend; npm test     # 14/14 unit tests
cd Telos_Frontend; npm run build   # production build
```

---

## Judge Guide — What to Show

### Email Notifications (Key Demo Feature)

All demo accounts use `@telos.demo` — not real inboxes. Two features make email testable:

1. **Notification Email Override** — Admin can set a separate `notificationEmail` on any user (e.g. judge's real email) without changing their login credentials. Go to **Admin → User Management** → click the notification email cell → type a real address.
2. **Email Log Viewer** — Every email send attempt is stored in the database regardless of delivery. Go to **Admin → Email Logs** (`/admin/email-logs`) to see:
   - Full recipient, subject, event type
   - **Expandable HTML preview** of the exact email that would be sent
   - Delivery success/failure status with error messages
   - All 8 event types: `GOAL_SHEET_SUBMITTED`, `GOAL_SHEET_APPROVED`, `GOAL_SHEET_RETURNED`, `GOAL_SHEET_UNLOCKED`, `SHARED_GOAL_PUSHED`, `CHECKIN_WINDOW_OPENED`, `CHECKIN_COMPLETED`, `ESCALATION`

**To demonstrate:** Do any action (submit sheet → manager approves → admin unlocks) then immediately check `/admin/email-logs` to see the generated emails.

### Core Flows

| Flow | Steps |
|---|---|
| **Goal Sheet** | Employee creates sheet → adds goals (exactly 100% weightage) → submits → manager reviews with diff view → approves/returns → admin can unlock |
| **Check-ins** | Admin opens check-in window → employee enters actuals → manager adds comment + marks complete |
| **Shared Goals** | Manager creates shared goal → selects recipients → primary owner enters actual → syncs to all linked sheets |
| **Admin Ops** | User CRUD + CSV bulk import, cycle window force open/close, escalation rules, audit trail with filters, analytics export (CSV/XLSX) |

---

## Architecture

### Stack

- **Backend:** Node.js / Express, Prisma ORM, Supabase Postgres, Firebase Admin, Resend (email), node-cron, Zod, xlsx
- **Frontend:** React 19 / Vite 8 / Tailwind CSS v4 / Framer Motion / Firebase Auth / Recharts / react-hot-toast

### Database (13 models)

`User` (with `notificationEmail` field), `Cycle`, `CycleWindow`, `GoalSheet`, `Goal`, `SharedGoal`, `CheckinRecord`, `Notification`, `AuditLog`, `EmailLog`, `ThrustArea`, `EscalationRule`, `Escalation`

### API Routes (`/api/v1`)

`/auth`, `/goals`, `/goal-sheets`, `/checkins`, `/users`, `/cycles`, `/notifications`, `/reports`, `/shared-goals`, `/admin` (includes `/admin/email-logs` for email audit)

### Backend Routes

```
/login                              # Login
/goals                              # Employee dashboard
/goals/sheet/:sheetId               # Goal sheet editor
/goals/sheet/:sheetId/checkin       # Quarterly check-in
/manager/team                       # Team overview
/manager/approve/:sheetId           # Approval with diff view
/manager/checkin/:employeeId        # Manager check-in
/manager/shared-goals               # Shared goals push
/admin                              # Command center
/admin/users                        # User management
/admin/cycles                       # Cycle/window config
/admin/audit                        # Audit trail
/admin/completion                   # Completion dashboard
/admin/analytics                    # Analytics & export
/admin/thrust-areas                 # Thrust areas
/admin/escalations                  # Escalation rules
/admin/unlock                       # Goal/sheet unlock
/admin/email-logs                   # Email audit viewer
/settings                           # Profile & settings
```

### Middleware (per-route chain)

`authenticate` (Firebase token) → `authorize` (role check) → `validate` (Zod) → `checkNotLocked` (goal guard) → `auditLogger` (change capture) → controller

---

## Key Design Decisions

- **notificationEmail** is a separate DB field — it **does not** affect Firebase login. Users always authenticate with their original email.
- **Email Logs** persist every send attempt (success + failure) so judges can verify email content even when demo addresses are unreachable.
- All 18 frontend pages are code-split via `React.lazy()` — initial JS reduced from 1,131 kB to 551 kB (51%).
- Prisma errors are transformed to readable messages via `errorHandler.js` — raw `P2002` codes never reach the client.
- Tests: 14/14 passing (validation, score computation, report filters, completion summary).
