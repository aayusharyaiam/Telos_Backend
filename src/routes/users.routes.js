import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  createUser,
  deactivateUser,
  getUserReports,
  listUsers,
  updateUser,
} from '../controllers/users.controller.js'

const router = Router()

router.get('/', authenticate, authorize('ADMIN'), listUsers)

router.post('/', authenticate, authorize('ADMIN'), createUser)

router.patch('/:id', authenticate, authorize('ADMIN'), updateUser)

router.delete('/:id', authenticate, authorize('ADMIN'), deactivateUser)

router.get('/:id/reports', authenticate, authorize('MANAGER', 'ADMIN'), getUserReports)

export default router
