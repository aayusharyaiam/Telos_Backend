import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import {
  createUser,
  deactivateUser,
  getUserReports,
  importUsers,
  listUsers,
  updateUser,
} from '../controllers/users.controller.js'
import { userSchemas } from '../utils/schemas.js'

const router = Router()

router.get('/', authenticate, authorize('ADMIN'), listUsers)

router.post('/', authenticate, authorize('ADMIN'), validate(userSchemas.create), createUser)

router.patch('/:id', authenticate, authorize('ADMIN'), validate(userSchemas.update), updateUser)

router.delete('/:id', authenticate, authorize('ADMIN'), validate(userSchemas.remove), deactivateUser)

router.post('/import', authenticate, authorize('ADMIN'), importUsers)

router.get('/:id/reports', authenticate, authorize('MANAGER', 'ADMIN'), validate(userSchemas.reports), getUserReports)

export default router
