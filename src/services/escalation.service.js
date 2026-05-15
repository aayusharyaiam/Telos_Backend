import prisma from '../config/prisma.js'

export async function checkEscalations() {
  const activeCycle = await prisma.cycle.findFirst({ where: { isActive: true } })
  if (!activeCycle) return []

  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } })
  const results = []

  for (const rule of rules) {
    results.push({ ruleId: rule.id, status: 'PENDING', message: 'Not implemented' })
  }

  return results
}
