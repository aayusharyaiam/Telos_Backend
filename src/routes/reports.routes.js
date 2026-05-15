import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import { sendSuccess } from '../utils/response.js'

const router = Router()

router.get('/achievement', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/completion', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/audit', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/analytics/overview', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, {})
})

router.get('/analytics/trends', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/analytics/distribution', authenticate, authorize('MANAGER', 'ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

router.get('/analytics/manager-effectiveness', authenticate, authorize('ADMIN'), (req, res) => {
  return sendSuccess(res, [])
})

export default router
