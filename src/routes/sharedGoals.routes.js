import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  createSharedGoal,
  getSharedGoalById,
  listSharedGoalRecipients,
  listSharedGoals,
  updateSharedGoalAchievement,
} from '../controllers/sharedGoals.controller.js'

const router = Router()

router.get('/', authenticate, authorize('MANAGER', 'ADMIN'), listSharedGoals)

router.get('/recipients', authenticate, authorize('MANAGER', 'ADMIN'), listSharedGoalRecipients)

router.post('/', authenticate, authorize('MANAGER', 'ADMIN'), createSharedGoal)

router.get('/:id', authenticate, authorize('MANAGER', 'ADMIN'), getSharedGoalById)

router.patch('/:id/achievement', authenticate, authorize('MANAGER', 'ADMIN'), updateSharedGoalAchievement)

export default router
