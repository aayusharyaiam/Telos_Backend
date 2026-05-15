import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/active', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, null)
})

router.post('/', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create cycle - TODO' }, 201)
})

router.patch('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update cycle - TODO' })
})

router.get('/:id/windows', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.patch('/:id/windows/:phase', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update window status - TODO' })
})

export default router
