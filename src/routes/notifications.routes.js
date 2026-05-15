import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notifications.controller.js'

const router = Router()

router.get('/', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), listNotifications)

router.patch('/:id/read', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), markNotificationRead)

router.patch('/read-all', authenticate, authorize('EMPLOYEE', 'MANAGER', 'ADMIN'), markAllNotificationsRead)

export default router
