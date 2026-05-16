import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import { checkNotLocked } from '../middleware/checkNotLocked.js'
import { logGoalChange } from '../middleware/auditLogger.js'
import { createGoal, deleteGoal, listGoals, updateGoal } from '../controllers/goals.controller.js'
import { unlockGoal } from '../controllers/goalSheets.controller.js'
import { goalSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSchemas.list), listGoals)

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSchemas.create), createGoal)

router.patch('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSchemas.update), checkNotLocked, logGoalChange, updateGoal)

router.patch('/:goalId/unlock', authenticate, authorize('ADMIN'), validate(goalSchemas.unlock), unlockGoal)

router.delete('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSchemas.remove), checkNotLocked, deleteGoal)

export default router
