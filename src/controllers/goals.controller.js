import prisma from '../config/prisma.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js'
import { sendEmpty, sendSuccess } from '../utils/response.js'

const UOM_TYPES = new Set([
  'NUMERIC_MIN',
  'NUMERIC_MAX',
  'PERCENTAGE_MIN',
  'PERCENTAGE_MAX',
  'TIMELINE',
  'ZERO',
])

async function getSheetForGoalWrite(req, goalSheetId) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: goalSheetId },
    include: {
      goals: true,
      user: {
        select: {
          id: true,
          reportingManagerId: true,
        },
      },
    },
  })

  if (!sheet) throw new NotFoundError('Goal sheet')
  return sheet
}

function canEmployeeEdit(reqUser, sheet) {
  return sheet.userId === reqUser.id && ['DRAFT', 'RETURNED'].includes(sheet.status)
}

function canManagerEdit(reqUser, sheet) {
  if (sheet.status !== 'SUBMITTED') return false
  if (reqUser.role === 'ADMIN') return true
  return sheet.user.reportingManagerId === reqUser.id
}

function ensureCanWriteGoal(reqUser, sheet) {
  if (canEmployeeEdit(reqUser, sheet)) return
  if (canManagerEdit(reqUser, sheet)) return
  throw new ForbiddenError('This goal sheet cannot be edited')
}

function normalizeGoalInput(body, partial = false) {
  const data = {}

  if (!partial || body.thrustArea !== undefined) data.thrustArea = String(body.thrustArea || '').trim()
  if (!partial || body.title !== undefined) data.title = String(body.title || '').trim()
  if (body.description !== undefined) data.description = String(body.description || '').trim() || null
  if (!partial || body.uomType !== undefined) data.uomType = String(body.uomType || '').trim()
  if (!partial || body.weightage !== undefined) data.weightage = Number(body.weightage)

  if (body.target !== undefined && body.target !== '') data.target = Number(body.target)
  if (body.targetDate !== undefined && body.targetDate !== '') data.targetDate = new Date(body.targetDate)

  if (data.title !== undefined && !data.title) throw new ValidationError('Goal title is required')
  if (data.title && data.title.length > 150) throw new ValidationError('Goal title must be 150 characters or fewer')
  if (data.description && data.description.length > 500) {
    throw new ValidationError('Goal description must be 500 characters or fewer')
  }
  if (data.thrustArea !== undefined && !data.thrustArea) throw new ValidationError('Thrust area is required')
  if (data.uomType !== undefined && !UOM_TYPES.has(data.uomType)) throw new ValidationError('Invalid UoM type')
  if (data.weightage !== undefined && (!Number.isFinite(data.weightage) || data.weightage < 10)) {
    throw new ValidationError('Minimum weightage per goal is 10')
  }
  if (data.target !== undefined && !Number.isFinite(data.target)) throw new ValidationError('Target must be a number')
  if (data.targetDate && Number.isNaN(data.targetDate.getTime())) throw new ValidationError('Target date is invalid')

  return data
}

export async function listGoals(req, res, next) {
  try {
    const where = req.query.goalSheetId ? { goalSheetId: String(req.query.goalSheetId) } : {}
    const goals = await prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: { checkins: true },
    })

    return sendSuccess(res, goals)
  } catch (err) {
    return next(err)
  }
}

export async function createGoal(req, res, next) {
  try {
    const goalSheetId = String(req.body.goalSheetId || '')
    if (!goalSheetId) throw new ValidationError('Goal sheet is required')

    const sheet = await getSheetForGoalWrite(req, goalSheetId)
    ensureCanWriteGoal(req.user, sheet)

    if (sheet.goals.length >= 8) {
      throw new ValidationError('Maximum 8 goals allowed per cycle')
    }

    const data = normalizeGoalInput(req.body)
    const goal = await prisma.goal.create({
      data: {
        ...data,
        goalSheetId,
      },
    })

    return sendSuccess(res, goal, 201)
  } catch (err) {
    return next(err)
  }
}

export async function updateGoal(req, res, next) {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: req.params.id },
      include: {
        goalSheet: {
          include: {
            goals: true,
            user: { select: { id: true, reportingManagerId: true } },
          },
        },
      },
    })

    if (!goal) throw new NotFoundError('Goal')
    if (goal.isLocked) throw new ForbiddenError('This goal sheet has been approved and is locked')
    ensureCanWriteGoal(req.user, goal.goalSheet)

    if (goal.isShared && goal.goalSheet.userId === req.user.id) {
      const fields = Object.keys(req.body)
      const hasReadOnlyChange = fields.some((field) => field !== 'weightage')
      if (hasReadOnlyChange) throw new ForbiddenError('Only weightage can be changed on shared goals')
    }

    const data = normalizeGoalInput(req.body, true)
    const updated = await prisma.goal.update({
      where: { id: goal.id },
      data,
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function deleteGoal(req, res, next) {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: req.params.id },
      include: {
        goalSheet: {
          include: {
            goals: true,
            user: { select: { id: true, reportingManagerId: true } },
          },
        },
      },
    })

    if (!goal) throw new NotFoundError('Goal')
    if (goal.isLocked) throw new ForbiddenError('This goal sheet has been approved and is locked')
    if (goal.isShared) throw new ForbiddenError('Shared goals cannot be deleted from an employee goal sheet')
    ensureCanWriteGoal(req.user, goal.goalSheet)

    await prisma.goal.delete({ where: { id: goal.id } })
    return sendEmpty(res)
  } catch (err) {
    return next(err)
  }
}
