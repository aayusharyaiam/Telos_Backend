import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Upsert check-in - TODO' }, 201)
})

router.patch('/:id/manager', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Manager check-in - TODO' })
})

router.get('/team-summary', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

export default router
