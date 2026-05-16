import prisma from '../config/prisma.js'
import { createNotification } from '../services/notification.service.js'
import { sendNotificationEmail } from '../services/email.service.js'
import { validateSheetGoals } from '../services/goalValidation.service.js'
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
        reportingManager: { select: { id: true, email: true, name: true } },
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

export async function getTeamOverview(req, res, next) {
  try {
    const cycle = await getActiveCycle()
    const userWhere =
      req.user.role === 'ADMIN'
        ? { role: { in: ['EMPLOYEE', 'MANAGER'] } }
        : { reportingManagerId: req.user.id }

    const users = await prisma.user.findMany({
      where: userWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        goalSheets: {
          where: { cycleId: cycle.id },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            approvedAt: true,
            _count: { select: { goals: true } },
            cycle: { select: { name: true } },
          },
        },
      },
    })

    const reports = users.map((user) => {
      const sheet = user.goalSheets[0] || null
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
        goalSheetId: sheet?.id || null,
        goalSheetStatus: sheet?.status || null,
        goalsCount: sheet?._count?.goals || 0,
        submittedAt: sheet?.submittedAt || null,
        approvedAt: sheet?.approvedAt || null,
        cycleName: sheet?.cycle?.name || cycle.name || null,
      }
    })

    return sendSuccess(res, { cycleName: cycle.name, reports })
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

      // Send email to manager
      if (updated.user.reportingManager?.email) {
        await sendNotificationEmail({
          to: updated.user.reportingManager.email,
          eventType: 'GOAL_SHEET_SUBMITTED',
          data: {
            employeeName: updated.user.name,
            link: `${process.env.FRONTEND_URL || ''}/manager/approve/${updated.id}`,
          },
        })
      }
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

    // Send email to employee
    await sendNotificationEmail({
      to: updated.user.email,
      eventType: 'GOAL_SHEET_APPROVED',
      data: { link: `${process.env.FRONTEND_URL || ''}/goals/sheet/${updated.id}` },
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

    // Send email to employee
    await sendNotificationEmail({
      to: updated.user.email,
      eventType: 'GOAL_SHEET_RETURNED',
      data: {
        reason,
        link: `${process.env.FRONTEND_URL || ''}/goals/sheet/${updated.id}`,
      },
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function unlockGoalSheet(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    const reason = String(req.body.reason || '').trim()
    if (!reason || reason.length < 5) {
      throw new ValidationError('Unlock reason is required (min 5 characters)')
    }

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
          fieldChanged: 'status',
          oldValue: sheet.status,
          newValue: 'RETURNED',
        },
      })

      return tx.goalSheet.update({
        where: { id: sheet.id },
        data: {
          status: 'RETURNED',
          returnReason: `[Admin Unlock] ${reason}`,
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

export async function getGoalSheetDiff(req, res, next) {
  try {
    const sheet = await findSheetOrThrow(req.params.id)
    if (!canAccessSheet(req.user, sheet)) throw new ForbiddenError('Access denied')

    const goalIds = sheet.goals.map((g) => g.id)
    const logs = await prisma.auditLog.findMany({
      where: {
        goalId: { in: goalIds },
        action: 'GOAL_EDITED_POST_LOCK',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        goalId: true,
        fieldChanged: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
    })

    const diffs = logs.map((log) => {
      const goal = sheet.goals.find((g) => g.id === log.goalId)
      return {
        ...log,
        oldValue: JSON.parse(log.oldValue || '{}'),
        newValue: JSON.parse(log.newValue || '{}'),
        goalTitle: goal?.title || 'Unknown',
      }
    })

    return sendSuccess(res, diffs)
  } catch (err) {
    return next(err)
  }
}

export async function unlockGoal(req, res, next) {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: req.params.goalId },
      include: {
        goalSheet: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!goal) throw new NotFoundError('Goal')
    if (!goal.isLocked) throw new ValidationError('This goal is not locked')

    const reason = String(req.body.reason || '').trim()
    if (!reason || reason.length < 5) {
      throw new ValidationError('Unlock reason is required (min 5 characters)')
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          goalId: goal.id,
          action: 'GOAL_UNLOCKED',
          reason,
          fieldChanged: 'isLocked',
          oldValue: 'true',
          newValue: 'false',
        },
      })

      await tx.goal.update({
        where: { id: goal.id },
        data: { isLocked: false },
      })

      return tx.goalSheet.update({
        where: { id: goal.goalSheetId },
        data: {
          status: 'RETURNED',
          returnReason: `[Admin Goal Unlock] ${reason}`,
        },
        include: includeSheet(),
      })
    })

    await createNotification({
      userId: goal.goalSheet.userId,
      title: 'Goal Unlocked',
      message: `Your goal "${goal.title}" has been unlocked by Admin.`,
      link: `/goals/sheet/${goal.goalSheetId}`,
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}
