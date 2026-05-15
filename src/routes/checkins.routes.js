import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  getTeamSummary,
  listCheckins,
  managerCheckin,
  upsertCheckin,
} from '../controllers/checkins.controller.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listCheckins)

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), upsertCheckin)

router.patch('/:id/manager', authenticate, authorize('MANAGER', 'ADMIN'), managerCheckin)

router.get('/team-summary', authenticate, authorize('MANAGER', 'ADMIN'), getTeamSummary)

export default router
