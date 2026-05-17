import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@telos.demo' } })
  const manager = await prisma.user.findUnique({ where: { email: 'manager@telos.demo' } })
  const employee = await prisma.user.findUnique({ where: { email: 'employee@telos.demo' } })

  if (!admin || !manager || !employee) {
    console.log('Run seed-users.js first!')
    return
  }

  const cycle = await prisma.cycle.findFirst({ where: { isActive: true } })
  if (!cycle) {
    console.log('Run seed.js first!')
    return
  }

  const thrustAreas = await prisma.thrustArea.findMany({ where: { isActive: true } })
  const areaNames = thrustAreas.map((t) => t.name)
  const getArea = (i) => areaNames[i % areaNames.length] || 'Revenue Growth'

  // Create more demo employees under the same manager
  const employees = [employee]
  const moreEmails = [
    { email: 'sarah@telos.demo', name: 'Sarah Johnson', department: 'Engineering' },
    { email: 'mike@telos.demo', name: 'Mike Chen', department: 'Sales' },
    { email: 'lisa@telos.demo', name: 'Lisa Wang', department: 'Marketing' },
    { email: 'john@telos.demo', name: 'John Smith', department: 'Operations' },
    { email: 'emma@telos.demo', name: 'Emma Davis', department: 'Engineering' },
  ]

  for (const emp of moreEmails) {
    let user = await prisma.user.findUnique({ where: { email: emp.email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: `demo-${emp.email}`,
          email: emp.email,
          name: emp.name,
          role: 'EMPLOYEE',
          department: emp.department,
          reportingManagerId: manager.id,
          isActive: true,
        },
      })
    }
    employees.push(user)
  }
  console.log(`Created ${employees.length} employees`)

  // Create goal sheets for all employees
  for (const emp of employees) {
    let sheet = await prisma.goalSheet.findUnique({
      where: { userId_cycleId: { userId: emp.id, cycleId: cycle.id } },
    })

    if (!sheet) {
      const goals = [
        { title: `${emp.name.split(' ')[0]}'s Q1 Sales Target`, target: 150000, weight: 30, area: getArea(0) },
        { title: 'Customer Acquisition Target', target: 25, weight: 25, area: getArea(1) },
        { title: 'Product Delivery Milestone', target: 3, weight: 20, area: getArea(2) },
        { title: 'Team Collaboration Initiatives', target: 5, weight: 15, area: getArea(3) },
        { title: 'Professional Development Goals', target: 3, weight: 10, area: getArea(0) },
      ]

      const statusOptions = ['SUBMITTED', 'APPROVED', 'RETURNED']
      const status = statusOptions[Math.floor(Math.random() * statusOptions.length)]

      sheet = await prisma.goalSheet.create({
        data: {
          userId: emp.id,
          cycleId: cycle.id,
          status: status,
          submittedAt: status !== 'DRAFT' ? new Date() : null,
          approvedAt: status === 'APPROVED' ? new Date() : null,
          goals: {
            create: goals.map((g, i) => ({
              thrustArea: g.area,
              title: g.title,
              description: `Key objective for Q1 - ${g.area} focus area. Deliver measurable results.`,
              uomType: i < 2 ? 'NUMERIC_MIN' : i === 2 ? 'NUMERIC_MIN' : 'NUMERIC_MIN',
              target: g.target,
              weightage: g.weight,
            })),
          },
        },
        include: { goals: true },
      })
    }

    // Add check-in records for Q1, Q2, Q3
    const quarters = ['Q1', 'Q2', 'Q3']
    for (const q of quarters) {
      for (const goal of sheet.goals) {
        const existing = await prisma.checkinRecord.findUnique({
          where: { goalId_quarter: { goalId: goal.id, quarter: q } },
        })

        if (!existing) {
          const actuals = [goal.target * 0.85, goal.target * 0.92, goal.target * 1.05, goal.target * 0.78]
          const statuses = ['ON_TRACK', 'ON_TRACK', 'COMPLETED', 'AT_RISK']
          
          await prisma.checkinRecord.create({
            data: {
              goalId: goal.id,
              quarter: q,
              actualAchievement: actuals[Math.floor(Math.random() * actuals.length)],
              actualDate: new Date(),
              goalStatus: statuses[Math.floor(Math.random() * statuses.length)],
              employeeNotes: `Progress update for ${q}. Working towards target.`,
              managerId: q === 'Q3' ? manager.id : null,
              managerComment: q === 'Q3' ? 'Good progress this quarter.' : null,
              checkinCompleted: q === 'Q3' ? true : Math.random() > 0.3,
              checkinCompletedAt: q === 'Q3' ? new Date() : null,
            },
          })
        }
      }
    }
  }
  console.log('Created goal sheets with check-ins for all employees')

  // Create shared goals
  const existingShared = await prisma.sharedGoal.count()
  if (existingShared === 0) {
    await prisma.sharedGoal.createMany({
      data: [
        {
          primaryOwnerId: employee.id,
          creatorId: manager.id,
          title: 'Q1 Company-Wide Revenue Target',
          description: 'Cross-functional revenue target for Q1',
          weightage: 50,
          thrustArea: getArea(0),
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
        },
        {
          primaryOwnerId: manager.id,
          creatorId: admin.id,
          title: 'Customer Satisfaction Initiative',
          description: 'Improve overall CSAT to 4.5+',
          weightage: 30,
          thrustArea: getArea(1),
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-06-30'),
        },
        {
          primaryOwnerId: employee.id,
          creatorId: admin.id,
          title: 'Digital Transformation Project',
          description: 'Modernize internal tools and processes',
          weightage: 40,
          thrustArea: getArea(2),
          status: 'ACTIVE',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-05-31'),
        },
      ],
    })
    console.log('Created shared goals')
  }

  // Create more notifications
  const notifCount = await prisma.notification.count()
  if (notifCount < 20) {
    const notifs = []
    for (let i = 0; i < 15; i++) {
      notifs.push({
        userId: employee.id,
        title: i % 3 === 0 ? 'Goal sheet approved' : i % 3 === 1 ? 'Check-in reminder' : 'Team update',
        message: `Notification message #${i + 1} for demo purposes`,
        link: '/dashboard',
        isRead: Math.random() > 0.5,
      })
    }
    await prisma.notification.createMany({ data: notifs })
    console.log('Created additional notifications')
  }

  // Create more audit logs
  const auditCount = await prisma.auditLog.count()
  if (auditCount < 15) {
    const auditActions = [
      { action: 'GOAL_SHEET_SUBMITTED', fieldChanged: 'status', newValue: 'SUBMITTED' },
      { action: 'GOAL_SHEET_APPROVED', fieldChanged: 'status', newValue: 'APPROVED' },
      { action: 'CHECKIN_COMPLETED', fieldChanged: 'checkinCompleted', newValue: 'true' },
      { action: 'USER_CREATED', fieldChanged: 'role', newValue: 'EMPLOYEE' },
      { action: 'CYCLE_WINDOW_UPDATED', fieldChanged: 'windowStatus', newValue: 'OPEN' },
      { action: 'SHARED_GOAL_CREATED', fieldChanged: 'title', newValue: 'Revenue Target' },
      { action: 'ESCALATION_CREATED', fieldChanged: 'status', newValue: 'PENDING' },
      { action: 'ESCALATION_RESOLVED', fieldChanged: 'status', newValue: 'RESOLVED' },
    ]

    const auditLogs = []
    for (let i = 0; i < 10; i++) {
      const act = auditActions[i % auditActions.length]
      auditLogs.push({
        userId: i % 2 === 0 ? admin.id : manager,
        action: act.action,
        fieldChanged: act.fieldChanged,
        newValue: act.newValue,
        reason: `Demo audit log entry ${i + 1}`,
      })
    }
    await prisma.auditLog.createMany({ data: auditLogs })
    console.log('Created additional audit logs')
  }

  // Create email logs
  const emailLogCount = await prisma.emailLog.count()
  if (emailLogCount < 10) {
    const emailTemplates = [
      { subject: 'Goal Sheet Approved', type: 'GOAL_APPROVED' },
      { subject: 'Q1 Check-in Reminder', type: 'CHECKIN_REMINDER' },
      { subject: 'Escalation Alert', type: 'ESCALATION' },
      { subject: 'New Notification', type: 'NOTIFICATION' },
      { subject: 'Weekly Digest', type: 'WEEKLY_DIGEST' },
    ]

    const emailLogs = []
    for (let i = 0; i < 8; i++) {
      const tmpl = emailTemplates[i % emailTemplates.length]
      emailLogs.push({
        recipientEmail: employee.email,
        subject: tmpl.subject,
        templateType: tmpl.type,
        status: i % 3 === 0 ? 'SENT' : i % 3 === 1 ? 'DELIVERED' : 'FAILED',
        sentAt: new Date(Date.now() - i * 86400000),
      })
    }
    await prisma.emailLog.createMany({ data: emailLogs })
    console.log('Created email logs')
  }

  // Ensure escalation rules exist
  const ruleCount = await prisma.escalationRule.count()
  if (ruleCount === 0) {
    await prisma.escalationRule.createMany({
      data: [
        { name: 'Goal Sheet Overdue', phase: 'GOAL_SETTING', triggerAfterDays: 3, isActive: true },
        { name: 'Q1 Check-in Overdue', phase: 'Q1_CHECKIN', triggerAfterDays: 2, isActive: true },
        { name: 'Q2 Check-in Overdue', phase: 'Q2_CHECKIN', triggerAfterDays: 2, isActive: true },
        { name: 'Manager Approval Overdue', phase: 'GOAL_SETTING', triggerAfterDays: 5, isActive: true },
      ],
    })
    console.log('Created escalation rules')
  }

  console.log('\n✅ Demo data seeding complete!')
  console.log(`- ${employees.length} employees with goal sheets`)
  console.log('- Check-ins for Q1, Q2, Q3')
  console.log('- Shared goals')
  console.log('- Notifications, audit logs, email logs')
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })