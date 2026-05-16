# Telos AtomQuest

<div align="center">
  <img src="./logo-with-name.png" alt="Telos AtomQuest Logo" width="400" />
  <br/><br/>
  <img src="./logo-mark.png" alt="Telos AtomQuest Logo Mark" width="80" />
</div>

Full-stack goal setting and performance tracking portal. Covers employee goal-sheet creation → manager approval with diff view → quarterly achievement check-ins → shared goals → notifications → admin controls → audit trail → escalation engine → email notifications.

---

## Setup

### Prerequisites

- Node.js 18+
- npm
- A Supabase Postgres instance
- A Firebase project with Email/Password auth enabled

### Environment Variables

**Backend `.env` (`Telos_Backend/.env`):**

```txt
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----PRIVATE KEY-----\n"

# Application
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@telos-atomquest.com

# Escalation Cron (optional)
ENABLE_ESCALATION_JOB=false

# Dev mode (optional — skip Firebase token verification)
SKIP_FIREBASE_AUTH=false
DEV_FIREBASE_UID=
DEV_FIREBASE_EMAIL=
DEV_FIREBASE_NAME=
```

**Frontend `.env` (`Telos_Frontend/.env`):**

```txt
VITE_API_URL=http://localhost:3000/api/v1
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### Install & Run

```powershell
# Backend (terminal 1)
cd Telos_Backend
npm install
npx.cmd prisma generate
npm run dev                    # http://localhost:3000

# Frontend (terminal 2)
cd Telos_Frontend
npm install
npm run dev                    # http://localhost:5173/login

# Seed demo data
cd Telos_Backend
npm run seed:all
```

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Employee | employee@telos.demo | Demo@1234 |
| Manager | manager@telos.demo | Demo@1234 |
| Admin | admin@telos.demo | Demo@1234 |

### Verify

```powershell
cd Telos_Backend; npm test          # 14/14 unit tests
cd Telos_Frontend; npm run build    # production build — zero errors
```

---

## Features — Implementation Details

### 1. Authentication & Authorization

- Firebase Email/Password login on the frontend; Firebase Admin SDK verifies the ID token on every API request.
- Backend `authenticate` middleware decodes the Firebase token and fetches the corresponding app user from the database.
- `authorize` middleware enforces role-based access (`EMPLOYEE`, `MANAGER`, `ADMIN`) per route.
- Inactive users (`isActive = false`) are blocked at the middleware level.
- Role-based routing: Employee → `/goals`, Manager → `/manager/team`, Admin → `/admin`.

### 2. Employee Goal Sheet

**Lifecycle states:** `DRAFT` → `SUBMITTED` → `APPROVED` / `RETURNED` → (if unlocked) → `RETURNED` → resubmit cycle.

- Each employee has one active-cycle goal sheet. Created automatically when the employee opens the editor.
- Goals have: title, description, thrust area, unit of measurement (UoM), target value, weightage percentage, start/end dates, and optional quarterly milestone targets.
- **Validation rules** (enforced by Zod schemas + backend controller):
  - At least 1 goal per sheet (before submission)
  - Maximum 8 goals per cycle
  - Minimum 10% weightage per goal
  - Total weightage must equal exactly 100% before submission
- **Auto-save**: Draft state backed up to localStorage every 30 seconds and on blur.
- **Locking**: Submitted goals are locked server-side. The `checkNotLocked` middleware blocks PATCH/DELETE on locked goals. Approved goals are permanently locked.
- **Diff endpoint**: `GET /api/v1/goal-sheets/:id/diff` returns structured before/after comparisons per goal from `AuditLog` entries (`GOAL_EDITED_POST_LOCK`).

### 3. Manager Approval

- Managers see all direct reports with their sheet status.
- **Inline editing**: Managers can adjust goal targets and weightage while a sheet is in SUBMITTED state.
- **Diff view**: Every edited goal is highlighted with yellow background; original values shown with strikethrough. Collapsible "Show diff view" panel.
- **Approve**: Sets sheet to APPROVED, locks all goals, notifies employee, sends email.
- **Return**: Sets sheet to RETURNED, requires reason (min 20 chars), notifies employee, sends email.
- All approval actions create `Notification` records and call `sendNotificationEmail` via Resend.

### 4. Quarterly Check-ins

- Employee and manager check-in pages support Q1, Q2, Q3, Q4 with quarter selector.
- **Employee**: Saves actual achievement value, actual date, completion status, and notes per goal.
- **Shared goals**: "Awaiting owner update" indicator shown when the primary owner hasn't entered data. Shared actual data syncs across linked sheets.
- **Manager**: Views planned vs actual data, adds manager comments, marks check-in complete.
- **Score computation** (server-side `score.service.js` + frontend mirror `scoreComputer.js`):

| UoM Type | Rule | Cap |
|---|---|---|
| `NUMERIC_MIN` | Higher = better → `actual / target` | 100% |
| `NUMERIC_MAX` | Lower = better → `target / actual` | 100% |
| `PERCENTAGE_MIN` | Higher = better → `actual / target` | 100% |
| `PERCENTAGE_MAX` | Lower = better → `target / actual` | 100% |
| `TIMELINE` | On-time = 100%, late = 0% | — |
| `ZERO` | Zero = 100%, anything else = 0% | — |

Edge cases: division-by-zero returns `null` (displayed as "N/A"), null actuals return `null`, scores capped at 100%.

### 5. Shared Goals

- Created by managers/admins. Recipients can be active EMPLOYEE and MANAGER users.
- Admins can push to all active non-admin users; managers push to direct reports.
- Creates linked `Goal` rows in recipient active-cycle goal sheets with `isShared = true` and `parentGoalId`.
- **Restrictions**: Recipients cannot delete shared goals. Shared title/target are read-only. Weightage is editable.
- `primaryOwnerId` determines whose actual achievement syncs to all linked check-in records.
- Push creates in-app notifications + Resend email for each recipient.

### 6. Notifications

- Backend: `Notification` model with `userId`, `message`, `link`, `isRead`.
- API: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`.
- Frontend: Navbar bell shows unread count badge. NotificationDrawer polls every 30s. Click navigates + marks read. Auto-dismiss after 4s.
- Notifications created for: sheet submit/approve/return, goal unlock, check-in window open, shared goal push, escalation, manager check-in complete.

