import prisma from '../config/prisma.js'
import { computeScore } from '../services/score.service.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

const QUARTERS = new Set(['Q1', 'Q2', 'Q3', 'Q4'])
const STATUSES = new Set(['NOT_STARTED', 'ON_TRACK', 'COMPLETED'])

function phaseForQuarter(quarter) {
  return `${quarter}_CHECKIN`
}

async function getActiveCycle() {
  const cycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!cycle) throw new ValidationError('No active cycle is configured')
  return cycle
}

async function isQuarterOpen(cycleId, quarter) {
  const window = await prisma.cycleWindow.findUnique({
    where: {
      cycleId_phase: {
        cycleId,
        phase: phaseForQuarter(quarter),
      },
    },
  })

  if (!window) return false
  if (window.status === 'FORCE_OPEN') return true
  if (window.status === 'FORCE_CLOSED') return false

  const now = new Date()
  return window.status === 'OPEN' && now >= window.opensAt && now <= window.closesAt
}

function normalizeQuarter(value) {
  const quarter = String(value || 'Q2').toUpperCase()
  if (!QUARTERS.has(quarter)) throw new ValidationError('Invalid quarter')
  return quarter
}

function includeGoalSheet(quarter) {
  return {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        reportingManagerId: true,
      },
    },
    cycle: true,
    goals: {
      orderBy: { createdAt: 'asc' },
      include: {
        parentSharedGoal: true,
        checkins: {
          where: { quarter },
        },
      },
    },
  }
}

function applySharedGoalActuals(sheet) {
  return {
    ...sheet,
    goals: sheet.goals.map((goal) => {
      if (!goal.isShared || !goal.parentSharedGoal) return goal

      const actualAchievement = goal.parentSharedGoal.actualAchievement
      const actualDate = goal.parentSharedGoal.actualDate
      const existing = goal.checkins?.[0] || {}
      const progressScore = computeScore({
        uomType: goal.uomType,
        target: goal.target,
        actual: actualAchievement,
        targetDate: goal.targetDate,
        actualDate,
      })

      return {
        ...goal,
        checkins: [
          {
            ...existing,
            actualAchievement,
            actualDate,
            progressScore,
          },
        ],
      }
    }),
  }
}

async function getGoalSheetForCheckin({ sheetId, userId, quarter }) {
  const cycle = await getActiveCycle()
  const where =
    sheetId && sheetId !== 'active' && sheetId !== 'demo'
      ? { id: sheetId }
      : {
          userId,
          cycleId: cycle.id,
        }

  const sheet = await prisma.goalSheet.findFirst({
    where,
    include: includeGoalSheet(quarter),
  })

  if (!sheet) throw new NotFoundError('Goal sheet')
  return sheet
}

function canViewSheet(reqUser, sheet) {
  if (reqUser.role === 'ADMIN') return true
  if (sheet.userId === reqUser.id) return true
  return sheet.user.reportingManagerId === reqUser.id
}

function canManageSheet(reqUser, sheet) {
  if (reqUser.role === 'ADMIN') return true
  return sheet.user.reportingManagerId === reqUser.id
}

export async function listCheckins(req, res, next) {
  try {
    const quarter = normalizeQuarter(req.query.quarter)
    const sheet = await getGoalSheetForCheckin({
      sheetId: req.query.sheetId,
      userId: req.user.id,
      quarter,
    })

    if (!canViewSheet(req.user, sheet)) throw new ForbiddenError('Access denied')

    const windowOpen = await isQuarterOpen(sheet.cycleId, quarter)
    return sendSuccess(res, { sheet: applySharedGoalActuals(sheet), quarter, windowOpen })
  } catch (err) {
    return next(err)
  }
}

