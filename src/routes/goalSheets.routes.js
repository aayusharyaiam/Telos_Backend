import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import {
  approveGoalSheet,
  createGoalSheet,
  getGoalSheetById,
  getGoalSheetDiff,
  getMyGoalSheet,
  getTeamGoalSheets,
  getTeamOverview,
  returnGoalSheet,
  submitGoalSheet,
  unlockGoalSheet,
  unlockGoal,
} from '../controllers/goalSheets.controller.js'
import { goalSheetSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/mine', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getMyGoalSheet)

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSheetSchemas.create), createGoalSheet)

router.get('/team', authenticate, authorize('MANAGER', 'ADMIN'), getTeamGoalSheets)

router.get('/team-overview', authenticate, authorize('MANAGER', 'ADMIN'), getTeamOverview)

router.get('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSheetSchemas.getById), getGoalSheetById)

router.get('/:id/diff', authenticate, authorize('MANAGER', 'ADMIN'), validate(goalSheetSchemas.diff), getGoalSheetDiff)

router.patch('/:id/submit', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(goalSheetSchemas.submit), submitGoalSheet)

router.patch('/:id/approve', authenticate, authorize('MANAGER', 'ADMIN'), validate(goalSheetSchemas.approve), approveGoalSheet)

router.patch('/:id/return', authenticate, authorize('MANAGER', 'ADMIN'), validate(goalSheetSchemas.return), returnGoalSheet)

router.patch('/:id/unlock', authenticate, authorize('ADMIN'), validate(goalSheetSchemas.unlock), unlockGoalSheet)

router.patch('/goals/:goalId/unlock', authenticate, authorize('ADMIN'), validate(goalSheetSchemas.unlockGoal), unlockGoal)

export default router
