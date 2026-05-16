import prisma from '../config/prisma.js'
import { checkEscalations } from '../services/escalation.service.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'
import { sendSuccess } from '../utils/response.js'

// ─── Thrust Areas ────────────────────────────────────────────

export async function listThrustAreas(req, res, next) {
  try {
    const areas = await prisma.thrustArea.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    return sendSuccess(res, areas)
  } catch (err) {
    return next(err)
  }
}

export async function listActiveThrustAreas(req, res, next) {
  try {
    const areas = await prisma.thrustArea.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    return sendSuccess(res, areas)
  } catch (err) {
    return next(err)
  }
}

export async function createThrustArea(req, res, next) {
  try {
    const name = String(req.body.name || '').trim()
    if (!name) throw new ValidationError('Thrust area name is required')

    const existing = await prisma.thrustArea.findUnique({ where: { name } })
    if (existing) throw new ValidationError('A thrust area with this name already exists')

    const area = await prisma.thrustArea.create({
      data: { name, isDefault: false, isActive: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'THRUST_AREA_CREATED',
        fieldChanged: 'name',
        newValue: name,
      },
    })

    return sendSuccess(res, area, 201)
  } catch (err) {
    return next(err)
  }
}

export async function updateThrustArea(req, res, next) {
  try {
    const area = await prisma.thrustArea.findUnique({ where: { id: req.params.id } })
    if (!area) throw new NotFoundError('Thrust area')

    const data = {}
    const auditFields = []

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name) throw new ValidationError('Thrust area name cannot be empty')
      if (name !== area.name) {
        const dup = await prisma.thrustArea.findUnique({ where: { name } })
        if (dup) throw new ValidationError('A thrust area with this name already exists')
        auditFields.push({ field: 'name', old: area.name, new: name })
        data.name = name
      }
    }

    if (req.body.isActive !== undefined) {
      const isActive = Boolean(req.body.isActive)
      if (isActive !== area.isActive) {
        auditFields.push({ field: 'isActive', old: String(area.isActive), new: String(isActive) })
        data.isActive = isActive
      }
    }

    if (!Object.keys(data).length) {
      return sendSuccess(res, area)
    }

    const updated = await prisma.thrustArea.update({
      where: { id: area.id },
      data,
    })

    // Create audit log entries
    for (const af of auditFields) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'THRUST_AREA_UPDATED',
          fieldChanged: af.field,
          oldValue: af.old,
          newValue: af.new,
        },
      })
    }

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

// ─── Escalation Rules ────────────────────────────────────────

const PHASES = new Set(['GOAL_SETTING', 'Q1_CHECKIN', 'Q2_CHECKIN', 'Q3_CHECKIN', 'Q4_CHECKIN'])

export async function listEscalationRules(req, res, next) {
  try {
    const rules = await prisma.escalationRule.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { escalations: true } } },
    })
    return sendSuccess(res, rules)
  } catch (err) {
    return next(err)
  }
}

export async function createEscalationRule(req, res, next) {
  try {
    const name = String(req.body.name || '').trim()
    const phase = String(req.body.phase || '').toUpperCase()
    const triggerAfterDays = Number(req.body.triggerAfterDays)

    if (!name) throw new ValidationError('Rule name is required')
    if (!PHASES.has(phase)) throw new ValidationError('Invalid phase')
    if (!triggerAfterDays || triggerAfterDays < 1) throw new ValidationError('triggerAfterDays must be at least 1')

    const rule = await prisma.escalationRule.create({
      data: { name, phase, triggerAfterDays, isActive: true },
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ESCALATION_RULE_CREATED',
        newValue: name,
      },
    })

    return sendSuccess(res, rule, 201)
  } catch (err) {
    return next(err)
  }
}

export async function updateEscalationRule(req, res, next) {
  try {
    const rule = await prisma.escalationRule.findUnique({ where: { id: req.params.id } })
    if (!rule) throw new NotFoundError('Escalation rule')

    const data = {}
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim()
      if (!name) throw new ValidationError('Rule name cannot be empty')
      data.name = name
    }
    if (req.body.phase !== undefined) {
      const phase = String(req.body.phase).toUpperCase()
      if (!PHASES.has(phase)) throw new ValidationError('Invalid phase')
      data.phase = phase
    }
    if (req.body.triggerAfterDays !== undefined) {
      const days = Number(req.body.triggerAfterDays)
      if (!days || days < 1) throw new ValidationError('triggerAfterDays must be at least 1')
      data.triggerAfterDays = days
    }
    if (req.body.isActive !== undefined) {
      data.isActive = Boolean(req.body.isActive)
    }

    const updated = await prisma.escalationRule.update({
      where: { id: rule.id },
      data,
    })
    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

// ─── Escalations ─────────────────────────────────────────────

export async function listEscalations(req, res, next) {
  try {
    const escalations = await prisma.escalation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        rule: { select: { id: true, name: true, phase: true, triggerAfterDays: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return sendSuccess(res, escalations)
  } catch (err) {
    return next(err)
  }
}

export async function resolveEscalation(req, res, next) {
  try {
    const escalation = await prisma.escalation.findUnique({ where: { id: req.params.id } })
    if (!escalation) throw new NotFoundError('Escalation')
    if (escalation.status === 'RESOLVED') throw new ValidationError('Escalation is already resolved')

    const updated = await prisma.escalation.update({
      where: { id: escalation.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        rule: { select: { id: true, name: true, phase: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'ESCALATION_RESOLVED',
        newValue: `Resolved escalation for ${updated.user.name}`,
      },
    })

    return sendSuccess(res, updated)
  } catch (err) {
    return next(err)
  }
}

export async function runEscalationCheck(req, res, next) {
  try {
    const results = await checkEscalations()
    return sendSuccess(res, { count: results.length, results })
  } catch (err) {
    return next(err)
  }
}
