import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { syncUser, getMe } from '../controllers/auth.controller.js'

const router = Router()

router.post('/sync', authenticate, syncUser)
router.get('/me', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), getMe)

export default router
