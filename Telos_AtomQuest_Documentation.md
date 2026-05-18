# Telos AtomQuest — Final Documentation

**Live URL:** https://telos-frontend.vercel.app

**Repositories:**
- Frontend: https://github.com/aayusharyaiam/Telos_Frontend
- Backend: https://github.com/aayusharyaiam/Telos_Backend

---

## Architecture

```mermaid
flowchart LR
  User[User] -->|HTTPS| FE[Frontend (React/Vite) Vercel]
  FE -->|Login| Firebase[Firebase Auth]
  FE -->|API| API[Backend API (Node/Express)]
  API -->|Verify| FirebaseAdmin[Firebase Admin SDK]
  API -->|ORM| DB[(Postgres Supabase)]
  API -->|Email| Resend[Resend API]
  API -->|Cron| Cron[node-cron Job]
  Cron --> DB
  Cron --> Resend
```

Full-stack goal setting & performance tracking: goal-sheet creation → manager approval → quarterly check-ins → shared goals → notifications → admin controls → audit trail → escalation engine → email notifications.

---

## Tech Stack

| Layer | Backend | Frontend |
|-------|---------|----------|
| Runtime | Node.js + Express | React 19 + Vite 8 |
| ORM/Database | Prisma + Supabase Postgres | — |
| Auth | Firebase Admin SDK | Firebase Client SDK |
| Styling | — | Tailwind CSS v4 |
| Validation | Zod | react-hook-form |
| Email | Resend | — |
| Scheduling | node-cron | React Query |
| Charts | — | Recharts (lazy) |
| Animation | — | Framer Motion |
| Export | xlsx | — |

**Security:** Helmet, CORS, express-rate-limit, audit logging.

---

## Quick Start

### 1. Install & Run

```powershell
# Backend
cd Telos_Backend
npm install
npx prisma generate
npm run dev                    # http://localhost:3000

# Frontend
cd Telos_Frontend
npm install
npm run dev                    # http://localhost:5173/login
```

### 2. Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee | employee@telos.demo | Demo@1234 |
| Manager | manager@telos.demo | Demo@1234 |
| Admin | admin@telos.demo | Demo@1234 |

### 3. Demo Data

```powershell
cd Telos_Backend
node prisma/seed-demo.js       # Creates 6 employees, check-ins, shared goals, notifications, audit entries
```

### 4. Verify

```powershell
cd Telos_Backend; npm test     # 14 tests
cd Telos_Frontend; npm run build
```

---

## Environment Variables

### Backend `.env`

```txt
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=notifications@telos.com

ENABLE_ESCALATION_JOB=false
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
APP_BASE_URL=https://telos-frontend.vercel.app
```

### Frontend `.env`

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

---

## Core Features

### 1. Authentication & Authorization
- Firebase Email/Password → ID token verification on every API call
- Firebase Microsoft OAuth via Azure Entra ID (optional SSO)
- Role-based: EMPLOYEE, MANAGER, ADMIN
- `isActive=false` users blocked
- Role routing: `/goals` → Employee, `/manager/team` → Manager, `/admin` → Admin

**Supported sign-in methods:**
| Method | Provider |
|--------|----------|
| Email/Password | Firebase built-in |
| Microsoft SSO | Firebase + Azure Entra ID |

### 2. Goal Sheet (Employee)
- Lifecycle: DRAFT → SUBMITTED → APPROVED/RETURNED → (unlock) → RETURNED → resubmit
- One active-cycle sheet per employee (auto-created)
- **Validation:** 1-8 goals, min 10% each, total 100%
- **Auto-save:** localStorage every 30s + on blur
- **Locking:** checkNotLocked middleware blocks edits on locked goals
- **Diff view:** `GET /api/v1/goal-sheets/:id/diff` shows post-lock changes

### 3. Manager Approval
- Team dashboard with direct report sheet statuses
- Inline target/weightage edits on SUBMITTED sheets
- Diff view: yellow highlight + strikethrough originals
- Approve → locks goals + notifies + emails
- Return → requires reason (20+ chars) + notifies + emails

### 4. Quarterly Check-ins
- Q1-Q4 selector per goal
- Employee: actual value, date, notes, evidence attachments
- Manager: review, comments, view evidence, mark complete
- **Score computation:**

