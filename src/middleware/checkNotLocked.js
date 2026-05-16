import prisma from '../config/prisma.js'
import { ForbiddenError } from '../utils/errors.js'

export async function checkNotLocked(req, res, next) {
  const goalId = req.params.id || req.params.goalId || req.body?.goalId
  if (!goalId) return next()

  const goal = await prisma.goal.findUnique({ where: { id: goalId } })
  if (!goal) return next()
  if (goal.isLocked) {
    return next(new ForbiddenError('Goal is locked. Contact Admin to unlock.'))
  }
  next()
}
