import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/mine', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, null)
})

router.post('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create goal sheet - TODO' }, 201)
})

router.get('/team', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/:id', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { id: req.params.id })
})

router.patch('/:id/submit', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Submit goal sheet - TODO' })
})

router.patch('/:id/approve', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Approve goal sheet - TODO' })
})

router.patch('/:id/return', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Return goal sheet - TODO' })
})

router.patch('/:id/unlock', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Unlock goal sheet - TODO' })
})

export default router
