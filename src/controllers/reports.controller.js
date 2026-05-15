import prisma from '../config/prisma.js'
import { sendSuccess } from '../utils/response.js'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

async function getActiveCycleId() {
  const cycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  return cycle?.id
}

function quarterStatus(sheet, quarter) {
  if (sheet.status !== 'APPROVED') return 'closed'
  const goals = sheet.goals || []
  if (!goals.length) return 'pending'
  const checkins = goals.map((goal) => goal.checkins.find((checkin) => checkin.quarter === quarter)).filter(Boolean)
  if (!checkins.length) return 'pending'
  return checkins.every((checkin) => checkin.checkinCompleted) ? 'complete' : 'pending'
}

export async function getCompletionReport(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const where =
      req.user.role === 'ADMIN'
        ? { ...(cycleId ? { cycleId } : {}) }
        : { ...(cycleId ? { cycleId } : {}), user: { reportingManagerId: req.user.id } }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, reportingManagerId: true } },
        goals: { include: { checkins: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const rows = sheets.map((sheet) => ({
      userId: sheet.userId,
      name: sheet.user.name,
      status: sheet.status,
      goals: sheet.goals.length,
      Q1: quarterStatus(sheet, 'Q1'),
      Q2: quarterStatus(sheet, 'Q2'),
      Q3: quarterStatus(sheet, 'Q3'),
      Q4: quarterStatus(sheet, 'Q4'),
    }))

    const q2Complete = rows.filter((row) => row.Q2 === 'complete').length
    return sendSuccess(res, {
      rows,
      summary: {
        total: rows.length,
        q2Complete,
        q2Percent: rows.length ? Math.round((q2Complete / rows.length) * 100) : 0,
      },
    })
  } catch (err) {
    return next(err)
  }
}

export async function getAuditReport(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return sendSuccess(res, logs)
  } catch (err) {
    return next(err)
  }
}

export async function getAchievementReport(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const sheets = await prisma.goalSheet.findMany({
      where: { ...(cycleId ? { cycleId } : {}), status: 'APPROVED' },
      include: { user: true, goals: { include: { checkins: true } } },
    })

    const rows = sheets.flatMap((sheet) =>
      sheet.goals.map((goal) => ({
        employeeName: sheet.user.name,
        employeeEmail: sheet.user.email,
        goalTitle: goal.title,
        thrustArea: goal.thrustArea,
        weightage: goal.weightage,
        latestScore: goal.checkins.at(-1)?.progressScore ?? null,
      }))
    )
    return sendSuccess(res, rows)
  } catch (err) {
    return next(err)
  }
}

export async function getAnalyticsOverview(req, res, next) {
  try {
    const cycleId = await getActiveCycleId()
    const [users, sheets, approved] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.goalSheet.count({ where: cycleId ? { cycleId } : {} }),
      prisma.goalSheet.count({ where: { ...(cycleId ? { cycleId } : {}), status: 'APPROVED' } }),
    ])
    return sendSuccess(res, { users, sheets, approved })
  } catch (err) {
    return next(err)
  }
}

export async function getAnalyticsSeries(req, res, next) {
  return sendSuccess(res, QUARTERS.map((quarter) => ({ quarter, score: 0 })))
}
