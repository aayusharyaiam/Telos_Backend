# Telos — Technical Requirements Document (TRD)
**AtomQuest Hackathon 1.0 | In-House Goal Setting & Tracking Portal**
**Version:** 1.0 | **Last Updated:** 2026-05-16

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Design](#6-api-design)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Business Logic — Score Computation](#8-business-logic--score-computation)
9. [Shared Goals Implementation](#9-shared-goals-implementation)
10. [Notification System](#10-notification-system)
11. [Escalation Engine](#11-escalation-engine)
12. [Reporting & Export](#12-reporting--export)
13. [Cycle & Window Management](#13-cycle--window-management)
14. [Audit Trail](#14-audit-trail)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Seed Data](#16-seed-data)
17. [Environment Variables](#17-environment-variables)
18. [Error Handling Standards](#18-error-handling-standards)
19. [Security Considerations](#19-security-considerations)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│              React + Tailwind CSS + React Router             │
│                   Hosted on: Vercel                          │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS REST API
┌───────────────────────▼─────────────────────────────────────┐
│                   Express.js Backend                         │
│         Node.js + Express + Prisma ORM                       │
│                   Hosted on: Railway                         │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
┌──────────▼──────────┐      ┌───────────▼──────────────────┐
│  Supabase PostgreSQL │      │     Firebase Auth             │
│  (Primary DB)        │      │  (JWT-based authentication)  │
└─────────────────────┘      └──────────────────────────────┘
           │
┌──────────▼──────────┐
│  Resend (Email API)  │
│  (Transactional      │
│   notifications)     │
└─────────────────────┘
```

### Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Frontend | React + Tailwind | Fast to build, component-based, familiar |
| Backend | Express.js + Node.js | Simple REST API, easy to reason about |
| ORM | Prisma | Type-safe, auto-migrations, great schema file |
| Database | PostgreSQL (Supabase) | Relational data model fits perfectly; free tier |
| Auth | Firebase Auth | Free, battle-tested, supports SSO bolt-on later |
| Email | Resend | 3k free emails/month, dead-simple Node SDK |
| Hosting (FE) | Vercel | Free, CI/CD from GitHub, edge CDN |
| Hosting (BE) | Railway | Free tier, simple Express deployment |
| Cron Jobs | node-cron (in-process) | Simple, no extra infra for escalation engine |

---

## 2. Technology Stack

### Frontend
```
react@^18
react-router-dom@^6
tailwindcss@^3
@headlessui/react          # Accessible modals, dropdowns
@heroicons/react           # Icon set
react-query@^5             # Server state management
axios                      # HTTP client
react-hook-form            # Form state + validation
zod                        # Schema validation (shared with backend)
recharts                   # Charts for analytics dashboard
date-fns                   # Date formatting and manipulation
react-hot-toast            # Toast notifications
firebase                   # Firebase Auth SDK (client)
```

### Backend
```
express@^4
prisma@^5
@prisma/client
firebase-admin             # Verify Firebase Auth tokens server-side
cors
helmet                     # Security headers
express-rate-limit         # Rate limiting
zod                        # Input validation
node-cron                  # Scheduled escalation jobs
resend                     # Email sending
xlsx                       # Excel export
dotenv
```

---

## 3. Project Structure

```
telos/
├── frontend/                    # React application
│   ├── public/
│   ├── src/
│   │   ├── api/                 # Axios instance + API call functions
│   │   │   ├── axiosInstance.js
│   │   │   ├── goals.api.js
│   │   │   ├── users.api.js
│   │   │   ├── checkins.api.js
│   │   │   ├── cycles.api.js
│   │   │   └── notifications.api.js
│   │   ├── components/          # Reusable UI components
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── NotificationDrawer.jsx
│   │   │   ├── goals/
│   │   │   │   ├── GoalCard.jsx
│   │   │   │   ├── GoalForm.jsx
│   │   │   │   ├── WeightageBar.jsx
│   │   │   │   └── ProgressScoreBadge.jsx
│   │   │   ├── checkins/
│   │   │   │   ├── CheckinForm.jsx
│   │   │   │   └── CheckinStatusGrid.jsx
│   │   │   └── shared/
│   │   │       ├── Modal.jsx
│   │   │       ├── Table.jsx
│   │   │       ├── Badge.jsx
│   │   │       └── EmptyState.jsx
│   │   ├── pages/               # Route-level pages
│   │   │   ├── auth/
│   │   │   │   └── LoginPage.jsx
│   │   │   ├── employee/
│   │   │   │   ├── MyGoalsPage.jsx
│   │   │   │   ├── GoalSheetPage.jsx
│   │   │   │   └── CheckinEntryPage.jsx
│   │   │   ├── manager/
│   │   │   │   ├── TeamDashboardPage.jsx
│   │   │   │   ├── ApprovalPage.jsx
│   │   │   │   └── ManagerCheckinPage.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboardPage.jsx
│   │   │       ├── UserManagementPage.jsx
│   │   │       ├── CycleConfigPage.jsx
│   │   │       ├── AuditLogPage.jsx
│   │   │       ├── CompletionDashboardPage.jsx
│   │   │       └── AnalyticsPage.jsx
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useGoalSheet.js
│   │   │   ├── useCurrentCycle.js
│   │   │   └── useWindowStatus.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   ├── scoreComputer.js  # Progress score formulas
│   │   │   ├── dateHelpers.js
│   │   │   └── constants.js      # Thrust areas, UoM types
│   │   ├── routes/
│   │   │   └── AppRouter.jsx     # Protected route logic
│   │   └── main.jsx
│   ├── .env
│   └── vite.config.js
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── goals.routes.js
│   │   │   ├── goalSheets.routes.js
│   │   │   ├── checkins.routes.js
│   │   │   ├── users.routes.js
│   │   │   ├── cycles.routes.js
│   │   │   ├── notifications.routes.js
│   │   │   ├── reports.routes.js
│   │   │   ├── sharedGoals.routes.js
│   │   │   └── admin.routes.js
│   │   ├── controllers/
│   │   │   ├── goals.controller.js
│   │   │   ├── goalSheets.controller.js
│   │   │   ├── checkins.controller.js
│   │   │   ├── users.controller.js
│   │   │   ├── cycles.controller.js
│   │   │   ├── reports.controller.js
│   │   │   └── sharedGoals.controller.js
│   │   ├── middleware/
│   │   │   ├── authenticate.js    # Firebase token verification
│   │   │   ├── authorize.js       # Role-based access control
│   │   │   ├── validate.js        # Zod input validation
│   │   │   └── auditLogger.js     # Post-lock change logging
│   │   ├── services/
│   │   │   ├── email.service.js   # Resend integration
│   │   │   ├── notification.service.js
│   │   │   ├── score.service.js   # Score computation logic
│   │   │   └── escalation.service.js
│   │   ├── jobs/
│   │   │   └── escalation.job.js  # node-cron daily job
│   │   ├── utils/
│   │   │   ├── errors.js          # Custom error classes
│   │   │   └── constants.js
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── app.js
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 4. Database Schema

### Prisma Schema (`schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ────────────────────────────────────────────────

enum Role {
  EMPLOYEE
  MANAGER
  ADMIN
}

enum GoalSheetStatus {
  DRAFT
  SUBMITTED
  APPROVED
  RETURNED
}

enum UoMType {
  NUMERIC_MIN   // Higher is better (e.g., Revenue)
  NUMERIC_MAX   // Lower is better (e.g., TAT, Cost)
  PERCENTAGE_MIN
  PERCENTAGE_MAX
  TIMELINE      // Date-based
  ZERO          // Zero = success
}

enum GoalStatus {
  NOT_STARTED
  ON_TRACK
  COMPLETED
}

enum Quarter {
  Q1
  Q2
  Q3
  Q4
}

enum WindowPhase {
  GOAL_SETTING
  Q1_CHECKIN
  Q2_CHECKIN
  Q3_CHECKIN
  Q4_CHECKIN
}

enum WindowStatus {
  OPEN
  CLOSED
  FORCE_OPEN
  FORCE_CLOSED
}

enum EscalationStatus {
  PENDING
  ESCALATED
  RESOLVED
}

// ─── MODELS ───────────────────────────────────────────────

model User {
  id                String    @id @default(cuid())
  firebaseUid       String    @unique  // Firebase Auth UID
  email             String    @unique
  name              String
  role              Role      @default(EMPLOYEE)
  department        String?
  isActive          Boolean   @default(true)
  reportingManagerId String?
  
  // Relations
  reportingManager  User?     @relation("Reports", fields: [reportingManagerId], references: [id])
  directReports     User[]    @relation("Reports")
  goalSheets        GoalSheet[]
  managerCheckins   CheckinRecord[] @relation("ManagerCheckins")
  notifications     Notification[]
  auditLogs         AuditLog[]
  escalations       Escalation[]
  createdSharedGoals SharedGoal[] @relation("SharedGoalCreator")

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Cycle {
  id          String    @id @default(cuid())
  name        String    // e.g., "FY2025-26"
  isActive    Boolean   @default(false)
  windows     CycleWindow[]
  goalSheets  GoalSheet[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model CycleWindow {
  id          String        @id @default(cuid())
  cycleId     String
  phase       WindowPhase
  opensAt     DateTime
  closesAt    DateTime
  status      WindowStatus  @default(CLOSED)  // Admin can override
  
  cycle       Cycle         @relation(fields: [cycleId], references: [id])
  
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([cycleId, phase])
}

model GoalSheet {
  id              String          @id @default(cuid())
  userId          String
  cycleId         String
  status          GoalSheetStatus @default(DRAFT)
  returnReason    String?         // Set when status = RETURNED
  submittedAt     DateTime?
  approvedAt      DateTime?
  
  // Relations
  user            User            @relation(fields: [userId], references: [id])
  cycle           Cycle           @relation(fields: [cycleId], references: [id])
  goals           Goal[]
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([userId, cycleId])    // One sheet per user per cycle
}

model Goal {
  id              String      @id @default(cuid())
  goalSheetId     String
  thrustArea      String      // e.g., "Revenue Growth"
  title           String
  description     String?
  uomType         UoMType
  target          Float?      // Null for TIMELINE uom (use targetDate instead)
  targetDate      DateTime?   // Only for TIMELINE uom
  weightage       Float       // 10–100, total across sheet = 100
  isLocked        Boolean     @default(false)
  isShared        Boolean     @default(false)  // True if it's a shared goal copy
  parentGoalId    String?     // FK to SharedGoal.id if isShared = true
  
  // Relations
  goalSheet       GoalSheet   @relation(fields: [goalSheetId], references: [id])
  parentSharedGoal SharedGoal? @relation(fields: [parentGoalId], references: [id])
  checkins        CheckinRecord[]
  auditLogs       AuditLog[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model SharedGoal {
  id              String    @id @default(cuid())
  createdById     String
  thrustArea      String
  title           String
  description     String?
  uomType         UoMType
  target          Float?
  targetDate      DateTime?
  defaultWeightage Float
  
  // Actual achievement is stored here; all linked goal copies read from this
  actualAchievement Float?
  actualDate        DateTime? // For TIMELINE type
  
  // Relations
  createdBy       User      @relation("SharedGoalCreator", fields: [createdById], references: [id])
  linkedGoals     Goal[]    // All Goal records that reference this shared goal
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model CheckinRecord {
  id                String      @id @default(cuid())
  goalId            String
  quarter           Quarter
  
  // Employee inputs
  actualAchievement Float?
  actualDate        DateTime?   // For TIMELINE uom
  goalStatus        GoalStatus  @default(NOT_STARTED)
  employeeNotes     String?
  
  // Manager inputs
  managerId         String?
  managerComment    String?
  checkinCompleted  Boolean     @default(false)
  checkinCompletedAt DateTime?
  
  // Computed (stored for performance; recomputed on each update)
  progressScore     Float?      // 0–100
  
  // Relations
  goal              Goal        @relation(fields: [goalId], references: [id])
  manager           User?       @relation("ManagerCheckins", fields: [managerId], references: [id])
  
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@unique([goalId, quarter])   // One check-in record per goal per quarter
}

model Notification {
  id          String    @id @default(cuid())
  userId      String
  title       String
  message     String
  link        String?   // Deep link path (e.g., "/goals/sheet/abc")
  isRead      Boolean   @default(false)
  
  user        User      @relation(fields: [userId], references: [id])
  
  createdAt   DateTime  @default(now())
}

model AuditLog {
  id            String    @id @default(cuid())
  userId        String    // Who made the change
  goalId        String?   // Which goal was changed (null for non-goal events)
  action        String    // e.g., "GOAL_EDITED_POST_LOCK", "GOAL_UNLOCKED", "CYCLE_UPDATED"
  fieldChanged  String?   // e.g., "target"
  oldValue      String?
  newValue      String?
  reason        String?   // Required for unlock events
  
  user          User      @relation(fields: [userId], references: [id])
  goal          Goal?     @relation(fields: [goalId], references: [id])
  
  createdAt     DateTime  @default(now())
}

model ThrustArea {
  id          String    @id @default(cuid())
  name        String    @unique
  isDefault   Boolean   @default(false)
  isActive    Boolean   @default(true)
  
  createdAt   DateTime  @default(now())
}

model EscalationRule {
  id              String    @id @default(cuid())
  name            String
  phase           WindowPhase
  triggerAfterDays Int      // Days after window open before escalating
  isActive        Boolean   @default(true)
  
  escalations     Escalation[]
  
  createdAt       DateTime  @default(now())
}

model Escalation {
  id          String            @id @default(cuid())
  userId      String            // Who is being escalated
  ruleId      String
  status      EscalationStatus  @default(PENDING)
  cycleId     String
  resolvedAt  DateTime?
  
  user        User              @relation(fields: [userId], references: [id])
  rule        EscalationRule    @relation(fields: [ruleId], references: [id])
  
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}
```

---

## 5. Authentication & Authorization

### 5.1 Firebase Auth Setup
- Firebase project created; Email/Password provider enabled.
- Client uses `firebase/auth` SDK to sign in and get an ID token.
- Every API request includes the token in the `Authorization: Bearer <token>` header.
- Backend verifies the token using `firebase-admin`.

### 5.2 Authentication Middleware (`authenticate.js`)

```javascript
import admin from 'firebase-admin';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // Look up user in our DB by firebaseUid
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid }
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }
    req.user = user;  // Attach full user object to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 5.3 Authorization Middleware (`authorize.js`)

```javascript
// Usage: router.get('/admin/users', authenticate, authorize('ADMIN'), controller)
// Usage: router.get('/team', authenticate, authorize('MANAGER', 'ADMIN'), controller)

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}
```

### 5.4 Role-Based Access Summary

| Route Group | EMPLOYEE | MANAGER | ADMIN |
|---|---|---|---|
| Own goal sheet CRUD | ✅ | ✅ | ✅ |
| Submit own goal sheet | ✅ | ✅ | ✅ |
| View team goal sheets | ❌ | ✅ | ✅ |
| Approve/Return goal sheet | ❌ | ✅ | ✅ |
| Push shared goals | ❌ | ✅ | ✅ |
| Enter check-in actuals | ✅ | ✅ | ✅ |
| Add manager check-in comment | ❌ | ✅ | ✅ |
| User management | ❌ | ❌ | ✅ |
| Cycle configuration | ❌ | ❌ | ✅ |
| Goal unlock | ❌ | ❌ | ✅ |
| Audit trail | ❌ | ❌ | ✅ |
| Export reports | ❌ | ✅ (team) | ✅ (all) |
| Analytics | ❌ | ✅ (team) | ✅ (all) |

---

## 6. API Design

**Base URL:** `https://telos-api.railway.app/api/v1`

All responses follow this envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] }
}
```

---

### 6.1 Auth Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/sync` | Firebase token | Sync Firebase user to our DB on first login |
| GET | `/auth/me` | Required | Get current user's profile + role |

**POST /auth/sync** — Called on every login. Creates user record if new, returns existing if found.

---

### 6.2 Goal Sheet Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/goal-sheets/mine` | Any | Get own goal sheet for active cycle |
| POST | `/goal-sheets` | Any | Create new goal sheet for current cycle |
| GET | `/goal-sheets/:id` | Owner/Manager/Admin | Get specific goal sheet |
| PATCH | `/goal-sheets/:id/submit` | Owner | Submit goal sheet for approval |
| PATCH | `/goal-sheets/:id/approve` | Manager/Admin | Approve goal sheet |
| PATCH | `/goal-sheets/:id/return` | Manager/Admin | Return for rework (body: { reason }) |
| PATCH | `/goal-sheets/:id/unlock` | Admin | Unlock approved sheet |
| GET | `/goal-sheets/team` | Manager | All goal sheets for direct reports |

**Approval validation (server-side):**
```javascript
// Before approving: re-check weightage
const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
if (totalWeightage !== 100) {
  throw new ValidationError('Total weightage must equal 100%');
}
```

---

### 6.3 Goal Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/goals?sheetId=:id` | Owner/Manager/Admin | Get all goals for a sheet |
| POST | `/goals` | Employee | Create a new goal |
| PATCH | `/goals/:id` | Owner (pre-lock) | Edit a goal |
| DELETE | `/goals/:id` | Owner (pre-lock) | Delete a goal |

**Lock enforcement middleware:**
```javascript
async function checkNotLocked(req, res, next) {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (goal.isLocked) {
    // Log to audit trail if this was an attempted edit
    return res.status(403).json({ error: 'Goal is locked. Contact Admin to unlock.' });
  }
  next();
}
```

---

### 6.4 Check-in Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/checkins?goalId=:id` | Owner/Manager | Get all check-ins for a goal |
| POST | `/checkins` | Employee | Create/update check-in for a quarter |
| PATCH | `/checkins/:id/manager` | Manager | Add manager comment + mark complete |
| GET | `/checkins/team-summary?quarter=Q2` | Manager/Admin | All check-in statuses for team |

**Window enforcement:**
```javascript
async function checkWindowOpen(req, res, next) {
  const { quarter } = req.body;
  const phaseMap = { Q1: 'Q1_CHECKIN', Q2: 'Q2_CHECKIN', Q3: 'Q3_CHECKIN', Q4: 'Q4_CHECKIN' };
  const window = await getCurrentWindow(phaseMap[quarter]);
  if (window.status === 'CLOSED' || window.status === 'FORCE_CLOSED') {
    return res.status(403).json({ error: `${quarter} check-in window is currently closed` });
  }
  next();
}
```

---

### 6.5 User Routes (Admin)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | Admin | List all users (paginated) |
| POST | `/users` | Admin | Create new user |
| PATCH | `/users/:id` | Admin | Update role, manager, department |
| DELETE | `/users/:id` | Admin | Soft-delete (set isActive = false) |
| GET | `/users/:id/reports` | Manager/Admin | Get direct reports |

---

### 6.6 Cycle Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/cycles` | Any | List all cycles |
| GET | `/cycles/active` | Any | Get currently active cycle + window statuses |
| POST | `/cycles` | Admin | Create a new cycle |
| PATCH | `/cycles/:id` | Admin | Update cycle (set active) |
| GET | `/cycles/:id/windows` | Any | Get all windows for a cycle |
| PATCH | `/cycles/:id/windows/:phase` | Admin | Force-open or force-close a specific window |

---

### 6.7 Shared Goal Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/shared-goals` | Manager/Admin | List all shared goals created |
| POST | `/shared-goals` | Manager/Admin | Create and push shared goal |
| GET | `/shared-goals/:id` | Manager/Admin | Get shared goal + linked employees |
| PATCH | `/shared-goals/:id/achievement` | Primary owner | Update actual achievement on source |

---

### 6.8 Notification Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/notifications` | Any | Get own notifications (paginated, newest first) |
| PATCH | `/notifications/:id/read` | Any | Mark notification as read |
| PATCH | `/notifications/read-all` | Any | Mark all as read |

---

### 6.9 Report Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/reports/achievement?cycleId=&quarter=&format=csv` | Manager/Admin | Achievement report |
| GET | `/reports/completion?cycleId=&quarter=` | Manager/Admin | Check-in completion dashboard data |
| GET | `/reports/audit?startDate=&endDate=` | Admin | Audit trail |
| GET | `/reports/analytics/overview` | Manager/Admin | Org-level analytics summary |
| GET | `/reports/analytics/trends` | Manager/Admin | QoQ trend data |
| GET | `/reports/analytics/distribution` | Manager/Admin | Goal distribution by thrust area/UoM |
| GET | `/reports/analytics/manager-effectiveness` | Admin | Manager check-in completion comparison |

---

### 6.10 Admin Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/admin/thrust-areas` | Admin | List all thrust areas |
| POST | `/admin/thrust-areas` | Admin | Add custom thrust area |
| PATCH | `/admin/thrust-areas/:id` | Admin | Toggle active/inactive |
| GET | `/admin/escalation-rules` | Admin | List escalation rules |
| POST | `/admin/escalation-rules` | Admin | Create escalation rule |
| PATCH | `/admin/escalation-rules/:id` | Admin | Update rule |
| GET | `/admin/escalations` | Admin | List all escalation records |
| PATCH | `/admin/escalations/:id/resolve` | Admin | Mark escalation resolved |

---

## 7. Frontend Architecture

### 7.1 Routing Structure (`AppRouter.jsx`)

```jsx
// Route structure
/login                          → LoginPage (public)
/                               → Redirects based on role

// Employee routes
/goals                          → MyGoalsPage
/goals/sheet/:sheetId           → GoalSheetPage (view/edit)
/goals/sheet/:sheetId/checkin   → CheckinEntryPage

// Manager routes
/manager/team                   → TeamDashboardPage
/manager/approve/:sheetId       → ApprovalPage
/manager/checkin/:employeeId    → ManagerCheckinPage

// Admin routes
/admin                          → AdminDashboardPage
/admin/users                    → UserManagementPage
/admin/cycles                   → CycleConfigPage
/admin/audit                    → AuditLogPage
/admin/completion               → CompletionDashboardPage
/admin/analytics                → AnalyticsPage
```

**Protected Route Component:**
```jsx
function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();
  
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return children;
}
```

### 7.2 Auth Context (`AuthContext.jsx`)

```jsx
// Stores: { firebaseUser, appUser, loading, signIn, signOut }
// appUser = the full User record from our DB (includes role, reportingManagerId, etc.)
// On login: Firebase sign-in → get ID token → POST /auth/sync → store appUser
```

### 7.3 Key Component Specs

**WeightageBar (critical UX component)**
```jsx
// Props: goals (array with weightage), totalWeightage
// Shows: progress bar filling to 100%
// Color: red < 100%, green = 100%, red > 100%
// Text: "72 / 100% allocated — 28% remaining"
// Disables submit button when not exactly 100%
```

**GoalForm (most complex component)**
```jsx
// Fields: ThrustArea (select), Title (text), Description (textarea),
//         UoM (select), Target (number or date picker based on UoM),
//         Weightage (number input with min=10)
// Behavior: UoM selection dynamically shows Target as number or date picker
// Shared goal behavior: Title and Target are disabled (read-only) with lock icon
```

**ProgressScoreBadge**
```jsx
// Calls scoreComputer.js utility with { uomType, target, actual, targetDate, actualDate }
// Returns: { score: 75.4, display: "75.4%", color: "green" | "yellow" | "red" }
// Color thresholds: green ≥ 80%, yellow ≥ 50%, red < 50%
// Shows "N/A" for null actuals, "—" for division-by-zero edge cases
```

**NotificationDrawer**
```jsx
// Bell icon in Navbar shows unread count badge
// Clicking opens a right-side slide-over drawer
// Lists notifications with: title, message, time (relative), read indicator
// Each notification is clickable → navigates to the linked page
// "Mark all as read" button at top
// Polling: GET /notifications every 30 seconds (simple approach, no WebSockets)
```

### 7.4 State Management Strategy

- **Server state:** React Query (`useQuery`, `useMutation`) for all API calls.
- **UI state:** Local React state (`useState`) — no global state library needed.
- **Auth state:** React Context (AuthContext).
- **Forms:** React Hook Form + Zod resolver.

React Query cache keys convention:
```
['goalSheet', userId, cycleId]
['goals', sheetId]
['checkins', goalId]
['team', managerId]
['notifications', userId]
['cycles', 'active']
```

### 7.5 Axios Instance Configuration

```javascript
// src/api/axiosInstance.js
import axios from 'axios';
import { auth } from '../firebase/config';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach Firebase token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## 8. Business Logic — Score Computation

### `score.service.js` (Backend) and `scoreComputer.js` (Frontend — same logic)

```javascript
/**
 * Compute progress score for a goal check-in
 * @returns {number|null} Score 0–100, or null if not computable
 */
function computeScore({ uomType, target, actual, targetDate, actualDate }) {
  
  // Guard: no actual entered yet
  if (actual === null && actualDate === null) return null;
  
  switch (uomType) {
    
    case 'NUMERIC_MIN':
    case 'PERCENTAGE_MIN': {
      // Higher is better: Revenue, Units Sold, etc.
      if (target === 0) return null; // Division by zero
      return Math.min(100, (actual / target) * 100);
    }
    
    case 'NUMERIC_MAX':
    case 'PERCENTAGE_MAX': {
      // Lower is better: TAT, Cost, Defects
      if (actual === 0) return 100; // Perfect score — achieved lower than target
      if (target === 0) return null; // Division by zero
      return Math.min(100, (target / actual) * 100);
    }
    
    case 'TIMELINE': {
      // Binary: on-time = 100%, late = 0%
      if (!actualDate || !targetDate) return null;
      return new Date(actualDate) <= new Date(targetDate) ? 100 : 0;
    }
    
    case 'ZERO': {
      // Zero = success (e.g., safety incidents, complaints)
      return actual === 0 ? 100 : 0;
    }
    
    default:
      return null;
  }
}

/**
 * Compute weighted overall score for a goal sheet
 * Only includes goals that have at least one check-in with a score
 */
function computeOverallScore(goalsWithCheckins) {
  const scoredGoals = goalsWithCheckins.filter(g => g.latestScore !== null);
  if (scoredGoals.length === 0) return null;
  
  const weightedSum = scoredGoals.reduce(
    (sum, g) => sum + (g.latestScore * g.weightage / 100), 0
  );
  
  // Denominator is the total weightage of only scored goals
  const totalScoredWeightage = scoredGoals.reduce(
    (sum, g) => sum + g.weightage, 0
  );
  
  return (weightedSum / totalScoredWeightage) * 100;
}

module.exports = { computeScore, computeOverallScore };
```

---

## 9. Shared Goals Implementation

### Flow
1. Manager/Admin calls `POST /shared-goals` with: title, thrustArea, uomType, target, defaultWeightage, recipientIds[].
2. Backend creates one `SharedGoal` record.
3. For each recipientId, backend:
   a. Finds the employee's current `GoalSheet` (creates DRAFT if none).
   b. Checks goal count < 8.
   c. Creates a `Goal` record with `isShared=true` and `parentGoalId=sharedGoal.id`.
   d. Sets weightage = defaultWeightage (employee can change later).
4. Sends in-app + email notification to each recipient.

### Achievement Sync
- When the primary owner enters their actual, it is written to `SharedGoal.actualAchievement`.
- When any linked employee's check-in is viewed, the system reads the actual from the parent `SharedGoal`.
- The `CheckinRecord` for linked employees has `actualAchievement = null` — it always reads from the parent.

```javascript
// In checkin GET handler:
if (goal.isShared && goal.parentGoalId) {
  const parent = await prisma.sharedGoal.findUnique({ 
    where: { id: goal.parentGoalId } 
  });
  checkin.actualAchievement = parent.actualAchievement;
  checkin.actualDate = parent.actualDate;
}
```

### Primary Owner Identification
- The first employee in `recipientIds[]` is treated as the primary owner.
- `SharedGoal.createdById` stores the creator; primary owner is managed separately if needed.
- For simplicity: any admin/manager can update the shared goal's actual via `PATCH /shared-goals/:id/achievement`.

---

## 10. Notification System

### `notification.service.js`

```javascript
async function createNotification({ userId, title, message, link }) {
  await prisma.notification.create({
    data: { userId, title, message, link }
  });
}

async function notifyGoalSubmitted(goalSheet) {
  const manager = await getManager(goalSheet.userId);
  if (!manager) return;
  
  await createNotification({
    userId: manager.id,
    title: 'Goal Sheet Submitted',
    message: `${goalSheet.user.name} has submitted their goal sheet for review.`,
    link: `/manager/approve/${goalSheet.id}`
  });
  
  // Also send email
  await emailService.send({
    to: manager.email,
    subject: 'Action Required: Goal Sheet Submitted',
    templateId: 'goal-submitted',
    data: { managerName: manager.name, employeeName: goalSheet.user.name, sheetId: goalSheet.id }
  });
}
```

All notification trigger functions follow the same pattern. Each has a corresponding email template.

---

## 11. Escalation Engine

### `escalation.job.js` (runs via node-cron)

```javascript
import cron from 'node-cron';
import { checkEscalations } from '../services/escalation.service.js';

// Run every day at 08:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('[Escalation Job] Running daily escalation check...');
  await checkEscalations();
});
```

### `escalation.service.js`

```javascript
async function checkEscalations() {
  const activeCycle = await getActiveCycle();
  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } });
  
  for (const rule of rules) {
    const window = await getWindow(activeCycle.id, rule.phase);
    if (!window || !isOpen(window)) continue;
    
    const daysOpen = daysSince(window.opensAt);
    if (daysOpen < rule.triggerAfterDays) continue;
    
    // Find users who haven't completed the required action
    const offenders = await findOffenders(rule.phase, activeCycle.id);
    
    for (const user of offenders) {
      // Check if not already escalated in this cycle
      const existing = await prisma.escalation.findFirst({
        where: { userId: user.id, ruleId: rule.id, cycleId: activeCycle.id }
      });
      
      if (!existing) {
        await prisma.escalation.create({
          data: { userId: user.id, ruleId: rule.id, cycleId: activeCycle.id }
        });
        await sendEscalationNotification(user, rule, daysOpen);
      }
    }
  }
}

async function findOffenders(phase, cycleId) {
  switch (phase) {
    case 'GOAL_SETTING':
      // Find active employees who have no SUBMITTED or APPROVED goal sheet
      return prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['EMPLOYEE', 'MANAGER'] },
          goalSheets: {
            none: { cycleId, status: { in: ['SUBMITTED', 'APPROVED'] } }
          }
        }
      });
    
    case 'Q1_CHECKIN': // Same pattern for Q2, Q3, Q4
      // Find employees with approved goal sheet but no completed check-ins for Q1
      // ... query logic
  }
}
```

---

## 12. Reporting & Export

### CSV Export (`reports.controller.js`)

```javascript
import * as XLSX from 'xlsx';

async function exportAchievementReport(req, res) {
  const { cycleId, quarter, format = 'csv' } = req.query;
  
  const data = await buildReportData(cycleId, quarter, req.user);
  
  const wsData = data.map(row => ({
    'Employee Name': row.employeeName,
    'Manager': row.managerName,
    'Goal Title': row.goalTitle,
    'Thrust Area': row.thrustArea,
    'UoM': row.uomType,
    'Target': row.target,
    'Q1 Actual': row.q1Actual,
    'Q2 Actual': row.q2Actual,
    'Q3 Actual': row.q3Actual,
    'Q4 Actual': row.q4Actual,
    'Progress Score (%)': row.progressScore,
    'Status': row.status,
  }));
  
  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Achievement Report');
  
  if (format === 'xlsx') {
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="achievement-report.xlsx"');
    return res.send(buffer);
  }
  
  // CSV
  const csv = XLSX.utils.sheet_to_csv(ws);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="achievement-report.csv"');
  return res.send(csv);
}
```

---

## 13. Cycle & Window Management

### Active Window Check (used everywhere)

```javascript
// utils/cycleHelper.js
async function getCurrentWindowStatus(phase) {
  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } });
  if (!cycle) return { isOpen: false };
  
  const window = await prisma.cycleWindow.findUnique({
    where: { cycleId_phase: { cycleId: cycle.id, phase } }
  });
  
  if (!window) return { isOpen: false };
  
  // Admin force overrides take priority
  if (window.status === 'FORCE_OPEN') return { isOpen: true, window };
  if (window.status === 'FORCE_CLOSED') return { isOpen: false, window };
  
  // Otherwise check dates
  const now = new Date();
  const isOpen = now >= window.opensAt && now <= window.closesAt;
  return { isOpen, window };
}
```

---

## 14. Audit Trail

### `auditLogger.js` middleware

```javascript
// Applied as post-middleware on goal PATCH routes
export async function logGoalChangeIfLocked(req, res, next) {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
  
  if (goal.isLocked) {
    // This should have been caught earlier, but log it anyway
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        goalId: goal.id,
        action: 'ATTEMPTED_EDIT_LOCKED_GOAL',
        oldValue: JSON.stringify(goal),
        newValue: JSON.stringify(req.body),
      }
    });
  }
  
  next();
}

