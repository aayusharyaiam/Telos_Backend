import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  getAchievementReport,
  getAnalyticsOverview,
  getAnalyticsSeries,
  getAuditReport,
  getCompletionReport,
} from '../controllers/reports.controller.js'

const router = Router()

router.get('/achievement', authenticate, authorize('MANAGER', 'ADMIN'), getAchievementReport)

router.get('/completion', authenticate, authorize('MANAGER', 'ADMIN'), getCompletionReport)

router.get('/audit', authenticate, authorize('ADMIN'), getAuditReport)

router.get('/analytics/overview', authenticate, authorize('MANAGER', 'ADMIN'), getAnalyticsOverview)

router.get('/analytics/trends', authenticate, authorize('MANAGER', 'ADMIN'), getAnalyticsSeries)

router.get('/analytics/distribution', authenticate, authorize('MANAGER', 'ADMIN'), getAnalyticsSeries)

router.get('/analytics/manager-effectiveness', authenticate, authorize('ADMIN'), getAnalyticsSeries)

export default router
