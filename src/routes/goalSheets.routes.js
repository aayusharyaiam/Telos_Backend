import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  approveGoalSheet,
  createGoalSheet,
  getGoalSheetById,
  getMyGoalSheet,
  getTeamGoalSheets,
  getTeamOverview,
  returnGoalSheet,
  submitGoalSheet,
  unlockGoalSheet,
  unlockGoal,
} from '../controllers/goalSheets.controller.js'

const router = Router()

router.get('/mine', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getMyGoalSheet)

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), createGoalSheet)

router.get('/team', authenticate, authorize('MANAGER', 'ADMIN'), getTeamGoalSheets)

router.get('/team-overview', authenticate, authorize('MANAGER', 'ADMIN'), getTeamOverview)

router.get('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getGoalSheetById)

router.patch('/:id/submit', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), submitGoalSheet)

router.patch('/:id/approve', authenticate, authorize('MANAGER', 'ADMIN'), approveGoalSheet)

router.patch('/:id/return', authenticate, authorize('MANAGER', 'ADMIN'), returnGoalSheet)

router.patch('/:id/unlock', authenticate, authorize('ADMIN'), unlockGoalSheet)

router.patch('/goals/:goalId/unlock', authenticate, authorize('ADMIN'), unlockGoal)

export default router
