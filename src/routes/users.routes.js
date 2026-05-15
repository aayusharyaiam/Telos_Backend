import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.post('/', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create user - TODO' }, 201)
})

router.patch('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update user - TODO' })
})

router.delete('/:id', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Deactivate user - TODO' })
})

router.get('/:id/reports', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

export default router
