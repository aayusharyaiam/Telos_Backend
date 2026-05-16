import prisma from '../config/prisma.js'
import admin from '../config/firebase.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

const ROLES = new Set(['EMPLOYEE', 'MANAGER', 'ADMIN'])

function includeUser() {
  return {
    reportingManager: {
      select: { id: true, name: true, email: true, role: true },
    },
    _count: {
      select: { directReports: true, goalSheets: true },
    },
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      include: includeUser(),
    })
    return sendSuccess(res, users)
  } catch (err) {
    return next(err)
  }
}

export async function createUser(req, res, next) {
  try {
    const { email, name, password, role = 'EMPLOYEE', reportingManagerId, department } = req.body

    if (!email || !name) throw new ValidationError('Email and name are required')
    if (!ROLES.has(role)) throw new ValidationError('Invalid role')

    // If firebaseUid is provided directly (legacy), use it.
    // Otherwise, create a new Firebase user.
    let firebaseUid = req.body.firebaseUid
    if (!firebaseUid) {
      if (!password || password.length < 6) {
        throw new ValidationError('Password is required (min 6 characters) when creating a new user')
      }
      try {
        const fbUser = await admin.auth().createUser({
          email,
          password,
          displayName: name,
        })
        firebaseUid = fbUser.uid
      } catch (fbErr) {
        throw new ValidationError(`Firebase user creation failed: ${fbErr.message}`)
      }
    }

    const user = await prisma.user.create({
      data: {
        firebaseUid,
        email,
        name,
        role,
        reportingManagerId: reportingManagerId || null,
        department: department || null,
      },
      include: includeUser(),
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_CREATED',
        newValue: `${name} (${email}) as ${role}`,
      },
    })

    return sendSuccess(res, user, 201)
  } catch (err) {
    return next(err)
  }
}

export async function updateUser(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new NotFoundError('User')

    const data = {}
    const auditEntries = []

    for (const field of ['name', 'email', 'department']) {
      if (req.body[field] !== undefined && req.body[field] !== existing[field]) {
        auditEntries.push({ field, old: existing[field], new: req.body[field] })
        data[field] = req.body[field]
      }
    }
    if (req.body.role !== undefined) {
      if (!ROLES.has(req.body.role)) throw new ValidationError('Invalid role')
      if (req.body.role !== existing.role) {
        auditEntries.push({ field: 'role', old: existing.role, new: req.body.role })
        data.role = req.body.role
      }
    }
    if (req.body.reportingManagerId !== undefined) {
      const newMgr = req.body.reportingManagerId || null
      if (newMgr !== existing.reportingManagerId) {
        auditEntries.push({ field: 'reportingManagerId', old: existing.reportingManagerId || '-', new: newMgr || '-' })
        data.reportingManagerId = newMgr
      }
    }
    if (req.body.isActive !== undefined) {
      const newActive = Boolean(req.body.isActive)
      if (newActive !== existing.isActive) {
        auditEntries.push({ field: 'isActive', old: String(existing.isActive), new: String(newActive) })
        data.isActive = newActive
      }
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data,
      include: includeUser(),
    })

    // Create audit entries
    for (const entry of auditEntries) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: entry.field === 'role' ? 'USER_ROLE_CHANGED' : entry.field === 'isActive' ? 'USER_ACTIVATION_CHANGED' : 'USER_UPDATED',
          fieldChanged: entry.field,
          oldValue: String(entry.old ?? ''),
          newValue: String(entry.new ?? ''),
          reason: `Updated user ${existing.name} (${existing.email})`,
        },
      })
    }

    return sendSuccess(res, user)
  } catch (err) {
    return next(err)
  }
}

export async function deactivateUser(req, res, next) {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new NotFoundError('User')

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: includeUser(),
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'USER_ACTIVATION_CHANGED',
        fieldChanged: 'isActive',
        oldValue: 'true',
        newValue: 'false',
        reason: `Deactivated user ${existing.name} (${existing.email})`,
      },
    })

    return sendSuccess(res, user)
  } catch (err) {
    return next(err)
  }
}

export async function getUserReports(req, res, next) {
  try {
    const reports = await prisma.goalSheet.findMany({
      where: { userId: req.params.id },
      include: { cycle: true, goals: { include: { checkins: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    return sendSuccess(res, reports)
  } catch (err) {
    return next(err)
  }
}
