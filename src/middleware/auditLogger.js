import prisma from '../config/prisma.js'

export async function logGoalChange(req, res, next) {
  const goalId = req.params.id || req.params.goalId
  if (!goalId) return next()

  const goal = await prisma.goal.findUnique({ where: { id: goalId } })
  if (!goal) return next()

  if (goal.isLocked) {
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        goalId: goal.id,
        action: 'ATTEMPTED_EDIT_LOCKED_GOAL',
        oldValue: JSON.stringify(goal),
        newValue: JSON.stringify(req.body),
      },
    })
  }

  const original = { ...goal }
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      const updated = await prisma.goal.findUnique({ where: { id: goalId } })
      if (updated) {
        const changedFields = {}
        for (const key of Object.keys(req.body || {})) {
          if (String(original[key] ?? '') !== String(updated[key] ?? '')) {
            changedFields[key] = { old: original[key], new: updated[key] }
          }
        }
        if (Object.keys(changedFields).length > 0) {
          await prisma.auditLog.create({
            data: {
              userId: req.user.id,
              goalId: goal.id,
              action: 'GOAL_EDITED_POST_LOCK',
              fieldChanged: Object.keys(changedFields).join(', '),
              oldValue: JSON.stringify(Object.fromEntries(Object.entries(changedFields).map(([k, v]) => [k, v.old]))),
              newValue: JSON.stringify(Object.fromEntries(Object.entries(changedFields).map(([k, v]) => [k, v.new]))),
            },
          })
        }
      }
    }
  })

  next()
}

export async function logGoalUnlock({ adminId, goalId, reason }) {
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      goalId,
      action: 'GOAL_UNLOCKED',
      reason,
    },
  })
}