// Called explicitly when Admin unlocks a goal
export async function logGoalUnlock({ adminId, goalId, reason }) {
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      goalId,
      action: 'GOAL_UNLOCKED',
      reason,
    }
  });
}
```

---

## 15. Deployment Architecture

### Frontend (Vercel)
```
Repository: github.com/yourname/telos
Framework: Vite (React)
Build command: npm run build
Output dir: dist
Environment variables:
  VITE_API_URL=https://telos-api.railway.app/api/v1
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_PROJECT_ID=...
  VITE_FIREBASE_AUTH_DOMAIN=...
```

### Backend (Railway)
```
Service type: Web Service
Start command: node src/app.js
Environment variables: see Section 17
Health check: GET /health → { "status": "ok" }
```

### Database (Supabase)
```
Plan: Free tier
Region: us-east-1 (or nearest to Railway region)
Connection: Supabase connection string → DATABASE_URL env var
Pooling: Use Supabase's connection pooler for Prisma
```

### Architecture Diagram (for submission)
```
[Browser] ──HTTPS──▶ [Vercel CDN] ──▶ [React App]
                                            │
                                            │ REST API (HTTPS)
                                            ▼
                                    [Railway] ──▶ [Express.js]
                                        │               │
                              [Firebase Admin]   [node-cron]
                                        │         (daily job)
                              [Supabase PostgreSQL]
                                        
