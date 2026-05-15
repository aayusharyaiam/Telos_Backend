import prisma from '../config/prisma.js'
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
    const { firebaseUid, email, name, role = 'EMPLOYEE', reportingManagerId, department } = req.body
    if (!firebaseUid || !email || !name) throw new ValidationError('Firebase UID, email, and name are required')
    if (!ROLES.has(role)) throw new ValidationError('Invalid role')

    const user = await prisma.user.create({
      data: { firebaseUid, email, name, role, reportingManagerId: reportingManagerId || null, department: department || null },
      include: includeUser(),
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
    for (const field of ['name', 'email', 'department']) {
      if (req.body[field] !== undefined) data[field] = req.body[field]
    }
    if (req.body.role !== undefined) {
      if (!ROLES.has(req.body.role)) throw new ValidationError('Invalid role')
      data.role = req.body.role
    }
    if (req.body.reportingManagerId !== undefined) {
      data.reportingManagerId = req.body.reportingManagerId || null
    }
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive)

    const user = await prisma.user.update({
      where: { id: existing.id },
      data,
      include: includeUser(),
    })
    return sendSuccess(res, user)
  } catch (err) {
    return next(err)
  }
}

export async function deactivateUser(req, res, next) {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: includeUser(),
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