| UoM Type | Rule | Cap |
|----------|------|-----|
| NUMERIC_MIN | higher=better → actual/target | 100% |
| NUMERIC_MAX | lower=better → target/actual | 100% |
| PERCENTAGE_MIN | higher=better → actual/target | 100% |
| PERCENTAGE_MAX | lower=better → target/actual | 100% |
| TIMELINE | on-time=100%, late=0% | — |
| ZERO | zero=100%, else=0% | — |

### 5. Shared Goals
- Managers/admins create, push to employees/direct reports
- Linked `Goal` rows with `isShared=true` + `parentGoalId`
- Read-only title/target, editable weightage only
- Primary owner syncs actuals to all linked check-ins

### 6. Notifications
- In-app: top-right toasts (4s auto-dismiss, pause on hover, click navigates)
- Polls every 15s
- Triggers: submit/approve/return, unlock, check-in open, shared goal push, escalation, manager check-in complete

### 7. Email Notifications (Resend)
- 8 event types with HTML templates
- `notificationEmail` field overrides delivery without changing login
- Logged to EmailLog with full HTML, status, errors

### 8. Teams Notifications (Optional)
- Incoming webhook integration
- Events: GOAL_SHEET_SUBMITTED, GOAL_SHEET_APPROVED, ESCALATION_TRIGGERED
- Graceful failure handling

### 9. Admin Controls

| Feature | Description |
|---------|-------------|
| User Management | Create, CSV import, edit roles/activation/department |
| notificationEmail | Per-user delivery override |
| Email Log Viewer | HTML preview, success/failure, all attempts |
| Cycle Config | Create cycles, force open/close windows |
| Goal Unlock | Sheet or per-goal unlock with reason |
| Thrust Areas | CRUD with fallback defaults |
| Escalation Rules | Patterns, manual/cron run |
| Audit Trail | Filterable log of all admin actions |
| Analytics | Overview, trends, heatmap, department performance, export |
| Completion Dashboard | Per-quarter status rows |

### 10. Escalation Engine
- Patterns: goal setting overdue, approval overdue, check-in overdue
- States: PENDING → ESCALATED → RESOLVED
- Manual or cron-based

---

## API Routes

All endpoints under `/api/v1`:

| Route | Endpoints |
|-------|-----------|
| `/auth` | POST /sync, GET /me, PATCH /me |
| `/goals` | CRUD, PATCH /:id/unlock |
| `/goal-sheets` | CRUD, POST /submit, /approve, /return, PATCH /unlock, GET /diff |
| `/checkins` | CRUD, PATCH /complete, POST /evidence |
| `/users` | GET /, POST /, PATCH /:id, POST /import |
| `/cycles` | CRUD, PATCH /archive, window management |
| `/notifications` | GET /, PATCH /:id/read, PATCH /read-all |
| `/reports` | Achievement (JSON/CSV/XLSX), analytics, completion, audit |
| `/shared-goals` | CRUD, push to recipients |
| `/admin` | Thrust areas, escalation rules/run, email logs |

---

## Database Schema (13 Models)

| Model | Key Fields |
|-------|------------|
| User | email, firebaseUid, role, notificationEmail?, reportingManagerId? |
| Cycle | name, isActive, isArchived |
| CycleWindow | phase, opensAt, closesAt, status |
| GoalSheet | status (enum), userId+cycleId unique |
| Goal | title, target, weightage, isLocked, isShared, q1Target-q4Target |
| SharedGoal | title, target, primaryOwnerId |
| CheckinRecord | actual, quarter, managerComment, evidenceUrl? |
| Notification | message, link, isRead |
| AuditLog | action, fieldChanged, oldValue, newValue |
| EmailLog | to, subject, html, eventType, success, error |
| ThrustArea | name, isDefault, isActive |
| EscalationRule | name, pattern, triggerAfterDays, isActive |
| Escalation | status (PENDING→ESCALATED→RESOLVED) |

---

## Middleware Pipeline

```
authenticate → authorize → validate → checkNotLocked → auditLogger → controller → errorHandler
```

- **authenticate:** Firebase token → app user
- **authorize:** Role check against allowedRoles
- **validate:** Zod parsing
- **checkNotLocked:** Blocks PATCH/DELETE on locked goals
- **auditLogger:** Captures post-edit changes
- **errorHandler:** Transforms Prisma errors to user-friendly messages

