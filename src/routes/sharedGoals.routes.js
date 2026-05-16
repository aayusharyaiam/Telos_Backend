import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import {
  createSharedGoal,
  getSharedGoalById,
  listSharedGoalRecipients,
  listSharedGoals,
  updateSharedGoalAchievement,
} from '../controllers/sharedGoals.controller.js'
import { sharedGoalSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/', authenticate, authorize('MANAGER', 'ADMIN'), listSharedGoals)

router.get('/recipients', authenticate, authorize('MANAGER', 'ADMIN'), listSharedGoalRecipients)

router.post('/', authenticate, authorize('MANAGER', 'ADMIN'), validate(sharedGoalSchemas.create), createSharedGoal)

router.get('/:id', authenticate, authorize('MANAGER', 'ADMIN'), getSharedGoalById)

router.patch('/:id/achievement', authenticate, authorize('MANAGER', 'ADMIN'), validate(sharedGoalSchemas.updateAchievement), updateSharedGoalAchievement)

export default router
