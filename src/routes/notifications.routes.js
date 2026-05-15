import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.patch('/:id/read', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Mark notification read - TODO' })
})

router.patch('/read-all', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Mark all notifications read - TODO' })
})

export default router
