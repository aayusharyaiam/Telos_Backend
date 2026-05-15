import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/thrust-areas', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.post('/thrust-areas', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create thrust area - TODO' }, 201)
})

router.patch('/thrust-areas/:id', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update thrust area - TODO' })
})

router.get('/escalation-rules', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.post('/escalation-rules', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Create escalation rule - TODO' }, 201)
})

router.patch('/escalation-rules/:id', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Update escalation rule - TODO' })
})

router.get('/escalations', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.patch('/escalations/:id/resolve', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, { message: 'Resolve escalation - TODO' })
})

export default router