[Firebase Auth] ◀──── client SDK ──── [Browser]
[Resend] ◀──── email SDK ──── [Express.js]
```

---

## 16. Seed Data

### Seed script (`prisma/seed.js`)

Creates everything needed for a hackathon demo:

**3 Demo Users (Firebase + DB)**

| Name | Email | Password | Role | Reports To |
|---|---|---|---|---|
| Arjun Sharma | employee@telos.demo | Demo@1234 | EMPLOYEE | Manager |
| Priya Menon | manager@telos.demo | Demo@1234 | MANAGER | Admin |
| Rahul Gupta | admin@telos.demo | Demo@1234 | ADMIN | — |

**1 Active Cycle:** FY2025-26
- All windows FORCE_OPEN (so judges can demo any phase immediately)

**8 Default Thrust Areas:** Revenue Growth, Customer Satisfaction, Operational Excellence, People & Culture, Innovation & Technology, Compliance & Risk Management, Cost Optimization, Strategic Partnerships

**Default Escalation Rules:**
- Goal submission overdue: trigger after 7 days
- Approval overdue: trigger after 5 days
- Check-in overdue: trigger after 10 days

**Pre-populated data (for demo flow):**
- Arjun has a DRAFT goal sheet with 4 goals already created (so demo can start from submit)
- One shared goal already pushed from Priya to Arjun

---

## 17. Environment Variables

### Backend `.env`
```
# Database
DATABASE_URL=postgresql://...@supabase.co:5432/postgres

