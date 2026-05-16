# Telos AtomQuest

Telos AtomQuest is a full-stack goal setting and performance tracking portal. It covers the complete flow from Firebase login, employee goal-sheet creation, manager approval, quarterly achievement check-ins, shared goals, notifications, reporting, admin controls, audit logs, and escalations.

## Project Structure

```txt
|-- Telos_Backend
|   |-- src
|   |   |-- app.js
|   |   |-- config
|   |   |-- controllers
|   |   |-- jobs
|   |   |-- middleware
|   |   |-- prisma
|   |   |-- routes
|   |   |-- services
|   |   `-- utils
|   |-- prisma
|   |-- scripts
|   |-- package.json
|   `-- package-lock.json
|-- Telos_Frontend
|   |-- src
|   |   |-- api
|   |   |-- components
|   |   |-- context
|   |   |-- firebase
|   |   |-- hooks
|   |   |-- pages
|   |   |-- routes
|   |   `-- utils
|   |-- package.json
|   `-- package-lock.json
|-- prd.md
|-- trd.md
|-- implementation_plan.md
|-- implementation_summary.md
`-- README.md
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
- Helmet, CORS, and express-rate-limit

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS v4
- Firebase Email/Password Auth
- Axios API client
- Heroicons
- Recharts

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
- Goal validation:
  - At least one goal before submission.
  - Maximum 8 goals per cycle.
  - Minimum 10 percent weightage per goal.
  - Total weightage must equal exactly 100 percent before submission.
  - Title, thrust area, UoM, target, and date values are validated server-side.
- Employee can submit goal sheet for approval.
- Submitted sheets cannot be edited by employee until returned.
- Approved goals are locked.

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
- Managers can approve submitted sheets.
- Managers can return submitted sheets with a required reason.
- Approve and return actions use confirmation modals.
- Notifications and emails are created for submit, approve, and return flows.

### Quarterly Check-ins

- Employee and manager check-in pages support `Q1`, `Q2`, `Q3`, and `Q4`.
- Quarter selectors reload quarter-specific records.
- Check-in editability respects cycle-window status.
- Employees can save actual achievement or actual date, status, and notes.
- Managers can add comments and mark check-ins complete.
- Shared-goal actuals sync into check-in views.
- Progress score is computed server-side.

### Score Computation

Backend score logic lives in:

```txt
Telos_Backend/src/services/score.service.js
```

Supported UoM types:

- `NUMERIC_MIN`
- `NUMERIC_MAX`
- `PERCENTAGE_MIN`
- `PERCENTAGE_MAX`
- `TIMELINE`
- `ZERO`

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
- Shared goals now support a persisted `primaryOwnerId`.
- The UI allows primary owner selection from selected recipients.
- Shared actual updates are quarter-aware and upsert linked check-in records for the selected quarter.
- Shared actuals and scores appear in check-in views and exports.
- Shared goal pushes create in-app notifications and Resend emails when email is configured.

### Notifications

- Navbar notification bell shows unread count.
- Drawer polls every 30 seconds while logged in.
- Notifications list real backend records.
- Mark all read is supported.
- Clicking a notification with a link:
  - Marks that notification read.
  - Navigates to the linked page.
- Notification routes:
  - `GET /api/v1/notifications`
  - `PATCH /api/v1/notifications/:id/read`
  - `PATCH /api/v1/notifications/read-all`

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
  - Q1 Check-in
  - Q2 Check-in
  - Q3 Check-in
  - Q4 Check-in
- Force open/close uses confirmation modal.
- Opening a check-in window creates in-app notifications and sends emails when Resend is configured.
- Employee dashboard shows an open-check-in banner with deadline and deep link.

### Thrust Areas

- Admins can view, add, rename, activate, and deactivate thrust areas.
- Goal creation forms load active thrust areas from the backend.
- Frontend falls back to local constants if thrust area API loading fails.
- Existing constants remain as fallback in:

```txt
Telos_Frontend/src/utils/constants.js
```

### Goal Unlock

- Admins can unlock an entire approved goal sheet.
- Admins can unlock a specific locked goal.
- Per-goal unlock endpoint:

