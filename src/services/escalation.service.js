import prisma from '../config/prisma.js'
import { createNotification } from './notification.service.js'
import { sendNotificationEmail } from './email.service.js'
import { notifyEscalationTriggered } from './teamsNotification.service.js'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const QUARTER_MAP = {
  Q1_CHECKIN: 'Q1',
  Q2_CHECKIN: 'Q2',
  Q3_CHECKIN: 'Q3',
  Q4_CHECKIN: 'Q4',
}

function daysBetween(now, then) {
  return Math.floor((now - then) / MS_PER_DAY)
}

function getRuleType(rule) {
  const name = String(rule.name || '').toLowerCase()
  if (name.includes('approval')) return 'APPROVAL_OVERDUE'
  if (name.includes('manager') && (name.includes('check') || name.includes('checkin') || name.includes('check-in'))) {
    return 'MANAGER_CHECKIN_OVERDUE'
  }
  if (rule.phase === 'GOAL_SETTING') return 'GOAL_SETTING_OVERDUE'
  return 'CHECKIN_OVERDUE'
}

function buildTitle(ruleType) {
  switch (ruleType) {
    case 'APPROVAL_OVERDUE':
      return 'Approval Overdue'
    case 'MANAGER_CHECKIN_OVERDUE':
      return 'Manager Check-in Overdue'
    case 'CHECKIN_OVERDUE':
      return 'Check-in Overdue'
    default:
      return 'Goal Sheet Overdue'
  }
}

function buildLink(ruleType, item) {
  switch (ruleType) {
    case 'APPROVAL_OVERDUE':
      return item.sheetId ? `/manager/approve/${item.sheetId}` : '/manager/team'
    case 'MANAGER_CHECKIN_OVERDUE':
      return item.user?.id ? `/manager/checkin/${item.user.id}` : '/manager/team'
    case 'CHECKIN_OVERDUE':
      return item.quarter ? `/goals/sheet/active/checkin?quarter=${item.quarter}` : '/goals/sheet/active/checkin'
    default:
      return '/goals'
  }
}

function buildMessage(ruleType, item, overdueDays) {
  const daysText = overdueDays ? `${overdueDays} days` : 'several days'
  switch (ruleType) {
    case 'APPROVAL_OVERDUE':
      return `${item.user.name}'s goal sheet is awaiting your approval (${daysText} since submission).`
    case 'MANAGER_CHECKIN_OVERDUE':
      return `${item.user.name}'s ${item.quarter} check-in is pending your review (${daysText} since window opened).`
    case 'CHECKIN_OVERDUE':
      return `Your ${item.quarter} check-in is overdue (${daysText} since window opened).`
    default:
      return `Your goal sheet submission is overdue (${daysText} since window opened).`
  }
}

function hasActualForGoal(goal) {
  const checkin = goal.checkins?.[0]
  if (checkin && (checkin.actualAchievement !== null || checkin.actualDate !== null)) return true
  if (goal.isShared && goal.parentSharedGoal) {
    return goal.parentSharedGoal.actualAchievement !== null || goal.parentSharedGoal.actualDate !== null
  }
  return false
}

function hasReminderSent(escalation) {
  return escalation.updatedAt && escalation.createdAt && escalation.updatedAt.getTime() - escalation.createdAt.getTime() > 60 * 1000
}

async function notifyUser(user, { title, message, link, ruleName }) {
  if (!user?.id) return

  await createNotification({
    userId: user.id,
    title,
    message,
    link,
  })

  if (user.email) {
    await sendNotificationEmail({
      to: user.email,
      eventType: 'ESCALATION',
      data: { ruleName, message, link },
    })
  }
}

async function notifyAdmins(admins, payload) {
  await Promise.all(admins.map((admin) => notifyUser(admin, payload)))
}

async function findOverdueItems({ rule, cycleId, daysSinceOpen, now }) {
  const ruleType = getRuleType(rule)
  const items = []

  if (ruleType === 'GOAL_SETTING_OVERDUE') {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['EMPLOYEE', 'MANAGER'] } },
      select: {
        id: true,
        name: true,
        email: true,
        reportingManagerId: true,
        reportingManager: { select: { id: true, name: true, email: true } },
      },
    })

    for (const user of users) {
      const sheet = await prisma.goalSheet.findUnique({
        where: { userId_cycleId: { userId: user.id, cycleId } },
      })
      if (!sheet || !['SUBMITTED', 'APPROVED'].includes(sheet.status)) {
        items.push({
          user,
          manager: user.reportingManager,
          sheetId: sheet?.id || null,
          quarter: null,
          overdueDays: daysSinceOpen,
          ruleType,
        })
      }
    }

    return items
  }

  if (ruleType === 'APPROVAL_OVERDUE') {
    const submittedSheets = await prisma.goalSheet.findMany({
      where: { cycleId, status: 'SUBMITTED', user: { isActive: true } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            reportingManagerId: true,
            reportingManager: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    for (const sheet of submittedSheets) {
      if (!sheet.submittedAt) continue
      const overdueDays = daysBetween(now, new Date(sheet.submittedAt))
      if (overdueDays < rule.triggerAfterDays) continue

      items.push({
        user: sheet.user,
        manager: sheet.user.reportingManager,
        sheetId: sheet.id,
        quarter: null,
        overdueDays,
        ruleType,
      })
    }

    return items
  }

  const quarter = QUARTER_MAP[rule.phase]
  if (!quarter) return items

  const approvedSheets = await prisma.goalSheet.findMany({
    where: { cycleId, status: 'APPROVED', user: { isActive: true } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          reportingManagerId: true,
          reportingManager: { select: { id: true, name: true, email: true } },
        },
      },
      goals: {
        include: {
          parentSharedGoal: true,
          checkins: { where: { quarter } },
        },
      },
    },
  })

  for (const sheet of approvedSheets) {
    if (ruleType === 'CHECKIN_OVERDUE') {
      const hasAnyActual = sheet.goals.some((goal) => hasActualForGoal(goal))
      if (!hasAnyActual) {
        items.push({
          user: sheet.user,
          manager: sheet.user.reportingManager,
          sheetId: sheet.id,
          quarter,
          overdueDays: daysSinceOpen,
          ruleType,
        })
      }
    }

    if (ruleType === 'MANAGER_CHECKIN_OVERDUE') {
      const allCheckins = sheet.goals.flatMap((goal) => goal.checkins)
      if (!allCheckins.length) continue
      const allCompleted = allCheckins.every((checkin) => checkin.checkinCompleted)
      if (!allCompleted) {
        items.push({
          user: sheet.user,
          manager: sheet.user.reportingManager,
          sheetId: sheet.id,
          quarter,
          overdueDays: daysSinceOpen,
          ruleType,
        })
      }
    }
  }

  return items
}

