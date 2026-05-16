import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  listThrustAreas,
  listActiveThrustAreas,
  createThrustArea,
  updateThrustArea,
  listEscalationRules,
  createEscalationRule,
  updateEscalationRule,
  listEscalations,
  resolveEscalation,
  runEscalationCheck,
} from '../controllers/admin.controller.js'

const router = Router()

// Public thrust areas (all authenticated roles)
router.get('/thrust-areas/active', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listActiveThrustAreas)

// Thrust areas (admin CRUD)
router.get('/thrust-areas', authenticate, authorize('ADMIN'), listThrustAreas)
router.post('/thrust-areas', authenticate, authorize('ADMIN'), createThrustArea)
router.patch('/thrust-areas/:id', authenticate, authorize('ADMIN'), updateThrustArea)

// Escalation rules
router.get('/escalation-rules', authenticate, authorize('ADMIN'), listEscalationRules)
router.post('/escalation-rules', authenticate, authorize('ADMIN'), createEscalationRule)
router.patch('/escalation-rules/:id', authenticate, authorize('ADMIN'), updateEscalationRule)

// Escalations
router.get('/escalations', authenticate, authorize('ADMIN'), listEscalations)
router.patch('/escalations/:id/resolve', authenticate, authorize('ADMIN'), resolveEscalation)
router.post('/escalations/run', authenticate, authorize('ADMIN'), runEscalationCheck)

export default router
