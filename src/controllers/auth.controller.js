import prisma from '../config/prisma.js'
import { UnauthorizedError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

export async function syncUser(req, res, next) {
  try {
    if (!req.firebaseUser) {
      throw new UnauthorizedError('Missing Firebase user')
    }

    const { uid, email, name } = req.firebaseUser

    if (!email) {
      throw new UnauthorizedError('Email is required')
    }

    const existing = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    })

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { email, name },
        })
      : await prisma.user.create({
          data: {
            firebaseUid: uid,
            email,
            name,
          },
        })

    return sendSuccess(res, user)
  } catch (err) {
    return next(err)
  }
}

export async function getMe(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not found')
    }

    return sendSuccess(res, req.user)
  } catch (err) {
    return next(err)
  }
}