/**
 * Run escalation checks for the active cycle.
 * Creates Escalation records and notifications for overdue actions.
 */
export async function checkEscalations() {
  const activeCycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    include: { windows: true },
  })
  if (!activeCycle) return []

  const now = new Date()
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true, name: true, email: true },
  })

  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } })
  const results = []

  for (const rule of rules) {
    try {
      const window = activeCycle.windows.find((w) => w.phase === rule.phase)
      if (!window) continue

      const isOpen =
        window.status === 'FORCE_OPEN' ||
        (window.status === 'OPEN' && now >= new Date(window.opensAt) && now <= new Date(window.closesAt))
      if (!isOpen) continue

      const windowOpenDate = new Date(window.opensAt)
      const daysSinceOpen = daysBetween(now, windowOpenDate)
      if (daysSinceOpen < rule.triggerAfterDays) continue

      const overdueItems = await findOverdueItems({ rule, cycleId: activeCycle.id, daysSinceOpen, now })
      for (const item of overdueItems) {
        const existing = await prisma.escalation.findFirst({
          where: { userId: item.user.id, ruleId: rule.id, cycleId: activeCycle.id, status: { not: 'RESOLVED' } },
        })

        const overdueDays = item.overdueDays ?? daysSinceOpen
        const ruleType = item.ruleType
        const baseTitle = buildTitle(ruleType)
        const baseMessage = buildMessage(ruleType, item, overdueDays)
        const link = buildLink(ruleType, item)
        const responsibleUser = ruleType === 'APPROVAL_OVERDUE' || ruleType === 'MANAGER_CHECKIN_OVERDUE'
          ? item.manager
          : item.user

        if (!existing) {
          const escalation = await prisma.escalation.create({
            data: {
              userId: item.user.id,
              ruleId: rule.id,
              cycleId: activeCycle.id,
              status: 'PENDING',
            },
          })

          await notifyUser(responsibleUser, {
            title: baseTitle,
            message: baseMessage,
            link,
            ruleName: rule.name,
          })

          results.push({ escalationId: escalation.id, userId: item.user.id, rule: rule.name, status: 'PENDING' })
          continue
        }

        const ageDays = daysBetween(now, new Date(existing.createdAt))
        if (existing.status !== 'ESCALATED' && ageDays >= 7) {
          const updated = await prisma.escalation.update({
            where: { id: existing.id },
            data: { status: 'ESCALATED' },
          })

          const escalationMessage = `Escalated: ${item.user.name} is overdue on ${rule.name} (${overdueDays} days).`
          const escalationPayload = {
            title: 'Escalation Escalated',
            message: escalationMessage,
            link: '/admin/escalations',
            ruleName: rule.name,
          }

          if (item.manager?.id) {
            await notifyUser(item.manager, escalationPayload)
          }
          await notifyAdmins(admins, escalationPayload)

          // Send Teams notification
          notifyEscalationTriggered({
            ruleName: rule.name,
            employeeName: item.user.name,
            phase: rule.phase,
            triggerDays: rule.triggerAfterDays,
          }).catch(() => {})

          results.push({ escalationId: updated.id, userId: item.user.id, rule: rule.name, status: 'ESCALATED' })
        } else if (existing.status === 'PENDING' && ageDays >= 3 && !hasReminderSent(existing)) {
          await prisma.escalation.update({
            where: { id: existing.id },
            data: { updatedAt: new Date() },
          })

          await notifyUser(responsibleUser, {
            title: `Reminder: ${baseTitle}`,
            message: `Reminder: ${baseMessage}`,
            link,
            ruleName: rule.name,
          })

          results.push({ escalationId: existing.id, userId: item.user.id, rule: rule.name, status: 'REMINDER' })
        }
      }
    } catch (err) {
      console.error(`[Escalation] Error processing rule ${rule.name}:`, err)
      results.push({ ruleId: rule.id, error: err.message })
    }
  }

  console.log(`[Escalation] Processed ${rules.length} rules, created ${results.length} escalations`)
  return results
}
