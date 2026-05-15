import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  createCycle,
  getActiveCycle,
  getCycleWindows,
  listCycles,
  updateCycle,
  updateCycleWindow,
} from '../controllers/cycles.controller.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listCycles)

router.get('/active', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getActiveCycle)

router.post('/', authenticate, authorize('ADMIN'), createCycle)

router.patch('/:id', authenticate, authorize('ADMIN'), updateCycle)

router.get('/:id/windows', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getCycleWindows)

router.patch('/:id/windows/:phase', authenticate, authorize('ADMIN'), updateCycleWindow)

export default router
