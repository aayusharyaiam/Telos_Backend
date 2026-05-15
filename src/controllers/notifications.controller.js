import prisma from '../config/prisma.js'
import { ForbiddenError, NotFoundError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

export async function listNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return sendSuccess(res, notifications)
  } catch (err) {
    return next(err)
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification) throw new NotFoundError('Notification')
    if (notification.userId !== req.user.id) throw new ForbiddenError('Access denied')

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    })
    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    })
    return sendSuccess(res, { message: 'Notifications marked read' })
  } catch (err) {
    return next(err)
  }
}
