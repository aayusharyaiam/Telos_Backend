import prisma from '../config/prisma.js'
import { createNotification } from '../services/notification.service.js'
import { computeScore } from '../services/score.service.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

const UOM_TYPES = new Set([
  'NUMERIC_MIN',
  'NUMERIC_MAX',
  'PERCENTAGE_MIN',
  'PERCENTAGE_MAX',
  'TIMELINE',
  'ZERO',
])

function normalizeSharedGoalInput(body, partial = false) {
  const data = {}

  if (!partial || body.thrustArea !== undefined) data.thrustArea = String(body.thrustArea || '').trim()
  if (!partial || body.title !== undefined) data.title = String(body.title || '').trim()
  if (body.description !== undefined) data.description = String(body.description || '').trim() || null
  if (!partial || body.uomType !== undefined) data.uomType = String(body.uomType || '').trim()
  if (!partial || body.defaultWeightage !== undefined) data.defaultWeightage = Number(body.defaultWeightage)

  if (body.target !== undefined && body.target !== '') data.target = Number(body.target)
  if (body.targetDate !== undefined && body.targetDate !== '') data.targetDate = new Date(body.targetDate)

  if (data.title !== undefined && !data.title) throw new ValidationError('Shared goal title is required')
  if (data.title && data.title.length > 150) throw new ValidationError('Shared goal title must be 150 characters or fewer')
  if (data.description && data.description.length > 500) {
    throw new ValidationError('Description must be 500 characters or fewer')
  }
  if (data.thrustArea !== undefined && !data.thrustArea) throw new ValidationError('Thrust area is required')
  if (data.uomType !== undefined && !UOM_TYPES.has(data.uomType)) throw new ValidationError('Invalid UoM type')
  if (data.defaultWeightage !== undefined && (!Number.isFinite(data.defaultWeightage) || data.defaultWeightage < 10)) {
    throw new ValidationError('Minimum default weightage is 10')
  }
  if (data.target !== undefined && !Number.isFinite(data.target)) throw new ValidationError('Target must be a number')
  if (data.targetDate && Number.isNaN(data.targetDate.getTime())) throw new ValidationError('Target date is invalid')

  return data
}

