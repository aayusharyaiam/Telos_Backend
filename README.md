# Telos AtomQuest

Telos AtomQuest is a full-stack goal setting and performance tracking portal. It covers the complete flow from Firebase login, employee goal-sheet creation, manager approval, quarterly achievement check-ins, shared goals, notifications, reporting, admin controls, audit logs, and escalations.

## Project Structure

```txt
|-- Telos_Backend
|   |-- src
|   |   |-- app.js                    # Express entry point
|   |   |-- config
|   |   |   |-- firebase.js           # Firebase Admin init
|   |   |   |-- prisma.js             # PrismaClient singleton
|   |   |-- controllers               # Request handlers
|   |   |-- jobs                      # node-cron escalation job
|   |   |-- middleware
|   |   |   |-- authenticate.js       # Firebase token verification
|   |   |   |-- authorize.js          # Role-based access control
|   |   |   |-- validate.js           # Zod input validation wrapper
|   |   |   |-- checkNotLocked.js     # Locked-goal guard
|   |   |   |-- auditLogger.js        # Post-edit change detection
|   |   |   |-- errorHandler.js       # Global error handler
|   |   |-- prisma
|   |   |   |-- schema.prisma         # 12 models, 8 enums
|   |   |   |-- migrations
|   |   |-- routes                    # 11 route groups
|   |   |-- services
|   |   |   |-- score.service.js
|   |   |   |-- goalValidation.service.js
|   |   |   |-- notification.service.js
|   |   |   |-- email.service.js
|   |   |   |-- escalation.service.js
|   |   |   |-- reportFilters.service.js
|   |   |-- utils
|   |   |   |-- constants.js          # Shared enums/constants
|   |   |   |-- cycleHelper.js        # Window status helpers
|   |   |   |-- schemas.js            # Zod validation schemas
|   |   |   |-- errors.js             # Custom error classes
|   |   |   |-- response.js           # Response envelope helpers
|   |-- prisma
|   |   |-- seed.js
|   |   |-- seed-users.js
|   |-- scripts
|   |   |-- setup-db.js
|   |-- test
|   |   |-- business-rules.test.js    # 18 unit tests
|   |-- package.json
|-- Telos_Frontend
|   |-- src
|   |   |-- api                       # 11 API wrappers
|   |   |-- components
|   |   |   |-- layout
|   |   |   |   |-- AppShell.jsx
|   |   |   |   |-- Navbar.jsx
|   |   |   |   |-- Sidebar.jsx
|   |   |   |   |-- NotificationDrawer.jsx
|   |   |   |   |-- PageHeader.jsx
|   |   |   |-- goals
|   |   |   |   |-- WeightageBar.jsx
|   |   |   |   |-- GoalCard.jsx
|   |   |   |   |-- ProgressScoreBadge.jsx
|   |   |   |-- shared
|   |   |       |-- Badge.jsx
|   |   |       |-- ConfirmModal.jsx
|   |   |       |-- Modal.jsx
|   |   |       |-- Table.jsx
|   |   |       |-- EmptyState.jsx
|   |   |       |-- FullScreenLoader.jsx
|   |   |       |-- StatCard.jsx
|   |   |-- context
|   |   |-- firebase
|   |   |-- hooks
|   |   |   |-- useAuth.js
|   |   |   |-- useGoalSheet.js
|   |   |   |-- useCurrentCycle.js
|   |   |   |-- useWindowStatus.js
|   |   |-- pages
|   |   |   |-- auth
|   |   |   |-- employee
|   |   |   |-- manager
|   |   |   |-- admin (9 pages)
|   |   |   |-- shared
|   |   |       |-- SettingsPage.jsx
|   |   |-- routes
|   |   |-- utils
|   |-- package.json
|-- prd.md
|-- trd.md
|-- README.md
```

## Tech Stack

### Backend

- Node.js with Express
- Prisma ORM
- Supabase Postgres
- Firebase Admin for token verification and user creation
- Resend for email notifications
- node-cron for optional scheduled escalation checks
- xlsx for Excel export
- Zod for input validation
- Helmet, CORS, and express-rate-limit

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS v4 (CSS-based theme in `index.css`)
- Firebase Email/Password Auth
- Axios API client
- React Hook Form
- react-hot-toast
- Heroicons
- Recharts
- date-fns

## Main Capabilities

### Authentication and Routing

- Firebase Email/Password login.
- Backend verifies Firebase ID tokens through Firebase Admin.
- App user is synced from Supabase through the auth API.
- Role-based routing:
  - `EMPLOYEE` -> `/goals`
  - `MANAGER` -> `/manager/team`
  - `ADMIN` -> `/admin`
