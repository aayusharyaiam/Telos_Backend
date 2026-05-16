import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Look up demo users (created by seed-users.js)
  const employee = await prisma.user.findUnique({ where: { email: 'employee@telos.demo' } })
  const manager = await prisma.user.findUnique({ where: { email: 'manager@telos.demo' } })
  const admin = await prisma.user.findUnique({ where: { email: 'admin@telos.demo' } })

  if (!employee || !manager || !admin) {
    console.log('Demo users not found. Run seed-users.js first.')
    return
  }

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } })
  if (!cycle) {
    console.log('No active cycle found. Run seed.js first.')
    return
  }

  const thrustAreas = await prisma.thrustArea.findMany({ where: { isActive: true } })
  const areaNames = thrustAreas.map((t) => t.name)

  // ── Employee Goal Sheet (SUBMITTED) ──────────────────────
  let sheet = await prisma.goalSheet.findUnique({
    where: { userId_cycleId: { userId: employee.id, cycleId: cycle.id } },
  })

  if (!sheet) {
    sheet = await prisma.goalSheet.create({
      data: {
        userId: employee.id,
        cycleId: cycle.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        goals: {
          create: [
            {
              thrustArea: areaNames[0] || 'Revenue Growth',
              title: 'Increase Q1 pipeline revenue by 25%',
              description: 'Focus on enterprise accounts in the BFSI vertical to accelerate quarterly revenue.',
              uomType: 'NUMERIC_MIN',
              target: 100,
              weightage: 35,
            },
            {
              thrustArea: areaNames[1] || 'Customer Satisfaction',
              title: 'Achieve CSAT score of 4.5+',
              description: 'Implement NPS survey post-onboarding and resolve critical escalations within 24h.',
              uomType: 'NUMERIC_MIN',
              target: 4.5,
              weightage: 25,
            },
            {
              thrustArea: areaNames[2] || 'Operational Excellence',
              title: 'Reduce average ticket resolution time to < 4h',
              description: 'Optimise Tier-1 triage and automate repetitive L1 queries.',
              uomType: 'NUMERIC_MAX',
              target: 4,
              weightage: 20,
            },
            {
              thrustArea: areaNames[3] || 'People & Culture',
              title: 'Complete 2 cross-functional training sessions',
              description: 'Organise knowledge-sharing workshops on data analytics and client communication.',
              uomType: 'NUMERIC_MIN',
              target: 2,
              weightage: 20,
            },
          ],
        },
      },
      include: { goals: true },
    })
    console.log('Created goal sheet for employee with 4 goals.')
  }

  // ── Check-in Records for Q1 ──────────────────────────────
  const goals = await prisma.goal.findMany({ where: { goalSheetId: sheet.id } })
  for (const goal of goals) {
    const existing = await prisma.checkinRecord.findUnique({
      where: { goalId_quarter: { goalId: goal.id, quarter: 'Q1' } },
    })
    if (!existing) {
      await prisma.checkinRecord.create({
        data: {
          goalId: goal.id,
          quarter: 'Q1',
          actualAchievement: goal.title.includes('pipeline') ? 72 : goal.title.includes('CSAT') ? 4.2 : null,
          actualDate: new Date(),
          goalStatus: goal.title.includes('training') ? 'IN_PROGRESS' : 'ON_TRACK',
          employeeNotes: goal.title.includes('pipeline')
            ? 'Closed 3 enterprise deals worth $72K. On track for Q1 target.'
            : goal.title.includes('CSAT')
              ? 'CSAT improved from 3.9 to 4.2. Need to focus on response time.'
              : 'Getting started with the initiatives.',
        },
      })
    }
  }
  console.log(`Seeded Q1 check-in records for ${goals.length} goals.`)

  // ── Manager Check-in (completed for first goal) ──────────
  const firstGoal = goals[0]
  if (firstGoal) {
    const record = await prisma.checkinRecord.findUnique({
      where: { goalId_quarter: { goalId: firstGoal.id, quarter: 'Q1' } },
    })
    if (record && !record.checkinCompleted) {
      await prisma.checkinRecord.update({
        where: { id: record.id },
        data: {
          managerId: manager.id,
          managerComment: 'Good progress on pipeline. Focus on converting the 2 high-value prospects this month.',
          checkinCompleted: true,
          checkinCompletedAt: new Date(),
        },
      })
      console.log('Manager completed check-in for first goal.')
    }
  }

  // ── Notifications ────────────────────────────────────────
  const notifCount = await prisma.notification.count()
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: employee.id,
          title: 'Goal sheet approved',
          message: 'Your Q1 goal sheet has been approved by your manager.',
          link: `/goals/sheet/${sheet.id}`,
          isRead: false,
        },
        {
          userId: employee.id,
          title: 'Q1 check-in reviewed',
          message: 'Your manager has reviewed your Q1 check-in. Check the comments.',
          link: `/goals/sheet/${sheet.id}/checkin?quarter=Q1`,
          isRead: false,
        },
        {
          userId: manager.id,
          title: 'Goal sheet submitted',
          message: 'employee@telos.demo has submitted a goal sheet for your review.',
          link: `/manager/approve/${sheet.id}`,
          isRead: false,
        },
        {
          userId: admin.id,
          title: 'New cycle active',
          message: 'FY2025-26 cycle is now active. All windows are force-open for testing.',
          link: '/admin/cycles',
          isRead: true,
        },
      ],
    })
    console.log('Seeded 4 notifications.')
  }

  // ── Audit Logs ───────────────────────────────────────────
  const auditCount = await prisma.auditLog.count()
  if (auditCount === 0) {
    await prisma.auditLog.createMany({
      data: [
        {
          userId: admin.id,
          action: 'USER_CREATED',
          fieldChanged: 'role',
          newValue: 'ADMIN',
          reason: 'Seeded admin account for demo',
        },
        {
          userId: admin.id,
          action: 'CYCLE_WINDOW_UPDATED',
          fieldChanged: 'status',
          oldValue: 'CLOSED',
          newValue: 'FORCE_OPEN',
          reason: 'Force-opened all windows for judge testing',
        },
      ],
    })
    console.log('Seeded 2 audit log entries.')
  }

  // ── Escalation Rule ──────────────────────────────────────
  const ruleCount = await prisma.escalationRule.count()
  if (ruleCount === 0) {
    await prisma.escalationRule.create({
      data: {
        name: 'Approval Overdue',
        phase: 'GOAL_SETTING',
        triggerAfterDays: 3,
        isActive: true,
      },
    })
    console.log('Seeded 1 escalation rule.')
  }

  console.log('Demo data seeding complete!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
