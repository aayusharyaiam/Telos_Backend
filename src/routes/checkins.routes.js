import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import { uploadMiddleware } from '../app.js'
import {
  getTeamSummary,
  listCheckins,
  managerCheckin,
  upsertCheckin,
  uploadEvidence,
} from '../controllers/checkins.controller.js'
import { checkinSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(checkinSchemas.list), listCheckins)

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(checkinSchemas.upsert), upsertCheckin)

router.patch('/:id/manager', authenticate, authorize('MANAGER', 'ADMIN'), validate(checkinSchemas.managerCheckin), managerCheckin)

router.get('/team-summary', authenticate, authorize('MANAGER', 'ADMIN'), getTeamSummary)

router.post('/evidence', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), uploadMiddleware.single('evidence'), uploadEvidence)

export default router
