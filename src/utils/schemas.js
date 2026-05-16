import { z } from 'zod'
import { UOM_TYPES, QUARTERS, WINDOW_PHASES, WINDOW_STATUSES, ROLES } from './constants.js'

const uomTypeEnum = z.enum(UOM_TYPES)
const quarterEnum = z.enum(QUARTERS)
const windowPhaseEnum = z.enum(WINDOW_PHASES)
const windowStatusEnum = z.enum(WINDOW_STATUSES)
const roleEnum = z.enum(ROLES)

const idParam = z.object({ id: z.string().min(1) })
const goalIdParam = z.object({ goalId: z.string().min(1) })

export const authSchemas = {
  sync: z.object({ body: z.any(), params: z.any(), query: z.any() }),
  me: z.object({ body: z.any(), params: z.any(), query: z.any() }),
  updateMe: z.object({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(20).optional().nullable(),
      department: z.string().max(100).optional().nullable(),
    }),
    params: z.any(),
    query: z.any(),
  }),
}

export const goalSchemas = {
  list: z.object({
    body: z.any(),
    params: z.any(),
    query: z.object({ sheetId: z.string().optional() }),
  }),
  create: z.object({
    body: z.object({
      goalSheetId: z.string().min(1),
      thrustArea: z.string().min(1),
      title: z.string().min(1).max(150),
      description: z.string().max(500).optional().nullable(),
      uomType: uomTypeEnum,
      target: z.number().optional().nullable(),
      targetDate: z.string().datetime().optional().nullable(),
      weightage: z.number().min(10),
    }),
    params: z.any(),
    query: z.any(),
  }),
  update: z.object({
    body: z.object({
      thrustArea: z.string().min(1).optional(),
      title: z.string().min(1).max(150).optional(),
      description: z.string().max(500).optional().nullable(),
      uomType: uomTypeEnum.optional(),
      target: z.number().optional().nullable(),
      targetDate: z.string().datetime().optional().nullable(),
      weightage: z.number().min(10).optional(),
    }),
    params: idParam,
    query: z.any(),
  }),
  remove: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
  unlock: z.object({
    body: z.any(),
    params: goalIdParam,
    query: z.any(),
  }),
}

export const goalSheetSchemas = {
  create: z.object({
    body: z.object({ cycleId: z.string().optional() }),
    params: z.any(),
    query: z.any(),
  }),
  getById: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
  submit: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
  approve: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
  return: z.object({
    body: z.object({ reason: z.string().min(20) }),
    params: idParam,
    query: z.any(),
  }),
  unlock: z.object({
    body: z.object({ reason: z.string().min(5) }),
    params: idParam,
    query: z.any(),
  }),
  unlockGoal: z.object({
    body: z.object({ reason: z.string().min(5) }),
    params: goalIdParam,
    query: z.any(),
  }),
  diff: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
}

export const checkinSchemas = {
  list: z.object({
    body: z.any(),
    params: z.any(),
    query: z.object({ sheetId: z.string().optional(), quarter: quarterEnum.optional() }),
  }),
  upsert: z.object({
    body: z.object({
      goalId: z.string().min(1),
      quarter: quarterEnum,
      actualAchievement: z.number().optional().nullable(),
      actualDate: z.string().datetime().optional().nullable(),
      goalStatus: z.enum(['NOT_STARTED', 'ON_TRACK', 'COMPLETED']).optional(),
      employeeNotes: z.string().max(300).optional().nullable(),
    }),
    params: z.any(),
    query: z.any(),
  }),
  managerCheckin: z.object({
    body: z.object({ managerComment: z.string().min(10) }),
    params: idParam,
    query: z.any(),
  }),
}

export const userSchemas = {
  create: z.object({
    body: z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(6).optional(),
      role: roleEnum.optional(),
      department: z.string().optional().nullable(),
      reportingManagerId: z.string().optional().nullable(),
    }),
    params: z.any(),
    query: z.any(),
  }),
  update: z.object({
    body: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: roleEnum.optional(),
      department: z.string().optional().nullable(),
      reportingManagerId: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    }),
    params: idParam,
    query: z.any(),
  }),
  remove: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
  reports: z.object({
    body: z.any(),
    params: idParam,
    query: z.any(),
  }),
}

export const cycleSchemas = {
  create: z.object({
    body: z.object({ name: z.string().min(1), isActive: z.boolean().optional() }),
    params: z.any(),
    query: z.any(),
  }),
  update: z.object({
    body: z.object({ name: z.string().min(1).optional(), isActive: z.boolean().optional() }),
    params: idParam,
    query: z.any(),
  }),
  updateWindow: z.object({
    body: z.object({
      status: windowStatusEnum,
      opensAt: z.string().datetime().optional(),
      closesAt: z.string().datetime().optional(),
    }),
    params: z.object({ id: z.string().min(1), phase: windowPhaseEnum }),
    query: z.any(),
  }),
}

export const sharedGoalSchemas = {
  create: z.object({
    body: z.object({
      title: z.string().min(1).max(150),
      description: z.string().max(500).optional().nullable(),
      thrustArea: z.string().min(1),
      uomType: uomTypeEnum,
      target: z.number().optional().nullable(),
      targetDate: z.string().datetime().optional().nullable(),
      defaultWeightage: z.number().min(10),
      recipientIds: z.array(z.string().min(1)).min(1),
    }),
    params: z.any(),
    query: z.any(),
  }),
  updateAchievement: z.object({
    body: z.object({
      quarter: quarterEnum,
      actualAchievement: z.number().optional().nullable(),
      actualDate: z.string().datetime().optional().nullable(),
    }),
    params: idParam,
    query: z.any(),
  }),
}

export const adminSchemas = {
  createThrustArea: z.object({
    body: z.object({ name: z.string().min(1), description: z.string().optional().nullable() }),
    params: z.any(),
    query: z.any(),
  }),
  updateThrustArea: z.object({
    body: z.object({ name: z.string().min(1).optional(), isActive: z.boolean().optional() }),
    params: idParam,
    query: z.any(),
  }),
  createEscalationRule: z.object({
    body: z.object({
      name: z.string().min(1),
      phase: windowPhaseEnum,
      triggerAfterDays: z.number().int().min(1),
    }),
    params: z.any(),
    query: z.any(),
  }),
  updateEscalationRule: z.object({
    body: z.object({
      name: z.string().min(1).optional(),
      phase: windowPhaseEnum.optional(),
      triggerAfterDays: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
    }),
    params: idParam,
    query: z.any(),
  }),
}