```txt
PATCH /api/v1/goals/:goalId/unlock
```

- Sheet-level unlock endpoint:

```txt
PATCH /api/v1/goal-sheets/:id/unlock
```

- Unlocks require a reason.
- Unlock actions create audit logs.
- Unlock actions notify the employee.
- Per-goal unlock returns the sheet to `RETURNED` so the employee can revise and resubmit.

### Reporting and Analytics

- Completion dashboard shows quarter selector and Q1-Q4 row statuses.
- Achievement report supports:
  - JSON
  - CSV
  - XLSX
- Achievement report filters:
  - `cycleId`
  - `quarter`
  - `managerId`
  - `employeeId`
  - `status`
  - `department`
  - `employeeSearch`
- Managers are scoped to their own team.
- Admins can see all organization data.
- Analytics page includes:
  - Overview cards
  - Quarter trend chart
  - Goal distribution chart
  - Export controls and filters

### Audit Trail

- Admin audit page shows audit logs with:
  - Action
  - Field changed
  - Old value
  - New value
  - Reason
  - User
  - Goal where applicable
  - Timestamp
- Filters:
  - Action
  - Start date
  - End date
- Common audit actions include:
  - `USER_CREATED`
  - `USER_ROLE_CHANGED`
  - `USER_ACTIVATION_CHANGED`
  - `THRUST_AREA_CREATED`
  - `THRUST_AREA_UPDATED`
  - `CYCLE_WINDOW_UPDATED`
  - `GOAL_SHEET_UNLOCKED`
  - `GOAL_UNLOCKED`
  - `ESCALATION_RULE_CREATED`
  - `ESCALATION_RESOLVED`

### Escalations

- Admins can create, enable, disable, and list escalation rules.
- Admins can run escalation checks manually.
- Optional cron job runs when `ENABLE_ESCALATION_JOB=true`.
- Escalation states:
  - `PENDING`
  - `ESCALATED`
  - `RESOLVED`
- Supported escalation patterns:
  - Goal setting overdue.
  - Approval overdue.
  - Employee check-in overdue.
  - Manager check-in review overdue.
- Escalations create in-app notifications and Resend emails when configured.

## Routes

### Frontend Routes

```txt
/login
/goals
/goals/sheet/:sheetId
/goals/sheet/:sheetId/checkin
/manager/team
/manager/approve/:sheetId
/manager/checkin/:employeeId
/manager/shared-goals
/admin
/admin/users
/admin/cycles
/admin/audit
/admin/completion
/admin/analytics
/admin/thrust-areas
/admin/escalations
/admin/unlock
```

### Backend Route Prefixes

All API routes are mounted under:

```txt
/api/v1
```

Route groups:

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

Main Prisma models:

- `User`
- `Cycle`
- `CycleWindow`
- `GoalSheet`
- `Goal`
- `SharedGoal`
- `CheckinRecord`
- `Notification`
- `AuditLog`
- `ThrustArea`
- `EscalationRule`
- `Escalation`

Important relations:

- `User.reportingManagerId` models manager/direct-report hierarchy.
- `GoalSheet` is unique by `userId` and `cycleId`.
- `Goal.parentGoalId` links an employee goal to `SharedGoal`.
- `SharedGoal.primaryOwnerId` stores the selected primary owner.
- `CheckinRecord` is unique by `goalId` and `quarter`.

Recent schema addition:

```txt
SharedGoal.primaryOwnerId
```

Migration file:

```txt
Telos_Backend/src/prisma/migrations/20260516070000_add_shared_goal_primary_owner/migration.sql
```

The current Supabase database was synced with:

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Backend
npx.cmd prisma db push
```

Note: `prisma migrate deploy` may require baselining because the existing Supabase schema was not originally created through Prisma Migrate.

## Environment Variables

Do not commit real `.env` values.

### Backend `.env`

Located at:

```txt
Telos_Backend/.env
```

Required for production-like auth and DB:

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

Notes:

- `FIREBASE_PRIVATE_KEY` supports escaped newlines and is converted with `.replace(/\\n/g, '\n')`.
- If Resend env vars are missing, email sending logs a skip and does not crash.
- `SKIP_FIREBASE_AUTH=true` enables a development stub when Firebase Admin env vars are not present.

### Frontend `.env`

Located at:

```txt
Telos_Frontend/.env
```

Expected values:

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

Backend default:

```txt
http://localhost:3000
```

Health check:

```txt
http://localhost:3000/health
```

### Frontend

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Frontend
npm install
npm run dev
```