- Inactive users are blocked by backend auth middleware.

### Employee Goal Sheet Lifecycle

- Employee can create an active-cycle goal sheet.
- Employee can add, edit, and delete personal goals while the sheet is `DRAFT` or `RETURNED`.
- Goal validation (enforced by Zod schemas + backend):
  - At least one goal before submission.
  - Maximum 8 goals per cycle.
  - Minimum 10 percent weightage per goal.
  - Total weightage must equal exactly 100 percent before submission.
  - Title, thrust area, UoM, target, and date values are validated server-side.
- Weightage bar shows real-time health (green at 100%, red if over).
- Weightage >90% triggers a warning: "leaves very little room for other goals".
- Auto-save: draft form backed up to localStorage every 30s and on blur.
- Employee can submit goal sheet for approval.
- Submitted sheets cannot be edited by employee until returned.
- Approved goals are locked (checked by `checkNotLocked` middleware).

### Manager Approval Workflow

- Managers see all direct reports, including employees without a goal sheet.
- Direct report statuses:
  - `Not Started`
  - `Draft`
  - `Submitted`
  - `Approved`
  - `Returned`
- Managers can review submitted sheets.
- Managers can adjust goal weightage while a sheet is submitted.
- **Diff view**: edited goals are highlighted with yellow background; original values shown with strikethrough; collapsible "Show diff view" panel.
- Managers can approve submitted sheets.
- Managers can return submitted sheets with a required reason (min 20 chars).
- Approve and return actions use confirmation modals.
- Notifications and emails are created for submit, approve, and return flows.

### Quarterly Check-ins

- Employee and manager check-in pages support `Q1`, `Q2`, `Q3`, and `Q4`.
- Quarter selectors reload quarter-specific records.
- Check-in editability respects cycle-window status.
- Employees can save actual achievement or actual date, status, and notes.
- **"Awaiting owner update" indicator** shown for shared goals whose primary owner hasn't entered data.
- Managers can add comments and mark check-ins complete.
- Shared-goal actuals sync into check-in views.
- Progress score is computed server-side.

### Score Computation

Backend score logic lives in:

```txt
Telos_Backend/src/services/score.service.js
```

Frontend mirror (same formulas):

```txt
Telos_Frontend/src/utils/scoreComputer.js
```

Supported UoM types:

- `NUMERIC_MIN` — Higher is better, capped at 100%
- `NUMERIC_MAX` — Lower is better, capped at 100%
- `PERCENTAGE_MIN` — Higher is better, capped at 100%
- `PERCENTAGE_MAX` — Lower is better, capped at 100%
- `TIMELINE` — On-time = 100%, late = 0%
- `ZERO` — Zero = 100%, anything else = 0%

Edge cases handled:
- Division-by-zero guard returns `null` (displayed as "N/A")
- Null actuals return `null` (displayed as "N/A")
- Scores capped at 100 for all numeric types

### Shared Goals

- Managers and admins can create shared goals.
- Recipients can include active `EMPLOYEE` and `MANAGER` users.
- Admins can push shared goals to all active non-admin users.
- Managers can push shared goals to their direct reports.
- A shared goal creates linked goal rows in recipient active-cycle goal sheets.
- Shared linked goals show a `Shared` badge.
- Employees cannot delete shared linked goals.
- Employees can rebalance shared goal weightage.
- Shared target data is read-only for employees.
- Shared goals support a persisted `primaryOwnerId`.
- The UI allows primary owner selection from selected recipients.
- Shared actual updates are quarter-aware and upsert linked check-in records for the selected quarter.
- Shared actuals and scores appear in check-in views and exports.
- Shared goal pushes create in-app notifications and Resend emails when email is configured.

### Notifications

- Notification drawer extracted as a standalone `NotificationDrawer` component.
- Navbar bell shows unread count badge.
- Drawer polls every 30 seconds while logged in.
- Notifications list real backend records.
- Mark all read supported.
- Clicking a notification with a link marks it read and navigates to the linked page.
- Routes: `GET /api/v1/notifications`, `PATCH /:id/read`, `PATCH /read-all`

### Admin User Management

- Admins can view users from Supabase.
- Admins can create users in Firebase and Supabase.
- Admins can update roles.
- Admins can activate and deactivate users.
- Activate/deactivate uses confirmation modal.
- User creation and updates create audit logs.

### Cycle and Window Management

- Admins can view the active cycle and its windows.
- Admins can force open or force close:
  - Goal Setting
  - Q1 Check-in through Q4 Check-in
