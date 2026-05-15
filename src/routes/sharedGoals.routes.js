import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.post('/', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create shared goal - TODO' }, 201)
})

router.get('/:id', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { id: req.params.id })
})

router.patch('/:id/achievement', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update shared achievement - TODO' })
})

export default router
