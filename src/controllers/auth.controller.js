import admin from '../config/firebase.js'
import prisma from '../config/prisma.js'
import { UnauthorizedError, ValidationError } from '../utils/errors.js'
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

export async function updateMe(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User not found')
    }

    const data = {}
    const fields = ['name', 'department', 'phone']

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        data[field] = req.body[field] === '' ? null : req.body[field]
      }
    }

    if (req.body.email !== undefined && req.body.email !== req.user.email) {
      if (!req.body.email || !req.body.email.includes('@')) {
        throw new ValidationError('Valid email is required')
      }
      data.email = req.body.email
      try {
        await admin.auth().updateUser(req.user.firebaseUid, { email: req.body.email })
      } catch (fbErr) {
        throw new ValidationError(`Failed to update email in Firebase: ${fbErr.message}`)
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    })

    return sendSuccess(res, user)
  } catch (err) {
    return next(err)
  }
}
