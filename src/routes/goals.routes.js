import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendEmpty, sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create goal - TODO' }, 201)
})

router.patch('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update goal - TODO' })
})

router.delete('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendEmpty(res)
})

export default router