# Firebase Admin SDK
FIREBASE_PROJECT_ID=telos-hackathon
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@telos-hackathon.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Resend (Email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@telos.app

# App
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://telos.vercel.app
```

### Frontend `.env`
```
VITE_API_URL=https://telos-api.railway.app/api/v1
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=telos-hackathon.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=telos-hackathon
VITE_FIREBASE_APP_ID=1:...
```

---

## 18. Error Handling Standards

### Custom Error Classes (`utils/errors.js`)
```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}
```

### Global Error Handler (last middleware in `app.js`)
```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message: err.message,
      details: err.details || []
    }
  });
});
```

---

## 19. Security Considerations

| Risk | Mitigation |
|---|---|
| Unauthenticated API access | All routes (except /health) require Firebase token via `authenticate` middleware |
| IDOR (accessing other users' data) | All queries filter by `req.user.id` or check manager relationship |
| Editing locked goals | `checkNotLocked` middleware on all goal PATCH/DELETE routes |
| Cross-role data access | `authorize` middleware enforces role on every sensitive route |
| Input injection | Prisma parameterized queries (no raw SQL); Zod input validation |
| CORS | `cors` package configured to only allow `FRONTEND_URL` |
| Rate limiting | `express-rate-limit`: 100 requests per 15 minutes per IP |
| Secrets in code | All secrets in `.env`, never committed; Railway + Vercel env var vaults |
| XSS | React escapes JSX by default; no `dangerouslySetInnerHTML` |

---

*TRD v1.0 — Telos | AtomQuest Hackathon 1.0*
*Tech Stack: React + Tailwind | Express.js + Prisma | PostgreSQL (Supabase) | Firebase Auth | Resend | Vercel + Railway*