### 7. Email Notifications

**8 event types with HTML email templates:**

| Event | Trigger | Recipient |
|---|---|---|
| `GOAL_SHEET_SUBMITTED` | Employee submits sheet | Manager |
| `GOAL_SHEET_APPROVED` | Manager approves | Employee |
| `GOAL_SHEET_RETURNED` | Manager returns | Employee |
| `GOAL_SHEET_UNLOCKED` | Admin unlocks sheet/goal | Employee |
| `SHARED_GOAL_PUSHED` | Shared goal created | Each recipient |
| `CHECKIN_WINDOW_OPENED` | Window force-opened | All active users |
| `CHECKIN_COMPLETED` | Manager marks check-in done | Employee |
| `ESCALATION` | Escalation triggered | Responsible user |

**Delivery flow:**
1. `sendNotificationEmail({ to: user.email, eventType, data })` is called
2. Function looks up user by `email` — if `notificationEmail` is set, that address is used instead
3. Resend API is called with the resolved `to` address
4. Every attempt (success or failure) is persisted to `EmailLog` with full HTML, status, and error
5. If Resend is not configured, the send is skipped but the log entry is still created

**For judges:** Since demo accounts use `@telos.demo` (non-deliverable), two mechanisms exist:
- **`notificationEmail` override**: Admin sets a separate delivery email per user in User Management. Login identity unchanged.
- **Email Log viewer**: Admin → `/admin/email-logs` shows every sent email with expandable HTML preview, regardless of delivery success.

### 8. Admin User Management

- Create users individually (Firebase Auth + DB record).
- **Bulk CSV import**: Upload or paste CSV with columns `name, email, password, role, department`. Parsed via `xlsx`. Creates Firebase accounts + DB records. Audit-logged.
- Edit roles, activation status, reporting manager, department.
- **`notificationEmail` field**: Separate from the login email. Set a real email for notification delivery. Login always uses the original Firebase email — no authentication impact.

### 9. Cycle & Window Management

- Cycle has name and active flag. Only one active cycle at a time.
- Each cycle has windows for: `GOAL_SETTING`, `Q1_CHECKIN`, `Q2_CHECKIN`, `Q3_CHECKIN`, `Q4_CHECKIN`.
- Windows have `opensAt`, `closesAt`, and status (`OPEN`, `CLOSED`, `FORCE_OPEN`, `FORCE_CLOSED`).
- Admins can force open/close any window. Force actions use confirmation modals.
- Archives hide past cycles from all default views. "Show archived" toggle reveals them.
- Opening a check-in window triggers bulk notifications + emails to all active users.