---

## Frontend Routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Public |
| `/help` | Judge's Guide | Public |
| `/goals` | My Goals | Employee+ |
| `/goals/sheet/:sheetId` | Goal Editor | Employee+ |
| `/goals/sheet/:sheetId/checkin` | Check-in | Employee+ |
| `/manager/team` | Team Dashboard | Manager+ |
| `/manager/approve/:sheetId` | Approval | Manager+ |
| `/manager/checkin/:employeeId` | Manager Check-in | Manager+ |
| `/manager/shared-goals` | Shared Goals | Manager+ |
| `/admin` | Command Center | Admin |
| `/admin/users` | User Management | Admin |
| `/admin/cycles` | Cycle Config | Admin |
| `/admin/thrust-areas` | Thrust Areas | Admin |
| `/admin/unlock` | Goal Unlock | Admin |
| `/admin/escalations` | Escalations | Admin |
| `/admin/completion` | Completion | Admin |
| `/admin/audit` | Audit Trail | Admin |
| `/admin/analytics` | Analytics | Admin |
| `/admin/email-logs` | Email Logs | Admin |
| `/settings` | Settings | All |

---

## Performance

- **Code splitting:** 19 pages lazy-loaded via React.lazy()
- **Initial JS:** 1,131 kB → 551 kB (51% reduction)
- **Recharts:** 390 kB lazy chunk (AnalyticsPage only)
- **Total chunks:** 35 granular

---

## Docker

### Backend
```powershell
cd Telos_Backend
docker compose up -d
curl http://localhost:3000/health
```

### Frontend
```powershell
cd Telos_Frontend
docker compose up -d
curl http://localhost/health
```

---

## Tests

14 unit tests covering goal validation, score computation (all 6 UoM types), report filters, and completion aggregation.

```powershell
cd Telos_Backend; npm test
```

---

## Project Structure

```
Telos_Backend/
├── src/
│   ├── app.js
│   ├── config/          (firebase, prisma)
│   ├── controllers/     (auth, goals, goalSheets, checkins, users, cycles, notifications, reports, sharedGoals, admin)
│   ├── jobs/            (escalation cron)
│   ├── middleware/     (authenticate, authorize, validate, checkNotLocked, auditLogger, errorHandler)
│   ├── prisma/          (schema.prisma)
│   ├── routes/          (11 route files)
│   ├── services/        (score, goalValidation, notification, email, escalation, reportFilters, teamsNotification)
│   └── utils/           (constants, cycleHelper, schemas, errors, response)
├── prisma/              (seed.js, seed-demo.js)
└── test/                (business-rules.test.js)

Telos_Frontend/
├── src/
│   ├── api/             (11 API wrappers)
│   ├── components/     (layout, goals, shared, analytics)
│   ├── context/        (AuthContext, ThemeContext)
│   ├── hooks/           (useAuth, useGoalSheet, useCurrentCycle, useWindowStatus)
│   ├── pages/           (auth, employee, manager, admin, shared)
│   ├── routes/          (AppRouter with lazy loading)
│   └── utils/           (constants, dateHelpers, navigation, scoreComputer)
└── public/
```

---

## Design System

- **Glassmorphism:** `rounded-2xl bg-white/80 backdrop-blur-lg shadow-sm ring-1`
- **Colors:** Ink, Sand, Primary (#3525cd), Secondary (#006c49), Tertiary, Error
- **Dark Mode:** Toggle via sidebar → localStorage → Tailwind `dark:` variants
- **Typography:** Sora (headings), Manrope (body) via Google Fonts
- **Background:** Radial gradient blobs (indigo/emerald) light, solid #0f172a dark
- **Animations:** Framer Motion — page transitions (fade+slide 0.35s), staggered lists (0.05s), hover lift, count-up on stats

---

## Engineering Notes

- Prisma `package.json#prisma` config deprecated in Prisma 7 — migrate to `prisma.config.ts`
- Database sync via `prisma db push`. Production: use Prisma Migrate
- Prisma errors transformed to user-friendly messages — raw codes never reach client
- `notificationEmail` validated with `.email()` Zod — must be valid email or null