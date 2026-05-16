import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
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
import { adminSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/thrust-areas/active', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listActiveThrustAreas)

router.get('/thrust-areas', authenticate, authorize('ADMIN'), listThrustAreas)
router.post('/thrust-areas', authenticate, authorize('ADMIN'), validate(adminSchemas.createThrustArea), createThrustArea)
router.patch('/thrust-areas/:id', authenticate, authorize('ADMIN'), validate(adminSchemas.updateThrustArea), updateThrustArea)

router.get('/escalation-rules', authenticate, authorize('ADMIN'), listEscalationRules)
router.post('/escalation-rules', authenticate, authorize('ADMIN'), validate(adminSchemas.createEscalationRule), createEscalationRule)
router.patch('/escalation-rules/:id', authenticate, authorize('ADMIN'), validate(adminSchemas.updateEscalationRule), updateEscalationRule)

router.get('/escalations', authenticate, authorize('ADMIN'), listEscalations)
router.patch('/escalations/:id/resolve', authenticate, authorize('ADMIN'), resolveEscalation)
router.post('/escalations/run', authenticate, authorize('ADMIN'), runEscalationCheck)

export default router