- Force open/close uses confirmation modal.
- Opening a check-in window creates in-app notifications and sends emails when Resend is configured.
- Employee dashboard shows an open-check-in banner with deadline and deep link.
- Helper functions in `src/utils/cycleHelper.js`: `getCurrentWindowStatus`, `getActiveCycle`, `getWindow`.

### Thrust Areas

- Admins can view, add, rename, activate, and deactivate thrust areas.
- Goal creation forms load active thrust areas from the backend.
- Frontend falls back to local constants if thrust area API loading fails.

### Goal Unlock

- Admins can unlock an entire approved goal sheet.
- Admins can unlock a specific locked goal.
- Per-goal unlock: `PATCH /api/v1/goals/:goalId/unlock`
- Sheet-level unlock: `PATCH /api/v1/goal-sheets/:id/unlock`
- Unlocks require a reason.
- Unlock actions create audit logs.
- Unlock actions notify the employee.
- Per-goal unlock returns the sheet to `RETURNED` so the employee can revise and resubmit.

### Reporting and Analytics

- Completion dashboard shows quarter selector and Q1-Q4 row statuses.
- Achievement report supports JSON, CSV, XLSX.
- Filters: `cycleId`, `quarter`, `managerId`, `employeeId`, `status`, `department`, `employeeSearch`.
- Managers scoped to their own team.
- Admins can see all organization data.
- Analytics page includes overview cards, quarter trend chart (Recharts), goal distribution chart, export controls.

### Audit Trail

- Admin audit page shows logs with action, field changed, old/new values, reason, user, goal, timestamp.
- Filters: action type, start date, end date.
- Key actions: `USER_CREATED`, `USER_ROLE_CHANGED`, `GOAL_UNLOCKED`, `CYCLE_WINDOW_UPDATED`, `THRUST_AREA_CREATED`, `ESCALATION_RESOLVED`, etc.

### Escalations

- Admins can create, enable, disable, and list escalation rules.
- Admins can run escalation checks manually.
- Optional cron job runs when `ENABLE_ESCALATION_JOB=true`.
- States: `PENDING` → `ESCALATED` → `RESOLVED`.
- Patterns: goal setting overdue, approval overdue, employee check-in overdue, manager check-in review overdue.
- Escalations create in-app notifications and Resend emails when configured.

### Settings / Profile

- Shared `/settings` page available to all roles.
- Displays: name, email, role, department, account status.

## Middleware Architecture

All routes are protected by a middleware chain:

1. **`authenticate`** — Verifies Firebase Bearer token, looks up user in DB.
2. **`authorize`** — Checks user role against allowed roles for the route.
3. **`validate`** (Zod) — Parses request body/params/query against schemas from `src/utils/schemas.js`.
4. **`checkNotLocked`** — Guards goal PATCH/DELETE routes against locked goals.
5. **`auditLogger`** — Captures post-edit changes on goal modifications.

## Routes

### Frontend Routes

```txt
/login                              # Login with demo credentials
/goals                              # Employee: My Goals dashboard
/goals/sheet/:sheetId               # Employee: Goal sheet editor
/goals/sheet/:sheetId/checkin       # Employee: Quarterly check-in
/manager/team                       # Manager: Team overview
/manager/approve/:sheetId           # Manager: Approval review with diff view
/manager/checkin/:employeeId        # Manager: Check-in per employee
/manager/shared-goals               # Manager: Shared goals management
/admin                              # Admin: Command center
/admin/users                        # Admin: User management
/admin/cycles                       # Admin: Cycle/window config
/admin/audit                        # Admin: Audit trail
/admin/completion                   # Admin: Completion dashboard
/admin/analytics                    # Admin: Analytics & export
/admin/thrust-areas                 # Admin: Thrust area management
/admin/escalations                  # Admin: Escalation rules & log
/admin/unlock                       # Admin: Goal unlock (sheet + per-goal)
/settings                           # All roles: Profile & settings
```

### Backend Route Prefixes

All API routes mounted under `/api/v1`:

```txt
/health
/api/v1/auth
/api/v1/goals
/api/v1/goal-sheets
/api/v1/checkins
/api/v1/users
/api/v1/cycles
/api/v1/notifications
/api/v1/reports
/api/v1/shared-goals
/api/v1/admin
```

## Database Model Overview

Main Prisma models (12):