function includeSharedGoal() {
  return {
    createdBy: {
      select: { id: true, name: true, email: true, role: true },
    },
    linkedGoals: {
      include: {
        goalSheet: {
          include: {
            user: {
              select: { id: true, name: true, email: true, reportingManagerId: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    },
  }
}

async function getActiveCycle() {
  const cycle = await prisma.cycle.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!cycle) throw new ValidationError('No active cycle is configured')
  return cycle
}

async function assertCanUseRecipients(reqUser, recipientIds) {
  const recipients = await prisma.user.findMany({
    where: {
      id: { in: recipientIds },
      role: 'EMPLOYEE',
      isActive: true,
      ...(reqUser.role === 'ADMIN' ? {} : { reportingManagerId: reqUser.id }),
    },
    select: { id: true, name: true, email: true },
  })

  if (recipients.length !== recipientIds.length) {
    throw new ForbiddenError('One or more recipients are not available to you')
  }

  return recipients
}

export async function listSharedGoalRecipients(req, res, next) {
  try {
    const where =
      req.user.role === 'ADMIN'
        ? { role: 'EMPLOYEE', isActive: true }
        : { role: 'EMPLOYEE', isActive: true, reportingManagerId: req.user.id }

    const recipients = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, department: true },
      orderBy: { name: 'asc' },
    })

    return sendSuccess(res, recipients)
  } catch (err) {
    return next(err)
  }
}

export async function listSharedGoals(req, res, next) {
  try {
    const goals = await prisma.sharedGoal.findMany({
      where: req.user.role === 'ADMIN' ? {} : { createdById: req.user.id },
      include: includeSharedGoal(),
      orderBy: { updatedAt: 'desc' },
    })

    return sendSuccess(res, goals)
  } catch (err) {
    return next(err)
  }
}

export async function createSharedGoal(req, res, next) {
  try {
    const recipientIds = [...new Set((req.body.recipientIds || []).map((id) => String(id)))]
    if (!recipientIds.length) throw new ValidationError('Choose at least one recipient')

    const data = normalizeSharedGoalInput(req.body)
    const cycle = await getActiveCycle()
    const recipients = await assertCanUseRecipients(req.user, recipientIds)

    const created = await prisma.$transaction(async (tx) => {
      const existingSheets = await tx.goalSheet.findMany({
        where: {
          userId: { in: recipientIds },
          cycleId: cycle.id,
        },
        include: { goals: true },
      })

      const sheetsByUserId = new Map(existingSheets.map((sheet) => [sheet.userId, sheet]))
      for (const recipient of recipients) {
        const sheet = sheetsByUserId.get(recipient.id)
        if (sheet && !['DRAFT', 'RETURNED'].includes(sheet.status)) {
          throw new ValidationError(`${recipient.name}'s goal sheet is already ${sheet.status}`)
        }
        if (sheet?.goals.length >= 8) {
          throw new ValidationError(`${recipient.name} already has the maximum 8 goals`)
        }
      }

      const sharedGoal = await tx.sharedGoal.create({
        data: {
          ...data,
          createdById: req.user.id,
        },
      })

      for (const recipient of recipients) {
        const sheet =
          sheetsByUserId.get(recipient.id) ||
          (await tx.goalSheet.create({
            data: {
              userId: recipient.id,
              cycleId: cycle.id,
            },
            include: { goals: true },
          }))

        await tx.goal.create({
          data: {
            goalSheetId: sheet.id,
            thrustArea: sharedGoal.thrustArea,
            title: sharedGoal.title,
            description: sharedGoal.description,
            uomType: sharedGoal.uomType,
            target: sharedGoal.target,
            targetDate: sharedGoal.targetDate,
            weightage: sharedGoal.defaultWeightage,
            isShared: true,
            parentGoalId: sharedGoal.id,
          },
        })
      }

      return tx.sharedGoal.findUnique({
        where: { id: sharedGoal.id },
        include: includeSharedGoal(),
      })
    })

    await Promise.all(
      recipients.map((recipient) =>
        createNotification({
          userId: recipient.id,
          title: 'Shared Goal Added',
          message: `A shared goal "${created.title}" has been added to your goal sheet.`,
          link: '/goals/sheet/active',
        })
      )
    )

    return sendSuccess(res, created, 201)
  } catch (err) {
    return next(err)
  }
}

export async function getSharedGoalById(req, res, next) {
  try {
    const goal = await prisma.sharedGoal.findUnique({
      where: { id: req.params.id },
      include: includeSharedGoal(),
    })

    if (!goal) throw new NotFoundError('Shared goal')
    if (req.user.role !== 'ADMIN' && goal.createdById !== req.user.id) throw new ForbiddenError('Access denied')

    return sendSuccess(res, goal)
  } catch (err) {
    return next(err)
  }
}

export async function updateSharedGoalAchievement(req, res, next) {
  try {
    const goal = await prisma.sharedGoal.findUnique({
      where: { id: req.params.id },
      include: { linkedGoals: true },
    })

    if (!goal) throw new NotFoundError('Shared goal')
    if (req.user.role !== 'ADMIN' && goal.createdById !== req.user.id) throw new ForbiddenError('Access denied')

    const actualAchievement =
      req.body.actualAchievement === undefined || req.body.actualAchievement === ''
        ? null
        : Number(req.body.actualAchievement)
    const actualDate =
      req.body.actualDate === undefined || req.body.actualDate === ''
        ? null
        : new Date(req.body.actualDate)

    if (actualAchievement !== null && !Number.isFinite(actualAchievement)) {
      throw new ValidationError('Actual achievement must be a number')
    }
    if (actualDate && Number.isNaN(actualDate.getTime())) throw new ValidationError('Actual date is invalid')

    const updated = await prisma.$transaction(async (tx) => {
      const sharedGoal = await tx.sharedGoal.update({
        where: { id: goal.id },
        data: { actualAchievement, actualDate },
      })

      for (const linkedGoal of goal.linkedGoals) {
        const progressScore = computeScore({
          uomType: linkedGoal.uomType,
          target: linkedGoal.target,
          actual: actualAchievement,
          targetDate: linkedGoal.targetDate,
          actualDate,
        })

        await tx.checkinRecord.updateMany({
          where: { goalId: linkedGoal.id },
          data: { actualAchievement, actualDate, progressScore },
        })
      }

      return tx.sharedGoal.findUnique({
        where: { id: sharedGoal.id },
        include: includeSharedGoal(),
      })
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}
