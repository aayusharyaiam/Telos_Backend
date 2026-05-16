import prisma from '../config/prisma.js'
import { sendNotificationEmail } from '../services/email.service.js'
import { createNotification } from '../services/notification.service.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

const PHASES = new Set(['GOAL_SETTING', 'Q1_CHECKIN', 'Q2_CHECKIN', 'Q3_CHECKIN', 'Q4_CHECKIN'])
const STATUSES = new Set(['OPEN', 'CLOSED', 'FORCE_OPEN', 'FORCE_CLOSED'])
const CHECKIN_PHASE_TO_QUARTER = {
  Q1_CHECKIN: 'Q1',
  Q2_CHECKIN: 'Q2',
  Q3_CHECKIN: 'Q3',
  Q4_CHECKIN: 'Q4',
}

function includeCycle() {
  return { windows: { orderBy: { opensAt: 'asc' } } }
}

function formatDeadline(value) {
  if (!value) return 'the window deadline'
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function checkinLinkForRole(role, quarter) {
  if (role === 'ADMIN') return '/admin/completion'
  if (role === 'MANAGER') return `/manager/team?quarter=${quarter}`
  return `/goals/sheet/active/checkin?quarter=${quarter}`
}

async function notifyCheckinWindowOpened({ phase, window, oldWindow }) {
  const quarter = CHECKIN_PHASE_TO_QUARTER[phase]
  if (!quarter) return

  const wasOpen = oldWindow?.status === 'OPEN' || oldWindow?.status === 'FORCE_OPEN'
  const isOpen = window.status === 'OPEN' || window.status === 'FORCE_OPEN'
  if (!isOpen || wasOpen) return

  const deadline = formatDeadline(window.closesAt)
  const message = `${quarter} Check-in is now open. Update your achievements by ${deadline}.`
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true },
  })

  await Promise.all(
    users.map(async (user) => {
      const link = checkinLinkForRole(user.role, quarter)
      await createNotification({
        userId: user.id,
        title: `${quarter} Check-in Window Open`,
        message,
        link,
      })

      if (user.email) {
        await sendNotificationEmail({
          to: user.email,
          eventType: 'CHECKIN_WINDOW_OPENED',
          data: {
            quarter,
            message,
            link: `${process.env.FRONTEND_URL || ''}${link}`,
          },
        })
      }
    })
  )
}

export async function listCycles(req, res, next) {
  try {
    const cycles = await prisma.cycle.findMany({
      include: includeCycle(),
      orderBy: { createdAt: 'desc' },
    })
    return sendSuccess(res, cycles)
  } catch (err) {
    return next(err)
  }
}

export async function getActiveCycle(req, res, next) {
  try {
    const cycle = await prisma.cycle.findFirst({
      where: { isActive: true },
      include: includeCycle(),
      orderBy: { createdAt: 'desc' },
    })
    return sendSuccess(res, cycle)
  } catch (err) {
    return next(err)
  }
}

export async function createCycle(req, res, next) {
  try {
    const name = String(req.body.name || '').trim()
    if (!name) throw new ValidationError('Cycle name is required')

    const cycle = await prisma.$transaction(async (tx) => {
      if (req.body.isActive) await tx.cycle.updateMany({ data: { isActive: false } })
      const created = await tx.cycle.create({ data: { name, isActive: Boolean(req.body.isActive) } })
      return created
    })
    return sendSuccess(res, cycle, 201)
  } catch (err) {
    return next(err)
  }
}

export async function updateCycle(req, res, next) {
  try {
    const existing = await prisma.cycle.findUnique({ where: { id: req.params.id } })
    if (!existing) throw new NotFoundError('Cycle')

    const data = {}
    if (req.body.name !== undefined) data.name = String(req.body.name).trim()
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive)

    const cycle = await prisma.$transaction(async (tx) => {
      if (data.isActive) await tx.cycle.updateMany({ where: { id: { not: existing.id } }, data: { isActive: false } })
      return tx.cycle.update({ where: { id: existing.id }, data, include: includeCycle() })
    })
    return sendSuccess(res, cycle)
  } catch (err) {
    return next(err)
  }
}

export async function getCycleWindows(req, res, next) {
  try {
    const windows = await prisma.cycleWindow.findMany({
      where: { cycleId: req.params.id },
      orderBy: { opensAt: 'asc' },
    })
    return sendSuccess(res, windows)
  } catch (err) {
    return next(err)
  }
}

export async function updateCycleWindow(req, res, next) {
  try {
    const phase = String(req.params.phase || '').toUpperCase()
    if (!PHASES.has(phase)) throw new ValidationError('Invalid phase')

    const status = String(req.body.status || '').toUpperCase()
    if (!STATUSES.has(status)) throw new ValidationError('Invalid window status')

    const data = { status }
    if (req.body.opensAt) data.opensAt = new Date(req.body.opensAt)
    if (req.body.closesAt) data.closesAt = new Date(req.body.closesAt)

    // Find old status for audit
    const oldWindow = await prisma.cycleWindow.findUnique({
      where: { cycleId_phase: { cycleId: req.params.id, phase } },
    })

    const window = await prisma.cycleWindow.upsert({
      where: { cycleId_phase: { cycleId: req.params.id, phase } },
      update: data,
      create: {
        cycleId: req.params.id,
        phase,
        opensAt: data.opensAt || new Date(),
        closesAt: data.closesAt || new Date(),
        status,
      },
    })

    // Audit log for window status change
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CYCLE_WINDOW_UPDATED',
          fieldChanged: `${phase} status`,
          oldValue: oldWindow?.status || 'N/A',
          newValue: status,
        },
      })
    }

    await notifyCheckinWindowOpened({ phase, window, oldWindow })

    return sendSuccess(res, window)
  } catch (err) {
    return next(err)
  }
}