export async function upsertCheckin(req, res, next) {
  try {
    const quarter = normalizeQuarter(req.body.quarter)
    const goalId = String(req.body.goalId || '')
    if (!goalId) throw new ValidationError('Goal is required')

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        parentSharedGoal: true,
        goalSheet: {
          include: {
            cycle: true,
            user: { select: { id: true, reportingManagerId: true } },
          },
        },
      },
    })

    if (!goal) throw new NotFoundError('Goal')
    if (goal.goalSheet.userId !== req.user.id) throw new ForbiddenError('Only the owner can update check-ins')
    if (goal.goalSheet.status !== 'APPROVED') {
      throw new ValidationError('Goal sheet must be approved before check-ins can be entered')
    }
    if (!(await isQuarterOpen(goal.goalSheet.cycleId, quarter))) {
      throw new ValidationError(`${quarter} check-in window is currently closed`)
    }

    const goalStatus = String(req.body.goalStatus || 'NOT_STARTED')
    if (!STATUSES.has(goalStatus)) throw new ValidationError('Invalid goal status')

    const actualAchievement =
      goal.isShared
        ? goal.parentSharedGoal?.actualAchievement ?? null
        : req.body.actualAchievement === undefined || req.body.actualAchievement === ''
          ? null
          : Number(req.body.actualAchievement)
    const actualDate =
      goal.isShared
        ? goal.parentSharedGoal?.actualDate ?? null
        : req.body.actualDate === undefined || req.body.actualDate === ''
          ? null
          : new Date(req.body.actualDate)

    if (actualAchievement !== null && !Number.isFinite(actualAchievement)) {
      throw new ValidationError('Actual achievement must be a number')
    }
    if (actualDate && Number.isNaN(actualDate.getTime())) throw new ValidationError('Actual date is invalid')

    const progressScore = computeScore({
      uomType: goal.uomType,
      target: goal.target,
      actual: actualAchievement,
      targetDate: goal.targetDate,
      actualDate,
    })

    const checkin = await prisma.checkinRecord.upsert({
      where: {
        goalId_quarter: {
          goalId,
          quarter,
        },
      },
      update: {
        actualAchievement,
        actualDate,
        goalStatus,
        employeeNotes: req.body.employeeNotes || null,
        progressScore,
      },
      create: {
        goalId,
        quarter,
        actualAchievement,
        actualDate,
        goalStatus,
        employeeNotes: req.body.employeeNotes || null,
        progressScore,
      },
    })

    return sendSuccess(res, checkin, 201)
  } catch (err) {
    return next(err)
  }
}

export async function managerCheckin(req, res, next) {
  try {
    const checkin = await prisma.checkinRecord.findUnique({
      where: { id: req.params.id },
      include: {
        goal: {
          include: {
            goalSheet: {
              include: {
                user: { select: { id: true, reportingManagerId: true } },
              },
            },
          },
        },
      },
    })

    if (!checkin) throw new NotFoundError('Check-in')
    if (!canManageSheet(req.user, checkin.goal.goalSheet)) throw new ForbiddenError('Access denied')

    const managerComment = String(req.body.managerComment || '').trim()
    if (managerComment.length < 10) {
      throw new ValidationError('Manager comment must be at least 10 characters')
    }

    const updated = await prisma.checkinRecord.update({
      where: { id: checkin.id },
      data: {
        managerId: req.user.id,
        managerComment,
        checkinCompleted: true,
        checkinCompletedAt: new Date(),
      },
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function getTeamSummary(req, res, next) {
  try {
    const quarter = normalizeQuarter(req.query.quarter)
    const cycle = await getActiveCycle()
    const windowOpen = await isQuarterOpen(cycle.id, quarter)
    const employeeId = req.query.employeeId ? String(req.query.employeeId) : null

    const where = {
      cycleId: cycle.id,
      status: 'APPROVED',
      ...(employeeId ? { userId: employeeId } : {}),
      ...(req.user.role === 'ADMIN' ? {} : { user: { reportingManagerId: req.user.id } }),
    }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: includeGoalSheet(quarter),
      orderBy: { updatedAt: 'desc' },
    })

    return sendSuccess(res, { sheets: sheets.map(applySharedGoalActuals), quarter, windowOpen })
  } catch (err) {
    return next(err)
  }
}
