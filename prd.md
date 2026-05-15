# Telos — Product Requirements Document (PRD)
**AtomQuest Hackathon 1.0 | In-House Goal Setting & Tracking Portal**
**Version:** 1.0 | **Last Updated:** 2026-05-16

---

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Goals & Success Criteria](#2-goals--success-criteria)
3. [User Personas & Roles](#3-user-personas--roles)
4. [Feature Requirements — Phase 1: Goal Creation & Approval](#4-feature-requirements--phase-1-goal-creation--approval)
5. [Feature Requirements — Phase 2: Achievement Tracking & Check-ins](#5-feature-requirements--phase-2-achievement-tracking--check-ins)
6. [Shared Goals](#6-shared-goals)
7. [Notifications & Alerts](#7-notifications--alerts)
8. [Reporting & Governance](#8-reporting--governance)
9. [Admin Configuration Panel](#9-admin-configuration-panel)
10. [Bonus Features](#10-bonus-features)
11. [Check-in Schedule & Cycle Management](#11-check-in-schedule--cycle-management)
12. [Validation Rules Summary](#12-validation-rules-summary)
13. [UX & Design Principles](#13-ux--design-principles)
14. [Out of Scope (v1.0)](#14-out-of-scope-v10)

---

## 1. Product Overview

**Telos** is a web-based Goal Setting & Tracking Portal built to digitize the full lifecycle of employee performance goals — from creation and manager approval to quarterly check-ins and year-end reporting. It eliminates reliance on spreadsheets and email chains, giving employees, managers, and HR/Admin real-time visibility and accountability across the organization.

The name *Telos* (Greek for "purpose" or "end goal") reflects the product's mission: connecting every employee's daily work to the organization's broader purpose.

### Core Value Propositions
- Employees know exactly what they're being measured on and can track their own progress.
- Managers have a real-time view of team progress without chasing status updates.
- HR/Admin have audit-ready records and exportable reports for appraisal cycles.

---

## 2. Goals & Success Criteria

### Hackathon Evaluation Criteria (mapped to features)

| Evaluation Parameter | How Telos Addresses It |
|---|---|
| Functionality end-to-end | Full employee → manager → admin journey without errors |
| Adherence to BRD | All Phase 1 & Phase 2 requirements implemented; all validation rules enforced |
| User Friendliness | Clean role-based dashboards, inline validation, helpful error messages |
| Absence of Bugs | Edge cases handled: 100% weightage check, locked goal protection, empty state handling |
| Good-to-Have Features | Analytics dashboard, escalation engine, email notifications via Resend |
| Cost Optimisation | Vercel (free) + Railway (free) + Supabase (free) + Firebase Auth (free) + Resend (free) |

### Definition of Done (Minimum)
- [ ] An Employee can create a goal sheet, submit for approval, and log quarterly achievements.
- [ ] A Manager can review, edit, approve, or return a goal sheet; and conduct quarterly check-ins.
- [ ] An Admin can manage users, configure cycles, unlock goals, and export reports.
- [ ] All validation rules are enforced on both frontend and backend.
- [ ] A live hosted URL is accessible with seeded demo credentials for all 3 roles.

---

## 3. User Personas & Roles

### 3.1 Employee
**Who:** Any staff member who has performance goals assigned for the cycle.

**Core needs:**
- Create and submit a structured goal sheet before the cycle deadline.
- See clearly when goals are approved, returned, or locked.
- Log quarterly actual achievements with minimal friction.
- Understand their own progress scores without needing to do manual calculations.

**Capabilities in Telos:**
- Create, edit, and submit own goal sheet (pre-approval only).
- View locked goals (read-only post-approval).
- Enter actual achievement per quarter during open check-in windows.
- Update goal status: Not Started / On Track / Completed.
- View calculated progress scores per goal and overall.
- Receive in-app and email notifications on key events.
- View shared goals pushed to them (weightage-editable, target read-only).

### 3.2 Manager (L1)
**Who:** Team leads or department heads with direct reports.

**Core needs:**
- Review team goal sheets without needing to chase employees.
- Provide structured feedback on goals before approving.
- Conduct quarterly check-ins with documented commentary.
- Monitor team-level progress at a glance.

**Capabilities in Telos:**
- View all direct reports and their goal sheet submission status.
- Open any submitted goal sheet and review goals.
- Inline-edit target values and weightages during the approval phase.
- Approve or Return a goal sheet (with a mandatory return reason).
- View Planned vs. Actual for each direct report per quarter.
- Add structured check-in comments per employee per quarter.
- Push shared/departmental KPI goals to selected employees.
- Receive notifications when a team member submits or updates goals.

**Note:** A Manager is also an Employee — they have their own goal sheet that is reviewed by their own L1 manager (or Admin if they are top-level).

### 3.3 Admin / HR
**Who:** HR business partners or system administrators.

**Core needs:**
- Configure and manage the annual goal-setting cycle.
- Handle exceptions (unlock goals, override windows).
- Monitor organization-wide progress and compliance.
- Export data for appraisal processing.

**Capabilities in Telos:**
- Full CRUD on users and role assignments.
- Set reporting relationships (who reports to whom).
- Manage cycle configurations (open/close dates per phase).
- Manually force-open or force-close any check-in window (override).
- Unlock locked goals on behalf of any employee.
- Manage Thrust Areas (view hardcoded defaults; add custom ones).
- View organization-wide completion dashboard.
- Export achievement reports (CSV/Excel).
- View full audit trail of all post-lock goal changes.
- Push shared/departmental goals to multiple employees.
- View escalation logs and resolve escalations.

---

## 4. Feature Requirements — Phase 1: Goal Creation & Approval

### 4.1 Goal Sheet Creation (Employee)

**Entry Point:** Employee logs in → lands on "My Goals" dashboard → clicks "Create Goal Sheet" if none exists for the current cycle.

**Goal Sheet Properties:**
- Belongs to one Employee, one Cycle (e.g., FY2025-26).
- Status: `DRAFT` | `SUBMITTED` | `APPROVED` | `RETURNED`.
- Contains 1–8 individual Goals.

**Individual Goal Fields:**

| Field | Type | Rules |
|---|---|---|
| Thrust Area | Dropdown (predefined list) | Required |
| Goal Title | Text (max 150 chars) | Required |
| Goal Description | Textarea (max 500 chars) | Optional |
| Unit of Measurement (UoM) | Dropdown: Numeric-Min, Numeric-Max, %, Timeline, Zero | Required |
| Target Value | Number or Date (based on UoM) | Required |
| Weightage (%) | Number | Min 10%, must be integer |
| Quarter Targets | Optional — Q1/Q2/Q3/Q4 milestone targets | Optional |

**Live Weightage Calculator:**
- A persistent banner/sidebar shows: "Total Weightage: 75% / 100%"
- Turns green when exactly 100%.
- Turns red and blocks submission if not 100%.
- Shows remaining allocatable % dynamically as user enters/changes weightage.

**Thrust Areas (Hardcoded defaults, Admin can add more):**
1. Revenue Growth
2. Customer Satisfaction
3. Operational Excellence
4. People & Culture
5. Innovation & Technology
6. Compliance & Risk Management
7. Cost Optimization
8. Strategic Partnerships

**Saving behavior:**
- Goals auto-save as `DRAFT` every 30 seconds and on blur.
- Employee can explicitly save without submitting.
- Submission is a deliberate action with a confirmation modal.

**Submission:**
- Frontend validates all rules before calling the API.
- Backend re-validates on the server (never trust only the client).
- On successful submission: Goal Sheet status → `SUBMITTED`; employee cannot edit; manager is notified.

### 4.2 Validation Rules (Must Be Airtight)

| Rule | Enforcement |
|---|---|
| Total weightage must equal exactly 100% | Frontend live indicator + backend on submit |
| Minimum 10% per goal | Frontend per-field + backend |
| Maximum 8 goals per employee per cycle | Backend checks count before insert |
| Goal Sheet can only be submitted once per cycle | Backend checks for existing submitted/approved sheet |
| Cannot submit empty goal sheet (0 goals) | Frontend button disabled + backend check |

### 4.3 Manager Approval Workflow

**State Machine:**
```
DRAFT ──submit──▶ SUBMITTED ──approve──▶ APPROVED (LOCKED)
                      │
                   return──▶ RETURNED ──resubmit──▶ SUBMITTED
```

**Manager View — Approval Screen:**
- Lists all goals with full details in a table/card layout.
- Each goal row has editable fields for Target and Weightage (inline editing).
- Manager-edited values are highlighted visually (e.g., yellow background) to distinguish from employee's original.
- A diff view shows original vs. manager-edited values.
- Approve button: requires total weightage = 100% (manager edits must also satisfy rules).
- Return button: opens a modal requiring a mandatory return reason (text field, min 20 chars).

**On Approval:**
- Goal Sheet status → `APPROVED`.
- All goals are locked — any PUT/PATCH on locked goals returns `403 Forbidden`.
- Employee receives in-app + email notification: "Your goal sheet has been approved."
- Manager's edited values (if any) are saved as the final targets.

**On Return:**
- Goal Sheet status → `RETURNED`.
- Return reason is saved and displayed prominently to the employee.
- Employee can edit goals and resubmit.
- Employee receives in-app + email notification with the return reason.

**Admin Unlock:**
- Admin can set any goal's `isLocked` flag to `false`.
- This action is logged in the Audit Trail with: Admin ID, Goal ID, timestamp, reason.
- After Admin unlock, employee can edit and resubmit; manager must re-approve.

---

## 5. Feature Requirements — Phase 2: Achievement Tracking & Check-ins

### 5.1 Quarterly Check-in Windows

| Period | Window Opens | What Happens |
|---|---|---|
| Goal Setting | 1st May | Goal creation, submission, approval |
| Q1 Check-in | July | Employees log Q1 actuals; managers review |
| Q2 Check-in | October | Employees log Q2 actuals; managers review |
| Q3 Check-in | January | Employees log Q3 actuals; managers review |
| Q4 / Annual | March–April | Final achievement capture |

**Window behavior:**
- Outside a window: achievement entry fields are **read-only/disabled** for employees.
- Admin can force-open or force-close any window (override for demos/exceptions).
- A prominent banner on the employee dashboard shows: "Q2 Check-in is open — update your achievements by Oct 31."

### 5.2 Employee Achievement Entry

**Per Goal, Per Quarter:**

| Field | Type | Rules |
|---|---|---|
| Actual Achievement | Number or Date (based on UoM) | Required when window is open |
| Status | Dropdown: Not Started / On Track / Completed | Required |
| Notes (optional) | Text (max 300 chars) | Optional — employee's own comment |

**Achievement is cumulative:** The value entered represents total achievement to date, not just this quarter's increment. (e.g., Q2 entry of 75 means 75 total units achieved as of Q2, not 75 more than Q1.)

### 5.3 Progress Score Computation

Computed automatically by the system. Never manually entered.

| UoM Type | Direction | Formula | Cap |
|---|---|---|---|
| Numeric (Min) | Higher is better (e.g., Sales Revenue) | `(Actual / Target) × 100` | 100% |
| Numeric (Max) | Lower is better (e.g., TAT, Cost) | `(Target / Actual) × 100` | 100% |
| % (Min) | Higher is better | `(Actual / Target) × 100` | 100% |
| % (Max) | Lower is better | `(Target / Actual) × 100` | 100% |
| Timeline | Date-based | `completedDate <= deadline → 100%; else → 0%` | 100% |
| Zero | Zero = success (e.g., Safety incidents) | `actual === 0 → 100%; else → 0%` | 100% |

**Edge cases:**
- If `actual = 0` and UoM is Numeric-Max (lower is better): treat as 100% (target achieved perfectly).
- If `target = 0` and UoM is Numeric-Min: show "N/A" — division by zero guard.
- If no actual has been entered yet: show "—" not 0%.
- All scores are **displayed only** — they are never used for formal ratings in v1.

**Weighted Overall Score:**
- `overallScore = Σ (goalScore × goalWeightage / 100)`
- Displayed as a percentage on the employee's dashboard.

### 5.4 Manager Check-in Module

**Manager View — Check-in Screen (per employee, per quarter):**
- Table showing: Goal Title | Thrust Area | Target | Q{n} Actual | Status | Progress Score
- A "Planned vs. Actual" comparison column.
- "Check-in Comment" text area (required for the check-in to be marked complete).
- Submit Check-in button — marks this employee's Q{n} check-in as complete.

**Check-in status tracking:**
- Each employee×quarter combination has a `checkinComplete: boolean`.
- The completion dashboard reads this field.

---

## 6. Shared Goals

### 6.1 What Are Shared Goals?
A departmental or organizational KPI that applies to multiple employees simultaneously. Created by Admin or Manager, pushed to selected employees.

### 6.2 Creating a Shared Goal
1. Admin or Manager navigates to "Shared Goals" section.
2. Fills in: Goal Title, Description, Thrust Area, UoM, Target, Default Weightage.
3. Selects recipient employees from a searchable multi-select list.
4. Clicks "Push to Employees."

### 6.3 Recipient Employee Experience
- The shared goal appears on the employee's goal sheet automatically.
- Goal Title and Target are **read-only** — employee cannot change them.
- Weightage is **editable** — employee can adjust to fit their 100% total.
- A visual indicator (e.g., a lock icon + "Shared" badge) distinguishes shared goals from personal goals.
- Shared goals count toward the maximum of 8 goals.

### 6.4 Achievement Sync
- Achievement data is stored on the **primary (source) goal record** only.
- When the primary owner logs their actual, all linked employee copies display the same actual automatically.
- If the primary owner has not entered actuals, linked copies show "Awaiting owner update."
- The progress score on each linked employee's sheet is computed from the shared actual.

### 6.5 Edge Cases
- If a recipient employee's total weightage exceeds 100% after receiving a shared goal, a warning banner appears asking them to rebalance before they can submit.
- If the primary owner's goal sheet is not yet approved, linked copies are still visible but show "Pending."

---

## 7. Notifications & Alerts

### 7.1 In-App Notifications
A notification bell icon in the navbar shows unread count. Clicking opens a notification drawer.

| Trigger | Recipient | Message |
|---|---|---|
| Employee submits goal sheet | Manager | "{Employee Name} has submitted their goal sheet for review." |
| Manager approves goal sheet | Employee | "Your goal sheet has been approved! Goals are now locked." |
| Manager returns goal sheet | Employee | "Your goal sheet was returned. Reason: {reason}. Please revise and resubmit." |
| Q{n} check-in window opens | All Employees + Managers | "Q{n} Check-in is now open. Update your achievements by {date}." |
| Manager completes check-in | Employee | "Your Q{n} check-in has been completed by your manager." |
| Shared goal pushed to employee | Employee | "A shared goal '{title}' has been added to your goal sheet." |
| Admin unlocks a goal | Employee | "Your goal '{title}' has been unlocked by Admin. Please update and resubmit." |
| Escalation triggered | Manager / Admin | "Escalation: {Employee Name} has not submitted goals {N} days after cycle open." |

### 7.2 Email Notifications (via Resend)
Same triggers as in-app notifications. Emails are sent in addition to, not instead of, in-app notifications.

**Email design:** Simple, clean transactional template with:
- Telos logo and branding.
- Clear subject line.
- Action button with deep link to the relevant page.
- Footer with unsubscribe option.

**Events that trigger emails:**
- Goal sheet submitted (to manager).
- Goal sheet approved (to employee).
- Goal sheet returned with reason (to employee).
- Check-in window opened (to all active users).
- Escalation alert (to manager and/or Admin).

---

## 8. Reporting & Governance

### 8.1 Achievement Report (Exportable)
Available to: Admin, Manager (for own team only)

**Filters:**
- Cycle (e.g., FY2025-26)
- Quarter (Q1/Q2/Q3/Q4/All)
- Department / Manager
- Employee (search)
- Status (Approved / Submitted / Draft)

**Columns in export:**
`Employee Name | Employee ID | Manager | Department | Goal Title | Thrust Area | UoM | Target | Q1 Actual | Q2 Actual | Q3 Actual | Q4 Actual | Progress Score (%) | Weighted Score | Status`

**Export formats:** CSV (primary), Excel (.xlsx) (bonus).

### 8.2 Completion Dashboard (Real-time)
Available to: Admin, Manager (filtered to own team)

**Shows:**
- Grid of employees × quarters with colored indicators:
  - 🟢 Green: Check-in completed
  - 🟡 Yellow: Window open, not yet completed
  - ⚪ Grey: Window not yet open
  - 🔴 Red: Window closed, not completed (missed)
- Summary stats: "12/20 employees completed Q2 check-in (60%)"
- Filterable by manager, department.

### 8.3 Audit Trail
Available to: Admin only

**Logged events:**
- Any goal edit after the lock date (field changed, old value, new value, user, timestamp).
- Goal unlock by Admin (who unlocked, which goal, reason, timestamp).
- Cycle configuration changes (who changed, what changed, timestamp).
- User role changes.

**Display:** Paginated table with filters by date range, user, goal ID.

---

## 9. Admin Configuration Panel

### 9.1 User Management
- View all users in a searchable, filterable table.
- Create new user (name, email, role, reporting manager).
- Edit user role and reporting manager.
- Deactivate user (soft delete — data preserved; user cannot log in).
- Bulk import users via CSV (bonus).

### 9.2 Cycle Management
- Create a new goal-setting cycle with a name (e.g., "FY2025-26").
- Set open/close dates for: Goal Setting, Q1, Q2, Q3, Q4 windows.
- **Force-open / Force-close** any window independently (critical for demos and exceptions).
- Archive old cycles (data preserved, no new entries).

### 9.3 Thrust Area Management
- View the 8 hardcoded default Thrust Areas.
- Add custom Thrust Areas (name + optional description).
- Deactivate a Thrust Area (goals already using it are not affected).

### 9.4 Goal Unlock
- Search for an employee and their goal sheet.
- Select specific goals to unlock.
- Enter a mandatory unlock reason.
- Confirm — goal is unlocked and audit log entry is created.

---

## 10. Bonus Features

### 10.1 Analytics Module
**Accessible to:** Admin (full org), Manager (own team)

**Dashboards:**

**A. Organization Overview**
- Total employees enrolled in current cycle.
- % goal sheets submitted, approved, pending.
- % check-ins completed per quarter.
- Average weighted achievement score across org.

**B. Quarter-on-Quarter Trend**
- Line chart: average achievement score per quarter, per cycle.
- Filterable by department or manager.

**C. Goal Distribution Heatmap**
- Breakdown by Thrust Area: how many goals fall under each area.
- Breakdown by UoM type.
- Breakdown by status (Not Started / On Track / Completed).

**D. Manager Effectiveness Dashboard**
- Table of all managers with: # direct reports, % check-ins completed on time, avg team score.
- Sortable — helps HR identify managers who are consistently late on check-ins.

### 10.2 Escalation Module (Rule-Based)

**Configurable Rules (Admin sets these):**

| Escalation Rule | Trigger Condition |
|---|---|
| Goal submission overdue | Employee has not submitted goals within N days of cycle open |
| Approval overdue | Manager has not approved within N days of submission |
| Check-in overdue | Employee has not entered actuals N days into check-in window |
| Manager check-in overdue | Manager has not completed check-in N days into window |

**Escalation Chain:**
1. Day N: Auto-email reminder to the person responsible.
2. Day N+3: Second reminder.
3. Day N+7: Escalation email sent to their manager / Admin.

**Escalation Log:**
- Visible to Admin.
- Shows: who was escalated, which rule triggered, what action was taken, current status.
- Admin can manually mark an escalation as "Resolved."

**Implementation:** A scheduled job (cron) runs daily at midnight, checks conditions, and fires emails/notifications via Resend.

### 10.3 Email Notifications
- Provider: Resend (free tier: 3,000 emails/month).
- Triggers: All events listed in Section 7.2.
- Template: HTML email with Telos branding, deep links, clear CTA button.

---

## 11. Check-in Schedule & Cycle Management

### Default FY2025-26 Cycle Dates

| Phase | Opens | Closes | Notes |
|---|---|---|---|
| Goal Setting | 1 May 2025 | 31 May 2025 | Employees submit; managers approve |
| Q1 Check-in | 1 July 2025 | 31 July 2025 | Actuals for Apr–Jun |
| Q2 Check-in | 1 Oct 2025 | 31 Oct 2025 | Actuals for Apr–Sep |
| Q3 Check-in | 1 Jan 2026 | 31 Jan 2026 | Actuals for Apr–Dec |
| Q4 / Annual | 1 Mar 2026 | 30 Apr 2026 | Final actuals |

**Admin Force-Override:** Admin can set any phase to `OPEN` or `CLOSED` regardless of dates. This is essential for hackathon demos — judges need to walk through all phases in one sitting.

---

## 12. Validation Rules Summary

| Rule | Location | Error Message |
|---|---|---|
| Total weightage ≠ 100% | Submit button disabled + inline | "Total weightage must be exactly 100%. Currently: {X}%" |
| Goal weightage < 10% | Per-field | "Minimum weightage per goal is 10%" |
| Goal weightage > 90% (when other goals exist) | Per-field warning | "This leaves very little room for other goals" |
| More than 8 goals | Add Goal button disabled | "Maximum 8 goals allowed per cycle" |
| Empty goal title | Per-field | "Goal title is required" |
| No goals at all | Submit blocked | "Please add at least one goal before submitting" |
| Duplicate goal submission | Backend | "A goal sheet for this cycle already exists" |
| Edit locked goal | Backend 403 | "This goal sheet has been approved and is locked" |
| Achievement entry outside window | Frontend disabled | "The Q{n} check-in window is currently closed" |
| Division by zero (target = 0 on Min UoM) | Score computation | Display "N/A" |

---

## 13. UX & Design Principles

### Design System
- **Color palette:** Deep indigo primary (#4F46E5), emerald accent (#10B981), neutral grays.
- **Font:** Inter (clean, professional, readable).
- **Component library:** Custom Tailwind components — cards, modals, tables, badges, progress bars.
- **Responsive:** Desktop-first (primary use case is corporate laptops) but mobile-readable.

### UX Principles
1. **Role clarity:** Each role has a clearly distinct dashboard. No role should feel lost.
2. **Progressive disclosure:** Show only what's relevant to the current state (e.g., "Submit" only appears when weightage = 100%).
3. **Inline validation:** Never make users submit a form to find out there's an error.
4. **Helpful empty states:** When a manager has no team members yet, show a helpful message — not a blank screen.
5. **Confirmation on destructive actions:** Approve, Return, Unlock — all require a confirmation modal.
6. **Accessible error messages:** Errors explain what went wrong AND what to do to fix it.

### Key Screens
1. Login Page (role-agnostic)
2. Employee — My Goals (dashboard + goal list)
3. Employee — Create/Edit Goal Sheet
4. Employee — Check-in Entry Form
5. Manager — Team Overview Dashboard
6. Manager — Goal Approval Screen (per employee)
7. Manager — Check-in View (per employee, per quarter)
8. Admin — User Management Table
9. Admin — Cycle Configuration
10. Admin — Completion Dashboard
11. Admin — Audit Trail
12. Admin — Analytics Dashboard (bonus)
13. Shared — Notification Drawer (all roles)
14. Shared — Settings / Profile

---

## 14. Out of Scope (v1.0)

- Microsoft Entra ID / Azure AD SSO (deferred post-hackathon).
- Microsoft Teams bot integration (deferred post-hackathon).
- Mobile native app (web only).
- 360-degree feedback or peer reviews.
- Automated payroll or performance rating integration.
- Multi-language / localization support.
- Dark mode.
- Offline mode / PWA functionality.

---

*PRD v1.0 — Telos | AtomQuest Hackathon 1.0*
