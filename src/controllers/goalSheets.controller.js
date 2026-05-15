import prisma from '../config/prisma.js'
import { createNotification } from '../services/notification.service.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

function includeSheet() {
  return {
    cycle: true,
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        reportingManagerId: true,
      },
    },
    goals: {
      orderBy: { createdAt: 'asc' },
      include: {
        checkins: {
          orderBy: { quarter: 'asc' },
        },
      },
    },
  }
}

async function getActiveCycle() {
  const cycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!cycle) {
    throw new ValidationError('No active cycle is configured')
  }

  return cycle
}

function canAccessSheet(reqUser, sheet) {
  if (reqUser.role === 'ADMIN') return true
  if (sheet.userId === reqUser.id) return true
  return sheet.user.reportingManagerId === reqUser.id
}

function canManageSheet(reqUser, sheet) {
  if (reqUser.role === 'ADMIN') return true
  return sheet.user.reportingManagerId === reqUser.id
}

function validateSheetGoals(goals) {
  if (!goals.length) {
    throw new ValidationError('Please add at least one goal before submitting')
  }

  if (goals.length > 8) {
    throw new ValidationError('Maximum 8 goals allowed per cycle')
  }

  const invalidWeight = goals.find((goal) => Number(goal.weightage) < 10)
  if (invalidWeight) {
    throw new ValidationError('Minimum weightage per goal is 10')
  }

  const total = goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0)
  if (Math.round(total * 100) / 100 !== 100) {
    throw new ValidationError(`Total weightage must be exactly 100%. Currently: ${total}%`)
  }
}

async function findSheetOrThrow(id) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id },
    include: includeSheet(),
  })

  if (!sheet) throw new NotFoundError('Goal sheet')
  return sheet
}

export async function getMyGoalSheet(req, res, next) {
  try {
    const cycle = await getActiveCycle()
    const sheet = await prisma.goalSheet.findUnique({
      where: {
        userId_cycleId: {
          userId: req.user.id,
          cycleId: cycle.id,
        },
      },
      include: includeSheet(),
    })

    return sendSuccess(res, sheet)
  } catch (err) {
    return next(err)
  }
}

export async function createGoalSheet(req, res, next) {
  try {
    const cycle = await getActiveCycle()
    const sheet = await prisma.goalSheet.upsert({
      where: {
        userId_cycleId: {
          userId: req.user.id,
          cycleId: cycle.id,
        },
      },
      update: {},
      create: {
        userId: req.user.id,
        cycleId: cycle.id,
      },
      include: includeSheet(),
    })

    return sendSuccess(res, sheet, 201)
  } catch (err) {
    return next(err)
  }
}

export async function getTeamGoalSheets(req, res, next) {
  try {
    const cycle = await getActiveCycle()
    const where =
      req.user.role === 'ADMIN'
        ? { cycleId: cycle.id }
        : {
            cycleId: cycle.id,
            user: { reportingManagerId: req.user.id },
          }

    const sheets = await prisma.goalSheet.findMany({
      where,
      include: includeSheet(),
      orderBy: { updatedAt: 'desc' },
    })

    return sendSuccess(res, sheets)
  } catch (err) {
    return next(err)
  }
}

export async function getGoalSheetById(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    if (!canAccessSheet(req.user, sheet)) throw new ForbiddenError('Access denied')
    return sendSuccess(res, sheet)
  } catch (err) {
    return next(err)
  }
}

export async function submitGoalSheet(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    if (sheet.userId !== req.user.id) throw new ForbiddenError('Only the owner can submit this sheet')
    if (!['DRAFT', 'RETURNED'].includes(sheet.status)) {
      throw new ValidationError('Only draft or returned goal sheets can be submitted')
    }

    validateSheetGoals(sheet.goals)

    const updated = await prisma.goalSheet.update({
      where: { id: sheet.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        returnReason: null,
      },
      include: includeSheet(),
    })

    if (updated.user.reportingManagerId) {
      await createNotification({
        userId: updated.user.reportingManagerId,
        title: 'Goal Sheet Submitted',
        message: `${updated.user.name} has submitted their goal sheet for review.`,
        link: `/manager/approve/${updated.id}`,
      })
    }

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function approveGoalSheet(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    if (!canManageSheet(req.user, sheet)) throw new ForbiddenError('Access denied')
    if (sheet.status !== 'SUBMITTED') {
      throw new ValidationError('Only submitted goal sheets can be approved')
    }

    validateSheetGoals(sheet.goals)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.goal.updateMany({
        where: { goalSheetId: sheet.id },
        data: { isLocked: true },
      })

      return tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
        include: includeSheet(),
      })
    })

    await createNotification({
      userId: updated.userId,
      title: 'Goal Sheet Approved',
      message: 'Your goal sheet has been approved. Goals are now locked.',
      link: `/goals/sheet/${updated.id}`,
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function returnGoalSheet(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    const reason = String(req.body.reason || '').trim()

    if (!canManageSheet(req.user, sheet)) throw new ForbiddenError('Access denied')
    if (sheet.status !== 'SUBMITTED') {
      throw new ValidationError('Only submitted goal sheets can be returned')
    }
    if (reason.length < 20) {
      throw new ValidationError('Return reason must be at least 20 characters')
    }

    const updated = await prisma.goalSheet.update({
      where: { id: sheet.id },
      data: {
        status: 'RETURNED',
        returnReason: reason,
      },
      include: includeSheet(),
    })

    await createNotification({
      userId: updated.userId,
      title: 'Goal Sheet Returned',
      message: `Your goal sheet was returned. Reason: ${reason}`,
      link: `/goals/sheet/${updated.id}`,
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function unlockGoalSheet(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    const reason = String(req.body.reason || 'Admin unlock').trim()

    const updated = await prisma.$transaction(async (tx) => {
      await tx.goal.updateMany({
        where: { goalSheetId: sheet.id },
        data: { isLocked: false },
      })

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'GOAL_SHEET_UNLOCKED',
          reason,
        },
      })

      return tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: 'RETURNED',
          returnReason: reason,
        },
        include: includeSheet(),
      })
    })

    await createNotification({
      userId: updated.userId,
      title: 'Goal Sheet Unlocked',
      message: 'Your goal sheet has been unlocked by Admin. Please update and resubmit.',
      link: `/goals/sheet/${updated.id}`,
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}
