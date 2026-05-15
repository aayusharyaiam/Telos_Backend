import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const thrustAreas = [
  'Revenue Growth',
  'Customer Satisfaction',
  'Operational Excellence',
  'People & Culture',
  'Innovation & Technology',
  'Compliance & Risk Management',
  'Cost Optimization',
  'Strategic Partnerships',
]

const cycleWindows = [
  { phase: 'GOAL_SETTING', opensAt: '2025-05-01', closesAt: '2025-05-31' },
  { phase: 'Q1_CHECKIN', opensAt: '2025-07-01', closesAt: '2025-07-31' },
  { phase: 'Q2_CHECKIN', opensAt: '2025-10-01', closesAt: '2025-10-31' },
  { phase: 'Q3_CHECKIN', opensAt: '2026-01-01', closesAt: '2026-01-31' },
  { phase: 'Q4_CHECKIN', opensAt: '2026-03-01', closesAt: '2026-04-30' },
]

async function main() {
  for (const name of thrustAreas) {
    await prisma.thrustArea.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isDefault: true, isActive: true },
    })
  }

  let cycle = await prisma.cycle.findFirst({ where: { name: 'FY2025-26' } })
  if (!cycle) {
    cycle = await prisma.cycle.create({
      data: { name: 'FY2025-26', isActive: true },
    })
  } else if (!cycle.isActive) {
    cycle = await prisma.cycle.update({
      where: { id: cycle.id },
      data: { isActive: true },
    })
  }

  for (const window of cycleWindows) {
    await prisma.cycleWindow.upsert({
      where: {
        cycleId_phase: {
          cycleId: cycle.id,
          phase: window.phase,
        },
      },
      update: {
        opensAt: new Date(window.opensAt),
        closesAt: new Date(window.closesAt),
        status: 'FORCE_OPEN',
      },
      create: {
        cycleId: cycle.id,
        phase: window.phase,
        opensAt: new Date(window.opensAt),
        closesAt: new Date(window.closesAt),
        status: 'FORCE_OPEN',
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