### 10. Goal Unlock

- **Sheet unlock**: `PATCH /api/v1/goal-sheets/:id/unlock` — unlocks all goals, sets sheet to RETURNED.
- **Per-goal unlock**: `PATCH /api/v1/goals/:goalId/unlock` — unlocks a single goal, sets sheet to RETURNED.
- Both require a reason. Creates audit log entry. Notifies employee via in-app notification + email.

### 11. Reporting & Analytics

- **Achievement report**: Supports JSON, CSV, XLSX. Filters: cycleId, quarter, managerId, employeeId, status, department, employeeSearch.
- **Completion dashboard**: Quarter selector, per-employee Q1–Q4 completion rows.
- **Admin command center KPI**: Derived from currently open / latest check-in window.
- **Analytics page**: Overview cards, quarter trend chart (Recharts), goal distribution, manager effectiveness. Export controls.

### 12. Audit Trail

- Backend `auditLogger` middleware captures post-edit changes on goal modifications.
- Admin page at `/admin/audit` with filters: action type, date range.
- Key actions logged: `USER_CREATED`, `USER_ROLE_CHANGED`, `USER_ACTIVATION_CHANGED`, `GOAL_EDITED_POST_LOCK`, `GOAL_UNLOCKED`, `GOAL_SHEET_UNLOCKED`, `CYCLE_WINDOW_UPDATED`, `THRUST_AREA_CREATED`, `THRUST_AREA_UPDATED`, `ESCALATION_RULE_CREATED`, `ESCALATION_RESOLVED`, `BULK_USER_IMPORT`, `USER_UPDATED`.
- Each entry captures: `userId`, `action`, `fieldChanged`, `oldValue`, `newValue`, `reason`, `goalId`, `createdAt`.

### 13. Escalation Engine

- Configurable rules per escalation pattern:
  - Goal setting overdue (cycle NOT_STARTED)
  - Approval overdue (sheet SUBMITTED beyond threshold)
  - Employee check-in overdue
  - Manager check-in review overdue
- Rule fields: `name`, `pattern`, `phase`, `triggerAfterDays`, `isActive`.
- Manual run via admin panel or optional `node-cron` job (`ENABLE_ESCALATION_JOB=true`).
- States: `PENDING` → (auto) `ESCALATED` → (admin) `RESOLVED`.
- Escalations create in-app notifications + Resend emails with escalation details.

---

## Middleware Pipeline

Every route passes through this chain:

```
authenticate (Firebase token → app user lookup)
    → authorize (role check against allowedRoles)
        → validate (Zod body/params/query parsing)
            → checkNotLocked (PATCH/DELETE goal guard)
                → auditLogger (post-edit change capture)
                    → controller (business logic)
                        → errorHandler (Prisma error transformation)
```

- `checkNotLocked`: Blocks edits on locked goals. Returns 403 with descriptive message.
- `auditLogger`: On goal PATCH/PUT, computes `oldValue` vs `newValue` for changed fields and writes `AuditLog` records.
- `errorHandler`: Transforms Prisma errors (`P2002`, `P2025`, `P2003`, `P2014`, `P2000`) into user-friendly messages. Raw error codes never reach the client.

---

## API Routes

All mounted under `/api/v1`:

| Route | Key Endpoints |
|---|---|
| `/health` | Health check |
| `/auth` | `POST /sync`, `GET /me`, `PATCH /me` |
| `/goals` | CRUD per goal, `PATCH /:id/unlock` |
| `/goal-sheets` | CRUD sheets, `POST /:id/submit`, `POST /:id/approve`, `POST /:id/return`, `PATCH /:id/unlock`, `GET /:id/diff` |
| `/checkins` | CRUD check-in records, `PATCH /:id/complete` (manager) |
| `/users` | `GET /` (list), `POST /` (create), `PATCH /:id` (update), `POST /import` (CSV) |
| `/cycles` | CRUD cycles, `PATCH /:id/archive`, window management |
| `/notifications` | `GET /`, `PATCH /:id/read`, `PATCH /read-all` |
| `/reports` | Achievement report with filters |
| `/shared-goals` | CRUD shared goals, push to recipients |
| `/admin` | Thrust areas, escalation rules/run, email logs |