- `User` — with self-referencing `reportingManagerId` for hierarchy
- `Cycle` — active cycle tracking
- `CycleWindow` — per-phase window with force-override status
- `GoalSheet` — unique per `userId` + `cycleId`
- `Goal` — with `isLocked`, `isShared`, `parentGoalId`; includes quarter milestone targets (`q1Target`–`q4Target`)
- `SharedGoal` — with `primaryOwnerId` for achievement sync
- `CheckinRecord` — unique per `goalId` + `quarter`
- `Notification`
- `AuditLog`
- `ThrustArea`
- `EscalationRule`
- `Escalation`

## Environment Variables

Do not commit real `.env` values. Both `.env` files are in `.gitignore`.

### Backend `.env` (`Telos_Backend/.env`)

Required:

```txt
DATABASE_URL=
DIRECT_URL=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FRONTEND_URL=http://localhost:5173
PORT=3000
```

Optional:

```txt
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ENABLE_ESCALATION_JOB=false
SKIP_FIREBASE_AUTH=false
DEV_FIREBASE_UID=
DEV_FIREBASE_EMAIL=
DEV_FIREBASE_NAME=
NODE_ENV=development
```

### Frontend `.env` (`Telos_Frontend/.env`)

```txt
VITE_API_URL=http://localhost:3000/api/v1
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

## Install and Run

### Backend

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Backend
npm install
npx.cmd prisma generate
npm run dev
```

Runs at: `http://localhost:3000` | Health: `http://localhost:3000/health`

### Frontend

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Frontend
npm install
npm run dev
```

Runs at: `http://localhost:5173/login`

### Seed Data

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Backend
npm run seed:all
```

Demo accounts:

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Employee | employee@telos.demo    | Demo@1234  |
| Manager  | manager@telos.demo     | Demo@1234  |
| Admin    | admin@telos.demo       | Demo@1234  |

## Verification

```powershell
# Backend tests
cd Telos_Backend; npm test

# Frontend build
cd Telos_Frontend; npm run build
```

Current status:
- **Backend**: 18/18 unit tests passing (validation, score computation, report filters, completion summary).
- **Frontend**: Production build passes (Vite chunk-size warning is non-blocking).

## Manual Smoke Tests

### Employee Goal Sheet
1. Login as `employee@telos.demo`.
2. Go to My Goals → Create goal sheet.
3. Add goals totaling 100% weightage. Verify >90% warning appears.
4. Auto-save backup occurs to localStorage every 30s.
5. Submit for approval. Verify sheet cannot be edited.

### Manager Approval (with diff view)
1. Login as `manager@telos.demo`.
2. Go to Team Overview → Review submitted sheet.
3. Adjust weightage — edited row highlights yellow.
4. Click "Show diff view" — see original vs edited values.
5. Approve or return with reason (min 20 chars).

### Quarterly Check-ins
1. Admin force-opens a quarter window.
2. Employee saves actuals. Shared goals show "Awaiting owner update" if primary owner hasn't entered data.
3. Manager adds comment and marks complete.

### Shared Goals
1. Manager creates shared goal with recipients + primary owner.
2. Recipient sees shared badge, read-only target, editable weightage.
3. Primary owner enters actual → syncs to all linked employees.

### Admin Operations
1. Force-open/close windows, create users, unlock goals, run escalations.
2. Export CSV/XLSX achievement reports.
3. Filter audit logs.

## Known Engineering Notes

- **18 unit tests** cover validation, score computation, report filters, and completion summaries. Integration and frontend test coverage should be expanded.
- Frontend build passes with a Vite chunk-size warning (~949 KB) — dynamic imports could improve code-splitting.
- Prisma's `package.json#prisma` config emits a deprecation warning for Prisma 7. A future cleanup should move Prisma configuration into a dedicated config file.
- Database was synced with `prisma db push`; if using Prisma Migrate in production, baseline the existing Supabase schema first.

## Useful Files

Backend:
- `src/app.js` — Entry point
- `src/prisma/schema.prisma` — Full schema
- `src/utils/schemas.js` — All Zod validation schemas
- `src/middleware/` — Authenticate, authorize, validate, checkNotLocked, auditLogger
- `src/services/` — Score, validation, notifications, email, escalation, report filters

Frontend:
- `src/routes/AppRouter.jsx` — All routes including `/settings`
- `src/api/` — 11 API wrapper files
- `src/pages/` — 17 pages across employee/manager/admin/shared
- `src/components/` — Layout, goals, and shared component directories
- `src/hooks/` — useAuth, useGoalSheet, useCurrentCycle, useWindowStatus
- `src/index.css` — Tailwind v4 theme tokens

Docs: `prd.md`, `trd.md`
