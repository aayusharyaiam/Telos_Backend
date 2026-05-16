import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { validate } from '../middleware/validate.js'
import { syncUser, getMe, updateMe } from '../controllers/auth.controller.js'
import { authSchemas } from '../utils/schemas.js'

const router = Router()

router.post('/sync', authenticate, syncUser)
router.get('/me', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getMe)
router.patch('/me', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(authSchemas.updateMe), updateMe)

export default router
