import prisma from '../config/prisma.js'

export async function createNotification({ userId, title, message, link }) {
  return prisma.notification.create({
    data: { userId, title, message, link },
  })
}