---

## Database Schema (13 models)

| Model | Key Fields | Relationships |
|---|---|---|
| `User` | `email`, `firebaseUid`, `role`, `notificationEmail?`, `reportingManagerId?` | Self-referencing for hierarchy |
| `Cycle` | `name`, `isActive`, `isArchived` | → `CycleWindow`, `GoalSheet` |
| `CycleWindow` | `phase`, `opensAt`, `closesAt`, `status` | → `Cycle` |
| `GoalSheet` | `status` (enum), `userId` + `cycleId` unique | → `User`, `Cycle`, `Goal` |
| `Goal` | `title`, `target`, `weightage`, `isLocked`, `isShared`, `q1Target`–`q4Target` | → `GoalSheet`, `CheckinRecord` |
| `SharedGoal` | `title`, `target`, `primaryOwnerId` | → `Goal` (via parentGoalId) |
| `CheckinRecord` | `actual`, `status`, `quarter`, `managerComment` | unique per `goalId` + `quarter` |
| `Notification` | `message`, `link`, `isRead` | → `User` |
| `AuditLog` | `action`, `fieldChanged`, `oldValue`, `newValue`, `reason` | → `User`, `Goal` (optional) |
| `EmailLog` | `to`, `subject`, `html`, `eventType`, `success`, `error` | Standalone audit table |
| `ThrustArea` | `name`, `isDefault`, `isActive` | Used in goal creation |
| `EscalationRule` | `name`, `pattern`, `phase`, `triggerAfterDays`, `isActive` | → `Escalation` |
| `Escalation` | `status` (PENDING → ESCALATED → RESOLVED) | → `User`, `EscalationRule` |

---

## Architecture

### Backend Stack

| Component | Technology |
|---|---|
| Runtime | Node.js + Express |
| ORM | Prisma |
| Database | Supabase Postgres |
| Auth | Firebase Admin SDK |
| Email | Resend |
| Validation | Zod |
| Scheduling | node-cron |
| Export | xlsx |
| Security | Helmet, CORS, express-rate-limit |

### Frontend Stack

| Component | Technology |
|---|---|
| UI | React 19 |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 (`@theme` tokens) |
| Animation | Framer Motion |
| Auth | Firebase Client SDK |
| HTTP | Axios |
| Charts | Recharts (lazy-loaded) |
| Icons | Heroicons |
| Toasts | react-hot-toast |

---

## Tests

```powershell
cd Telos_Backend
npm test
```

14 unit tests covering:
- Goal validation rules (weightage, count, min-per-goal)
- Score computation for all 6 UoM types including edge cases (zero target, null actual)
- Report filter parsing and SQL clause construction
- Completion summary aggregation

---

## Project Structure

```
Telos_Backend/
├── src/
│   ├── app.js                 # Express entry point
│   ├── config/                # firebase.js, prisma.js
│   ├── controllers/           # auth, goals, goalSheets, checkins, users, cycles,
│   │                          # notifications, reports, sharedGoals, admin
│   ├── jobs/                  # escalation cron job
│   ├── middleware/            # authenticate, authorize, validate, checkNotLocked,
│   │                          # auditLogger, errorHandler
│   ├── prisma/                # schema.prisma (13 models)
│   ├── routes/                # 11 route files
│   ├── services/              # score, goalValidation, notification, email (8 templates),
│   │                          # escalation, reportFilters
│   └── utils/                 # constants, cycleHelper, schemas, errors, response
├── prisma/                    # seed.js, seed-users.js
├── scripts/                   # setup-db.js
└── test/                      # business-rules.test.js
```

---

## Known Engineering Notes

- Prisma `package.json#prisma` config is deprecated in Prisma 7 — should migrate to `prisma.config.ts`.
- Database synced via `prisma db push`. For production, baseline the schema first with Prisma Migrate.
- All Prisma errors transformed to user-friendly messages — raw `P2002`-style codes never leak to clients.
- Frontend code-splitting reduces initial JS by 51% (1,131 kB → 551 kB). Recharts (390 kB) stays on AnalyticsPage only.
- `notificationEmail` field is validated with `.email()` in Zod schema — must be a valid email or null.
