import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import {
  archiveCycle,
  createCycle,
  getActiveCycle,
  getCycleWindows,
  listCycles,
  updateCycle,
  updateCycleWindow,
} from '../controllers/cycles.controller.js'
import { cycleSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listCycles)

router.get('/active', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getActiveCycle)

router.post('/', authenticate, authorize('ADMIN'), validate(cycleSchemas.create), createCycle)

router.patch('/:id', authenticate, authorize('ADMIN'), validate(cycleSchemas.update), updateCycle)

router.get('/:id/windows', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getCycleWindows)

router.patch('/:id/archive', authenticate, authorize('ADMIN'), archiveCycle)

router.patch('/:id/windows/:phase', authenticate, authorize('ADMIN'), validate(cycleSchemas.updateWindow), updateCycleWindow)

export default router