Frontend default:

```txt
http://localhost:5173/login
```

## Seed and Demo Data

Backend scripts:

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Backend
npm run seed
npm run seed:users
npm run seed:all
```

Demo accounts commonly used in this workspace:

```txt
employee@telos.demo / Demo@1234
employee2@telos.demo / Demo@1234
employee3@telos.demo / Demo@1234
manager@telos.demo / Demo@1234
manager2@telos.demo / Demo@1234
manager3@telos.demo / Demo@1234
admin@telos.demo / Demo@1234
admin2@telos.demo / Demo@1234
admin3@telos.demo / Demo@1234
```

## Verification Commands

### Backend Syntax Check

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Backend
Get-ChildItem -Recurse -Filter *.js src | ForEach-Object { node --check $_.FullName }
```

### Frontend Build

```powershell
cd C:\Users\aayus\working-ly\Telos_AtomQuest\Telos_Frontend
npm.cmd run build
```

Current status:

- Backend syntax check passes.
- Frontend production build passes.
- Vite reports a non-blocking large chunk warning.

## Manual Smoke Tests

### Employee Goal Sheet

1. Login as `employee@telos.demo`.
2. Go to My Goals.
3. Create a goal sheet if one does not exist.
4. Add goals totaling 100 percent weightage.
5. Submit for approval.
6. Confirm submitted sheet cannot be edited by employee.

### Manager Approval

1. Login as `manager@telos.demo`.
2. Go to Team Overview.
3. Confirm direct reports appear even if they have no sheet.
4. Review a submitted sheet.
5. Approve or return with a reason.
6. Confirm employee receives notification.

### Quarterly Check-ins

1. Admin force-opens a quarter check-in window.
2. Login as employee.
3. Go to Check-ins.
4. Select Q1, Q2, Q3, or Q4.
5. Save actuals and notes.
6. Login as manager.
7. Open manager check-in for the same employee and quarter.
8. Add manager comment and submit.

### Shared Goals

1. Login as manager or admin.
2. Go to Shared Goals.
3. Select recipients and a primary owner.
4. Push the shared goal.
5. Set a shared actual for a selected quarter.
6. Login as recipient.
7. Confirm shared goal appears with badge.
8. Confirm shared actual and score appear in the correct quarter.

### Admin Operations

1. Login as admin.
2. Create and deactivate thrust areas.
3. Force open and force close cycle windows.
4. Create users and update roles.
5. Unlock a whole sheet and a single goal.
6. Run escalation check.
7. Filter audit logs.
8. Download CSV and XLSX achievement reports.

## Known Engineering Notes

- Automated tests are still light compared with the feature surface. The backend has a `node --test` script, but broader integration and frontend test coverage should be expanded.
- The frontend build currently passes with a Vite chunk-size warning.
- Prisma's `package.json#prisma` config emits a deprecation warning for Prisma 7. A future cleanup should move Prisma configuration into a dedicated Prisma config file.
- The database was synced with `prisma db push`; if using Prisma Migrate in production, baseline the existing Supabase schema first.

## Useful Files

Backend:

```txt
Telos_Backend/src/app.js
Telos_Backend/src/prisma/schema.prisma
Telos_Backend/src/controllers
Telos_Backend/src/routes
Telos_Backend/src/services
Telos_Backend/src/middleware
```

Frontend:

```txt
Telos_Frontend/src/routes/AppRouter.jsx
Telos_Frontend/src/api
Telos_Frontend/src/pages
Telos_Frontend/src/components
Telos_Frontend/src/context/AuthContext.jsx
Telos_Frontend/src/index.css
```

Planning and product docs:

```txt
prd.md
trd.md
implementation_plan.md
implementation_summary.md
```
