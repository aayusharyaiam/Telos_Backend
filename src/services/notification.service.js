import prisma from '../config/prisma.js'
import { emitNotification } from '../config/socket.js'

export async function createNotification({ userId, title, message, link }) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, link },
  })

  // Emit realtime notification
  try {
    emitNotification(userId, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.createdAt,
      isRead: false,
    })
  } catch (error) {
    console.error('Failed to emit realtime notification:', error.message)
  }

  return notification
}
